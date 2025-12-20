import React from 'react'
import Image from 'next/image'
import { Pair, Product, SupplierRef, NewProduct } from '@/lib/types'

type Props = {
    alert?: { type: 'success' | 'error'; message: string } | null
  matchingProducts: Product[]
  showMatches: boolean
  selectedExistingImages: string[]
  setSelectedExistingImages: React.Dispatch<React.SetStateAction<string[]>>
  newFiles: File[]
  setNewFiles: React.Dispatch<React.SetStateAction<File[]>>
  newProduct: NewProduct
  setNewProduct: React.Dispatch<React.SetStateAction<NewProduct>>
  unitSizeInputs: string[]
  setUnitSizeInputs: React.Dispatch<React.SetStateAction<string[]>>
  descriptionInputs: string[]
  setDescriptionInputs: React.Dispatch<React.SetStateAction<string[]>>
  charRows: Pair[]
  setCharRows: React.Dispatch<React.SetStateAction<Pair[]>>
  appRows: Pair[]
  setAppRows: React.Dispatch<React.SetStateAction<Pair[]>>
  supplierSelected: SupplierRef | null
  setSupplierSelected: React.Dispatch<React.SetStateAction<SupplierRef | null>>
  allSuppliers: SupplierRef[]
  showSupplierDetails: boolean
  setShowSupplierDetails: React.Dispatch<React.SetStateAction<boolean>>
  supplierQuery: string
  setSupplierQuery: React.Dispatch<React.SetStateAction<string>>
  handleSelectProduct: (p: Product) => void
  unitLabels: Record<string, string>
  newProductPriceDisplay: string
  setNewProductPriceDisplay: React.Dispatch<React.SetStateAction<string>>
  formatCurrencyInput: (v?: number | null) => string
  combinePairsToStrings: (pairs: Pair[]) => string[]
  convertFractionToDecimal: (v: string) => number | string
  setAlert: React.Dispatch<React.SetStateAction<{ type: 'success' | 'error'; message: string } | null>>
  setSearchQuery?: (q: string) => void
  creating: boolean
  setCreating: React.Dispatch<React.SetStateAction<boolean>>
  setShowCreateForm: React.Dispatch<React.SetStateAction<boolean>>
  setShowMatches: React.Dispatch<React.SetStateAction<boolean>>
  PhotoIcon: React.ComponentType<React.SVGProps<SVGSVGElement> & { className?: string }>
  fetchProducts?: () => Promise<unknown>
  onProductCreated?: (product: Product) => void
}

