import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, company = 'fasercon', ...userData } = body;

    // Validar que company sea válido
    if (!['fasercon', 'rym', 'vimal'].includes(company)) {
      return NextResponse.json({ error: 'Empresa inválida' }, { status: 400 });
    }

    const tableName = `${company}_users`;
    const hashedPassword = await bcrypt.hash(password, 12);

    const { data, error } = await supabaseAdmin
      .from(tableName)
      .insert([{ ...userData, password: hashedPassword }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { message: 'Usuario creado exitosamente', user: data },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
