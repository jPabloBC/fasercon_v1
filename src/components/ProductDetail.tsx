"use client"

import React, { useMemo, useState, useCallback } from 'react'
import { PhotoIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'
import { formatCLP } from '@/lib/format'

type Product = {
  id: string | number
  name: string
  sku?: string | null
  description?: string | null
  image?: string | null
  image_url?: string | null
  images?: string[] | null // NUEVO: array de URLs de imágenes
  features?: string[]
  applications?: string[]
  characteristics?: string[]
  price?: number | null
  unit_size?: string | null
  measurement_unit?: string | null
}

type Props = {
  product: Product
  variants?: Product[]
  onClose?: () => void
}

function saveQuoteItem(item: { 
  id: string | number; 
  name: string; 
  qty: number; 
  price?: number | null;
  description?: string | null;
  image_url?: string | null;
  unit_size?: string | null;
  measurement_unit?: string | null;
  characteristics?: string[];
}) {
  try {
  const raw = localStorage.getItem('fasercon_quote')
  const list: Array<Record<string, unknown>> = raw ? JSON.parse(raw) as Array<Record<string, unknown>> : []
  const idx = list.findIndex((i) => String(i['id'] ?? '') === String(item.id))
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...item, qty: item.qty }
    } else {
      list.push(item)
    }
    localStorage.setItem('fasercon_quote', JSON.stringify(list))
    try {
      // notify other components in this window
      window.dispatchEvent(new CustomEvent('fasercon_quote_updated'))
    } catch {
      // ignore
    }
  } catch (e) {
    console.error('Error saving quote item', e)
  }
}

