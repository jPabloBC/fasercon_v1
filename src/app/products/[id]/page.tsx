import RealtimeProductDetail from '@/components/RealtimeProductDetail'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Link from 'next/link'
import RealtimeSimilarCarousel from '@/components/RealtimeSimilarCarousel'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type DBProductRow = {
  id: string
  name: string
  description?: string | null
  image_url?: string | null
  sku?: string | null
  features?: string[] | null
  applications?: string[] | null
  price?: number | null
  visible?: boolean | null
  order?: number | null
  characteristics?: string[] | string | null
  measurement_unit?: string | null
  unit_size?: string | null // Added this field
}

const interpretMeasurementUnit = (unit: string) => {
  const unitSymbols: Record<string, string> = {
    in: '"',
    ft: "'",
    cm: 'cm',
    mm: 'mm',
    m: 'm',
    kg: 'kg',
    g: 'g',
    lb: 'lb',
    oz: 'oz',
  }
  return unitSymbols[unit] || unit
}

export default async function ProductPage({ params }: { params: { id: string } }) {
  const resolvedParams = await params // Ensure params is awaited
  const id = resolvedParams.id

  let product: DBProductRow | null = null
  let similar: DBProductRow[] = []
  let variants: DBProductRow[] = []
  const shuffle = <T,>(array: T[]): T[] => {
    const a = [...array]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }
  try {
    const { data } = await supabaseAdmin
      .from('fasercon_products')
      .select('*')
      .eq('id', id)
      .eq('visible', true)
      .limit(1)
    product = (data && data[0]) || null

    // Asegurarse que characteristics sea array (puede venir como string)
    if (product && product.characteristics && typeof product.characteristics === 'string') {
      product.characteristics = product.characteristics.split(',').map((s: string) => s.trim()).filter(Boolean)
    }

    if (product) {
      // fetch variants: other products with the exact same name
      try {
        const { data: sameName } = await supabaseAdmin
          .from('fasercon_products')
          .select('*')
          .eq('name', product.name)
          .eq('visible', true)
          .order('order', { ascending: true })
        variants = (sameName || []).filter((p) => p.id !== product!.id)
      } catch (e) {
        console.error('Error loading variants', e)
      }
      // find other products (exclude current). We will show many in a horizontal carousel.
      const { data: others } = await supabaseAdmin
        .from('fasercon_products')
        .select('*')
        .not('id', 'eq', product.id)
        .eq('visible', true)
        .order('order', { ascending: true })
        .limit(300)
      // Construir grupos por nombre (excluyendo el nombre actual) y elegir un representante por grupo
      const groups = new Map<string, DBProductRow[]>()
      for (const p of (others || []) as DBProductRow[]) {
        if (p.name === product.name) continue // excluye grupo actual
        const key = String(p.name || '').trim().toLowerCase()
        const arr = groups.get(key) || []
        arr.push(p)
        groups.set(key, arr)
      }
  // Representantes para todos los grupos y aleatorizarlos (mostrar todos)
  const reps = Array.from(groups.values()).map(arr => arr[0])
  similar = shuffle(reps)

      // fallback: if none found, try any visible products (excluding current)
      if ((similar || []).length === 0) {
        const { data: fallback } = await supabaseAdmin
          .from('fasercon_products')
          .select('*')
          .not('id', 'eq', product.id)
          .not('name', 'eq', product.name) // Exclude products with the same name
          .eq('visible', true)
          .limit(6)
  similar = shuffle(fallback || [])
      }
  // similar products count available
    }
  } catch (err) {
    console.error('Error loading product', err)
  }

  if (!product) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <div className="mx-auto max-w-7xl px-6 py-12 text-center">Producto no encontrado</div>
        <Footer />
      </main>
    )
  }

    // Normalizar characteristics y features a string[]
    const mapped = (p: DBProductRow) => {
        const formatUnitSize = (
        unitSize: string | number | null | undefined,
        measurementUnit: string | null | undefined
      ): string | null | undefined => {
        if (measurementUnit === 'in' && unitSize) {
          const [whole, fraction] = String(unitSize).split('.')
          if (fraction) {
            const numerator = parseInt(fraction, 10)
            const denominator = Math.pow(10, fraction.length)
            const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
            const divisor = gcd(numerator, denominator)
            const fractionalPart = `${numerator / divisor}/${denominator / divisor}`
            return whole === '0' ? fractionalPart : `${whole} ${fractionalPart}`.trim()
          }
        }
        return unitSize == null ? unitSize as null | undefined : String(unitSize)
      }

  // Normalizar characteristics y features a string[]
      let characteristics: string[] = []
      if (Array.isArray(p.characteristics)) {
        characteristics = p.characteristics.filter(Boolean)
      } else if (typeof p.characteristics === 'string') {
        characteristics = (p.characteristics as string).split(',').map((s: string) => s.trim()).filter(Boolean)
      }
  let features: string[] = []
      if (Array.isArray(p.features)) {
        features = p.features.filter(Boolean)
      } else if (typeof p.features === 'string') {
        features = (p.features as string).split(',').map((s: string) => s.trim()).filter(Boolean)
      }

      const normalizeUrl = (url: string | string[] | null | undefined): string[] => {
        if (!url) return []
        const arr = Array.isArray(url) ? url : [url]
        return arr
          .map((u) => (typeof u === 'string' ? u.trim() : ''))
          .filter((u) => !!u)
          .map((u) => {
            try { return new URL(u).toString() } catch { return u }
          })
      }

      const imgs = normalizeUrl(p.image_url)
      return {
        id: p.id,
        name: p.name,
        sku: p.sku || null,
        description: p.description,
        images: imgs.length ? imgs : null,
        image_url: imgs.length ? imgs[0] : null,
        image: imgs.length ? imgs[0] : null,
        features,
        characteristics,
        applications: p.applications || [],
        unit_size: formatUnitSize(p.unit_size, p.measurement_unit),
        measurement_unit: interpretMeasurementUnit(p.measurement_unit || ''),
      }
    }

  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="pt-28 pb-12">
        {/* Botón circular para volver arriba del producto */}
        <div className="mx-auto max-w-7xl px-6 flex justify-start -mb-7">
          <Link href="/products" className="inline-flex items-center justify-center rounded-full bg-gray-400 text-white w-10 h-10 hover:bg-gray-500 transition-colors shadow">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>
        </div>
        <RealtimeProductDetail
          initialProduct={{
            ...mapped(product)
          }}
          initialVariants={variants.map((variant) => ({
            ...mapped(variant)
          }))}
        />
        <div className="mx-auto max-w-7xl px-6 py-8">
          <h3 className="text-lg font-semibold">Otros productos</h3>
          <RealtimeSimilarCarousel
            currentProductId={id}
            initialItems={(() => {
              // Re-mapea a items agrupados, marcando multi=true si hay más de una variante con ese nombre
              const groups = new Map<string, { rep: DBProductRow; count: number }>()
              for (const s of similar) {
                const key = String(s.name || '').trim().toLowerCase()
                if (!groups.has(key)) groups.set(key, { rep: s, count: 1 })
                else {
                  const v = groups.get(key)!
                  groups.set(key, { rep: v.rep, count: v.count + 1 })
                }
              }
              return Array.from(groups.values()).map(({ rep, count }) => {
                // normalize rep.image_url (could be array or string)
                const imgs = Array.isArray(rep.image_url) ? rep.image_url : (rep.image_url ? [rep.image_url] : [])
                const cleaned = imgs.map((u: unknown) => (typeof u === 'string' ? u.trim() : '')).filter(Boolean)
                return {
                  id: rep.id,
                  name: rep.name,
                  image_url: cleaned.length ? cleaned[0] : undefined,
                  description: rep.description || undefined,
                  unit_size: count > 1 ? null : (rep.unit_size ? String(rep.unit_size) : null),
                  measurement_unit: count > 1 ? null : (rep.measurement_unit || null),
                  multi: count > 1,
                }
              })
            })()}
          />
        </div>
      </div>
      <Footer />
    </main>
  )
}
