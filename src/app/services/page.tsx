import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ServicesCarousel from '@/components/ServicesCarouselServer'
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

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function ServicesPage() {
  return (
    <main className="mt-24 min-h-screen">
      <Navbar />
      <ServicesCarousel showAll variant="stacked" />
      <Footer />
    </main>
  )
}
