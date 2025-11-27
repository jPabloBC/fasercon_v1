import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'
import ProductGallery from '@/components/ProductGallery'
import Link from 'next/link'
import HomeServicesCarousel from '@/components/HomeServicesCarousel'
import ContactForm from '@/components/ContactForm'
import Footer from '@/components/Footer'
import { supabaseAdmin } from '@/lib/supabase'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Fasercon - Estructuras Metálicas y Soluciones Industriales',
  description: 'Especialistas en fabricación y montaje de estructuras metálicas, cubiertas, techos y soportaciones industriales. Calidad, precisión y confianza en cada proyecto.',
  openGraph: {
    title: 'Fasercon - Estructuras Metálicas y Soluciones Industriales',
    description: 'Fabricamos y montamos estructuras metálicas, soportaciones y soluciones industriales personalizadas con más de 10 años de experiencia.',
    type: 'website',
  },
}

type DBProductRow = {
  id: string
  name: string
  description?: string | null
  image_url?: string | null
  features?: string[] | null
  applications?: string[] | null
  price?: number | null
  visible?: boolean | null
  order?: number | null
  measurement_unit?: string | null
  unit_size?: string | null
  characteristics?: string[] | null
}

export default async function Home() {
  // Server-side fetch of products so ProductGallery receives up-to-date data
  type GalleryProduct = {
    id: string
    name: string
    description?: string | null
    image: string | null
    features: string[]
    applications: string[]
    price?: number | null
    visible?: boolean | null
    order?: number | null
    measurement_unit?: string | null
    unit_size?: string | null
  }

    let products: GalleryProduct[] = []
  let servicesData: { id: string | number; title: string; description?: string | null; image?: string | null; href?: string | null }[] = []
  try {
    // Fetch services from DB (assumes a `fasercon_services` table). If not present,
    // the default static services in the component will be used.
    try {
      const { data: sdata } = await supabaseAdmin
        .from('fasercon_services')
        .select('*')
        .order('order', { ascending: true })

      servicesData = (sdata || []).map((s: unknown) => {
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
      // If the table doesn't exist or query fails, fall back to the component defaults.
      console.warn('No services table or error loading services for home:', err)
    }
    const normalizeUrl = (url: string | null | undefined): string | null => {
      if (!url) return null;
      try {
        const u = new URL(url);
        return u.toString();
      } catch {
        return url;
      }
    };

    const { data } = await supabaseAdmin
      .from('fasercon_products')
      .select('*')
      .order('order', { ascending: true });

    products = (data || []).map((p: DBProductRow) => {
      const imagesArr = Array.isArray(p.image_url)
        ? p.image_url
        : (p.image_url ? [p.image_url] : []);
      const normalizedImages = imagesArr.map((u) => normalizeUrl(u)!).filter(Boolean) as string[];
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        image: normalizedImages[0] || null,
        features: p.characteristics || p.features || [],
        applications: p.applications || [],
        unit_size: p.unit_size,
        measurement_unit: p.measurement_unit,
        price: p.price,
        visible: p.visible,
        order: p.order,
      };
    });
  // mapped products ready for ProductGallery
  } catch {
    // console.error('Error loading products for home')
    // console.error('Error al consultar productos');
  }

  // Eliminar productos duplicados basados en el nombre y luego los ordeno de forma aleatoria
  const uniqueProductsByName = new Map();
    products = products.filter((product) => {
      if (uniqueProductsByName.has(product.name)) {
        return false;
      }
      uniqueProductsByName.set(product.name, true);
      return true;
    });

    // Aleatorizar los productos
    products = products.sort(() => Math.random() - 0.5);

  if (process.env.NODE_ENV !== 'production') {
    // Debug info only during development/build; avoid printing large data in production
    // console.debug('Productos obtenidos para el home:', products);
  }

  return (
    <main className="min-h-screen">
      <Navbar />
        <h1 className="sr-only">Fasercon - Estructuras Metálicas y Soluciones Industriales</h1>
        <Hero />
        <HomeServicesCarousel services={servicesData} intro={"Fabricamos y montamos estructuras metálicas, soportaciones y soluciones industriales personalizadas, entregando calidad, precisión y confianza en cada proyecto."} />
        <div className="mb-32 flex justify-center">
          <Link href="/services" className="inline-block rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500">Ver  nuestros servicios</Link>
        </div>
        
        <ProductGallery 
        products={products.map(product => ({
          ...product,
          moreInfoLink: `/products/${product.id}`
        }))} 
        limit={4} 
        columns={4} 
      /> 
      <ContactForm />
      <Footer />
    </main>
  )
}