export default function ProductCreateForm(props: Props) {
    // No local alert state — parent `props.alert` and `props.setAlert` are used instead.
  const {
    matchingProducts,
    showMatches,
    selectedExistingImages,
    setSelectedExistingImages,
    newFiles,
    setNewFiles,
    newProduct,
    setNewProduct,
    unitSizeInputs,
    setUnitSizeInputs,
    descriptionInputs,
    setDescriptionInputs,
    charRows,
    setCharRows,
    appRows,
    setAppRows,
    supplierSelected,
    setSupplierSelected,
    allSuppliers,
    showSupplierDetails,
    setShowSupplierDetails,
    supplierQuery,
    setSupplierQuery,
    handleSelectProduct,
    unitLabels,
    newProductPriceDisplay,
    setNewProductPriceDisplay,
    formatCurrencyInput,
    combinePairsToStrings,
    convertFractionToDecimal,
    setAlert,
    setSearchQuery,
    creating,
    setCreating,
    setShowMatches,
    PhotoIcon,
  } = props
  const [showRawMatches, setShowRawMatches] = React.useState(false)
  // const [createdProducts, setCreatedProducts] = React.useState<Product[]>([]) // No usadas
  // const [showAddToQuoteModal, setShowAddToQuoteModal] = React.useState(false) // No usadas

  // DEBUG: Log para verificar props
  React.useEffect(() => {
    console.log('[ProductCreateForm] matchingProducts:', matchingProducts)
    console.log('[ProductCreateForm] showMatches:', showMatches)
  }, [matchingProducts, showMatches])

  return (
    <div className="bg-gray-50 shadow rounded p-4 mb-2 -mt-1 relative">
      {/* Centered Alert Overlay - fixed to viewport */}
      {props.alert && props.alert.message && (
        <div style={{position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none'}}>
          <div
            className={`px-8 py-5 rounded-xl shadow-2xl text-center text-xl font-semibold transition-all duration-300 pointer-events-auto ${props.alert.type === 'success' ? 'bg-green-600/90 text-white' : 'bg-red-600/90 text-white'}`}
            style={{backdropFilter: 'blur(4px)', minWidth: '320px', maxWidth: '90vw', opacity: 0.98, boxShadow: '0 8px 32px rgba(0,0,0,0.25)'}}>
            {props.alert.message}
          </div>
        </div>
      )}
      <h3 className="text-lg font-semibold mb-3 text-gray-600">Crear Material - Servicio</h3>
      {showMatches && matchingProducts.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold text-sm">Imágenes de productos existentes con el mismo nombre:</div>
            <div>
              <button type="button" onClick={() => setShowRawMatches(v => !v)} className="text-xs px-2 py-1 bg-gray-100 rounded">{showRawMatches ? 'Ocultar raw' : 'Mostrar raw'}</button>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {matchingProducts.map((mp: Product) => {
              const imgs = Array.isArray(mp.image_url) ? mp.image_url : mp.image_url ? [mp.image_url] : []
              return imgs.map((url: string, idx: number) => (
                <button
                  key={url + idx}
                  type="button"
                  className={`border rounded w-16 h-16 p-1 flex items-center justify-center bg-white ${selectedExistingImages.includes(url) ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => setSelectedExistingImages((prev: string[]) => prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url])}
                >
                  <div className="relative w-full h-full">
                    <Image src={url} alt={`img-${idx}`} fill className="object-contain" sizes="64px" />
                  </div>
                </button>
              ))
            })}
          </div>
          {showRawMatches && (
            <pre className="whitespace-pre-wrap text-xs bg-gray-100 p-2 rounded mt-2 overflow-auto max-h-48">{JSON.stringify(matchingProducts, null, 2)}</pre>
          )}
          <div className="text-xs mt-1 text-gray-500">Haz clic en las imágenes para seleccionarlas y usarlas en el nuevo producto.</div>
        </div>
      )}

      {(selectedExistingImages.length > 0 || newFiles.length > 0) && (
        <div className="mb-4">
          <div className="font-semibold mb-2 text-sm">Imágenes que se subirán:</div>
          <div className="flex gap-2 flex-wrap">
            {selectedExistingImages.map((url: string, idx: number) => (
              <div key={url + idx} className="relative border rounded w-16 h-16 p-1 flex items-center justify-center bg-white">
                <div className="relative w-full h-full">
                  <Image src={url} alt={`img-${idx}`} fill className="object-contain" sizes="64px" />
                </div>
                <button
                  type="button"
                  aria-label="Omitir imagen seleccionada"
                  onClick={() => setSelectedExistingImages((prev: string[]) => prev.filter((u) => u !== url))}
                  className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            ))}
            {newFiles.map((f: File, idx: number) => (
              <div key={`nf-${idx}`} className="relative border rounded w-16 h-16 p-1 flex items-center justify-center bg-white">
                <div className="relative w-full h-full">
                  <Image src={URL.createObjectURL(f)} alt={`preview-${idx}`} fill className="object-contain" sizes="64px" />
                </div>
                <button
                  type="button"
                  aria-label="Omitir imagen subida"
                  onClick={() => setNewFiles((prev: File[]) => prev.filter((_, i) => i !== idx))}
                  className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setSelectedExistingImages([]); setNewFiles([]) }}
              className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded"
            >
              Omitir todas
            </button>
          </div>
          <div className="text-xs mt-1 text-gray-500">Estas imágenes serán guardadas en el nuevo producto.</div>
        </div>
      )}

      {/* Nombre: full width at top, others below */}
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1 text-gray-800">Nombre</label>
        <input
          autoComplete="off"
          value={newProduct.name}
          onFocus={() => matchingProducts.length && setShowMatches(true)}
          onBlur={() => setTimeout(() => setShowMatches(false), 150)}
          onChange={(e) => {
            const value = e.target.value
            setNewProduct((prev: NewProduct) => ({ ...prev, name: value }))
          }}
          className="border px-3 py-2 rounded h-10 w-full bg-white text-gray-800"
        />
        {(() => {
          console.log('[ProductCreateForm RENDER] showMatches:', showMatches, 'matchingProducts.length:', matchingProducts.length)
          return null
        })()}
        {showMatches && matchingProducts.length > 0 && (
          <div className="absolute left-0 right-0 mt-1 z-50 max-h-64 overflow-y-auto rounded border border-gray-200 bg-white shadow-lg">
            {matchingProducts.map((m: Product) => (
              <button
                key={m.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelectProduct(m)}
                className="w-full text-left px-3 py-2 text-sm text-gray-800 hover:bg-gray-100 focus:bg-gray-100 flex items-start gap-3"
              >
                {/* thumbnail */}
                {(() => {
                  const imgs = Array.isArray(m.image_url) ? m.image_url : m.image_url ? [m.image_url] : []
                  const thumb = imgs && imgs.length ? imgs[0] : null
                  return thumb ? (
                    <div className="w-12 h-12 relative flex-shrink-0 rounded bg-gray-50 border overflow-hidden">
                      <Image src={thumb} alt={m.name || 'thumb'} fill className="object-contain" sizes="48px" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 flex items-center justify-center text-gray-400 bg-gray-50 border rounded">(vacío)</div>
                  )
                })()}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-gray-900 truncate">{m.name}</div>
                    <div className="text-xs text-gray-600 ml-2">{m.sku ? String(m.sku) : ''}</div>
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {m.manufacturer ? `${m.manufacturer}` : ''}
                    {typeof m.price === 'number' ? ` · ${formatCurrencyInput(m.price)}` : ''}
                    {m.unit_size ? ` · ${m.unit_size}${m.measurement_unit ? ` ${unitLabels[m.measurement_unit] || m.measurement_unit}` : ''}` : ''}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                    <span className="font-semibold">Descripción:</span> {m.description ? m.description : <span className="text-gray-400">(vacío)</span>}
                  </div>
                  {/* characteristics (normalize string/array) */}
                  {(() => {
                    const raw = m.characteristics
                    const arr = Array.isArray(raw) ? raw.map(String) : (raw ? String(raw).split(',').map(s => s.trim()).filter(Boolean) : [])
                    return (
                      <div className="mt-2 flex gap-1 flex-wrap">
                        <span className="font-semibold text-[10px]">Características:</span>
                        {arr.length > 0
                          ? arr.slice(0, 4).map((c, i) => (
                              <span key={i} className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-700 rounded">{c}</span>
                            ))
                          : <span className="text-gray-400 text-[10px]">(vacío)</span>}
                        {arr.length > 4 && <span className="text-[10px] text-gray-500">+{arr.length - 4}</span>}
                      </div>
                    )
                  })()}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Other inputs below Nombre, keep original grid for rest */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">

        <div>
          <label className="block text-sm font-medium mb-1">SKU</label>
          <input value={newProduct.sku || ''} disabled placeholder="Se generará automáticamente" className="border px-3 py-2 rounded h-10 w-full bg-white text-gray-800" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-800">Fabricante (manufacturer)</label>
          <input value={newProduct.manufacturer || ''} onChange={(e) => setNewProduct((prev: NewProduct) => ({ ...prev, manufacturer: e.target.value }))} className="border px-3 py-2 rounded h-10 w-full bg-white text-gray-800" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-800">Proveedor</label>
          <div>
            <select value={supplierSelected ? supplierSelected.id : 'NA'} onChange={(e) => {
              const v = e.target.value
              if (v === 'NA') { setSupplierSelected(null); setSupplierQuery('') }
              else {
                const found = allSuppliers.find((s: SupplierRef) => String(s.id) === String(v))
                if (found) { setSupplierSelected(found); setSupplierQuery('') }
              }
            }} className="border px-3 py-2 rounded h-10 w-full bg-white text-gray-800">
              <option value="NA">N/A</option>
              {allSuppliers.map((s: SupplierRef) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <div className="mt-2 text-xs text-gray-500">O busca arriba para crear un nuevo proveedor</div>
          </div>
          <div className="mt-2 text-sm flex items-center gap-3">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" className="form-checkbox" checked={showSupplierDetails} onChange={() => setShowSupplierDetails((v: boolean) => !v)} />
              <span className="text-sm text-gray-600">Editar datos proveedor (crear/actualizar)</span>
            </label>
            {supplierSelected && (
              <button type="button" onClick={() => { setSupplierSelected(null); setSupplierQuery('') }} className="text-sm text-blue-600">Quitar selección</button>
            )}
          </div>
          {showSupplierDetails && (
            <div className="mt-2 grid grid-cols-1 gap-2">
              <input placeholder="Email" value={newProduct.supplier_email || ''} onChange={(e) => setNewProduct((prev: NewProduct) => ({ ...prev, supplier_email: e.target.value }))} className="border px-3 py-2 rounded h-10 w-full bg-white text-gray-800" />
              <input placeholder="Dirección" value={newProduct.supplier_address || ''} onChange={(e) => setNewProduct((prev: NewProduct) => ({ ...prev, supplier_address: e.target.value }))} className="border px-3 py-2 rounded h-10 w-full bg-white text-gray-800" />
              <input placeholder="País" value={newProduct.supplier_country || ''} onChange={(e) => setNewProduct((prev: NewProduct) => ({ ...prev, supplier_country: e.target.value }))} className="border px-3 py-2 rounded h-10 w-full bg-white text-gray-800" />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-800">Tipo de medida</label>
          <select value={newProduct.measurement_type || ''} onChange={(e) => setNewProduct((prev: NewProduct) => ({ ...prev, measurement_type: e.target.value }))} className="border px-3 py-2 rounded h-10 w-full bg-white text-gray-800">
            <option value="" disabled hidden>Seleccionar</option>
            <option value="piece">Pieza / unidad</option>
            <option value="weight">Peso</option>
            <option value="volume">Volumen</option>
            <option value="length">Longitud</option>
            <option value="area">Área</option>
            <option value="package">Paquete / caja</option>
            <option value="other">Otro</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-800">Tamaño de unidad (variantes)</label>
          <div className="flex flex-col gap-2">
            {unitSizeInputs.map((val: string, idx: number) => (
              <div key={`usize-${idx}`} className="flex items-center gap-2">
                <input
                  value={val}
                  onChange={(e) => {
                    const v = e.target.value
                    setUnitSizeInputs((prev: string[]) => {
                      const next = [...prev]
                      next[idx] = v
                      return next
                    })
                    setDescriptionInputs((prev: string[]) => {
                      const next = [...prev]
                      while (next.length < unitSizeInputs.length) next.push('')
                      return next
                    })
                  }}
                  placeholder="ej: 5 o 1 1/8"
                  className="border px-3 py-2 rounded h-10 w-full bg-white text-gray-800"
                />
                {unitSizeInputs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setUnitSizeInputs((prev: string[]) => prev.filter((_, i) => i !== idx))
                      setDescriptionInputs((prev: string[]) => prev.filter((_, i) => i !== idx))
                    }}
                    className="px-2 py-1 text-sm bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                  >
                    Quitar
                  </button>
                )}
              </div>
            ))}
            <div>
              <button
                type="button"
                onClick={() => {
                  const last = unitSizeInputs[unitSizeInputs.length - 1]
                  if (unitSizeInputs.length === 0 || (last && last.trim().length > 0)) {
                    setUnitSizeInputs((prev: string[]) => [...prev, ''])
                    setDescriptionInputs((prev: string[]) => [...prev, ''])
                  }
                }}
                className="text-sm px-2 py-1 bg-red-50 text-red-600 rounded"
              >
                Añadir tamaño
              </button>
              <div className="text-xs text-gray-500 mt-1">Se creará un producto por cada tamaño de la lista.</div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-800">Unidad de medida</label>
          <select value={newProduct.measurement_unit || ''} onChange={(e) => setNewProduct((prev: NewProduct) => ({ ...prev, measurement_unit: e.target.value }))} className="border px-3 py-2 rounded h-10 w-full bg-white text-gray-800">
            <option value="" disabled hidden>Seleccionar</option>
            <option value="unit">unidad / pieza (unidad)</option>
            <option value="in">pulgadas (in)</option>
            <option value="ft">pies (ft)</option>
            <option value="m">metros (m)</option>
            <option value="cm">centímetros (cm)</option>
            <option value="mm">milímetros (mm)</option>
            <option value="m2">m² (m2)</option>
            <option value="m3">m³ (m3)</option>
            <option value="kg">kilogramo (kg)</option>
            <option value="g">gramo (g)</option>
            <option value="ton">tonelada (t)</option>
            <option value="l">litro (l)</option>
            <option value="box">caja (caja)</option>
            <option value="pack">paquete (paquete)</option>
            <option value="roll">rollo (rollo)</option>
            <option value="other">Otro</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-800">Precio</label>
          <input
            type="text"
            inputMode="numeric"
            value={(() => {
              const val = newProductPriceDisplay || formatCurrencyInput(newProduct.price ?? null);
              // Remove any leading $ and spaces
              const clean = val.replace(/^\$\s*/, '');
              return `$ ${clean || '0'}`;
            })()}
            onChange={(e) => {
              const raw = e.target.value.replace(/^\$\s*/, '');
              const digits = raw.replace(/\D/g, '');
              const num = digits ? Number(digits) : undefined;
              setNewProduct((prev: NewProduct) => ({ ...prev, price: num }));
              setNewProductPriceDisplay(num != null ? formatCurrencyInput(num) : '');
            }}
            className="border px-3 py-2 rounded h-10 w-full bg-white text-gray-800"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-800">Orden</label>
          <input type="number" value={newProduct.order ?? 0} onChange={(e) => setNewProduct((prev: NewProduct) => ({ ...prev, order: Number(e.target.value) }))} className="border px-3 py-2 rounded h-10 w-full bg-white text-gray-800" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-800">Stock</label>
          <input type="number" value={newProduct.stock ?? ''} onChange={(e) => setNewProduct((prev: NewProduct) => ({ ...prev, stock: Number(e.target.value) }))} className="border px-3 py-2 rounded h-10 w-full bg-white text-gray-800" />
        </div>

        <div className="md:col-span-2 lg:col-span-2">
          <label className="block text-sm font-medium mb-1 text-gray-800">Características</label>
          <div className="flex flex-col gap-2">
            {(charRows.length === 0 ? [{} as Pair] : charRows).map((row: Pair, idx: number) => (
              <div key={`char-${idx}`} className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start">
                <input
                  placeholder="Título (se mostrará en negrita)"
                  value={row.title || ''}
                  onChange={(e) => {
                    setCharRows((prev: Pair[]) => {
                      const base = prev.length === 0 ? [{} as Pair] : [...prev]
                      const next = [...base]
                      next[idx] = { ...(next[idx] || { title: '', detail: '' }), title: e.target.value }
                      return next
                    })
                    setNewProduct((prev: NewProduct) => ({ ...prev, characteristics: combinePairsToStrings((charRows.length === 0 ? [{ title: e.target.value, detail: '' }] : charRows.map((r: Pair, i: number) => i === idx ? { ...r, title: e.target.value } : r))) }))
                  }}
                  className="border px-3 py-2 rounded h-10 w-full bg-white text-gray-800"
                />
                <input
                  placeholder="Detalle (opcional)"
                  value={row.detail || ''}
                  onChange={(e) => {
                    setCharRows((prev: Pair[]) => {
                      const base = prev.length === 0 ? [{} as Pair] : [...prev]
                      const next = [...base]
                      next[idx] = { ...(next[idx] || { title: '', detail: '' }), detail: e.target.value }
                      return next
                    })
                    setNewProduct((prev: NewProduct) => ({ ...prev, characteristics: combinePairsToStrings((charRows.length === 0 ? [{ title: (row.title || ''), detail: e.target.value }] : charRows.map((r: Pair, i: number) => i === idx ? { ...r, detail: e.target.value } : r))) }))
                  }}
                  className="border px-3 py-2 rounded h-10 w-full bg-white text-gray-800"
                />
                {(charRows.length > 0) && (
                  <div className="md:col-span-2 lg:col-span-2 flex justify-end">
                    <button type="button" onClick={() => {
                      setCharRows((prev: Pair[]) => prev.filter((_, i) => i !== idx))
                      setNewProduct((prev: NewProduct) => ({ ...prev, characteristics: combinePairsToStrings(charRows.filter((_, i) => i !== idx)) }))
                    }} className="text-xs px-2 py-1 bg-gray-200 rounded">Quitar</button>
                  </div>
                )}
              </div>
            ))}
            <div>
              <button type="button" onClick={() => { setCharRows((prev: Pair[]) => [...prev, { title: '', detail: '' }]) }} className="text-sm px-2 py-1 bg-red-50 text-red-600 rounded">Añadir característica</button>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 lg:col-span-2">
          <label className="block text-sm font-medium mb-1 text-gray-800">Aplicaciones</label>
          <div className="flex flex-col gap-2">
            {(appRows.length === 0 ? [{} as Pair] : appRows).map((row: Pair, idx: number) => (
              <div key={`app-${idx}`} className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start">
                <input
                  placeholder="Título (se mostrará en negrita)"
                  value={row.title || ''}
                  onChange={(e) => {
                    setAppRows((prev: Pair[]) => {
                      const base = prev.length === 0 ? [{} as Pair] : [...prev]
                      const next = [...base]
                      next[idx] = { ...(next[idx] || { title: '', detail: '' }), title: e.target.value }
                      return next
                    })
                    setNewProduct((prev: NewProduct) => ({ ...prev, applications: combinePairsToStrings((appRows.length === 0 ? [{ title: e.target.value, detail: '' }] : appRows.map((r: Pair, i: number) => i === idx ? { ...r, title: e.target.value } : r))) }))
                  }}
                  className="border px-3 py-2 rounded h-10 w-full bg-white text-gray-800"
                />
                <input
                  placeholder="Detalle (opcional)"
                  value={row.detail || ''}
                  onChange={(e) => {
                    setAppRows((prev: Pair[]) => {
                      const base = prev.length === 0 ? [{} as Pair] : [...prev]
                      const next = [...base]
                      next[idx] = { ...(next[idx] || { title: '', detail: '' }), detail: e.target.value }
                      return next
                    })
                    setNewProduct((prev: NewProduct) => ({ ...prev, applications: combinePairsToStrings((appRows.length === 0 ? [{ title: (row.title || ''), detail: e.target.value }] : appRows.map((r: Pair, i: number) => i === idx ? { ...r, detail: e.target.value } : r))) }))
                  }}
                  className="border px-3 py-2 rounded h-10 w-full bg-white text-gray-800"
                />
                {(appRows.length > 0) && (
                  <div className="md:col-span-2 lg:col-span-2 flex justify-end">
                    <button type="button" onClick={() => {
                      setAppRows((prev: Pair[]) => prev.filter((_, i) => i !== idx))
                      setNewProduct((prev: NewProduct) => ({ ...prev, applications: combinePairsToStrings(appRows.filter((_, i) => i !== idx)) }))
                    }} className="text-xs px-2 py-1 bg-gray-200 rounded">Quitar</button>
                  </div>
                )}
              </div>
            ))}
            <div>
              <button type="button" onClick={() => { setAppRows((prev: Pair[]) => [...prev, { title: '', detail: '' }]) }} className="text-sm px-2 py-1 bg-red-50 text-red-600 rounded">Añadir aplicación</button>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 lg:col-span-2">
          <label className="block text-sm font-medium mb-1 text-gray-800">Descripción por variante</label>
          <div className="flex flex-col gap-2">
            {descriptionInputs.map((val: string, idx: number) => (
              <textarea
                key={`desc-${idx}`}
                value={val}
                onChange={(e) => {
                  const v = e.target.value
                  setDescriptionInputs((prev: string[]) => {
                    const next = [...prev]
                    next[idx] = v
                    return next
                  })
                }}
                placeholder={`Descripción para variante ${idx + 1}`}
                className="border px-3 py-2 rounded h-10 w-full bg-white text-gray-800"
                rows={2}
              />
            ))}
            {descriptionInputs.length === 0 && (
              <div className="text-xs text-gray-500">Se usará la descripción del producto si no se especifica.</div>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1">Si no llenas una descripción, se usará vacía para esa variante.</div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-800">Imágenes</label>
          <div className="mt-1 flex flex-col gap-2">
            <div className="flex gap-2 flex-wrap">
              {newFiles.length === 0 && (
                <div className="w-20 h-20 flex flex-col items-center justify-center text-gray-500 border rounded bg-white">
                  <PhotoIcon className="w-8 h-8 mb-1 text-gray-300" />
                  <div className="text-[11px]">sin imágenes</div>
                </div>
              )}
              {newFiles.map((file: File, idx: number) => (
                <div key={`file-${idx}`} className="relative border rounded w-16 h-16 p-1 flex items-center justify-center bg-white">
                  <div className="relative w-full h-full">
                    <Image src={URL.createObjectURL(file)} alt={`file-${idx}`} fill className="object-contain" sizes="64px" />
                  </div>
                  <button type="button" onClick={() => setNewFiles((prev: File[]) => prev.filter((_, i) => i !== idx))} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center">×</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
            <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Imágenes</label>
            </div>
            <div
            onDrop={(e: React.DragEvent<HTMLDivElement>) => {
                e.preventDefault()
                const dropped = Array.from(e.dataTransfer.files || [])
                if (dropped.length) setNewFiles((prev: File[]) => [...prev, ...dropped])
            }}
            onDragOver={(e: React.DragEvent<HTMLDivElement>) => e.preventDefault()}
            className="w-full h-20 cursor-pointer rounded border-2 border-dashed border-gray-300 bg-white flex items-center justify-center hover:border-gray-400 transition-colors"
            >
            <label className="flex items-center justify-center gap-3 w-full h-full text-center">
                <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                    const add = Array.from(e.target.files || [])
                    if (add.length) setNewFiles((prev: File[]) => [...prev, ...add])
                    e.currentTarget.value = ''
                }}
                />
                <div className="flex items-center gap-2 px-1 overflow-hidden whitespace-nowrap">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 shrink-0">
                    <PhotoIcon className="w-5 h-5 text-gray-500" />
                </div>
                <div className="flex flex-col min-w-0">
                    <div className="text-xs font-medium text-gray-800 truncate">Arrastra y suelta</div>
                    <div className="text-[10px] text-gray-500 truncate">o haz clic para seleccionar</div>
                </div>
                </div>
            </label>
            </div>
            <div className="flex-shrink-0">
            {newFiles.length > 0 ? (
                <button type="button" onClick={() => setNewFiles([])} className="text-sm px-3 py-2 bg-red-50 text-red-600 rounded">Limpiar</button>
            ) : null}
            </div>
        </div>
      </div>

      <div className="mt-3 flex justify-end items-center gap-2">
        <button
          disabled={creating}
          onClick={async () => {
            let imageList: string[] | undefined = selectedExistingImages.length > 0 ? [...selectedExistingImages] : undefined;
            if (newFiles.length > 0) {
              for (const file of newFiles) {
                const fd = new FormData();
                const filename = `${file.name}`;
                fd.append('file', file);
                fd.append('filename', filename);
                const res = await fetch('/api/products/upload', { method: 'POST', body: fd });
                const json = await res.json();
                const persisted: string | undefined = json.publicUrl || json.url;
                if (persisted) imageList = imageList ? [...imageList, persisted] : [persisted];
              }
            }

            const unitTokens = unitSizeInputs.map((s: string) => s.trim()).filter(Boolean);
            const descTokens = descriptionInputs;

            const base: Record<string, unknown> = {
              name: newProduct.name,
              image: imageList && imageList.length === 1 ? imageList[0] : imageList,
              price: newProduct.price,
              visible: false,
              order: newProduct.order,
              features: newProduct.features || [],
              applications: combinePairsToStrings(appRows),
              characteristics: combinePairsToStrings(charRows),
              stock: newProduct.stock ?? null,
              measurement_type: newProduct.measurement_type || null,
              measurement_unit: newProduct.measurement_unit || null,
              measurement_type_other: newProduct.measurement_type_other || null,
              measurement_unit_other: newProduct.measurement_unit_other || null,
              manufacturer: newProduct.manufacturer || null,
            };

            let supplierPayload: unknown = undefined;
            if (supplierSelected) {
              supplierPayload = { id: supplierSelected.id, name: supplierSelected.name };
            } else if (showSupplierDetails && (newProduct.supplier_email || newProduct.supplier_address || newProduct.supplier_country || supplierQuery)) {
              supplierPayload = {
                name: supplierQuery || newProduct.supplier || newProduct.manufacturer || 'Proveedor',
                email: newProduct.supplier_email || null,
                address: newProduct.supplier_address || null,
                country: newProduct.supplier_country || null,
              };
            } else {
              const typed = supplierQuery || (newProduct.supplier as string) || '';
              if (typed) supplierPayload = typed;
            }

            setCreating(true);
            try {
              const variants = unitTokens.length > 0 ? unitTokens : [''];
              let created = 0;
              const errors: string[] = [];

              for (let i = 0; i < variants.length; i++) {
                const ut = variants[i];
                let decimal: number | null = null;
                if (ut) {
                  const conv = convertFractionToDecimal(ut);
                  if (typeof conv === 'number' && !isNaN(conv)) decimal = conv;
                  else {
                    errors.push(`Tamaño inválido: "${ut}"`);
                    continue;
                  }
                }

                const descriptionForI = descTokens.length > 0 ? (descTokens[i] ?? '') : (descriptionInputs[0] || newProduct.description || '');

                const payload: Record<string, unknown> = {
                  ...base,
                  unit_size: decimal,
                  description: descriptionForI,
                };
                if (supplierPayload !== undefined) {
                  (payload as { supplier?: unknown }).supplier = supplierPayload as unknown;
                }

                const res = await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                if (!res.ok) {
                  try {
                    const j = await res.json();
                    errors.push(j?.error || (Array.isArray(j?.errors) ? j.errors.join(', ') : `Error HTTP ${res.status}`));
                  } catch {
                    errors.push(`Error HTTP ${res.status}`);
                  }
                } else {
                  created++;
                  // Si solo se creó una variante y hay función para notificar al padre, llama a onProductCreated
                  if (variants.length === 1 && props.onProductCreated) {
                    try {
                      const createdJson = await res.json();
                      if (createdJson && createdJson.product) {
                        props.onProductCreated(createdJson.product);
                      }
                    } catch {}
                  }
                }
              }

              // Restablecer todos los campos y estados
              setNewProduct({ name: '', description: '', price: 0, visible: false, order: 0, features: [], applications: [], characteristics: [], unit_size: '', measurement_type: '', measurement_unit: '', measurement_type_other: '', measurement_unit_other: '', stock: 0, manufacturer: '', supplier: '', _file: null });
              setCharRows([]);
              setAppRows([]);
              setUnitSizeInputs(['']);
              setDescriptionInputs(['']);
              setSupplierSelected(null);
              setSupplierQuery('');
              setShowSupplierDetails(false);
              setSelectedExistingImages([]);
              setNewFiles([]);
              setNewProductPriceDisplay('');
              if (setSearchQuery) setSearchQuery('');

              // Mostrar alerta con mensaje actualizado
              if (errors.length === 0 && created > 0) {
                setAlert({ type: 'success', message: created > 1 ? `Se crearon ${created} productos y se añadieron a la lista.` : 'Producto creado y añadido a la lista.' });
              } else if (created > 0) {
                setAlert({ type: 'error', message: `Se crearon ${created}, con errores en ${errors.length}: ${errors.slice(0, 3).join(' · ')}${errors.length > 3 ? '…' : ''}` });
              } else {
                setAlert({ type: 'error', message: `No se creó ningún producto: ${errors.slice(0, 3).join(' · ')}${errors.length > 3 ? '…' : ''}` });
              }
            } catch (error) {
              console.error('Create error', error);
              setAlert({ type: 'error', message: `Error creando producto${error instanceof Error && error.message ? `: ${error.message}` : ''}` });
            } finally {
              setCreating(false);
            }
          }}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
        >
          {creating ? 'Creando...' : 'Crear producto'}
        </button>
        <button
          type="button"
          onClick={() => {
            setNewProduct({ name: '', description: '', price: 0, visible: false, order: 0, features: [], applications: [], characteristics: [], unit_size: '', measurement_type: '', measurement_unit: '', measurement_type_other: '', measurement_unit_other: '', stock: 0, manufacturer: '', supplier: '', _file: null });
            setCharRows([]);
            setAppRows([]);
            setUnitSizeInputs(['']);
            setDescriptionInputs(['']);
            setSupplierSelected(null);
            setSupplierQuery('');
            setShowSupplierDetails(false);
            setSelectedExistingImages([]);
            setNewFiles([]);
            setShowMatches(false);
            setNewProductPriceDisplay('');
            // No cerrar el modal ni cambiar setShowCreateForm
          }}
          className="px-4 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
        >
          Limpiar
        </button>
      </div>
    </div>
  )
}
