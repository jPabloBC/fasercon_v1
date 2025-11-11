"use client"

import { useState, useEffect } from 'react'
import Image from 'next/image'

type Service = {
  id: string | number
  title: string
  description?: string | null
  image?: string | string[] | null
  href?: string | null
}

type Props = {
  services: Service[]
  intro?: string
}

const DEFAULT_IMAGE = 'https://gbdoqxdldyszmfzqzmuk.supabase.co/storage/v1/object/public/fasercon/images/services/services_estructuras01.jpeg'

const DEFAULT_SERVICES: Service[] = [
  { id: 1, title: 'Fabricación a medida', description: 'Perfiles y estructuras a medida para proyectos industriales.', image: 'https://gbdoqxdldyszmfzqzmuk.supabase.co/storage/v1/object/public/fasercon/images/services/services_estructuras01.jpeg', href: '/services#fabricacion' },
  { id: 2, title: 'Instalación de cubiertas', description: 'Instalación profesional y puesta en obra de techos metálicos.', image: 'https://gbdoqxdldyszmfzqzmuk.supabase.co/storage/v1/object/public/fasercon/images/services/services_revestimiento01.jpeg', href: '/services#instalacion' },
  { id: 3, title: 'Mantenimiento y reparación', description: 'Servicios de mantención preventiva y correctiva.', image: 'https://gbdoqxdldyszmfzqzmuk.supabase.co/storage/v1/object/public/fasercon/images/services/services_pintura01.jpeg', href: '/services#mantenimiento' },
  { id: 4, title: 'Climatización', description: 'Soluciones integrales de climatización y ventilación.', image: 'https://gbdoqxdldyszmfzqzmuk.supabase.co/storage/v1/object/public/fasercon/images/services/services_climatizacion01.jpeg', href: '/services#climatizacion' },
]

export default function HomeServicesCarousel({ services, intro }: Props) {
  const [randomServices, setRandomServices] = useState<Service[]>([])
  const [mounted, setMounted] = useState(false)

  // Helper para extraer la primera imagen válida
  const getImageSrc = (img: string | string[] | null | undefined): string => {
    if (!img) return DEFAULT_IMAGE
    if (Array.isArray(img)) {
      return img.length > 0 ? img[0] : DEFAULT_IMAGE
    }
    if (typeof img === 'string') {
      // Intentar parsear si es un JSON string
      try {
        const parsed = JSON.parse(img)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed[0]
        }
      } catch {
        // No es JSON, usar como string directo
        return img
      }
      return img
    }
    return DEFAULT_IMAGE
  }

  // Seleccionar servicios después de la hidratación para evitar mismatch
  useEffect(() => {
    const serviceList = (services && services.length > 0) ? services : DEFAULT_SERVICES
    const shuffled = [...serviceList].sort(() => Math.random() - 0.5)
    setRandomServices(shuffled.slice(0, 4))
    setMounted(true)
  }, [services])

  // Mostrar los primeros 4 servicios sin mezclar durante SSR para evitar hydration mismatch
  const displayServices = mounted ? randomServices : (services && services.length > 0 ? services : DEFAULT_SERVICES).slice(0, 4)

  return (
    <div className="w-full overflow-hidden">
      <div className="w-[95%] mx-auto px-2 sm:px-6 lg:px-8 py-12">
        <div className="mx-auto max-w-4xl text-center mb-8">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Nuestros Servicios</h2>
          {intro && <p className="mt-6 text-lg leading-8 text-gray-600">{intro}</p>}
        </div>
        
        {/* Grid responsivo: 1 columna en móvil, 3 en tablet, 4 en desktop - siempre en una línea */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {displayServices.map((service, i) => {
            const imgSrc = getImageSrc(service.image)
            
            return (
              <article
                key={service.id}
                className="overflow-hidden bg-white rounded-lg shadow-md transform-gpu transition-transform duration-400 ease-in-out border-2 border-transparent hover:border-gray-300 hover:border-4 focus-within:border-gray-300 focus-within:border-4 relative z-0 group hover:z-50 hover:scale-110 focus-within:z-50 focus-within:scale-110"
                style={{ transitionDelay: `${i * 40}ms` }}
                tabIndex={0}
              >
                <a href={service.href || '/services'} className="block w-full h-full">
                  <div className="relative w-full h-60 sm:h-64 md:h-72 lg:h-80 overflow-hidden">
                    <Image src={imgSrc} alt={service.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    {/* Gradient overlay */}
                    <div className="absolute left-0 right-0 bottom-0 h-28 sm:h-32 md:h-36 lg:h-40 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />
                    <div className="absolute left-4 right-4 bottom-4 text-white">
                      <h3 className="text-lg font-semibold leading-tight">{service.title || 'Servicio'}</h3>
                      <p className="mt-1 text-sm opacity-90 line-clamp-2">{service.description}</p>
                    </div>
                  </div>
                </a>
              </article>
            )
          })}
        </div>
      </div>
    </div>
  )
}
