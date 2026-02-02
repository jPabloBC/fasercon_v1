import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Detectar empresa desde query param
    const url = new URL(request.url)
    const companyParam = url.searchParams.get('company') || 'fasercon'

    // Validar empresa
    if (!['fasercon', 'rym', 'vimal'].includes(companyParam)) {
      return NextResponse.json(
        { error: 'Empresa inválida' },
        { status: 400 }
      )
    }

    const contactsTable = `${companyParam}_contact_forms`

    const { data: contacts, error } = await supabaseAdmin
      .from(contactsTable)
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error al obtener contactos:', error)
      return NextResponse.json({ error: 'Error al obtener los contactos' }, { status: 500 })
    }

    // Transformar snake_case a camelCase
    const transformedContacts = (contacts || []).map(contact => ({
      id: contact.id,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      message: contact.message,
      status: contact.status,
      createdAt: contact.created_at,
    }))

    return NextResponse.json(transformedContacts)
  } catch (error) {
    console.error('Error inesperado al obtener contactos:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

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

    // Detectar empresa desde query param o body
    const url = new URL(request.url)
    const companyParam = body.company || url.searchParams.get('company') || 'fasercon'

    // Validar empresa
    if (!['fasercon', 'rym', 'vimal'].includes(companyParam)) {
      return NextResponse.json(
        { error: 'Empresa inválida' },
        { status: 400 }
      )
    }

    const contactsTable = `${companyParam}_contact_forms`

    // Validar los datos
    const validatedData = contactSchema.parse(body)

    // Guardar en la base de datos
    const { data: contactForm, error } = await supabaseAdmin
      .from(contactsTable)
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