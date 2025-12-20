'use client'

import React from 'react'
import SimilarCarousel, { SimilarItem } from './SimilarCarousel'
import { supabase } from '@/lib/supabase'

type DBProductRow = {
  id: string
  name: string
  image_url?: string | string[] | null
  description?: string | null
  unit_size?: string | number | null
  measurement_unit?: string | null
  visible?: boolean | null
}

export default function RealtimeSimilarCarousel({ 
  initialItems, 
  currentProductId 
}: { 
  initialItems: SimilarItem[]
  currentProductId: string 
}) {
  const [items, setItems] = React.useState<SimilarItem[]>(initialItems)

  const refreshOtherProducts = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/products?public=true`, { cache: 'no-store' })
      const json = await res.json()
      const products = Array.isArray(json?.products) ? (json.products as DBProductRow[]) : []
      
      // Filter out current product
      const filtered = products.filter(p => String(p.id) !== currentProductId)
      
      // Group by name (excluding current product's name)
      const groups = new Map<string, { rep: DBProductRow; count: number }>()
      for (const p of filtered) {
        const key = String(p.name || '').trim().toLowerCase()
        if (!groups.has(key)) {
          groups.set(key, { rep: p, count: 1 })
        } else {
          const v = groups.get(key)!
          groups.set(key, { rep: v.rep, count: v.count + 1 })
        }
      }
      
      // Map to SimilarItem format
      const mapped = Array.from(groups.values()).map(({ rep, count }) => {
        const imgs = Array.isArray(rep.image_url) 
          ? rep.image_url 
          : (rep.image_url ? [rep.image_url] : [])
        const cleaned = imgs
          .map((u: unknown) => (typeof u === 'string' ? u.trim() : ''))
          .filter(Boolean)
        
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
      
      setItems(mapped)
    } catch (error) {
      console.error('Error refreshing other products:', error)
    }
  }, [currentProductId])

  React.useEffect(() => {
    // Subscribe to any changes in the products table
    const channel = supabase
      .channel('public:fasercon_products:similar')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'fasercon_products' 
      }, () => {
        refreshOtherProducts()
      })
      .subscribe()

    return () => {
      try { 
        supabase.removeChannel(channel) 
      } catch {}
    }
  }, [refreshOtherProducts])

  if (items.length === 0) {
    return <div className="mt-4 text-sm text-gray-600">No se encontraron productos similares.</div>
  }

  return <SimilarCarousel items={items} />
}
