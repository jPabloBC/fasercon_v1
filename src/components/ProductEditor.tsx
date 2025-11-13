"use client"

import { ChangeEvent, useEffect, useState } from 'react';
import { Product, SupplierRef } from '../types/product';
import { formatUnitSizeDisplay } from '../lib/productsUtils';

type EditorMode = 'single' | 'bulk';

type ProductEditorProps = {
    product?: Partial<Product>;
    onProductChange?: (field: keyof Product, value: unknown) => void;
    allSuppliers: SupplierRef[];
    unitLabels: Record<string, string>;
    mode?: EditorMode;
    bulkState?: Record<string, { value: string; mixed?: boolean; changed?: boolean }>;
    onBulkChange?: (field: string, value: string) => void;
    onUnitSizeDisplayChange?: (value: string) => void;
    priceDisplay?: string;
    onPriceDisplayChange?: (value: string) => void;
};

export default function ProductEditor({
    product,
    onProductChange,
    allSuppliers,
    unitLabels,
    mode = 'single',
    bulkState,
    onBulkChange,
    onUnitSizeDisplayChange,
    priceDisplay,
    onPriceDisplayChange,
}: ProductEditorProps) {

  const isBulk = mode === 'bulk';

    // --- Dynamic rows for bulk mode ---
            // Características dinámicas
            const [charRows, setCharRows] = useState<{ title: string; detail: string }[]>(() => {
                if (isBulk && bulkState && bulkState.characteristics?.value) {
                    const arr = String(bulkState.characteristics.value).split(',').map(s => s.trim()).filter(Boolean)
                    return arr.map(s => {
                        const idx = s.indexOf(':')
                        if (idx >= 0) return { title: s.slice(0, idx).trim(), detail: s.slice(idx + 1).trim() }
                        return { title: s, detail: '' }
                    })
                }
                if (!isBulk && product && product.characteristics) {
                    return (Array.isArray(product.characteristics) ? product.characteristics : String(product.characteristics).split(',')).map(s => {
                        const str = String(s).trim()
                        const idx = str.indexOf(':')
                        if (idx >= 0) return { title: str.slice(0, idx).trim(), detail: str.slice(idx + 1).trim() }
                        return { title: str, detail: '' }
                    })
                }
                return [{ title: '', detail: '' }]
            })
            // Aplicaciones dinámicas
            const [appRows, setAppRows] = useState<{ title: string; detail: string }[]>(() => {
                if (isBulk && bulkState && bulkState.applications?.value) {
                    const arr = String(bulkState.applications.value).split(',').map(s => s.trim()).filter(Boolean)
                    return arr.map(s => {
                        const idx = s.indexOf(':')
                        if (idx >= 0) return { title: s.slice(0, idx).trim(), detail: s.slice(idx + 1).trim() }
                        return { title: s, detail: '' }
                    })
                }
                if (!isBulk && product && product.applications) {
                    return (Array.isArray(product.applications) ? product.applications : String(product.applications).split(',')).map(s => {
                        const str = String(s).trim()
                        const idx = str.indexOf(':')
                        if (idx >= 0) return { title: str.slice(0, idx).trim(), detail: str.slice(idx + 1).trim() }
                        return { title: str, detail: '' }
                    })
                }
                return [{ title: '', detail: '' }]
            })
            // Descripciones dinámicas
            const [descRows, setDescRows] = useState<string[]>(() => {
                if (isBulk && bulkState && bulkState.description?.value) {
                    return String(bulkState.description.value).split('|||').map(s => s.trim()).filter(Boolean)
                }
                if (!isBulk && product && product.description) {
                    return String(product.description).split('|||').map(s => s.trim())
                }
                return ['']
            })

            const getFieldValue = (field: keyof Product | string) => {
                if (isBulk) {
                    if (field === 'characteristics') return charRows
                    if (field === 'applications') return appRows
                    if (field === 'description') return descRows
                    return (bulkState && bulkState[String(field)]?.value) ?? ''
                }
                if (field === 'characteristics') return charRows
                if (field === 'applications') return appRows
                if (field === 'description') return descRows
                const obj = (product || {}) as Record<string, unknown>
                return (obj[String(field)] as unknown) ?? ''
            }

    const isMixed = (field: string) => isBulk && Boolean(bulkState && bulkState[field]?.mixed)

            const getString = (field: keyof Product | string): string => {
                if ((isBulk || !isBulk) && (field === 'characteristics' || field === 'applications' || field === 'description')) return ''
                const val = getFieldValue(field) as unknown
                if (Array.isArray(val)) return (val as unknown[]).join(', ')
                if (val == null) return ''
                return String(val)
            }


    // Estado local para los campos en modo bulk
    const [localBulk, setLocalBulk] = useState<Record<string, string>>({});

    useEffect(() => {
        if (isBulk && bulkState) {
            // Inicializa localBulk con los valores actuales de bulkState
            const initial: Record<string, string> = {};
            Object.keys(bulkState).forEach(k => {
                initial[k] = bulkState[k]?.value ?? '';
            });
            setLocalBulk(initial);
        }
        
    }, [isBulk, bulkState]);

    const handleBulkInput = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setLocalBulk(prev => ({ ...prev, [name]: value }));
    };

    const handleBulkBlur = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (onBulkChange) {
            onBulkChange(name, value);
        }
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (isBulk) {
            setLocalBulk(prev => ({ ...prev, [name]: value }));
        } else if (onProductChange) {
            onProductChange(name as keyof Product, value);
        }
    };

  const handlePriceChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, '');
    
    if (isBulk && onBulkChange) {
        onBulkChange('price', digits);
    } else if (onProductChange && onPriceDisplayChange) {
        const num = Number(digits);
        onProductChange('price', num);
        onPriceDisplayChange(raw);
    }
  };

  const getPriceValue = () => {
      if (isBulk) {
          return bulkState?.price?.value ?? '';
      }
      return priceDisplay ?? '';
  }

    // Reemplazar inputs por coma por inputs dinámicos en bulk
            // Características dinámicas handler
            const handleCharChange = (idx: number, key: 'title' | 'detail', value: string) => {
                setCharRows((prev: { title: string; detail: string }[]) => {
                    const next = [...prev]
                    next[idx] = { ...next[idx], [key]: value }
                    if (isBulk && onBulkChange) {
                        const str = next.filter(r => r.title).map(r => r.detail ? `${r.title}: ${r.detail}` : r.title).join(', ')
                        // Defer parent update to avoid setState during render of child
                        setTimeout(() => onBulkChange('characteristics', str), 0)
                    } else if (onProductChange) {
                        const arr = next.filter(r => r.title).map(r => r.detail ? `${r.title}: ${r.detail}` : r.title)
                        onProductChange('characteristics', arr)
                    }
                    return next
                })
            }
            // Aplicaciones dinámicas handler
            const handleAppChange = (idx: number, key: 'title' | 'detail', value: string) => {
                setAppRows((prev: { title: string; detail: string }[]) => {
                    const next = [...prev]
                    next[idx] = { ...next[idx], [key]: value }
                    if (isBulk && onBulkChange) {
                        const str = next.filter(r => r.title).map(r => r.detail ? `${r.title}: ${r.detail}` : r.title).join(', ')
                        // Defer parent update to avoid setState during render of child
                        setTimeout(() => onBulkChange('applications', str), 0)
                    } else if (onProductChange) {
                        const arr = next.filter(r => r.title).map(r => r.detail ? `${r.title}: ${r.detail}` : r.title)
                        onProductChange('applications', arr)
                    }
                    return next
                })
            }
            // Descripción dinámica
            const handleDescChange = (idx: number, value: string) => {
                setDescRows((prev: string[]) => {
                    const next = [...prev]
                    next[idx] = value
                    if (isBulk && onBulkChange) {
                        // Defer parent update to avoid setState during render of child
                        const payload = next.join('|||')
                        setTimeout(() => onBulkChange('description', payload), 0)
                    } else if (onProductChange) {
                        onProductChange('description', next.join('|||'))
                    }
                    return next
                })
            }


  // Estado local para el input unit_size
  const [unitSizeInput, setUnitSizeInput] = useState(product?.unit_size ? String(product.unit_size) : '');

  // Sincronizar el valor local si cambia el producto editado
  useEffect(() => {
    setUnitSizeInput(product?.unit_size ? String(product.unit_size) : '');
  }, [product?.unit_size]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-md bg-gray-50">
        <div>
            <label className="block text-sm font-medium text-gray-700">Nombre</label>
            <input
            type="text"
            name="name"
            value={isBulk ? (localBulk.name ?? '') : getString('name')}
            onChange={isBulk ? handleBulkInput : handleChange}
            onBlur={isBulk ? handleBulkBlur : undefined}
            placeholder={isMixed('name') ? '---' : 'Nombre del producto'}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
            />
            {isMixed('name') && <p className="mt-1 text-xs text-gray-500">Valores distintos.</p>}
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700">SKU</label>
            <input
            type="text"
            name="sku"
            value={isBulk ? (localBulk.sku ?? '') : getString('sku')}
            onChange={isBulk ? handleBulkInput : handleChange}
            onBlur={isBulk ? handleBulkBlur : undefined}
            placeholder={isMixed('sku') ? '---' : 'SKU del producto'}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
            />
            {isMixed('sku') && <p className="mt-1 text-xs text-gray-500">Valores distintos.</p>}
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700">Precio</label>
            <input
            type="text"
            name="price"
            value={getPriceValue()}
            onChange={handlePriceChange}
            onBlur={isBulk ? handleBulkBlur : undefined}
            placeholder={isMixed('price') ? '---' : 'Precio'}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
            />
            {isMixed('price') && <p className="mt-1 text-xs text-gray-500">Valores distintos.</p>}
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700">Orden</label>
            <input
            type="number"
            name="order"
            value={isBulk ? (localBulk.order ?? '') : getString('order')}
            onChange={isBulk ? handleBulkInput : handleChange}
            onBlur={isBulk ? handleBulkBlur : undefined}
            placeholder={isMixed('order') ? '---' : '0'}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
            />
            {isMixed('order') && <p className="mt-1 text-xs text-gray-500">Valores distintos.</p>}
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700">Stock</label>
            <input
            type="number"
            name="stock"
            value={isBulk ? (localBulk.stock ?? '') : getString('stock')}
            onChange={isBulk ? handleBulkInput : handleChange}
            onBlur={isBulk ? handleBulkBlur : undefined}
            placeholder={isMixed('stock') ? '---' : '0'}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
            />
            {isMixed('stock') && <p className="mt-1 text-xs text-gray-500">Valores distintos.</p>}
        </div>
        {!isBulk && (
            <div>
                <label className="block text-sm font-medium text-gray-700">Unidad (tamaño)</label>
                <input
                type="text"
                name="unit_size"
                value={formatUnitSizeDisplay(unitSizeInput)}
                onChange={e => setUnitSizeInput(e.target.value)}
                onBlur={e => {
                  if (onProductChange) onProductChange('unit_size', e.target.value);
                  if (onUnitSizeDisplayChange) onUnitSizeDisplayChange(e.target.value);
                }}
                placeholder={'Ej: 1 1/2'}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                />
            </div>
        )}
        <div>
            <label className="block text-sm font-medium text-gray-700">Fabricante</label>
            <input
            type="text"
            name="manufacturer"
            value={getString('manufacturer')}
            onChange={handleChange}
            placeholder={isMixed('manufacturer') ? '---' : 'Fabricante'}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
            />
            {isMixed('manufacturer') && <p className="mt-1 text-xs text-gray-500">Valores distintos.</p>}
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700">Proveedor</label>
            <select
                name="supplier"
                value={getString('supplier')}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
            >
                {isMixed('supplier') && <option value="">---</option>}
                <option value="">N/A</option>
                {allSuppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {isMixed('supplier') && <p className="mt-1 text-xs text-gray-500">Valores distintos.</p>}
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700">Tipo de medida</label>
            <select
                name="measurement_type"
                value={getString('measurement_type')}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
            >
                {isMixed('measurement_type') && <option value="">---</option>}
                <option value="">Seleccionar</option>
                <option value="piece">Pieza / unidad</option>
                <option value="weight">Peso</option>
                <option value="volume">Volumen</option>
                <option value="length">Longitud</option>
                <option value="other">Otro</option>
            </select>
            {isMixed('measurement_type') && <p className="mt-1 text-xs text-gray-500">Valores distintos.</p>}
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700">Unidad de medida</label>
            <select
                name="measurement_unit"
                value={getString('measurement_unit')}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
            >
                {isMixed('measurement_unit') && <option value="">---</option>}
                <option value="">Seleccionar</option>
                {Object.entries(unitLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
            {isMixed('measurement_unit') && <p className="mt-1 text-xs text-gray-500">Valores distintos.</p>}
        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Características</label>
                            <div className="flex flex-col gap-2">
                                {charRows.map((row: { title: string; detail: string }, idx: number) => (
                                    <div key={`char-${idx}`} className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start">
                                        <input
                                            placeholder="Título (se mostrará en negrita)"
                                            value={row.title || ''}
                                            onChange={e => handleCharChange(idx, 'title', e.target.value)}
                                            className="border px-2 py-1 rounded w-full bg-white text-gray-800"
                                        />
                                        <input
                                            placeholder="Detalle (opcional)"
                                            value={row.detail || ''}
                                            onChange={e => handleCharChange(idx, 'detail', e.target.value)}
                                            className="border px-2 py-1 rounded w-full bg-white text-gray-800"
                                        />
                                        {charRows.length > 1 && (
                                            <div className="md:col-span-2 flex justify-end">
                                                <button type="button" onClick={() => {
                                                    setCharRows((prev: { title: string; detail: string }[]) => {
                                                        const filtered = prev.filter((_, i) => i !== idx)
                                                        if (isBulk && onBulkChange) {
                                                            const str = filtered.filter(r => r.title).map(r => r.detail ? `${r.title}: ${r.detail}` : r.title).join(', ')
                                                            // Defer parent update
                                                            setTimeout(() => onBulkChange('characteristics', str), 0)
                                                        } else if (onProductChange) {
                                                            const arr = filtered.filter(r => r.title).map(r => r.detail ? `${r.title}: ${r.detail}` : r.title)
                                                            onProductChange('characteristics', arr)
                                                        }
                                                        return filtered
                                                    })
                                                }} className="text-xs px-2 py-1 bg-gray-200 rounded">Quitar</button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <button type="button" onClick={() => setCharRows((prev: { title: string; detail: string }[]) => [...prev, { title: '', detail: '' }])} className="text-sm px-2 py-1 bg-red-50 text-red-600 rounded">Añadir característica</button>
                            </div>
                            {isMixed('characteristics') && <p className="mt-1 text-xs text-gray-500">Valores distintos.</p>}
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Aplicaciones</label>
                            <div className="flex flex-col gap-2">
                                {appRows.map((row: { title: string; detail: string }, idx: number) => (
                                    <div key={`app-${idx}`} className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start">
                                        <input
                                            placeholder="Título (se mostrará en negrita)"
                                            value={row.title || ''}
                                            onChange={e => handleAppChange(idx, 'title', e.target.value)}
                                            className="border px-2 py-1 rounded w-full bg-white text-gray-800"
                                        />
                                        <input
                                            placeholder="Detalle (opcional)"
                                            value={row.detail || ''}
                                            onChange={e => handleAppChange(idx, 'detail', e.target.value)}
                                            className="border px-2 py-1 rounded w-full bg-white text-gray-800"
                                        />
                                        {appRows.length > 1 && (
                                            <div className="md:col-span-2 flex justify-end">
                                                <button type="button" onClick={() => {
                                                    setAppRows((prev: { title: string; detail: string }[]) => {
                                                        const filtered = prev.filter((_, i) => i !== idx)
                                                        if (isBulk && onBulkChange) {
                                                            const str = filtered.filter(r => r.title).map(r => r.detail ? `${r.title}: ${r.detail}` : r.title).join(', ')
                                                            // Defer parent update
                                                            setTimeout(() => onBulkChange('applications', str), 0)
                                                        } else if (onProductChange) {
                                                            const arr = filtered.filter(r => r.title).map(r => r.detail ? `${r.title}: ${r.detail}` : r.title)
                                                            onProductChange('applications', arr)
                                                        }
                                                        return filtered
                                                    })
                                                }} className="text-xs px-2 py-1 bg-gray-200 rounded">Quitar</button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <button type="button" onClick={() => setAppRows((prev: { title: string; detail: string }[]) => [...prev, { title: '', detail: '' }])} className="text-sm px-2 py-1 bg-red-50 text-red-600 rounded">Añadir aplicación</button>
                            </div>
                            {isMixed('applications') && <p className="mt-1 text-xs text-gray-500">Valores distintos.</p>}
                        </div>
                        {!isBulk && (
                          <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700">Descripción</label>
                              <div className="flex flex-col gap-2">
                                  {descRows.map((val: string, idx: number) => (
                                      <div key={`desc-${idx}`} className="flex gap-2 items-start">
                                          <textarea
                                              name={`description-${idx}`}
                                              value={val}
                                              onChange={e => handleDescChange(idx, e.target.value)}
                                              rows={3}
                                              placeholder={'Descripción detallada del producto'}
                                              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                                          />
                                          {descRows.length > 1 && (
                                              <button type="button" onClick={() => {
                                                  setDescRows((prev: string[]) => {
                                                      const next = prev.filter((_, i) => i !== idx)
                                                      if (onProductChange) {
                                                          onProductChange('description', next.join('|||'))
                                                      }
                                                      return next
                                                  })
                                              }} className="text-xs px-2 py-1 bg-gray-200 rounded ml-2">Quitar</button>
                                          )}
                                      </div>
                                  ))}
                                  <button type="button" onClick={() => setDescRows((prev: string[]) => [...prev, ''])} className="text-sm px-2 py-1 bg-red-50 text-red-600 rounded">Añadir descripción</button>
                              </div>
                          </div>
                        )}
    </div>
  );
}
