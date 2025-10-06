import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'
import ProductGallery from '@/components/ProductGallery'
import ProjectGallery from '@/components/ProjectGallery'
import QuoteCalculator from '@/components/QuoteCalculator'
import ContactForm from '@/components/ContactForm'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <ProductGallery />
      <ProjectGallery />
      <QuoteCalculator />
      <ContactForm />
      <Footer />
    </main>
  )
}
