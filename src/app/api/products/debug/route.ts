import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  }

  try {
    const { data, error } = await supabaseAdmin.from('fasercon_products').select('*')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ rows: data })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Unexpected' }, { status: 500 })
  }
}
