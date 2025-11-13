"use client"

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { PhotoIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabase'

type Product = {
  id: string | number
  name: string
  description?: string | null
  image?: string | null
  // Puede venir como string, array o null desde la API/DB
  image_url?: string | string[] | null
  features?: string[]
  applications?: string[]
  price?: number | null
  unit_size?: string | null
  measurement_unit?: string | null
}

type Props = {
  products: Product[]
}


export default function ProductsStore({ products }: Props) {
  const [query, setQuery] = useState('')
  const [list, setList] = useState<Product[]>(products)
  const [page, setPage] = useState(1)
  const pageSize = 24
  // const [message, setMessage] = useState<string | null>(null)
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])
  const [showFiltersMobile, setShowFiltersMobile] = useState(false)

  // Normaliza productos para asegurar que siempre hay un campo `image` string (o null)
  const normalizeProducts = (items: unknown[]): Product[] => {
    return (items || []).map((raw: unknown) => {
      const row = raw as Record<string, unknown>
      const imageArray = Array.isArray(row.image_url)
        ? (row.image_url as unknown[])
        : (row.image_url ? [row.image_url] : [])
      const firstImage = typeof row.image === 'string' && row.image
        ? (row.image as string)
        : (typeof imageArray[0] === 'string' ? (imageArray[0] as string) : null)
      return {
        id: String(row.id ?? ''),
        name: String(row.name ?? ''),
        description: (typeof row.description === 'string' ? row.description : null),
        image: firstImage || null,
        image_url: typeof imageArray[0] === 'string' ? (imageArray[0] as string) : null,
        features: (row.characteristics as string[]) || (row.features as string[]) || [],
        applications: (row.applications as string[]) || [],
        price: typeof row.price === 'number' ? row.price : null,
        unit_size: typeof row.unit_size === 'string' ? row.unit_size : null,
        measurement_unit: typeof row.measurement_unit === 'string' ? row.measurement_unit : null,
      }
    })
  }

  // Keep local list in sync with prop changes (normalizado)
  useEffect(() => { setList(normalizeProducts(products)) }, [products])

  // Light polling to auto-refresh without page reload
  useEffect(() => {
    let active = true
    const pull = async () => {
      try {
        const res = await fetch('/api/products?public=true', { cache: 'no-store' })
        const json = await res.json()
        if (active && Array.isArray(json?.products)) {
          setList(normalizeProducts(json.products))
          // clamp páginas si cambia cantidad
          const nextPages = Math.max(1, Math.ceil((json.products.length || 0) / pageSize))
          setPage(p => Math.min(p, nextPages))
        }
      } catch {
        // noop: silent polling errors
      }
    }
    // initial pull and interval every 30s
    pull()
    const id = window.setInterval(pull, 30000)
    // Realtime subscription: refresh immediately on inserts/updates/deletes
    const channel = supabase
      .channel('public:fasercon_products:store')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fasercon_products' }, async () => {
        try {
          const res = await fetch('/api/products?public=true', { cache: 'no-store' })
          const json = await res.json()
          if (active && Array.isArray(json?.products)) {
            setList(normalizeProducts(json.products))
            // If current page is now out of range, clamp it
            const nextPages = Math.max(1, Math.ceil((json.products.length || 0) / pageSize))
            setPage((p) => Math.min(p, nextPages))
          }
  } catch {
  }
      })
      .subscribe()

    return () => {
      active = false
      window.clearInterval(id)
      try { supabase.removeChannel(channel) } catch {}
    }
  }, [])

  // Agrupa características por tipo detectando prefijos tipo "Material:", "Clase:", "Medida:", etc.
  const groupedFeatures = useMemo(() => {
    const groups: Record<string, Set<string>> = {}
    list.forEach((p) => {
      (p.features || []).forEach((f) => {
        if (!f) return
        // Detecta prefijo tipo "Material: Acero" => tipo: "Material", valor: "Acero"
        const match = String(f).match(/^([\wáéíóúüñ]+):\s*(.+)$/i)
        if (match) {
          const tipo = match[1].trim()
          const valor = match[2].trim()
          if (!groups[tipo]) groups[tipo] = new Set()
          groups[tipo].add(valor)
        } else {
          // Si no tiene prefijo, agrupa como "Otros"
          if (!groups['Otros']) groups['Otros'] = new Set()
          groups['Otros'].add(f)
        }
      })
    })
    return Object.entries(groups).map(([tipo, valores]) => ({
      tipo,
      valores: Array.from(valores).sort()
    })).sort((a, b) => a.tipo.localeCompare(b.tipo))
  }, [list])

  // group products by normalized name so size variants are grouped
  const groups = useMemo(() => {
    const map = new Map<string, Product[]>()
    list.forEach((p) => {
      const key = `${String(p.name || '').trim().toLowerCase()}`
      const arr = map.get(key) || []
      arr.push(p)
      map.set(key, arr)
    })
    return Array.from(map.entries()).map(([key, items]) => ({ key, items }))
  }, [list])

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase()
    return groups.filter((g) => {
      // group matches if any item matches the search and filters
      const anyMatches = g.items.some((p) => {
        const matchesQuery = !q || (p.name || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)
        if (!matchesQuery) return false

        // check selectedFeatures: only filter by features
        if (selectedFeatures.length === 0) return true
        return selectedFeatures.every((sf) => {
          const pf = (p.features || []).map(String)
          return pf.includes(sf)
        })
      })
      return anyMatches
    })
  }, [groups, query, selectedFeatures])

  const pages = Math.max(1, Math.ceil(filteredGroups.length / pageSize))
  const start = (page - 1) * pageSize
  const pageItems = filteredGroups.slice(start, start + pageSize)

  // Thumbnail component with graceful fallback:
  // - Try to render via `next/image` (server-optimized).
  // - If the image fails to load through the optimizer (403/404), fall back
  //   to a plain <img> which will request the signed URL directly.
  const ProductThumb = ({ src, alt }: { src: string | null; alt: string }) => {
    const [errored, setErrored] = useState(false);

    if (!src || typeof src !== 'string' || src.trim() === '' || !src.startsWith('http')) {
      return (
        <div className="flex flex-col items-center text-gray-400">
          <PhotoIcon className="h-10 w-10" />
        </div>
      );
    }

    return (
      <div className="relative w-full h-full">
        {!errored ? (
          <Image
            src={src}
            alt={alt}
            fill
            sizes="80px"
            className="object-contain bg-white"
            onError={() => setErrored(true)}
          />
        ) : (
          // Plain <img> will attempt the signed URL directly (bypassing Next optimizer)
          // which often succeeds when the optimizer is blocked or misconfigured.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt} className="object-contain bg-white w-full h-full" />
        )}
      </div>
    );
  }

  // Add-to-quote is intentionally handled from the product detail page.

  

  return (
    <div className="mx-auto max-w-full px-6 lg:px-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between py-8 gap-4">
        <h1 className="text-xl lg:text-3xl font-bold">Catálogo de Productos</h1>
        <div className="w-full md:max-w-md">
          <input
            aria-label="Buscar productos"
            placeholder="Buscar por nombre, descripción o características..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1) }}
            className="w-full rounded-md border-gray-200 px-3 py-2 shadow-sm"
          />
        </div>
      </div>

      {/* message UI reserved for future use */}



  {/* Layout: left filters (30%), right products (70%) */}
  <div className="flex flex-col md:flex-row gap-2">
        {/* Left: filters */}
  <aside className="hidden md:block md:w-[24%] lg:w-[18%] xl:w-[16%]">
          <div className="sticky top-28 space-y-4">
            <div className="rounded-lg bg-gray-50 p-4">
              <h3 className="text-sm font-semibold mb-2">Filtros</h3>
              <div className="text-xs text-gray-600 mb-2">Características</div>
              <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-2">
                {groupedFeatures.length === 0 ? (
                  <div className="text-xs text-gray-400">Sin características</div>
                ) : (
                  groupedFeatures.map(({ tipo, valores }) => (
                    <details key={tipo} className="bg-white rounded-lg border border-gray-200 shadow-sm group">
                      <summary className="flex items-center justify-between font-semibold text-xs mb-0 text-gray-700 cursor-pointer select-none py-1 px-2 rounded hover:bg-gray-50 min-h-[32px]">
                        <span className="truncate">{tipo}</span>
                        <svg className="h-5 w-5 text-gray-300 group-open:rotate-90 transition-transform" fill="none" viewBox="0 0 20 20" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 8l4 4 4-4" />
                        </svg>
                      </summary>
                      <div className="flex flex-wrap gap-2 py-2 px-2">
                        {valores.map((v) => {
                          const count = list.filter(p => (p.features || []).some(f => f.includes(`${tipo}:`) ? f === `${tipo}: ${v}` : f === v)).length
                          const selected = selectedFeatures.includes(`${tipo}: ${v}`) || selectedFeatures.includes(v)
                          return (
                            <label key={v} className={`cursor-pointer px-3 py-1 rounded-full border text-xs font-medium transition ${selected ? 'bg-red-50 border-red-400 text-red-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
                              <input type="checkbox" className="sr-only" checked={selected} onChange={(e) => {
                                setPage(1)
                                setSelectedFeatures(prev => e.target.checked ? [...prev, `${tipo}: ${v}`] : prev.filter(x => x !== `${tipo}: ${v}`))
                              }} />
                              <span className="truncate">{v}</span>
                              <span className="ml-1 text-gray-400">({count})</span>
                            </label>
                          )
                        })}
                      </div>
                    </details>
                  ))
                )}
              </div>
              {selectedFeatures.length > 0 && (
                <div className="mt-4">
                  <button onClick={() => setSelectedFeatures([])} className="text-xs text-red-600">Limpiar filtros</button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* vertical separator (desktop) */}
  <div className="hidden md:block w-[0.5px] bg-gray-200" />

        {/* Mobile filters toggle */}
        <div className="md:hidden mb-4 w-full">
          <button onClick={() => setShowFiltersMobile(s => !s)} className="mb-3 rounded-md border px-3 py-2 text-sm">{showFiltersMobile ? 'Ocultar filtros' : 'Mostrar filtros'}</button>
          {showFiltersMobile && (
            <div className="rounded-lg bg-gray-50 p-4 mb-4">
              <h3 className="text-sm font-semibold mb-2">Filtros</h3>
              <div className="text-xs text-gray-600 mb-2">Características</div>
              <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-2">
                {/* allFeatures eliminado, solo groupedFeatures */}
              </div>
            </div>
          )}
        </div>

        {/* Right: products list */}

  <div className="w-full md:w-[76%] lg:w-[82%] xl:w-[84%]">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-1.5">
      {pageItems.map((group) => {
        const rep = group.items[0]
        const hasMultipleDimensions = group.items.length > 1

        // Find the common description across all products in the group
        const commonDescription = group.items.reduce((common, product) => {
          if (!common) return product.description || ''
          const currentDescription = product.description || ''
          let i = 0
          while (i < common.length && i < currentDescription.length && common[i] === currentDescription[i]) {
            i++
          }
          return common.slice(0, i)
        }, '')

        return (
          <Link key={group.key} href={`/products/${rep.id}`} className="block w-full text-gray-900 h-full">
            <div className="flex flex-col border-2 border-gray-200 rounded-lg px-3 py-2 bg-white transition-all duration-200 hover:shadow-2xl hover:border-2 hover:border-primary-600 hover:bg-gray-100 hover:scale-[1.025] h-full min-h-[120px] md:min-h-[140px] lg:min-h-[150px] max-h-[180px]">
              <div className="flex flex-row gap-4 items-start">
                <div className="w-24 md:w-28 flex-shrink-0">
                  <div className="aspect-[4/3] w-full overflow-hidden rounded-md bg-white border border-gray-200 flex items-center justify-center">
                    {(rep.image || rep.image_url) ? (
                      <ProductThumb src={(rep.image || rep.image_url) as string} alt={rep.name} />
                    ) : (
                      <div className="flex flex-col items-center text-gray-400">
                        <PhotoIcon className="h-10 w-10" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <h2 className="text-lg font-semibold leading-tight line-clamp-3">
                    <span className="hover:underline">{rep.name}</span>
                    {hasMultipleDimensions ? (
                      <span className="ml-1 text-sm font-medium text-gray-500"> varias dimensiones</span>
                    ) : null}
                  </h2>
                  {(rep.features || []).length > 0 && (
                    <div className="mt-1 text-xs text-gray-500 line-clamp-1">{(rep.features || []).slice(0,4).join(' · ')}</div>
                  )}
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-600 line-clamp-2">{commonDescription || '...'}</p>
            </div>
          </Link>
        )
      })}

            
          </div>
          <div className="mt-6 flex flex-col items-center gap-1">
              <div className="text-sm text-gray-600 text-center md:text-left">
                Mostrando {start + 1}-{Math.min(start + pageSize, filteredGroups.length)} de {filteredGroups.length}
              </div>
              <div className="flex items-center justify-center gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded border px-3 py-1 disabled:opacity-50">Anterior</button>
                <div className="text-sm">Página {page} / {pages}</div>
                <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="rounded border px-3 py-1 disabled:opacity-50">Siguiente</button>
              </div>
            </div>
        </div>
      </div>
    </div>
  )
}
