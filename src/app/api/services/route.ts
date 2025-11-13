import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, images } = body;
    const { data, error } = await supabaseAdmin
      .from('fasercon_services')
      .insert({ title, description, images })
      .select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    try { revalidatePath('/services') } catch {}
    return NextResponse.json({ ok: true, data });
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, title, description, images } = body;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const { data, error } = await supabaseAdmin
      .from('fasercon_services')
      .update({ title, description, images })
      .eq('id', id)
      .select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    try { revalidatePath('/services') } catch {}
    return NextResponse.json({ ok: true, data });
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const { error } = await supabaseAdmin
      .from('fasercon_services')
      .delete()
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    try { revalidatePath('/services') } catch {}
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}
