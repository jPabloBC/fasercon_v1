import React from 'react'
import ServicesCarousel from './ServicesCarousel'
import { supabaseAdmin } from '@/lib/supabase'

type Row = Record<string, unknown>

type ServicePayload = {
  id: string
  title: string
  description?: string
  image?: string | string[]
  href?: string
}

// Force dynamic rendering so production always fetches latest services (no build-time snapshot)
export const dynamic = 'force-dynamic'

export default async function ServicesCarouselServer({ showAll, variant, intro, showTitle } : { showAll?: boolean; variant?: 'compact' | 'stacked'; intro?: string; showTitle?: boolean }) {
  let services: ServicePayload[] = []
  try {
    const { data } = await supabaseAdmin
      .from('fasercon_services')
      .select('*')

    services = (data || []).map((s: Row) => {
      return {
        id: String(s.id || ''),
        title: (s.title as string) || (s.name as string) || '',
        description: typeof s.description === 'string' ? s.description : undefined,
        image: typeof s.image_url === 'string' ? s.image_url : Array.isArray(s.images) ? s.images : (typeof s.images === 'string' ? s.images : undefined),
        href: typeof s.href === 'string' ? s.href : undefined,
      }
    })

    // Shuffle services array (Fisher–Yates) so the order is randomized on each render
    for (let i = services.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = services[i]
      services[i] = services[j]
      services[j] = tmp
    }
  } catch (err) {
    console.warn('Error loading services in ServicesCarouselServer:', err)
  }

  return (
    // Render the client component with fetched data. This is a server component that passes props to a client component.
    <ServicesCarousel services={services} showAll={showAll} variant={variant} intro={intro} showTitle={showTitle} />
  )
}
