import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'
import { supabase } from '@/lib/supabase'
import { sendPasswordResetEmail } from '@/lib/email'

const resetRequestSchema = z.object({
  email: z.string().email('Email inválido'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validar los datos
    const { email } = resetRequestSchema.parse(body)
    
    // Buscar el usuario por email
    const { data: user, error: userError } = await supabase
      .from('fasercon_users')
      .select('id, name, email')
      .eq('email', email)
      .single()

    if (userError || !user) {
      // Por seguridad, no revelamos si el email existe o no
      return NextResponse.json(
        { 
          message: 'Si el email existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña.' 
        },
        { status: 200 }
      )
    }

    // Generar token seguro
    const resetToken = crypto.randomBytes(32).toString('hex')
    
    // Calcular fecha de expiración (24 horas)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    // Invalidar tokens anteriores del usuario
    await supabase
      .from('fasercon_password_reset_tokens')
      .update({ used: true })
      .eq('user_id', user.id)
      .eq('used', false)

    // Crear nuevo token en la base de datos
    const { error: tokenError } = await supabase
      .from('fasercon_password_reset_tokens')
      .insert([
        {
          user_id: user.id,
          token: resetToken,
          expires_at: expiresAt.toISOString(),
          used: false,
        }
      ])

    if (tokenError) {
      console.error('Error creating reset token:', tokenError)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }

    // Enviar email con el token
    const emailResult = await sendPasswordResetEmail(
      user.email,
      resetToken,
      user.name
    )

    if (!emailResult.success) {
      console.error('Error sending email:', emailResult.error)
      return NextResponse.json(
        { error: 'Error al enviar el email' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        message: 'Si el email existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña.' 
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

    console.error('Unexpected error in password reset request:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}