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
    country: z.string().optional().nullable(),
    region: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    postal_code: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
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

          // For any product_ids not found in fasercon_products, try fetching them from fasercon_quote_services
          const remainingIds = productIds.filter(id => !productsById[String(id)]);
          if (remainingIds.length > 0) {
            try {
              const { data: services, error: servErr } = await supabase
                .from('fasercon_quote_services')
                .select('*')
                .in('id', remainingIds);
              if (!servErr && Array.isArray(services)) {
                // Map services into productsById under the same id so frontend can read item.product uniformly
                services.forEach((s: any) => {
                  // Normalize service fields to match Product shape used by frontend
                  const mapped = {
                    id: s.id,
                    sku: s.sku ?? null,
                    name: s.title ?? s.name ?? null,
                    characteristics: s.characteristics ?? (s.metadata?.characteristics ?? []) ?? [],
                    unit_size: s.unit ?? null,
                    measurement_unit: s.unit_measure ?? null,
                    image_url: s.image_url ?? (Array.isArray(s.images) ? s.images[0] : null) ?? null,
                    // preserve original service object as well in case other fields are needed
                    _service: s,
                  };
                  productsById[String(s.id)] = mapped;
                });
              }
            } catch (e) {
              console.warn('Failed to fetch quote services for items:', e);
            }
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
          // Adjuntar datos completos del producto o servicio si existen y tipar correctamente
          let product = productsById[String(item.product_id)] || null;
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
      quote_number: quote.quote_number,
      correlative: quote.correlative,
      description: quote.description,
      execution_time: quote.execution_time || null,
      payment_method: quote.payment_method || null,
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
          // First, check for a one-time override stored in DB (atomicity is best-effort here).
          try {
            const { data: override, error: ovErr } = await supabase
              .from('fasercon_sequence_overrides')
              .select('name,next')
              .eq('name', 'quotes')
              .limit(1)
              .maybeSingle();
            if (!ovErr && override && typeof override.next === 'number') {
              // consume the override so it's only used once
              await supabase.from('fasercon_sequence_overrides').delete().eq('name', 'quotes');
              return String(override.next).padStart(4, '0');
            }
          } catch (ovEx) {
            console.warn('Failed to read sequence override:', ovEx);
          }
        // Check both quote_number and correlative columns to find the highest existing number
        const { data: quotesData } = await supabase
          .from('fasercon_quotes')
          .select('correlative, quote_number');
        const { data: versionsCorrelatives } = await supabase
          .from('fasercon_quote_versions')
          .select('correlative');
        const all = [] as Array<string | null | undefined>;
        if (Array.isArray(quotesData)) {
          all.push(...quotesData.map((r: { correlative?: string; quote_number?: string }) => r.quote_number || r.correlative));
        }
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
        // Use computed sequential next value from DB scans (no env-var fallback)
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
        country: z.string().optional().nullable(),
        region: z.string().optional().nullable(),
        city: z.string().optional().nullable(),
        postal_code: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
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
              description: body.description || null,
              execution_time: body.execution_time || null,
              payment_method: body.payment_method || null,
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
        const rows = items.map(it => {
          // Support items originating from fasercon_quote_services (title, images, unit, unit_measure)
          const candidateId = it.product_id ?? (it as any).id ?? null;
          const name = it.name ?? (it as any).title ?? null;
          const imageUrl = it.image_url ?? (Array.isArray((it as any).images) && (it as any).images.length ? (it as any).images[0] : null) ?? null;
          const unitSize = it.unit_size ?? (it as any).unit ?? null;
          const measurementUnit = it.measurement_unit ?? (it as any).unit_measure ?? null;
          const qty = Number(it.qty) || 0;
          const price = it.price != null ? Number(it.price) : 0;
          const updatePrice = typeof it.update_price === 'number' ? it.update_price : (it.update_price != null ? Number(it.update_price) : (typeof it.price === 'number' ? it.price : 0));
          const discount = typeof it.discount === 'number' ? it.discount : (it.discount != null ? Number(it.discount) : 0);
          return {
            quote_id: inserted.id,
            product_id: candidateId,
            name,
            image_url: imageUrl,
            unit_size: unitSize,
            measurement_unit: measurementUnit,
            qty,
            price,
            update_price: updatePrice,
            discount,
            company: contact.company || null,
            email: contact.email || null,
            phone: contact.phone || null,
            document: contact.rut || contact.document || null,
            company_address: contact.company_address || null,
            contact_name: contact.contact_name || null,
          };
        });
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

      // Handle client record: UPDATE if client_id exists, INSERT/UPSERT if new
      const clientId = body.client_id || null;
      try {
        const clientRow: Record<string, unknown> = {
          company: contact.company || null,
          contact_name: contact.contact_name || null,
          email: contact.email || null,
          phone: contact.phone || null,
          document: contact.rut || contact.document || null,
          company_address: contact.company_address || null,
          country: contact.country || null,
          region: contact.region || null,
          city: contact.city || null,
          postal_code: contact.postal_code || null,
          notes: contact.notes || null,
          is_active: true,
        };

        const clientDb = process.env.SUPABASE_SERVICE_ROLE_KEY ? supabaseAdmin : supabase;
        
        if (clientId) {
          // Cliente existente: hacer UPDATE para evitar duplicación
          try {
            const { data: updatedClient, error: updateErr } = await clientDb
              .from('fasercon_clients')
              .update(clientRow)
              .eq('id', clientId)
              .select()
              .maybeSingle();
            if (updateErr) {
              console.warn('Warning: failed to update existing client:', updateErr);
            } else {
              console.log('Updated existing client:', updatedClient?.id ?? updatedClient);
            }
          } catch (updateEx) {
            console.error('Exception updating existing client:', updateEx);
          }
        } else {
          // Cliente nuevo: intentar upsert solo cuando tenemos email o documento
          if (clientRow.email || clientRow.document) {
            const onConflict = clientRow.email ? 'email' : 'document';
            try {
              const { data: upsertedClient, error: clientErr } = await clientDb
                .from('fasercon_clients')
                .upsert([clientRow], { onConflict })
                .select()
                .maybeSingle();
              if (clientErr) {
                console.warn('Warning: failed to upsert client into fasercon_clients:', clientErr);
              }
              if (upsertedClient && (upsertedClient.id || upsertedClient.email)) {
                console.log('Upserted client:', upsertedClient?.id ?? upsertedClient);
              } else {
                // Fallback: try insert (use admin client if available)
                try {
                  const insertDb = process.env.SUPABASE_SERVICE_ROLE_KEY ? supabaseAdmin : supabase;
                  const { data: insertedClient, error: insertErr } = await insertDb
                    .from('fasercon_clients')
                    .insert([clientRow])
                    .select()
                    .maybeSingle();
                  if (insertErr) {
                    console.warn('Fallback insert into fasercon_clients failed:', insertErr);
                  } else {
                    console.log('Inserted client via fallback:', insertedClient?.id ?? insertedClient);
                  }
                } catch (insEx) {
                  console.error('Exception during fallback client insert:', insEx);
                }
              }
            } catch (upsertEx) {
              console.error('Exception upserting client:', upsertEx);
              // Try fallback insert
              try {
                const insertDb = process.env.SUPABASE_SERVICE_ROLE_KEY ? supabaseAdmin : supabase;
                const { data: insertedClient, error: insertErr } = await insertDb
                  .from('fasercon_clients')
                  .insert([clientRow])
                  .select()
                  .maybeSingle();
                if (insertErr) {
                  console.warn('Fallback insert into fasercon_clients failed:', insertErr);
                } else {
                  console.log('Inserted client via fallback after exception:', insertedClient?.id ?? insertedClient);
                }
              } catch (insEx) {
                console.error('Exception during fallback client insert after upsert error:', insEx);
              }
            }
          } else {
            console.log('Skipping client upsert: no email or document provided in contact payload');
          }
        }
      } catch (upsertErr) {
        console.error('Exception handling client record:', upsertErr);
      }

      console.log('Parsed contact:', contact)
      console.log('Parsed items:', items)

      // Crear o actualizar la cotización principal. Si el cliente envía
      // `parent_quote_id` or `parent_correlative` indicates a resend
      // and the existing row will be updated (saving a new version in the versions table).

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
            // IMPORTANT: do NOT update contact_name when sending; preserve original contact_name
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
        // Insertar nueva cotización con reintentos si el `quote_number` ya existe
        const newStatus = 'PENDING'
        const adminNotes = body.draft ? JSON.stringify({ draft: true, savedAt: new Date().toISOString() }) : null;
        let inserted: Record<string, unknown> | null = null;
        let insertErr: any = null;
        const maxAttempts = 5;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            const tryQuoteNumber = await computeNextCorrelative();
            console.log(`Attempting to insert quote with quote_number=${tryQuoteNumber} (attempt ${attempt}/${maxAttempts})`);
            const res = await supabase
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
                  correlative: tryQuoteNumber,
                  document: contact.rut || contact.document || null,
                  company_address: contact.company_address || null,
                  contact_name: contact.contact_name || null,
                  description: body.description || null,
                  execution_time: body.execution_time || null,
                  payment_method: body.payment_method || null,
                }
              ])
              .select()
              .single();
            insertErr = res.error;
            if (!insertErr && res.data) {
              inserted = res.data;
              if (inserted && typeof inserted === 'object' && 'id' in inserted) {
                console.log('Inserted quote:', inserted.id);
              } else {
                console.log('Inserted quote:', inserted);
              }
              break;
            }
            // If unique constraint on quote_number, retry
            if (insertErr && (insertErr.code === '23505' || String(insertErr.message).includes('duplicate key'))) {
              console.warn('Duplicate quote_number detected, will retry to compute a new one. Error:', insertErr.message || insertErr);
              // small delay to reduce race (non-blocking)
              await new Promise((r) => setTimeout(r, 100 * attempt));
              continue;
            }
            // Other errors: break and report
            break;
          } catch (ex) {
            insertErr = ex;
            console.error('Exception inserting quote (attempt ' + attempt + '):', ex);
            await new Promise((r) => setTimeout(r, 100 * attempt));
          }
        }
        if (!inserted) {
          console.error('Error insertando cotización:', insertErr)
          return NextResponse.json({ message: 'Error al guardar la cotización' }, { status: 500 })
        }
        quote = inserted;
        isNew = true;
      }

      // Insert items in fasercon_quote_items (append) — do not delete existing items
      let itemsSaved = 0
      if (items.length > 0 && quote) {
        const rows = items.map(it => {
          const candidateId = it.product_id ?? (it as any).id ?? null;
          // Support items originating from fasercon_quote_services (title, images, unit, unit_measure)
          const name = it.name ?? (it as any).title ?? null;
          const imageUrl = it.image_url ?? (Array.isArray((it as any).images) && (it as any).images.length ? (it as any).images[0] : null) ?? null;
          const unitSize = it.unit_size ?? (it as any).unit ?? null;
          const measurementUnit = it.measurement_unit ?? (it as any).unit_measure ?? null;
          const qty = Number(it.qty) || 0;
          const price = it.price != null ? Number(it.price) : 0;
          const updatePrice = typeof it.update_price === 'number' ? it.update_price : (it.update_price != null ? Number(it.update_price) : (typeof it.price === 'number' ? it.price : 0));
          const discount = typeof it.discount === 'number' ? it.discount : (it.discount != null ? Number(it.discount) : 0);
          return {
            quote_id: quote.id,
            product_id: candidateId,
            name,
            image_url: imageUrl,
            unit_size: unitSize,
            measurement_unit: measurementUnit,
            qty,
            price,
            update_price: updatePrice,
            discount,
            // NO guardamos characteristics ni sku aquí - se obtienen desde fasercon_products o fasercon_quote_services via product_id
            company: contact.company, // Add company data
            email: contact.email,     // Add email data
            phone: contact.phone,      // Add phone data
            document: contact.rut || contact.document, // Ensure RUT/document is added
            company_address: contact.company_address, // Uniformar: dirección en cada ítem
            contact_name: contact.contact_name, // Uniformar: nombre contacto en cada ítem
          };
        })
        console.log('[DEBUG] New quote rows to insert:', rows);
        // Determine which client to use for items insertion.
        // Use the admin client only when the service role key is present; otherwise fall back to the regular client.
        const clientForItems = process.env.SUPABASE_SERVICE_ROLE_KEY ? supabaseAdmin : supabase;

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
      }

      // Enrich items with details from the database (from both fasercon_products and fasercon_quote_services)
      const productIds = items.filter(it => it.product_id).map(item => item.product_id);
      let productsById = new Map();
      let servicesById = new Map();
      
      // Fetch from fasercon_products
      if (productIds.length > 0) {
        const { data: products, error: productsError } = await supabase
          .from('fasercon_products')
          .select('id, sku, name, characteristics, unit_size, measurement_unit')
          .in('id', productIds);

        if (!productsError && products) {
          productsById = new Map(products.map(p => [String(p.id), p]));
        }
      }

      // Fetch from fasercon_quote_services (for items without product_id or with service IDs)
      const serviceIds = items.filter(it => !it.product_id || !productsById.has(String(it.product_id))).map(item => item.product_id).filter(Boolean);
      if (serviceIds.length > 0) {
        const { data: services, error: servicesError } = await supabase
          .from('fasercon_quote_services')
          .select('id, sku, title, description, unit, unit_measure')
          .in('id', serviceIds);

        if (!servicesError && services) {
          servicesById = new Map(services.map(s => [String(s.id), s]));
        }
      }

      const enrichedItems = items.map(item => {
        const product = item.product_id ? productsById.get(String(item.product_id)) : null;
        const service = item.product_id && !product ? servicesById.get(String(item.product_id)) : null;
        
        if (product) {
          return {
            ...item,
            sku: product.sku ?? item.sku,
            name: product.name ?? item.name,
            characteristics: product.characteristics ?? item.characteristics,
            unit_size: product.unit_size ?? item.unit_size,
            measurement_unit: product.measurement_unit ?? item.measurement_unit,
          };
        } else if (service) {
          return {
            ...item,
            sku: service.sku ?? item.sku,
            name: service.title ?? item.name,
            characteristics: (service as any).description ? [(service as any).description] : (item.characteristics ?? []),
            unit_size: service.unit ?? item.unit_size,
            measurement_unit: service.unit_measure ?? item.measurement_unit,
          };
        } else {
          return item;
        }
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