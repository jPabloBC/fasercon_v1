import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cotización - Fasercon | Solicita tu Presupuesto',
  description: 'Solicita una cotización personalizada para tu proyecto de estructuras metálicas, cubiertas o soluciones industriales. Respuesta rápida y profesional.',
  openGraph: {
    title: 'Cotización Fasercon - Solicita tu Presupuesto',
    description: 'Obtén una cotización personalizada para tu proyecto industrial. Selecciona productos y recibe un presupuesto detallado.',
    type: 'website',
  },
}

export default function QuoteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
