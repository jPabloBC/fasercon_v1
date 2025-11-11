import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import transporter from '@/lib/email'
import { buildQuoteEmail } from '@/lib/quoteEmail'

// Legacy calculator schema (kept for compatibility)
const quoteSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'El teléfono debe tener al menos 10 dígitos'),
  width: z.number().min(1, 'El ancho debe ser mayor a 0'),
  length: z.number().min(1, 'El largo debe ser mayor a 0'),
  area: z.number().min(1, 'El área debe ser mayor a 0'),
  materialType: z.string().min(1, 'Selecciona un tipo de material'),
  estimatedPrice: z.number().min(0, 'El precio estimado debe ser mayor a 0'),
})

// New pre-sale quote schema: contact + items
const itemSchema = z.object({
  product_id: z.union([z.string(), z.number()]),
  name: z.string(),
  image_url: z.string().optional().nullable(),
  unit_size: z.string().optional().nullable(),
  measurement_unit: z.string().optional().nullable(),
  qty: z.number().min(1),
  price: z.number().optional().nullable(),
  characteristics: z.array(z.string()).optional(),
  sku: z.string().optional(),
})

const preSaleSchema = z.object({
  contact: z.object({
    rut: z.string().optional().nullable(),
    company: z.string().min(1, 'La empresa es requerida'),
    email: z.string().email('Email inválido'),
    phone: z.string().min(7, 'El teléfono es inválido'),
    document: z.string().optional().nullable(),
  }),
  items: z.array(itemSchema).min(1, 'Debes agregar al menos un producto'),
})

// Replace 'any' with a specific type for product
interface Product {
  id: string;
  name: string;
  characteristics: string[];
  // Add other relevant fields as needed
}

