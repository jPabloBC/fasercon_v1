import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { status } = await request.json();
    if (!id || !status) {
      return NextResponse.json({ error: 'ID y status requeridos' }, { status: 400 });
    }
    const { error: updateError } = await supabaseAdmin.from('fasercon_contact_forms').update({ status }).eq('id', id);
    if (updateError) return NextResponse.json({ error: 'Error al actualizar el estado' }, { status: 500 });
    return NextResponse.json({ message: 'Estado actualizado' });
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
