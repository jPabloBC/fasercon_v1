import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { update_price, qty, discount, measurement_unit, characteristics, name, orden } = body;
    if (!id || (typeof update_price !== 'number' && typeof qty !== 'number' && typeof discount !== 'number' && typeof measurement_unit !== 'string' && typeof characteristics === 'undefined' && typeof name !== 'string' && typeof orden !== 'number')) {
      return NextResponse.json({ error: 'ID y al menos un campo a actualizar requerido' }, { status: 400 });
    }
    const updateObj: Record<string, number | string> = {};
    if (typeof update_price === 'number') updateObj.update_price = update_price;
    if (typeof qty === 'number') updateObj.qty = qty;
    if (typeof discount === 'number') updateObj.discount = discount;
    if (typeof measurement_unit === 'string') updateObj.measurement_unit = measurement_unit;
    if (typeof orden === 'number') updateObj.orden = orden;
    if (typeof characteristics !== 'undefined') {
      // Accept array or string; store as JSON string when array is provided
      if (Array.isArray(characteristics)) updateObj.characteristics = JSON.stringify(characteristics);
      else if (typeof characteristics === 'string') updateObj.characteristics = characteristics;
    }
    if (typeof name === 'string') updateObj.name = name;
    // Try update; if the DB schema is missing `characteristics` column, retry without it
    let attempt = 0;
    let lastError: any = null;
    while (attempt < 2) {
      attempt += 1;
      const { data, error } = await supabaseAdmin
        .from('fasercon_quote_items')
        .update(updateObj)
        .eq('id', id)
        .select()
        .single();
      if (!error) {
        return NextResponse.json({ message: 'Item actualizado', item: data });
      }
      lastError = error;
      // If characteristics column is not present, remove it and retry once
      const msg = String(error.message || '').toLowerCase();
      if (attempt === 1 && msg.includes('characteristics') && (msg.includes('could not find') || msg.includes('column'))) {
        delete updateObj.characteristics;
        continue;
      }
      // If `orden` column is missing, return a helpful message with SQL to add it
      if (msg.includes('orden') && (msg.includes('could not find') || msg.includes('column'))) {
        const sql = "ALTER TABLE fasercon_quote_items ADD COLUMN orden integer;";
        return NextResponse.json({ error: `Missing 'orden' column`, migration_sql: sql }, { status: 400 });
      }
      break;
    }
    return NextResponse.json({ error: lastError?.message ?? 'Error actualizando item' }, { status: 500 });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('fasercon_quote_items')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: error.message ?? 'Error eliminando item' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Item eliminado exitosamente' }, { status: 200 });
  } catch (err) {
    console.error('[DELETE /api/quotes/items/[id]]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
