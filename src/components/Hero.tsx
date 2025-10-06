'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ChevronRightIcon, ChevronLeftIcon } from '@heroicons/react/20/solid'
import { useState, useEffect } from 'react'

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0)

  const slides = [
    {
      id: 1,
      image: "https://gbdoqxdldyszmfzqzmuk.supabase.co/storage/v1/object/public/fasercon/images/slideshow/IMG_20190414_114959%20Large.jpeg",
      title: "Proyecto Industrial",
      description: "Cubierta metálica de 2,500 m² con estructura de acero galvanizado y láminas termoacústicas de alta resistencia."
    },
    {
      id: 2,
      image: "https://gbdoqxdldyszmfzqzmuk.supabase.co/storage/v1/object/public/fasercon/images/slideshow/IMG_20190809_102801%20Large.jpeg",
      title: "Proyecto Residencial",
      description: "Techo metálico residencial con acabado premium, diseño moderno y garantía de 15 años contra corrosión."
    },
    {
      id: 3,
      image: "https://gbdoqxdldyszmfzqzmuk.supabase.co/storage/v1/object/public/fasercon/images/slideshow/IMG_20220125_121654%20Large.jpeg",
      title: "Construcción Comercial",
      description: "Cubierta para centro comercial con sistema de drenaje integrado y paneles solares compatibles."
    },
    {
      id: 4,
      image: "https://gbdoqxdldyszmfzqzmuk.supabase.co/storage/v1/object/public/fasercon/images/slideshow/IMG-20170131-WA0000%20Large.jpeg",
      title: "Construcción Comercial",
      description: "Cubierta para centro comercial con sistema de drenaje integrado y paneles solares compatibles."
    }
  ]

  // Auto-play slideshow
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000) // Cambia cada 5 segundos

    return () => clearInterval(timer)
  }, [slides.length])

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
  }

  return (
    <div className="relative isolate px-6 pt-14 lg:px-8 bg-white">
      <div
        className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
        aria-hidden="true"
      >
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
          }}
        />
      </div>
      <div className="mx-auto max-w-7xl py-20 sm:py-32 lg:py-40">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-8 lg:gap-y-20 lg:items-start">
          <div className="relative z-10 mx-auto max-w-2xl lg:col-span-6 lg:max-w-none lg:pt-6 xl:col-span-5">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl font-sintony">
              Cubiertas y Techos{' '}
              <span className="text-red-600">Metálicos</span>{' '}
              de Calidad Superior
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600 font-sintony font-normal">
              Especialistas en soluciones integrales para cubiertas industriales y residenciales. 
              Ofrecemos diseño, fabricación e instalación de techos metálicos con materiales de 
              primera calidad y garantía extendida.
            </p>
            <div className="mt-10 flex items-center gap-x-6">
              <Link
                href="#cotizador"
                className="rounded-md bg-red-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
              >
                Cotizar Proyecto
              </Link>
              <Link
                href="#proyectos"
                className="text-sm font-semibold leading-6 text-gray-900 group inline-flex items-center"
              >
                Ver Proyectos{' '}
                <ChevronRightIcon className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            
            {/* Stats */}
            <div className="mt-16 flow-root sm:mt-24">
              <div className="-m-2 rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:-m-4 lg:rounded-2xl lg:p-4">
                <dl className="grid grid-cols-2 gap-8 sm:grid-cols-4">
                  <div className="flex flex-col text-center">
                    <dd className="text-2xl font-bold leading-9 tracking-tight text-gray-900 mb-2 font-sintony">0</dd>
                    <dt className="text-base leading-7 text-gray-600 font-sintony font-normal">Proyectos<br />Completados</dt>
                  </div>
                  <div className="flex flex-col text-center">
                    <dd className="text-2xl font-bold leading-9 tracking-tight text-gray-900 mb-2 font-sintony">0</dd>
                    <dt className="text-base leading-7 text-gray-600 font-sintony font-normal">Años de<br />Experiencia</dt>
                  </div>
                  <div className="flex flex-col text-center">
                    <dd className="text-2xl font-bold leading-9 tracking-tight text-gray-900 mb-2 font-sintony">0</dd>
                    <dt className="text-base leading-7 text-gray-600 font-sintony font-normal">Clientes<br />Satisfechos</dt>
                  </div>
                  <div className="flex flex-col text-center">
                    <dd className="text-2xl font-bold leading-9 tracking-tight text-gray-900 mb-2 font-sintony">0</dd>
                    <dt className="text-base leading-7 text-gray-600 font-sintony font-normal">Garantía<br />(años)</dt>
                  </div>
                </dl>
              </div>
            </div>
          </div>
          <div className="relative mt-16 sm:mt-20 lg:col-span-6 lg:mt-0 xl:col-span-7">
            {/* Hero project slideshow */}
            <div className="relative h-[500px] sm:h-[600px] lg:h-[750px] w-full rounded-2xl overflow-hidden bg-white shadow-xl">
              {slides.map((slide, index) => (
                <div
                  key={slide.id}
                  className={`absolute inset-0 transition-opacity duration-1000 ${
                    index === currentSlide ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <div 
                    className="w-full h-full bg-cover bg-center bg-no-repeat"
                    style={{
                      backgroundImage: `url(${slide.image})`
                    }}
                  >
                    {/* Overlay with gradient */}
                    <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/80 to-transparent"></div>
                    {/* Content overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 text-white mb-6">
                      <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 sm:mb-3 md:mb-4 font-sintony">{slide.title}</h3>
                      <p className="text-gray-200 text-base sm:text-lg md:text-lg max-w-xs sm:max-w-sm md:max-w-md font-sintony font-normal leading-tight sm:leading-normal">
                        {slide.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Navigation arrows */}
              <button
                onClick={prevSlide}
                className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 sm:p-2.5 rounded-full transition-all duration-200 z-40 shadow-2xl border border-white/20"
                aria-label="Imagen anterior"
              >
                <ChevronLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 sm:p-2.5 rounded-full transition-all duration-200 z-40 shadow-2xl border border-white/20"
                aria-label="Siguiente imagen"
              >
                <ChevronRightIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              {/* Slide indicators */}
              <div className="absolute bottom-3 sm:bottom-4 w-full flex justify-center z-40 px-2">
                <div className="flex items-center space-x-3 bg-black/30 rounded-full px-4 py-2 backdrop-blur-sm">
                  {slides.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all duration-200 ${
                        index === currentSlide ? 'bg-white/80 scale-125 shadow-lg' : 'bg-white/40 hover:bg-white/60'
                      }`}
                      aria-label={`Ir a imagen ${index + 1}`}
                    />
                  ))}
                </div>
              </div>

              {/* Background decoration border */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-red-600/20 to-black/20 pointer-events-none -z-10"></div>
            </div>
          </div>
        </div>
      </div>
      <div
        className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
        aria-hidden="true"
      >
        <div
          className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
          }}
        />
      </div>
    </div>
  )
}