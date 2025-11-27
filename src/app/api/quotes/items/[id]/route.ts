import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { update_price, discount } = body;
    if (!id || (typeof update_price !== 'number' && typeof discount !== 'number')) {
      return NextResponse.json({ error: 'ID y al menos un campo a actualizar requerido' }, { status: 400 });
    }
    const updateObj: Record<string, number> = {};
    if (typeof update_price === 'number') updateObj.update_price = update_price;
    if (typeof discount === 'number') updateObj.discount = discount;
    const { data, error } = await supabaseAdmin
      .from('fasercon_quote_items')
      .update(updateObj)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ message: 'Precio actualizado', item: data });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
