export const dynamic = 'force-dynamic'

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductsStore from '@/components/ProductsStore';
import { supabaseAdmin } from '@/lib/supabase'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Productos - Fasercon | Catálogo de Estructuras Metálicas',
  description: 'Explora nuestro catálogo de productos: estructuras metálicas, cubiertas, techos, soportaciones y soluciones industriales. Calidad garantizada.',
  openGraph: {
    title: 'Productos Fasercon - Estructuras Metálicas',
    description: 'Catálogo completo de estructuras metálicas, cubiertas y soluciones industriales fabricadas con los más altos estándares de calidad.',
    type: 'website',
  },
}

type DBProductRow = {
  id: string
  name: string
  sku?: string | null
  description?: string | null
  image_url?: string | string[] | null
  features?: string[] | null
  applications?: string[] | null
  unit_size?: string | null
  measurement_unit?: string | null
  price?: number | null
  visible?: boolean | null
  order?: number | null
  characteristics?: string[] | null
}

export default async function ProductsPage() {
  type GalleryProduct = {
    id: string
    name: string
    sku?: string | null
    description?: string | null
    image?: string | null
    features: string[]
    applications: string[]
    unit_size?: string | null
    measurement_unit?: string | null
    price?: number | null
    visible?: boolean | null
    order?: number | null
  }

  let products: GalleryProduct[] = []
  try {
    const normalizeUrl = (url: string | null | undefined): string | null => {
      if (!url || typeof url !== 'string' || url.trim() === '') return null;
      // Keep the original URL as-is. Previously we converted Supabase
      // signed URLs (/storage/v1/object/sign/...) to a public path which
      // removed the signed token. That breaks images when the bucket is
      // not public. Returning the signed URL preserves access to private
      // objects and restores the previous behavior.
      try {
        // Validate it's a URL; if parsing fails, return original value
        const u = new URL(url);
        return u.toString();
      } catch {
        return url;
      }
    }
    const { data } = await supabaseAdmin
      .from('fasercon_products')
      .select('*')
      // Mostrar todos (no filtrar por visible) para evitar ocultar registros antiguos o borradores.
      .order('order', { ascending: true })
    products = (data || []).map((p: DBProductRow) => {
      const imagesArr = Array.isArray(p.image_url)
        ? p.image_url
        : (p.image_url ? [p.image_url] : [])
      const normalizedImages = imagesArr.map((u) => normalizeUrl(u)!).filter(Boolean) as string[]
      return {
        id: p.id,
        name: p.name,
        sku: p.sku ?? null,
        description: p.description,
        image: normalizedImages[0] || null,
        features: p.characteristics || p.features || [],
        applications: p.applications || [],
        unit_size: p.unit_size,
        measurement_unit: p.measurement_unit,
        price: p.price,
        visible: p.visible,
        order: p.order,
      }
    })
  } catch (err) {
    console.error('Error loading products for products page:', err)
  }

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="relative pt-16 md:pt-20 lg:pt-24 pb-12">
        {/* Client-side store UI with search, pagination and add-to-quote */}
        <ProductsStore products={products} />

        {/* Overlay reservado para mantenimiento */}
        
      </section>
      <Footer />
      
    </main>
  );
}
