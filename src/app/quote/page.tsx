"use client"

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useState, useEffect } from 'react';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import { State, City, Country } from 'country-state-city';
import { ArrowLeftIcon, ArrowRightIcon, TrashIcon } from '@heroicons/react/24/outline';
import Image from 'next/image'
import { formatCLP } from '@/lib/format'

type StoredQuoteItem = { 
  id: string | number; 
  name?: string; 
  qty: number; 
  price?: number;
  description?: string | null;
  image_url?: string | null;
  unit_size?: string | null;
  measurement_unit?: string | null;
  characteristics?: string[];
}

type Product = {
  id: string | number
  name: string
  description?: string | null
  image?: string | null
  image_url?: string | null
  price?: number | null
  unit_size?: string | null
  measurement_unit?: string | null
  characteristics?: string[]
  sku?: string | null
  visible?: boolean | null
}

// productos cargados desde la API
const initialProducts: Product[] = []


export default function QuotePage() {
  const [list, setList] = useState<{id:string|number, name:string, price:number, qty:number, total:number}[]>([]);
  const [, setCurrent] = useState(0);
  const [search, setSearch] = useState('');
  // Estado para productos y productos en orden aleatorio
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [randomizedProducts, setRandomizedProducts] = useState<Product[]>([])

  // Filtrar productos públicos
  const publicProducts = Array.isArray(products) ? products.filter(p => p.visible === true) : []
  const publicRandomizedProducts = Array.isArray(randomizedProducts) ? randomizedProducts.filter(p => p.visible === true) : []
  const [selected, setSelected] = useState(null as null | Product);
  const [qty, setQty] = useState(1);
  const [contact, setContact] = useState({
    rut: '',
    company: '',
    email: '',
    phone: '',
    address: '',
    contactName: '',
    document: '',
    country: 'CL',
    region: '',
    city: '',
    postal_code: '',
    notes: ''
  })
  const [errors, setErrors] = useState<{
    rut?: string;
    company?: string;
    email?: string;
    phone?: string;
    address?: string;
    contactName?: string;
    country?: string;
    region?: string;
    city?: string;
  }>({})
  const [regionList, setRegionList] = useState<any[]>([]);
  const [cityList, setCityList] = useState<any[]>([]);
  const [countryList, setCountryList] = useState<any[]>([]);
  useEffect(() => {
    try {
      const states = State.getStatesOfCountry(contact.country || 'CL') || [];
      setRegionList(states);
      setCityList([]);
    } catch {
      setRegionList([]);
      setCityList([]);
    }
  }, [contact.country]);

  useEffect(() => {
    try {
      const countries = Country.getAllCountries() || [];
      // Map to simple shape { code, name }
      const mapped = countries.map((c: any) => ({ code: c.isoCode, name: c.name }));
      setCountryList(mapped);
    } catch {
      setCountryList([]);
    }
  }, []);
  const [submitting, setSubmitting] = useState(false)
  const [, setSubmitMessage] = useState<string | null>(null)
  const filtered = publicProducts.filter(p =>
    (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(search.toLowerCase())
  )
  // El producto mostrado depende solo del buscador o selección manual
  const shownProduct = search ? filtered[0] : selected;
  // Resetear cantidad cuando cambia el producto
  useEffect(() => { setQty(1); }, [shownProduct?.id]);

  // On mount: load saved quote from localStorage and fetch product details
  useEffect(() => {
    let mounted = true
    fetch('/api/products?public=true')
      .then(r => r.json())
      .then((data) => {
        if (!mounted) return
        const arr = Array.isArray(data?.products)
          ? data.products
          : Array.isArray(data)
            ? data
            : []
        setProducts(arr as Product[])
        // Generar orden aleatorio solo una vez
        const randomized = [...arr].sort(() => Math.random() - 0.5)
        setRandomizedProducts(randomized)
      })
      .catch(err => console.error('Error fetching products for quote page', err))

    // load saved quote after products fetched (so we can find images/prices)
    try {
      const raw = localStorage.getItem('fasercon_quote')
      if (!raw) return
      const saved: StoredQuoteItem[] = JSON.parse(raw)
      if (!Array.isArray(saved) || saved.length === 0) return
      // Añadir productos guardados con sus datos completos a la lista de productos
      const savedProducts: Product[] = saved.map(s => ({
        id: s.id,
        name: s.name || 'Producto',
        description: s.description,
        image_url: s.image_url,
        price: s.price ?? null,
        unit_size: s.unit_size,
        measurement_unit: s.measurement_unit,
        characteristics: s.characteristics
      }))
      setProducts(prev => {
        const merged = [...prev]
        savedProducts.forEach(sp => {
          if (!merged.find(p => String(p.id) === String(sp.id))) {
            merged.push(sp)
          }
        })
        return merged
      })
      // También actualizar el orden aleatorio si hay productos guardados
      setRandomizedProducts(prev => {
        const merged = [...prev]
        savedProducts.forEach(sp => {
          if (!merged.find(p => String(p.id) === String(sp.id))) {
            merged.push(sp)
          }
        })
        return merged
      })
      const ids = saved.map(s => s.id)
      fetch('/api/products/batch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) })
        .then(r => r.json())
        .then((res) => {
          const data = res.data || []
          const mapped = saved.map(s => {
                const p = Array.isArray(data) ? (data as Array<Record<string, unknown>>).find((d) => String(d['id'] ?? '') === String(s.id)) : undefined
                const price = p ? Number(p['price'] as unknown) : (s.price ?? 0)
                return {
                  id: s.id,
                  name: (p && typeof p['name'] === 'string') ? String(p['name']) : (s.name || 'Producto'),
                  price: Number(price ?? 0),
                  qty: s.qty || 1,
                  total: Number(price ?? s.price ?? 0) * (s.qty || 1),
                }
              })
          setList(mapped)
        })
        .catch(err => console.error('Error fetching batch products', err))
    } catch (e) {
      console.error('Error reading quote from localStorage', e)
    }
    return () => { mounted = false }
  }, [])

  // sync list to localStorage when it changes
  useEffect(() => {
    const toStore = list.map(i => {
      const prod = products.find(p => String(p.id) === String(i.id))
      return {
        id: i.id,
        qty: i.qty,
        name: i.name,
        price: i.price,
        description: prod?.description,
        image_url: prod?.image_url || prod?.image,
        unit_size: prod?.unit_size,
        measurement_unit: prod?.measurement_unit,
        characteristics: prod?.characteristics
      }
    })
    localStorage.setItem('fasercon_quote', JSON.stringify(toStore))
  }, [list, products])

  const totalProducts = Array.isArray(products) ? products.length : 0
  const prev = () => setCurrent((prev) => totalProducts ? (prev - 1 + totalProducts) % totalProducts : 0);
  const next = () => setCurrent((prev) => totalProducts ? (prev + 1) % totalProducts : 0);

  // --- RUT helpers ---
  const cleanRut = (v: string) => v.replace(/[^0-9kK]/g, '').toUpperCase()
  const validateRut = (rutRaw: string): boolean => {
    const v = cleanRut(rutRaw)
    if (v.length < 2) return false
    const body = v.slice(0, -1)
    const dv = v.slice(-1)
    let sum = 0
    let mul = 2
    for (let i = body.length - 1; i >= 0; i--) {
      sum += parseInt(body[i], 10) * mul
      mul = mul === 7 ? 2 : mul + 1
    }
    const res = 11 - (sum % 11)
    const dvCalc = res === 11 ? '0' : res === 10 ? 'K' : String(res)
    return dv === dvCalc
  }
  const formatRut = (rutRaw: string): string => {
    const v = cleanRut(rutRaw)
    if (v.length < 2) return rutRaw
    const body = v.slice(0, -1)
    const dv = v.slice(-1)
    let formatted = ''
    let cnt = 0
    for (let i = body.length - 1; i >= 0; i--) {
      formatted = body[i] + formatted
      cnt++
      if (cnt === 3 && i !== 0) {
        formatted = '.' + formatted
        cnt = 0
      }
    }
    return `${formatted}-${dv}`
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-36 pb-2 flex flex-col items-center w-full">
        {/* Banner de productos destacados tipo carrusel horizontal, más pequeño y sin afectar la selección */}
  <div className="relative bg-white rounded-xl shadow p-2 mb-2 overflow-x-auto w-[90vw] mx-auto">
          <button onClick={prev} className="absolute left-1 top-1/2 -translate-y-1/2 p-1 bg-gray-100 rounded-full hover:bg-gray-200 z-10">
            <ArrowLeftIcon className="h-4 w-4 text-gray-600" />
          </button>
          <div className="flex gap-4 px-8 overflow-x-auto scrollbar-hide">
            {/* El ancho de cada tarjeta se reduce para mostrar más productos a la vez */}
            {Array.isArray(publicRandomizedProducts) &&
              publicRandomizedProducts
                .filter((product, index, self) => index === self.findIndex(p => p.name === product.name))
                .map((product) => (
                  <a
                    key={product.id}
                    href={`/products/${product.id}`}
                    className="min-w-[140px] max-w-[140px] flex-shrink-0 border rounded-lg shadow-sm p-2 bg-gray-50 hover:bg-gray-100 transition-colors block"
                  >
                    <div className="w-full h-20 flex items-center justify-center overflow-hidden rounded mb-1 bg-white relative">
                      <Image
                        src={product.image_url || '/assets/images/no-image.png'}
                        alt={product.name}
                        width={140}
                        height={80}
                        style={{ objectFit: 'contain' }}
                        className="w-full h-full object-contain"
                        priority={false}
                      />
                    </div>
                    <h3 className="text-xs font-semibold text-gray-900 line-clamp-2">{product.name}</h3>
                  </a>
                ))}
      {/* Modal de detalle de producto */}
          </div>
          <button onClick={next} className="absolute right-1 top-1/2 -translate-y-1/2 p-1 bg-gray-100 rounded-full hover:bg-gray-200 z-10">
            <ArrowRightIcon className="h-4 w-4 text-gray-600" />
          </button>
        </div>

        {/* Buscador de productos */}
        <div className="mb-8 flex justify-center">
          {/* <input
            type="text"
            placeholder="Buscar producto..."
            value={search}
            onChange={({ target }) => {
              setSearch(target.value);
              setSelected(null);
            }}
            className="w-[50vw] max-w-xl px-4 py-2 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 shadow"
          /> */}

          {/* Lista de resultados de búsqueda */}
          {search && filtered.length > 0 && (
            <div className="absolute mt-16 bg-white border rounded shadow max-h-48 overflow-y-auto w-full max-w-2xl z-20">
              {filtered.map((product) => (
                <div
                  key={product.id}
                  className="px-4 py-2 cursor-pointer hover:bg-red-50 text-base"
                  onClick={() => {
                    setSelected(product);
                    setSearch('');
                  }}
                >
                  {product.name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detalle del producto mostrado */}
        {shownProduct ? (
          <>
          <div className="bg-white rounded-xl shadow p-6 flex flex-col md:flex-row gap-6 items-center md:items-stretch">
            <div className="flex-shrink-0 flex items-center justify-center h-full relative" style={{ minHeight: 180 }}>
              <div className="w-[260px] h-[180px] relative">
                <Image src={String(shownProduct.image || '/api/placeholder/600/400')} alt={shownProduct.name} fill className="object-contain rounded" sizes="260px" />
              </div>
            </div>
            <div className="flex-1 w-full flex flex-col justify-center">
              <h2 className="text-2xl font-bold mb-2 text-gray-900">{shownProduct.name}</h2>
              <p className="text-gray-700 mb-4">{shownProduct.description}</p>
              <div className="flex flex-col md:flex-row gap-8 w-full items-stretch mt-4">
                {/* Cantidad */}
                <div className="flex-1 flex flex-col justify-center">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Cantidad:</span>
                    <button type="button" className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-lg font-bold" onClick={() => setQty(q => Math.max(1, q - 1))}>-</button>
                    <input type="number" min={1} value={qty} onChange={({ target }) => setQty(Math.max(1, Number(target.value)))} className="w-14 text-center border rounded px-2 py-1 no-spinner" />

<style jsx global>{`
  input[type=number].no-spinner::-webkit-inner-spin-button,
  input[type=number].no-spinner::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type=number].no-spinner {
    -moz-appearance: textfield;
  }
`}</style>
                    <button type="button" className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-lg font-bold" onClick={() => setQty(q => q + 1)}>+</button>
                  </div>
                </div>
                {/* Acción */}
                <div className="flex flex-col justify-center items-center md:items-end flex-1">
                  <button
                    className="mt-4 bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded shadow transition"
                    onClick={() => {
                      if (!shownProduct) return;
                      setList(prev => {
                        const exists = prev.find(item => item.id === shownProduct.id);
                        if (exists) {
                          // Si ya existe, solo actualiza la cantidad y el total sumando la cantidad actual
                          return prev.map(item => {
                            if (item.id === shownProduct.id) {
                              const newQty = item.qty + qty;
                              const price = 0
                              return { ...item, qty: newQty, total: 0, price };
                            }
                            return item;
                          });
                        }
                        const price = 0
                        return [
                          ...prev,
                          {
                            id: shownProduct.id,
                            name: shownProduct.name,
                            price,
                            qty,
                            total: 0,
                          },
                        ];
                      });
                    }}
                  >
                    Añadir a lista
                  </button>
                </div>
              </div>
            </div>
          </div>
          </>
        ) : (
          <div className="text-center text-gray-500"></div>
        )}

        {/* Lista de productos añadidos */}
        {list.length > 0 && (
          <div className="w-full max-w-6xl bg-white rounded-xl shadow p-8">
            <h3 className="text-2xl font-bold mb-6 text-gray-900">Lista de productos</h3>
            {/* Wrapping 'Contacto para la cotización' in a gray margin */}
            <div className="bg-gray-100 p-6 rounded-lg border-3 border-gray-300 mb-6">
              <h4 className="text-lg font-semibold mb-2">Contacto para la cotización</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 justify-center contact-grid">
                {/* Responsive row arrangement */}
                {/* Usar grid-rows para controlar filas en diferentes tamaños */}
                <style jsx>{`
                  @media (min-width: 1024px) {
                    .contact-grid {
                      grid-template-columns: repeat(3, 1fr);
                    }
                  }
                  @media (min-width: 768px) and (max-width: 1023px) {
                    .contact-grid {
                      grid-template-columns: repeat(2, 1fr);
                      justify-items: center;
                    }
                    .contact-grid > div {
                      width: 100%;
                      max-width: 340px;
                    }
                  }
                  @media (max-width: 767px) {
                    .contact-grid {
                      grid-template-columns: 1fr;
                    }
                    .contact-grid > div { width: 100%; max-width: none; }
                  }
                `}</style>
                <div className="contact-grid contents">
                {/* Empresa */}
                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700">Nombre de la empresa</label>
                  <input
                    id="company"
                    value={contact.company}
                    onChange={({ target }) => {
                      setContact(c => ({ ...c, company: target.value }))
                      setErrors(prev => ({ ...prev, company: undefined }))
                    }}
                    placeholder="Ejemplo: Fasercon Ltda."
                    className={`border px-3 py-2 rounded-lg shadow-sm w-full bg-white focus:ring-2 focus:ring-red-500 focus:outline-none ${errors.company ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.company && <p className="text-sm text-red-600 mt-1">{errors.company}</p>}
                </div>
                {/* Documento (RUT u otro) */}
                <div>
                  <label htmlFor="rut" className="block text-sm font-medium text-gray-700">RUT Empresa</label>
                  <input
                    id="rut"
                    value={contact.rut}
                    onChange={({ target }) => {
                      const val = target.value
                      setContact(c => ({ ...c, rut: val }))
                      setErrors(prev => ({ ...prev, rut: undefined }))
                    }}
                    onBlur={() => {
                      if (validateRut(contact.rut)) {
                        setContact(c => ({ ...c, rut: formatRut(c.rut) }))
                      }
                    }}
                    placeholder="Ejemplo: 12.345.678-9"
                    className={`border px-3 py-2 rounded-lg shadow-sm w-full bg-white focus:ring-2 focus:ring-red-500 focus:outline-none ${errors.rut ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.rut && <p className="text-sm text-red-600 mt-1">{errors.rut}</p>}
                </div>
                {/* Dirección Empresa */}
                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700">Dirección Empresa</label>
                  <input
                    id="address"
                    value={contact.address}
                    onChange={(e) => {
                      setContact(c => ({ ...c, address: e.target.value }))
                      setErrors(prev => ({ ...prev, address: undefined }))
                      localStorage.setItem('fasercon_quotes/company_address', e.target.value)
                    }}
                    placeholder="Ejemplo: Av. Providencia 1234, Santiago"
                    className={`border px-3 py-2 rounded-lg shadow-sm w-full bg-white focus:ring-2 focus:ring-red-500 focus:outline-none ${errors.address ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.address && <p className="text-sm text-red-600 mt-1">{errors.address}</p>}
                </div>
                {/* País / Región / Ciudad */}
                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700">País</label>
                  <select
                    id="country"
                    value={contact.country}
                    onChange={(e) => {
                      const country = e.target.value;
                      setContact(c => ({ ...c, country, region: '', city: '' }));
                      setErrors(prev => ({ ...prev, country: undefined, region: undefined, city: undefined }));
                      const states = State.getStatesOfCountry(country) || [];
                      setRegionList(states);
                      setCityList([]);
                    }}
                    className={`border px-3 py-2 rounded-lg shadow-sm w-full bg-white focus:ring-2 focus:ring-red-500 focus:outline-none ${errors.country ? 'border-red-500' : 'border-gray-300'}`}
                  >
                    {countryList.map((cn: any) => (
                      <option key={cn.code} value={cn.code}>{cn.name}</option>
                    ))}
                  </select>
                  {errors.country && <p className="text-sm text-red-600 mt-1">{errors.country}</p>}
                </div>
                <div>
                  <label htmlFor="region" className="block text-sm font-medium text-gray-700">Región / Departamento</label>
                  <select
                    id="region"
                    value={contact.region}
                    onChange={(e) => {
                      const region = e.target.value;
                      setContact(c => ({ ...c, region, city: '' }));
                      setErrors(prev => ({ ...prev, region: undefined, city: undefined }));
                      const cities = City.getCitiesOfState(contact.country || 'CL', region) || [];
                      setCityList(cities || []);
                    }}
                    className={`border px-3 py-2 rounded-lg shadow-sm w-full bg-white focus:ring-2 focus:ring-red-500 focus:outline-none ${errors.region ? 'border-red-500' : 'border-gray-300'}`}
                  >
                    <option value="">Seleccione región</option>
                    {regionList.map(r => (
                      <option key={r.isoCode || r.iso2} value={r.isoCode || r.iso2}>{r.name}</option>
                    ))}
                  </select>
                  {errors.region && <p className="text-sm text-red-600 mt-1">{errors.region}</p>}
                </div>
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700">Ciudad / Comuna</label>
                  <select
                    id="city"
                    value={contact.city}
                    onChange={(e) => { setContact(c => ({ ...c, city: e.target.value })); setErrors(prev => ({ ...prev, city: undefined })); }}
                    className={`border px-3 py-2 rounded-lg shadow-sm w-full bg-white focus:ring-2 focus:ring-red-500 focus:outline-none ${errors.city ? 'border-red-500' : 'border-gray-300'}`}
                  >
                    <option value="">Seleccione ciudad</option>
                    {cityList.map(ct => (
                      <option key={ct.isoCode || ct.name} value={ct.name}>{ct.name}</option>
                    ))}
                  </select>
                  {errors.city && <p className="text-sm text-red-600 mt-1">{errors.city}</p>}
                </div>
                {/* Contacto (Nombre de persona de contacto) */}
                <div>
                  <label htmlFor="contactName" className="block text-sm font-medium text-gray-700">Contacto</label>
                  <input
                    id="contactName"
                    value={contact.contactName}
                    onChange={(e) => {
                      // Capitalizar cada palabra
                      const capitalized = e.target.value.replace(/\b\w+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
                      setContact(c => ({ ...c, contactName: capitalized }))
                      setErrors(prev => ({ ...prev, contactName: undefined }))
                      localStorage.setItem('fasercon_quotes/contact_name', capitalized)
                    }}
                    placeholder="Ejemplo: Juan Pérez"
                    className={`border px-3 py-2 rounded-lg shadow-sm w-full bg-white focus:ring-2 focus:ring-red-500 focus:outline-none ${errors.contactName ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.contactName && <p className="text-sm text-red-600 mt-1">{errors.contactName}</p>}
                </div>
                {/* Correo */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">Correo</label>
                  <input
                    id="email"
                    value={contact.email}
                    onChange={(e) => {
                      const lower = e.target.value.toLowerCase()
                      setContact(c => ({ ...c, email: lower }))
                      setErrors(prev => ({ ...prev, email: undefined }))
                    }}
                    placeholder="Ejemplo: contacto@fasercon.cl"
                    className={`border px-3 py-2 rounded-lg shadow-sm w-full bg-white focus:ring-2 focus:ring-red-500 focus:outline-none ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
                </div>
                {/* Teléfono */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Teléfono</label>
                  <PhoneInput
                    id="phone"
                    international
                    defaultCountry="CL"
                    value={contact.phone || ''}
                    onChange={(value) => {
                      setContact(c => ({ ...c, phone: value || '' }))
                      setErrors(prev => ({ ...prev, phone: undefined }))
                    }}
                    placeholder="Ejemplo: +56 9 1234 5678"
                    className={`border px-3 py-2 rounded-lg shadow-sm w-full bg-white focus:ring-2 focus:ring-red-500 focus:outline-none ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.phone && <p className="text-sm text-red-600 mt-1">{errors.phone}</p>}
                </div>
                {/* Postal code */}
                <div>
                  <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700">Código Postal (opcional)</label>
                  <input id="postal_code" value={contact.postal_code} onChange={(e) => setContact(c => ({ ...c, postal_code: e.target.value }))} placeholder="Ej: 7500000" className="border px-3 py-2 rounded-lg shadow-sm w-full bg-white focus:ring-2 focus:ring-red-500 focus:outline-none border-gray-300" />
                </div>
                {/* Notes */}
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notas (opcional)</label>
                  <textarea id="notes" value={contact.notes} onChange={(e) => setContact(c => ({ ...c, notes: e.target.value }))} placeholder="Notas adicionales" className="border px-3 py-2 rounded-lg shadow-sm w-full bg-white focus:ring-2 focus:ring-red-500 focus:outline-none border-gray-300" />
                </div>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="py-3 px-2 w-24">Imagen</th>
                    <th className="py-3 px-2">Producto</th>
                    <th className="py-3 px-2">Descripción</th>
                    <th className="py-3 px-2">Características</th>
                    <th className="py-3 px-2">Unidad</th>
                    <th className="py-3 px-2">Cantidad</th>
                    <th className="py-3 px-2 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(item => {
                    // Buscar la imagen del producto por id (seguro si products no es arreglo)
                    const prod = Array.isArray(products) ? products.find(p => String(p.id) === String(item.id)) : undefined;
                    return (
                      <tr key={item.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-3 px-2">
                          <div className="relative w-20 h-16">
                            <Image src={String(prod?.image_url || prod?.image || '/api/placeholder/80/60')} alt={item.name} fill className="object-contain rounded shadow-sm bg-white border border-gray-200" sizes="80px" />
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="font-medium text-gray-900">{item.name}</div>
                          {prod?.price && (
                            <div className="text-sm text-gray-500">Precio: ${formatCLP(prod.price)}</div>
                          )}
                        </td>
                        <td className="py-3 px-2 text-sm text-gray-600 max-w-xs">
                          {prod?.description ? (
                            <div className="line-clamp-2" title={prod.description}>
                              {prod.description}
                            </div>
                          ) : (
                            <span className="text-gray-400">Sin descripción</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-sm text-gray-600 max-w-xs">
                          {prod?.characteristics && prod.characteristics.length > 0 ? (
                            <ul className="list-disc list-inside space-y-1">
                              {prod.characteristics.slice(0, 3).map((char, idx) => (
                                <li key={idx} className="line-clamp-1">{char}</li>
                              ))}
                              {prod.characteristics.length > 3 && (
                                <li className="text-gray-400 italic">+{prod.characteristics.length - 3} más</li>
                              )}
                            </ul>
                          ) : (
                            <span className="text-gray-400">Sin características</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-gray-600">
                          {prod && (prod.unit_size || prod.measurement_unit) ? (
                            <span className="font-medium">
                              {prod.unit_size ?? ''}{prod.measurement_unit ? (prod.measurement_unit === 'in' ? '"' : ` ${prod.measurement_unit}`) : ''}
                            </span>
                          ) : (
                            <span className="text-gray-400">--</span>
                          )}
                        </td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <button
                            className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-lg font-bold"
                            onClick={() => {
                              setList(prev => prev.map(p =>
                                p.id === item.id && p.qty > 1
                                  ? { ...p, qty: p.qty - 1, total: 0 }
                                  : p
                              ));
                            }}
                            disabled={item.qty <= 1}
                          >-</button>
                          <span className="w-8 text-center">{item.qty}</span>
                          <button
                            className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-lg font-bold"
                            onClick={() => {
                              setList(prev => prev.map(p =>
                                p.id === item.id
                                  ? { ...p, qty: p.qty + 1, total: 0 }
                                  : p
                              ));
                            }}
                          >+</button>
                        </div>
                      </td>
                      <td className="py-2 text-center">
                        <button
                          className="p-2 rounded-full text-red-700 hover:text-red-900 focus:outline-none"
                          style={{ background: 'none' }}
                          title="Eliminar producto"
                          onClick={() => setList(prev => prev.filter(p => p.id !== item.id))}
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {/* Sin totales en modalidad pre-venta */}
              </tbody>
            </table>
            </div>
            <div className="mt-6 flex justify-end gap-4">
              <button className="px-4 py-2 rounded border" onClick={() => {
                // clear list and localStorage
                setList([])
                localStorage.removeItem('fasercon_quote')
              }}>Vaciar lista</button>
              <button
                className="px-4 py-2 rounded bg-green-700 text-white flex items-center justify-center min-w-[160px] relative overflow-hidden"
                disabled={submitting}
                onClick={async () => {
                  setSubmitting(true);
                  setSubmitMessage(null);
                  try {
                    // Validaciones
                    const nextErrors: typeof errors = {};
                    if (!contact.rut.trim()) nextErrors.rut = 'Documento es requerido';
                    if (!contact.company.trim()) nextErrors.company = 'Empresa es requerida';
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!contact.email.trim()) nextErrors.email = 'Correo es requerido';
                    else if (!emailRegex.test(contact.email)) nextErrors.email = 'Correo inválido';
                    if (!contact.phone.trim()) nextErrors.phone = 'Teléfono es requerido';
                    else if (!isValidPhoneNumber(contact.phone)) nextErrors.phone = 'Teléfono inválido';
                    if (!contact.address || !contact.address.trim()) nextErrors.address = 'Dirección es requerida';
                    if (!contact.contactName || !contact.contactName.trim()) nextErrors.contactName = 'Nombre de contacto es requerido';
                    if (!contact.country || !contact.country.trim()) nextErrors.country = 'País es requerido';
                    if (!contact.region || !contact.region.trim()) nextErrors.region = 'Región es requerida';
                    if (!contact.city || !contact.city.trim()) nextErrors.city = 'Ciudad es requerida';

                    if (Object.keys(nextErrors).length > 0) {
                      setErrors(nextErrors);
                      throw new Error('Validación');
                    }

                    // Formatear RUT si aplica
                    const rutToSend = validateRut(contact.rut) ? formatRut(contact.rut) : contact.rut;

                    // Construir el payload nuevo con contacto + items detallados
                    const itemsPayload = list.map(i => {
                      const prod = Array.isArray(products) ? products.find(p => p.id === i.id) : undefined;
                      const imageUrl = prod?.image_url
                        ? (Array.isArray(prod.image_url) ? prod.image_url[0] : prod.image_url)
                        : '';
                      return {
                        product_id: i.id,
                        name: i.name,
                        image_url: imageUrl,
                        unit_size: prod?.unit_size ?? '',
                        measurement_unit: prod?.measurement_unit ?? '',
                        qty: i.qty,
                        price: i.price ?? 0,
                        characteristics: prod?.characteristics ?? [],
                        sku: prod?.sku ?? '',
                      };
                    });

                    // Guardar los nuevos campos en localStorage
                    localStorage.setItem('fasercon_quotes/company_address', contact.address || '');
                    localStorage.setItem('fasercon_quotes/contact_name', contact.contactName || '');

                    const payload = {
                      contact: {
                        rut: rutToSend,
                        document: contact.rut || contact.document || '',
                        company: contact.company.trim(),
                        email: contact.email.trim(),
                        phone: contact.phone,
                        company_address: contact.address || '',
                        contact_name: contact.contactName || '',
                        country: contact.country || '',
                        region: contact.region || '',
                        city: contact.city || '',
                        postal_code: contact.postal_code || '',
                        notes: contact.notes || '',
                      },
                      items: itemsPayload,
                    };
                    const res = await fetch('/api/quotes', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(payload),
                    });
                    const json = await res.json();
                    if (res.ok) {
                      setSubmitMessage('Cotización enviada correctamente');
                      alert('¡La solicitud de cotización se envió correctamente!');

                      // Generar PDF y enviar correo usando el correlative asignado por el servidor
                      try {
                        const correlative = json?.correlative || null;
                        const quoteNumber = json?.quote_number || null;
                        if (correlative || quoteNumber) {
                          await fetch('/api/generate-quote-pdf', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              correlative,
                              quote_number: quoteNumber,
                              contact: payload.contact,
                              items: itemsPayload,
                              createdAt: new Date().toISOString(),
                              sendEmail: true,
                            }),
                          });
                        } else {
                          console.warn('No correlative or quote_number returned from save; email not sent automatically.');
                        }
                      } catch (e) {
                        console.error('Error generating/sending PDF after save:', e);
                      }

                      setList([]);
                      localStorage.removeItem('fasercon_quote');
                      window.dispatchEvent(new Event('fasercon_quote_updated'));
                    } else {
                      setSubmitMessage(json?.error || json?.message || 'Error al enviar');
                    }
                  } catch {
                    setSubmitMessage('Error al enviar cotización');
                  } finally {
                    setSubmitting(false);
                  }
                }}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="relative flex h-5 w-5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-50"></span>
                      <span className="relative inline-flex rounded-full h-5 w-5 bg-white"></span>
                    </span>
                    Procesando...
                  </span>
                ) : (
                  'Solicitar cotización'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}

// Modal de selección de variaciones y características

  type ProductModalProps = {
  product: Product;
  onClose: () => void;
  onAdd: (options: { characteristics: string[]; unit_size?: string; measurement_unit?: string }) => void;
};

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function ProductModal({ product, onClose, onAdd }: ProductModalProps) {
  const [selectedChars, setSelectedChars] = useState<string[]>([]);
  const [unit, setUnit] = useState(product.unit_size || '');
  const [measure, setMeasure] = useState(product.measurement_unit || '');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative animate-fade-in">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-red-600 text-xl font-bold">×</button>
          <div className="flex flex-col items-center">
          <div className="relative w-32 h-32 mb-2">
            <Image src={String(product.image_url || product.image || '/api/placeholder/400/300')} alt={product.name} fill className="object-contain" sizes="128px" />
          </div>
          <h2 className="text-lg font-bold mb-1 text-center">{product.name}</h2>
          {product.description && <p className="text-gray-700 text-sm mb-2 text-center">{product.description}</p>}
          <div className="text-xs text-gray-500 mb-2">Unidad:
            <input className="ml-2 border rounded px-2 py-1 w-20" value={unit} onChange={({ target }) => setUnit(target.value)} />
            <input className="ml-2 border rounded px-2 py-1 w-20" value={measure} onChange={({ target }) => setMeasure(target.value)} />
          </div>
          {product.characteristics && product.characteristics.length > 0 && (
            <div className="mb-2 flex flex-col items-center">
              <div className="mb-1 text-xs text-gray-700">Selecciona características:</div>
              <div className="flex flex-wrap gap-2 justify-center">
                {product.characteristics.map((c, i) => (
                  <label key={i} className="flex items-center gap-1 text-xs bg-gray-100 border border-gray-300 rounded-full px-2 py-0.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedChars.includes(c)}
                      onChange={({ target }) => {
                        setSelectedChars(prev => target.checked ? [...prev, c] : prev.filter(x => x !== c));
                      }}
                    />
                    {c}
                  </label>
                ))}
              </div>
            </div>
          )}
          <button
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
            onClick={() => onAdd({ characteristics: selectedChars, unit_size: unit, measurement_unit: measure })}
          >Añadir al cotizador</button>
        </div>
      </div>
    </div>
  );
}
