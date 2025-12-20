'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CalculatorIcon } from '@heroicons/react/24/outline'
import { formatCLP } from '@/lib/format'

const quoteSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'El teléfono debe tener al menos 10 dígitos'),
  width: z.number().min(1, 'El ancho debe ser mayor a 0'),
  length: z.number().min(1, 'El largo debe ser mayor a 0'),
  materialType: z.string().min(1, 'Selecciona un tipo de material'),
})

type QuoteFormData = z.infer<typeof quoteSchema>

const materialPrices = {
  'lamina-galvanizada': 45000,
  'lamina-termoacustica': 85000,
  'teja-metalica': 65000,
  'panel-sandwich': 120000,
}

const materialLabels = {
  'lamina-galvanizada': 'Lámina Galvanizada',
  'lamina-termoacustica': 'Lámina Termoacústica',
  'teja-metalica': 'Teja Metálica',
  'panel-sandwich': 'Panel Sandwich',
}

export default function QuoteCalculator() {
  const [isCalculating, setIsCalculating] = useState(false)
  const [estimate, setEstimate] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
  })

  const watchedFields = watch()
  const { width, length, materialType } = watchedFields

  const calculateEstimate = () => {
    if (width && length && materialType) {
      setIsCalculating(true)
      
      // Simular tiempo de cálculo
      setTimeout(() => {
        const area = width * length
        const pricePerM2 = materialPrices[materialType as keyof typeof materialPrices] || 0
        const basePrice = area * pricePerM2
        
        // Agregar costos adicionales (estructura, instalación, etc.)
        const structureCost = area * 25000 // Costo de estructura por m2
        const installationCost = basePrice * 0.3 // 30% del costo de material
        
        const totalEstimate = basePrice + structureCost + installationCost
        setEstimate(Math.round(totalEstimate))
        setIsCalculating(false)
      }, 1000)
    }
  }

  const onSubmit = async (data: QuoteFormData) => {
    setIsSubmitting(true)
    setSubmitMessage('')

    try {
      const area = data.width * data.length
      const quoteData = {
        ...data,
        area,
        estimatedPrice: estimate || 0,
      }

      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(quoteData),
      })

      if (response.ok) {
        setSubmitMessage('¡Cotización enviada exitosamente! Te contactaremos pronto con más detalles.')
        reset()
        setEstimate(null)
      } else {
        setSubmitMessage('Error al enviar la cotización. Por favor intenta nuevamente.')
      }
    } catch {
      setSubmitMessage('Error al enviar la cotización. Por favor intenta nuevamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div id="cotizador" className="bg-gray-50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="flex justify-center">
            <CalculatorIcon className="h-12 w-12 text-red-600" />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Cotizador Básico
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Obtén una estimación instantánea del costo de tu proyecto. 
            Solo necesitas las dimensiones y el tipo de material.
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Información personal */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Información de contacto</h3>
              
              <div>
                <label htmlFor="quote-name" className="block text-sm font-medium text-gray-700">
                  Nombre completo
                </label>
                <input
                  {...register('name')}
                  type="text"
                  id="quote-name"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="quote-email" className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    id="quote-email"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="quote-phone" className="block text-sm font-medium text-gray-700">
                    Teléfono
                  </label>
                  <input
                    {...register('phone')}
                    type="tel"
                    id="quote-phone"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Dimensiones del proyecto */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Dimensiones del proyecto</h3>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="width" className="block text-sm font-medium text-gray-700">
                    Ancho (metros)
                  </label>
                  <input
                    {...register('width', { valueAsNumber: true })}
                    type="number"
                    id="width"
                    step="0.1"
                    min="0"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                  {errors.width && (
                    <p className="mt-1 text-sm text-red-600">{errors.width.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="length" className="block text-sm font-medium text-gray-700">
                    Largo (metros)
                  </label>
                  <input
                    {...register('length', { valueAsNumber: true })}
                    type="number"
                    id="length"
                    step="0.1"
                    min="0"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                  {errors.length && (
                    <p className="mt-1 text-sm text-red-600">{errors.length.message}</p>
                  )}
                </div>
              </div>

              {width && length && (
                <div className="rounded-md bg-blue-50 p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Área total:</strong> {(width * length).toFixed(2)} m²
                  </p>
                </div>
              )}
            </div>

            {/* Tipo de material */}
            <div>
              <label htmlFor="materialType" className="block text-sm font-medium text-gray-700">
                Tipo de material
              </label>
              <select
                {...register('materialType')}
                id="materialType"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">Selecciona un material</option>
                {Object.entries(materialLabels).map(([value, label]) => (
                <option key={value} value={value}>
                    {label} - ${formatCLP(materialPrices[value as keyof typeof materialPrices])}/m²
                  </option>
                ))}
              </select>
              {errors.materialType && (
                <p className="mt-1 text-sm text-red-600">{errors.materialType.message}</p>
              )}
            </div>

            {/* Botón de cálculo */}
            <div>
              <button
                type="button"
                onClick={calculateEstimate}
                disabled={!width || !length || !materialType || isCalculating}
                className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50"
              >
                {isCalculating ? 'Calculando...' : 'Calcular Estimación'}
              </button>
            </div>

            {/* Resultado de la estimación */}
            {estimate && (
              <div className="rounded-md bg-green-50 p-6">
                <h4 className="text-lg font-semibold text-green-800 mb-4">Estimación del Proyecto</h4>
                <div className="space-y-2 text-sm text-green-700">
                    <div className="flex justify-between">
                    <span>Material ({materialLabels[materialType as keyof typeof materialLabels]}):</span>
                    <span>${formatCLP((width * length) * materialPrices[materialType as keyof typeof materialPrices])}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estructura:</span>
                    <span>${formatCLP((width * length) * 25000)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Instalación:</span>
                    <span>${formatCLP(((width * length) * materialPrices[materialType as keyof typeof materialPrices]) * 0.3)}</span>
                  </div>
                    <div className="border-t border-green-200 pt-2 flex justify-between font-semibold text-lg">
                    <span>Total Estimado:</span>
                    <span>${formatCLP(estimate)}</span>
                  </div>
                </div>
                <p className="mt-4 text-xs text-green-600">
                  * Esta es una estimación básica. El precio final puede variar según especificaciones técnicas adicionales.
                </p>
              </div>
            )}

            {/* Botón de envío */}
            {estimate && (
              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:opacity-50"
                >
                  {isSubmitting ? 'Enviando cotización...' : 'Enviar cotización'}
                </button>
              </div>
            )}

            {submitMessage && (
              <div className={`p-4 rounded-md ${
                submitMessage.includes('exitosamente') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}>
                {submitMessage}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}