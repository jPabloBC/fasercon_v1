'use client'

import React from 'react'
import ProductGallery from './ProductGallery'
import { supabase } from '@/lib/supabase'

type DBProductRow = {
  id: string
  name: string
  description?: string | null
  image_url?: string | string[] | null
  features?: string[] | null
  applications?: string[] | null
  characteristics?: string[] | null
  price?: number | null
  visible?: boolean | null
  order?: number | null
  measurement_unit?: string | null
  unit_size?: string | null
}

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
  moreInfoLink?: string
}

export default function RealtimeProductGallery({ 
  initialProducts,
  limit = 4,
  columns = 4
}: { 
  initialProducts: GalleryProduct[]
  limit?: number
  columns?: 1 | 2 | 3 | 4 | 5
}) {
  const [products, setProducts] = React.useState<GalleryProduct[]>(initialProducts)

  const refreshProducts = React.useCallback(async () => {
    try {
      const res = await fetch('/api/products?public=true', { cache: 'no-store' })
      const json = await res.json()
      const data = Array.isArray(json?.products) ? (json.products as DBProductRow[]) : []
      
      const normalizeUrl = (url: string | null | undefined): string | null => {
        if (!url) return null
        try {
          const u = new URL(url)
          return u.toString()
        } catch {
          return url
        }
      }

      let mapped = data.map((p: DBProductRow) => {
        const imagesArr = Array.isArray(p.image_url)
          ? p.image_url
          : (p.image_url ? [p.image_url] : [])
        const normalizedImages = imagesArr.map((u) => normalizeUrl(u)!).filter(Boolean) as string[]
        
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
          moreInfoLink: `/products/${p.id}`
        }
      })

      // Eliminar duplicados por nombre
      const uniqueProductsByName = new Map<string, GalleryProduct>()
      mapped = mapped.filter((product) => {
        if (uniqueProductsByName.has(product.name)) {
          return false
        }
        uniqueProductsByName.set(product.name, product)
        return true
      })

      // Aleatorizar los productos
      mapped = mapped.sort(() => Math.random() - 0.5)
      
      setProducts(mapped)
    } catch (error) {
      console.error('Error refreshing products:', error)
    }
  }, [])

  React.useEffect(() => {
    // Subscribe to any changes in the products table
    const channel = supabase
      .channel('public:fasercon_products:home')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'fasercon_products' 
      }, () => {
        refreshProducts()
      })
      .subscribe()

    return () => {
      try { 
        supabase.removeChannel(channel) 
      } catch {}
    }
  }, [refreshProducts])

  return (
    <ProductGallery 
      products={products}
      limit={limit}
      columns={columns}
    />
  )
}
