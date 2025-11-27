import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// DBProductRow type removed because it's not used in current handlers.

// ProductRowWithSupplier type removed because it's not currently used.

// Helper function to convert decimals to fractions
function decimalToFraction(decimal: number) {
  const tolerance = 1.0e-6 // Tolerance for floating-point precision
  let numerator = 1
  let denominator = 1
  let fraction = numerator / denominator

  while (Math.abs(fraction - decimal) > tolerance) {
    if (fraction < decimal) {
      numerator++
    } else {
      denominator++
      numerator = Math.round(decimal * denominator)
    }
    fraction = numerator / denominator
  }

  return `${numerator}/${denominator}`
}

// Usamos la tabla `fasercon_products` según la convención del proyecto
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sku = searchParams.get('sku');
  const name = searchParams.get('name');
  const q = searchParams.get('q');
  const publicOnly = searchParams.get('public');

  try {

    if (q || sku || name || publicOnly) {
      // If a free-text query `q` is provided, search across multiple product columns
      if (q) {
        const ilikeQ = `%${q}%`;
        // Only search across textual product fields. Exclude JSON/array and numeric
        // columns (e.g. characteristics, features, applications, unit_size) because
        // applying `ilike` to jsonb/numeric types causes Postgres/PostgREST errors
        // such as: "operator does not exist: jsonb ~~* unknown".
        const textFields = [
          'name',
          'description',
          'sku',
          'manufacturer',
          'measurement_unit',
          'measurement_type',
        ];
        const orExpr = textFields.map((f) => `${f}.ilike.${ilikeQ}`).join(',');

        const { data, error } = await supabaseAdmin
          .from('fasercon_products')
          .select('*')
          .or(orExpr)
          .order('order', { ascending: true })
          .limit(1000);

        if (error) {
          console.error('Error buscando productos (q):', error)
          return NextResponse.json({ error: 'Error al buscar productos' }, { status: 500 })
        }

        const products = (data || []).map((product) => {
          if (product.unit_size && !isNaN(product.unit_size)) {
            const decimalValue = parseFloat(product.unit_size)
            product.unit_size = decimalToFraction(decimalValue)
          }
          try {
            const imgs = Array.isArray(product.image_url) ? (product.image_url as unknown[]) : (product.image_url ? [product.image_url] : [])
            const cleaned = imgs.map((u: unknown) => (typeof u === 'string' ? u.trim() : '')).filter(Boolean) as string[]
            ;(product as Record<string, unknown>).images = cleaned.length ? cleaned : null
            ;(product as Record<string, unknown>).image_url = cleaned.length ? cleaned[0] : null
          } catch {}
          // DEBUG: Log para verificar qué campos tiene el producto
          console.log('PRODUCTO:', {
            id: product.id,
            name: product.name,
            sku: product.sku,
            description: product.description,
            image_url: product.image_url,
            characteristics: product.characteristics
          })
          return product
        })

        return NextResponse.json({ products })
      }

      const query = supabaseAdmin.from('fasercon_products').select('*')

      if (sku) {
        query.eq('sku', sku)
      }
      if (name) {
        query.ilike('name', `%${name}%`)
      }
      // Nota: por ahora no filtramos por "visible" para que el catálogo no se quede vacío.

      const { data, error } = await query.order('order', { ascending: true }).limit(1000)

      if (error) {
        console.error('Error buscando productos:', error)
        return NextResponse.json({ error: 'Error al buscar productos' }, { status: 500 })
      }

      const products = (data || []).map((product) => {
        if (product.unit_size && !isNaN(product.unit_size)) {
          const decimalValue = parseFloat(product.unit_size)
          product.unit_size = decimalToFraction(decimalValue)
        }
        // Normalize image_url: if it's an array keep as-is, if string keep as single element array
        try {
          const imgs = Array.isArray(product.image_url) ? (product.image_url as unknown[]) : (product.image_url ? [product.image_url] : [])
          const cleaned = imgs.map((u: unknown) => (typeof u === 'string' ? u.trim() : '')).filter(Boolean) as string[]
          // add images array and ensure image_url is first image or null
          ;(product as Record<string, unknown>).images = cleaned.length ? cleaned : null
          ;(product as Record<string, unknown>).image_url = cleaned.length ? cleaned[0] : null
        } catch {}
        return product
      })

      return NextResponse.json({ products })
    } else {
      // Fetch all products
      const { data, error } = await supabaseAdmin
        .from('fasercon_products')
        .select('*')
        .order('order', { ascending: true })

      if (error) {
        console.error('Error fetching products:', error)
        return NextResponse.json({ error: 'Error al obtener productos' }, { status: 500 })
      }

      const products = (data || []).map((product) => {
        if (product.unit_size && !isNaN(product.unit_size)) {
          const decimalValue = parseFloat(product.unit_size)
          product.unit_size = decimalToFraction(decimalValue)
        }
        try {
          const imgs = Array.isArray(product.image_url) ? (product.image_url as unknown[]) : (product.image_url ? [product.image_url] : [])
          const cleaned = imgs.map((u: unknown) => (typeof u === 'string' ? u.trim() : '')).filter(Boolean) as string[]
          ;(product as Record<string, unknown>).images = cleaned.length ? cleaned : null
          ;(product as Record<string, unknown>).image_url = cleaned.length ? cleaned[0] : null
        } catch {}
        return product
      })

      return NextResponse.json({ products })
    }
  } catch (error) {
    console.error('Unexpected error in GET:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body
    if (!id) return NextResponse.json({ error: 'Missing product id' }, { status: 400 })

  const toUpdate: Record<string, unknown> = {}
    if (updates.name !== undefined) toUpdate.name = updates.name
    if (updates.description !== undefined) toUpdate.description = updates.description
    if (updates.image !== undefined) {
      // Aceptar string o array para imágenes y normalizar a array (o null)
      const img = (updates as Record<string, unknown>).image as unknown
      toUpdate.image_url = Array.isArray(img) ? img : (img ? [img as string] : null)
    }
    if (updates.features !== undefined) toUpdate.features = updates.features
    if (updates.applications !== undefined) toUpdate.applications = updates.applications
    if (updates.price !== undefined) toUpdate.price = updates.price
    if (updates.visible !== undefined) toUpdate.visible = updates.visible
    if (updates.order !== undefined) toUpdate.order = updates.order
    // If order is provided, shift other products with order >= new value to avoid duplicates
    if (updates.order !== undefined) {
      try {
        const minOrder = Number(updates.order || 0)
        const { data: rows, error: selErr } = await supabaseAdmin
          .from('fasercon_products')
          .select('id, order')
          .gte('order', minOrder)
          .neq('id', id)
          .order('order', { ascending: false })

        if (!selErr && Array.isArray(rows)) {
          // rows contain { id, order }
          for (const r of rows as Array<{ id: string; order?: number | null }>) {
            const current = r.order ?? 0
            await supabaseAdmin.from('fasercon_products').update({ order: current + 1 }).eq('id', r.id)
          }
        }
      } catch (e) {
        console.error('Error shifting orders on PATCH:', e)
      }
    }
  if (updates.stock !== undefined) toUpdate.stock = updates.stock
  // manufacturer may not exist in the schema (dev setups without migrations). Check before updating.
  let manufacturerSkipped = false
  if (updates.manufacturer !== undefined) {
    try {
      const { error: testErr } = await supabaseAdmin.from('fasercon_products').select('manufacturer').limit(1)
      if (testErr) {
        // column likely doesn't exist in this DB/schema
        console.warn('Manufacturer column not present, skipping manufacturer update', testErr)
        manufacturerSkipped = true
      } else {
        toUpdate.manufacturer = updates.manufacturer
      }
    } catch (e) {
      console.warn('Error checking manufacturer column, skipping update', e)
      manufacturerSkipped = true
    }
  }
  if (updates.characteristics !== undefined) toUpdate.characteristics = updates.characteristics
  if (updates.measurement_type !== undefined) toUpdate.measurement_type = updates.measurement_type
  if (updates.measurement_unit !== undefined) toUpdate.measurement_unit = updates.measurement_unit
  if (updates.sku !== undefined) toUpdate.sku = updates.sku
  // sanitize SKU on update: keep only digits; if empty, generate a new numeric sku
  if (updates.sku !== undefined) {
    const raw = String(updates.sku || '')
    const digits = raw.replace(/\D+/g, '')
    if (digits.length > 0) toUpdate.sku = digits
    else {
      // generate a new numeric sku
      const generateNumericSku = async () => {
        for (let i = 0; i < 10; i++) {
          const num = Math.floor(100000 + Math.random() * 900000) // 6-digit
          const candidate = String(num)
          const { data: existing, error: selErr } = await supabaseAdmin
            .from('fasercon_products')
            .select('id')
            .eq('sku', candidate)
            .limit(1)

          if (selErr) {
            console.error('Error checking SKU uniqueness:', selErr)
            continue
          }
          if (!existing || (Array.isArray(existing) && existing.length === 0)) {
            return candidate
          }
        }
        return String(Date.now()).slice(-6)
      }
  toUpdate.sku = await generateNumericSku()
    }
  }
  if (updates.measurement_type_other !== undefined) toUpdate.measurement_type_other = updates.measurement_type_other
  if (updates.measurement_unit_other !== undefined) toUpdate.measurement_unit_other = updates.measurement_unit_other
  if (updates.unit_size !== undefined) toUpdate.unit_size = updates.unit_size
    toUpdate.updated_at = new Date().toISOString()

    // Handle supplier update: allow client to send supplier as object {id,..}, as string (name), or empty to unlink
    if (updates.supplier !== undefined) {
      const s = updates.supplier
      if (s === null || s === '') {
        toUpdate.supplier_id = null
      } else if (typeof s === 'object' && s.id) {
        toUpdate.supplier_id = s.id
      } else if (typeof s === 'string') {
        const supplierName = String(s).trim()
        if (!supplierName) toUpdate.supplier_id = null
        else {
          // try find existing by name
          const { data: foundByName, error: findErr } = await supabaseAdmin.from('fasercon_suppliers').select('id').ilike('name', supplierName).limit(1)
          if (!findErr && foundByName && foundByName.length) {
            toUpdate.supplier_id = foundByName[0].id
          } else {
            // create new supplier with given name
            const { data: created, error: createErr } = await supabaseAdmin.from('fasercon_suppliers').insert([{ name: supplierName }]).select().single()
            if (!createErr && created) toUpdate.supplier_id = created.id
          }
        }
      }
    }

    // normalize empty manufacturer to null to avoid DB type errors
    if (toUpdate.manufacturer === '') toUpdate.manufacturer = null

    const { data, error } = await supabaseAdmin
      .from('fasercon_products')
      .update(toUpdate)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating product:', error)
      // return error details to the client for debugging (safe in dev)
      const resp: Record<string, unknown> = { error: 'Error al actualizar producto', details: error?.message || String(error) }
      if (manufacturerSkipped) (resp as Record<string, unknown>).manufacturer_skipped = true
      return NextResponse.json(resp, { status: 500 })
    }

    const resp: Record<string, unknown> = { message: 'Producto actualizado', product: data }
    if (manufacturerSkipped) (resp as Record<string, unknown>).manufacturer_skipped = true
    return NextResponse.json(resp)
  } catch (error) {
    console.error('Unexpected error updating product:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation logic
    const errors: string[] = [];

    if (!body?.name || typeof body.name !== 'string') {
      errors.push('Name is required and must be a string.');
    }

    if (body.price !== undefined && typeof body.price !== 'number') {
      errors.push('Price must be a number.');
    }

    if (body.stock !== undefined && typeof body.stock !== 'number') {
      errors.push('Stock must be a number.');
    }

    if (body.visible !== undefined && typeof body.visible !== 'boolean') {
      errors.push('Visible must be a boolean.');
    }

    if (body.order !== undefined && typeof body.order !== 'number') {
      errors.push('Order must be a number.');
    }

    // Validate and convert unit_size to decimal if it's a fraction
    if (body.unit_size) {
      const sanitizedUnitSize = String(body.unit_size).trim();
      if (/^[0-9]+\/[0-9]+$/.test(sanitizedUnitSize)) {
        const [numerator, denominator] = sanitizedUnitSize.split('/').map(Number);
        if (denominator === 0) {
          return NextResponse.json({ error: 'Invalid unit_size: division by zero.' }, { status: 400 });
        }
        body.unit_size = numerator / denominator; // Convert to decimal
      } else if (/^[0-9]+(\.[0-9]+)?$/.test(sanitizedUnitSize)) {
        body.unit_size = parseFloat(sanitizedUnitSize); // Use as decimal
      } else {
        return NextResponse.json({ error: 'Invalid unit_size format. Must be numeric or a fraction (e.g., "1/2").' }, { status: 400 });
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    // Generate numeric SKU server-side if not provided (6 digits)
    const generateNumericSku = async () => {
      for (let i = 0; i < 10; i++) {
        const num = Math.floor(100000 + Math.random() * 900000); // 6-digit
        const candidate = String(num);
        const { data: existing, error: selErr } = await supabaseAdmin
          .from('fasercon_products')
          .select('id')
          .eq('sku', candidate)
          .limit(1);

        if (selErr) {
          console.error('Error checking SKU uniqueness:', selErr);
          continue;
        }
        if (!existing || (Array.isArray(existing) && existing.length === 0)) {
          return candidate;
        }
      }
      // fallback numeric timestamp
      return String(Date.now()).slice(-6);
    };

    // Sanitize incoming SKU if provided: keep only digits
    let skuToUse: string | null = null;
    if (body.sku) {
      const cleaned = String(body.sku).replace(/\D+/g, '');
      if (cleaned.length > 0) skuToUse = cleaned;
      else skuToUse = await generateNumericSku();
    } else {
      skuToUse = await generateNumericSku();
    }

    // Server-side: ensure SKU is unique (avoid duplicates). If exists, return 409 Conflict
    if (skuToUse) {
      try {
        const { data: existingSku, error: skuErr } = await supabaseAdmin
          .from('fasercon_products')
          .select('id')
          .eq('sku', skuToUse)
          .limit(1);
        if (skuErr) console.error('Error checking SKU uniqueness on server:', skuErr);
        if (existingSku && existingSku.length > 0) {
          return NextResponse.json({ error: 'SKU already exists' }, { status: 409 });
        }
      } catch (e) {
        console.error('Error checking SKU uniqueness on server (exception):', e);
      }
    }

    // If an order is provided on create, shift existing products with order >= this order
    if (body.order !== undefined && body.order !== null) {
      try {
        const minOrder = Number(body.order || 0);
        const { data: rows, error: selErr } = await supabaseAdmin
          .from('fasercon_products')
          .select('id, order')
          .gte('order', minOrder)
          .order('order', { ascending: false });

        if (!selErr && Array.isArray(rows)) {
          for (const r of rows as Array<{ id: string; order?: number | null }>) {
            const current = r.order ?? 0;
            await supabaseAdmin.from('fasercon_products').update({ order: current + 1 }).eq('id', r.id);
          }
        }
      } catch (e) {
        console.error('Error shifting orders on POST:', e);
      }
    }

    const insertObj: Record<string, unknown> = {
      name: body.name,
      description: body.description || null,
      image_url: Array.isArray(body.image) ? body.image : (body.image ? [body.image] : null),
      features: body.features || null,
      applications: body.applications || null,
      price: body.price ?? null,
      visible: body.visible ?? true,
      order: body.order ?? 0,
      stock: body.stock ?? null,
      characteristics: body.characteristics || null,
      measurement_type: body.measurement_type || null,
      measurement_unit: body.measurement_unit || null,
      sku: skuToUse || null,
      unit_size: body.unit_size ?? null,
      supplier_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // If supplier info was provided, handle as string, object, or object with id
    if (body.supplier) {
      // If client provided supplier.id directly, trust it
      if (typeof body.supplier === 'object' && body.supplier.id) {
        insertObj.supplier_id = body.supplier.id;
      } else if (typeof body.supplier === 'string') {
        const supplierName = String(body.supplier).trim();
        const { data: found, error: findErr } = await supabaseAdmin
          .from('fasercon_suppliers')
          .select('*')
          .ilike('name', supplierName)
          .limit(1);

        if (!findErr && found && found.length > 0) {
          insertObj.supplier_id = found[0].id;
        } else {
          const { data: created, error: createErr } = await supabaseAdmin
            .from('fasercon_suppliers')
            .insert([{ name: supplierName }])
            .select()
            .single();
          if (!createErr && created) insertObj.supplier_id = created.id;
        }
      } else if (typeof body.supplier === 'object') {
        const s = body.supplier as Record<string, unknown>;
        const supplierName = String(s.name || '').trim();
        // try find by name or email if provided
        let found = null;
        if (s.email) {
          const { data: byEmail } = await supabaseAdmin
            .from('fasercon_suppliers')
            .select('*')
            .ilike('email', String(s.email))
            .limit(1);
          if (byEmail && byEmail.length) found = byEmail[0];
        }
        if (!found && supplierName) {
          const { data: byName } = await supabaseAdmin
            .from('fasercon_suppliers')
            .select('*')
            .ilike('name', supplierName)
            .limit(1);
          if (byName && byName.length) found = byName[0];
        }
        if (found) insertObj.supplier_id = found.id;
        else {
          const insertSupplier: Record<string, unknown> = { name: supplierName || null };
          if (s.email) insertSupplier.email = s.email;
          if (s.address) insertSupplier.address = s.address;
          if (s.country) insertSupplier.country = s.country;
          const { data: created, error: createErr } = await supabaseAdmin
            .from('fasercon_suppliers')
            .insert([insertSupplier])
            .select()
            .single();
          if (!createErr && created) insertObj.supplier_id = created.id;
        }
      }
    }

    const { data, error } = await supabaseAdmin
      .from('fasercon_products')
      .insert([insertObj])
      .select()
      .single();

    if (error) {
      console.error('Error inserting product:', error);
      console.log('Insert object on error:', insertObj);
      return NextResponse.json({ error: 'Error al crear producto' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Producto creado', product: data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error creating product:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
