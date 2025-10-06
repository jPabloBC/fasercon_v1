import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'

const contactSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(1, 'El teléfono es requerido').refine(
    (value) => {
      // Validar que sea un número de teléfono válido (formato internacional)
      const phoneRegex = /^\+[1-9]\d{1,14}$/
      return phoneRegex.test(value || '')
    },
    'Por favor ingresa un número de teléfono válido'
  ),
  message: z.string().min(10, 'El mensaje debe tener al menos 10 caracteres'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validar los datos
    const validatedData = contactSchema.parse(body)
    
    // Guardar en la base de datos
    const { data: contactForm, error } = await supabaseAdmin
      .from('fasercon_contact_forms')
      .insert([
        {
          name: validatedData.name,
          email: validatedData.email,
          phone: validatedData.phone,
          message: validatedData.message,
          status: 'PENDING',
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('Error de Supabase:', error)
      throw new Error('Error al guardar en la base de datos')
    }
    
    return NextResponse.json(
      { 
        message: 'Formulario de contacto enviado exitosamente',
        id: contactForm.id 
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error al procesar formulario de contacto:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          message: 'Datos inválidos',
          errors: error.issues 
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}