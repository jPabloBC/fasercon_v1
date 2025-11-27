import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase, supabaseAdmin } from '@/lib/supabase'
// Email sending is handled by `/api/generate-quote-pdf` to avoid duplicate sends

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
  update_price: z.number().optional().nullable(), // Agregado para evitar errores de tipo
  discount: z.number().optional().nullable(), // Added discount property
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
    company_address: z.string().min(1, 'La dirección de la empresa es requerida'),
    contact_name: z.string().min(1, 'El nombre de contacto es requerido'),
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
    const capitalizeName = (s: string) => {
      return String(s || '')
        .split(' ')
        .filter(Boolean)
        .map((w) => w[0]?.toUpperCase() + w.slice(1).toLowerCase())
        .join(' ')
    }

    // Helper to compute next sequential correlative (0001, 0002, ...)
    async function computeNextCorrelative() {
      let correlativeNext = '0001';
      try {
        const { data: quotesCorrelatives } = await supabase
          .from('fasercon_quotes')
          .select('correlative');
        const { data: versionsCorrelatives } = await supabase
          .from('fasercon_quote_versions')
          .select('correlative');
        const all = [] as Array<string | null | undefined>;
        if (Array.isArray(quotesCorrelatives)) all.push(...quotesCorrelatives.map((r: { correlative: string }) => r.correlative));
        if (Array.isArray(versionsCorrelatives)) all.push(...versionsCorrelatives.map((r: { correlative: string }) => r.correlative));
        let maxNum = 0;
        // Only consider existing correlative values that are exactly 4 digits (e.g. 0001)
        for (const s of all) {
          if (!s) continue;
          const str = String(s).trim();
          if (/^\d{4}$/.test(str)) {
            const n = parseInt(str, 10);
            if (!isNaN(n) && n > maxNum) maxNum = n;
          }
        }
        correlativeNext = String(maxNum + 1).padStart(4, '0');
      } catch (err) {
        console.warn('Failed to compute next correlative, defaulting to 0001', err);
      }
      return correlativeNext;
    }

    // Branch DRAFT: allow saving incomplete data as a draft (relaxed validation)
    if (body && body.draft) {
      // Draft schema: make contact/items optional and permissive
      const draftContactSchema = z.object({
        rut: z.string().optional().nullable(),
        company: z.string().optional().nullable(),
        email: z.string().optional().nullable(),
        phone: z.string().optional().nullable(),
        document: z.string().optional().nullable(),
        company_address: z.string().optional().nullable(),
        contact_name: z.string().optional().nullable(),
      }).optional();

      const draftItemSchema = z.object({
        product_id: z.union([z.string(), z.number()]).optional().nullable(),
        name: z.string().optional().nullable(),
        image_url: z.string().optional().nullable(),
        unit_size: z.string().optional().nullable(),
        measurement_unit: z.string().optional().nullable(),
        qty: z.number().min(0).optional().nullable(),
        price: z.number().optional().nullable(),
        update_price: z.number().optional().nullable(),
        discount: z.number().optional().nullable(),
        characteristics: z.array(z.string()).optional().nullable(),
        sku: z.string().optional().nullable(),
      }).passthrough();

      const draftSchema = z.object({
        contact: draftContactSchema,
        items: z.array(draftItemSchema).optional(),
        parent_quote_id: z.any().optional(),
        parent_correlative: z.any().optional(),
      });

      const parsed = draftSchema.parse(body);
      const contact = parsed.contact || {};
      const items = Array.isArray(parsed.items) ? parsed.items : [];

      // For drafts we don't assign a sequential quote_number to avoid unique constraint conflicts.
      const quote_number = null;

      // Insert quote as pending but mark as draft in admin_notes (DB does not accept 'DRAFT' status)
      const adminNotesDraft = JSON.stringify({ draft: true, savedAt: new Date().toISOString() });
      const { data: inserted, error: qErr } = await supabase
        .from('fasercon_quotes')
        .insert([
          {
            name: contact.company || contact.contact_name || null,
            email: contact.email || null,
            phone: contact.phone || null,
            width: 1,
            length: 1,
            area: 1,
            material_type: 'PRE-SALE',
            estimated_price: 0,
            status: 'PENDING',
            admin_notes: adminNotesDraft,
            quote_number,
            document: contact.rut || contact.document || null,
            company_address: contact.company_address || null,
            contact_name: contact.contact_name || null,
          },
        ])
        .select()
        .single();

      if (qErr || !inserted) {
        console.error('Error insertando borrador de cotización:', qErr);
        // Expose error details only in non-production to aid debugging
        if (process.env.NODE_ENV !== 'production') {
          return NextResponse.json({ message: 'Error al guardar el borrador', error: qErr }, { status: 500 });
        }
        return NextResponse.json({ message: 'Error al guardar el borrador' }, { status: 500 });
      }

      let itemsSaved = 0;
      if (items.length > 0) {
        console.log('[DEBUG] Draft items payload (raw):', items);
        const rows = items.map(it => ({
          quote_id: inserted.id,
          product_id: it.product_id ?? null,
          name: it.name ?? null,
          image_url: it.image_url ?? null,
          unit_size: it.unit_size ?? null,
          measurement_unit: it.measurement_unit ?? null,
          qty: Number(it.qty) || 0,
          price: Number(it.price) || 0,
          update_price: typeof it.update_price === 'number' ? it.update_price : (it.update_price != null ? Number(it.update_price) : (typeof it.price === 'number' ? it.price : 0)),
          discount: typeof it.discount === 'number' ? it.discount : (it.discount != null ? Number(it.discount) : 0),
          company: contact.company || null,
          email: contact.email || null,
          phone: contact.phone || null,
          document: contact.rut || contact.document || null,
          company_address: contact.company_address || null,
          contact_name: contact.contact_name || null,
        }));
        console.log('[DEBUG] Draft rows to insert:', rows);

        try {
          const { data: insertedItems, error: itemsErr, count } = await supabase
            .from('fasercon_quote_items')
            .insert(rows, { count: 'exact' });
          if (itemsErr) {
            console.error('Error guardando items de borrador:', itemsErr, 'rows:', rows);
            // In development expose the error details to the client to help debugging
            if (process.env.NODE_ENV !== 'production') {
              return NextResponse.json({ message: 'Borrador guardado, pero error insertando items', id: inserted.id, itemsSaved: 0, itemsError: itemsErr }, { status: 201 });
            }
          } else {
            itemsSaved = Array.isArray(insertedItems)
              ? (insertedItems as any[]).length
              : (typeof count === 'number' ? count : rows.length);
          }
        } catch (insEx) {
          console.error('Excepción al insertar items de borrador:', insEx, 'rows:', rows);
          if (process.env.NODE_ENV !== 'production') {
            return NextResponse.json({ message: 'Excepción al insertar items de borrador', id: inserted.id, itemsSaved: 0, exception: String(insEx) }, { status: 500 });
          }
        }
      }

      return NextResponse.json({ message: 'Borrador guardado.', id: inserted.id, itemsSaved, quote_number: inserted.quote_number ?? null }, { status: 201 });
    }

    // Branch 1: New pre-sale schema with items
    if (body && body.contact && Array.isArray(body.items)) {
      const { contact, items } = preSaleSchema.parse(body)
      // Normalize contact name capitalization
      contact.contact_name = capitalizeName(contact.contact_name || '')

      console.log('Parsed contact:', contact)
      console.log('Parsed items:', items)

      // Crear o actualizar la cotización principal. Si el cliente envía
      // `parent_quote_id` or `parent_correlative` indicates a resend
      // and the existing row will be updated (saving a new version in the versions table).
      const correlativeNext = await computeNextCorrelative();
      const quote_number = correlativeNext;

      let quote: Record<string, unknown> | null = null;
      let isNew = false;

      // Detect resend/update if parent_quote_id or parent_correlative is present
      const parentId = (body.parent_quote_id as string) || null;
      const parentCorrelative = (body.parent_correlative as string) || null;

      if (parentId || parentCorrelative) {
        // Buscar la cotización existente
        const lookup = parentId
          ? await supabase.from('fasercon_quotes').select('*').eq('id', parentId).single()
          : await supabase.from('fasercon_quotes').select('*').eq('correlative', parentCorrelative).single();
        if (!lookup.data) {
          console.error('Parent quote not found for creating version', parentId || parentCorrelative);
          return NextResponse.json({ message: 'Parent quote not found' }, { status: 404 });
        }
        const existing = lookup.data as Record<string, unknown>;
        // Actualizar la cotización principal con los nuevos datos
        const newStatus = 'PENDING'
        const adminNotes = body.draft ? JSON.stringify({ draft: true, savedAt: new Date().toISOString() }) : null;
        const { data: updated, error: updErr } = await supabase
          .from('fasercon_quotes')
          .update({
            name: contact.company,
            email: contact.email,
            phone: contact.phone,
            document: contact.rut || contact.document || null,
            company_address: contact.company_address || null,
            contact_name: contact.contact_name || null,
            quote_number: quote_number,
            status: newStatus,
            admin_notes: adminNotes,
          })
          .eq('id', existing.id)
          .select()
          .single();
        if (updErr || !updated) {
          console.error('Error actualizando cotización existente:', updErr);
          return NextResponse.json({ message: 'Error al actualizar la cotización' }, { status: 500 });
        }
        quote = updated;

        // Cambiar el estado a 'SENT' si es la primera cotización
        if (quote && !quote.correlative) {
          const nextCorrelative = await computeNextCorrelative();

          const { data: updatedQuote, error: updateErr } = await supabase
            .from('fasercon_quotes')
            .update({
              correlative: nextCorrelative,
              status: 'SENT', // Cambiar el estado a SENT
            })
            .eq('id', quote.id)
            .select()
            .single();

          if (updateErr || !updatedQuote) {
            console.error('Error actualizando la primera cotización:', updateErr);
            return NextResponse.json({ message: 'Error al enviar la primera cotización' }, { status: 500 });
          }

          console.log('Primera cotización enviada con correlativo:', nextCorrelative);
          quote = updatedQuote;
        }
      } else {
        // Insertar nueva cotización
        const newStatus = 'PENDING'
        const adminNotes = body.draft ? JSON.stringify({ draft: true, savedAt: new Date().toISOString() }) : null;
        const { data: inserted, error: qErr } = await supabase
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
              status: newStatus,
              admin_notes: adminNotes,
              quote_number: quote_number,
              document: contact.rut || contact.document || null,
              company_address: contact.company_address || null,
              contact_name: contact.contact_name || null,
            }
          ])
          .select()
          .single();
        if (qErr || !inserted) {
          console.error('Error insertando cotización:', qErr)
          return NextResponse.json({ message: 'Error al guardar la cotización' }, { status: 500 })
        }
        quote = inserted;
        isNew = true;
      }

      // Try to insert items in fasercon_quote_items only when creating a new quote
      let itemsSaved = 0
      if (isNew && items.length > 0 && quote) {
        const rows = items.map(it => ({
          quote_id: quote.id,
          product_id: it.product_id,
          name: it.name,
          image_url: it.image_url ?? null,
          unit_size: it.unit_size ?? null,
          measurement_unit: it.measurement_unit ?? null,
          qty: it.qty,
          price: it.price ?? 0,
          update_price: typeof it.update_price === 'number' ? it.update_price : (it.update_price != null ? Number(it.update_price) : (typeof it.price === 'number' ? it.price : 0)),
          discount: typeof it.discount === 'number' ? it.discount : (it.discount != null ? Number(it.discount) : 0),
          // NO guardamos characteristics aquí - se obtienen desde fasercon_products
          company: contact.company, // Add company data
          email: contact.email,     // Add email data
          phone: contact.phone,      // Add phone data
          document: contact.rut || contact.document, // Ensure RUT/document is added
          company_address: contact.company_address, // Uniformar: dirección en cada ítem
          contact_name: contact.contact_name, // Uniformar: nombre contacto en cada ítem
        }))
        console.log('[DEBUG] New quote rows to insert:', rows);
        // Determine which client to use for items insertion.
        // For drafts we can use the regular supabase client; for final inserts prefer supabaseAdmin.
        const clientForItems = body.draft ? supabase : supabaseAdmin;

        // Ensure quote_id is present for fasercon_quote_items
        if (!quote.id) {
          console.error('Quote ID is missing. Cannot insert items.');
          return NextResponse.json(
            { message: 'Error interno del servidor: falta el ID de la cotización.' },
            { status: 500 }
          );
        }

        try {
          const { error: itemsErr, count } = await clientForItems
            .from('fasercon_quote_items')
            .insert(rows, { count: 'exact' })

          if (itemsErr) {
            console.error('Error guardando items de cotización:', itemsErr)
          } else if (typeof count === 'number') {
            itemsSaved = count
          } else {
            itemsSaved = rows.length
          }
        } catch (insertEx) {
          console.error('Excepción al insertar items:', insertEx)
        }
      } else if (!isNew) {
        // When updating/resending an existing quote we intentionally DO NOT insert items
        // to avoid duplicating rows in `fasercon_quote_items`. Existing items remain as-is.
        console.log('Skipping items insertion for updated quote (avoiding duplicates).')
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

      // Insertar un registro de versión en `fasercon_quote_versions`.
      let createdVersion: number | null = null;
      if (quote) {
        try {
          // Determinar el siguiente número de versión
          let nextVersion = 1;
          const { data: lastVersionRow, error: lastErr } = await supabase
            .from('fasercon_quote_versions')
            .select('version')
            .eq('quote_id', quote.id)
          .order('version', { ascending: false })
          .limit(1)
          .single();
        if (!lastErr && lastVersionRow && typeof lastVersionRow.version === 'number') {
          nextVersion = lastVersionRow.version + 1;
        } else if (isNew) {
          nextVersion = 1;
        }

        const payload = {
          contact,
          items: enrichedItems,
          meta: {
            itemsSaved,
            isNew,
            generatedAt: new Date().toISOString(),
          },
        };

        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
          console.warn('SUPABASE_SERVICE_ROLE_KEY not present; skipping version insert.');
        } else {
          const { error: verErr } = await supabaseAdmin
            .from('fasercon_quote_versions')
            .insert([
              {
                    quote_id: quote.id,
                    correlative: quote.quote_number,
                    payload: payload,
                    version: nextVersion,
                    created_by: contact.email || null,
                  },
            ]);
          if (verErr) {
            console.error('Error insertando versión de cotización:', verErr);
          } else {
            createdVersion = nextVersion;
            console.log('Versión de cotización guardada:', quote.id, 'v' + nextVersion);
          }
        }
        } catch (vErr) {
          console.error('Excepción al crear versión de cotización:', vErr);
        }
      }

      // Crear una versión incluso para la primera cotización
      if (isNew && quote) {
        const payload = {
          contact,
          items: enrichedItems,
          meta: {
            itemsSaved,
            isNew,
            generatedAt: new Date().toISOString(),
          },
        };

        const { error: versionErr } = await supabaseAdmin
          .from('fasercon_quote_versions')
          .insert([
            {
              quote_id: quote.id,
              correlative: quote.quote_number,
              payload: payload,
              version: 1,
              created_by: contact.email || null,
              created_at: new Date().toISOString(),
            },
          ]);

        if (versionErr) {
          console.error('Error creando la versión inicial de la cotización:', versionErr);
        } else {
          console.log('Versión inicial creada para la cotización:', quote.id);
        }
      }

      // Manejar versiones en fasercon_quote_versions
      if (!isNew && body.changes && quote) {
        const { discounts, prices } = body.changes;
        const { data: versions, error: versionErr } = await supabase
          .from('fasercon_quote_versions')
          .select('id')
          .eq('quote_id', quote.id);

        if (versionErr) {
          console.error('Error obteniendo versiones existentes:', versionErr);
          return NextResponse.json({ message: 'Error al manejar versiones' }, { status: 500 });
        }

        if (versions.length >= 5) {
          return NextResponse.json({ message: 'Límite de versiones alcanzado' }, { status: 400 });
        }

        const { error: insertErr } = await supabase
          .from('fasercon_quote_versions')
          .insert({
            quote_id: quote.id,
            discounts,
            prices,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertErr) {
          console.error('Error insertando nueva versión:', insertErr);
          return NextResponse.json({ message: 'Error al guardar la nueva versión' }, { status: 500 });
        }
      }

      // Email sending intentionally omitted here to avoid duplicate messages.
      // The front-end should call `/api/generate-quote-pdf` with `sendEmail: true`
      // when it wants to actually send the quote to the client.
      const emailSuccess: boolean | null = null;
      return NextResponse.json(
        {
          message: emailSuccess
            ? 'Cotización enviada exitosamente'
            : 'Cotización guardada.',
          id: quote?.id,
          itemsSaved,
          emailSuccess,
          correlative: quote?.quote_number,
          quote_number: quote?.quote_number,
          version: createdVersion,
        },
        { status: 201 }
      )
    }

    // Branch 2: Legacy calculator payload
    const validatedData = quoteSchema.parse(body)

    // Generar correlativo para el payload legacy también
    const legacyCorrelative = await computeNextCorrelative();
    const quote_number = legacyCorrelative;

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
          quote_number,
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