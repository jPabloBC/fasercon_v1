"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PhotoIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'
import ProductEditor from '@/components/ProductEditor';

type Product = {
  id: string
  name: string
  manufacturer?: string;
  description?: string
  image?: string
  image_url?: string | string[]
  price?: number
  visible?: boolean
  order?: number
  features?: string[]
  applications?: string[]
  characteristics?: string[];
  created_at?: string;
  updated_at?: string;
  unit_size?: string;
  stock?: number;
  sku?: string;
  measurement_type?: string;
  measurement_unit?: string;
  measurement_type_other?: string;
  measurement_unit_other?: string;
  supplier?: string | { id: string; name: string } | null;
}

type SupplierRef = {
  id: string
  name: string
  email?: string | null
  address?: string | null
  country?: string | null
  country_code?: string | null
}

type NewProduct = Partial<Product> & {
  _file?: File | null
  supplier_email?: string | null
  supplier_address?: string | null
  supplier_country?: string | null
}

export default function DashboardProductsPage() {
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  // Ocultar alerta automáticamente después de unos segundos
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [alert])
  const [selectedExistingImages, setSelectedExistingImages] = useState<string[]>([])
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [products, setProducts] = useState<Product[]>([])
  /* loading state removed (unused) */
  const [, setSavingId] = useState<string | null>(null)
  const [, setUploadingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingMap, setEditingMap] = useState<Record<string, boolean>>({})
  const [newProduct, setNewProduct] = useState<NewProduct>({ name: '', description: '', price: 0, visible: false, order: 0, features: [], applications: [], unit_size: '', stock: 0, measurement_type: '', measurement_unit: '', manufacturer: '', supplier: '', _file: null })
  // price display states already present earlier
  const [newProductPriceDisplay, setNewProductPriceDisplay] = useState<string>('')
  // priceDisplays removed (not used currently)
  const [showSupplierDetails, setShowSupplierDetails] = useState(false)
  // supplier autocomplete for create form
  const [supplierQuery, setSupplierQuery] = useState('')
  const [, setSupplierResults] = useState<SupplierRef[]>([])
  const [supplierSelected, setSupplierSelected] = useState<SupplierRef | null>(null)
  const [, setSupplierSearchLoading] = useState(false)
  const [allSuppliers, setAllSuppliers] = useState<SupplierRef[]>([])
  const [matchingProducts, setMatchingProducts] = useState<Product[]>([])
  const [showMatches, setShowMatches] = useState(false)
  const skipMatchSearch = useRef(false)
  const [loadingProducts, setLoadingProducts] = useState(true)
  // Búsqueda global sobre todos los campos del producto (dashboard)
  const [dashboardQuery, setDashboardQuery] = useState('')
  // Variantes: múltiples tamaños y descripciones sincronizadas
  const [unitSizeInputs, setUnitSizeInputs] = useState<string[]>([''])
  const [descriptionInputs, setDescriptionInputs] = useState<string[]>([''])
  // Edición masiva por nombre (campos coincidentes + imágenes)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkName, setBulkName] = useState<string>('')
  const [bulkIds, setBulkIds] = useState<string[]>([])
  // Variantes en edición masiva: descripción por tamaño de unidad
  const [, setBulkVariants] = useState<Record<string, { value: string; mixed: boolean; changed: boolean }>>({})
  // Filas por variante (por producto): SKU (solo lectura), tamaño (editable), descripción (editable)
  const [bulkVariantRows, setBulkVariantRows] = useState<Array<{ id: string; sku: string; size: string; desc: string; sizeChanged: boolean; descChanged: boolean }>>([])
  type BulkFieldState<T> = { value: T; mixed: boolean; changed: boolean }
  const [bulk, setBulk] = useState<{[K in 'name'|'description'|'manufacturer'|'characteristics'|'features'|'applications'|'price'|'visible'|'order'|'unit_size'|'measurement_type'|'measurement_unit'|'measurement_type_other'|'measurement_unit_other'|'stock'|'sku'|'supplier']: BulkFieldState<string>}>(
    {
      name: { value: '', mixed: false, changed: false },
      description: { value: '', mixed: false, changed: false },
      manufacturer: { value: '', mixed: false, changed: false },
      characteristics: { value: '', mixed: false, changed: false },
      features: { value: '', mixed: false, changed: false },
      applications: { value: '', mixed: false, changed: false },
      price: { value: '', mixed: false, changed: false },
      visible: { value: '', mixed: false, changed: false },
      order: { value: '', mixed: false, changed: false },
      unit_size: { value: '', mixed: false, changed: false },
      measurement_type: { value: '', mixed: false, changed: false },
      measurement_unit: { value: '', mixed: false, changed: false },
      measurement_type_other: { value: '', mixed: false, changed: false },
      measurement_unit_other: { value: '', mixed: false, changed: false },
      stock: { value: '', mixed: false, changed: false },
      sku: { value: '', mixed: false, changed: false },
      supplier: { value: '', mixed: false, changed: false },
    }
  )
  const [bulkImages, setBulkImages] = useState<string[]>([])
  const [bulkUploading, setBulkUploading] = useState(false)
  // Pares Título/Detalle para creación
  type Pair = { title: string; detail: string }
  const [charRows, setCharRows] = useState<Pair[]>([])
  const [appRows, setAppRows] = useState<Pair[]>([])
  // Pares Título/Detalle por producto en modo edición individual
  const [, setPairRowsMap] = useState<Record<string, { chars: Pair[]; apps: Pair[] }>>({})

  // Lista filtrada por búsqueda en todos los campos
  const viewProducts = useMemo(() => {
    const q = dashboardQuery.trim().toLowerCase()
    if (!q) return products

    const contains = (val: unknown): boolean => {
      if (val == null) return false
      if (Array.isArray(val)) return contains(val.join(' '))
      if (typeof val === 'object') return contains(JSON.stringify(val))
      return String(val).toLowerCase().includes(q)
    }

    return products.filter((p) => {
      const supplierName = typeof p.supplier === 'string' ? p.supplier : (p.supplier?.name || '')
      const fields: unknown[] = [
        p.id,
        p.name,
        p.manufacturer,
        p.description,
        p.price,
        p.visible,
        p.order,
        p.unit_size,
        p.stock,
        p.sku,
        p.measurement_type,
        p.measurement_unit,
        p.measurement_type_other,
        p.measurement_unit_other,
        supplierName,
        ...(p.features || []),
        ...(p.applications || []),
        ...(p.characteristics || []),
      ]
      return fields.some(contains)
    })
  }, [products, dashboardQuery])

  // If user opens the "Editar datos proveedor" panel and a supplier is selected,
  // prefill the create-product supplier fields with that supplier's data (but don't overwrite existing inputs).
  useEffect(() => {
    if (showSupplierDetails && supplierSelected) {
      setNewProduct(prev => {
        const next = { ...(prev as NewProduct) } as NewProduct
        // only prefill if empty to avoid overwriting user input
        if (!next.supplier_email && supplierSelected.email) next.supplier_email = supplierSelected.email
        if (!next.supplier_address && supplierSelected.address) next.supplier_address = supplierSelected.address
        if (!next.supplier_country && (supplierSelected.country || supplierSelected.country_code)) {
          next.supplier_country = supplierSelected.country || supplierSelected.country_code
        }
        return next
      })
    }
  }, [showSupplierDetails, supplierSelected])

  const fetchProducts = async () => {
    setLoadingProducts(true)
    try {
      const res = await fetch('/api/products')
      const data = await res.json()
      setProducts(data.products || [])
    } catch (error) {
      console.error('Error fetching products', error)
      setProducts([])
    } finally {
      setLoadingProducts(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const unitLabels: Record<string, string> = {
    unit: 'unidad',
    in: 'pulgadas (in)',
    ft: 'pies (ft)',
    m: 'metros (m)',
    cm: 'centímetros (cm)',
    mm: 'milímetros (mm)',
    m2: 'm² (m2)',
    m3: 'm³ (m3)',
    kg: 'kilogramo (kg)',
    g: 'gramo (g)',
    ton: 'tonelada (t)',
    l: 'litro (l)',
    box: 'caja',
    pack: 'paquete',
    roll: 'rollo',
    other: 'Otro',
  }

  const unitSymbols: Record<string, string> = {
    in: '"', // pulgadas -> 6"
    ft: "'", // pies -> 6'
    m: 'm',
    cm: 'cm',
    mm: 'mm',
    kg: 'kg',
    g: 'g',
    ton: 't',
    l: 'l',
    unit: '',
    box: ' caja',
    pack: ' paquete',
    roll: ' rollo',
    other: '',
  }

  const formatPrice = (v?: number | null) => {
    if (v == null) return '—'
    try {
      return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(v)
    } catch {
      return String(v)
    }
  }

  const formatCurrencyInput = (v?: number | null) => {
    if (v == null) return ''
    try {
      return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(v)
    } catch {
      return String(v)
    }
  }

  // --- Helpers para pares Título/Detalle ---
  const parsePairsFromStrings = (arr?: string[] | null): { title: string; detail: string }[] => {
    if (!arr || arr.length === 0) return []
    return arr.map((s) => {
      const str = String(s)
      const idx = str.indexOf(':')
      if (idx >= 0) {
        const title = str.slice(0, idx).trim()
        const detail = str.slice(idx + 1).trim()
        return { title, detail }
      }
      return { title: str.trim(), detail: '' }
    })
  }
  const combinePairsToStrings = (pairs: { title: string; detail: string }[]): string[] => {
    return pairs
      .map(({ title, detail }) => ({ title: title?.trim() || '', detail: detail?.trim() || '' }))
      .filter(({ title, detail }) => Boolean(title || detail))
      .map(({ title, detail }) => (detail ? `${title}: ${detail}` : title))
  }

  // fetch supplier matches (debounced in effect)
  const fetchSupplierMatches = async (q: string) => {
    if (!q) {
      setSupplierResults([])
      return
    }
    setSupplierSearchLoading(true)
    try {
      const res = await fetch(`/api/suppliers?q=${encodeURIComponent(q)}&limit=8&page=1`)
      if (!res.ok) throw new Error('Error fetching suppliers')
      const json = await res.json()
      // API returns { data, total }
      const list = Array.isArray(json) ? json : (json.data || [])
      setSupplierResults(list)
    } catch (e) {
      console.error('Supplier search error', e)
      setSupplierResults([])
    } finally {
      setSupplierSearchLoading(false)
    }
  }

  // debounce supplierQuery
  useEffect(() => {
    const t = setTimeout(() => {
      fetchSupplierMatches(supplierQuery)
    }, 300)
    return () => clearTimeout(t)
  }, [supplierQuery])

  // fetch a bigger suppliers list for select (used in create form) once
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const res = await fetch(`/api/suppliers?limit=200&page=1`)
        if (!res.ok) throw new Error('Error fetching suppliers')
        const json = await res.json()
        const list = Array.isArray(json) ? json : (json.data || [])
        setAllSuppliers(list)
      } catch (e) {
        console.error('Error loading suppliers list', e)
        setAllSuppliers([])
      }
    }
    fetchAll()
  }, [])

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const onPriceInputChange = (id: string, raw: string) => {
    // keep only digits
    const digits = raw.replace(/\D/g, '')
    if (!digits) {
      updateLocal(id, { price: undefined })
      return
    }
    const value = Number(digits)
    updateLocal(id, { price: value })
  }

  const updateLocal = (id: string, patch: Partial<Product>) => {
    setProducts((prev) => prev.map(p => p.id === id ? { ...p, ...patch } : p))
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const uploadFile = async (id: string, file?: File) => {
    if (!file) return null
    setUploadingId(id)
    try {
  const fd = new FormData()
  const filename = `${id}/${file.name}`
      fd.append('file', file)
      fd.append('filename', filename)

      const res = await fetch('/api/products/upload', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('Upload failed')
  const json = await res.json()
  const persistedUrl: string | undefined = json.publicUrl || json.url
  // Reemplaza la imagen principal por la subida (para compatibilidad)
  if (persistedUrl) updateLocal(id, { image: persistedUrl })

      try {
        setSavingId(id)
        const saveRes = await fetch('/api/products', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, image: persistedUrl }),
        })
        if (!saveRes.ok) throw new Error('Auto-save failed')
        await fetchProducts()
        const updated = (products || []).find(p => String(p.id) === String(id))
        if (updated?.visible) {
          await fetch('/api/revalidate', { method: 'POST' })
        }
      } catch (err) {
        console.error('Auto-save after upload failed', err)
      } finally {
        setSavingId(null)
      }

  return persistedUrl || null
    } catch (error) {
      console.error('Upload error', error)
      return null
    } finally {
      setUploadingId(null)
    }
  }

  // Helpers para manejar múltiples imágenes en edición
  const getCurrentImages = (prod: Product | undefined): string[] => {
    if (!prod) return []
    const raw = Array.isArray(prod.image_url) ? prod.image_url : (prod.image_url ? [prod.image_url] : (prod.image ? [prod.image] : []))
    return raw.filter(Boolean) as string[]
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const addImages = async (id: string, files: FileList | File[] | null | undefined) => {
    if (!files || (Array.isArray(files) && files.length === 0) || (files instanceof FileList && files.length === 0)) return
    const list = Array.isArray(files) ? files : Array.from(files)
    setUploadingId(id)
    try {
  const uploaded: string[] = []
      for (const file of list) {
        const fd = new FormData()
        const filename = `${id}/${file.name}`
        fd.append('file', file)
        fd.append('filename', filename)
        const res = await fetch('/api/products/upload', { method: 'POST', body: fd })
        if (!res.ok) throw new Error('Upload failed')
        const json = await res.json()
        const u: string | undefined = json.publicUrl || json.url
        if (u) uploaded.push(u)
      }

      const prod = products.find(p => String(p.id) === String(id))
      const current = getCurrentImages(prod)
      const updated = [...current, ...uploaded]

      setSavingId(id)
      const saveRes = await fetch('/api/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, image: updated }),
      })
  if (!saveRes.ok) throw new Error('Update images failed')
  updateLocal(id, { image_url: updated as unknown as string[], image: updated[0] })
    } catch (err) {
      console.error('Add images failed', err)
    } finally {
      setSavingId(null)
      setUploadingId(null)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const removeImage = async (id: string, url: string) => {
    setSavingId(id)
    try {
      const prod = products.find(p => String(p.id) === String(id))
      const current = getCurrentImages(prod)
      const updated = current.filter(u => u !== url)
      const saveRes = await fetch('/api/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, image: updated }),
      })
  if (!saveRes.ok) throw new Error('Remove image failed')
  updateLocal(id, { image_url: updated as unknown as string[], image: updated[0] })
    } catch (err) {
      console.error('Remove image failed', err)
    } finally {
      setSavingId(null)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const createProduct = async () => {
    if (!newProduct.name) {
      setAlert({ type: 'error', message: 'El nombre es requerido' })
      return
    }
    // duplicate check: same name + same measurement_unit + same manufacturer
    // additionally, if the new product specifies unit_size, require that to match as well
    const nameNorm = (newProduct.name || '').trim().toLowerCase()
    const unit = newProduct.measurement_unit || ''
    const manu = newProduct.manufacturer || ''
    const size = (newProduct.unit_size || '').toString().trim()
    const sizeProvided = Boolean(size)
    const exists = (products || []).some(p => {
      const pName = (p.name || '').trim().toLowerCase()
      const pUnit = (p.measurement_unit || '')
      const pManu = (p.manufacturer || '')
      const pSize = (p.unit_size || '').toString().trim()
      if (pName !== nameNorm) return false
      if (pUnit !== unit) return false
      if (pManu !== manu) return false
      if (sizeProvided && pSize !== size) return false
      return true
    })
    if (exists) {
      setAlert({ type: 'error', message: 'Ya existe un producto con el mismo nombre, unidad de medida, fabricante' + (sizeProvided ? ' y tamaño de unidad' : '') + ". Evita duplicados." })
      return
    }
    setCreating(true)
    try {
      // check SKU uniqueness client-side first
      if (newProduct.sku) {
        const skuNorm = String(newProduct.sku).trim()
        const skuExists = (products || []).some(p => String(p.sku || '').trim() === skuNorm)
        if (skuExists) {
          setAlert({ type: 'error', message: 'El SKU ya existe. El SKU debe ser único para cada producto.' })
          return
        }
      }

      let imageUrl = newProduct.image as string | undefined
  if (newProduct._file instanceof File) {
        const file = newProduct._file as File
        const fd = new FormData()
    const filename = `${file.name}`
        fd.append('file', file)
        fd.append('filename', filename)
        const res = await fetch('/api/products/upload', { method: 'POST', body: fd })
  const json = await res.json()
  imageUrl = json.publicUrl || json.url
      }

    const body: Record<string, unknown> = {
    name: newProduct.name,
    description: newProduct.description,
    image: imageUrl,
    price: newProduct.price,
    visible: false,
    order: newProduct.order,
    features: newProduct.features || [],
    applications: newProduct.applications || [],
    characteristics: newProduct.characteristics || [],
    stock: newProduct.stock ?? null,
    measurement_type: newProduct.measurement_type || null,
    measurement_unit: newProduct.measurement_unit || null,
    measurement_type_other: newProduct.measurement_type_other || null,
    measurement_unit_other: newProduct.measurement_unit_other || null,
    // Validar que el resultado sea un número válido o null
    unit_size: (() => {
      const val = typeof newProduct.unit_size === 'string' ? convertFractionToDecimal(newProduct.unit_size) : newProduct.unit_size;
      if (val === undefined || val === null) return null;
      if (typeof val === 'number' && !isNaN(val)) return val;
      // Si la conversión falla, retorna null
      return null;
    })(),
    manufacturer: newProduct.manufacturer || null,
    supplier: null,
    }

      // supplier handling: if an existing supplier was selected, send its id
      if (supplierSelected) {
        // backend accepts supplier as string (name) or object; send object with id and name
        body.supplier = { id: supplierSelected.id, name: supplierSelected.name }
  } else if (showSupplierDetails && ((newProduct as NewProduct).supplier_email || (newProduct as NewProduct).supplier_address || (newProduct as NewProduct).supplier_country || supplierQuery)) {
        // send supplier object to create/find by email/name
        body.supplier = {
          name: supplierQuery || (newProduct.supplier as string) || newProduct.manufacturer || 'Proveedor',
          email: (newProduct as NewProduct).supplier_email || null,
          address: (newProduct as NewProduct).supplier_address || null,
          country: (newProduct as NewProduct).supplier_country || null,
        }
      } else {
        // fallback: send the typed supplier name if any
        const typed = supplierQuery || (newProduct.supplier as string) || ''
        if (typed) body.supplier = typed
      }

      console.log('Request body:', body)
      const res = await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      console.log('Response status:', res.status)
      console.log('Response body:', await res.text())
      if (!res.ok) throw new Error('Create failed')
      await fetchProducts()
      setNewProduct({ name: '', description: '', price: 0, visible: false, order: 0, features: [], applications: [], characteristics: [], unit_size: '', measurement_type: '', measurement_unit: '', measurement_type_other: '', measurement_unit_other: '', stock: 0, manufacturer: '', supplier: '', _file: null })
      setSupplierSelected(null)
      setSupplierQuery('')
      setShowSupplierDetails(false)
      setShowCreateForm(false)
      setAlert({ type: 'success', message: 'Producto creado exitosamente.' })
    } catch (error) {
  console.error('Create error', error)
  setAlert({ type: 'error', message: 'Error creando producto' })
    } finally {
      setCreating(false)
    }
  }

  const convertFractionToDecimal = (value: string): number | string => {
    if (value == null) return value as unknown as string
    const sanitized = String(value).replace(/["”]/g, '').trim()
    // Mixed fraction e.g., 1 1/8
    const mixed = sanitized.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/)
    if (mixed) {
      const whole = parseInt(mixed[1], 10)
      const num = parseInt(mixed[2], 10)
      const den = parseInt(mixed[3], 10)
      if (!den) return sanitized
      return whole + num / den
    }
    // Simple fraction e.g., 9/8
    const simple = sanitized.match(/^(\d+)\s*\/\s*(\d+)$/)
    if (simple) {
      const num = parseInt(simple[1], 10)
      const den = parseInt(simple[2], 10)
      if (!den) return sanitized
      return num / den
    }
    // Decimal number
    if (/^\d+(\.\d+)?$/.test(sanitized)) return parseFloat(sanitized)
    return value
  }

  // Helpers for displaying unit_size as mixed fractions (e.g., 9/8 -> 1 1/8)
  const gcd = (a: number, b: number): number => {
    a = Math.abs(a)
    b = Math.abs(b)
    while (b) {
      const t = b
      b = a % b
      a = t
    }
    return a || 1
  }

  const formatUnitSizeDisplay = (val?: string | number | null): string => {
    if (val == null) return '';
    const raw = String(val).replace(/["”]/g, '').trim();

    // Si es un número entero o una fracción equivalente a un entero, devolver directamente el entero
    const fractionMatch = raw.match(/^(-?\d+)\s*\/\s*(\d+)$/);
    if (fractionMatch) {
      const numerator = parseInt(fractionMatch[1], 10);
      const denominator = parseInt(fractionMatch[2], 10);
      if (denominator === 1) return String(numerator);
    }

    // Si es un número entero, devolver directamente
    if (/^-?\d+$/.test(raw)) {
      return raw;
    }

    // Fracción mixta como "1 1/8"
    if (/^\d+\s+\d+\/\d+$/.test(raw)) return raw;
    // Fracción simple, posiblemente impropia, como "9/8" o "4/1"
    const f = raw.match(/^(-?\d+)\s*\/\s*(\d+)$/);
    if (f) {
      const numerator = parseInt(f[1], 10);
      const denominator = parseInt(f[2], 10);
      if (denominator === 1) return String(numerator);
      const sign = Math.sign(numerator);
      const n = Math.abs(numerator);
      const d = denominator;
      const whole = Math.floor(n / d);
      let rem = n % d;
      if (rem === 0) return String(sign < 0 ? -whole : whole);
      const g = gcd(rem, d);
      rem = Math.floor(rem / g);
      const dd = Math.floor(d / g);
      const prefix = sign < 0 ? '-' : '';
      return whole > 0 ? `${prefix}${whole} ${rem}/${dd}` : `${prefix}${rem}/${dd}`;
    }
    // Decimal number like 1.125
    if (/^-?\d+(\.\d+)?$/.test(raw)) {
      const negative = raw.startsWith('-')
      const num = Math.abs(parseFloat(raw))
      const whole = Math.floor(num)
      const frac = num - whole
      if (frac < 1e-8) return `${negative ? '-' : ''}${whole}`
      const baseDen = 64
      let n = Math.round(frac * baseDen)
      let d = baseDen
      const g = gcd(n, d)
      n = Math.floor(n / g)
      d = Math.floor(d / g)
      if (n === d) return `${negative ? '-' : ''}${whole + 1}`
      return whole > 0
        ? `${negative ? '-' : ''}${whole} ${n}/${d}`
        : `${negative ? '-' : ''}${n}/${d}`
    }
    // Unknown format, return as-is
    return raw
  }

  const save = async (product: Product) => {
  setSavingId(product.id)
  setAlert(null)
    try {
      // Convert fraction fields to decimals
      const updatedProduct = {
        ...product,
        unit_size: typeof product.unit_size === 'string' ? convertFractionToDecimal(product.unit_size) : product.unit_size,
      }

      const res = await fetch('/api/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProduct),
      })
      if (!res.ok) {
        // try to read response body for better diagnostics
        let bodyText = ''
        try {
          const contentType = res.headers.get('content-type') || ''
          if (contentType.includes('application/json')) {
            const json = await res.json()
            bodyText = JSON.stringify(json)
          } else {
            bodyText = await res.text()
          }
        } catch (e) {
          bodyText = `Could not read response body: ${String(e)}`
        }
  console.error('Save failed', { status: res.status, statusText: res.statusText, body: bodyText })
  setAlert({ type: 'error', message: `Error guardando producto (status ${res.status})` })
  throw new Error('Error saving')
      }
      await fetchProducts()
  setEditingMap(prev => ({ ...prev, [product.id]: false }))
  setAlert({ type: 'success', message: 'Producto guardado exitosamente.' })
    } catch (error) {
  console.error(error)
  setAlert({ type: 'error', message: 'Error guardando producto.' })
    } finally {
      setSavingId(null)
    }
  }

  const startEdit = (id: string) => {
    setEditingMap(prev => ({ ...prev, [id]: true }))
    const prod = products.find(p => p.id === id)
    if (prod) {
      setPairRowsMap(prev => ({
        ...prev,
        [id]: {
          chars: parsePairsFromStrings(prod.characteristics as unknown as string[]),
          apps: parsePairsFromStrings(prod.applications as unknown as string[]),
        }
      }))
    }
  }
  const cancelEdit = async (id: string) => {
    await fetchProducts()
    setEditingMap(prev => ({ ...prev, [id]: false }))
  }

  // Selección individual para edición en grupo
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // ---------- BULK EDIT (por nombre o selección) ----------
  const openBulkForIds = (ids: string[]) => {
    const uniq = Array.from(new Set(ids.map(String)))
    if (uniq.length === 0) return
    const group = products.filter(p => uniq.includes(String(p.id)))
    if (group.length === 0) return

    const idsArr = group.map(g => g.id)
    setBulkIds(idsArr)
    setBulkName(`Selección (${group.length})`)

    // Campos coincidentes para TODOS los campos
    const sameValue = <T,>(vals: T[]): { equal: boolean; value?: T } => {
      if (vals.length === 0) return { equal: true, value: undefined as unknown as T }
      const first = vals[0]
      const allEqual = vals.every(v => JSON.stringify(v) === JSON.stringify(first))
      return { equal: allEqual, value: first }
    }

    const joinArr = (v?: unknown) => Array.isArray(v) ? (v as string[]).join(', ') : ''
    const getSupplierId = (g: Product) => {
      if (!g.supplier) return ''
      if (typeof g.supplier === 'object' && (g.supplier as { id?: string }).id) return String((g.supplier as { id?: string }).id)
      if (typeof g.supplier === 'string') {
        const supplierName = g.supplier
        const supplierNameLower = supplierName.toLowerCase()
        const found = allSuppliers.find(s => s.name.toLowerCase() === supplierNameLower)
        return found ? String(found.id) : ''
      }
      return ''
    }

    const build = {
      name: sameValue(group.map(g => g.name || '')),
      description: sameValue(group.map(g => g.description || '')),
      manufacturer: sameValue(group.map(g => g.manufacturer || '')),
      characteristics: sameValue(group.map(g => Array.isArray(g.characteristics) ? (g.characteristics as string[]) : [])),
      features: sameValue(group.map(g => Array.isArray(g.features) ? (g.features as string[]) : [])),
      applications: sameValue(group.map(g => Array.isArray(g.applications) ? (g.applications as string[]) : [])),
      price: sameValue(group.map(g => g.price ?? '')),
      visible: sameValue(group.map(g => g.visible ?? '')),
      order: sameValue(group.map(g => g.order ?? '')),
      unit_size: sameValue(group.map(g => (g.unit_size ?? ''))),
      measurement_type: sameValue(group.map(g => g.measurement_type || '')),
      measurement_unit: sameValue(group.map(g => g.measurement_unit || '')),
      measurement_type_other: sameValue(group.map(g => g.measurement_type_other || '')),
      measurement_unit_other: sameValue(group.map(g => g.measurement_unit_other || '')),
      stock: sameValue(group.map(g => g.stock ?? '')),
      sku: sameValue(group.map(g => g.sku || '')),
      supplier: sameValue(group.map(getSupplierId)),
    }

    setBulk({
      name: { value: build.name.equal ? String(build.name.value ?? '') : '', mixed: !build.name.equal, changed: false },
      description: { value: build.description.equal ? String(build.description.value ?? '') : '', mixed: !build.description.equal, changed: false },
      manufacturer: { value: build.manufacturer.equal ? String(build.manufacturer.value ?? '') : '', mixed: !build.manufacturer.equal, changed: false },
      characteristics: { value: build.characteristics.equal ? joinArr(build.characteristics.value) : '', mixed: !build.characteristics.equal, changed: false },
      features: { value: build.features.equal ? joinArr(build.features.value) : '', mixed: !build.features.equal, changed: false },
      applications: { value: build.applications.equal ? joinArr(build.applications.value) : '', mixed: !build.applications.equal, changed: false },
      price: { value: build.price.equal ? String(build.price.value ?? '') : '', mixed: !build.price.equal, changed: false },
      visible: { value: build.visible.equal ? (build.visible.value === true ? 'true' : build.visible.value === false ? 'false' : '') : '', mixed: !build.visible.equal, changed: false },
      order: { value: build.order.equal ? String(build.order.value ?? '') : '', mixed: !build.order.equal, changed: false },
      unit_size: { value: build.unit_size.equal ? String(build.unit_size.value ?? '') : '', mixed: !build.unit_size.equal, changed: false },
      measurement_type: { value: build.measurement_type.equal ? String(build.measurement_type.value ?? '') : '', mixed: !build.measurement_type.equal, changed: false },
      measurement_unit: { value: build.measurement_unit.equal ? String(build.measurement_unit.value ?? '') : '', mixed: !build.measurement_unit.equal, changed: false },
      measurement_type_other: { value: build.measurement_type_other.equal ? String(build.measurement_type_other.value ?? '') : '', mixed: !build.measurement_type_other.equal, changed: false },
      measurement_unit_other: { value: build.measurement_unit_other.equal ? String(build.measurement_unit_other.value ?? '') : '', mixed: !build.measurement_unit_other.equal, changed: false },
      stock: { value: build.stock.equal ? String(build.stock.value ?? '') : '', mixed: !build.stock.equal, changed: false },
      sku: { value: build.sku.equal ? String(build.sku.value ?? '') : '', mixed: !build.sku.equal, changed: false },
      supplier: { value: build.supplier.equal ? String(build.supplier.value ?? '') : '', mixed: !build.supplier.equal, changed: false },
    })

    // Unir imágenes de la selección
    const setImgs = new Set<string>()
    for (const g of group) {
      const arr = Array.isArray(g.image_url) ? g.image_url : (g.image_url ? [g.image_url] : (g.image ? [g.image] : []))
      for (const u of (arr as string[])) if (u) setImgs.add(u)
    }
  setBulkImages(Array.from(setImgs))

    // Construir mapa de variantes: unit_size -> descripción (mixto si difiere)
    const bySize = new Map<string, string[]>()
    for (const g of group) {
      const size = formatUnitSizeDisplay(g.unit_size)
      if (!size) continue
      const arr = bySize.get(size) || []
      arr.push(g.description || '')
      bySize.set(size, arr)
    }
    const v: Record<string, { value: string; mixed: boolean; changed: boolean }> = {}
    for (const [size, descs] of bySize.entries()) {
      const first = descs[0] ?? ''
      const equal = descs.every(d => (d || '') === (first || ''))
      v[size] = { value: equal ? first : '', mixed: !equal, changed: false }
    }
    setBulkVariants(v)
    // Construir filas por producto
    setBulkVariantRows(group.map(g => ({
      id: g.id,
      sku: g.sku || '',
      size: formatUnitSizeDisplay(g.unit_size),
      desc: g.description || '',
      sizeChanged: false,
      descChanged: false,
    })))
    setBulkOpen(true)
  }

  // ---------- BULK EDIT (por nombre) ----------
  const openBulkForName = (name: string) => {
    const group = products.filter(p => (p.name || '').trim().toLowerCase() === name.trim().toLowerCase())
    const ids = group.map(g => g.id)
    setBulkIds(ids)
    setBulkName(name)

    // Campos coincidentes para TODOS los campos
    const sameValue = <T,>(vals: T[]): { equal: boolean; value?: T } => {
      if (vals.length === 0) return { equal: true, value: undefined as unknown as T }
      const first = vals[0]
      const allEqual = vals.every(v => JSON.stringify(v) === JSON.stringify(first))
      return { equal: allEqual, value: first }
    }

    const joinArr = (v?: unknown) => Array.isArray(v) ? (v as string[]).join(', ') : ''
    const getSupplierId = (g: Product) => {
      if (!g.supplier) return ''
      if (typeof g.supplier === 'object' && (g.supplier as { id?: string }).id) return String((g.supplier as { id?: string }).id)
      // if it's a string name, we can't compare reliably by id; map to found id if exists
      if (typeof g.supplier === 'string') {
        // Preserve narrowing across closure by copying to a local const
        const supplierName = g.supplier
        const supplierNameLower = supplierName.toLowerCase()
        const found = allSuppliers.find(s => s.name.toLowerCase() === supplierNameLower)
        return found ? String(found.id) : ''
      }
      return ''
    }

    const build = {
      name: sameValue(group.map(g => g.name || '')),
      description: sameValue(group.map(g => g.description || '')),
      manufacturer: sameValue(group.map(g => g.manufacturer || '')),
      characteristics: sameValue(group.map(g => Array.isArray(g.characteristics) ? (g.characteristics as string[]) : [])),
      features: sameValue(group.map(g => Array.isArray(g.features) ? (g.features as string[]) : [])),
      applications: sameValue(group.map(g => Array.isArray(g.applications) ? (g.applications as string[]) : [])),
      price: sameValue(group.map(g => g.price ?? '')),
      visible: sameValue(group.map(g => g.visible ?? '')),
      order: sameValue(group.map(g => g.order ?? '')),
      unit_size: sameValue(group.map(g => (g.unit_size ?? ''))),
      measurement_type: sameValue(group.map(g => g.measurement_type || '')),
      measurement_unit: sameValue(group.map(g => g.measurement_unit || '')),
      measurement_type_other: sameValue(group.map(g => g.measurement_type_other || '')),
      measurement_unit_other: sameValue(group.map(g => g.measurement_unit_other || '')),
      stock: sameValue(group.map(g => g.stock ?? '')),
      sku: sameValue(group.map(g => g.sku || '')),
      supplier: sameValue(group.map(getSupplierId)),
    }

    setBulk({
      name: { value: build.name.equal ? String(build.name.value ?? '') : '', mixed: !build.name.equal, changed: false },
      description: { value: build.description.equal ? String(build.description.value ?? '') : '', mixed: !build.description.equal, changed: false },
      manufacturer: { value: build.manufacturer.equal ? String(build.manufacturer.value ?? '') : '', mixed: !build.manufacturer.equal, changed: false },
      characteristics: { value: build.characteristics.equal ? joinArr(build.characteristics.value) : '', mixed: !build.characteristics.equal, changed: false },
      features: { value: build.features.equal ? joinArr(build.features.value) : '', mixed: !build.features.equal, changed: false },
      applications: { value: build.applications.equal ? joinArr(build.applications.value) : '', mixed: !build.applications.equal, changed: false },
      price: { value: build.price.equal ? String(build.price.value ?? '') : '', mixed: !build.price.equal, changed: false },
      visible: { value: build.visible.equal ? (build.visible.value === true ? 'true' : build.visible.value === false ? 'false' : '') : '', mixed: !build.visible.equal, changed: false },
      order: { value: build.order.equal ? String(build.order.value ?? '') : '', mixed: !build.order.equal, changed: false },
      unit_size: { value: build.unit_size.equal ? String(build.unit_size.value ?? '') : '', mixed: !build.unit_size.equal, changed: false },
      measurement_type: { value: build.measurement_type.equal ? String(build.measurement_type.value ?? '') : '', mixed: !build.measurement_type.equal, changed: false },
      measurement_unit: { value: build.measurement_unit.equal ? String(build.measurement_unit.value ?? '') : '', mixed: !build.measurement_unit.equal, changed: false },
      measurement_type_other: { value: build.measurement_type_other.equal ? String(build.measurement_type_other.value ?? '') : '', mixed: !build.measurement_type_other.equal, changed: false },
      measurement_unit_other: { value: build.measurement_unit_other.equal ? String(build.measurement_unit_other.value ?? '') : '', mixed: !build.measurement_unit_other.equal, changed: false },
      stock: { value: build.stock.equal ? String(build.stock.value ?? '') : '', mixed: !build.stock.equal, changed: false },
      sku: { value: build.sku.equal ? String(build.sku.value ?? '') : '', mixed: !build.sku.equal, changed: false },
      supplier: { value: build.supplier.equal ? String(build.supplier.value ?? '') : '', mixed: !build.supplier.equal, changed: false },
    })

    // Unir imágenes (para mostrar y permitir eliminar en todos)
    const setImgs = new Set<string>()
    for (const g of group) {
      const arr = Array.isArray(g.image_url) ? g.image_url : (g.image_url ? [g.image_url] : (g.image ? [g.image] : []))
      for (const u of (arr as string[])) if (u) setImgs.add(u)
    }
  setBulkImages(Array.from(setImgs))

    // Construir mapa de variantes: unit_size -> descripción (mixto si difiere)
    const bySize = new Map<string, string[]>()
    for (const g of group) {
      const size = formatUnitSizeDisplay(g.unit_size)
      if (!size) continue
      const arr = bySize.get(size) || []
      arr.push(g.description || '')
      bySize.set(size, arr)
    }
    const v: Record<string, { value: string; mixed: boolean; changed: boolean }> = {}
    for (const [size, descs] of bySize.entries()) {
      const first = descs[0] ?? ''
      const equal = descs.every(d => (d || '') === (first || ''))
      v[size] = { value: equal ? first : '', mixed: !equal, changed: false }
    }
    setBulkVariants(v)
    // Construir filas por producto
    setBulkVariantRows(group.map(g => ({
      id: g.id,
      sku: g.sku || '',
      size: formatUnitSizeDisplay(g.unit_size),
      desc: g.description || '',
      sizeChanged: false,
      descChanged: false,
    })))
    setBulkOpen(true)
  }

  const bulkAddImages = async (files: FileList | null) => {
    if (!files || files.length === 0 || bulkIds.length === 0) return
    setBulkUploading(true)
    try {
  const uploaded: string[] = []
      for (const file of Array.from(files)) {
        const fd = new FormData()
        const filename = `${file.name}`
        fd.append('file', file)
        fd.append('filename', filename)
        const res = await fetch('/api/products/upload', { method: 'POST', body: fd })
        if (!res.ok) throw new Error('Upload failed')
        const json = await res.json()
        const u: string | undefined = json.publicUrl || json.url
        if (u) uploaded.push(u)
      }
      // Actualizar cada producto: agregar imágenes
      for (const id of bulkIds) {
        const prod = products.find(p => p.id === id)
        const current = getCurrentImages(prod)
        const updated = [...current, ...uploaded]
        const saveRes = await fetch('/api/products', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, image: updated }) })
        if (!saveRes.ok) console.error('Bulk add image failed for', id)
      }
      setBulkImages(prev => Array.from(new Set([...prev, ...uploaded])))
      await fetchProducts()
    } catch (e) {
      console.error('bulkAddImages error', e)
    } finally {
      setBulkUploading(false)
    }
  }

  const bulkRemoveImage = async (url: string) => {
    try {
      for (const id of bulkIds) {
        const prod = products.find(p => p.id === id)
        const current = getCurrentImages(prod)
        const updated = current.filter(u => u !== url)
        const saveRes = await fetch('/api/products', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, image: updated }) })
        if (!saveRes.ok) console.error('Bulk remove image failed for', id)
      }
      setBulkImages(prev => prev.filter(u => u !== url))
      await fetchProducts()
    } catch (e) {
      console.error('bulkRemoveImage error', e)
    }
  }

  const bulkSave = async () => {
    try {
      for (const id of bulkIds) {
        const patch: Record<string, unknown> = { id }
        // Mapear solo los campos cambiados
        if (bulk.name.changed) patch.name = bulk.name.value
        if (bulk.description.changed) patch.description = bulk.description.value
        if (bulk.manufacturer.changed) patch.manufacturer = bulk.manufacturer.value
        // Características: si son globales en bulk, no deben sobreescribir las individuales
        if (bulk.characteristics.changed) {
          const prod = products.find(p => p.id === id)
          const currentList: string[] = Array.isArray(prod?.characteristics) ? (prod?.characteristics as string[]) : []
          // Global input (comma separated) -> strings -> pairs
          const globalTokens = bulk.characteristics.value.split(',').map(s => s.trim()).filter(Boolean)
          const globalPairs = parsePairsFromStrings(globalTokens)
          const existingPairs = parsePairsFromStrings(currentList)
          // Build a map by normalized title to preserve existing entries
          const titleKey = (t: string) => t.trim().toLowerCase()
          const existingMap = new Map<string, { title: string; detail: string }>()
          for (const p of existingPairs) existingMap.set(titleKey(p.title), p)
          // Append only those global pairs that don't already exist by title
          const merged: { title: string; detail: string }[] = [...existingPairs]
          for (const gp of globalPairs) {
            const key = titleKey(gp.title)
            if (!existingMap.has(key)) merged.push(gp)
          }
          patch.characteristics = combinePairsToStrings(merged)
        }
        if (bulk.features.changed) patch.features = bulk.features.value.split(',').map(s => s.trim()).filter(Boolean)
        if (bulk.applications.changed) patch.applications = bulk.applications.value.split(',').map(s => s.trim()).filter(Boolean)
        if (bulk.price.changed) {
          const n = Number(bulk.price.value)
          patch.price = Number.isFinite(n) ? n : null
        }
        if (bulk.visible.changed) {
          if (bulk.visible.value === 'true') patch.visible = true
          else if (bulk.visible.value === 'false') patch.visible = false
        }
        if (bulk.order.changed) {
          const n = Number(bulk.order.value)
          if (Number.isFinite(n)) patch.order = n
        }
        if (bulk.unit_size.changed) {
          const val = convertFractionToDecimal(bulk.unit_size.value)
          patch.unit_size = typeof val === 'number' && !isNaN(val) ? val : null
        }
        if (bulk.measurement_type.changed) patch.measurement_type = bulk.measurement_type.value || null
        if (bulk.measurement_unit.changed) patch.measurement_unit = bulk.measurement_unit.value || null
        if (bulk.measurement_type_other.changed) patch.measurement_type_other = bulk.measurement_type_other.value || null
        if (bulk.measurement_unit_other.changed) patch.measurement_unit_other = bulk.measurement_unit_other.value || null
        if (bulk.stock.changed) {
          const n = Number(bulk.stock.value)
          patch.stock = Number.isFinite(n) ? n : null
        }
        if (bulk.sku.changed) patch.sku = bulk.sku.value
  if (bulk.supplier.changed) patch.supplier = bulk.supplier.value ? { id: bulk.supplier.value } : ''
        // Aplicar cambios por variante (por producto): tamaño y descripción
        const row = bulkVariantRows.find(r => r.id === id)
        if (row) {
          if (row.sizeChanged) {
            const conv = convertFractionToDecimal(row.size)
            patch.unit_size = typeof conv === 'number' && !isNaN(conv) ? conv : null
          }
          if (row.descChanged) {
            patch.description = row.desc
          }
        }
        // Notar: imágenes ya se gestionan con add/remove arriba. No las sobrescribimos aquí.
        const res = await fetch('/api/products', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
        if (!res.ok) console.error('Bulk save failed for', id)
      }
      setBulkOpen(false)
      await fetchProducts()
  // revalidate public pages so changes become visible immediately
  try { await fetch('/api/revalidate', { method: 'POST' }) } catch (e) { console.error('Revalidate failed', e) }
      setAlert({ type: 'success', message: 'Cambios aplicados a productos con el mismo nombre.' })
    } catch (e) {
      console.error('bulkSave error', e)
      setAlert({ type: 'error', message: 'Error aplicando cambios en lote.' })
    }
  }

  const togglePublish = async (product: Product) => {
    setSavingId(product.id)
    try {
      const res = await fetch('/api/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: product.id, visible: !product.visible }),
      })
      if (!res.ok) throw new Error('Error toggling')
      await fetchProducts()
      try { await fetch('/api/revalidate', { method: 'POST' }) } catch (e) { console.error('Revalidate failed', e) }
    } catch (error) {
      console.error('Toggle publish error', error)
    } finally {
      setSavingId(null)
    }
  }

  const handleProductSearch = useCallback(async (query: string) => {
    const term = query.trim()
    if (term.length < 2) {
      setMatchingProducts([])
      setShowMatches(false)
      return
    }
    try {
      const res = await fetch(`/api/products?name=${encodeURIComponent(term)}`)
      if (!res.ok) throw new Error('Error fetching matching products')
      const data = await res.json()
      const matches: Product[] = data.products || []
      setMatchingProducts(matches)
      setShowMatches(matches.length > 0)
    } catch (error) {
      console.error('Error searching products:', error)
      setMatchingProducts([])
      setShowMatches(false)
    }
  }, [])

  useEffect(() => {
    const term = (newProduct.name || '').trim()
    if (skipMatchSearch.current) {
      skipMatchSearch.current = false
      return
    }
    if (term.length < 2) {
      setMatchingProducts([])
      setShowMatches(false)
      return
    }
    const timer = window.setTimeout(() => {
      handleProductSearch(term)
    }, 250)
    return () => clearTimeout(timer)
  }, [handleProductSearch, newProduct.name])

  const handleSelectProduct = (product: Product) => {
    skipMatchSearch.current = true
    const features = Array.isArray(product.features) ? [...product.features] : []
    const applications = Array.isArray(product.applications) ? [...product.applications] : []
    const characteristics = Array.isArray(product.characteristics) ? [...product.characteristics] : []
  const unitSizeValue = product.unit_size != null ? formatUnitSizeDisplay(product.unit_size) : ''

    // Auto-seleccionar imágenes del producto elegido para reutilizarlas en el nuevo
    const imgsRaw = (product as unknown as { image_url?: string | string[] }).image_url
    const imgs = Array.isArray(imgsRaw) ? imgsRaw : (imgsRaw ? [imgsRaw] : [])
    if (imgs && imgs.length) {
      setSelectedExistingImages(imgs.filter(Boolean) as string[])
    } else {
      setSelectedExistingImages([])
    }

    setNewProduct(prev => ({
      ...prev,
      name: product.name || '',
      description: product.description || '',
      manufacturer: product.manufacturer || '',
  price: product.price ?? prev.price ?? undefined,
  order: product.order ?? prev.order ?? 0,
  stock: product.stock ?? prev.stock ?? undefined,
      features,
      applications,
      characteristics,
      measurement_type: product.measurement_type || '',
      measurement_unit: product.measurement_unit || '',
      measurement_type_other: product.measurement_type_other || '',
      measurement_unit_other: product.measurement_unit_other || '',
  unit_size: unitSizeValue,
  sku: '',
      supplier: product.supplier || null,
      image: (Array.isArray(product.image_url) ? (product.image_url[0] || prev.image) : (product.image || (product.image_url as string) || prev.image)) as string | undefined,
      _file: null,
    }))

  // Prefill pares para creación con datos del producto base
  setCharRows(parsePairsFromStrings(characteristics))
  setAppRows(parsePairsFromStrings(applications))

    // Prefill variantes con el tamaño y descripción del producto base
    setUnitSizeInputs([unitSizeValue])
    setDescriptionInputs([product.description || ''])

    setNewProductPriceDisplay(product.price != null ? formatCurrencyInput(product.price) : '')

    if (product.supplier && typeof product.supplier === 'object') {
      const supplierObj = product.supplier as { id: string; name: string }
      const found = allSuppliers.find(s => String(s.id) === String(supplierObj.id))
      if (found) {
        setSupplierSelected(found)
        setSupplierQuery(found.name)
      } else {
        setSupplierSelected(null)
        setSupplierQuery(supplierObj.name)
      }
    } else if (typeof product.supplier === 'string' && product.supplier.trim().length) {
      const supplierName = product.supplier as string
      const found = allSuppliers.find(s => s.name.toLowerCase() === supplierName.toLowerCase())
      setSupplierSelected(found || null)
      setSupplierQuery(supplierName)
    } else {
      setSupplierSelected(null)
      setSupplierQuery('')
    }

    setMatchingProducts([])
    setShowMatches(false)
  }

  return (
    <div className="relative">
      <BulkModal open={bulkOpen} name={bulkName} onClose={() => setBulkOpen(false)}>
        <div className="grid grid-cols-1 gap-3">
          {/* Reutilización del editor individual en modo BULK */}
          <ProductEditor
            mode="bulk"
            allSuppliers={allSuppliers}
            unitLabels={unitLabels}
            bulkState={bulk}
            onBulkChange={(field, value) => {
              setBulk(prev => {
                if (field in prev) {
                  const k = field as keyof typeof prev;
                  return {
                    ...prev,
                    [k]: {
                      ...prev[k],
                      value,
                      changed: true
                    }
                  };
                }
                return prev;
              });
            }}
          />
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-800">Imágenes (todos)</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {bulkImages.map((url, idx) => (
                <div key={`bulk-${idx}`} className="relative inline-block">
                  <div className="w-16 h-16 border rounded bg-white overflow-hidden relative">
                    <Image src={url} alt={`bimg-${idx}`} fill className="object-contain" sizes="64px" />
                  </div>
                  <button type="button" onClick={() => bulkRemoveImage(url)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center shadow" title="Eliminar de todos">×</button>
                </div>
              ))}
              {bulkImages.length === 0 && (
                <div className="text-xs text-gray-500">Sin imágenes</div>
              )}
            </div>
            <label className="inline-flex items-center px-3 py-2 bg-gray-200 text-gray-800 rounded cursor-pointer text-sm hover:bg-gray-300">
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { bulkAddImages(e.target.files); e.currentTarget.value = '' }} />
              Añadir imágenes a todos
            </label>
            {bulkUploading && <span className="ml-2 text-xs text-gray-500">Subiendo…</span>}
          </div>
          {/* Variantes (3 columnas): SKU, Tamaño (editable), Descripción (editable) */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-800">Variantes (Tamaño de unidad) y Descripción</label>
            {bulkVariantRows.length === 0 && (
              <div className="text-xs text-gray-500">No se detectaron variantes en la selección.</div>
            )}
            {bulkVariantRows.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-[auto_minmax(6.5rem,9rem)_1fr] gap-y-2 md:gap-x-1 text-sm">
                <div className="hidden md:contents font-medium text-gray-700">
                  <div>SKU</div>
                  <div className="text-center">Tamaño de unidad</div>
                  <div>Descripción por variante</div>
                </div>
                {bulkVariantRows
                  .slice()
                  .sort((a, b) => {
                    const av = convertFractionToDecimal(a.size)
                    const bv = convertFractionToDecimal(b.size)
                    const an = typeof av === 'number' ? av : Number.NaN
                    const bn = typeof bv === 'number' ? bv : Number.NaN
                    if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn
                    if (!Number.isNaN(an)) return -1
                    if (!Number.isNaN(bn)) return 1
                    return a.size.localeCompare(b.size)
                  })
                  .map(row => (
                    <div key={row.id} className="contents">
                      <div className="flex items-center">
                        <span className="inline-flex px-2 py-1 rounded bg-gray-100 text-gray-800 border border-gray-200 text-xs">
                          {row.sku || '—'}
                        </span>
                      </div>
                      <div>
                        <input
                          type="text"
                          className="w-full border rounded px-2 py-1 bg-white text-gray-800 text-center placeholder:text-center"
                          style={{ textAlign: 'center' }}
                          value={row.size}
                          onChange={(e) => {
                            const val = e.target.value
                            setBulkVariantRows(prev => prev.map(r => r.id === row.id ? { ...r, size: val, sizeChanged: true } : r))
                          }}
                          placeholder="Ej: 1 1/2"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          className="w-full border rounded px-2 py-1 bg-white text-gray-800"
                          value={row.desc}
                          onChange={(e) => {
                            const val = e.target.value
                            setBulkVariantRows(prev => prev.map(r => r.id === row.id ? { ...r, desc: val, descChanged: true } : r))
                          }}
                          placeholder="Descripción para esta variante"
                        />
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <button type="button" onClick={() => setBulkOpen(false)} className="px-3 py-1 bg-gray-100 text-gray-800 rounded">Cancelar</button>
            <button type="button" onClick={bulkSave} className="px-3 py-1 bg-red-600 text-white rounded">Guardar en comunes</button>
          </div>
        </div>
      </BulkModal>
      {/* Alerta personalizada (más abajo) */}
      {alert && (
  <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded shadow-lg text-white font-normal transition-all duration-300 ${alert.type === 'success' ? 'bg-gray-400' : 'bg-red-600'}`}
        >
          {alert.message}
        </div>
      )}

      <div className="mt-[64px] min-h-[95vh] flex flex-col">
        <div className="max-w-6xl mx-auto px-4 w-full flex-1 flex flex-col">
        </div>
        <main className="flex-1 flex flex-col">
          <div className="mx-auto w-full flex-1 flex flex-col">
            <div className="flex items-center justify-between">
              {/* Botones flotantes fijos debajo del header, a la derecha */}
              <div className="fixed top-[70px] right-4 z-30 flex flex-col gap-3 items-end">
                <div className="flex flex-row gap-2 items-center">
                  {selectedIds.length > 0 && (
                    <>
                      <button
                        onClick={() => openBulkForIds(selectedIds)}
                        className="px-3 py-1 rounded bg-red-600 text-white shadow-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 transition-all"
                        title="Editar selección"
                      >
                        Editar selección ({selectedIds.length})
                      </button>
                      <button
                        onClick={() => setSelectedIds([])}
                        className="px-3 py-1 rounded bg-gray-100 text-gray-800 shadow-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-all"
                        title="Limpiar selección"
                      >
                        Limpiar
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setShowCreateForm(prev => !prev)}
                    aria-label={showCreateForm ? 'Cerrar crear producto' : 'Crear producto'}
                    title={showCreateForm ? 'Cerrar crear producto' : 'Crear producto'}
                    className="p-2 rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 transition-all flex items-center justify-center"
                  >
                    {showCreateForm ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16M4 12h16" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={fetchProducts}
                    aria-label="Actualizar productos"
                    className="p-2 rounded-full bg-gray-100 text-red-600 shadow-lg hover:bg-gray-200 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-400 transition-all flex items-center justify-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                      <polyline points="23 4 23 10 17 10" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"></polyline>
                      <polyline points="1 20 1 14 7 14" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"></polyline>
                      <path d="M3.51 9a9 9 0 0 1 14.13-3.36" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"></path>
                      <path d="M20.49 15a9 9 0 0 1-14.13 3.36" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {showCreateForm && (
              <div className="bg-gray-50 shadow rounded p-4 mb-6">
                <h3 className="text-lg font-semibold mb-3 text-gray-900">Crear producto</h3>
                {/* Si hay coincidencias, mostrar imágenes existentes para seleccionar */}
                {showMatches && matchingProducts.length > 0 && (
                  <div className="mb-4">
                    <div className="font-semibold mb-2 text-sm">Imágenes de productos existentes con el mismo nombre:</div>
                    <div className="flex gap-2 flex-wrap">
                      {matchingProducts.map((mp) => {
                        const imgs = Array.isArray(mp.image_url) ? mp.image_url : mp.image_url ? [mp.image_url] : [];
                          return imgs.map((url, idx) => (
                          <button
                            key={url + idx}
                            type="button"
                            className={`border rounded w-16 h-16 p-1 flex items-center justify-center bg-white ${selectedExistingImages.includes(url) ? 'ring-2 ring-blue-500' : ''}`}
                            onClick={() => setSelectedExistingImages(prev => prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url])}
                          >
                            <div className="relative w-full h-full">
                              <Image src={url} alt={`img-${idx}`} fill className="object-contain" sizes="64px" />
                            </div>
                          </button>
                        ))
                      })}
                    </div>
                    <div className="text-xs mt-1 text-gray-500">Haz clic en las imágenes para seleccionarlas y usarlas en el nuevo producto.</div>
                  </div>
                )}
                {/* Mostrar las imágenes que serán subidas (seleccionadas y nuevas) */}
                {(selectedExistingImages.length > 0 || newFiles.length > 0) && (
                  <div className="mb-4">
                    <div className="font-semibold mb-2 text-sm">Imágenes que se subirán:</div>
                    <div className="flex gap-2 flex-wrap">
                      {selectedExistingImages.map((url, idx) => (
                        <div key={url + idx} className="relative border rounded w-16 h-16 p-1 flex items-center justify-center bg-white">
                          <div className="relative w-full h-full">
                            <Image src={url} alt={`img-${idx}`} fill className="object-contain" sizes="64px" />
                          </div>
                          <button
                            type="button"
                            aria-label="Omitir imagen seleccionada"
                            onClick={() => setSelectedExistingImages(prev => prev.filter(u => u !== url))}
                            className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {newFiles.map((f, idx) => (
                        <div key={`nf-${idx}`} className="relative border rounded w-16 h-16 p-1 flex items-center justify-center bg-white">
                          <div className="relative w-full h-full">
                            <Image src={URL.createObjectURL(f)} alt={`preview-${idx}`} fill className="object-contain" sizes="64px" />
                          </div>
                          <button
                            type="button"
                            aria-label="Omitir imagen subida"
                            onClick={() => setNewFiles(prev => prev.filter((_, i) => i !== idx))}
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
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="relative">
                    <label className="block text-sm font-medium mb-1 text-gray-800">Nombre</label>
                    <input
                      autoComplete="off"
                      value={newProduct.name}
                      onFocus={() => matchingProducts.length && setShowMatches(true)}
                      onBlur={() => setTimeout(() => setShowMatches(false), 150)}
                      onChange={(e) => {
                        const value = e.target.value
                        setNewProduct(prev => ({ ...prev, name: value }))
                        setShowMatches(true)
                      }}
                      className="border px-2 py-2 rounded w-full bg-white text-gray-800"
                    />
                    {showMatches && matchingProducts.length > 0 && (
                      <div className="absolute left-0 right-0 mt-1 z-50 max-h-64 overflow-y-auto rounded border border-gray-200 bg-white shadow-lg">
                        {matchingProducts.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => handleSelectProduct(m)}
                            className="w-full text-left px-3 py-2 text-sm text-gray-800 hover:bg-gray-100 focus:bg-gray-100"
                          >
                            <div className="font-medium text-gray-900">{m.name}</div>
                            <div className="font-medium text-gray-900">{m.name}</div>
                            {(m.description || m.measurement_unit || m.manufacturer) && (
                              <div className="text-xs text-gray-500">
                               
                                {m.description}
                                {m.measurement_unit && ` · ${unitLabels[m.measurement_unit] || m.measurement_unit}`}
                                {m.manufacturer && ` · ${m.manufacturer}`}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">SKU</label>
                    <input value={newProduct.sku || ''} disabled placeholder="Se generará automáticamente" className="border px-2 py-2 rounded w-full bg-white text-gray-800" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-800">Fabricante (manufacturer)</label>
                    <input value={newProduct.manufacturer || ''} onChange={(e) => setNewProduct(prev => ({ ...prev, manufacturer: e.target.value }))} className="border px-2 py-1 rounded w-full bg-white text-gray-800" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-800">Proveedor</label>
                    <div>
                      <select value={supplierSelected ? supplierSelected.id : 'NA'} onChange={(e) => {
                        const v = e.target.value
                        if (v === 'NA') { setSupplierSelected(null); setSupplierQuery('') }
                        else {
                          const found = allSuppliers.find(s => String(s.id) === String(v))
                          if (found) { setSupplierSelected(found); setSupplierQuery('') }
                        }
                      }} className="border px-2 py-1 rounded w-full bg-white text-gray-800">
                        <option value="NA">N/A</option>
                        {allSuppliers.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <div className="mt-2 text-xs text-gray-500">O busca arriba para crear un nuevo proveedor</div>
                    </div>
                    <div className="mt-2 text-sm flex items-center gap-3">
                      <label className="inline-flex items-center gap-2">
                        <input type="checkbox" className="form-checkbox" checked={showSupplierDetails} onChange={() => setShowSupplierDetails(v => !v)} />
                        <span className="text-sm text-gray-600">Editar datos proveedor (crear/actualizar)</span>
                      </label>
                      {supplierSelected && (
                        <button type="button" onClick={() => { setSupplierSelected(null); setSupplierQuery('') }} className="text-sm text-blue-600">Quitar selección</button>
                      )}
                    </div>
                    {showSupplierDetails && (
                      <div className="mt-2 grid grid-cols-1 gap-2">
                        <input placeholder="Email" value={(newProduct as NewProduct).supplier_email || ''} onChange={(e) => setNewProduct(prev => ({ ...prev, supplier_email: e.target.value }))} className="border px-2 py-1 rounded w-full bg-white text-gray-800" />
                        <input placeholder="Dirección" value={(newProduct as NewProduct).supplier_address || ''} onChange={(e) => setNewProduct(prev => ({ ...prev, supplier_address: e.target.value }))} className="border px-2 py-1 rounded w-full bg-white text-gray-800" />
                        <input placeholder="País" value={(newProduct as NewProduct).supplier_country || ''} onChange={(e) => setNewProduct(prev => ({ ...prev, supplier_country: e.target.value }))} className="border px-2 py-1 rounded w-full bg-white text-gray-800" />
                      </div>
                    )}
                  </div>

                  {/* Measurement row (Tipo | Tamaño | Unidad) */}
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-800">Tipo de medida</label>
                    <select value={newProduct.measurement_type || ''} onChange={(e) => setNewProduct(prev => ({ ...prev, measurement_type: e.target.value }))} className="border px-2 py-1 rounded w-full bg-white text-gray-800">
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
                      {unitSizeInputs.map((val, idx) => (
                        <div key={`usize-${idx}`} className="flex items-center gap-2">
                          <input
                            value={val}
                            onChange={(e) => {
                              const v = e.target.value
                              setUnitSizeInputs(prev => {
                                const next = [...prev]
                                next[idx] = v
                                return next
                              })
                              // Asegurar la misma cantidad de descripciones
                              setDescriptionInputs(prev => {
                                const next = [...prev]
                                while (next.length < unitSizeInputs.length) next.push('')
                                return next
                              })
                            }}
                            placeholder="ej: 5 o 1 1/8"
                            className="border px-2 py-1 rounded w-full bg-white text-gray-800"
                          />
                          {unitSizeInputs.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setUnitSizeInputs(prev => prev.filter((_, i) => i !== idx))
                                setDescriptionInputs(prev => prev.filter((_, i) => i !== idx))
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
                            // Solo agregar si el último tiene algo o si no hay ninguno
                            const last = unitSizeInputs[unitSizeInputs.length - 1]
                            if (unitSizeInputs.length === 0 || (last && last.trim().length > 0)) {
                              setUnitSizeInputs(prev => [...prev, ''])
                              setDescriptionInputs(prev => [...prev, ''])
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
                    <select value={newProduct.measurement_unit || ''} onChange={(e) => setNewProduct(prev => ({ ...prev, measurement_unit: e.target.value }))} className="border px-2 py-1 rounded w-full bg-white text-gray-800">
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
                  {/* 'Other' especificar campos eliminados: el valor se guarda directamente en measurement_type/measurement_unit */}

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-800">Precio</label>
                    <input type="text" inputMode="numeric" value={newProductPriceDisplay || formatCurrencyInput(newProduct.price ?? null)} onChange={(e) => {
                      const raw = e.target.value
                      const digits = raw.replace(/\D/g, '')
                      const num = digits ? Number(digits) : undefined
                      setNewProduct(prev => ({ ...prev, price: num }))
                      setNewProductPriceDisplay(num != null ? formatCurrencyInput(num) : '')
                    }} className="border px-2 py-2 rounded w-full bg-white text-gray-800" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-800">Orden</label>
                    <input type="number" value={newProduct.order ?? 0} onChange={(e) => setNewProduct(prev => ({ ...prev, order: Number(e.target.value) }))} className="border px-2 py-2 rounded w-full bg-white text-gray-800" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-800">Stock</label>
                    <input type="number" value={newProduct.stock ?? ''} onChange={(e) => setNewProduct(prev => ({ ...prev, stock: Number(e.target.value) }))} className="border px-2 py-2 rounded w-full bg-white text-gray-800" />
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
                        {newFiles.map((file, idx) => (
                          <div key={`file-${idx}`} className="relative border rounded w-16 h-16 p-1 flex items-center justify-center bg-white">
                            <div className="relative w-full h-full">
                              <Image src={URL.createObjectURL(file)} alt={`file-${idx}`} fill className="object-contain" sizes="64px" />
                            </div>
                            <button type="button" onClick={() => setNewFiles(prev => prev.filter((_, i) => i !== idx))} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center">×</button>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="inline-flex items-center px-3 py-2 bg-gray-200 text-gray-800 rounded cursor-pointer text-sm hover:bg-gray-300">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              const add = Array.from(e.target.files || [])
                              if (add.length) setNewFiles(prev => [...prev, ...add])
                              // limpia el input para permitir re-seleccionar el mismo archivo si se desea
                              e.currentTarget.value = ''
                            }}
                          />
                          Añadir imágenes
                        </label>
                        {newFiles.length > 0 && (
                          <button type="button" onClick={() => setNewFiles([])} className="text-sm px-2 py-1 bg-red-50 text-red-600 rounded">Limpiar</button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-800">Características</label>
                    <div className="flex flex-col gap-2">
                      {(charRows.length === 0 ? [{} as Pair] : charRows).map((row, idx) => (
                        <div key={`char-${idx}`} className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start">
                          <input
                            placeholder="Título (se mostrará en negrita)"
                            value={row.title || ''}
                            onChange={(e) => {
                              setCharRows(prev => {
                                const base = prev.length === 0 ? [{} as Pair] : [...prev]
                                const next = [...base]
                                next[idx] = { ...(next[idx] || { title: '', detail: '' }), title: e.target.value }
                                return next
                              })
                              setNewProduct(prev => ({ ...prev, characteristics: combinePairsToStrings((charRows.length === 0 ? [{ title: e.target.value, detail: '' }] : charRows.map((r, i) => i === idx ? { ...r, title: e.target.value } : r))) }))
                            }}
                            className="border px-2 py-1 rounded w-full bg-white text-gray-800"
                          />
                          <input
                            placeholder="Detalle (opcional)"
                            value={row.detail || ''}
                            onChange={(e) => {
                              setCharRows(prev => {
                                const base = prev.length === 0 ? [{} as Pair] : [...prev]
                                const next = [...base]
                                next[idx] = { ...(next[idx] || { title: '', detail: '' }), detail: e.target.value }
                                return next
                              })
                              setNewProduct(prev => ({ ...prev, characteristics: combinePairsToStrings((charRows.length === 0 ? [{ title: (row.title || ''), detail: e.target.value }] : charRows.map((r, i) => i === idx ? { ...r, detail: e.target.value } : r))) }))
                            }}
                            className="border px-2 py-1 rounded w-full bg-white text-gray-800"
                          />
                          { (charRows.length > 0) && (
                            <div className="md:col-span-2 flex justify-end">
                              <button type="button" onClick={() => {
                                setCharRows(prev => prev.filter((_, i) => i !== idx))
                                setNewProduct(prev => ({ ...prev, characteristics: combinePairsToStrings(charRows.filter((_, i) => i !== idx)) }))
                              }} className="text-xs px-2 py-1 bg-gray-200 rounded">Quitar</button>
                            </div>
                          )}
                        </div>
                      ))}
                      <div>
                        <button type="button" onClick={() => {
                          setCharRows(prev => [...prev, { title: '', detail: '' }])
                        }} className="text-sm px-2 py-1 bg-red-50 text-red-600 rounded">Añadir característica</button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-800">Aplicaciones</label>
                    <div className="flex flex-col gap-2">
                      {(appRows.length === 0 ? [{} as Pair] : appRows).map((row, idx) => (
                        <div key={`app-${idx}`} className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start">
                          <input
                            placeholder="Título (se mostrará en negrita)"
                            value={row.title || ''}
                            onChange={(e) => {
                              setAppRows(prev => {
                                const base = prev.length === 0 ? [{} as Pair] : [...prev]
                                const next = [...base]
                                next[idx] = { ...(next[idx] || { title: '', detail: '' }), title: e.target.value }
                                return next
                              })
                              setNewProduct(prev => ({ ...prev, applications: combinePairsToStrings((appRows.length === 0 ? [{ title: e.target.value, detail: '' }] : appRows.map((r, i) => i === idx ? { ...r, title: e.target.value } : r))) }))
                            }}
                            className="border px-2 py-1 rounded w-full bg-white text-gray-800"
                          />
                          <input
                            placeholder="Detalle (opcional)"
                            value={row.detail || ''}
                            onChange={(e) => {
                              setAppRows(prev => {
                                const base = prev.length === 0 ? [{} as Pair] : [...prev]
                                const next = [...base]
                                next[idx] = { ...(next[idx] || { title: '', detail: '' }), detail: e.target.value }
                                return next
                              })
                              setNewProduct(prev => ({ ...prev, applications: combinePairsToStrings((appRows.length === 0 ? [{ title: (row.title || ''), detail: e.target.value }] : appRows.map((r, i) => i === idx ? { ...r, detail: e.target.value } : r))) }))
                            }}
                            className="border px-2 py-1 rounded w-full bg-white text-gray-800"
                          />
                          { (appRows.length > 0) && (
                            <div className="md:col-span-2 flex justify-end">
                              <button type="button" onClick={() => {
                                setAppRows(prev => prev.filter((_, i) => i !== idx))
                                setNewProduct(prev => ({ ...prev, applications: combinePairsToStrings(appRows.filter((_, i) => i !== idx)) }))
                              }} className="text-xs px-2 py-1 bg-gray-200 rounded">Quitar</button>
                            </div>
                          )}
                        </div>
                      ))}
                      <div>
                        <button type="button" onClick={() => {
                          setAppRows(prev => [...prev, { title: '', detail: '' }])
                        }} className="text-sm px-2 py-1 bg-red-50 text-red-600 rounded">Añadir aplicación</button>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1 text-gray-800">Descripción por variante</label>
                    <div className="flex flex-col gap-2">
                      {descriptionInputs.map((val, idx) => (
                        <textarea
                          key={`desc-${idx}`}
                          value={val}
                          onChange={(e) => {
                            const v = e.target.value
                            setDescriptionInputs(prev => {
                              const next = [...prev]
                              next[idx] = v
                              return next
                            })
                          }}
                          placeholder={`Descripción para variante ${idx + 1}`}
                          className="border px-2 py-2 rounded w-full bg-white text-gray-800"
                          rows={2}
                        />
                      ))}
                      {descriptionInputs.length === 0 && (
                        <div className="text-xs text-gray-500">Se usará la descripción del producto si no se especifica.</div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Si no llenas una descripción, se usará vacía para esa variante.</div>
                  </div>
                </div>
                <div className="mt-3">
                  <button
                    disabled={creating}
                    onClick={async () => {
                      // 1) Construir lista de imágenes (existentes + nuevas subidas)
                      let imageList: string[] | undefined = selectedExistingImages.length > 0 ? [...selectedExistingImages] : undefined
                      if (newFiles.length > 0) {
                        for (const file of newFiles) {
                          const fd = new FormData()
                          const filename = `${file.name}`
                          fd.append('file', file)
                          fd.append('filename', filename)
                          const res = await fetch('/api/products/upload', { method: 'POST', body: fd })
                          const json = await res.json()
                          const persisted: string | undefined = json.publicUrl || json.url
                          if (persisted) imageList = imageList ? [...imageList, persisted] : [persisted]
                        }
                      }

                      // 2) Tomar tamaños desde inputs dinámicos
                      const unitTokens = unitSizeInputs.map(s => s.trim()).filter(Boolean)

                      // 3) Descripciones por índice desde inputs dinámicos
                      const descTokens = descriptionInputs

                      // 4) Campos base del payload
                      const base: Record<string, unknown> = {
                        name: newProduct.name,
                        image: imageList && imageList.length === 1 ? imageList[0] : imageList, // backend acepta string o array en 'image'
                        price: newProduct.price,
                        visible: false,
                        order: newProduct.order,
                        features: newProduct.features || [],
                        // Usar pares Título/Detalle transformados
                        applications: combinePairsToStrings(appRows),
                        characteristics: combinePairsToStrings(charRows),
                        stock: newProduct.stock ?? null,
                        measurement_type: newProduct.measurement_type || null,
                        measurement_unit: newProduct.measurement_unit || null,
                        measurement_type_other: newProduct.measurement_type_other || null,
                        measurement_unit_other: newProduct.measurement_unit_other || null,
                        manufacturer: newProduct.manufacturer || null,
                      }

                      // 5) Supplier
                      let supplierPayload: unknown = undefined
                      if (supplierSelected) {
                        supplierPayload = { id: supplierSelected.id, name: supplierSelected.name }
                      } else if (showSupplierDetails && (newProduct.supplier_email || newProduct.supplier_address || newProduct.supplier_country || supplierQuery)) {
                        supplierPayload = {
                          name: supplierQuery || newProduct.supplier || newProduct.manufacturer || 'Proveedor',
                          email: newProduct.supplier_email || null,
                          address: newProduct.supplier_address || null,
                          country: newProduct.supplier_country || null,
                        }
                      } else {
                        const typed = supplierQuery || (newProduct.supplier as string) || ''
                        if (typed) supplierPayload = typed
                      }

                      setCreating(true)
                      try {
                        // 6) Lógica multi-variantes: si no hay tokens, crear uno solo
                        const variants = unitTokens.length > 0 ? unitTokens : ['']
                        let created = 0
                        const errors: string[] = []

                        for (let i = 0; i < variants.length; i++) {
                          const ut = variants[i]
                          let decimal: number | null = null
                          if (ut) {
                            const conv = convertFractionToDecimal(ut)
                            if (typeof conv === 'number' && !isNaN(conv)) decimal = conv
                            else {
                              errors.push(`Tamaño inválido: "${ut}"`)
                              continue
                            }
                          }

                          const descriptionForI = descTokens.length > 0 ? (descTokens[i] ?? '') : (descriptionInputs[0] || newProduct.description || '')

                          const payload: Record<string, unknown> = {
                            ...base,
                            unit_size: decimal,
                            description: descriptionForI,
                          }
                          if (supplierPayload !== undefined) {
                            (payload as { supplier?: unknown }).supplier = supplierPayload as unknown
                          }

                          const res = await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                          if (!res.ok) {
                            try {
                              const j = await res.json()
                              errors.push(j?.error || (Array.isArray(j?.errors) ? j.errors.join(', ') : `Error HTTP ${res.status}`))
                            } catch {
                              errors.push(`Error HTTP ${res.status}`)
                            }
                          } else {
                            created++
                          }
                        }

                        await fetchProducts()
                        setNewProduct({ name: '', description: '', price: 0, visible: false, order: 0, features: [], applications: [], characteristics: [], unit_size: '', measurement_type: '', measurement_unit: '', measurement_type_other: '', measurement_unit_other: '', stock: 0, manufacturer: '', supplier: '', _file: null })
                        setCharRows([])
                        setAppRows([])
                        setUnitSizeInputs([''])
                        setDescriptionInputs([''])
                        setSupplierSelected(null)
                        setSupplierQuery('')
                        setShowSupplierDetails(false)
                        setShowCreateForm(false)
                        setSelectedExistingImages([])
                        setNewFiles([])
                        if (errors.length === 0) {
                          setAlert({ type: 'success', message: created > 1 ? `Se crearon ${created} productos.` : 'Producto creado exitosamente.' })
                        } else if (created > 0) {
                          setAlert({ type: 'error', message: `Se crearon ${created}, con errores en ${errors.length}: ${errors.slice(0, 3).join(' · ')}${errors.length > 3 ? '…' : ''}` })
                        } else {
                          setAlert({ type: 'error', message: `No se creó ningún producto: ${errors.slice(0, 3).join(' · ')}${errors.length > 3 ? '…' : ''}` })
                        }
                      } catch (error) {
                        console.error('Create error', error)
                        setAlert({ type: 'error', message: `Error creando producto${error instanceof Error && error.message ? `: ${error.message}` : ''}` })
                      } finally {
                        setCreating(false)
                      }
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded"
                  >
                    {creating ? 'Creando...' : 'Crear producto'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Restablecer todos los datos del formulario de creación
                      setNewProduct({ name: '', description: '', price: 0, visible: false, order: 0, features: [], applications: [], characteristics: [], unit_size: '', measurement_type: '', measurement_unit: '', measurement_type_other: '', measurement_unit_other: '', stock: 0, manufacturer: '', supplier: '', _file: null })
                      setCharRows([])
                      setAppRows([])
                      setUnitSizeInputs([''])
                      setDescriptionInputs([''])
                      setSupplierSelected(null)
                      setSupplierQuery('')
                      setShowSupplierDetails(false)
                      setSelectedExistingImages([])
                      setNewFiles([])
                      setShowMatches(false)
                      // Cerrar el formulario de creación
                      setShowCreateForm(false)
                    }}
                    className="ml-2 px-4 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {loadingProducts ? (
              <div className="p-8 text-center">Cargando productos...</div>
            ) : (
              <>
                {/* Buscador global sobre todos los campos */}
                <div className="mb-3 flex items-center gap-2">
                  <input
                    value={dashboardQuery}
                    onChange={(e) => setDashboardQuery(e.target.value)}
                    placeholder="Buscar en todos los campos (nombre, descripción, SKU, características, proveedor, etc.)"
                    className="w-full max-w-xl border border-gray-300 px-3 py-2 rounded bg-white text-gray-800"
                    aria-label="Buscar productos en dashboard"
                  />
                  {dashboardQuery && (
                    <button type="button" onClick={() => setDashboardQuery('')} className="px-3 py-2 text-sm bg-gray-100 rounded hover:bg-gray-200">Limpiar</button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-[95vh] content-stretch">
                {[...viewProducts]
                  .sort((a, b) => {
                    // Prioridad: updated_at, luego created_at
                    const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
                    const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
                    return dateB - dateA;
                  })
                  .map((p) => (
                  <div key={p.id} className="bg-white shadow rounded p-3 flex flex-col w-full relative">
                    {/* Selector individual para edición en grupo (ahora en la esquina superior derecha del contenedor del producto) */}
                    <div className="absolute top-2 right-2 z-20">
                      <label className="group cursor-pointer flex items-center justify-center">
                        <input
                          type="checkbox"
                          className="peer appearance-none w-6 h-6 border-2 border-gray-300 rounded-full bg-white checked:bg-red-600 checked:border-red-600 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-red-400 shadow-md"
                          checked={selectedIds.includes(String(p.id))}
                          onChange={() => setSelectedIds(prev => prev.includes(String(p.id)) ? prev.filter(id => id !== String(p.id)) : [...prev, String(p.id)])}
                          aria-label="Seleccionar para edición en grupo"
                        />
                        <span className="absolute pointer-events-none w-6 h-6 flex items-center justify-center">
                          <svg className="opacity-0 peer-checked:opacity-100 transition-opacity duration-150" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 9 8 13 14 6" /></svg>
                        </span>
                      </label>
                    </div>
                    <div className="flex flex-row items-start gap-4 flex-1">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-gray-900 leading-tight mb-1 break-words">{p.name}</h3>
                        <p className="text-xs text-gray-600 mb-2 break-words line-clamp-2">{p.description || 'Sin descripción'}</p>
                        {/* Otros datos debajo del nombre y descripción */}
                        <div className="mt-1 text-xs text-gray-700 space-y-1">
                          <div>
                            <strong>Unidad:</strong>{' '}
                            {p.unit_size ? (
                              <span className="font-semibold text-gray-500">
                                {formatUnitSizeDisplay(p.unit_size)}
                                {unitSymbols[p.measurement_unit || ''] ? unitSymbols[p.measurement_unit || ''] : ` ${unitLabels[p.measurement_unit || ''] || p.measurement_unit || ''}`}
                              </span>
                            ) : (
                              <span className="font-semibold text-gray-600">{unitLabels[p.measurement_unit || ''] || '—'}</span>
                            )}
                          </div>
                          <div>
                            <strong>Stock:</strong> <span className="font-semibold text-gray-600">{p.stock ?? '—'}</span> · <strong>Precio:</strong> <span className="font-semibold text-gray-600">{formatPrice(p.price)}</span>
                          </div>
                          <div>
                            <strong>SKU:</strong> <span className="font-semibold text-gray-600">{p.sku || '—'}</span>
                          </div>
                          <div className="text-gray-700">
                            <span className="font-semibold">Características:</span>{' '}
                            {p.characteristics && p.characteristics.length ? (
                              p.characteristics.map((c, i) => {
                                const str = String(c)
                                const idx = str.indexOf(':')
                                return (
                                  <span key={`ch-${p.id}-${i}`} className="text-gray-600">
                                    {idx >= 0 ? (
                                      <>
                                        <span className="font-semibold">{str.slice(0, idx)}</span>: {str.slice(idx + 1).trim()}
                                      </>
                                    ) : (
                                      <span className="font-semibold">{str}</span>
                                    )}
                                    {i < (p.characteristics?.length || 0) - 1 ? ', ' : null}
                                  </span>
                                )
                              })
                            ) : (
                              '—'
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="w-24 aspect-square flex-shrink-0 rounded overflow-hidden border border-gray-300 bg-white relative">
                        {(() => { const img = Array.isArray(p.image_url) ? p.image_url[0] : (p.image || p.image_url); return !!img })() ? (
                          <div className="relative w-full h-full">
                            <Image src={(Array.isArray(p.image_url) ? p.image_url[0] : (p.image || p.image_url)) as string} alt={p.name} fill className="object-contain" sizes="160px" />
                          </div>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 p-2">
                            <PhotoIcon className="w-10 h-10 mb-2 text-gray-300" />
                            <div className="text-xs font-medium">no image</div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-auto pt-3">
                      {!editingMap[p.id] && (
                        <div className="flex flex-row gap-2 min-w-[120px]">
                          <button onClick={() => startEdit(p.id)} className="text-xs px-1 py-2 bg-yellow-400 text-black rounded w-full">Editar</button>
                          <button onClick={() => togglePublish(p)} className={`text-xs px-1 py-2 rounded w-full ${p.visible ? 'bg-gray-200 text-gray-700' : 'bg-blue-600 text-white'}`}>{p.visible ? 'Despublicar' : 'Publicar'}</button>
                          <button onClick={() => openBulkForName(p.name)} className="text-xs px-1 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200 w-full">Editar grupo</button>
                        </div>
                      )}
                      {editingMap[p.id] && (
                        <div className="mt-1 bg-white border rounded p-3 w-full shadow-sm">
                          <ProductEditor
                            product={p}
                            onProductChange={(field, value) => {
                              setProducts(prev => prev.map(prod => prod.id === p.id ? { ...prod, [field]: value } : prod));
                            }}
                            allSuppliers={allSuppliers}
                            unitLabels={unitLabels}
                            mode="single"
                          />
                          <div className="flex gap-2 mt-2">
                            <button type="button" onClick={() => cancelEdit(p.id)} className="px-3 py-1 bg-gray-100 text-gray-800 rounded">Cancelar</button>
                            <button type="button" onClick={() => save(p)} className="px-3 py-1 bg-red-600 text-white rounded">Guardar</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {viewProducts.length === 0 && (
                  <div className="p-8 text-center col-span-1 md:col-span-2 lg:col-span-3">
                    {products.length === 0 ? 'No hay productos disponibles.' : 'Sin resultados para la búsqueda.'}
                  </div>
                )}
              </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

// Modal simple para edición masiva
// Nota: Reutiliza estilos Tailwind ya presentes
function BulkModal({ open, name, onClose, children }: { open: boolean; name: string; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded shadow max-w-3xl w-full mx-4 max-h-[90vh] flex flex-col">
        <div className="p-3 border-b flex items-center justify-between">
          <div className="font-semibold text-gray-800">Editar grupo: {name}</div>
          <button onClick={onClose} className="text-sm px-2 py-1 bg-gray-100 rounded">Cerrar</button>
        </div>
        <div className="p-4 overflow-y-auto flex-1 min-h-0">
          {children}
        </div>
      </div>
    </div>
  )
}
