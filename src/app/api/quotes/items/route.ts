import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      quote_id,
      product_id,
      name,
      measurement_unit,
      qty,
      price,
      update_price,
      discount,
      characteristics,
    } = body;

    // Validar campos requeridos
    if (!quote_id || !product_id) {
      return NextResponse.json(
        { error: 'quote_id y product_id son requeridos' },
        { status: 400 }
      );
    }

    const insertObj: Record<string, unknown> = {
      quote_id,
      product_id,
      name: name || '',
      qty: qty || 1,
      price: price || 0,
      update_price: update_price || price || 0,
      discount: discount || 0,
    };

    // Campos opcionales que sabemos que existen
    if (measurement_unit !== undefined) insertObj.measurement_unit = measurement_unit;

    // Procesar características
    if (characteristics !== undefined) {
      if (Array.isArray(characteristics)) {
        insertObj.characteristics = JSON.stringify(characteristics);
      } else if (typeof characteristics === 'string') {
        insertObj.characteristics = characteristics;
      }
    }

    // Intentar insertar; si falla por columna, reintentar sin ella
    let attempt = 0;
    let lastError: any = null;

    while (attempt < 2) {
      attempt += 1;
      const { data, error } = await supabaseAdmin
        .from('fasercon_quote_items')
        .insert([insertObj])
        .select()
        .single();

      if (!error) {
        return NextResponse.json(
          { message: 'Item creado exitosamente', item: data },
          { status: 201 }
        );
      }

      lastError = error;

      // Si falla por alguna columna, reintentarsin ella
      const msg = String(error.message || '').toLowerCase();
      if (attempt === 1) {
        // Intentar remover características
        if (msg.includes('characteristics') && (msg.includes('could not find') || msg.includes('column'))) {
          delete insertObj.characteristics;
          continue;
        }
        // Intentar remover measurement_unit
        if (msg.includes('measurement_unit') && (msg.includes('could not find') || msg.includes('column'))) {
          delete insertObj.measurement_unit;
          continue;
        }
      }

      break;
    }

    return NextResponse.json(
      { error: lastError?.message ?? 'Error creando item' },
      { status: 500 }
    );
  } catch (err) {
    console.error('[POST /api/quotes/items]', err);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
