"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { State, City } from 'country-state-city';
import Image from 'next/image'
import ProductCreateForm from '@/components/ProductCreateForm'
import { PhotoIcon } from '@heroicons/react/24/outline'
import { Pair, NewProduct } from '@/lib/types'
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';


type Product = {
  id: number;
  name: string;
  image_url?: string | string[];
  unit_size?: string;
  measurement_unit?: string;
  price?: number;
  characteristics?: string[] | string;
  description?: string;
  manufacturer?: string;
  [key: string]: unknown;
};

type QuoteItem = {
  id: string;
  quote_id: string;
  product_id: string;
  name: string;
  image_url?: string | null;
  unit_size?: string | null;
  measurement_unit?: string | null;
  qty: number;
  price: number;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  document?: string | null;
  created_at?: string | null;
  characteristics?: string[] | string | null;
  product?: Product;
  valorProducto?: number;
  update_price?: number;
  discount?: number; // porcentaje
};

type Quote = {
  id: string;
  name: string;
  email: string;
  phone: string;
  area?: number;
  materialType?: string;
  estimatedPrice?: number;
  status?: string;
  createdAt?: string;
  items?: QuoteItem[];
};

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [mainRect, setMainRect] = useState<DOMRect | null>(null);
  // Estado separado para los precios editables
  const [editedPrices, setEditedPrices] = useState<Record<string, number>>({});
  const [originalOrder, setOriginalOrder] = useState<string[]>([]);
  const [editedDiscounts, setEditedDiscounts] = useState<Record<string, number>>({}); // porcentaje
  const [sending, setSending] = useState(false);
  const [savingDraft] = useState(false);
  // Estado para cotizaciones colapsadas (true = colapsada)
  const [collapsedQuotes, setCollapsedQuotes] = useState<Record<string, boolean>>({});

  const toggleCollapse = (quoteId: string) => {
    setCollapsedQuotes((prev) => ({ ...prev, [quoteId]: !prev[quoteId] }));
  };

  // Guardar precios editados en la base de datos
  async function handleSavePrices() {
    if (!selectedQuote?.items) return;
    for (const item of selectedQuote.items) {
      const price = editedPrices[item.id];
      const discount =
        typeof editedDiscounts[item.id] === 'number'
          ? editedDiscounts[item.id]
          : (typeof item.discount === 'number' ? item.discount : 0);
      const payload: Record<string, unknown> = {};
      if (typeof price === 'number') payload.update_price = price;
      payload.discount = discount;
      await fetch(`/api/quotes/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
    alert('Precios guardados correctamente');
    setEditedPrices({});
    setShowModal(false);
  }

  const visibleMainRect = useMemo(() => {
    if (typeof window === 'undefined' || !mainRect) return null;
    const top = Math.max(mainRect.top, 0);
    const left = Math.max(mainRect.left, 0);
    const right = Math.min(mainRect.right, window.innerWidth);
    const bottom = Math.min(mainRect.bottom, window.innerHeight);
    const width = Math.max(0, right - left);
    const height = Math.max(0, bottom - top);
    if (width === 0 || height === 0) return null;
    return { top, left, width, height };
  }, [mainRect]);

  // Estado para modal de creación de cotización
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<any>({
    contact: { company: '', email: '', phone: '', document: '', company_address: '', contact_name: '', country: 'CL', region: '', city: '', postal_code: '', notes: '' },
    items: [] as any[],
  });
  // Modal sections: 'client' | 'products' | 'items'
  const [createSection, setCreateSection] = useState<'client' | 'products' | 'items'>('client');
  // Control para colapsar/expandir la sección de crear producto (no toca el componente)
  const [productPanelOpen, setProductPanelOpen] = useState<boolean>(false);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [clientSearchResults, setClientSearchResults] = useState<any[]>([]);
  const [regionList, setRegionList] = useState<any[]>([]);
  const [cityList, setCityList] = useState<any[]>([]);
  const [creatingClient, setCreatingClient] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  

  // Validation state and helpers for client fields
  const [clientErrors, setClientErrors] = useState<{ email?: string; phone?: string; document?: string; contact_name?: string }>({});
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const capitalizeName = (s: string) => {
    return s
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0]?.toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  // Helpers for create modal items
  const updateCreateItem = (idx: number, field: string, value: any) => {
    setCreateForm((prev: any) => {
      const items = Array.isArray(prev.items) ? [...prev.items] : [];
      items[idx] = { ...items[idx], [field]: value };
      return { ...prev, items };
    });
  };

  const removeCreateItem = (idx: number) => {
    setCreateForm((prev: any) => ({ ...prev, items: Array.isArray(prev.items) ? prev.items.filter((_: any, i: number) => i !== idx) : [] }));
  };

  const handleSaveDraft = async () => {
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...createForm, draft: true }),
      });
      if (res.ok) {
        setToast({ type: 'success', message: 'Borrador guardado correctamente' });
      } else {
        setToast({ type: 'error', message: 'Error al guardar borrador' });
      }
    } catch (err) {
      console.error('Error guardando borrador', err);
      setToast({ type: 'error', message: 'Error inesperado al guardar borrador' });
    }
  };

  // Chile RUT validation (basic DV check)
  const cleanRUT = (rut: string) => rut.replace(/[^0-9kK]/g, '').toUpperCase();
  const validateRUT = (rut: string) => {
    if (!rut) return false;
    const clean = cleanRUT(rut);
    if (clean.length < 2) return false;
    const body = clean.slice(0, -1);
    const dv = clean.slice(-1);
    let sum = 0;
    let multiplier = 2;
    for (let i = body.length - 1; i >= 0; i--) {
      sum += Number(body[i]) * multiplier;
      multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }
    const mod = 11 - (sum % 11);
    const expected = mod === 11 ? '0' : mod === 10 ? 'K' : String(mod);
    return expected === dv;
  };

  const validateClientFields = () => {
    const errors: any = {};
    const email = (createForm.contact.email || '').toString().trim();
    const phone = (createForm.contact.phone || '') as string;
    const doc = (createForm.contact.document || '').toString().trim();
    const contactName = (createForm.contact.contact_name || '').toString().trim();

    if (!email || !emailRegex.test(email)) errors.email = 'Email inválido';
    if (!phone || !isValidPhoneNumber(phone)) errors.phone = 'Teléfono inválido';
    if (doc) {
      if (!validateRUT(doc)) errors.document = 'RUT inválido (formato Chile)';
    }
    if (!contactName) errors.contact_name = 'Nombre de contacto requerido';

    setClientErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const clientIsValid = (() => {
    const email = (createForm.contact.email || '').toString().trim();
    const phone = (createForm.contact.phone || '') as string;
    const doc = (createForm.contact.document || '').toString().trim();
    const contactName = (createForm.contact.contact_name || '').toString().trim();
    if (!emailRegex.test(email)) return false;
    if (!phone || !isValidPhoneNumber(phone)) return false;
    if (!contactName) return false;
    if (doc && !validateRUT(doc)) return false;
    return true;
  })();

  // Buscar clientes por texto (company / email / document)
  const searchClients = async (q: string) => {
    try {
      if (!q) return setClientSearchResults([]);
      const res = await fetch(`/api/clients?q=${encodeURIComponent(q)}`);
      if (!res.ok) return setClientSearchResults([]);
      const data = await res.json();
      setClientSearchResults(Array.isArray(data) ? data : (data ? [data] : []));
    } catch (err) {
      console.error(err);
      setClientSearchResults([]);
    }
  };

  // debounce auto-search when typing in the client search input
  const clientSearchTimeout = useRef<number | null>(null);
  useEffect(() => {
    if (clientSearchTimeout.current) {
      clearTimeout(clientSearchTimeout.current);
    }
    if (!clientSearchQuery || clientSearchQuery.trim() === '') {
      setClientSearchResults([]);
      return;
    }
    clientSearchTimeout.current = window.setTimeout(() => {
      searchClients(clientSearchQuery.trim());
    }, 300);
    return () => {
      if (clientSearchTimeout.current) clearTimeout(clientSearchTimeout.current);
    };
  }, [clientSearchQuery]);

  // Update region/city lists when country or region changes
  useEffect(() => {
    const countryCode = createForm.contact.country || 'CL';
    try {
      const states = State.getStatesOfCountry(countryCode) || [];
      setRegionList(states || []);
    } catch {
      setRegionList([]);
    }
    setCityList([]);
  }, [createForm.contact.country]);

  useEffect(() => {
    const countryCode = createForm.contact.country || 'CL';
    const regionCode = createForm.contact.region || '';
    if (!regionCode) return setCityList([]);
    try {
      const cities = City.getCitiesOfState(countryCode, regionCode) || [];
      setCityList(cities || []);
    } catch {
      setCityList([]);
    }
  }, [createForm.contact.country, createForm.contact.region]);

  // Estado para crear productos (fasercon_products)
  const [productForm, setProductForm] = useState<any>({
    name: '', sku: '', price: 0, unit_size: '', measurement_unit: '', stock: 0, visible: true,
    manufacturer: '', description: '', image_url: '', supplier_id: '', characteristics: '', features: '', applications: '', measurement_type: '', order: 0
  });
  const [selectedExistingImages, setSelectedExistingImages] = useState<string[]>([])
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [, setMatchingProducts] = useState<any[]>([])
  const [showMatches, setShowMatches] = useState(false)
  const [charRows, setCharRows] = useState<Pair[]>([])
  const [appRows, setAppRows] = useState<Pair[]>([])
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  // Suppliers list used by ProductEditor
  const [allSuppliers, setAllSuppliers] = useState<any[]>([]);
  // unit labels (same as in products page) used by ProductEditor
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
  };
  // Price display state for ProductEditor
  const [newProductPriceDisplay, setNewProductPriceDisplay] = useState<string>('');
  const [unitSizeInputs, setUnitSizeInputs] = useState<string[]>([''])
  const [descriptionInputs, setDescriptionInputs] = useState<string[]>([''])
  const [showSupplierDetails, setShowSupplierDetails] = useState(false);
  const [supplierQuery, setSupplierQuery] = useState('');
  const [supplierSelected, setSupplierSelected] = useState<any | null>(null);
  const [, setSupplierResults] = useState<any[]>([]);
  const [, setSupplierSearchLoading] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [productSearchResults, setProductSearchResults] = useState<any[]>([]);
  const productSearchTimeout = useRef<number | null>(null);

  const searchProducts = async (q: string) => {
    try {
      if (!q || q.trim() === '') return setProductSearchResults([]);
      const res = await fetch(`/api/products?q=${encodeURIComponent(q.trim())}`);
      if (!res.ok) return setProductSearchResults([]);
      const data = await res.json();
      // API returns { products }
      const products = Array.isArray(data?.products) ? data.products : [];
      setProductSearchResults(products);
    } catch (err) {
      console.error(err);
      setProductSearchResults([]);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products')
      const data = await res.json()
      const list = Array.isArray(data?.products) ? data.products : []
      setMatchingProducts(list)
    } catch {
      setMatchingProducts([])
    }
  }

  // Añadir producto existente desde resultados a la lista de la cotización (createForm.items)
  const addExistingProduct = (p: any) => {
    setCreateForm((prev: any) => {
      const items = Array.isArray(prev.items) ? [...prev.items] : [];
      const pid = p.id ?? p.product_id ?? p.sku ?? String(Math.random());
      const existingIndex = items.findIndex((it: any) => String(it.product_id) === String(pid));
      if (existingIndex !== -1) {
        const updated = [...items];
        updated[existingIndex] = { ...updated[existingIndex], qty: (Number(updated[existingIndex].qty) || 1) + 1 };
        return { ...prev, items: updated };
      }
      const newItem = {
        id: `tmp-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        quote_id: '',
        product_id: String(pid),
        sku: p.sku || '',
        name: p.name || '',
        image_url: Array.isArray(p.image_url) ? (p.image_url[0] || null) : (p.image_url || null),
        unit_size: p.unit_size || null,
        measurement_unit: p.measurement_unit || null,
        qty: 1,
        price: typeof p.price === 'number' ? p.price : 0,
        update_price: typeof p.price === 'number' ? p.price : 0,
        discount: 0,
        company: null,
        email: null,
        phone: null,
        document: null,
        created_at: null,
        characteristics: p.characteristics || null,
        product: p
      };
      return { ...prev, items: [...items, newItem] };
    });
    setToast({ type: 'success', message: 'Producto agregado a la cotización' });
    // keep search results visible
    setShowMatches(false);
  }

  // supplier search (simple helper for the small select/search UI)
  useEffect(() => {
    let t: number | null = null;
    if (!supplierQuery || supplierQuery.trim() === '') {
      setSupplierResults([]);
      return;
    }
    setSupplierSearchLoading(true);
    t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/suppliers?q=${encodeURIComponent(supplierQuery)}&limit=8&page=1`)
        if (!res.ok) throw new Error('Error fetching suppliers')
        const json = await res.json()
        const list = Array.isArray(json) ? json : (json.data || [])
        setSupplierResults(list)
      } catch (err) {
          console.error('Supplier search error', err)
          setSupplierResults([])
        } finally {
          setSupplierSearchLoading(false)
        }
    }, 300)
    return () => { if (t) clearTimeout(t) }
  }, [supplierQuery])

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

  const formatCurrencyInput = (v?: number | null) => {
    if (v == null) return ''
    try {
      return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(v)
    } catch {
      return String(v)
    }
  }

  const combinePairsToStrings = (pairs: { title: string; detail: string }[]): string[] => {
    if (!pairs || pairs.length === 0) return []
    return pairs.filter(p => p.title).map(p => p.detail ? `${p.title}: ${p.detail}` : p.title)
  }

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3500)
      return () => clearTimeout(t)
    }
  }, [toast])

  // fetch suppliers list for ProductEditor (once)
  useEffect(() => {
    let mounted = true;
    const fetchAll = async () => {
      try {
        const res = await fetch('/api/suppliers?limit=200&page=1')
        if (!res.ok) throw new Error('Error fetching suppliers')
        const json = await res.json()
        const list = Array.isArray(json) ? json : (json.data || [])
        if (mounted) setAllSuppliers(list)
      } catch (e) {
        console.error('Error loading suppliers list', e)
        if (mounted) setAllSuppliers([])
      }
    }
    fetchAll()
    return () => { mounted = false }
  }, [])

  // debounce auto-search when typing in the product search input
  useEffect(() => {
    if (productSearchTimeout.current) {
      clearTimeout(productSearchTimeout.current);
    }
    if (!productSearchQuery || productSearchQuery.trim() === '') {
      setProductSearchResults([]);
      return;
    }
    productSearchTimeout.current = window.setTimeout(() => {
      searchProducts(productSearchQuery.trim());
    }, 300);
    return () => {
      if (productSearchTimeout.current) clearTimeout(productSearchTimeout.current);
    };
  }, [productSearchQuery]);
  

  const openCreateModal = () => {
    setCreateForm({ contact: { company: '', contact_name: '', email: '', phone: '', document: '', company_address: '', country: 'CL', region: '', city: '', postal_code: '', notes: '' }, items: [] });
    // Ensure modal opens on the 'client' section and clear previous searches/selections
    setCreateSection('client');
    setClientSearchQuery('');
    setClientSearchResults([]);
    setSelectedClientId(null);
    setProductSearchQuery('');
    setProductSearchResults([]);
    setShowCreateModal(true);
  };

  // supplier actions moved to inline in the render method

  // Edit modal removed: no longer used.

  // Polling automático cada 10 segundos
  useEffect(() => {
    let stopped = false;
    const fetchQuotes = () => {
      fetch('/api/quotes')
        .then(res => res.json())
        .then(data => {
          if (!stopped) {
            const arr = Array.isArray(data) ? data : [];
            setQuotes(arr);
            // Solo inicializa collapsedQuotes si está vacío (primera carga)
            setCollapsedQuotes(prev => {
              if (Object.keys(prev).length === 0) {
                const collapsedInit: Record<string, boolean> = {};
                arr.forEach((q: any) => { if (q && q.id) collapsedInit[q.id] = true; });
                return collapsedInit;
              }
              return prev;
            });
          }
        })
        .finally(() => { if (!stopped) setLoading(false); });
    };
    fetchQuotes();
    const interval = setInterval(fetchQuotes, 10000); // 10 segundos
    return () => { stopped = true; clearInterval(interval); };
  }, []);

  // Mantener el rect del elemento <main> y actualizarlo cuando cambie tamaño, scroll o DOM
  useEffect(() => {
    function updateMainRect() {
      const mainEl = document.querySelector('main');
      if (mainEl) {
        const r = mainEl.getBoundingClientRect();
        setMainRect(r);
      } else {
        setMainRect(null);
      }
    }

    updateMainRect();
    // Deshabilitado MutationObserver para evitar bucles con el modal
    // const mo = new MutationObserver(() => updateMainRect());
    // mo.observe(document.body, { attributes: true, childList: true, subtree: true });
    window.addEventListener('resize', updateMainRect);
    window.addEventListener('scroll', updateMainRect, true);

    return () => {
      // mo.disconnect();
      window.removeEventListener('resize', updateMainRect);
      window.removeEventListener('scroll', updateMainRect, true);
    };
  }, []);

  const handleCreateClient = async () => {
    try {
      setCreatingClient(true);
      // Validate fields first
      if (!validateClientFields()) {
        alert('Por favor corrige los errores del cliente antes de crear.');
        return false;
      }

      const payload = {
        company: String(createForm.contact.company || '').toUpperCase(),
        contact_name: capitalizeName(String(createForm.contact.contact_name || '')),
        email: String(createForm.contact.email || '').toLowerCase(),
        phone: createForm.contact.phone || null,
        document: createForm.contact.document || null,
        company_address: createForm.contact.company_address || null,
        country: createForm.contact.country || null,
        region: createForm.contact.region || null,
        city: createForm.contact.city || null,
        postal_code: createForm.contact.postal_code || null,
        notes: createForm.contact.notes || null,
      };
      const res = await fetch('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Error creando cliente');
      const created = await res.json();
      setSelectedClientId(created.id ?? null);
      
      setCreateForm((p:any) => ({
        ...p,
        contact: {
          ...p.contact,
          company: String(created.company || p.contact.company || '').toUpperCase(),
          contact_name: capitalizeName(String(created.contact_name || p.contact.contact_name || '')),
          email: String(created.email || p.contact.email || '').toLowerCase(),
          phone: created.phone || p.contact.phone,
          document: created.document || p.contact.document,
          company_address: created.company_address || p.contact.company_address,
          country: p.contact.country || created.country || 'CL',
          region: p.contact.region || created.region || '',
          city: p.contact.city || created.city || '',
          postal_code: p.contact.postal_code || created.postal_code || '',
          notes: p.contact.notes || created.notes || ''
        }
      }));
      alert('Cliente creado y seleccionado');
      return true;
    } catch (err) {
      console.error(err);
      alert('Error creando cliente');
      return false;
    } finally {
      setCreatingClient(false);
    }
  };

  const handleCancelCreateModal = async () => {
    setSelectedClientId(null);
    setCreateForm({ contact: { company: '', contact_name: '', email: '', phone: '', document: '', company_address: '', country: 'CL', region: '', city: '', postal_code: '', notes: '' }, items: [] });
    setCreateSection('client');
    setClientSearchQuery('');
    setClientSearchResults([]);
    setShowCreateModal(false);
  };

  return (
    <div className="relative">
      {/* Global toast so it remains visible even after modals close */}
      {toast && (
        <div
          className={`fixed left-1/2 -translate-x-1/2 top-6 z-[90] px-6 py-3 rounded shadow-lg font-normal text-white transition-all duration-300 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}
          style={{ minWidth: '220px', maxWidth: '90vw', textAlign: 'center' }}
        >
          {toast.message}
        </div>
      )}
        {showModal && selectedQuote && (
          <div
            style={(() => {
              const rect = visibleMainRect ?? mainRect;
              if (rect && rect.width > 0 && rect.height > 0) {
                return {
                  position: 'fixed',
                  top: `${Math.max(rect.top, 0)}px`,
                  left: `${Math.max(rect.left, 0)}px`,
                  width: `${rect.width}px`,
                  height: `${rect.height}px`,
                  zIndex: 50,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                } as const;
              }
              // fallback seguro si no hay mainRect
              return { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' } as const;
            })()}
          >
          <div style={{ backgroundColor: 'rgba(0,0,0,0.12)', position: 'absolute', inset: 0 }} />
          <div
            className="bg-white rounded-lg shadow-lg p-6 relative flex flex-col"
            style={{
              width: (() => {
                const rect = visibleMainRect ?? mainRect;
                if (rect) {
                  return `${Math.round(rect.width * 0.95)}px`;
                }
                return '95vw';
              })(),
              height: (() => {
                const rect = visibleMainRect ?? mainRect;
                if (rect) {
                  return `${Math.round(rect.height * 0.95)}px`;
                }
                return '95vh';
              })(),
              maxWidth: '100%',
              maxHeight: '100%'
            }}
          >
              <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-700" onClick={() => setShowModal(false)}>&times;</button>
              <h2 className="text-xl font-bold mb-4 text-red-700">Responder Cotización</h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div><span className="font-semibold">Empresa:</span> {selectedQuote.name}</div>
                <div><span className="font-semibold">Email:</span> {selectedQuote.email}</div>
                <div><span className="font-semibold">Teléfono:</span> {selectedQuote.phone}</div>
                <div><span className="font-semibold">Área:</span> {selectedQuote.area ?? '-'}</div>
                <div><span className="font-semibold">Material:</span> {selectedQuote.materialType ?? '-'}</div>
                <div><span className="font-semibold">Precio estimado:</span> {selectedQuote.estimatedPrice ? `$${selectedQuote.estimatedPrice.toLocaleString()}` : '-'}</div>
                <div><span className="font-semibold">Estado:</span> {selectedQuote.status ?? '-'}</div>
                <div><span className="font-semibold">Creado:</span> {selectedQuote.createdAt ? new Date(selectedQuote.createdAt).toLocaleString() : '-'}</div>
              </div>
              <div>
                <span className="font-semibold">Productos:</span>
                <table className="min-w-full border mt-2 mb-4">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border px-2 py-1 text-center font-semibold" style={{ width: '1%' }}>SKU</th>
                      <th className="border px-2 py-1 text-left font-semibold">Producto</th>
                      <th className="border px-2 py-1 text-center font-semibold">Cantidad</th>
                      <th className="border px-2 py-1 text-center font-semibold">Unidad</th>
                      <th className="border px-2 py-1 text-center font-semibold">Precio estimado</th>
                      <th className="border px-2 py-1 text-center font-semibold">P/U</th>
                      <th className="border px-1 py-1 text-center font-semibold w-32">Valor producto</th>
                      <th className="border px-1 py-1 text-center font-semibold w-32">Total producto</th>
                      <th className="border px-1 py-1 text-center font-semibold w-32">Descuento (%)</th>
                      <th className="border px-1 py-1 text-center font-semibold w-32">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                      {selectedQuote.items && originalOrder.length > 0
                        ? originalOrder.map(id => {
                            const item = selectedQuote.items?.find(i => i.id === id);
                            if (!item) return null;
                            return (
                              <tr key={item.id}>
                                <td className="border px-2 py-1 text-center" style={{ width: '1%' }}>
                                  <div className="flex items-center justify-center w-full">
                                    <span className="text-center" style={{
                                      width: `${Math.max(String(item.product?.sku || item.product_id || '-').length * 9, 80)}px`,
                                      minWidth: '80px',
                                      maxWidth: '140px',
                                      display: 'inline-block'
                                    }}>{String(item.product?.sku || item.product_id || '-')}</span>
                                  </div>
                                </td>
                                <td className="border px-2 py-1 text-left">{item.name}</td>
                                <td className="border px-2 py-1 text-center" style={{ width: '1%' }}>
                                  <div className="flex items-center justify-center w-full">
                                    <span className="text-center" style={{
                                      width: `${Math.max(String(item.qty).length * 10, 40)}px`,
                                      minWidth: '40px',
                                      maxWidth: '80px',
                                      display: 'inline-block'
                                    }}>{item.qty}</span>
                                  </div>
                                </td>
                                <td className="border px-2 py-1 text-center" style={{ width: '1%' }}>
                                  <div className="flex items-center justify-center w-full">
                                    <span className="text-center" style={{
                                      width: `${Math.max((`${item.unit_size ?? ''} ${item.measurement_unit ?? ''}`).length * 8, 40)}px`,
                                      minWidth: '80px',
                                      maxWidth: '120px',
                                      display: 'inline-block'
                                    }}>{item.unit_size} {item.measurement_unit}</span>
                                  </div>
                                </td>
                                <td className="border px-2 py-1 text-center" style={{ width: '1%' }}>
                                  <div className="flex items-center justify-center w-full">
                                    <span className="text-gray-700 font-bold flex-shrink-0">$&nbsp;</span>
                                    <span className="text-right" style={{
                                      width: `${Math.max((item.price ?? 0).toLocaleString('es-CL').length * 10, 80)}px`,
                                      minWidth: '120px',
                                      maxWidth: '220px',
                                      display: 'inline-block'
                                    }}>{item.price?.toLocaleString('es-CL') ?? '-'}</span>
                                  </div>
                                </td>
                                <td className="border px-2 py-1 text-center" style={{ width: '1%' }}>
                                  <div className="flex items-center justify-center w-full">
                                    <span className="text-gray-700 font-bold flex-shrink-0">$</span>
                                    <span className="ml-1 text-right" style={{
                                      width: `${Math.max((item.price ?? 0).toLocaleString('es-CL').length * 10, 80)}px`,
                                      minWidth: '120px',
                                      maxWidth: '220px',
                                      display: 'inline-block'
                                    }}>{item.price?.toLocaleString('es-CL') ?? '-'}</span>
                                  </div>
                                </td>
                                <td className="border px-1 py-1 text-center w-32">
                                  <div className="flex items-center justify-center w-full bg-gray-200/50 p-1 rounded">
                                    <span className="text-gray-700 font-bold flex-shrink-0">$</span>
                                    <input
                                      type="text"
                                      className="bg-transparent outline-none text-right"
                                      style={{
                                        width: `${Math.max((editedPrices[item.id] ?? item.update_price ?? item.price ?? 0).toLocaleString('es-CL').length * 10, 80)}px`,
                                        minWidth: '110px',
                                        maxWidth: '220px'
                                      }}
                                      value={((editedPrices[item.id] ?? item.update_price ?? item.price ?? 0) === 0 ? '0' : (editedPrices[item.id] ?? item.update_price ?? item.price ?? 0).toLocaleString('es-CL'))}
                                      onChange={e => {
                                        const raw = e.target.value.replace(/[^\d]/g, '');
                                        let valor = Math.round(Number(raw));
                                        if (isNaN(valor) || valor < 0) valor = 0;
                                        setEditedPrices(prev => ({ ...prev, [item.id]: valor }));
                                      }}
                                      min={0}
                                      inputMode="numeric"
                                    />
                                  </div>
                                </td>
                                <td className="border px-1 py-1 text-center w-32">
                                  <div className="flex items-center justify-center w-full">
                                    <span className="text-gray-700 font-bold flex-shrink-0">$</span>
                                    <span className="text-right" style={{
                                      width: `${Math.max((Math.round((editedPrices[item.id] ?? item.update_price ?? item.price ?? 0) * item.qty)).toLocaleString('es-CL').length * 10, 80)}px`,
                                      minWidth: '110px',
                                      maxWidth: '220px',
                                      display: 'inline-block'
                                    }}>{Math.round((editedPrices[item.id] ?? item.update_price ?? item.price ?? 0) * item.qty) === 0 ? '0' : Math.round((editedPrices[item.id] ?? item.update_price ?? item.price ?? 0) * item.qty).toLocaleString('es-CL')}</span>
                                  </div>
                                </td>
                                <td className="border px-1 py-1 text-center w-32">
                                  <div className="flex items-center justify-center w-full  bg-gray-200/50 p-1 rounded">
                                    <input
                                      type="text"
                                      className="bg-transparent outline-none text-center ml-1"
                                      style={{
                                        width: '70px',
                                        minWidth: '60px',
                                        maxWidth: '90px',
                                        textAlign: 'center'
                                      }}
                                      value={editedDiscounts[item.id] ?? item.discount ?? 0}
                                      onChange={e => {
                                        const raw = e.target.value.replace(/[^\d]/g, '');
                                        let valor = Math.round(Number(raw));
                                        if (isNaN(valor) || valor < 0) valor = 0;
                                        if (valor > 100) valor = 100;
                                        setEditedDiscounts(prev => ({ ...prev, [item.id]: valor }));
                                      }}
                                      inputMode="numeric"
                                    />
                                    <span className="ml-1">%</span>
                                  </div>
                                </td>
                                
                                <td className="border px-1 py-1 text-center w-32">
                                  <div className="flex items-center justify-center w-full">
                                    <span className="text-gray-700 font-bold flex-shrink-0">$</span>
                                    <span className="text-right" style={{
                                      width: (() => {
                                        const total = (editedPrices[item.id] ?? item.update_price ?? item.price ?? 0) * item.qty;
                                        const discount = editedDiscounts[item.id] ?? item.discount ?? 0;
                                        const subtotal = Math.round(total - (total * (discount / 100)));
                                        return `${Math.max(subtotal.toLocaleString('es-CL').length * 10, 80)}px`;
                                      })(),
                                      minWidth: '110px',
                                      maxWidth: '220px',
                                      display: 'inline-block'
                                    }}>{(() => {
                                      const total = (editedPrices[item.id] ?? item.update_price ?? item.price ?? 0) * item.qty;
                                      const discount = editedDiscounts[item.id] ?? item.discount ?? 0;
                                      const subtotal = Math.round(total - (total * (discount / 100)));
                                      return subtotal === 0 ? '0' : subtotal.toLocaleString('es-CL');
                                    })()}</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        : selectedQuote.items?.map((item) => (
                          <tr key={item.id}>
                              <td className="border px-2 py-1 text-center" style={{ width: '1%' }}>
                                <span className="text-right font-semibold" style={{
                                  width: `${Math.max(String(item.product?.sku || item.product_id || '-').length * 9, 70)}px`,
                                  minWidth: '70px',
                                  maxWidth: '120px',
                                  display: 'inline-block'
                                }}>{String(item.product?.sku || item.product_id || '-')}</span>
                              </td>
                              <td className="border px-2 py-1 text-left">{item.name}</td>
                              <td className="border px-2 py-1 text-center" style={{ width: '1%' }}>
                                <span className="text-right font-semibold" style={{
                                  width: `${Math.max(String(item.qty).length * 10, 40)}px`,
                                  minWidth: '40px',
                                  maxWidth: '80px',
                                  display: 'inline-block'
                                }}>{item.qty}</span>
                              </td>
                              <td className="border px-2 py-1 text-center" style={{ width: '1%' }}>
                                <span className="text-right font-semibold" style={{
                                  width: `${Math.max((`${item.unit_size ?? ''} ${item.measurement_unit ?? ''}`).length * 8, 40)}px`,
                                  minWidth: '40px',
                                  maxWidth: '120px',
                                  display: 'inline-block'
                                }}>{item.unit_size} {item.measurement_unit}</span>
                              </td>
                              <td className="border px-2 py-1 text-center" style={{ width: '1%' }}>
                                <div className="flex items-center justify-center w-full">
                                  <span className="text-gray-700 font-bold flex-shrink-0">$</span>
                                  <span className="ml-1 text-right" style={{
                                    width: `${Math.max((item.price ?? 0).toLocaleString('es-CL').length * 10, 80)}px`,
                                    minWidth: '110px',
                                    maxWidth: '220px',
                                    display: 'inline-block'
                                  }}>{item.price?.toLocaleString('es-CL') ?? '-'}</span>
                                </div>
                              </td>
                              <td className="border px-1 py-1 text-center w-24">
                                <div className="flex items-center justify-center w-full">
                                  <span className="text-gray-700 font-bold flex-shrink-0">$</span>
                                  <span className="ml-1 text-right" style={{
                                    width: `${Math.max((Math.round((editedPrices[item.id] ?? item.update_price ?? item.price ?? 0) * item.qty * 0.19)).toLocaleString('es-CL').length * 10, 80)}px`,
                                    minWidth: '80px',
                                    maxWidth: '120px',
                                    display: 'inline-block'
                                  }}>{Math.round((editedPrices[item.id] ?? item.update_price ?? item.price ?? 0) * item.qty * 0.19).toLocaleString('es-CL')}</span>
                                </div>
                              </td>
                              <td className="border px-1 py-1 text-center w-32">
                                <div className="flex items-center justify-center w-full">
                                  <span className="text-gray-700 font-bold flex-shrink-0">$</span>
                                  <span className="ml-1 text-right" style={{
                                    width: `${Math.max((Math.round((editedPrices[item.id] ?? item.update_price ?? item.price ?? 0) * item.qty * 1.19)).toLocaleString('es-CL').length * 10, 80)}px`,
                                    minWidth: '110px',
                                    maxWidth: '220px',
                                    display: 'inline-block'
                                  }}>{Math.round((editedPrices[item.id] ?? item.update_price ?? item.price ?? 0) * item.qty * 1.19).toLocaleString('es-CL')}</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-2">
                <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700" onClick={handleSavePrices}>Guardar precios</button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={() => setShowModal(false)}>Cerrar</button>
              </div>
            </div>
          </div>
      )}
      {showCreateModal && (
        <div
          style={(() => {
            const rect = visibleMainRect ?? mainRect;
            if (rect && rect.width > 0 && rect.height > 0) {
              return {
                position: 'fixed',
                top: `${Math.max(rect.top, 0)}px`,
                left: `${Math.max(rect.left, 0)}px`,
                width: `${rect.width}px`,
                height: `${rect.height}px`,
                zIndex: 60,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              } as const;
            }
            return { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' } as const;
          })()}
        >
          <div style={{ backgroundColor: 'rgba(0,0,0,0.60)', position: 'absolute', inset: 0 }} />
          <div
            className="bg-white rounded-lg shadow-lg p-6 relative flex flex-col"
            style={{
              width: (() => {
                const rect = visibleMainRect ?? mainRect;
                if (rect) return `${Math.round(rect.width * 0.9)}px`;
                return '90vw';
              })(),
              height: 'auto',
              maxHeight: (() => {
                const rect = visibleMainRect ?? mainRect;
                if (rect) return `${Math.round(rect.height * 0.95)}px`;
                return '85vh';
              })(),
              maxWidth: '100%'
            }}
          >
            {/* (toast rendered globally) */}
            <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-700" onClick={() => setShowCreateModal(false)}>&times;</button>
            <div className="flex items-center justify-between mb-4 border-b border-gray-300 pb-2">
              <h2 className="text-2xl font-normal text-gray-400 whitespace-nowrap">Crear Cotización</h2>
              {/* Improved stepper for modal steps */}
              <div className="flex flex-col items-center w-full mt-2 mb-2">
                <div className="flex items-center justify-center gap-6 mb-2">
                  {[
                    { key: 'client', label: 'Cliente' },
                    { key: 'products', label: 'Productos' },
                    { key: 'items', label: 'Preview' }
                  ].map((step, idx) => (
                    <div key={step.key} className="flex flex-col items-center">
                      <button
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border-2 transition-all duration-200 focus:outline-none ${createSection === step.key ? 'bg-red-600 text-white border-red-700 shadow-lg scale-110' : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'}`}
                        onClick={() => setCreateSection(step.key as typeof createSection)}
                        aria-label={step.label}
                      >
                        {idx + 1}
                      </button>
                      <span className={`mt-2 text-sm font-medium ${createSection === step.key ? 'text-red-700' : 'text-gray-500'}`}>{step.label}</span>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {createSection === 'client' && 'Completa los datos del cliente para iniciar la cotización.'}
                  {createSection === 'products' && 'Agrega los productos que deseas cotizar.'}
                </div>
              </div>
            </div>
            <div className="overflow-y-auto" style={{ flex: 1 }}>

            {createSection === 'client' && (
              <div className="mb-4">
                <style>{`.phone-wrapper .PhoneInputInput{border:none;outline:none;width:100%;background:transparent;padding:0;margin:0;font:inherit;} .phone-wrapper .PhoneInputCountry{margin-right:8px;} .phone-wrapper {display:block;} `}</style>
                <div className="flex gap-2 items-end mb-2">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-600">Buscar cliente (empresa / email / documento)</label>
                    <input className="border rounded px-2 py-1 w-full" value={clientSearchQuery} onChange={e => setClientSearchQuery(e.target.value)} />
                  </div>
                  <div>
                    <button className="px-3 py-1 bg-gray-200 rounded" onClick={() => { setClientSearchQuery(''); setClientSearchResults([]); }}>Limpiar</button>
                  </div>
                </div>

                {clientSearchResults && clientSearchResults.length > 0 ? (
                  <div className="space-y-2 mb-2">
                    <div className="text-sm text-gray-600">Clientes encontrados:</div>
                    {clientSearchResults.map((c, i) => (
                      <div key={i} className="flex items-center justify-between border rounded p-2">
                          <div className="text-sm">
                          <div className="font-semibold">{c.company} <span className="text-xs text-gray-500">{c.email ? `(${c.email})` : ''}</span></div>
                          <div className="text-xs text-gray-600">Documento: {c.document ?? '-'}</div>
                        </div>
                        <div className="flex gap-2">
                          <button className="px-3 py-1 bg-red-700 text-white rounded" onClick={() => {
                            setCreateForm((p:any) => ({
                              ...p,
                              contact: {
                                ...p.contact,
                                company: String(c.company || p.contact.company || '').toUpperCase(),
                                contact_name: capitalizeName(String(c.contact_name || p.contact.contact_name || '')),
                                email: String(c.email || p.contact.email || '').toLowerCase(),
                                phone: c.phone || p.contact.phone,
                                document: c.document || p.contact.document,
                                company_address: c.company_address || p.contact.company_address,
                                country: p.contact.country || c.country || 'CL',
                                region: p.contact.region || c.region || '',
                                city: p.contact.city || c.city || '',
                                postal_code: p.contact.postal_code || c.postal_code || '',
                                notes: p.contact.notes || c.notes || ''
                              }
                            }));
                            setSelectedClientId(c.id);
                            setClientErrors({});
                            // Mostrar alerta personalizada temporal
                            setToast({ type: 'success', message: 'Cliente seleccionado' });
                            setTimeout(() => setToast(null), 2000);
                          }}>Seleccionar</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mb-2 text-sm text-gray-500">No se han encontrado clientes</div>
                )}
                {/* Lista compacta de productos agregados (vista tipo cotización) debajo de Crear producto */}
                <div className="mb-4">
                  <h4 className="font-semibold text-sm mb-2">Productos en la cotización</h4>
                  <div className="space-y-2">
                    {createForm.items && createForm.items.length > 0 ? (
                      createForm.items.map((it: any, idx: number) => (
                        <div key={it.id || idx} className="flex items-center gap-3 p-2 border rounded bg-white">
                          <div className="w-12 h-12 flex items-center justify-center bg-gray-50 border rounded">
                            {it.image_url ? (
                              <Image src={String(it.image_url)} alt={it.name} width={40} height={40} className="object-contain" />
                            ) : (
                              <div className="text-xs text-gray-400">Sin imagen</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{it.name}</div>
                            <div className="text-xs text-gray-500">{it.sku || it.product_id || ''}</div>
                          </div>
                          <div className="w-28">
                            <input type="number" min={1} className="border rounded px-2 py-1 w-full text-sm" value={it.qty} onChange={e => updateCreateItem(idx, 'qty', Number(e.target.value))} />
                          </div>
                          <div className="w-36">
                            <input type="number" min={0} className="border rounded px-2 py-1 w-full text-sm" value={it.price} onChange={e => updateCreateItem(idx, 'price', Number(e.target.value))} />
                          </div>
                          <div>
                            <button className="px-2 py-1 bg-red-600 text-white rounded text-sm" onClick={() => removeCreateItem(idx)}>Eliminar</button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500">No hay productos agregados a la cotización</div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-2">
                  <div>
                    <label className="block text-xs text-gray-600">Empresa</label>
                    <input className="border rounded px-2 py-1 w-full" value={createForm.contact.company} onChange={e => setCreateForm((p:any) => ({ ...p, contact: { ...p.contact, company: String(e.target.value || '').toUpperCase() } }))} />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600">Documento (RUT)</label>
                    <input className="border rounded px-2 py-1 w-full" value={createForm.contact.document} onChange={e => setCreateForm((p:any) => ({ ...p, contact: { ...p.contact, document: e.target.value } }))} onBlur={() => {
                      const val = String(createForm.contact.document || '').trim();
                      if (val) {
                        const ok = validateRUT(val);
                        if (!ok) setClientErrors(prev => ({ ...prev, document: 'RUT inválido (formato Chile)' }));
                        else setClientErrors(prev => { const n = { ...prev }; delete n.document; return n; });
                        if (ok) {
                          const cleaned = cleanRUT(val);
                          const body = cleaned.slice(0, -1);
                          const dv = cleaned.slice(-1);
                          const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                          setCreateForm((p:any) => ({ ...p, contact: { ...p.contact, document: `${withDots}-${dv}` } }));
                        }
                      }
                    }} />
                    {clientErrors.document && <div className="text-xs text-red-600 mt-1">{clientErrors.document}</div>}
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600">Contacto (Nombre y Apellido)</label>
                    <input className="border rounded px-2 py-1 w-full" value={createForm.contact.contact_name} onChange={e => setCreateForm((p:any) => ({ ...p, contact: { ...p.contact, contact_name: e.target.value } }))} onBlur={() => {
                      const c = String(createForm.contact.contact_name || '');
                      if (c) setCreateForm((p:any) => ({ ...p, contact: { ...p.contact, contact_name: capitalizeName(c) } }));
                      validateClientFields();
                    }} />
                    {clientErrors.contact_name && <div className="text-xs text-red-600 mt-1">{clientErrors.contact_name}</div>}
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600">Email</label>
                    <input className="border rounded px-2 py-1 w-full" value={createForm.contact.email} onChange={e => setCreateForm((p:any) => ({ ...p, contact: { ...p.contact, email: String(e.target.value).toLowerCase() } }))} onBlur={() => validateClientFields()} />
                    {clientErrors.email && <div className="text-xs text-red-600 mt-1">{clientErrors.email}</div>}
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600">Teléfono</label>
                    <div className="phone-wrapper border rounded px-2 py-1 w-full">
                      <PhoneInput
                        international
                        defaultCountry={createForm.contact.country || 'CL'}
                        value={createForm.contact.phone || ''}
                        onChange={(val) => {
                          setCreateForm((p:any) => ({ ...p, contact: { ...p.contact, phone: val } }));
                        }}
                      />
                    </div>
                    {clientErrors.phone && <div className="text-xs text-red-600 mt-1">{clientErrors.phone}</div>}
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600">País</label>
                    <select className="border rounded px-2 py-1 w-full" value={createForm.contact.country} onChange={e => setCreateForm((p:any) => ({ ...p, contact: { ...p.contact, country: e.target.value, region: '', city: '' } }))}>
                      <option value="CL">Chile</option>
                      <option value="PE">Perú</option>
                      <option value="AR">Argentina</option>
                      <option value="UY">Uruguay</option>
                      <option value="BR">Brasil</option>
                      <option value="OT">Otro</option>
                    </select>
                  </div>

                  {createForm.contact.country === 'CL' && (
                    <>
                      <div>
                        <label className="block text-xs text-gray-600">Región</label>
                        <select className="border rounded px-2 py-1 w-full" value={createForm.contact.region} onChange={e => setCreateForm((p:any) => ({ ...p, contact: { ...p.contact, region: e.target.value, city: '' } }))}>
                          <option value="">Selecciona región</option>
                          {regionList.map((r: any) => (
                            <option key={r.isoCode} value={r.isoCode}>{r.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-600">Comuna / Ciudad</label>
                        <select className="border rounded px-2 py-1 w-full" value={createForm.contact.city} onChange={e => setCreateForm((p:any) => ({ ...p, contact: { ...p.contact, city: e.target.value } }))} disabled={!createForm.contact.region}>
                          <option value="">Selecciona comuna</option>
                          {cityList.map((c: any) => (
                            <option key={`${c.name}-${c.latitude || ''}`} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-xs text-gray-600">Dirección</label>
                    <input className="border rounded px-2 py-1 w-full" value={createForm.contact.company_address} onChange={e => setCreateForm((p:any) => ({ ...p, contact: { ...p.contact, company_address: e.target.value } }))} />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600">Código Postal</label>
                    <input className="border rounded px-2 py-1 w-full" value={createForm.contact.postal_code} onChange={e => setCreateForm((p:any) => ({ ...p, contact: { ...p.contact, postal_code: e.target.value } }))} />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs text-gray-600">Notas</label>
                    <input className="border rounded px-2 py-1 w-full" value={createForm.contact.notes} onChange={e => setCreateForm((p:any) => ({ ...p, contact: { ...p.contact, notes: e.target.value } }))} />
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <button className="px-3 py-1 bg-gray-300 rounded" onClick={() => { setSelectedClientId(null); setCreateForm((p:any) => ({ ...p, contact: { company: '', contact_name: '', email: '', phone: '', document: '', company_address: '', country: 'CL', region: '', city: '', postal_code: '', notes: '' } })); setClientErrors({}); }}>Limpiar</button>
                  <button
                    className={`px-3 py-1 text-white rounded ${selectedClientId ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-500 hover:bg-gray-700'}`}
                    onClick={async () => {
                      if (!clientIsValid) { validateClientFields(); return; }
                      // If no client selected, create it on first click
                      if (!selectedClientId) {
                        const ok = await handleCreateClient();
                        if (!ok) return;
                        // client created successfully — do not auto-advance, button will now show 'Siguiente' and be green
                        return;
                      }
                      // If client already selected, advance to next section
                      setCreateSection('products');
                    }}
                    disabled={!clientIsValid || creatingClient}
                  >{creatingClient ? 'Procesando...' : (selectedClientId ? 'Siguiente' : 'Crear cliente')}</button>
                </div>
              </div>
            )}
            {/* Productos: sólo visible en el paso 'products' */}
            {createSection === 'products' && (
              <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                  </div>
                <div className="flex gap-2 items-end mb-2">
                  <div className="flex-1 relative">
                    <label className="block text-sm text-gray-600">Buscar productos</label>
                    <input className="border rounded px-2 py-1 w-full pr-8" value={productSearchQuery} onChange={e => setProductSearchQuery(e.target.value)} placeholder="Busca por nombre, SKU, descripción, fabricante..." />
                    {productSearchQuery && (
                      <button
                        className="absolute right-2 bottom-1.5 text-gray-500 hover:text-gray-700"
                        onClick={() => { setProductSearchQuery(''); setProductSearchResults([]); }}
                        aria-label="Limpiar búsqueda"
                      >&times;</button>
                    )}
                  </div>
                </div>
                {productSearchResults && productSearchResults.length > 0 ? (
                  <div className="mb-2">
                    <div className="text-sm text-gray-600 mb-2">Resultados encontrados:</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {productSearchResults.map((p,i) => (
                        <div key={i} className="flex items-start gap-3 border rounded p-3 bg-white">
                          {/* Imagen del producto */}
                          {(() => {
                            const imgs = Array.isArray(p.image_url) ? p.image_url : p.image_url ? [p.image_url] : []
                            const thumb = imgs && imgs.length ? imgs[0] : null
                            return thumb ? (
                              <Image src={String(thumb)} alt={p.name || 'producto'} width={64} height={64} className="object-contain rounded border bg-gray-50" />
                            ) : (
                              <div className="w-16 h-16 flex items-center justify-center text-gray-400 bg-gray-50 border rounded text-xs">(sin imagen)</div>
                            )
                          })()}
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm">{p.name} <span className="text-xs text-gray-500">({p.sku})</span></div>
                            <div className="text-xs text-gray-600 mt-1">Precio: {p.price ? `$${p.price}` : '-'}</div>
                            {/* Descripción */}
                            <div className="text-xs text-gray-700 mt-2">
                              <span className="font-semibold">Descripción:</span> {p.description || <span className="text-gray-400">(sin descripción)</span>}
                            </div>
                            {/* Características */}
                            {(() => {
                              const chars = Array.isArray(p.characteristics) ? p.characteristics : []
                              return chars.length > 0 ? (
                                <div className="mt-2">
                                  <div className="text-xs font-semibold text-gray-700 mb-1">Características:</div>
                                  <div className="flex flex-wrap gap-1">
                                    {chars.map((c: string, idx: number) => (
                                      <span key={idx} className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded">{String(c)}</span>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs text-gray-400 mt-2">Sin características</div>
                              )
                            })()}
                          </div>
                          <div className="flex-shrink-0">
                            <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm" onClick={() => addExistingProduct(p)}>Agregar</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mb-2 text-sm text-gray-500">No se encontraron productos</div>
                )}

                {/* Lista de productos añadidos para cotización */}
                {createForm.items && createForm.items.length > 0 && (
                  <div className="overflow-x-auto mt-4 mb-4">
                    <h4 className="text-sm font-semibold mb-2 text-gray-700">Productos añadidos a la cotización:</h4>
                    <table className="min-w-full text-xs border">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-2 py-1 border">Código</th>
                          <th className="px-2 py-1 border">Características</th>
                          <th className="px-2 py-1 border">Cantidad</th>
                          <th className="px-2 py-1 border">Unidad</th>
                          <th className="px-2 py-1 border">Precio estimado</th>
                          <th className="px-2 py-1 border">Valor producto</th>
                          <th className="px-2 py-1 border">Subtotal productos</th>
                          <th className="px-2 py-1 border">Descuento %</th>
                          <th className="px-2 py-1 border">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {createForm.items.map((it: any, idx: number) => {
                          const priceUnit = Number(it.price) || 0;
                          const qty = Number(it.qty) || 1;
                          const discount = typeof it.discount === 'number' ? it.discount : 0;
                          const valorProducto = typeof it.update_price === 'number' ? it.update_price : 0;
                          const price = valorProducto * qty;
                          const subtotal = price - (price * (discount / 100));
                          return (
                            <tr key={idx} className="border-b">
                              <td className="px-2 py-1 border text-center">{it.sku || '-'}</td>
                              <td className="px-2 py-1 border">
                                <div className="font-semibold">{it.name}</div>
                                <div className="text-xs text-gray-500">{Array.isArray(it.characteristics) ? it.characteristics.join(', ') : (it.characteristics || '-')}</div>
                              </td>
                              <td className="px-2 py-1 border text-center">
                                <div className="flex items-center justify-center">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    min={1}
                                    className="bg-gray-100 px-2 py-1 w-14 text-center appearance-none outline-none"
                                    style={{ border: 'none', borderRadius: '6px' }}
                                    value={qty}
                                    onChange={e => {
                                      const raw = e.target.value.replace(/[^0-9]/g, '');
                                      const value = Math.max(1, Number(raw));
                                      const items = [...createForm.items];
                                      items[idx].qty = value;
                                      setCreateForm({ ...createForm, items });
                                    }}
                                  />
                                </div>
                              </td>
                              <td className="px-2 py-1 border text-center">{it.measurement_unit || '-'}</td>
                              <td className="px-2 py-1 border text-right">$ {priceUnit.toLocaleString()}</td>
                              <td className="px-2 py-1 border text-right">
                                <div className="flex items-center justify-center">
                                  <span className="text-gray-700 font-bold flex-shrink-0 mr-1">$</span>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    min={0}
                                    className="bg-gray-100 px-2 py-1 w-20 text-center appearance-none outline-none"
                                    style={{ border: 'none', borderRadius: '6px' }}
                                    value={valorProducto.toLocaleString('es-CL')}
                                    onChange={e => {
                                      // Eliminar caracteres no numéricos
                                      const raw = e.target.value.replace(/[^0-9]/g, '');
                                      const value = Number(raw);
                                      const items = [...createForm.items];
                                      items[idx].update_price = value;
                                      setCreateForm({ ...createForm, items });
                                    }}
                                  />
                                </div>
                              </td>
                              <td className="px-2 py-1 border text-right">$ {price.toLocaleString()}</td>
                              <td className="px-2 py-1 border text-right">
                                <div className="flex items-center justify-center">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    min={0}
                                    max={100}
                                    className="bg-gray-100 px-2 py-1 w-14 text-center appearance-none outline-none"
                                    style={{ border: 'none', borderRadius: '6px' }}
                                    value={discount}
                                    onChange={e => {
                                      const raw = e.target.value.replace(/[^0-9]/g, '');
                                      const value = Number(raw);
                                      const items = [...createForm.items];
                                      items[idx].discount = value;
                                      setCreateForm({ ...createForm, items });
                                    }}
                                  />
                                  <span className="ml-1">%</span>
                                </div>
                              </td>
                              <td className="px-2 py-1 border text-right">$ {Math.round(subtotal).toLocaleString()}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {/* Resumen de totales */}
                    <div className="flex justify-end mt-4">
                      {(() => {
                        // Calcular totales
                        const netoSinDescuento = createForm.items.reduce((acc: number, it: any) => {
                          const valorProducto = typeof it.update_price === 'number' ? it.update_price : 0;
                          const qty = Number(it.qty) || 1;
                          return acc + (valorProducto * qty);
                        }, 0);
                        const netoConDescuento = createForm.items.reduce((acc: number, it: any) => {
                          const valorProducto = typeof it.update_price === 'number' ? it.update_price : 0;
                          const qty = Number(it.qty) || 1;
                          const discount = typeof it.discount === 'number' ? it.discount : 0;
                          const subtotal = (valorProducto * qty) - ((valorProducto * qty) * (discount / 100));
                          return acc + subtotal;
                        }, 0);
                        const iva = Math.round(netoConDescuento * 0.19);
                        const total = netoConDescuento + iva;
                        return (
                          <div style={{ border: '2px solid #a62626', minWidth: '320px', maxWidth: '400px', background: '#fff' }}>
                            <table style={{ width: '100%' }}>
                              <tbody>
                                <tr>
                                  <td style={{ fontWeight: 'normal', padding: '8px 0 4px 16px', fontSize: '0.95rem' }}>Total Neto Sin Descuento:</td>
                                  <td style={{ textAlign: 'right', fontWeight: 'normal', padding: '8px 16px 4px 0', fontSize: '0.95rem' }}>$ {netoSinDescuento.toLocaleString('es-CL')}</td>
                                </tr>
                                <tr style={{ background: '#f7f7f7' }}>
                                  <td style={{ fontWeight: 'normal', padding: '4px 0 4px 16px', fontSize: '0.95rem' }}>Total Neto:</td>
                                  <td style={{ textAlign: 'right', fontWeight: 'normal', padding: '4px 16px 4px 0', fontSize: '0.95rem' }}>$ {netoConDescuento.toLocaleString('es-CL')}</td>
                                </tr>
                                <tr>
                                  <td style={{ fontWeight: 'normal', padding: '4px 0 4px 16px', fontSize: '0.95rem' }}>IVA (19%):</td>
                                  <td style={{ textAlign: 'right', fontWeight: 'normal', padding: '4px 16px 4px 0', fontSize: '0.95rem' }}>$ {iva.toLocaleString('es-CL')}</td>
                                </tr>
                                <tr>
                                                                   <td style={{ fontWeight: 'bold', padding: '4px 0 8px 16px', fontSize: '1rem', color: '#a62626' }}>TOTAL:</td>
                                  <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '4px 16px 8px 0', fontSize: '1rem', color: '#a62626' }}>$ {total.toLocaleString('es-CL')}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Botón de flecha: muestra solo la acción relevante (Mostrar u Ocultar) */}
                <div className="mt-4 mb-2 flex items-center gap-3 justify-center">
                  {productPanelOpen ? (
                    <button
                      title="Ocultar Crear producto"
                      className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700"
                      onClick={() => setProductPanelOpen(false)}
                      aria-label="Ocultar crear producto"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      title="Mostrar Crear producto"
                      className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700"
                      onClick={() => setProductPanelOpen(true)}
                      aria-label="Mostrar crear producto"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="mb-2 text-center text-xs font-normal text-gray-400">Crear Producto</div>
                {productPanelOpen && (
                  <div className="mb-2 mt-16">
                    <ProductCreateForm
                      matchingProducts={productSearchResults}
                      showMatches={showMatches}
                      selectedExistingImages={selectedExistingImages}
                      setSelectedExistingImages={setSelectedExistingImages}
                      newFiles={newFiles}
                      setNewFiles={setNewFiles}
                      newProduct={productForm as NewProduct}
                      setNewProduct={setProductForm as any}
                      unitSizeInputs={unitSizeInputs}
                      setUnitSizeInputs={setUnitSizeInputs}
                      descriptionInputs={descriptionInputs}
                      setDescriptionInputs={setDescriptionInputs}
                      charRows={charRows}
                      setCharRows={setCharRows}
                      appRows={appRows}
                      setAppRows={setAppRows}
                      supplierSelected={supplierSelected}
                      setSupplierSelected={setSupplierSelected}
                      allSuppliers={allSuppliers}
                      showSupplierDetails={showSupplierDetails}
                      setShowSupplierDetails={setShowSupplierDetails}
                      supplierQuery={supplierQuery}
                      setSupplierQuery={setSupplierQuery}
                      handleSelectProduct={addExistingProduct}
                      unitLabels={unitLabels}
                      newProductPriceDisplay={newProductPriceDisplay}
                      setNewProductPriceDisplay={setNewProductPriceDisplay}
                      formatCurrencyInput={formatCurrencyInput}
                      combinePairsToStrings={combinePairsToStrings}
                      convertFractionToDecimal={convertFractionToDecimal}
                      fetchProducts={fetchProducts}
                      setAlert={setToast}
                      setSearchQuery={setProductSearchQuery}
                      creating={creatingProduct}
                      setCreating={setCreatingProduct}
                      setShowCreateForm={setShowCreateModal}
                      setShowMatches={setShowMatches}
                      PhotoIcon={PhotoIcon}
                    />
                  </div>
                )}
                <div className="flex justify-end mt-6">
                  <button
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                    onClick={() => setCreateSection('items')}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
            {/* Items: sólo visible en el paso 'items' */}
            {createSection === 'items' && (
              <div className="mb-4">
                <h3 className="text-lg font-bold mb-2 text-red-700">Enviar cotización</h3>
                {/* PDF Preview */}
                <div className="mb-6 border rounded-lg shadow p-6 bg-white" style={{maxWidth:'800px',margin:'0 auto'}}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold text-xl text-red-700">Cotización Fasercon</div>
                    <div className="text-xs text-gray-500">{new Date().toLocaleDateString('es-CL')}</div>
                  </div>
                  <div className="border-b pb-2 mb-2 flex flex-wrap gap-6">
                    <div>
                      <div className="font-semibold text-gray-700">Empresa:</div>
                      <div>{createForm.contact.company || '-'}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-700">Contacto:</div>
                      <div>{createForm.contact.contact_name || '-'}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-700">Email:</div>
                      <div>{createForm.contact.email || '-'}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-700">Teléfono:</div>
                      <div>{createForm.contact.phone || '-'}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-700">RUT:</div>
                      <div>{createForm.contact.document || '-'}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-700">Dirección:</div>
                      <div>{createForm.contact.company_address || '-'}</div>
                    </div>
                  </div>
                  <div className="mb-2">
                    <div className="font-semibold text-gray-700 mb-2">Productos</div>
                    <table className="min-w-full text-xs border">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-2 py-1 border">Código</th>
                          <th className="px-2 py-1 border">Nombre</th>
                          <th className="px-2 py-1 border">Características</th>
                          <th className="px-2 py-1 border">Cantidad</th>
                          <th className="px-2 py-1 border">Unidad</th>
                          <th className="px-2 py-1 border">Precio</th>
                          <th className="px-2 py-1 border">Descuento %</th>
                          <th className="px-2 py-1 border">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {createForm.items && createForm.items.length > 0 ? createForm.items.map((it: any, idx: number) => {
                          const priceUnit = Number(it.price) || 0;
                          const qty = Number(it.qty) || 1;
                          const discount = typeof it.discount === 'number' ? it.discount : 0;
                          const valorProducto = typeof it.update_price === 'number' ? it.update_price : priceUnit;
                          const price = valorProducto * qty;
                          const subtotal = price - (price * (discount / 100));
                          return (
                            <tr key={idx} className="border-b">
                              <td className="px-2 py-1 border text-center">{it.sku || '-'}</td>
                              <td className="px-2 py-1 border">{it.name}</td>
                              <td className="px-2 py-1 border">{Array.isArray(it.characteristics) ? it.characteristics.join(', ') : (it.characteristics || '-')}</td>
                              <td className="px-2 py-1 border text-center">{qty}</td>
                              <td className="px-2 py-1 border text-center">{it.unit_size || '-'} {it.measurement_unit || ''}</td>
                              <td className="px-2 py-1 border text-right">$ {valorProducto.toLocaleString('es-CL')}</td>
                              <td className="px-2 py-1 border text-right">{discount}%</td>
                              <td className="px-2 py-1 border text-right">$ {Math.round(subtotal).toLocaleString('es-CL')}</td>
                            </tr>
                          );
                        }) : (
                          <tr><td colSpan={8} className="text-center text-gray-400 py-2">No hay productos agregados</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {/* Totals */}
                  <div className="flex justify-end mt-4">
                    {(() => {
                      const netoSinDescuento = createForm.items.reduce((acc: number, it: any) => {
                        const valorProducto = typeof it.update_price === 'number' ? it.update_price : Number(it.price) || 0;
                        const qty = Number(it.qty) || 1;
                        return acc + (valorProducto * qty);
                      }, 0);
                      const netoConDescuento = createForm.items.reduce((acc: number, it: any) => {
                        const valorProducto = typeof it.update_price === 'number' ? it.update_price : Number(it.price) || 0;
                        const qty = Number(it.qty) || 1;
                        const discount = typeof it.discount === 'number' ? it.discount : 0;
                        const subtotal = (valorProducto * qty) - ((valorProducto * qty) * (discount / 100));
                        return acc + subtotal;
                      }, 0);
                      const iva = Math.round(netoConDescuento * 0.19);
                      const total = netoConDescuento + iva;
                      return (
                        <div style={{ border: '2px solid #a62626', minWidth: '320px', maxWidth: '400px', background: '#fff' }}>
                          <table style={{ width: '100%' }}>
                            <tbody>
                              <tr>
                                <td style={{ fontWeight: 'normal', padding: '8px 0 4px 16px', fontSize: '0.95rem' }}>Total Neto Sin Descuento:</td>
                                <td style={{ textAlign: 'right', fontWeight: 'normal', padding: '8px 16px 4px 0', fontSize: '0.95rem' }}>$ {netoSinDescuento.toLocaleString('es-CL')}</td>
                              </tr>
                              <tr style={{ background: '#f7f7f7' }}>
                                <td style={{ fontWeight: 'normal', padding: '4px 0 4px 16px', fontSize: '0.95rem' }}>Total Neto:</td>
                                <td style={{ textAlign: 'right', fontWeight: 'normal', padding: '4px 16px 4px 0', fontSize: '0.95rem' }}>$ {netoConDescuento.toLocaleString('es-CL')}</td>
                              </tr>
                              <tr>
                                <td style={{ fontWeight: 'normal', padding: '4px 0 4px 16px', fontSize: '0.95rem' }}>IVA (19%):</td>
                                <td style={{ textAlign: 'right', fontWeight: 'normal', padding: '4px 16px 4px 0', fontSize: '0.95rem' }}>$ {iva.toLocaleString('es-CL')}</td>
                              </tr>
                              <tr>
                                <td style={{ fontWeight: 'bold', padding: '4px 0 8px 16px', fontSize: '1rem', color: '#a62626' }}>TOTAL:</td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '4px 16px 8px 0', fontSize: '1rem', color: '#a62626' }}>$ {total.toLocaleString('es-CL')}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                  </div>
                  {/* Disclaimer */}
                  <div className="mt-6 p-3 border rounded bg-gray-50 text-xs text-gray-600">
                    Esta solicitud de cotización no constituye una oferta ni compromiso comercial. Su propósito es recopilar información preliminar para evaluar alternativas. Los valores, condiciones y disponibilidad serán confirmados únicamente en una cotización formal.
                  </div>
                </div>
                {/* Product editing UI removed from section 3 as requested */}
              </div>
            )}
            </div>
            <div className="mt-auto pt-4 pb-4">
              <div className="flex items-center justify-center gap-3">
                <div className="flex flex-col items-center">
                  <button
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-600 hover:text-white rounded"
                    type="button"
                    onClick={() => {
                      const hasClientData = Object.values(createForm.contact).some(v => v && String(v).trim() !== '');
                      const hasProducts = Array.isArray(createForm.items) && createForm.items.length > 0;
                      if (hasClientData || hasProducts) {
                        setShowCancelConfirm(true);
                      } else {
                        handleCancelCreateModal();
                      }
                    }}
                  >Cancelar</button>
                </div>

                {showCancelConfirm && (
                  <>
                    <div className="fixed inset-0 bg-black/40 z-[88]" onClick={() => setShowCancelConfirm(false)} />
                    <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[90] px-6 py-4 rounded-xl shadow-lg font-normal text-gray-800 bg-white border border-yellow-300" role="dialog" aria-modal="true">
                      <div className="mb-2 text-lg font-normal text-yellow-800 text-center">¿Cancelar creación de la cotización?</div>
                      <div className="mb-3 text-sm text-gray-600 text-center">Al descartar este borrador se cerrará el proceso actual. Los clientes y productos que hayas creado permanecerán guardados en el sistema y podrán reutilizarse más adelante.</div>
                      <div className="flex gap-3 justify-center mt-6">
                        <button className="px-4 py-2 bg-gray-100 rounded border" onClick={() => setShowCancelConfirm(false)}>Seguir editando</button>
                        <button className="px-4 py-2 bg-red-600 text-white rounded" onClick={() => { setShowCancelConfirm(false); handleCancelCreateModal(); }}>Descartar y cerrar</button>
                      </div>
                    </div>
                  </>
                )}
                {createSection === 'items' && (
                  <>
                    <button
                      className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                      onClick={handleSaveDraft}
                      disabled={savingDraft}
                    >
                      {savingDraft ? 'Guardando...' : 'Guardar borrador'}
                    </button>
                    <button
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      disabled={savingDraft || sending}
                      onClick={async () => {
                        setSending(true);
                        try {
                          const payload = {
                            contact: createForm.contact,
                            items: createForm.items,
                            createdAt: new Date().toISOString(),
                            sendEmail: true
                          };
                          const res = await fetch('/api/send-quote-response', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                          });
                          if (!res.ok) {
                            setToast({ type: 'error', message: 'Error al enviar la cotización por correo.' });
                          } else {
                            setToast({ type: 'success', message: 'La cotización fue enviada correctamente por correo.' });
                            // Espera 2 segundos para que el usuario vea la alerta y luego cierra el modal
                            setTimeout(() => {
                              setShowCreateModal(false);
                            }, 2000);
                          }
                        } catch {
                          setToast({ type: 'error', message: 'Error inesperado al enviar.' });
                        } finally {
                          setSending(false);
                        }
                      }}
                    >
                      {sending ? 'Enviando...' : 'Enviar cotización'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Remove DashboardHeader, now rendered in layout */}
      {/* <DashboardHeader title="Cotizaciones" /> */}
      {loading ? (
        <div>Cargando...</div>
      ) : (
        <div className="px-2 sm:px-4 py-4 space-y-8 mt-1 lg:mt-2 overflow-x-hidden">
          {quotes.map((q) => (
            <div key={q.id} className="bg-white border border-gray-200 rounded-lg shadow p-4 relative">
              {/* Badge posicionado absolutamente en el centro superior del contenedor */}
              {(() => {
                const s = (q.status ?? '').toString().toUpperCase();
                let cls = 'bg-gray-400 text-white';
                let label = q.status ?? '';
                if (s === 'PENDING' || s === 'PENDIENTE') { cls = 'bg-yellow-400 text-yellow-700'; label = 'PENDIENTE'; }
                else if (s === 'SENT' || s === 'ENVIADO') { cls = 'bg-orange-500 text-orange-300'; label = 'ENVIADO'; }
                else if (s === 'APPROVED' || s === 'ACEPTADO') { cls = 'bg-green-600 text-green-300'; label = 'ACEPTADO'; }
                else if (s === 'REJECTED' || s === 'RECHAZADO') { cls = 'bg-red-600 text-red-300'; label = 'RECHAZADO'; }
                return (
                  <div className="absolute left-1/2 -translate-x-1/2 top-3">
                    <button className={`px-6 py-2 rounded-full text-sm font-normal mt-3 ${cls}`} aria-hidden>
                      {label}
                    </button>
                  </div>
                );
              })()}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2 gap-2">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="font-bold text-lg text-red-700">{q.name}</div>
                    <div className="text-sm text-gray-600">{q.email} | {q.phone}</div>
                  </div>
                  {/* badge moved to absolute position to avoid changing layout */}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-gray-500">{q.createdAt ? new Date(q.createdAt).toLocaleString() : '-'}</div>
                  <button
                    onClick={() => toggleCollapse(q.id)}
                    className="text-blue-500 hover:text-blue-700 text-sm flex items-center justify-center w-10 h-10 rounded-md"
                    aria-label={collapsedQuotes[q.id] ? 'Expandir cotización' : 'Colapsar cotización'}
                    title={collapsedQuotes[q.id] ? 'Expandir' : 'Colapsar'}
                  >
                    {collapsedQuotes[q.id] ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-down">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-up">
                        <polyline points="18 15 12 9 6 15"></polyline>
                      </svg>
                    )}
                  </button>
                </div>
                {/* Floating action button: Nueva Cotización (restaurado) */}
                <button
                  onClick={openCreateModal}
                  aria-label="Nueva Cotización"
                  title="Nueva Cotización (N)"
                  className="fixed bottom-6 right-6 z-50 bg-red-600 hover:bg-red-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
                  {!collapsedQuotes[q.id] && (
                    <>
                      <div className="flex flex-wrap gap-4 mb-2">
                <div><span className="font-semibold">Área:</span> {q.area ?? '-'}</div>
                <div><span className="font-semibold">Material:</span> {q.materialType ?? '-'}</div>
                <div><span className="font-semibold">Precio estimado:</span> {q.estimatedPrice ? `$${q.estimatedPrice.toLocaleString()}` : '-'}</div>
                <div><span className="font-semibold">Estado:</span> {q.status ?? '-'}</div>
              </div>
              <div className="flex flex-wrap gap-4 mb-2 text-xs text-gray-700">
                <div><span className="font-semibold">Compañía:</span> {q.items?.[0]?.company ?? '-'}</div>
                <div><span className="font-semibold">Email:</span> {q.items?.[0]?.email ?? '-'}</div>
                <div><span className="font-semibold">Teléfono:</span> {q.items?.[0]?.phone ?? '-'}</div>
                <div><span className="font-semibold">Documento:</span> {q.items?.[0]?.document ?? '-'}</div>
                <div><span className="font-semibold">Creado:</span> {q.items?.[0]?.created_at ? new Date(q.items[0].created_at!).toLocaleString() : (q.createdAt ? new Date(q.createdAt).toLocaleString() : '-')}</div>
                <div><span className="font-semibold">quote_id:</span> {q.items?.[0]?.quote_id ?? '-'}</div>
                <div><span className="font-semibold">Descuento:</span> {q.items?.[0]?.discount ? `${q.items[0].discount}%` : '-'}</div>
              </div>
              {/* Acciones para la solicitud de cotización alineadas a la derecha */}
              <div className="flex gap-3 mt-4 mb-2 justify-end">
                <button className="px-3 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 transition" onClick={() => {
                  setSelectedQuote(q);
                  setEditedPrices({});
                  setShowModal(true);
                  setOriginalOrder(q.items ? q.items.map(item => item.id) : []);
                }}>Precios</button>
                <button
                  disabled={sending}
                  className={`px-3 py-2 ${sending ? 'bg-red-700 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'} text-white rounded transition`}
                  onClick={async () => {
                    setSending(true);
                    try {
                      // Preparar datos para la API
                      const firstItem = (q.items && q.items[0]) as Record<string, unknown>;
                      const contact = {
                        company: String(firstItem?.company ?? '').toUpperCase(),
                        email: firstItem?.email ?? '',
                        phone: firstItem?.phone ?? '',
                        document: firstItem?.document ?? '',
                        company_address: firstItem?.company_address ?? firstItem?.company ?? 'N/A',
                        contact_name: q.name ?? '',
                      };
                      const items = (q.items ?? []).map(item => {
                        const basePrice = typeof item.update_price === 'number' ? item.update_price : item.price;
                        const subtotal = basePrice ? Math.round(basePrice * 1.19) : 0;
                        // Extraer SKU y características del producto relacionado si existe
                        const product = (item as Record<string, unknown>).product as Record<string, unknown>;
                        const sku = (item as Record<string, unknown>).sku || product?.sku || '';
                        const characteristics = (item as Record<string, unknown>).characteristics || product?.characteristics || [];
                        return {
                          ...item,
                          price: basePrice,
                          subtotal,
                          sku,
                          characteristics,
                        };
                      });
                      const total = items.reduce((acc, item) => acc + (item.subtotal ?? 0), 0);

                      // Primero guardar/actualizar la cotización en el backend
                      const saveResp = await fetch('/api/quotes', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          contact,
                          items,
                          parent_quote_id: q.id,
                        }),
                      });

                      if (!saveResp.ok) {
                        alert('Error guardando la cotización antes de enviar');
                        return;
                      }

                      // saveJson eliminado: variable no utilizada

                      // Luego generar PDF de respuesta (cotización con precios) y enviar
                      const response = await fetch('/api/send-quote-response', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          quote_id: q.id,
                          contact,
                          items,
                          createdAt: q.createdAt ?? new Date().toISOString(),
                          total,
                          sendEmail: true,
                        }),
                      });

                      if (!response.ok) {
                        alert('Error generating PDF or sending email');
                        setSending(false);
                        return;
                      }

                      const emailSent = response.headers.get('x-email-sent') === 'true';
                      if (emailSent) {
                        alert('Cotización generada y enviada por email correctamente.');
                      } else {
                        alert('Cotización guardada, pero el correo no se pudo enviar. Revisa los logs en el servidor.');
                      }
                      setSending(false);
                    } catch (err) {
                      console.error(err);
                      alert('Error al generar o enviar la cotización.');
                    } finally {
                      setSending(false);
                    }
                  }}
                >
                  {sending ? 'Enviando...' : 'Enviar Cotización'}
                </button>
                <button className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition">Ver historial</button>
              </div>
              {/* Mobile: items as cards */}
              <div className="md:hidden space-y-2">
                {q.items && q.items.length > 0 ? (
                  q.items.map((item) => (
                    <div key={item.id} className="border rounded p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 truncate">{item.name}</div>
                          <div className="text-xs text-gray-600">Qty: {item.qty} · {item.unit_size || '-'} {item.measurement_unit || ''}</div>
                          <div className="text-xs text-gray-600">Precio: {item.price ? `$${item.price.toLocaleString()}` : '-'}</div>
                          <div className="text-xs text-gray-600 truncate">ID: {item.id.split('-')[0]}</div>
                        </div>
                        {item.image_url ? (
                          <div className="w-12 h-12 flex-shrink-0 relative border rounded bg-white overflow-hidden">
                            <Image src={String(item.image_url)} alt={item.name} width={48} height={48} className="w-full h-full object-cover" />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-400 text-sm">Sin productos</div>
                )}
              </div>

              {/* Desktop: table fixed without horizontal scroll */}
              <div className="hidden md:block overflow-x-hidden">
                <table className="min-w-full bg-white border border-gray-200 text-xs table-fixed">
                  <thead>
                    <tr>
                      <th className="px-2 py-1 border-b w-[10%]">product_id</th>
                      <th className="px-2 py-1 border-b w-[18%]">Producto</th>
                      <th className="px-2 py-1 border-b w-[10%]">Imagen</th>
                      <th className="px-2 py-1 border-b w-[8%]">Cantidad</th>
                      <th className="px-2 py-1 border-b w-[14%] text-center">Unidad</th>
                      <th className="px-2 py-1 border-b w-[14%]">Características</th>
                      <th className="px-2 py-1 border-b w-[12%]">Descripción</th>
                      {/* <th className="px-2 py-1 border-b w-[10%]">Fabricante</th> */}
                      <th className="px-2 py-1 border-b w-[12%] text-center">Valor unitario</th>
                      <th className="px-2 py-1 border-b w-[12%] text-center">Precio</th>
                      <th className="px-2 py-1 border-b w-[10%]">Descuento (%)</th>
                      <th className="px-2 py-1 border-b w-[12%] text-center">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.items && q.items.length > 0 ? (
                      q.items.map((item) => {
                        const product: Product = item.product ?? {
                          id: 0,
                          name: '',
                          image_url: '',
                          unit_size: '',
                          measurement_unit: '',
                          price: undefined,
                          characteristics: [],
                          description: '',
                          manufacturer: '',
                        };
                        let characteristics: string[] = [];
                        if (Array.isArray(product.characteristics)) {
                          characteristics = product.characteristics;
                        } else if (typeof product.characteristics === 'string') {
                          try {
                            characteristics = JSON.parse(product.characteristics);
                          } catch {}
                        }
                        // Calcular valor unitario y precio total (qty * update_price cuando exista)
                        const perUnit = typeof item.update_price === 'number' ? item.update_price : (typeof product.price === 'number' ? product.price : item.price);
                        const priceTotal = (typeof item.update_price === 'number' && typeof item.qty === 'number')
                          ? Math.round(item.update_price * item.qty)
                          : (typeof perUnit === 'number' && typeof item.qty === 'number' ? Math.round(perUnit * item.qty) : null);
                        // Calcular descuento y subtotal: subtotal = priceTotal - (priceTotal * discount/100)
                        const discountPercent = typeof item.discount === 'number' ? item.discount : 0;
                        const discountAmount = priceTotal !== null ? Math.round(priceTotal * (discountPercent / 100)) : 0;
                        const subtotal = priceTotal !== null ? (priceTotal - discountAmount) : 0;
                        return (
                          <tr key={item.id} className="border-b">
                              <td className="px-2 py-1 truncate">
                                <span title={product.id?.toString()}>
                                  {product.id !== undefined && product.id !== null
                                    ? product.id.toString().split('-')[0]
                                    : ''}
                                </span>
                              </td>
                              <td className="px-2 py-1 truncate">{product.name ?? item.name}</td>
                              <td className="px-2 py-1">
                              {product.image_url ? (
                                <div className="relative w-10 h-10">
                                  <Image src={Array.isArray(product.image_url) ? product.image_url[0] as string : (product.image_url as string)} alt={product.name || ''} fill className="object-contain rounded border" sizes="40px" />
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                              <td className="px-2 py-1 text-center">{item.qty}</td>
                              <td className="px-2 py-1 text-center">{product.unit_size ?? item.unit_size ?? '-'} {product.measurement_unit ?? item.measurement_unit ?? ''}</td>
                              <td className="px-2 py-1 truncate">
                              {characteristics.length > 0 ? (
                                  <div className="flex flex-wrap gap-1 overflow-hidden">
                                  {characteristics.map((c, idx) => (
                                      <span key={idx} className="inline-block bg-gray-100 border border-gray-300 rounded-full px-2 py-0.5 text-[10px] text-gray-700">
                                      {c}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                              <td className="px-2 py-1 truncate" title={product.description ?? ''}>{product.description ?? '-'}</td>
                              {/* <td className="px-2 py-1 truncate">{product.manufacturer ?? '-'}</td> */}
                              <td className="px-2 py-1 text-center">{typeof perUnit === 'number' ? `$${perUnit.toLocaleString('es-CL')}` : '-'}</td>
                              <td className="px-2 py-1 text-center">{priceTotal !== null ? `$${priceTotal.toLocaleString('es-CL')}` : '-'}</td>
                              <td className="px-2 py-1 text-center">{item.discount ? `${item.discount}%` : '-'}</td>
                              <td className="px-2 py-1 text-center">{subtotal ? `$${subtotal.toLocaleString('es-CL')}` : '-'}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr><td colSpan={14} className="text-center text-gray-400 py-2">Sin productos</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