export async function GET() {
  try {
    // Obtener todas las cotizaciones
    const { data: quotes, error } = await supabase
      .from('fasercon_quotes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching quotes:', error)
      return NextResponse.json(
        { error: 'Error al obtener las cotizaciones' },
        { status: 500 }
      )
    }

    // Obtener todos los items asociados a las cotizaciones
    const quoteIds = (quotes || []).map(q => q.id)
    console.log('[DEBUG] Quote IDs:', quoteIds);
  let itemsByQuote: Record<string, unknown[]> = {}
  let productsById: Record<string, unknown> = {}
    if (quoteIds.length > 0) {
      const { data: items, error: itemsError } = await supabase
        .from('fasercon_quote_items')
        .select('*')
        .in('quote_id', quoteIds)
      console.log('[DEBUG] Items fetched:', items?.length || 0, 'Error:', itemsError);
      if (!itemsError && Array.isArray(items) && items.length > 0) {
        // Obtener todos los productos relacionados a los items
        const productIds = Array.from(new Set(items.map(i => i.product_id).filter(Boolean)))
        if (productIds.length > 0) {
          const { data: products, error: prodErr } = await supabase
            .from('fasercon_products')
            .select('*')
            .in('id', productIds)
          if (!prodErr && Array.isArray(products)) {
            productsById = products.reduce((acc, p) => { acc[p.id] = p; return acc }, {} as Record<string, unknown>)
          }
        }
        itemsByQuote = items.reduce((acc, item) => {
          // Parsear characteristics si es string
          let characteristics = item.characteristics;
          if (typeof characteristics === 'string') {
            try {
              characteristics = JSON.parse(characteristics);
            } catch {
              characteristics = [];
            }
          }
          // Adjuntar datos completos del producto si existen y tipar correctamente
          let product = productsById[item.product_id] || null;
          if (product && typeof product === 'object') {
            const prodTyped = product as Product;
            if (typeof prodTyped.characteristics === 'string') {
              try {
                product = { ...prodTyped, characteristics: JSON.parse(prodTyped.characteristics) };
              } catch {
                product = { ...prodTyped, characteristics: [] };
              }
            }
          }
          acc[item.quote_id] = acc[item.quote_id] || [];
          acc[item.quote_id].push({ ...item, characteristics, product });
          return acc;
  }, {} as Record<string, unknown[]>)
      }
    }

    // Transformar y unir cotización + items
    const transformedQuotes = (quotes || []).map(quote => ({
      id: quote.id,
      name: quote.name,
      email: quote.email,
      phone: quote.phone,
      area: quote.area,
      materialType: quote.material_type,
      estimatedPrice: quote.estimated_price,
      status: quote.status,
      createdAt: quote.created_at,
      items: itemsByQuote[quote.id] || []
    }))

    return NextResponse.json(transformedQuotes)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log('Incoming payload:', body)

    // Branch 1: New pre-sale schema with items
    if (body && body.contact && Array.isArray(body.items)) {
      const { contact, items } = preSaleSchema.parse(body)

      console.log('Parsed contact:', contact)
      console.log('Parsed items:', items)

      // Insert base quote with minimal required legacy fields (defaults)
      // Generar quote_number único: FC-{AÑO}{MES}{DIA}-{NÚMERO ALEATORIO}
      const now = new Date();
      const quote_number = `FC-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${Math.floor(1000 + Math.random() * 9000)}`;

      const { data: quote, error: qErr } = await supabase
        .from('fasercon_quotes')
        .insert([
          {
            name: contact.company,
            email: contact.email,
            phone: contact.phone,
            width: 1,
            length: 1,
            area: 1,
            material_type: 'PRE-SALE',
            estimated_price: 0,
            status: 'PENDING',
            quote_number,
          },
        ])
        .select()
        .single()

      if (qErr || !quote) {
        console.error('Error insertando cotización:', qErr)
        return NextResponse.json(
          { message: 'Error al guardar la cotización' },
          { status: 500 }
        )
      }

      // Try to insert items in fasercon_quote_items (if table exists)
      let itemsSaved = 0
      if (items.length > 0) {
        const rows = items.map(it => ({
          quote_id: quote.id,
          product_id: it.product_id,
          name: it.name,
          image_url: it.image_url ?? null,
          unit_size: it.unit_size ?? null,
          measurement_unit: it.measurement_unit ?? null,
          qty: it.qty,
          price: it.price ?? 0,
          // NO guardamos characteristics aquí - se obtienen desde fasercon_products
          company: contact.company, // Add company data
          email: contact.email,     // Add email data
          phone: contact.phone,      // Add phone data
          document: contact.rut || contact.document, // Ensure RUT/document is added
        }))
        console.log('Using supabaseAdmin for insertion:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
        
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
          console.error('Service role key is missing. Cannot proceed with insertion.');
          return NextResponse.json(
            { message: 'Error interno del servidor: falta la clave de rol de servicio.' },
            { status: 500 }
          );
        }

        // Ensure quote_id is optional for fasercon_quote_items
        if (!quote.id) {
          console.error('Quote ID is missing. Cannot insert items.');
          return NextResponse.json(
            { message: 'Error interno del servidor: falta el ID de la cotización.' },
            { status: 500 }
          );
        }

        const { error: itemsErr, count } = await supabaseAdmin
          .from('fasercon_quote_items')
          .insert(rows, { count: 'exact' })

        if (itemsErr) {
          console.error('Error guardando items de cotización:', itemsErr)
        } else if (typeof count === 'number') {
          itemsSaved = count
        } else {
          itemsSaved = rows.length
        }
      }

      // Enrich items with details from the database
      const productIds = items.map(item => item.product_id);
      const { data: products, error: productsError } = await supabase
        .from('fasercon_products')
        .select('id, sku, name, characteristics, unit_size, measurement_unit')
        .in('id', productIds);

      if (productsError) {
        console.error('Error fetching products for quote:', productsError);
        return NextResponse.json(
          { message: 'Error al obtener detalles de los productos' },
          { status: 500 }
        );
      }

      const productsById = new Map(products.map(p => [p.id, p]));

      const enrichedItems = items.map(item => {
        const product = productsById.get(item.product_id);
        return {
          ...item,
          sku: product?.sku ?? item.sku,
          name: product?.name ?? item.name,
          characteristics: product?.characteristics ?? item.characteristics,
          unit_size: product?.unit_size ?? item.unit_size,
          measurement_unit: product?.measurement_unit ?? item.measurement_unit,
        };
      });

      // Generar PDF y enviar email al cliente y a Fasercon
      let emailSuccess = true;
      try {
        const emailData = buildQuoteEmail({ contact, items: enrichedItems });
        const { quote_number, created_at } = quote;
        // Importar aquí para evitar problemas SSR
        const { generateQuotePDF } = await import('@/lib/quotePdf');
        const pdfBuffer = await generateQuotePDF({
          correlativo: quote_number,
          contact,
          items: enrichedItems,
          createdAt: created_at,
        });
        // Cliente
        await transporter.sendMail({
          from: {
            name: 'Fasercon Cotizaciones',
            address: process.env.EMAIL_USER || 'gerencia@ingenit.cl',
          },
          to: contact.email,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
          attachments: [
            {
              filename: `Cotizacion-${quote_number}.pdf`,
              content: Buffer.from(pdfBuffer),
              contentType: 'application/pdf',
            },
          ],
        });
        console.log(`[EMAIL] Cotización enviada a cliente: ${contact.email}`);
        // Interno
        await transporter.sendMail({
          from: {
            name: 'Fasercon Cotizaciones',
            address: process.env.EMAIL_USER || 'gerencia@ingenit.cl',
          },
          to: 'jpbernal@fasercon.cl',
          subject: `Copia Interna: ${emailData.subject}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
              <h2 style="background:#2d3748;color:white;padding:16px 0;text-align:center;">Copia Interna - Cotización Fasercon</h2>
              <p>Se ha generado una nueva cotización con los siguientes detalles:</p>
              <p><b>Cliente:</b> ${contact.company}</p>
              <p><b>Email:</b> ${contact.email}</p>
              <p><b>Teléfono:</b> ${contact.phone}</p>
              <hr style="margin:24px 0;border:none;border-top:1px solid #eee;">
              <p style="font-size:12px;color:#888;text-align:center;">Este correo es interno y está destinado únicamente para uso administrativo.</p>
            </div>
          `,
          text: `Copia Interna - Cotización Fasercon\n\nCliente: ${contact.company}\nEmail: ${contact.email}\nTeléfono: ${contact.phone}\n\nEste correo es interno y está destinado únicamente para uso administrativo.`,
          attachments: [
            {
              filename: `Cotizacion-${quote_number}.pdf`,
              content: Buffer.from(pdfBuffer),
              contentType: 'application/pdf',
            },
          ],
        });
        console.log('[EMAIL] Cotización enviada a jpbernal@fasercon.cl');
      } catch (err) {
        emailSuccess = false;
        console.error('[EMAIL ERROR] No se pudo enviar la cotización:', err);
      }
      return NextResponse.json(
        {
          message: emailSuccess
            ? 'Cotización enviada exitosamente'
            : 'Cotización guardada, pero hubo un error al enviar el correo. Revisa los logs.',
          id: quote.id,
          itemsSaved,
          emailSuccess,
        },
        { status: 201 }
      )
    }

    // Branch 2: Legacy calculator payload
    const validatedData = quoteSchema.parse(body)

    const { data: quote, error } = await supabase
      .from('fasercon_quotes')
      .insert([
        {
          name: validatedData.name,
          email: validatedData.email,
          phone: validatedData.phone,
          width: validatedData.width,
          length: validatedData.length,
          area: validatedData.area,
          material_type: validatedData.materialType,
          estimated_price: validatedData.estimatedPrice,
          status: 'PENDING',
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('Error de Supabase:', error)
      throw new Error('Error al guardar en la base de datos')
    }

    return NextResponse.json(
      {
        message: 'Cotización enviada exitosamente',
        id: quote.id,
        estimatedPrice: quote.estimated_price,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error al procesar cotización:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          message: 'Datos inválidos',
          errors: error.issues 
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}