export default function ProductDetail({ product, variants = [], onClose }: Props) {
  const [qty, setQty] = useState(1)
  const [message, setMessage] = useState<string | null>(null)
  const [currentId, setCurrentId] = useState<string | number>(product.id)
  const group: Product[] = useMemo(() => [product, ...variants], [product, variants])
  const current: Product = useMemo(() => {
    const found = group.find(p => String(p.id) === String(currentId))
    return found || product
  }, [group, currentId, product])

  const formatSize = (p: Product) => {
    const u = p.unit_size ?? ''
    const mu = p.measurement_unit
    if (!u && !mu) return ''
    return `${u}${mu === 'in' ? '"' : mu ? ` ${mu}` : ''}`.trim()
  }
  // Carrusel de imágenes: normalizamos y filtramos entradas vacías/invalidas
  const images: string[] = (() => {
    const collect: unknown[] = []
    if (Array.isArray(current.images) && current.images.length > 0) collect.push(...(current.images as unknown[]))
    if (Array.isArray((current as Record<string, unknown>).image_url)) collect.push(...((current as Record<string, unknown>).image_url as unknown[]))
    else if ((current as Record<string, unknown>).image_url) collect.push((current as Record<string, unknown>).image_url as unknown)
    if ((current as Record<string, unknown>).image) collect.push((current as Record<string, unknown>).image as unknown)

    return collect
      .map((v) => (typeof v === 'string' ? v.trim() : ''))
      .filter((v) => v && v.length > 0) as string[]
  })();
  const [imgIdx, setImgIdx] = useState(0);

  // Dev-time debug: log resolved images to help diagnose empty-src issues
  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      try {
  console.debug('ProductDetail resolved images for', product?.id, images)
      } catch {}
    }
  }, [product?.id, images])

  // --- Características como selectores (para agrupar/filtrar variaciones) ---
  type Pair = { title: string; detail: string }
  const parsePairs = useCallback((arr?: string[] | null): Pair[] => {
    if (!arr || arr.length === 0) return []
    return arr
      .map((s) => String(s).trim())
      .filter(Boolean)
      .map((s) => {
        const i = s.indexOf(':')
        if (i >= 0) return { title: s.slice(0, i).trim(), detail: s.slice(i + 1).trim() }
        return { title: s, detail: '' }
      })
  }, [])
  const getCharMap = useCallback((p: Product): Record<string, string> => {
    const map: Record<string, string> = {}
    for (const { title, detail } of parsePairs(p.characteristics || [])) {
      const key = title.trim().toLowerCase()
      if (!key) continue
      map[key] = detail
    }
    return map
  }, [parsePairs])

  // Recolectar TODAS las claves de características y sus valores (aunque solo tengan 1)
  const allKeyInfo = useMemo(() => {
    const acc = new Map<string, { label: string; values: Set<string> }>()
    for (const p of group) {
      const m = getCharMap(p)
      for (const k of Object.keys(m)) {
        const v = m[k]?.trim() || ''
        const entry = acc.get(k) || { label: k, values: new Set<string>() }
        if (v) entry.values.add(v)
        if (!acc.has(k)) acc.set(k, entry)
      }
    }
    const result = Array.from(acc.entries()).map(([k, { label, values }]) => ({ key: k, label, values: Array.from(values.values()) }))
    result.sort((a, b) => b.values.length - a.values.length)
    result.forEach(r => { r.label = r.label ? r.label.charAt(0).toUpperCase() + r.label.slice(1) : r.label })
    return result
  }, [group, getCharMap])

  // Selección por clave (permitir múltiples selectores a la vez)
  const [selectedMap, setSelectedMap] = useState<Record<string, string>>({})

  // Inicializar/actualizar selección por cada clave (elige el valor del producto si existe; de lo contrario, el primero)
  React.useEffect(() => {
    const next: Record<string, string> = { ...selectedMap }
    const currentMap = getCharMap(product)
    for (const info of allKeyInfo) {
      const k = info.key
      const cur = next[k]
      if (cur && info.values.includes(cur)) continue
      const val = currentMap[k] || info.values[0] || ''
      if (val) next[k] = val
    }
    // solo set si cambia para evitar renders extra
    const changed = Object.keys(next).length !== Object.keys(selectedMap).length || Object.keys(next).some(k => next[k] !== selectedMap[k])
    if (changed) setSelectedMap(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allKeyInfo, product])

  // Filtrar opciones de variación según todas las selecciones activas
  const filteredGroup = useMemo(() => {
    if (!allKeyInfo.length) return group
    return group.filter((p) => {
      const m = getCharMap(p)
      for (const { key } of allKeyInfo) {
        const sel = selectedMap[key]
        if (sel && (m[key]?.trim() || '') !== sel) return false
      }
      return true
    })
  }, [group, allKeyInfo, selectedMap, getCharMap])

  // Ordenar variaciones de menor a mayor por unit_size (soporta fracciones simples como 1/2, 1 1/2)
  const parseSizeNumber = (u?: string | null): number => {
    if (!u) return Number.POSITIVE_INFINITY;
    const s = String(u).trim().replace(',', '.');

    // Handle values with inches explicitly (e.g., 6")
    const inches = s.match(/^([0-9]+)\"$/);
    if (inches) {
      return parseFloat(inches[1]);
    }

    // Mixed number: e.g., "1 1/2"
    const mixed = s.match(/^([0-9]+)\s+([0-9]+)\s*\/\s*([0-9]+)$/);
    if (mixed) {
      const whole = parseFloat(mixed[1]);
      const num = parseFloat(mixed[2]);
      const den = parseFloat(mixed[3]) || 1;
      return whole + (den ? num / den : 0);
    }

    // Simple fraction: e.g., "3/4" or "6/1"
    const frac = s.match(/^([0-9]+)\s*\/\s*([0-9]+)$/);
    if (frac) {
      const num = parseFloat(frac[1]);
      const den = parseFloat(frac[2]) || 1;
      return den === 1 ? num : num / den; // Simplify fractions with denominator 1
    }

    const n = parseFloat(s);
    return isNaN(n) ? Number.POSITIVE_INFINITY : n;
  }

  const sortedFilteredGroup = useMemo(() => {
    const arr = [...filteredGroup]
    arr.sort((a, b) => parseSizeNumber(a.unit_size) - parseSizeNumber(b.unit_size))
    return arr
  }, [filteredGroup])

  // Al cambiar la selección de característica, auto-seleccionar una variación válida
  React.useEffect(() => {
    const ids = sortedFilteredGroup.map(p => String(p.id))
    if (sortedFilteredGroup.length > 0 && !ids.includes(String(currentId))) {
      const next = sortedFilteredGroup[0]
      if (next && next.id != null) {
        setCurrentId(next.id)
      }
    }
  }, [sortedFilteredGroup, currentId])

  // Si el grupo tiene más de un tamaño/medida distinto, consideramos que existen variaciones por tamaño
  // Always show variations if we have at least one product, even if it's unique
  const showVariations = group.length > 0

  // Filtrar dinámicamente características y valores basados en todas las selecciones activas
  const filteredKeyInfo = useMemo(() => {
    return allKeyInfo
      .map((info) => {
        const filteredValues = group
          .filter((p) => {
            const m = getCharMap(p);
            return Object.entries(selectedMap).every(([key, value]) => {
              return key === info.key || m[key]?.trim() === value; // Validar todas las selecciones excepto la actual
            });
          })
          .map((p) => getCharMap(p)[info.key]?.trim())
          .filter(Boolean);

        return {
          ...info,
          values: Array.from(new Set(filteredValues)),
        };
      })
      .filter((info) => info.values.length > 0); // Excluir características sin valores válidos
  }, [allKeyInfo, group, selectedMap, getCharMap]);

  // Actualizar selección al cambiar las opciones disponibles
  React.useEffect(() => {
    const next: Record<string, string> = {};
    for (const info of filteredKeyInfo) {
      const k = info.key;
      const cur = selectedMap[k];
      if (cur && info.values.includes(cur)) {
        next[k] = cur;
      } else {
        const val = info.values[0] || '';
        if (val) next[k] = val;
      }
    }
    const changed =
      Object.keys(next).length !== Object.keys(selectedMap).length ||
      Object.keys(next).some((k) => next[k] !== selectedMap[k]);
    if (changed) setSelectedMap(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredKeyInfo]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-col md:flex-row lg:gap-8 gap-4">
        <div className="w-full md:w-1/2">
          <div className="aspect-[4/3] w-full h-full overflow-hidden rounded-lg flex items-center justify-center border-3 border-gray-200 relative">
            {images.length > 0 ? (
              <>
                <Image
                  src={images[imgIdx]}
                  alt={current.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 400px"
                  className="object-contain bg-white"
                  onError={(e) => {
                    const img = e?.currentTarget as HTMLImageElement | undefined
                    if (img) {
                      img.onerror = null
                      // Let the browser fall back; next/image doesn't support setting src directly on the underlying img reliably here
                    }
                  }}
                />
                {/* Move the caption to the left side of the container */}
                <p className="absolute left-0.5 [writing-mode:vertical-rl] rotate-180 text-[10px] text-gray-300 text-center whitespace-normal"
                  style={{ overflow: 'visible', wordBreak: 'break-word', maxHeight: '100%', pointerEvents: 'none', lineHeight: '0.8' }}
                >
                  Imágen referencial de internet, puede variar respecto al producto en stock.
                </p>
                {images.length > 1 && (
                  <>
                    <button
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1 shadow hover:bg-white"
                      onClick={() => setImgIdx((i) => (i === 0 ? images.length - 1 : i - 1))}
                      aria-label="Imagen anterior"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-gray-700">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                      </svg>
                    </button>
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1 shadow hover:bg-white"
                      onClick={() => setImgIdx((i) => (i === images.length - 1 ? 0 : i + 1))}
                      aria-label="Imagen siguiente"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-gray-700">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                      {images.map((_, idx) => (
                        <button
                          key={idx}
                          className={`w-2 h-2 rounded-full ${imgIdx === idx ? 'bg-blue-600' : 'bg-gray-300'} border border-white`}
                          onClick={() => setImgIdx(idx)}
                          aria-label={`Ver imagen ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <div className="flex flex-col items-center text-gray-400">
                  <PhotoIcon className="h-16 w-16" />
                  <div className="text-sm">no image</div>
                </div>
                <div className="absolute top-0 right-2 h-full flex items-center pointer-events-none">
                  <p
                    className="[writing-mode:vertical-rl] rotate-180 text-[10px] text-gray-300 text-center whitespace-normal -mr-1"
                    style={{ overflow: 'visible', wordBreak: 'break-word', maxHeight: '100%', pointerEvents: 'none', lineHeight: '0.8' }}
                  >
                    Imágen referencial de internet, puede variar respecto al producto en stock.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="w-full md:w-1/2 flex flex-col">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold">
                {current.name}
                {(current.unit_size || current.measurement_unit) && (
                  <span className="text-gray-600">
                    {' '}
                    {`${current.unit_size ?? ''}${current.measurement_unit === 'in' ? '"' : current.measurement_unit ? `${current.measurement_unit}` : ''}`.trim()}
                  </span>
                )}
              </h1>
              {showVariations && sortedFilteredGroup.length > 0 && (
                <div className="relative">
                  {current.sku ? (
                    <div className="text-base text-gray-300 mb-1">SKU: {current.sku}</div>
                  ) : null}

                  {/* Selectores de característica movidos al sector de "Características" */}

                  <label className="block text-base text-gray-400 mb-1">Variaciones</label>
                  <MenuDropdown
                    options={sortedFilteredGroup.map(v => ({ id: v.id, label: formatSize(v) || 'Variante' }))}
                    currentId={currentId}
                    onSelect={id => {
                      const selected = sortedFilteredGroup.find(v => String(v.id) === String(id)) || current;
                      setCurrentId(selected.id)
                    }}
                  />
                </div>
              )}
            </div>
            {onClose ? (
              <button onClick={onClose} className="text-sm text-gray-500">Cerrar</button>
            ) : null}
          </div>
          <div className="mt-3 text-sm text-gray-700">{current.description || 'Sin descripción'}</div>

          <div className="mt-4">
            <h4 className="font-semibold">Características</h4>
            <ul className="mt-2 list-disc pl-5 text-gray-700">
              {filteredKeyInfo.length > 0 ? (
                filteredKeyInfo.map(({ key, label, values }) => {
                  const sorted = [...values].sort((a,b)=>a.localeCompare(b,'es'))
                  const currentSel = selectedMap[key]
                  return (
                    <li key={key} className="mb-1">
                      <span className="font-bold">{label}</span>:
                      <div className="mt-1 flex flex-wrap gap-2">
                        {sorted.map((val) => (
                          <button
                            key={val || '—'}
                            type="button"
                            onClick={() => setSelectedMap(prev => ({ ...prev, [key]: val }))}
                            className={`px-3 py-1 rounded text-sm border ${currentSel === val ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                            title={val}
                          >
                            {val || '—'}
                          </button>
                        ))}
                        {sorted.length === 0 && (
                          <span className="text-gray-500">—</span>
                        )}
                      </div>
                    </li>
                  )
                })
              ) : (
                <li>...</li>
              )}
            </ul>
          </div>

            <div className="mt-4 mt-auto flex flex-col sm:flex-row items-center gap-4">
            <div className="text-lg font-semibold">{current.price != null ? `${formatCLP(current.price)} CLP` : ''}</div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-gray-400 bg-white text-xl font-bold transition-all hover:bg-red-50 hover:border-red-600 focus:outline-none"
              >
                -
              </button>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                min={1}
                value={qty}
                onChange={e => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setQty(Math.max(1, Number(val)));
                }}
                className="w-16 h-10 text-center text-xl font-bold text-gray-900 border-2 border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-red-400 transition-all appearance-none"
              />
              <button
                onClick={() => setQty((q) => q + 1)}
                className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-gray-400 bg-white text-xl font-bold transition-all hover:bg-red-50 hover:border-red-600 focus:outline-none"
              >
                +
              </button>
            </div>
            <button
              onClick={() => {
                saveQuoteItem({ 
                  id: current.id, 
                  name: current.name, 
                  qty, 
                  price: current.price,
                  description: current.description,
                  image_url: current.image_url || current.image,
                  unit_size: current.unit_size,
                  measurement_unit: current.measurement_unit,
                  characteristics: current.characteristics
                })
                setMessage(`${qty} × ${current.name} agregado${qty > 1 ? 's' : ''} al cotizador`)
                // Mostrar mensaje un poco más tiempo (4.5s) para que el usuario lo vea
                setTimeout(() => setMessage(null), 4500)
              }}
              className="w-full sm:w-auto sm:ml-auto rounded-md bg-red-600 px-6 py-2 text-base text-white font-bold shadow-md hover:bg-red-700 transition-all"
            >
              Agregar a cotización
            </button>
          </div>
        </div>
      </div>
      {/* ALERTA DE CONFIRMACIÓN DE COTIZACIÓN FLOTANTE */}
      {message ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed left-1/2 top-27 z-50 -translate-x-1/2 rounded-sm bg-red/70 px-6 py-3 text-base shadow-lg animate-fade-in-out border-1 border-red-500"
          style={{ minWidth: 240, color: 'rgba(55,65,81,0.7)' }}
        >
          {message}
        </div>
      ) : null}
      <style jsx>{`
        @keyframes fade-in-out {
          0% { opacity: 0; transform: translateY(-8px); }
          10% { opacity: 1; transform: translateY(0); }
          90% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-8px); }
        }
        .animate-fade-in-out {
          animation: fade-in-out 4.5s ease forwards;
        }
      `}</style>
    </div>
  )
}

