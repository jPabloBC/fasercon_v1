import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function DELETE(req: Request, context: any) {
  const { params } = context || {}
  try {
    const id = params?.id;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const { error } = await supabaseAdmin.from('fasercon_clients').delete().eq('id', id);
    if (error) {
      console.error('client delete error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
