import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(_request: Request, { params }: { params: any }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Missing quote id' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('fasercon_quote_versions')
      .select('id, version, correlativo, created_by, created_at')
      .eq('quote_id', id)
      .order('version', { ascending: false });

    if (error) {
      console.error('[api/versions] DB error:', error);
      return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error('[api/versions] Unexpected error:', err);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