// Dropdown component
function MenuDropdown({ options, currentId, onSelect }: { options: { id: string | number, label: string }[], currentId: string | number, onSelect: (id: string | number) => void }) {
  const [open, setOpen] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const current = options.find(o => String(o.id) === String(currentId));

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="max-w-full w-auto rounded border border-red-600 px-2 py-1 text-sm bg-red-600 text-white font-bold flex justify-between items-center transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-300"
        onClick={() => setOpen(o => !o)}
        type="button"
      >
        <span className="flex-1 text-right truncate font-bold">{current?.label}</span>
        <svg className={`w-4 h-4 ml-2 text-white transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <ul className="absolute z-10 w-auto max-w-full mt-1 bg-white border border-red-200 rounded-lg shadow-xl animate-fade-in">
          {options.map((o, idx) => (
            <li key={o.id}>
              <button
                className={`w-full px-2 py-2 text-sm text-right font-bold flex justify-end items-center gap-2 transition-colors ${String(o.id) === String(currentId) ? 'text-red-600 bg-red-100 rounded' : 'text-red-600 hover:bg-[#c62828] hover:text-white'}`}
                onClick={() => { setOpen(false); onSelect(o.id); }}
                type="button"
              >
                {String(o.id) === String(currentId) && (
                  <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                )}
                {o.label}
              </button>
              {idx < options.length - 1 && <div className="border-t border-red-100 mx-2" />}
            </li>
          ))}
        </ul>
      )}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.18s ease;
        }
      `}</style>
    </div>
  );
}

<style jsx global>{`
  input[type=number]::-webkit-outer-spin-button,
  input[type=number]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type=number] {
    -moz-appearance: textfield;
  }
`}</style>
