import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    // Permitimos actualizar campos generales: name, email, phone, description, execution_time, payment_method
    const allowed: Record<string, unknown> = {};
    const fields = ['name', 'email', 'phone', 'description', 'execution_time', 'payment_method'];
    for (const f of fields) {
      if (Object.prototype.hasOwnProperty.call(body, f)) allowed[f] = (body as any)[f];
    }

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('fasercon_quotes')
      .update(allowed)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating quote:', error);
      return NextResponse.json({ error: error.message || 'Error actualizando cotización' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Cotización actualizada', quote: data });
  } catch (e) {
    console.error('Unexpected error in PATCH /api/quotes/[id]:', e);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
