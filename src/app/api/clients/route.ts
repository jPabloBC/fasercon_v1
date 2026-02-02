import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * GET /api/clients
 * - If query param `q` is provided, performs a multi-field ilike search and returns up to 50 rows.
 * - Otherwise returns all clients ordered by created_at desc (limited to 1000 for safety).
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const company = url.searchParams.get('company') || 'fasercon'

    // Validar empresa
    if (!['fasercon', 'rym', 'vimal'].includes(company)) {
      return NextResponse.json({ error: 'Empresa inválida' }, { status: 400 })
    }

    const TABLE = `${company}_clients`

    const q = (url.searchParams.get('q') || '').trim()
    const name = (url.searchParams.get('name') || '').trim()

    if (q) {
      const ilikeQ = `%${q}%`
      const orExpr = [
        `company.ilike.${ilikeQ}`,
        `contact_name.ilike.${ilikeQ}`,
        `email.ilike.${ilikeQ}`,
        `phone.ilike.${ilikeQ}`,
        `document.ilike.${ilikeQ}`,
        `company_address.ilike.${ilikeQ}`,
        `region.ilike.${ilikeQ}`,
        `city.ilike.${ilikeQ}`,
        `country.ilike.${ilikeQ}`,
        `postal_code.ilike.${ilikeQ}`,
        `notes.ilike.${ilikeQ}`,
      ].join(',')

      const { data, error } = await supabaseAdmin.from(TABLE).select('*').or(orExpr).limit(50)
      if (error) {
        console.error('clients search error', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ clients: data || [] })
    }

    // name filter (simple ilike on company/contact_name/email)
    if (name) {
      const { data, error } = await supabaseAdmin
        .from(TABLE)
        .select('*')
        .or(`company.ilike.%${name}%,contact_name.ilike.%${name}%,email.ilike.%${name}%`)
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ clients: data || [] })
    }

    // default: return recent clients (safeguard limit)
    const { data, error } = await supabaseAdmin.from(TABLE).select('*').order('created_at', { ascending: false }).limit(1000)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ clients: data || [] })
  } catch (e) {
    console.error('GET /api/clients error', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url)
    const companyParam = url.searchParams.get('company') || 'fasercon'

    // Validar empresa
    if (!['fasercon', 'rym', 'vimal'].includes(companyParam)) {
      return NextResponse.json({ error: 'Empresa inválida' }, { status: 400 })
    }

    const TABLE = `${companyParam}_clients`

    const body = await req.json()
    const client = {
      company: body.company || body.name || '',
      contact_name: body.contact_name || null,
      email: body.email || null,
      phone: body.phone || null,
      document: body.document || null,
      company_address: body.company_address || null,
      city: body.city || null,
      region: body.region || null,
      country: body.country || null,
      postal_code: body.postal_code || null,
      notes: body.notes || null,
      is_active: typeof body.is_active === 'boolean' ? body.is_active : true,
      metadata: body.metadata || {},
    }

    // Try to update if same email or document exists
    if (client.email || client.document) {
      if (client.email) {
        const { data: found, error: fe } = await supabaseAdmin.from(TABLE).select('*').eq('email', client.email).maybeSingle()
        if (fe) console.warn('Error searching client by email', fe)
        if (found && found.id) {
          const { data: updated, error: ue } = await supabaseAdmin.from(TABLE).update(client).eq('id', found.id).select().maybeSingle()
          if (ue) return NextResponse.json({ error: ue.message }, { status: 500 })
          return NextResponse.json({ clients: updated })
        }
      }
      if (client.document) {
        const { data: found, error: fd } = await supabaseAdmin.from(TABLE).select('*').eq('document', client.document).maybeSingle()
        if (fd) console.warn('Error searching client by document', fd)
        if (found && found.id) {
          const { data: updated, error: ue2 } = await supabaseAdmin.from(TABLE).update(client).eq('id', found.id).select().maybeSingle()
          if (ue2) return NextResponse.json({ error: ue2.message }, { status: 500 })
          return NextResponse.json({ clients: updated })
        }
      }
    }

    const { data, error } = await supabaseAdmin.from(TABLE).insert(client).select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ clients: data }, { status: 201 })
  } catch (e) {
    console.error('POST /api/clients error', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const url = new URL(req.url)
    const companyParam = url.searchParams.get('company') || 'fasercon'

    // Validar empresa
    if (!['fasercon', 'rym', 'vimal'].includes(companyParam)) {
      return NextResponse.json({ error: 'Empresa inválida' }, { status: 400 })
    }

    const TABLE = `${companyParam}_clients`

    const body = await req.json()
    const id = body.id || body?.id?.toString()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const patch = { ...body }
    delete patch.id
    const { data, error } = await supabaseAdmin.from(TABLE).update(patch).eq('id', id).select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ clients: data })
  } catch (e) {
    console.error('PATCH /api/clients error', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url)
    const companyParam = url.searchParams.get('company') || 'fasercon'

    // Validar empresa
    if (!['fasercon', 'rym', 'vimal'].includes(companyParam)) {
      return NextResponse.json({ error: 'Empresa inválida' }, { status: 400 })
    }

    const TABLE = `${companyParam}_clients`

    const body = await req.json()
    const id = body.id || body?.id?.toString()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const { data, error } = await supabaseAdmin.from(TABLE).delete().eq('id', id).select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ clients: data })
  } catch (e) {
    console.error('DELETE /api/clients error', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
