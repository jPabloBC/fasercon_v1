"use client"
import React, { useEffect, useState, useRef, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '../lib/supabase'

type Service = {
  id: string | number
  title: string
  description?: string | null
  image?: string | string[] | null
  href?: string | null
}

type Props = {
  services?: Service[]
  showAll?: boolean
  variant?: 'compact' | 'stacked'
  intro?: string
  showTitle?: boolean
}

// Use a local copy first to avoid external blocking; fallback can remain remote if needed
const DEFAULT_IMAGE = '/assets/images/clima_01.jpg'

const DEFAULT_INTRO = 'Somos especialistas en fabricación y montaje de estructuras metálicas, sistemas de soportación y soluciones industriales a medida. Combinamos experiencia, tecnología y precisión para entregar resultados de alta calidad en cada proyecto.'

export default function ServicesCarousel({ services = [], showAll = false, variant = 'compact', intro = DEFAULT_INTRO, showTitle = true }: Props) {
  const [fetchedServices, setFetchedServices] = useState<Service[]>([])
  const [loadingServices, setLoadingServices] = useState(false)
  const [servicesError, setServicesError] = useState<string | null>(null)

  // live list state used for realtime updates
  const [liveList, setLiveList] = useState<Service[]>([])

  // If no services were passed from server/props, try to fetch from Supabase table `fasercon_services`.
  useEffect(() => {
    // only fetch when the caller didn't pass any services
    if (Array.isArray(services) && services.length > 0) return

    let mounted = true
    const fetchServices = async () => {
      setLoadingServices(true)
      try {
        const { data, error } = await supabase.from('fasercon_services').select('*')
        if (error) {
          console.warn('Supabase error fetching fasercon_services:', error)
          if (mounted) setServicesError(error.message || 'Error fetching services')
          return
        }

        if (!data || !Array.isArray(data) || data.length === 0) {
          if (mounted) setFetchedServices([])
          return
        }

        // map rows to local Service type. Be flexible with field names for images.
        const mapped: Service[] = (data as Record<string, unknown>[]).map((r) => {
          const imgField = (r['image'] ?? r['images'] ?? r['imagen'] ?? r['images_json'] ?? r['photos'] ?? null) as unknown
          let imageVal: string | string[] | null = null
          if (Array.isArray(imgField)) imageVal = imgField as string[]
          else if (typeof imgField === 'string') imageVal = imgField

          return {
            id: (r['id'] ?? r['service_id'] ?? r['name'] ?? JSON.stringify(r).slice(0, 8)) as string | number,
            title: (r['title'] ?? r['name'] ?? r['titulo'] ?? r['servicio'] ?? 'Servicio') as string,
            description: (typeof r['description'] === 'string' ? r['description'] : (r['desc'] as string | undefined) ?? (r['descripcion'] as string | undefined)) as string | null,
            image: imageVal ?? null,
            href: (typeof r['href'] === 'string' ? r['href'] : (r['link'] as string | undefined)) ?? null,
          }
        })

        if (mounted) setFetchedServices(mapped)
      } catch (err: unknown) {
        console.error('Exception fetching fasercon_services', err)
        const msg = err instanceof Error ? err.message : String(err)
        if (mounted) setServicesError(msg)
      } finally {
        if (mounted) setLoadingServices(false)
      }
    }

    fetchServices()

    return () => { mounted = false }
  }, [services])

  // final list resolution: prefer explicit prop, then fetched
  const resolvedList = useMemo(() => {
    return Array.isArray(services) && services.length > 0
      ? services
      : (fetchedServices && fetchedServices.length > 0 ? fetchedServices : [])
  }, [services, fetchedServices])

  // initialize live list when resolvedList changes
  useEffect(() => {
    setLiveList(resolvedList)
  }, [resolvedList])

  // Helper: simple in-place Fisher-Yates shuffle
  const shuffleArray = (arr: Service[]) => {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = a[i]
      a[i] = a[j]
      a[j] = tmp
    }
    return a
  }

  // Subscribe to realtime changes so the carousel updates live when services are added/updated/deleted
  useEffect(() => {
    // Only run on client and if supabase is available
    if (!supabase || typeof window === 'undefined') return

    const ch = supabase.channel('realtime-fasercon-services')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fasercon_services' }, (payload: unknown) => {
        try {
          const p = payload as Record<string, unknown>
          const eventType = String(p?.eventType ?? p?.event ?? p?.type ?? '').toUpperCase()
          const row = (p?.new ?? p?.record ?? p) as Record<string, unknown>
          // Map row to Service
          const mapped: Service = {
            id: String(row['id'] ?? row['service_id'] ?? ''),
            title: String(row['title'] ?? row['name'] ?? 'Servicio'),
            description: typeof row['description'] === 'string' ? (row['description'] as string) : (row['desc'] as string) ?? null,
            image: (typeof row['image_url'] === 'string' ? row['image_url'] : (Array.isArray(row['images']) ? (row['images'] as string[]) : (typeof row['images'] === 'string' ? (row['images'] as string) : null))) as string | string[] | null,
            href: typeof row['href'] === 'string' ? (row['href'] as string) : null,
          }

          setLiveList(prev => {
            let next = [...prev]
            if (eventType === 'INSERT') {
              next.push(mapped)
              next = shuffleArray(next)
            } else if (eventType === 'UPDATE') {
              const idx = next.findIndex(s => String(s.id) === String(mapped.id))
              if (idx !== -1) next[idx] = mapped
              else next.push(mapped)
            } else if (eventType === 'DELETE') {
              next = next.filter(s => String(s.id) !== String(mapped.id))
            }
            return next
          })
        } catch (err) {
          console.warn('Error handling realtime payload for services', err)
        }
      })
      .subscribe()

    return () => {
      try { ch.unsubscribe() } catch { /* ignore */ }
    }
  }, [])
  const displayList = showAll ? liveList : liveList.slice(0, 4)
  const [mounted, setMounted] = useState(false)
  const [activeService, setActiveService] = useState<Service | null>(null)
  const [modalImageIndex, setModalImageIndex] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80)
    return () => clearTimeout(t)
  }, [])

  // No autoplay: interactions are hover/focus-only (handled by CSS classes)

  // Helper: parse possible multiple images from the service.image field.
  // Support cases:
  // - string[] already
  // - JSON-encoded array string
  // - comma-separated or pipe-separated list
  // - single image string
  const parseImages = (img: unknown): string[] => {
    if (!img) return [DEFAULT_IMAGE]
    if (Array.isArray(img)) return img.length ? (img as string[]) : [DEFAULT_IMAGE]
    if (typeof img === 'string') {
      // try JSON parse first
      try {
        const parsed = JSON.parse(img)
        if (Array.isArray(parsed)) return parsed.filter(Boolean)
      } catch {
        // ignore
      }

      // split by pipe or comma
      const byPipe = img.split('|').map(s => s.trim()).filter(Boolean)
      if (byPipe.length > 1) return byPipe
      const byComma = img.split(',').map(s => s.trim()).filter(Boolean)
      if (byComma.length > 1) return byComma

      return [img]
    }
    return [DEFAULT_IMAGE]
  }

  // (Removed previous attempt) Ensure interval handling is robust and works with 2+ images
  // We'll handle auto-slide setup/cleanup in the main modal effect below.

  // Small inner component: per-card image navigator used only for stacked variant
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function ServiceImageNavigator({ images }: { images: string[] }) {
    const [index, setIndex] = useState(0)
    const len = images.length || 1
    const prev = (e: React.MouseEvent) => { e.preventDefault(); setIndex(i => (i - 1 + len) % len) }
    const next = (e: React.MouseEvent) => { e.preventDefault(); setIndex(i => (i + 1) % len) }

    return (
      <div className="w-full h-56 overflow-hidden relative">
        <Image src={images[index] || DEFAULT_IMAGE} alt="" fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
        {len > 1 && (
          <>
            <button onClick={prev} aria-label="Anterior" className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full shadow-sm hover:bg-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button onClick={next} aria-label="Siguiente" className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full shadow-sm hover:bg-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div className="absolute left-0 right-0 bottom-2 flex justify-center space-x-2">
              {images.map((_, i) => (
                <button key={i} onClick={(e) => { e.preventDefault(); setIndex(i) }} aria-label={`Ir a imagen ${i + 1}`} className={`w-2 h-2 rounded-full ${i === index ? 'bg-white' : 'bg-white/50'}`} />
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  // Helpers to open/close modal (used on stacked variant)
  const openModal = (s: Service) => {
    setActiveService(s)
    setModalImageIndex(0)
  }
  const closeModal = () => setActiveService(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Precompute modal images when a service is active so we don't re-parse repeatedly
  const modalImages = activeService ? parseImages(activeService.image) : [DEFAULT_IMAGE]

  useEffect(() => {
    // Always clear any existing interval before setting a new one
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // Start auto-slide when modal is open and there are at least 2 images
    if (activeService && modalImages.length > 1) {
      intervalRef.current = setInterval(() => {
        setModalImageIndex((prev) => (prev + 1) % modalImages.length)
      }, 3000)
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [activeService, modalImages.length])

  return (
    <section id="services" className="bg-white pt-8 pb-12 sm:pt-12 sm:pb-20">
      {/* Use 95% of the viewport width and center the content */}
      <div className="w-[95%] mx-auto px-2 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Nuestros Servicios</h2>
          <p className="mt-6 text-lg leading-8 text-gray-600">{intro}</p>
        </div>
        {/* Accessibility helpers to avoid unused var lint warnings */}
        <div className="sr-only">{loadingServices ? 'loading' : ''}{servicesError ? servicesError : ''}</div>

        {/* Grid: variant controls rendering. compact = image with overlay text; stacked = image on top, text below inside same card */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayList.map((s, i) => {
            const imgSrc = Array.isArray(s.image) ? s.image[0] : s.image || DEFAULT_IMAGE
            const baseClasses = `overflow-hidden bg-white rounded-lg shadow-md transform-gpu transition-transform duration-400 ease-in-out border-2 border-transparent transition-colors ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`
            const hoverBorderClasses = variant === 'compact'
              ? 'hover:border-gray-300 hover:border-4 focus-within:border-gray-300 focus-within:border-4'
              : 'border-4 border-gray-300 hover:border-red-600 focus-within:border-gray-300'

                if (variant === 'stacked') {
                const imagesForCard = parseImages((s as Service).image)
                return (
                  <article
                    key={s.id}
                    className={`${baseClasses} group hover:z-50 hover:scale-120 hover:-translate-y-1 hover:shadow-xl focus-within:z-50 focus-within:scale-110 focus-within:-translate-y-1 focus-within:shadow-xl ${hoverBorderClasses}`}
                    style={{ transitionDelay: `${i * 20}ms` }}
                    tabIndex={0}
                    onClick={() => openModal(s)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(s) } }}
                  >
                    {/* Rest state: show image with title overlay */}
                    <div className="relative w-full h-56 overflow-hidden">
                      <Image src={imagesForCard[0] || DEFAULT_IMAGE} alt={s.title} fill className="object-cover" />
                      <div className="absolute left-4 top-4 bg-black/40 text-white px-3 py-1 rounded opacity-100 transition-opacity">{s.title || 'Servicio'}</div>
                    </div>

                  </article>
                )
            }

            // default: compact overlay variant (used on home)
            return (
              <article
                key={s.id}
                className={`${baseClasses} relative z-0 group hover:z-50 hover:scale-110 focus-within:z-50 focus-within:scale-110 ${hoverBorderClasses}`}
                style={{ transitionDelay: `${i * 40}ms` }}
                tabIndex={0}
              >
                <Link href={s.href || '/services'} className="block w-full h-full">
                  <div className="relative w-full h-60 sm:h-64 md:h-72 lg:h-80 overflow-hidden">
                    <Image src={imgSrc} alt={s.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    {/* Gradient overlay that only covers the bottom text area (top lighter, bottom darker) */}
                    <div className="absolute left-0 right-0 bottom-0 h-28 sm:h-32 md:h-36 lg:h-40 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />
                    <div className="absolute left-4 right-4 bottom-4 text-white">
                      {showTitle && <h3 className="text-lg font-semibold leading-tight">{s.title || 'Servicio'}</h3>}
                      <p className="mt-1 text-sm opacity-90 line-clamp-2">{s.description}</p>
                    </div>
                  </div>
                </Link>
              </article>
            )
          })}
        </div>
        {/* Modal overlay for stacked variant */}
        {activeService && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/65" // Increased transparency from 50 to 30
            onClick={closeModal} // Close modal when clicking outside
          >
            <div
              className="bg-white rounded-lg max-w-4xl w-[95%] md:w-[75%] shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-[65%_35%] md:h-[60%] border-4 border-gray-300"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
            >
              {/* Left: image navigator - fixed size so all modals match */}
              <div className="relative w-full h-64 md:h-full flex items-center justify-center overflow-hidden bg-gray-100">
                <Image src={modalImages[modalImageIndex] || DEFAULT_IMAGE} alt={activeService?.title || ''} fill className="object-cover" />
                {modalImages.length > 1 && (
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center justify-center space-x-4">
                    <button
                      aria-label="Anterior"
                      onClick={(e) => { e.stopPropagation(); setModalImageIndex(i => (i - 1 + modalImages.length) % modalImages.length) }}
                      className="w-8 h-8 rounded-full bg-white/30 hover:bg-white/70 transition-colors flex items-center justify-center shadow-sm text-2xl leading-none"
                    >
                      ‹
                    </button>
                    {modalImages.map((_, index) => (
                      <button
                        key={index}
                        onClick={(e) => { e.stopPropagation(); setModalImageIndex(index) }}
                        className={`w-2 h-2 rounded-full ${index === modalImageIndex ? 'bg-white' : 'bg-white/50'}`}
                        aria-label={`Ir a imagen ${index + 1}`}
                      />
                    ))}
                    <button
                      aria-label="Siguiente"
                      onClick={(e) => { e.stopPropagation(); setModalImageIndex(i => (i + 1) % modalImages.length) }}
                      className="w-8 h-8 rounded-full bg-white/30 hover:bg-white/70 transition-colors flex items-center justify-center shadow-sm text-2xl leading-none"
                    >
                      ›
                    </button>
                  </div>
                )}
              </div>

              {/* Right: title and description */}
              <div className="p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-400 mb-4 mt-12">{activeService?.title}</h3>
                </div>
                <div className="mt-auto">
                  <p className="text-gray-700 text-sm mb-12">{activeService?.description}</p>
                </div>
              </div>

              {/* Close button */}
              <button
                aria-label="Cerrar"
                onClick={closeModal}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/30 hover:bg-white/70 transition-colors flex items-center justify-center shadow-sm text-2xl leading-none"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
