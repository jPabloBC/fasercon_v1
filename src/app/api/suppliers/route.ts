import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const company = url.searchParams.get('company') || 'fasercon'

    // Validar empresa
    if (!['fasercon', 'rym', 'vimal'].includes(company)) {
      return NextResponse.json({ error: 'Empresa inválida' }, { status: 400 })
    }

    const TABLE_SUPPLIERS = `${company}_suppliers`

    const q = url.searchParams.get('q') || ''
    const limit = Number(url.searchParams.get('limit') || '20')
    const page = Math.max(1, Number(url.searchParams.get('page') || '1'))
    const offset = (page - 1) * limit

    let base = supabaseAdmin.from(TABLE_SUPPLIERS).select('*', { count: 'exact' }).order('name', { ascending: true })
    if (q) {
      const like = `%${q}%`
      base = supabaseAdmin.from(TABLE_SUPPLIERS).select('*', { count: 'exact' }).or(`name.ilike.${like},email.ilike.${like}`)
    }

    const { data, error, count } = await base.range(offset, offset + limit - 1)
    if (error) {
      console.error('Error fetching suppliers:', error)
      return NextResponse.json({ error: 'Error al obtener proveedores' }, { status: 500 })
    }

    return NextResponse.json({ data: data || [], total: typeof count === 'number' ? count : (data ? data.length : 0), page, limit })
  } catch (e) {
    console.error('Unexpected error fetching suppliers:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const company = url.searchParams.get('company') || 'fasercon'

    // Validar empresa
    if (!['fasercon', 'rym', 'vimal'].includes(company)) {
      return NextResponse.json({ error: 'Empresa inválida' }, { status: 400 })
    }

    const TABLE_SUPPLIERS = `${company}_suppliers`

    const body = await request.json()
    if (!body?.name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  // normalize contact_info: include phone/website inside it to avoid DB schema changes
  const contactInfo: Record<string, unknown> = body.contact_info && typeof body.contact_info === 'object' ? { ...(body.contact_info as Record<string, unknown>) } : {}
  if (body.phone) contactInfo.phone = body.phone
  if (body.website) contactInfo.website = body.website

    const insert = {
      name: body.name,
      contact_info: Object.keys(contactInfo).length ? contactInfo : null,
      email: body.email ?? null,
      phone: body.phone ?? null,
      website: body.website ?? null,
      address: body.address ?? null,
      country: body.country ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // try to avoid duplicates by name (case-insensitive)
    const { data: existing } = await supabaseAdmin.from(TABLE_SUPPLIERS).select('*').ilike('name', String(body.name)).limit(1)
    if (existing && existing.length) return NextResponse.json({ message: 'Proveedor ya existe', supplier: existing[0] })

    const { data, error } = await supabaseAdmin.from(TABLE_SUPPLIERS).insert([insert]).select().single()
    if (error) {
      console.error('Error creating supplier:', error)
      return NextResponse.json({ error: 'Error al crear proveedor' }, { status: 500 })
    }
    return NextResponse.json({ message: 'Proveedor creado', supplier: data }, { status: 201 })
  } catch (e) {
    console.error('Unexpected error creating supplier:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const company = url.searchParams.get('company') || 'fasercon'

    // Validar empresa
    if (!['fasercon', 'rym', 'vimal'].includes(company)) {
      return NextResponse.json({ error: 'Empresa inválida' }, { status: 400 })
    }

    const TABLE_SUPPLIERS = `${company}_suppliers`

    const body = await request.json()
    const { id, ...updates } = body
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const toUpdate: Record<string, unknown> = {}
    if (updates.name !== undefined) toUpdate.name = updates.name
    if (updates.email !== undefined) toUpdate.email = updates.email
    if (updates.address !== undefined) toUpdate.address = updates.address
    if (updates.country !== undefined) toUpdate.country = updates.country
    // Merge phone/website into contact_info when provided
    if (updates.contact_info !== undefined && typeof updates.contact_info === 'object') toUpdate.contact_info = updates.contact_info
    const mergedContact: Record<string, unknown> = {}
    if (toUpdate.contact_info && typeof toUpdate.contact_info === 'object') Object.assign(mergedContact, toUpdate.contact_info as Record<string, unknown>)
    if (updates.phone !== undefined) mergedContact.phone = updates.phone
    if (updates.website !== undefined) mergedContact.website = updates.website
    if (Object.keys(mergedContact).length) toUpdate.contact_info = mergedContact
    // also update top-level columns if they exist in the schema
    if (updates.phone !== undefined) toUpdate.phone = updates.phone
    if (updates.website !== undefined) toUpdate.website = updates.website
    toUpdate.updated_at = new Date().toISOString()

    const { data, error } = await supabaseAdmin.from(TABLE_SUPPLIERS).update(toUpdate).eq('id', id).select().single()
    if (error) {
      console.error('Error updating supplier:', error)
      return NextResponse.json({ error: 'Error al actualizar proveedor' }, { status: 500 })
    }
    return NextResponse.json({ message: 'Proveedor actualizado', supplier: data })
  } catch (e) {
    console.error('Unexpected error updating supplier:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const company = url.searchParams.get('company') || 'fasercon'

    // Validar empresa
    if (!['fasercon', 'rym', 'vimal'].includes(company)) {
      return NextResponse.json({ error: 'Empresa inválida' }, { status: 400 })
    }

    const TABLE_SUPPLIERS = `${company}_suppliers`
    const TABLE_PRODUCTS = `${company}_products`

    const body = await request.json()
    const { id } = body
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const { error } = await supabaseAdmin.from(TABLE_SUPPLIERS).delete().eq('id', id)
    if (error) {
      console.error('Error deleting supplier:', error)
      return NextResponse.json({ error: 'Error al eliminar proveedor' }, { status: 500 })
    }
    // Optionally nullify supplier_id on products that referenced it
    await supabaseAdmin.from(TABLE_PRODUCTS).update({ supplier_id: null }).eq('supplier_id', id)
    return NextResponse.json({ message: 'Proveedor eliminado' })
  } catch (e) {
    console.error('Unexpected error deleting supplier:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
