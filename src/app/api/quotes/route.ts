import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'

const quoteSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'El teléfono debe tener al menos 10 dígitos'),
  width: z.number().min(1, 'El ancho debe ser mayor a 0'),
  length: z.number().min(1, 'El largo debe ser mayor a 0'),
  area: z.number().min(1, 'El área debe ser mayor a 0'),
  materialType: z.string().min(1, 'Selecciona un tipo de material'),
  estimatedPrice: z.number().min(0, 'El precio estimado debe ser mayor a 0'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validar los datos
    const validatedData = quoteSchema.parse(body)
    
    // Guardar en la base de datos
    const { data: quote, error } = await supabase
      .from('quotes')
      .insert([
        {
          name: validatedData.name,
          email: validatedData.email,
          phone: validatedData.phone,
          width: validatedData.width,
          length: validatedData.length,
          area: validatedData.area,
          material_type: validatedData.materialType,
          estimated_price: validatedData.estimatedPrice,
          status: 'PENDING',
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
        message: 'Cotización enviada exitosamente',
        id: quote.id,
        estimatedPrice: quote.estimated_price 
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error al procesar cotización:', error)
    
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

export async function GET() {
  try {
    const { data: quotes, error } = await supabase
      .from('quotes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error de Supabase:', error)
      throw new Error('Error al obtener cotizaciones')
    }
    
    return NextResponse.json(quotes)
  } catch (error) {
    console.error('Error al obtener cotizaciones:', error)
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}