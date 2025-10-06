'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import '../styles/phone-input.css'

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

type ContactFormData = z.infer<typeof contactSchema>

export default function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  })

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true)
    setSubmitMessage('')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        setSubmitMessage('¡Mensaje enviado exitosamente! Te contactaremos pronto.')
        reset()
      } else {
        setSubmitMessage('Error al enviar el mensaje. Por favor intenta nuevamente.')
      }
    } catch (error) {
      setSubmitMessage('Error al enviar el mensaje. Por favor intenta nuevamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const whatsappMessage = encodeURIComponent(
    'Hola, me interesa obtener información sobre sus servicios de cubiertas y techos metálicos.'
  )
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '56912345678'
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`

  return (
    <div id="contacto" className="relative isolate bg-white px-6 py-24 sm:py-32 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Contáctanos
        </h2>
        <p className="mt-2 text-lg leading-8 text-gray-600">
          ¿Tienes un proyecto en mente? Estamos aquí para ayudarte.
        </p>
      </div>
      <div className="mx-auto mt-16 max-w-xl sm:mt-20">
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="name" className="block text-sm font-semibold leading-6 text-gray-900">
              Nombre completo
            </label>
            <div className="mt-2.5">
              <input
                {...register('name')}
                type="text"
                id="name"
                autoComplete="name"
                className="block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-semibold leading-6 text-gray-900">
              Email
            </label>
            <div className="mt-2.5">
              <input
                {...register('email')}
                type="email"
                id="email"
                autoComplete="email"
                className="block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-semibold leading-6 text-gray-900">
              Teléfono
            </label>
            <div className="mt-2.5">
              <Controller
                name="phone"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <PhoneInput
                    value={value}
                    onChange={onChange}
                    defaultCountry="CL"
                    placeholder="Ingresa tu número de teléfono"
                    international
                    countryCallingCodeEditable={false}
                    className={`w-full ${errors.phone ? 'PhoneInput--error' : ''}`}
                  />
                )}
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="message" className="block text-sm font-semibold leading-6 text-gray-900">
              Mensaje
            </label>
            <div className="mt-2.5">
              <textarea
                {...register('message')}
                id="message"
                rows={4}
                className="block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
              />
              {errors.message && (
                <p className="mt-1 text-sm text-red-600">{errors.message.message}</p>
              )}
            </div>
          </div>
        </div>
        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <button
            type="submit"
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="flex-1 rounded-md bg-red-600 px-3.5 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50"
          >
            {isSubmitting ? 'Enviando...' : 'Enviar mensaje'}
          </button>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-md bg-green-600 px-3.5 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
          >
            WhatsApp
          </a>
        </div>
        {submitMessage && (
          <div className={`mt-4 p-4 rounded-md ${
            submitMessage.includes('exitosamente') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {submitMessage}
          </div>
        )}
      </div>
    </div>
  )
}