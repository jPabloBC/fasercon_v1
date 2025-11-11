import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const ids: Array<string | number> = body.ids || []
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const { data, error } = await supabaseAdmin
      .from('fasercon_products')
      .select('*')
      .in('id', ids)

    if (error) {
      console.error('Error fetching products batch:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (e) {
    console.error('Batch products error', e)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
