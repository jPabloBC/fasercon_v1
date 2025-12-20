import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(_request: Request, { params }: { params: any }) {
  try {
    const { id, version } = await params;
    if (!id || !version) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

    // support 'latest' keyword
    if (version === 'latest') {
      const { data: latest, error: latestErr } = await supabaseAdmin
        .from('fasercon_quote_versions')
        .select('id, quote_id, version, payload, correlativo, created_by, created_at')
        .eq('quote_id', id)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestErr) {
        console.error('[api/version] DB error:', latestErr);
        return NextResponse.json({ error: 'DB error' }, { status: 500 });
      }
      if (!latest) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json(latest);
    }

    const verNum = Number(version);
    if (isNaN(verNum)) return NextResponse.json({ error: 'Invalid version' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('fasercon_quote_versions')
      .select('id, quote_id, version, payload, correlativo, created_by, created_at')
      .eq('quote_id', id)
      .eq('version', verNum)
      .maybeSingle();

    if (error) {
      console.error('[api/version] DB error:', error);
      return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(data);
  } catch (err) {
    console.error('[api/version] Unexpected error:', err);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
