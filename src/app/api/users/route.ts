import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, ...userData } = body;
    const hashedPassword = await bcrypt.hash(password, 12);
    const { data, error } = await supabaseAdmin
      .from('fasercon_users')
      .insert([{ ...userData, password: hashedPassword }])
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: 'Usuario creado exitosamente', user: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
