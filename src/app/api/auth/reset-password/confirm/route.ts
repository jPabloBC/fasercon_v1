import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { supabase } from '@/lib/supabase'

const resetConfirmSchema = z.object({
  token: z.string().min(1, 'Token requerido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  confirmPassword: z.string().min(1, 'Confirmación de contraseña requerida'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
})

export async function POST(request: NextRequest) {

  try {
    const body = await request.json()
    console.log('[RESET] Body recibido:', body)
    // Validar los datos
    const { token, password } = resetConfirmSchema.parse(body)
    console.log('[RESET] Token:', token, 'Password:', password)
    // Buscar el token en la base de datos
    const { data: resetToken, error: tokenError } = await supabase
      .from('fasercon_password_reset_tokens')
      .select(`
        id,
        user_id,
        expires_at,
        used,
        fasercon_users (
          id,
          email,
          name
        )
      `)
      .eq('token', token)
      .eq('used', false)
      .single()
    console.log('[RESET] Token encontrado:', resetToken, 'Error:', tokenError)
    if (tokenError || !resetToken) {
      return NextResponse.json(
        { error: 'Token inválido o expirado' },
        { status: 400 }
      )
    }
    // Verificar si el token ha expirado
    const now = new Date()
    const expiresAt = new Date(resetToken.expires_at)
    if (now > expiresAt) {
      return NextResponse.json(
        { error: 'El token ha expirado. Solicita un nuevo enlace.' },
        { status: 400 }
      )
    }
    // Hash de la nueva contraseña
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)
    console.log('[RESET] Hash generado:', hashedPassword)
    // Actualizar la contraseña del usuario
    const { error: updateError } = await supabase
      .from('fasercon_users')
      .update({ 
        password: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', resetToken.user_id)
    console.log('[RESET] Resultado update:', updateError)
    if (updateError) {
      console.error('Error updating user password:', updateError)
      return NextResponse.json(
        { error: 'Error al actualizar la contraseña' },
        { status: 500 }
      )
    }

    // Marcar el token como usado
    await supabase
      .from('fasercon_password_reset_tokens')
      .update({ used: true })
      .eq('id', resetToken.id)

    // Invalidar todos los otros tokens del usuario
    await supabase
      .from('fasercon_password_reset_tokens')
      .update({ used: true })
      .eq('user_id', resetToken.user_id)
      .eq('used', false)

    return NextResponse.json(
      { 
        message: 'Contraseña actualizada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.' 
      },
      { status: 200 }
    )

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Datos de validación incorrectos',
          errors: error.issues
        },
        { status: 400 }
      )
    }

    console.error('Unexpected error in password reset confirm:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// También necesitamos un GET para validar tokens
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Token requerido' },
        { status: 400 }
      )
    }

    // Verificar si el token existe y es válido
    const { data: resetToken, error: tokenError } = await supabase
      .from('fasercon_password_reset_tokens')
      .select('expires_at, used')
      .eq('token', token)
      .eq('used', false)
      .single()

    if (tokenError || !resetToken) {
      return NextResponse.json(
        { valid: false, error: 'Token inválido' },
        { status: 400 }
      )
    }

    // Verificar si el token ha expirado
    const now = new Date()
    const expiresAt = new Date(resetToken.expires_at)
    
    if (now > expiresAt) {
      return NextResponse.json(
        { valid: false, error: 'Token expirado' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { valid: true },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error validating reset token:', error)
    return NextResponse.json(
      { valid: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}