"use client"

import React from 'react'
import Link from 'next/link'
import ProductDetail from './ProductDetail'
import { supabase } from '@/lib/supabase'

type DBRow = {
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
  unit_size?: string | number | null
}

type PDProduct = React.ComponentProps<typeof ProductDetail>['product']

function interpretMeasurementUnit(unit: string | null | undefined) {
  const unitSymbols: Record<string, string> = {
    in: '"',
    ft: "'",
    cm: 'cm',
    mm: 'mm',
    m: 'm',
    m_lin: 'm',
    kg: 'kg',
    g: 'g',
    lb: 'lb',
    oz: 'oz',
  }
  if (!unit) return ''
  return unitSymbols[unit] || unit
}

function formatUnitSize(unitSize: string | number | null | undefined, measurementUnit: string | null | undefined): string | null {
  if (unitSize == null) return null
  const u = String(unitSize)
  if (measurementUnit === 'in' && u.includes('.')) {
    const [whole, fraction] = u.split('.')
    if (fraction) {
      const numerator = parseInt(fraction, 10)
      const denominator = Math.pow(10, fraction.length)
      const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
      const divisor = gcd(numerator, denominator)
      const fractionalPart = `${numerator / divisor}/${denominator / divisor}`
      return whole === '0' ? fractionalPart : `${whole} ${fractionalPart}`.trim()
    }
  }
  return u
}

function mapRow(p: DBRow): PDProduct {
  // Normalize arrays
  const characteristics: string[] = Array.isArray(p.characteristics)
    ? p.characteristics.filter(Boolean) as string[]
    : (typeof p.characteristics === 'string' ? (p.characteristics as string).split(',').map((s) => s.trim()).filter(Boolean) : [])
  const features: string[] = Array.isArray(p.features)
    ? p.features.filter(Boolean) as string[]
    : (typeof p.features === 'string' ? (p.features as string).split(',').map((s) => s.trim()).filter(Boolean) : [])
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
    description: p.description || null,
    image: imgs.length ? imgs[0] : null,
    images: imgs.length ? imgs : null,
    image_url: imgs.length ? imgs[0] : null,
    features,
    characteristics,
    applications: p.applications || [],
    unit_size: formatUnitSize(p.unit_size, p.measurement_unit),
    measurement_unit: interpretMeasurementUnit(p.measurement_unit || ''),
    price: p.price ?? null,
  }
}

export default function RealtimeProductDetail({ initialProduct, initialVariants }: { initialProduct: PDProduct, initialVariants: PDProduct[] }) {
  const [product, setProduct] = React.useState<PDProduct>(initialProduct)
  const [variants, setVariants] = React.useState<PDProduct[]>(initialVariants)
  const [missing, setMissing] = React.useState(false)

  const groupName = React.useMemo(() => product?.name || initialProduct.name, [product, initialProduct.name])
  const productId = React.useMemo(() => String(initialProduct.id), [initialProduct.id])

  const refreshByName = React.useCallback(async (name: string) => {
    try {
      const res = await fetch(`/api/products?name=${encodeURIComponent(name)}&public=true`, { cache: 'no-store' })
      const json = await res.json()
      const rows = Array.isArray(json?.products) ? (json.products as DBRow[]) : []
      
      // Check if current product is still visible
      const currentProductExists = rows.some((r) => String(r.id) === productId)
      
      if (!currentProductExists) {
        // Product is no longer visible (visible: false or deleted)
        setMissing(true)
        return
      }
      
      if (rows.length === 0) {
        setMissing(true)
        return
      }
      const mapped = rows.map(mapRow)
      const found = mapped.find((m) => String(m.id) === productId)
      const main = found || mapped[0]
      const rest = mapped.filter((m) => String(m.id) !== String(main.id))
      setProduct(main)
      setVariants(rest)
      setMissing(false)
    } catch {
      // ignore errors silently
    }
  }, [productId])

  React.useEffect(() => {
    // Subscribe to changes in this product id and its name group
    const channel = supabase
      .channel(`public:fasercon_products:detail:${productId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fasercon_products', filter: `id=eq.${productId}` }, () => {
        refreshByName(groupName)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fasercon_products', filter: `name=eq.${groupName}` }, () => {
        refreshByName(groupName)
      })
      .subscribe()

    return () => {
      try { supabase.removeChannel(channel) } catch {}
    }
  }, [productId, groupName, refreshByName])

  if (missing) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12 text-center text-sm text-gray-600">
        Producto no disponible. <Link href="/products" className="text-red-600 underline">Volver al catálogo</Link>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12 text-center text-sm text-gray-600">
        Producto no encontrado. <Link href="/products" className="text-red-600 underline">Volver al catálogo</Link>
      </div>
    )
  }


  return (
    <div>
      <ProductDetail product={product} variants={variants} />
    </div>
  );
}
