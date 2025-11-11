import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ServicesCarousel from '@/components/ServicesCarousel'
import { supabaseAdmin } from '@/lib/supabase'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Servicios - Fasercon | Fabricación y Montaje Industrial',
  description: 'Servicios especializados en fabricación y montaje de estructuras metálicas, cubiertas, techos y soportaciones industriales. Soluciones personalizadas.',
  openGraph: {
    title: 'Servicios Fasercon - Fabricación y Montaje Industrial',
    description: 'Ofrecemos servicios completos de fabricación, montaje y mantenimiento de estructuras metálicas e instalaciones industriales.',
    type: 'website',
  },
}

export default async function ServicesPage() {
  let services: { id: string | number; title: string; description?: string | null; image?: string | null; href?: string | null }[] = []
  try {
    const { data } = await supabaseAdmin
      .from('fasercon_services')
      .select('*')
      .order('order', { ascending: true })

    services = (data || []).map((s: unknown) => {
      const row = s as Record<string, unknown>
      return {
        id: (row.id as string) || (row.id as number) || String(row.id || ''),
        title: (row.title as string) || (row.name as string) || '',
        description: typeof row.description === 'string' ? row.description : null,
        image: typeof row.image_url === 'string' ? row.image_url : typeof row.image === 'string' ? row.image : null,
        href: typeof row.href === 'string' ? row.href : null,
      }
    })
  } catch (err) {
    console.warn('Error loading services:', err)
  }

  return (
    <main className="mt-24 min-h-screen">
      <Navbar />
  <ServicesCarousel services={services} showAll variant="stacked" />

      <Footer />
    </main>
  )
}
