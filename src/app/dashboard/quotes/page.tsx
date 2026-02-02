"use client";

import { useEffect, useMemo, useRef, useState, Fragment } from "react";
import { State, City } from 'country-state-city';
import Image from 'next/image'
import ProductCreateForm from '@/components/ProductCreateForm'
import { PhotoIcon } from '@heroicons/react/24/outline'
import { Loader } from 'lucide-react'
import { Pair, NewProduct } from '@/lib/types'
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { formatCLP } from '@/lib/format'


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
  description?: string | null;
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
  correlative?: string;
  description?: string;
  quote_number?: string;
    execution_time?: string | null;
    payment_method?: string | null;
};

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [editedQuote, setEditedQuote] = useState<Quote | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [mainRect, setMainRect] = useState<DOMRect | null>(null);
  // Estado separado para los precios, cantidades y descuentos editables
  const [editedPrices, setEditedPrices] = useState<Record<string, number>>({});
  const [editedQtys, setEditedQtys] = useState<Record<string, number>>({});
  const [originalOrder, setOriginalOrder] = useState<string[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [editedDiscounts, setEditedDiscounts] = useState<Record<string, number>>({}) // porcentaje
  const [editedUnits, setEditedUnits] = useState<Record<string, string>>({}) // unidades de medida
  const [editedCharacteristics, setEditedCharacteristics] = useState<Record<string, string[]>>({}) // características por item
  const [sending, setSending] = useState(false);
  const [versionsModalOpen, setVersionsModalOpen] = useState(false);
  const [versionsList, setVersionsList] = useState<any[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [selectedVersionPayload, setSelectedVersionPayload] = useState<any | null>(null);
  const [, setSelectedVersionMeta] = useState<any | null>(null);
  const [selectedQuoteForVersions, setSelectedQuoteForVersions] = useState<string | null>(null);
  // Estado para saber qué cotización está previsualizando PDF
  const [previewingPdfId, setPreviewingPdfId] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [savingModalChanges, setSavingModalChanges] = useState(false);
  // Estado para cotizaciones colapsadas (true = colapsada)
  const [collapsedQuotes, setCollapsedQuotes] = useState<Record<string, boolean>>({});

  const toggleCollapse = (quoteId: string) => {
    setCollapsedQuotes((prev) => ({ ...prev, [quoteId]: !prev[quoteId] }));
  };

  // Sync originalOrder across modal, selectedQuote and the main quotes list
  const syncOriginalOrder = (updater: any) => {
    setOriginalOrder(prev => {
      const next: string[] = typeof updater === 'function' ? updater(prev || []) : (Array.isArray(updater) ? updater : prev || []);
      // build ordered items from current editedQuote or selectedQuote
      const sourceItems = (editedQuote && editedQuote.items) ? editedQuote.items : (selectedQuote && selectedQuote.items ? selectedQuote.items : []);
      const idToItem = new Map<string, any>();
      (sourceItems || []).forEach((it: any) => idToItem.set(it.id, it));
      const orderedItems = (next || []).map(id => idToItem.get(id)).filter(Boolean);
      // append any items not included in originalOrder to preserve
      const remaining = (sourceItems || []).filter((it: any) => !((next || []).includes(it.id)));
      const finalItems = [...orderedItems, ...remaining];

      if (editedQuote) setEditedQuote(prevQ => prevQ ? ({ ...prevQ, items: finalItems }) : prevQ);
      if (selectedQuote && (editedQuote?.id ?? selectedQuote.id) === selectedQuote.id) setSelectedQuote(prev => prev ? ({ ...prev, items: finalItems }) : prev);
      setQuotes(prevQs => prevQs.map(q => (q.id === (editedQuote?.id ?? selectedQuote?.id) ? ({ ...q, items: finalItems }) : q)));
      return next;
    });
  };

  // Estados para búsqueda de productos/servicios en modal de edición
  const [editModalProductSearchQuery, setEditModalProductSearchQuery] = useState('');
  const [editModalProductSearchResults, setEditModalProductSearchResults] = useState<any[]>([]);
  const [editModalShowMatches, setEditModalShowMatches] = useState(false);

  // Guardar precios editados en la base de datos
  async function handleSavePrices() {
    setSavingModalChanges(true);
    // Guardar cambios de cotización (campos generales + precios por ítem)
    // Mapa para relacionar IDs temporales creados en cliente con IDs reales de BD
    const createdIdMap: Record<string, string> = {};
    if (!editedQuote) {
      setSavingModalChanges(false);
      return;
    }
    console.log('[handleSavePrices] Iniciando guardado. editedQuote:', editedQuote);
    console.log('[handleSavePrices] editedPrices:', editedPrices);
    console.log('[handleSavePrices] editedQtys:', editedQtys);
    console.log('[handleSavePrices] editedDiscounts:', editedDiscounts);
    try {
      // Map temporal IDs to real IDs for items created during this save
      const fields = ['name', 'email', 'phone', 'description', 'execution_time', 'payment_method'];
      const quotePayload: Record<string, unknown> = {};
      for (const f of fields) {
        const newVal = (editedQuote as any)[f];
        const oldVal = (selectedQuote as any)?.[f];
        // Comparar strings/undefined/null equivalentes
        const normNew = newVal == null ? '' : String(newVal);
        const normOld = oldVal == null ? '' : String(oldVal);
        if (normNew !== normOld) quotePayload[f] = newVal;
      }
      if (Object.keys(quotePayload).length > 0) {
        await fetch(`/api/quotes/${editedQuote.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(quotePayload),
        });
      }
    } catch (err) {
      console.error('Error actualizando cotización:', err);
    }

    // Actualizar precios/descuentos SOLO si cambiaron en los items
    if (editedQuote.items) {
      console.log(`[handleSavePrices] Total items a procesar: ${editedQuote.items.length}`);
      for (const item of editedQuote.items) {
        if (!item.id) {
          console.warn('Item sin ID, saltando:', item);
          continue;
        }
        
        // Detectar si es un item nuevo (ID temporal comienza con 'tmp-')
        const isNewItem = String(item.id).startsWith('tmp-');
        
        if (isNewItem) {
          // Crear nuevo item en la base de datos
          const newChars = editedCharacteristics[item.id] ?? (Array.isArray(item.characteristics) ? item.characteristics : (typeof item.characteristics === 'string' ? (function(){ try { return JSON.parse(String(item.characteristics)) } catch { return String(item.characteristics).split(',').map(s=>s.trim()).filter(Boolean) } })() : []));
          const payload = {
            quote_id: editedQuote.id,
            product_id: item.product_id,
            name: item.name ?? '',
            description: item.description ?? null,
            image_url: item.image_url ?? null,
            unit_size: item.unit_size ?? null,
            measurement_unit: item.measurement_unit ?? '',
            qty: editedQtys[item.id] ?? item.qty ?? 1,
            price: item.price ?? 0,
            update_price: editedPrices[item.id] ?? item.update_price ?? item.price ?? 0,
            discount: editedDiscounts[item.id] ?? item.discount ?? 0,
            company: item.company ?? null,
            email: item.email ?? null,
            phone: item.phone ?? null,
            document: item.document ?? null,
            characteristics: newChars,
          };
          
          console.log(`[handleSavePrices] ➕ Creando nuevo item:`, payload);
          try {
            const res = await fetch('/api/quotes/items', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            if (!res.ok) {
              const errText = await res.text();
              console.error(`❌ Error creando item: ${res.status}`, errText);
            } else {
              const result = await res.json();
              console.log(`✅ Item creado correctamente. Respuesta:`, result);
              // Actualizar el ID temporal con el ID real devuelto
              const realItemId = result?.item?.id || result?.id;
              if (realItemId) {
                // Track mapping so we can persist ordering later in this function
                createdIdMap[item.id] = realItemId;
                setEditedQuote(prev => {
                  if (!prev) return prev;
                  const newItems = (prev.items || []).map(it => it.id === item.id ? ({ ...it, id: realItemId }) : it);
                  return { ...prev, items: newItems };
                });
                setSelectedQuote(prev => {
                  if (!prev) return prev;
                  const newItems = (prev.items || []).map(it => it.id === item.id ? ({ ...it, id: realItemId }) : it);
                  return { ...prev, items: newItems };
                });
                // Actualizar originalOrder con el ID real
                syncOriginalOrder((prev: string[]) => prev.map(id => id === item.id ? realItemId : id));
              }
            }
          } catch (err) {
            console.error('Error creando item', err);
          }
        } else {
          // Actualizar item existente
          // Compare against the original values from `selectedQuote` (not the possibly-modified `editedQuote` item)
          const originalItem = selectedQuote?.items?.find(it => it.id === item.id) ?? null;
          const newPrice = editedPrices[item.id] ?? item.update_price ?? item.price ?? 0;
          const newQty = editedQtys[item.id] ?? item.qty ?? 1;
          const newDiscount = editedDiscounts[item.id] ?? item.discount ?? 0;
          const newUnit = editedUnits[item.id] ?? item.measurement_unit ?? '';
          const newName = editedQuote.items?.find(it => it.id === item.id)?.name ?? item.name ?? '';
          const oldPrice = originalItem?.update_price ?? originalItem?.price ?? item.update_price ?? item.price ?? 0;
          const oldQty = originalItem?.qty ?? item.qty ?? 1;
          const oldDiscount = originalItem?.discount ?? item.discount ?? 0;
          const oldUnit = originalItem?.measurement_unit ?? item.measurement_unit ?? '';

          console.log(`[handleSavePrices] Item ${item.id} - Comparando:`, {
            newPrice, oldPrice, priceChanged: newPrice !== oldPrice,
            newQty, oldQty, qtyChanged: newQty !== oldQty,
            newDiscount, oldDiscount, discountChanged: newDiscount !== oldDiscount,
            newUnit, oldUnit, unitChanged: newUnit !== oldUnit
          });

          // Solo actualizar si el precio, cantidad, descuento, unidad o características cambiaron
          const newChars = editedCharacteristics[item.id] ?? (Array.isArray(item.characteristics) ? item.characteristics : (typeof item.characteristics === 'string' ? (function(){ try { return JSON.parse(String(item.characteristics)) } catch { return String(item.characteristics).split(',').map(s=>s.trim()).filter(Boolean) } })() : []));
          const oldCharsRaw = originalItem?.characteristics ?? item.characteristics ?? [];
          const oldChars = Array.isArray(oldCharsRaw) ? oldCharsRaw : (typeof oldCharsRaw === 'string' ? (function(){ try { return JSON.parse(String(oldCharsRaw)) } catch { return String(oldCharsRaw).split(',').map(s=>s.trim()).filter(Boolean) } })() : []);
          const charsChanged = JSON.stringify(newChars) !== JSON.stringify(oldChars);
          const nameChanged = String(newName) !== String(originalItem?.name ?? item.name ?? '');
          if (newPrice !== oldPrice || newQty !== oldQty || newDiscount !== oldDiscount || newUnit !== oldUnit || charsChanged || nameChanged) {
            const payload: Record<string, unknown> = { update_price: newPrice, qty: newQty, discount: newDiscount, measurement_unit: newUnit, characteristics: newChars, name: newName };
            console.log(`[handleSavePrices] 🔄 Enviando PATCH para item ${item.id}:`, payload);
            try {
              const res = await fetch(`/api/quotes/items/${item.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
              if (!res.ok) {
                const errText = await res.text();
                console.error(`❌ Error actualizando item ${item.id}: ${res.status}`, errText);
              } else {
                const result = await res.json();
                console.log(`✅ Item ${item.id} actualizado correctamente. Respuesta:`, result);
                const updatedUnit = (result && (result.item?.measurement_unit ?? result.item?.unit_measure)) ?? newUnit;
                const updatedCharsRaw = result && (result.item?.characteristics ?? null);
                let updatedChars: any = updatedCharsRaw;
                if (typeof updatedCharsRaw === 'string') {
                  try { updatedChars = JSON.parse(updatedCharsRaw); } catch { updatedChars = String(updatedCharsRaw).split(',').map((s:string)=>s.trim()).filter(Boolean); }
                }
                // Update local editedQuote and selectedQuote to reflect new values immediately
                setEditedQuote(prev => {
                  if (!prev) return prev;
                  const newItems = (prev.items || []).map(it => it.id === item.id ? ({ ...it, update_price: newPrice, qty: newQty, discount: newDiscount, measurement_unit: updatedUnit, characteristics: updatedChars ?? newChars }) : it);
                  return { ...prev, items: newItems };
                });
                setSelectedQuote(prev => {
                  if (!prev) return prev;
                  const newItems = (prev.items || []).map(it => it.id === item.id ? ({ ...it, update_price: newPrice, qty: newQty, discount: newDiscount, measurement_unit: updatedUnit, characteristics: updatedChars ?? newChars }) : it);
                  return { ...prev, items: newItems };
                });
              }
            } catch (err) {
              console.error('Error actualizando item', item.id, err);
            }
          }
        }
      }
    }

    // Persistir el orden actual de items (si el usuario reordenó)
    try {
      const finalOrder = originalOrder.map(id => (createdIdMap[id] ?? id));
      // Also update local quotes state with final ordering so UI reflects changes
      try {
        const finalItems: QuoteItem[] = (editedQuote.items || []).slice();
        const orderedItems = finalOrder
          .map(id => finalItems.find((it: QuoteItem) => it.id === id))
          .filter((it): it is QuoteItem => !!it);
        // If some items are missing in finalOrder, append them
        const missing = finalItems.filter((it: QuoteItem) => !finalOrder.includes(it.id));
        const finalOrderedItems: QuoteItem[] = [...orderedItems, ...missing];
        setQuotes(prev => prev.map(q => q.id === editedQuote.id ? ({ ...q, items: finalOrderedItems }) : q));
        setSelectedQuote(prev => prev ? ({ ...prev, items: finalOrderedItems }) : prev);
      } catch (err) {
        console.error('Error updating local quotes order', err);
      }
      for (let i = 0; i < finalOrder.length; i++) {
        const itemId = finalOrder[i];
        if (!itemId) continue;
        // Skip any remaining temporary IDs
        if (String(itemId).startsWith('tmp-')) continue;
        try {
          const res = await fetch(`/api/quotes/items/${itemId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orden: i + 1 }),
          });
          if (!res.ok) {
            const bodyText = await res.text().catch(() => '');
            console.error(`Error guardando orden para item ${itemId}:`, res.status, bodyText);
            // If backend tells us the `orden` column is missing, show actionable SQL to the user
            try {
              const parsed = bodyText ? JSON.parse(bodyText) : null;
              const migrationSql = parsed?.migration_sql ?? null;
              if (migrationSql) {
                alert('La base de datos no tiene la columna `orden`. Para habilitar la persistencia del orden, ejecuta en tu base de datos:\n\n' + migrationSql + '\n\nPuedes ejecutar esto desde Supabase SQL editor.');
                // Stop further attempts
                break;
              }
            } catch {
              // ignore parse errors
            }
          }
        } catch (err) {
          console.error('Error PATCH orden item', itemId, err);
        }
      }
    } catch (err) {
      console.error('Error persisting item order', err);
    }

    // Eliminar items que fueron marcados para eliminación
    if ((editedQuote as any)?._deletedItemIds && (editedQuote as any)._deletedItemIds.length > 0) {
      console.log(`[handleSavePrices] Eliminando ${(editedQuote as any)._deletedItemIds.length} items de la BD`);
      for (const deletedId of (editedQuote as any)._deletedItemIds) {
        try {
          const res = await fetch(`/api/quotes/items/${deletedId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
          });
          if (!res.ok) {
            const errText = await res.text();
            console.error(`❌ Error eliminando item ${deletedId}: ${res.status}`, errText);
          } else {
            console.log(`✅ Item ${deletedId} eliminado correctamente`);
          }
        } catch (err) {
          console.error('Error eliminando item', deletedId, err);
        }
      }
    }

    alert('Cambios guardados correctamente');
    setSavingModalChanges(false);
    // Close modal immediately without clearing editedQuote yet
    setShowModal(false);
    setOriginalOrder([]);
    setDropIndex(null);
    setDraggingId(null);
    // Clear editing states
    setEditedPrices({});
    setEditedQtys({});
    setEditedDiscounts({});
    setEditedUnits({});
    setEditedCharacteristics({});
    setEditModalProductSearchQuery('');
    setEditModalProductSearchResults([]);
    setEditModalShowMatches(false);
    // Refresh list from database
    await refreshQuotes();
    // Clear editedQuote after modal is closed to avoid showing stale data
    setEditedQuote(null);
    setSelectedQuote(null);
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
    description: '',
    execution_time: '',
    payment_method: ''
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
  const [originalClient, setOriginalClient] = useState<any | null>(null);
  const [updatingClient, setUpdatingClient] = useState(false);
  

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
  const removeCreateItem = (idx: number) => {
    setCreateForm((prev: any) => ({ ...prev, items: Array.isArray(prev.items) ? prev.items.filter((_: any, i: number) => i !== idx) : [] }));
  };

  const handleSaveDraft = async () => {
    // Validación: al menos uno de los campos de contacto debe estar presente
    const { company, contact_name, email } = createForm.contact || {};
    if (!company && !contact_name && !email) {
      setToast({ type: 'error', message: 'Debes ingresar al menos empresa, nombre de contacto o email para guardar el borrador.' });
      return;
    }
    setSavingDraft(true);
    try {
      const payload = { ...createForm, draft: true };
      if (selectedClientId) {
        payload.client_id = selectedClientId;
      }
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const text = await res.text().catch(() => '');
      let parsedBody: any = text;
      try { parsedBody = text ? JSON.parse(text) : null; } catch { /* ignore */ }
      console.debug('[DEBUG] handleSaveDraft response status:', res.status, 'body:', parsedBody);
      if (res.ok) {
        setToast({ type: 'success', message: 'Borrador guardado correctamente' });
        // Cerrar modal inmediatamente
        setShowCreateModal(false);
        // Limpiar formulario inmediatamente
        setCreateForm({
          contact: { company: '', email: '', phone: '', document: '', company_address: '', contact_name: '', country: 'CL', region: '', city: '', postal_code: '', notes: '' },
          items: [],
          description: '',
          execution_time: '',
          payment_method: ''
        });
        setCreateSection('client');
      } else {
        console.warn('Failed to save draft:', res.status, parsedBody);
        const msg = parsedBody?.message || 'Error al guardar borrador';
        setToast({ type: 'error', message: msg });
      }
    } catch (err) {
      console.error('Error guardando borrador', err);
      setToast({ type: 'error', message: 'Error inesperado al guardar borrador' });
    } finally {
      setSavingDraft(false);
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

  // Normalize and compare client fields to detect meaningful edits
  const fieldAliases: Record<string, string[]> = {
    company: ['company', 'empresa', 'name'],
    contact_name: ['contact_name', 'contact', 'nombre'],
    email: ['email', 'correo'],
    phone: ['phone', 'telefono', 'phone_number'],
    document: ['document', 'rut', 'documento'],
    company_address: ['company_address', 'address', 'direccion'],
    country: ['country', 'pais'],
    region: ['region'],
    city: ['city', 'comuna', 'ciudad'],
    postal_code: ['postal_code', 'zip', 'codigo_postal'],
    notes: ['notes', 'nota', 'observaciones']
  };

  const getOriginalValue = (orig: any, key: string) => {
    if (!orig) return '';
    const aliases = fieldAliases[key] || [key];
    for (const a of aliases) {
      if (orig[a] !== undefined && orig[a] !== null) return orig[a];
    }
    return '';
  };

  const normalizeForCompare = (key: string, val: any) => {
    if (val === null || val === undefined) return '';
    const s = String(val).trim();
    if (s === '') return '';
    if (key === 'email') return s.toLowerCase();
    if (key === 'company') return s.replace(/\s+/g, ' ').toUpperCase();
    if (key === 'contact_name') return s.replace(/\s+/g, ' ').toLowerCase();
    if (key === 'document') return cleanRUT(s);
    if (key === 'phone') return s.replace(/[^\d\+]/g, '');
    return s.replace(/\s+/g, ' ');
  };

  const clientFieldsChanged = (orig: any, current: any) => {
    if (!orig) return false;
    const keys = Object.keys(fieldAliases);
    for (const k of keys) {
      const origVal = normalizeForCompare(k, getOriginalValue(orig, k));
      const curVal = normalizeForCompare(k, (current || {})[k]);
      if (origVal !== curVal) return true;
    }
    return false;
  };

  // Buscar clientes por texto (company / email / document)
  const searchClients = async (q: string) => {
    try {
      if (!q) return setClientSearchResults([]);
      const res = await fetch(`/api/clients?q=${encodeURIComponent(q)}`);
      if (!res.ok) return setClientSearchResults([]);
      const data = await res.json();
      const list = Array.isArray(data?.clients) ? data.clients : (Array.isArray(data) ? data : (data ? [data] : []));
      if (list.length > 0) {
        setClientSearchResults(list);
        return;
      }

      // Fallback: if server returned no matches, fetch all clients and search across all fields locally
      try {
        const allRes = await fetch('/api/clients');
        if (!allRes.ok) return setClientSearchResults([]);
        const allData = await allRes.json();
        const allList = Array.isArray(allData?.clients) ? allData.clients : (Array.isArray(allData) ? allData : []);
        const term = q.toLowerCase();
        const filtered = allList.filter((item: any) => {
          for (const key of Object.keys(item)) {
            const val = item[key];
            if (val === null || val === undefined) continue;
            if (typeof val === 'string' && val.toLowerCase().includes(term)) return true;
            if (typeof val === 'number' && String(val).includes(term)) return true;
            // for objects (metadata), stringify and search
            if (typeof val === 'object') {
              try {
                const s = JSON.stringify(val).toLowerCase();
                if (s.includes(term)) return true;
              } catch { }
            }
          }
          return false;
        }).slice(0, 100);
        setClientSearchResults(filtered);
        return;
      } catch (e) {
        console.error('Fallback client search failed', e);
        setClientSearchResults([]);
      }
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
    const q = String(clientSearchQuery || '').trim();
    // only search when at least 3 characters have been entered
    if (!q || q.length < 3) {
      setClientSearchResults([]);
      return;
    }
    clientSearchTimeout.current = window.setTimeout(() => {
      searchClients(q);
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
  const productListRef = useRef<HTMLDivElement>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showQuoteSendConfirm, setShowQuoteSendConfirm] = useState(false);
  const [quoteToSend, setQuoteToSend] = useState<Quote | null>(null);
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
    m2: 'm²',
    m3: 'm³',
    m_lin: 'metro lineal (m)',
    kg: 'kilogramo (kg)',
    g: 'gramo (g)',
    ton: 'tonelada (t)',
    l: 'litro (l)',
    box: 'caja',
    pack: 'paquete',
    roll: 'rollo',
    other: 'Otro',
  };
  function normalizeUnitKey(u: string | null | undefined) {
    if (!u) return '';
    if ((unitLabels as any)[u]) return u;
    const found = Object.entries(unitLabels).find(([, v]) => v === u || v.includes(String(u)));
    if (found) return found[0];
    const stripped = String(u).replace(/^unidad\s+/i, '').trim();
    const found2 = Object.entries(unitLabels).find(([, v]) => v === stripped || v.includes(stripped));
    if (found2) return found2[0];
    return String(u);
  }
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
  const productSearchRef = useRef<HTMLInputElement | null>(null);
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);

  const searchProducts = async (q: string) => {
    try {
      if (!q || q.trim() === '') return setProductSearchResults([]);
      // fetch products and quote-services in parallel
      const [prodRes, svcRes] = await Promise.all([
        fetch(`/api/products?q=${encodeURIComponent(q.trim())}`),
        fetch(`/api/quote-services?q=${encodeURIComponent(q.trim())}`),
      ]);
      const prodJson = prodRes.ok ? await prodRes.json() : { products: [] };
      const svcJson = svcRes.ok ? await svcRes.json() : { services: [] };
      const products = Array.isArray(prodJson?.products) ? prodJson.products : [];
      const services = Array.isArray(svcJson?.services) ? svcJson.services : [];
      // If query looks like a UUID, also try direct fetch by id for both tables
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const rawQ = q.trim();
      const isFullUuid = uuidRegex.test(rawQ);
      // Only attempt direct fetch when we have a full UUID
      if (isFullUuid) {
        try {
          const byIdProd = await fetch(`/api/products/${encodeURIComponent(rawQ)}`);
          if (byIdProd.ok) {
            const single = await byIdProd.json();
            // backend might return object or { product }
            const p = single && (single.product || single);
            if (p) products.unshift(p);
          }
        } catch { /* ignore */ }
        try {
          const byIdSvc = await fetch(`/api/quote-services/${encodeURIComponent(rawQ)}`);
          if (byIdSvc.ok) {
            const single = await byIdSvc.json();
            const s = single && (single.service || single);
            if (s) services.unshift(s);
          }
        } catch { /* ignore */ }
      }
      // normalize services to product-like shape: use `name` for display
      const normalizedServices = services.map((s: any) => ({
        ...s,
        _type: 'service',
        name: s.title || s.name || 'Servicio',
        sku: s.sku || s.id,
        price: s.price ?? 0,
        measurement_unit: s.unit_measure || s.measurement_unit || null,
        image_url: s.image_url || (Array.isArray(s.images) ? s.images[0] : null),
      }));
      const normalizedProducts = products.map((p: any) => ({ ...p, _type: 'product' }));
      // merge and dedupe by id/sku
      const merged: any[] = [];
      const seen = new Set<string>();
      for (const item of [...normalizedServices, ...normalizedProducts]) {
        const key = String(item.id || item.sku || item.product_id || '');
        if (!key) continue;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(item);
      }
      setProductSearchResults(merged);
    } catch (err) {
      console.error(err);
      setProductSearchResults([]);
    }
  };

  useEffect(() => {
    const ta = descriptionRef.current;
    if (!ta) return;
    // reset height to compute scrollHeight correctly
    ta.style.height = 'auto';
    const max = Math.round((window.innerHeight || 800) * 0.45); // max ~45% viewport height
    const newHeight = Math.min(ta.scrollHeight, max);
    ta.style.height = `${newHeight}px`;
    ta.style.maxHeight = `${max}px`;
    ta.style.overflowY = ta.scrollHeight > max ? 'auto' : 'hidden';
  }, [createForm.description]);

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
            price: p.price ?? 0,
            update_price: p.price ?? 0,
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
    // Restablecer el buscador
    setProductSearchQuery('');
    setProductSearchResults([]);
    setShowMatches(false);
  }

  // Agregar producto existente a la cotización en edición (modal)
  const addExistingProductToEditedQuote = (p: any) => {
    if (!editedQuote) return;
    
    const items = Array.isArray(editedQuote.items) ? [...editedQuote.items] : [];
    const pid = p.id ?? p.product_id ?? p.sku ?? String(Math.random());
    const existingIndex = items.findIndex((it: any) => String(it.product_id) === String(pid));

    // Si el producto ya existe, incrementar cantidad
    if (existingIndex !== -1) {
      items[existingIndex] = { ...items[existingIndex], qty: (Number(items[existingIndex].qty) || 1) + 1 };
      setEditedQuote({ ...editedQuote, items });
      setToast({ type: 'success', message: 'Cantidad incrementada' });
    } else {
      // Crear nuevo item
      const newItem = {
        id: `tmp-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        quote_id: editedQuote.id || '',
        product_id: String(pid),
        sku: p.sku || '',
        name: p.name || '',
        image_url: Array.isArray(p.image_url) ? (p.image_url[0] || null) : (p.image_url || null),
        unit_size: p.unit_size || null,
        measurement_unit: p.measurement_unit || null,
        qty: 1,
        price: p.price ?? 0,
        update_price: p.price ?? 0,
        discount: 0,
        company: null,
        email: null,
        phone: null,
        document: null,
        created_at: null,
        characteristics: p.characteristics || null,
        product: p
      };
      
      const updatedItems = [...items, newItem];
      setEditedQuote({ ...editedQuote, items: updatedItems });
      
      // Actualizar originalOrder: si estaba vacío, inicializarlo; si no, agregar al final
      setOriginalOrder((prev) => {
        if (prev.length === 0) {
          return updatedItems.map(it => it.id);
        }
        return [...prev, newItem.id];
      });
      
      setToast({ type: 'success', message: 'Producto agregado a la cotización' });
    }
    
    // Restablecer el buscador del modal
    setEditModalProductSearchQuery('');
    setEditModalProductSearchResults([]);
    setEditModalShowMatches(false);
  }

  // Eliminar item de la cotización en edición
  const removeItemFromEditedQuote = (itemId: string) => {
    if (!editedQuote) return;
    
    // Si el item tiene ID real (no temporal), marcarlo para eliminación en DB
    if (!String(itemId).startsWith('tmp-')) {
      // Agregar a un array de items para eliminar (lo haremos en handleSavePrices)
      // Por ahora, solo lo marcamos en el estado
      setEditedQuote((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: (prev.items || []).filter(item => item.id !== itemId),
          _deletedItemIds: [...((prev as any)._deletedItemIds || []), itemId]
        };
      });
    } else {
      // Si es un item temporal, simplemente eliminarlo del estado
      setEditedQuote((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: (prev.items || []).filter(item => item.id !== itemId)
        };
      });
    }
    
    // Eliminar de originalOrder (y sincronizar visualizaciones)
    syncOriginalOrder((prev: string[]) => prev.filter(id => id !== itemId));
    
    // Limpiar estados de edición para ese item
    setEditedPrices(prev => {
      const newPrices = { ...prev };
      delete newPrices[itemId];
      return newPrices;
    });
    setEditedQtys(prev => {
      const newQtys = { ...prev };
      delete newQtys[itemId];
      return newQtys;
    });
    setEditedDiscounts(prev => {
      const newDiscounts = { ...prev };
      delete newDiscounts[itemId];
      return newDiscounts;
    });
    setEditedUnits(prev => {
      const newUnits = { ...prev };
      delete newUnits[itemId];
      return newUnits;
    });
    setEditedCharacteristics(prev => {
      const newChars = { ...prev };
      delete newChars[itemId];
      return newChars;
    });
    setToast({ type: 'success', message: 'Producto eliminado de la cotización' });
  }

  // Buscar productos/servicios para el modal de edición
  const searchProductsForEditModal = async (q: string) => {
    try {
      if (!q || q.trim() === '') return setEditModalProductSearchResults([]);
      const [prodRes, svcRes] = await Promise.all([
        fetch(`/api/products?q=${encodeURIComponent(q.trim())}`),
        fetch(`/api/quote-services?q=${encodeURIComponent(q.trim())}`),
      ]);
      const prodJson = prodRes.ok ? await prodRes.json() : { products: [] };
      const svcJson = svcRes.ok ? await svcRes.json() : { services: [] };
      const products = Array.isArray(prodJson?.products) ? prodJson.products : [];
      const services = Array.isArray(svcJson?.services) ? svcJson.services : [];
      
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const rawQ = q.trim();
      const isFullUuid = uuidRegex.test(rawQ);
      
      if (isFullUuid) {
        try {
          const byIdProd = await fetch(`/api/products/${encodeURIComponent(rawQ)}`);
          if (byIdProd.ok) {
            const single = await byIdProd.json();
            const p = single && (single.product || single);
            if (p) products.unshift(p);
          }
        } catch { /* ignore */ }
        try {
          const byIdSvc = await fetch(`/api/quote-services/${encodeURIComponent(rawQ)}`);
          if (byIdSvc.ok) {
            const single = await byIdSvc.json();
            const s = single && (single.service || single);
            if (s) services.unshift(s);
          }
        } catch { /* ignore */ }
      }
      
      const normalizedServices = services.map((s: any) => ({
        ...s,
        _type: 'service',
        name: s.title || s.name || 'Servicio',
        sku: s.sku || s.id,
        price: s.price ?? 0,
        measurement_unit: s.unit_measure || s.measurement_unit || null,
        image_url: s.image_url || (Array.isArray(s.images) ? s.images[0] : null),
      }));
      const normalizedProducts = products.map((p: any) => ({ ...p, _type: 'product' }));
      
      const merged: any[] = [];
      const seen = new Set<string>();
      for (const item of [...normalizedServices, ...normalizedProducts]) {
        const key = String(item.id || item.sku || item.product_id || '');
        if (!key) continue;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(item);
      }
      setEditModalProductSearchResults(merged);
    } catch (err) {
      console.error(err);
      setEditModalProductSearchResults([]);
    }
  };

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
            return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(v ?? 0);
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
      const t = setTimeout(() => {
        setToast(null);
        // Scroll to product list after toast disappears
        if (productListRef.current) {
          productListRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 3500);
      return () => clearTimeout(t);
    }
  }, [toast]);

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
    const q = String(productSearchQuery || '').trim();
    // Only start searching when there are at least 3 characters
    if (!q || q.length < 3) {
      setProductSearchResults([]);
      return;
    }
    productSearchTimeout.current = window.setTimeout(() => {
      searchProducts(q);
    }, 300);
    return () => {
      if (productSearchTimeout.current) clearTimeout(productSearchTimeout.current);
    };
  }, [productSearchQuery]);
  

  const openCreateModal = () => {
    setCreateForm({ contact: { company: '', contact_name: '', email: '', phone: '', document: '', company_address: '', country: 'CL', region: '', city: '', postal_code: '', notes: '' }, items: [], description: '', execution_time: '', payment_method: '' });
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

  // Refresh helper usable by UI buttons
  const refreshQuotes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/quotes');
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      setQuotes(arr);
    } catch (err) {
      console.error('Error refreshing quotes', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to send a quote selected from the list after confirmation
  async function sendQuoteFromList() {
    const q = quoteToSend;
    if (!q) return;
    setShowQuoteSendConfirm(false);
    setSending(true);
    try {
      // Final fetch to ensure we're using the very latest data
      let liveQuote: Quote | null = null;
      try {
        const res = await fetch('/api/quotes');
        if (res.ok) {
          const all = await res.json();
          liveQuote = all.find((x: Quote) => x.id === q.id) ?? null;
        }
      } catch {
        // ignore and fallback
      }
      if (!liveQuote) liveQuote = (selectedQuote && selectedQuote.id === q.id) ? selectedQuote : (quotes.find(x => x.id === q.id) ?? q as Quote);

      // Generate PDF and send (endpoint will fetch items from DB automatically)
      const response = await fetch('/api/send-quote-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          quote_id: q.id, 
          sendEmail: true 
        }),
      });

      if (!response.ok) {
        alert('Error generating PDF or sending email');
        setSending(false);
        return;
      }

      const emailSent = response.headers.get('x-email-sent') === 'true';
      if (emailSent) {
        setToast({ type: 'success', message: 'Cotización enviada por email correctamente.' });
        // Refresh quotes list to reflect updated status
        await refreshQuotes();
      } else {
        setToast({ type: 'error', message: 'Cotización guardada, pero el correo no se pudo enviar.' });
      }
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: 'Error al generar o enviar la cotización.' });
    } finally {
      setSending(false);
      setQuoteToSend(null);
    }
  }

  // Preview PDF for a given quote (opens PDF in new tab) — uses the formal "Cotización" template
  async function previewQuotePdf(q: Quote) {
    // El estado de previewingPdfId se maneja en el botón, no aquí
    try {
      // Usar la misma lógica que send-quote-response: pasar quote_id y dejar que el API lo resuelva
      const payload: Record<string, unknown> = {
        quote_id: q.id,
        sendEmail: false,
      };

      const resp = await fetch('/api/send-quote-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        setToast({ type: 'error', message: 'Error generando PDF.' });
        return;
      }

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Error previewing PDF', err);
      setToast({ type: 'error', message: 'Error generando previsualización.' });
    } finally {
      // El estado de previewingPdfId se maneja en el botón, no aquí
    }
  }

  // Versions modal helpers
  async function openVersionsModal(quoteId: string) {
    console.log('[Versions] openVersionsModal called for', quoteId);
    setSelectedQuoteForVersions(quoteId);
    setVersionsModalOpen(true);
    setVersionsLoading(true);
    try {
      const res = await fetch(`/api/quotes/${encodeURIComponent(quoteId)}/versions`);
      console.log('[Versions] fetch response status', res.status);
      if (!res.ok) {
        setVersionsList([]);
      } else {
        const data = await res.json();
        console.log('[Versions] data received', data);
        setVersionsList(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch versions', err);
      setVersionsList([]);
    } finally {
      setVersionsLoading(false);
    }
  }

  async function fetchAndShowVersion(quoteId: string, version: string | number) {
    try {
      const verPath = String(version) === 'latest' ? 'latest' : String(version);
      const res = await fetch(`/api/quotes/${encodeURIComponent(quoteId)}/versions/${verPath}`);
      if (!res.ok) {
        setSelectedVersionMeta(null);
        setSelectedVersionPayload(null);
        return;
      }
      const data = await res.json();
      setSelectedVersionMeta({ id: data.id, version: data.version, correlativo: data.correlativo, created_by: data.created_by, created_at: data.created_at });
      setSelectedVersionPayload(data.payload ?? null);
    } catch (err) {
      console.error('Failed to fetch version payload', err);
      setSelectedVersionMeta(null);
      setSelectedVersionPayload(null);
    }
  }

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
    setCreateForm({ contact: { company: '', contact_name: '', email: '', phone: '', document: '', company_address: '', country: 'CL', region: '', city: '', postal_code: '', notes: '' }, items: [], description: '', execution_time: '', payment_method: '' });
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
          className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] px-8 py-5 rounded-xl shadow-2xl font-normal text-base text-white transition-all duration-300 ${toast.type === 'success' ? 'bg-green-600/70' : 'bg-red-600/70'}`}
          style={{ minWidth: '320px', maxWidth: '90vw', textAlign: 'center', backdropFilter: 'blur(4px)', opacity: 0.98, boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}
        >
          {toast.message}
        </div>
      )}
      {/* Confirmation modal for sending a quote from the list (rendered once) */}
      {showQuoteSendConfirm && (
        <>
          <div className="fixed inset-0 bg-black/60 z-[110]" onClick={() => { setShowQuoteSendConfirm(false); setQuoteToSend(null); }} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[111] px-8 py-6 rounded-xl shadow-lg font-normal text-gray-800 bg-white border border-gray-200" role="dialog" aria-modal="true">
            <div className="mb-2 text-xl font-bold text-gray-400 text-center">Confirmar envío</div>
              <div className="mb-3 text-sm text-gray-600 text-center">¿Deseas enviar la cotización seleccionada al cliente?</div>
              {(quoteToSend && (quoteToSend.items ?? []).some((it:any) => {
                const hasUpdate = it.update_price !== null && it.update_price !== undefined;
                const hasPrice = it.price !== null && it.price !== undefined;
                if (hasUpdate) return Number(it.update_price) === 0;
                if (hasPrice) return Number(it.price) === 0;
                return false;
              })) && (
                <div className="mb-3 text-sm text-red-700 text-center">
                  <div>Advertencia: hay productos con valor 0 en esta cotización.</div>
                  <div>Revisa los precios antes de enviar, o elige Continuar para enviar.</div>
                </div>
              )}
            <div className="flex gap-3 justify-center mt-6">
              <button className="px-4 py-2 bg-gray-100 rounded border" onClick={() => { setShowQuoteSendConfirm(false); setQuoteToSend(null); }}>Cancelar</button>
              <button className="px-4 py-2 bg-red-600 text-white rounded" onClick={async () => { await sendQuoteFromList(); }}>Continuar</button>
            </div>
          </div>
        </>
      )}
      {/* Floating action buttons (top-right) visible only when create modal is closed */}
      {!showCreateModal && (
        <div className="fixed top-12 right-12 z-[120] flex flex-col gap-3 items-end">
          <div className="flex flex-row gap-2 items-center">
            <button
              onClick={openCreateModal}
              aria-label="Crear cotización"
              title="Crear cotización"
              className="h-12 w-12 rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>

            <button
              onClick={refreshQuotes}
              aria-label="Actualizar cotizaciones"
              title="Actualizar cotizaciones"
              className="h-10 w-10 rounded-full bg-gray-100 text-red-600 shadow-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-red-400 flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <polyline points="23 4 23 10 17 10" strokeLinecap="round" strokeLinejoin="round"></polyline>
                <polyline points="1 20 1 14 7 14" strokeLinecap="round" strokeLinejoin="round"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.13-3.36" strokeLinecap="round" strokeLinejoin="round"></path>
                <path d="M20.49 15a9 9 0 0 1-14.13 3.36" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
            </button>
          </div>
        </div>
      )}
        {showModal && editedQuote && (
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
                  justifyContent: 'center',
                  overflow: 'auto'
                } as const;
              }
              // fallback seguro si no hay mainRect
              return { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto' } as const;
            })()}
          >
          <div style={{ backgroundColor: 'rgba(0,0,0,0.15)', position: 'absolute', inset: 0 }} />
          <div
            className="bg-white rounded-lg shadow-xl py-6 px-8 relative flex flex-col text-sm m-4"
            style={{
              width: (() => {
                const rect = visibleMainRect ?? mainRect;
                if (rect) {
                  return `${Math.round(rect.width * 0.92)}px`;
                }
                return '92vw';
              })(),
              height: 'auto',
              maxHeight: (() => {
                const rect = visibleMainRect ?? mainRect;
                if (rect) {
                  return `${Math.round(rect.height * 0.90)}px`;
                }
                return '90vh';
              })(),
              maxWidth: '100%',
              overflowY: 'auto'
            }}
          >
              
              <h2 className="text-xl font-bold mb-5 text-red-700 pb-3 border-b border-gray-200">Editar Cotización</h2>
              
              {/* First row: main fields */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-5 items-start">
                <div>
                  <label className="font-semibold block text-xs text-gray-700 mb-1">Empresa</label>
                  <div className="w-full border border-gray-300 px-3 py-2 rounded text-sm bg-gray-100 text-gray-700">
                    {editedQuote.name || '-'}
                  </div>
                </div>
                <div>
                  <label className="font-semibold block text-xs text-gray-700 mb-1">Email</label>
                  <div className="w-full border border-gray-300 px-3 py-2 rounded text-sm bg-gray-100 text-gray-700">
                    {editedQuote.email || '-'}
                  </div>
                </div>
                <div>
                  <label className="font-semibold block text-xs text-gray-700 mb-1">Teléfono</label>
                  <div className="w-full border border-gray-300 px-3 py-2 rounded text-sm bg-gray-100 text-gray-700">
                    {editedQuote.phone || '-'}
                  </div>
                </div>
                <div className="md:col-span-1">
                  <label className="font-semibold block text-xs text-gray-700 mb-1">Tiempo de Ejecución</label>
                  <div className="relative group">
                    <button 
                      onClick={() => {
                        // Parse dates if they exist in execution_time field (format: "YYYY-MM-DD|YYYY-MM-DD")
                        const dateRange = editedQuote.execution_time?.split('|') || [];
                        const tempStart = dateRange[0] || '';
                        const tempEnd = dateRange[1] || '';
                        // Store temporary values for the modal
                        (window as any).__dateStart = tempStart;
                        (window as any).__dateEnd = tempEnd;
                        setShowDateModal(true);
                      }}
                      className="mt-0 w-full flex items-center justify-center border border-gray-300 px-3 py-2 rounded text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-200 bg-white hover:bg-gray-50 transition text-gray-700 font-medium"
                      aria-label="Seleccionar rango de fechas"
                    >
                      {editedQuote.execution_time ? (() => {
                        const dates = editedQuote.execution_time.split('|');
                        if (dates.length === 2 && dates[0] && dates[1]) {
                          const start = new Date(dates[0]);
                          const end = new Date(dates[1]);
                          const diffMs = end.getTime() - start.getTime();
                          const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                          return `${days} ${days === 1 ? 'día' : 'días'}`;
                        }
                        return 'Rango';
                      })() : 'Seleccionar fechas'}
                    </button>

                    {/* Custom tooltip shown on hover - larger than native */}
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-max max-w-xs hidden group-hover:block z-50">
                      <div className="bg-white border border-gray-300 rounded p-3 text-sm shadow-lg text-gray-800">
                        {editedQuote.execution_time ? (() => {
                          const dates = editedQuote.execution_time.split('|');
                          if (dates.length === 2 && dates[0] && dates[1]) {
                            const start = new Date(dates[0]);
                            const end = new Date(dates[1]);
                            return <div className="whitespace-nowrap font-medium">{start.toLocaleDateString()} → {end.toLocaleDateString()}</div>;
                          }
                          return <div className="text-gray-500">Sin rango</div>;
                        })() : <div className="text-gray-500">Sin rango</div>}
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="font-semibold block text-xs text-gray-700 mb-1">Forma pago</label>
                  <input className="mt-0 w-full border border-gray-300 px-3 py-2 rounded text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-200" value={editedQuote.payment_method ?? ''} onChange={e => setEditedQuote(prev => prev ? ({ ...prev, payment_method: e.target.value }) : prev)} />
                </div>
              </div>

              {/* Description section */}
              <div className="mb-5 w-full">
                <label className="font-semibold block text-xs text-gray-700 mb-2">Descripción de la cotización</label>
                <textarea
                  className="w-full border border-gray-300 p-3 rounded text-sm bg-gray-50 resize-none focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-200"
                  value={editedQuote.description ?? ''}
                  onChange={e => setEditedQuote(prev => prev ? ({ ...prev, description: e.target.value }) : prev)}
                  rows={2}
                />
              </div>
              {/* Services/Products section */}
              <div className="mb-5 w-full">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-300">
                  <h3 className="text-sm font-bold text-gray-800">Servicios / Productos</h3>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Total: {editedQuote.items?.length ?? 0} items</span>
                </div>

                {/* Búsqueda de productos para agregar */}
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <label className="font-semibold block text-xs text-gray-700 mb-2">Buscar y agregar productos/servicios</label>
                  <div className="flex gap-2 items-start flex-wrap">
                    <input
                      type="text"
                      placeholder="Buscar por nombre, código, SKU..."
                      className="flex-1 min-w-[250px] border border-gray-300 px-3 py-2 rounded text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                      value={editModalProductSearchQuery}
                      onChange={(e) => {
                        setEditModalProductSearchQuery(e.target.value);
                        if (e.target.value.length > 1) {
                          searchProductsForEditModal(e.target.value);
                          setEditModalShowMatches(true);
                        } else {
                          setEditModalProductSearchResults([]);
                          setEditModalShowMatches(false);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          searchProductsForEditModal(editModalProductSearchQuery);
                          setEditModalShowMatches(true);
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        searchProductsForEditModal(editModalProductSearchQuery);
                        setEditModalShowMatches(true);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium transition-colors"
                    >
                      Buscar
                    </button>
                    {editModalProductSearchQuery && (
                      <button
                        onClick={() => {
                          setEditModalProductSearchQuery('');
                          setEditModalProductSearchResults([]);
                          setEditModalShowMatches(false);
                        }}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm font-medium transition-colors"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>

                  {/* Resultados de búsqueda */}
                  {editModalShowMatches && editModalProductSearchResults.length > 0 && (
                    <div className="mt-3 max-h-[200px] overflow-y-auto border border-gray-300 rounded bg-white">
                      {editModalProductSearchResults.map((product) => (
                        <div
                          key={product.id}
                          className="p-3 border-b border-gray-200 hover:bg-gray-50 transition-colors flex justify-between items-center"
                        >
                          <div className="flex-1">
                            <div className="font-semibold text-sm text-gray-800">{product.name}</div>
                            <div className="text-xs text-gray-500">
                              {product.sku && <span>SKU: {product.sku} | </span>}
                              Precio: ${formatCLP(product.price ?? 0)}
                            </div>
                          </div>
                          <button
                            onClick={() => addExistingProductToEditedQuote(product)}
                            className="ml-2 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs font-medium transition-colors whitespace-nowrap"
                          >
                            Agregar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {editModalShowMatches && editModalProductSearchResults.length === 0 && editModalProductSearchQuery.length > 0 && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                      No se encontraron productos o servicios que coincidan con: <strong>{editModalProductSearchQuery}</strong>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto border border-gray-300 rounded-lg bg-white shadow-sm">
                <table className="min-w-full text-xs table-auto">
                  <thead>
                    <tr className="bg-red-600 text-white">
                      <th className="px-2 py-2 text-center font-bold border-r border-red-700 whitespace-nowrap w-10">Orden</th>
                      <th className="px-1 py-2 text-center font-bold border-r border-red-700 whitespace-nowrap w-20">Código</th>
                      <th className="px-3 py-2 text-left font-bold border-r border-red-700">Características</th>
                      <th className="px-1 py-2 text-center font-bold border-r border-red-700 whitespace-nowrap w-12">Cantidad</th>
                      <th className="px-1 py-2 text-center font-bold border-r border-red-700 whitespace-nowrap w-12">Unidad</th>
                      <th className="px-2 py-2 text-center font-bold border-r border-red-700 whitespace-nowrap w-20">Precio U</th>
                      <th className="px-2 py-2 text-center font-bold border-r border-red-700 whitespace-nowrap w-28">Cant. x P/U</th>
                      <th className="px-1 py-2 text-center font-bold border-r border-red-700 whitespace-nowrap w-16">Desc. %</th>
                      <th className="px-2 py-2 text-center font-bold border-r border-red-700 whitespace-nowrap w-28">Subtotal</th>
                      <th className="px-2 py-2 text-center font-bold whitespace-nowrap w-12">Acciones</th>
                    </tr>
                  </thead>
                  <tbody onDragOver={(e) => { e.preventDefault(); if (originalOrder) setDropIndex(originalOrder.length); }} onDragLeave={() => { if (!draggingId) setDropIndex(null); }}>
                      {editedQuote.items && originalOrder.length > 0
                        ? originalOrder.map((id, idx) => {
                            const item = editedQuote.items?.find(i => i.id === id);
                            if (!item) return null;
                            return (
                              <Fragment key={`wrap-${item.id}`}>
                                {dropIndex === idx && draggingId && (
                                  <tr key={`placeholder-${idx}`} className="h-4">
                                    <td colSpan={12} className="px-2 py-1">
                                      <div className="w-full h-1 bg-red-400 rounded" />
                                    </td>
                                  </tr>
                                )}
                                <tr
                                  key={item.id}
                                  className={"border-b border-gray-300 hover:bg-gray-50 transition-colors " + (draggingId === item.id ? 'opacity-25' : '')}
                                  style={draggingId === item.id ? { backgroundColor: 'transparent' as any } : undefined}
                                  draggable={true}
                                  onDragStart={(e) => {
                                    // ensure originalOrder exists
                                    if (!originalOrder || originalOrder.length === 0) syncOriginalOrder((editedQuote.items || []).map(it => it.id));
                                    e.dataTransfer.setData('text/plain', item.id);
                                    setDraggingId(item.id);
                                  }}
                                  onDragEnter={(e) => {
                                    e.preventDefault();
                                    const draggedId = draggingId || e.dataTransfer.getData('text/plain');
                                    if (!draggedId || draggedId === item.id) { setDropIndex(null); return; }
                                    // perform immediate preview reorder so the row moves while dragging
                                    syncOriginalOrder((prev: string[]) => {
                                      const next = prev.filter(id => id !== draggedId);
                                      const idx2 = next.indexOf(item.id);
                                      if (idx2 === -1) return [...next, draggedId];
                                      next.splice(idx2, 0, draggedId);
                                      return next;
                                    });
                                    setDropIndex(idx);
                                  }}
                                  onDragOver={(e) => { e.preventDefault(); setDropIndex(idx); }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    const draggedId = e.dataTransfer.getData('text/plain');
                                    const targetId = item.id;
                                    if (!draggedId || draggedId === targetId) { setDropIndex(null); return; }
                                    syncOriginalOrder((prev: string[]) => {
                                      const next = prev.filter(id => id !== draggedId);
                                      const idx2 = next.indexOf(targetId);
                                      if (idx2 === -1) return [...next, draggedId];
                                      next.splice(idx2, 0, draggedId);
                                      return next;
                                    });
                                    setDraggingId(null);
                                    setDropIndex(null);
                                  }}
                                  onDragEnd={() => { setDraggingId(null); setDropIndex(null); }}
                                >
                                <td className="px-1 py-2 text-center">
                                  <button className="cursor-grab p-1 rounded hover:bg-gray-100" title="Arrastrar para reordenar">⋮⋮</button>
                                </td>
                                <td className="border-r border-gray-300 px-1 py-2 text-center font-semibold w-20">
                                  {String(item.product?.sku || item.product_id || '-')}
                                </td>
                                <td className="border-r border-gray-300 px-3 py-2 text-left w-80 align-top">
                                  <div style={{ whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'break-word', fontSize: '11px' }}>
                                    <textarea
                                      rows={2}
                                      className="w-full border border-gray-200 px-2 py-1 rounded text-xs font-semibold resize-none"
                                      value={editedQuote.items?.find(it => it.id === item.id)?.name ?? item.name ?? ''}
                                      style={{ minHeight: '48px', maxHeight: 240, overflowY: 'auto' }}
                                      onInput={(e:any) => {
                                        const t = e.currentTarget as HTMLTextAreaElement;
                                        t.style.height = 'auto';
                                        const maxH = 240; // aún mayor altura
                                        const newH = Math.min(t.scrollHeight, maxH);
                                        t.style.height = `${newH}px`;
                                      }}
                                      onChange={e => {
                                        const newName = e.target.value;
                                        setEditedQuote(prev => {
                                          if (!prev) return prev;
                                          const newItems = (prev.items || []).map(it => it.id === item.id ? ({ ...it, name: newName }) : it);
                                          return { ...prev, items: newItems };
                                        });
                                      }}
                                    />
                                  </div>
                                  <div className="mt-1">
                                    <textarea
                                      className="w-full border border-gray-200 px-2 py-1 rounded text-xs resize-none"
                                      placeholder="Características (separadas por coma)"
                                      value={(editedCharacteristics[item.id] ?? (Array.isArray(item.characteristics) ? item.characteristics : (typeof item.characteristics === 'string' ? (function(){ try { return JSON.parse(String(item.characteristics)) } catch { return String(item.characteristics).split(',').map(s=>s.trim()).filter(Boolean) } })() : []) )).join(', ')}
                                      rows={2}
                                      style={{ minHeight: '48px', maxHeight: 280, overflowY: 'auto' }}
                                      onInput={(e:any) => { const t = e.currentTarget as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = `${Math.min(t.scrollHeight, 280)}px`; }}
                                      onChange={e => {
                                        const vals = String(e.target.value).split(',').map(s => s.trim()).filter(Boolean);
                                        setEditedCharacteristics(prev => ({ ...prev, [item.id]: vals }));
                                      }}
                                    />
                                  </div>
                                </td>
                                <td className="border-r border-gray-300 px-3 py-2 text-center">
                                  <input
                                    type="number"
                                    className="mx-auto w-20 border border-gray-300 px-2 py-1 rounded text-xs text-center focus:outline-none focus:border-red-500 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&]:appearance-none"
                                    value={editedQuote.items?.find(it => it.id === item.id)?.qty ?? item.qty}
                                    onChange={e => {
                                      const newQty = Math.max(0, parseInt(e.target.value) || 0);
                                      console.log(`[onChange Cantidad] Item ${item.id}: ${item.qty} -> ${newQty}`);
                                      setEditedQuote(prev => {
                                        if (!prev) return prev;
                                        const newItems = (prev.items || []).map(it => it.id === item.id ? ({ ...it, qty: newQty }) : it);
                                        return { ...prev, items: newItems };
                                      });
                                      setEditedQtys(prev => ({ ...prev, [item.id]: newQty }));
                                    }}
                                    min="1"
                                  />
                                </td>
                                <td className="border-r border-gray-300 px-1 py-1 text-center w-12">
                                  <select
                                    className="mx-auto w-12 border border-gray-300 px-1 py-0.5 rounded text-xs text-center focus:outline-none focus:border-red-500"
                                    value={editedUnits[item.id] ?? normalizeUnitKey(item.measurement_unit) ?? ''}
                                    onChange={e => {
                                      const newUnitKey = e.target.value;
                                      console.log(`[onChange Unidad] Item ${item.id}: ${item.measurement_unit} -> ${newUnitKey}`);
                                      setEditedUnits(prev => ({ ...prev, [item.id]: newUnitKey }));
                                      setEditedQuote(prev => {
                                        if (!prev) return prev;
                                        const newItems = (prev.items || []).map(it => it.id === item.id ? ({ ...it, measurement_unit: newUnitKey }) : it);
                                        return { ...prev, items: newItems };
                                      });
                                    }}
                                  >
                                    <option value="">--</option>
                                    {Object.keys(unitLabels).map(k => (
                                      <option key={k} value={k}>{unitLabels[k]}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="border-r border-gray-300 px-1 py-1 text-center w-16">
                                  <div className="flex items-center justify-center gap-1 bg-blue-50 p-2 rounded border border-blue-200">
                                    <span className="font-bold">$</span>
                                    <input
                                      type="text"
                                      className="bg-transparent outline-none text-right text-xs"
                                      style={{ width: '96px' }}
                                      value={formatCLP(editedPrices[item.id] ?? item.update_price ?? item.price ?? 0)}
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
                                <td className="border-r border-gray-300 px-2 py-2 text-center w-28">
                                  <div className="flex items-center justify-center gap-1">
                                    <span className="font-bold">$</span>
                                    <span className="text-right">{formatCLP(Math.round((editedQuote.items?.find(it => it.id === item.id)?.qty ?? item.qty) * (editedPrices[item.id] ?? item.update_price ?? item.price ?? 0)))}</span>
                                  </div>
                                </td>
                                <td className="border-r border-gray-300 px-2 py-2 text-center">
                                  <div className="flex items-center justify-center gap-1 bg-yellow-50 p-1 rounded border border-yellow-200">
                                    <input
                                      type="text"
                                      className="bg-transparent outline-none text-center text-xs"
                                      style={{ width: '36px' }}
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
                                    <span className="text-xs">%</span>
                                  </div>
                                </td>
                                <td className="border-r border-gray-300 px-2 py-2 text-center w-28">
                                  <div className="flex items-center justify-center gap-1">
                                    <span className="font-bold">$</span>
                                    <span className="text-right">{(() => {
                                      const total = (editedPrices[item.id] ?? item.update_price ?? item.price ?? 0) * item.qty;
                                      const discount = editedDiscounts[item.id] ?? item.discount ?? 0;
                                      const subtotal = Math.round(total - (total * (discount / 100)));
                                      return formatCLP(subtotal);
                                    })()}</span>
                                  </div>
                                </td>
                                <td className="px-2 py-2 text-center">
                                  <button
                                    onClick={() => removeItemFromEditedQuote(item.id)}
                                    className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-sm font-medium"
                                    title="Eliminar producto"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                      <polyline points="3 6 5 6 21 6"></polyline>
                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                      <line x1="10" y1="11" x2="10" y2="17"></line>
                                      <line x1="14" y1="11" x2="14" y2="17"></line>
                                    </svg>
                                  </button>
                                </td>
                                </tr>
                              </Fragment>
                            );
                          })
                        : editedQuote.items?.map((item) => (
                          <tr
                            key={item.id}
                            className={"border-b border-gray-300 hover:bg-gray-50 transition-colors " + (draggingId === item.id ? 'opacity-25' : '')}
                            style={draggingId === item.id ? { backgroundColor: 'transparent' as any } : undefined}
                            draggable={true}
                            onDragStart={(e) => {
                              if (!originalOrder || originalOrder.length === 0) syncOriginalOrder((editedQuote.items || []).map(it => it.id));
                              e.dataTransfer.setData('text/plain', item.id);
                              setDraggingId(item.id);
                            }}
                            onDragEnter={(e) => {
                              e.preventDefault();
                              const draggedId = draggingId || e.dataTransfer.getData('text/plain');
                              if (!draggedId || draggedId === item.id) { setDropIndex(null); return; }
                              syncOriginalOrder((prev: string[]) => {
                                const next = prev.filter(id => id !== draggedId);
                                const idx2 = next.indexOf(item.id);
                                if (idx2 === -1) return [...next, draggedId];
                                next.splice(idx2, 0, draggedId);
                                return next;
                              });
                              setDropIndex(originalOrder.indexOf(item.id));
                            }}
                            onDragOver={(e) => { e.preventDefault(); }}
                            onDrop={(e) => {
                              e.preventDefault();
                              const draggedId = e.dataTransfer.getData('text/plain');
                              const targetId = item.id;
                              if (!draggedId || draggedId === targetId) return;
                              syncOriginalOrder((prev: string[]) => {
                                const next = prev.filter(id => id !== draggedId);
                                const idx = next.indexOf(targetId);
                                if (idx === -1) return [...next, draggedId];
                                next.splice(idx, 0, draggedId);
                                return next;
                              });
                              setDraggingId(null);
                            }}
                            onDragEnd={() => setDraggingId(null)}
                          >
                            <td className="px-3 py-2 text-center font-semibold">
                                {String(item.product?.sku || item.product_id || '-')}
                              </td>
                              <td className="border-r border-gray-300 px-3 py-2 text-left">
                                <div style={{ whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'break-word', fontSize: '11px' }}>{item.name}</div>
                                <div className="mt-1">
                                  <input
                                    type="text"
                                    className="w-full max-w-[520px] border border-gray-200 px-2 py-1 rounded text-xs"
                                    placeholder="Características (separadas por coma)"
                                    value={(editedCharacteristics[item.id] ?? (Array.isArray(item.characteristics) ? item.characteristics : (typeof item.characteristics === 'string' ? (function(){ try { return JSON.parse(String(item.characteristics)) } catch { return String(item.characteristics).split(',').map(s=>s.trim()).filter(Boolean) } })() : []) )).join(', ')}
                                    onChange={e => {
                                      const vals = String(e.target.value).split(',').map(s => s.trim()).filter(Boolean);
                                      setEditedCharacteristics(prev => ({ ...prev, [item.id]: vals }));
                                    }}
                                  />
                                </div>
                              </td>
                                <td className="border-r border-gray-300 px-3 py-2 text-center">
                                  <input
                                    type="number"
                                    className="mx-auto w-20 border border-gray-300 px-2 py-1 rounded text-xs text-center focus:outline-none focus:border-red-500 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&]:appearance-none"
                                    value={item.qty}
                                    onChange={e => {
                                      const newQty = Math.max(0, parseInt(e.target.value) || 0);
                                      setEditedQuote(prev => {
                                        if (!prev) return prev;
                                        const newItems = (prev.items || []).map(it => it.id === item.id ? ({ ...it, qty: newQty }) : it);
                                        return { ...prev, items: newItems };
                                      });
                                      setEditedQtys(prev => ({ ...prev, [item.id]: newQty }));
                                    }}
                                    min="1"
                                  />
                                </td>
                              <td className="border-r border-gray-300 px-3 py-2 text-center text-xs">
                                {(() => {
                                  const key = normalizeUnitKey(item.measurement_unit);
                                  return unitLabels[key] ?? (item.measurement_unit ?? '').replace(/^unidad\s+/i, '');
                                })()}
                              </td>
                              <td className="border-r border-gray-300 px-3 py-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <span className="font-bold">$</span>
                                  <span className="text-right text-xs">{formatCLP(Math.round(item.qty * (editedPrices[item.id] ?? item.update_price ?? item.price ?? 0)))}</span>
                                </div>
                              </td>
                              <td className="border-r border-gray-300 px-3 py-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <span className="font-bold">$</span>
                                  <span className="text-right text-xs">{item.price != null ? formatCLP(item.price) : '-'}</span>
                                </div>
                              </td>
                              <td className="border-r border-gray-300 px-3 py-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <span className="text-xs">-</span>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-center font-bold">
                                <div className="flex items-center justify-center gap-1">
                                  <span className="font-bold">$</span>
                                  <span className="text-right text-xs">{formatCLP(Math.round((editedPrices[item.id] ?? item.update_price ?? item.price ?? 0) * item.qty))}</span>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <button
                                  onClick={() => removeItemFromEditedQuote(item.id)}
                                  className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-sm font-medium"
                                  title="Eliminar producto"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    <line x1="10" y1="11" x2="10" y2="17"></line>
                                    <line x1="14" y1="11" x2="14" y2="17"></line>
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                    {dropIndex === originalOrder.length && draggingId && originalOrder.length > 0 && editedQuote.items && (
                      <tr key="placeholder-end" className="h-4">
                        <td colSpan={12} className="px-2 py-1">
                          <div className="w-full h-1 bg-red-400 rounded" />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                </div>
              </div>

              {/* Buttons section */}
              <div className="flex justify-end gap-4 pt-4 mt-5 border-t border-gray-200">
                <button className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium text-sm transition-colors" onClick={() => {
                  setShowModal(false);
                  setEditedPrices({});
                  setEditedQtys({});
                  setEditedDiscounts({});
                  setEditedUnits({});
                  setEditedCharacteristics({});
                  setEditModalProductSearchQuery('');
                  setEditModalProductSearchResults([]);
                  setEditModalShowMatches(false);
                  setEditedQuote(null);
                  setSelectedQuote(null);
                }}>Cancelar</button>
                <button className="px-8 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2" onClick={handleSavePrices} disabled={savingModalChanges}>{savingModalChanges ? <><Loader className="w-4 h-4 animate-spin" /> Guardando...</> : 'Guardar cambios'}</button>
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
            className="bg-white rounded-lg shadow-lg py-6 px-8 relative flex flex-col"
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
              <div className="flex items-center justify-between mb-4 border-b border-gray-300 pb-2 ">
              <h2 className="text-2xl font-normal text-gray-400 whitespace-nowrap">Crear Cotización</h2>
              {/* Improved stepper for modal steps */}
              <div className="flex flex-col items-center mt-2 mb-2">
                <div className="flex items-center justify-center gap-6 mb-2">
                  {[
                    { key: 'client', label: 'Cliente' },
                    { key: 'products', label: 'Servicios / Productos' },
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

              {/* Atrás rendered inline in footer (same row/height as Siguiente) */}
            </div>
            <div className="overflow-y-auto" style={{ flex: 1 }}>

            {createSection === 'client' && (
              <div className="mb-4">
                <style>{`.phone-wrapper .PhoneInputInput{border:none;outline:none;width:100%;background:transparent;padding:0;margin:0;font:inherit;} .phone-wrapper .PhoneInputCountry{margin-right:8px;} .phone-wrapper {display:block;} `}</style>
                <div className="flex gap-2 items-end mb-2">
                  <div className="flex-1 relative">
                    <label className="block text-xs text-gray-600">Buscar cliente (empresa / email / documento)</label>
                    <input
                      className="border border-red-900 rounded px-2 py-1 w-full pr-8"
                      value={clientSearchQuery}
                      onChange={e => setClientSearchQuery(e.target.value)}
                    />
                    {clientSearchQuery && (
                      <button
                        className="absolute right-2 -translate-y-1/2 text-gray-300 hover:text-gray-500 text-3xl flex items-center justify-center"
                        style={{ top: '65%' }}
                        onClick={() => { setClientSearchQuery(''); setClientSearchResults([]); }}
                        aria-label="Limpiar búsqueda cliente"
                      >&times;</button>
                    )}
                  </div>
                </div>

                {clientSearchResults && clientSearchResults.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                    <div className="text-sm text-gray-600 col-span-full">Clientes encontrados:</div>
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
                            // Store a normalized snapshot in originalClient so comparisons
                            // with the form don't produce false positives due to formatting.
                            setOriginalClient({
                              ...c,
                              company: String(c.company || '').toUpperCase(),
                              contact_name: capitalizeName(String(c.contact_name || '')),
                              email: String(c.email || '').toLowerCase(),
                              phone: c.phone || null,
                              document: c.document || null,
                              company_address: c.company_address || null,
                              country: c.country || 'CL',
                              region: c.region || '',
                              city: c.city || '',
                              postal_code: c.postal_code || '',
                              notes: c.notes || ''
                            });
                            setClientSearchQuery('');
                            setClientSearchResults([]);
                            setCreateSection('client');
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
                  (clientSearchQuery && clientSearchQuery.trim().length >= 3) ? (
                    <div className="mb-2 text-sm text-gray-500">No se han encontrado clientes</div>
                  ) : null
                )}
                {/* Productos añadidos se muestran sólo en el paso 'products' */}

                <div className="grid grid-cols-2 gap-4 mb-2 mt-12">
                  <div>
                    <label className="block text-xs text-gray-600">Empresa</label>
                    <input className="border rounded px-2 py-1 w-full" value={createForm.contact.company} onChange={e => setCreateForm((p:any) => ({ ...p, contact: { ...p.contact, company: String(e.target.value || '').toUpperCase() } }))} />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600">Documento (RUT)</label>
                    <input
                      className="border rounded px-2 py-1 w-full"
                      value={createForm.contact.document}
                      onChange={e => {
                        const newValRaw = String(e.target.value || '');
                        const prevVal = String(createForm.contact.document || '');
                        // If previous value was a valid formatted RUT and the user changed it
                        // and the new value is not a valid RUT, strip Chile formatting (dots/dash)
                        const prevWasFormatted = Boolean(prevVal) && validateRUT(prevVal) && (prevVal.includes('.') || prevVal.includes('-'));
                        const newIsValid = validateRUT(newValRaw);
                        if (prevWasFormatted && !newIsValid) {
                          const cleaned = cleanRUT(newValRaw);
                          setCreateForm((p:any) => ({ ...p, contact: { ...p.contact, document: cleaned } }));
                          // clear any document error while editing
                          setClientErrors(prev => { const n = { ...prev }; delete n.document; return n; });
                          return;
                        }
                        // Default: store raw input value
                        setCreateForm((p:any) => ({ ...p, contact: { ...p.contact, document: newValRaw } }));
                        setClientErrors(prev => { const n = { ...prev }; delete n.document; return n; });
                      }}
                      onBlur={() => {
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
                          } else {
                            // if invalid, ensure no Chile punctuation remains
                            const cleaned = cleanRUT(val);
                            setCreateForm((p:any) => ({ ...p, contact: { ...p.contact, document: cleaned } }));
                          }
                        }
                      }}
                    />
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
                  <button className="px-3 py-1 bg-gray-300 hover:bg-gray-600 hover:text-white rounded" onClick={() => { setSelectedClientId(null); setCreateForm((p:any) => ({ ...p, contact: { company: '', contact_name: '', email: '', phone: '', document: '', company_address: '', country: 'CL', region: '', city: '', postal_code: '', notes: '' } })); setClientErrors({}); }}>Limpiar</button>
                  {selectedClientId && originalClient && clientFieldsChanged(originalClient, createForm.contact) && (
                    <button
                      className={`px-3 py-1 text-white rounded bg-blue-600 hover:bg-blue-700 ${updatingClient ? 'opacity-60' : ''}`}
                      onClick={async () => {
                        if (!selectedClientId) return;
                        setUpdatingClient(true);
                        try {
                          const payload: any = { id: selectedClientId, ...createForm.contact };
                          const res = await fetch('/api/clients', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                          if (!res.ok) throw new Error('Update failed');
                          setToast({ type: 'success', message: 'Cliente actualizado' });
                          setOriginalClient({ ...originalClient, ...createForm.contact });
                          setTimeout(() => setToast(null), 2000);
                        } catch (e) {
                          console.error('Error updating client', e);
                          setToast({ type: 'error', message: 'Error al actualizar cliente' });
                          setTimeout(() => setToast(null), 2000);
                        } finally { setUpdatingClient(false); }
                      }}
                    >{updatingClient ? 'Actualizando...' : 'Actualizar cliente'}</button>
                  )}
                  {/* Keep explicit 'Crear cliente' here only when no client is selected. The 'Siguiente' action
                      for the client step is rendered in the modal footer so it shares position with section 2. */}
                  {!selectedClientId && (
                    <button
                      className={`px-3 py-1 text-white rounded ${creatingClient ? 'opacity-60 bg-gray-500' : 'bg-gray-500 hover:bg-gray-700'}`}
                      onClick={async () => {
                        // No client selected: validate and create (keeps previous behavior: does not auto-advance)
                        if (!clientIsValid) { validateClientFields(); return; }
                        const ok = await handleCreateClient();
                        if (!ok) return;
                        return;
                      }}
                      disabled={creatingClient}
                    >{creatingClient ? 'Procesando...' : 'Crear cliente'}</button>
                  )}
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
                    <label className="block text-sm text-gray-600">Buscar Material - Servicios</label>
                    <input
                      ref={productSearchRef}
                      type="text"
                      className="border border-red-800 rounded px-2 py-1 w-full pr-8 mb-4"
                      value={productSearchQuery}
                      onChange={e => setProductSearchQuery(e.target.value)}
                      placeholder="Busca por nombre, SKU, descripción, fabricante..."
                    />
                    {productSearchQuery && (
                      <button
                        className="absolute right-2 -translate-y-1/2 text-gray-300 hover:text-gray-500 text-3xl flex items-center justify-center"
                        style={{ top: '53%' }}
                        onClick={() => { setProductSearchQuery(''); setProductSearchResults([]); }}
                        aria-label="Limpiar búsqueda"
                      >&times;</button>
                    )}
                  </div>
                </div>
                {productSearchQuery && productSearchQuery.trim().length >= 3 && productSearchResults && productSearchResults.length > 0 ? (
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
                  (productSearchQuery && productSearchQuery.trim().length >= 3) && (
                    <div className="mb-2 text-sm text-gray-500">No se encontraron coincidencias</div>
                  )
                )}

                {/* Descripción de la cotización */}
                <div className="mb-4 mt-12">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Descripción</label>
                  <textarea
                    ref={descriptionRef}
                    className="border rounded px-3 py-2 w-full text-sm resize-none max-h-[60vh] overflow-auto"
                    rows={1}
                    placeholder="Descripción o notas para esta cotización..."
                    value={createForm.description || ''}
                    onChange={e => setCreateForm((p:any) => ({ ...p, description: e.target.value }))}
                  />
                </div>

                {/* Nuevos campos solicitados: Tiempo de ejecución / entrega y Forma de pago */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Tiempo de ejecución / entrega</label>
                    <div className="relative group">
                      <button
                        onClick={() => {
                          const dateRange = createForm.execution_time?.split('|') || [];
                          const tempStart = dateRange[0] || '';
                          const tempEnd = dateRange[1] || '';
                          (window as any).__dateStart = tempStart;
                          (window as any).__dateEnd = tempEnd;
                          setDateStart(tempStart);
                          setDateEnd(tempEnd);
                          setShowDateModal(true);
                        }}
                        className="mt-0 w-full flex items-center justify-center border border-gray-300 px-3 py-2 rounded text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-200 bg-white hover:bg-gray-50 transition text-gray-700 font-medium"
                        aria-label="Seleccionar rango de fechas"
                      >
                        {createForm.execution_time ? (() => {
                          const dates = createForm.execution_time.split('|');
                          if (dates.length === 2 && dates[0] && dates[1]) {
                            const start = new Date(dates[0]);
                            const end = new Date(dates[1]);
                            const diffMs = end.getTime() - start.getTime();
                            const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                            return `${days} ${days === 1 ? 'día' : 'días'}`;
                          }
                          return 'Rango';
                        })() : 'Seleccionar rango de fechas'}
                      </button>

                      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-max max-w-xs hidden group-hover:block z-50">
                        <div className="bg-white border border-gray-300 rounded p-3 text-sm shadow-lg text-gray-800">
                          {createForm.execution_time ? (() => {
                            const dates = createForm.execution_time.split('|');
                            if (dates.length === 2 && dates[0] && dates[1]) {
                              const start = new Date(dates[0]);
                              const end = new Date(dates[1]);
                              return <div className="whitespace-nowrap font-medium">{start.toLocaleDateString()} → {end.toLocaleDateString()}</div>;
                            }
                            return <div className="text-gray-500">Sin rango</div>;
                          })() : <div className="text-gray-500">Sin rango</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Forma de pago (cliente)</label>
                    <input
                      type="text"
                      className="border rounded px-3 py-2 w-full text-sm"
                      placeholder="Ej: 30 días, contado, transferencia"
                      value={createForm.payment_method || ''}
                      onChange={e => setCreateForm((p:any) => ({ ...p, payment_method: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Lista de productos añadidos para cotización */}
                {createForm.items && createForm.items.length > 0 && (
                  <div className="overflow-x-auto mt-4 mb-4">
                    <h4 className="text-sm font-semibold mb-2 text-gray-700">Productos añadidos a la cotización:</h4>
                    <table className="min-w-full text-xs border">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-2 py-1 border whitespace-nowrap">Código</th>
                          <th className="px-2 py-1 border">Características</th>
                          <th className="px-2 py-1 border whitespace-nowrap">Cantidad</th>
                          <th className="px-2 py-1 border whitespace-nowrap">Unidad</th>
                          <th className="px-2 py-1 border whitespace-nowrap">Precio estimado</th>
                          <th className="px-2 py-1 border whitespace-nowrap">Valor U</th>
                          <th className="px-2 py-1 border whitespace-nowrap">Valor U x C</th>
                          <th className="px-2 py-1 border whitespace-nowrap">Desc. %</th>
                          <th className="px-2 py-1 border whitespace-nowrap">Subtotal</th>
                          <th className="px-2 py-1 border text-center">Acciones</th>
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
                              <td className="px-2 py-1 border text-center whitespace-nowrap">
                                <div className="flex items-center justify-center">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    min={1}
                                    className="bg-gray-100 px-2 py-1 text-center appearance-none outline-none"
                                    style={{ border: 'none', borderRadius: '6px', width: `${Math.max(String(qty).length * 12, 48)}px` }}
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
                              <td className="px-2 py-1 border text-right">$ {formatCLP(priceUnit)}</td>
                              <td className="px-2 py-1 border text-right whitespace-nowrap">
                                <div className="flex items-center justify-center">
                                  <span className="text-gray-700 font-bold flex-shrink-0 mr-1">$</span>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    min={0}
                                    className="bg-gray-100 px-2 py-1 text-center appearance-none outline-none"
                                    style={{ border: 'none', borderRadius: '6px', width: `${Math.max(String(formatCLP(valorProducto)).length * 10, 64)}px` }}
                                    value={formatCLP(valorProducto)}
                                    onChange={e => {
                                      const raw = e.target.value.replace(/[^0-9]/g, '');
                                      const value = Number(raw);
                                      const items = [...createForm.items];
                                      items[idx].update_price = value;
                                      setCreateForm({ ...createForm, items });
                                    }}
                                  />
                                </div>
                              </td>
                              <td className="px-2 py-1 border text-right whitespace-nowrap">$ {formatCLP(price)}</td>
                              <td className="px-2 py-1 border text-right whitespace-nowrap">
                                <div className="flex items-center justify-center">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    min={0}
                                    max={100}
                                    className="bg-gray-100 px-2 py-1 text-center appearance-none outline-none"
                                    style={{ border: 'none', borderRadius: '6px', width: `${Math.max(String(discount).length * 12, 48)}px` }}
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
                              <td className="px-2 py-1 border text-right whitespace-nowrap">$ {formatCLP(Math.round(subtotal))}</td>
                              <td className="px-2 py-1 border text-center">
                                <button
                                  onClick={() => removeCreateItem(idx)}
                                  className="text-red-600 hover:text-red-800 hover:bg-red-50 rounded px-2 py-1 transition-colors"
                                  title="Eliminar item"
                                  aria-label="Eliminar item"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </td>
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
                                  <td style={{ textAlign: 'right', fontWeight: 'normal', padding: '8px 16px 4px 0', fontSize: '0.95rem' }}>$ {formatCLP(netoSinDescuento)}</td>
                                </tr>
                                <tr style={{ background: '#f7f7f7' }}>
                                  <td style={{ fontWeight: 'normal', padding: '4px 0 4px 16px', fontSize: '0.95rem' }}>Total Neto:</td>
                                  <td style={{ textAlign: 'right', fontWeight: 'normal', padding: '4px 16px 4px 0', fontSize: '0.95rem' }}>$ {formatCLP(netoConDescuento)}</td>
                                </tr>
                                <tr>
                                  <td style={{ fontWeight: 'normal', padding: '4px 0 4px 16px', fontSize: '0.95rem' }}>IVA (19%):</td>
                                  <td style={{ textAlign: 'right', fontWeight: 'normal', padding: '4px 16px 4px 0', fontSize: '0.95rem' }}>$ {formatCLP(iva)}</td>
                                </tr>
                                <tr>
                                                                   <td style={{ fontWeight: 'bold', padding: '4px 0 8px 16px', fontSize: '1rem', color: '#a62626' }}>TOTAL:</td>
                                  <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '4px 16px 8px 0', fontSize: '1rem', color: '#a62626' }}>$ {formatCLP(total)}</td>
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
                <div className="mb-2 text-center text-xs font-normal text-gray-400">Crear Material - Servicio</div>
                {productPanelOpen && (
                  <div className="mb-2 mt-2">
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
                      onProductCreated={(createdProduct) => {
                        if (!createdProduct) return;
                        setCreateForm((prev: any) => ({
                          ...prev,
                          items: [
                            ...prev.items,
                            {
                              id: createdProduct.id || `tmp-${Date.now()}-${Math.floor(Math.random()*1000)}`,
                              quote_id: '',
                              product_id: String(createdProduct.id || createdProduct.sku || createdProduct.name),
                              sku: createdProduct.sku || '',
                              name: createdProduct.name || '',
                              image_url: Array.isArray(createdProduct.image_url) ? (createdProduct.image_url[0] || null) : (createdProduct.image_url || null),
                              unit_size: createdProduct.unit_size || null,
                              measurement_unit: createdProduct.measurement_unit || null,
                              qty: 1,
                              price: typeof createdProduct.price === 'number' ? createdProduct.price : 0,
                              update_price: typeof createdProduct.price === 'number' ? createdProduct.price : 0,
                              discount: 0,
                              company: null,
                              email: null,
                              phone: null,
                              document: null,
                              created_at: null,
                              characteristics: createdProduct.characteristics || null,
                              product: createdProduct
                            }
                          ]
                        }));
                        setToast({ type: 'success', message: 'Producto creado y añadido a lista' });
                        setTimeout(() => setToast(null), 2500);
                      }}
                    />
                  </div>
                )}
                {/* Siguiente moved to modal footer so it aligns with Atrás */}
              </div>
            )}
            {/* Items: sólo visible en el paso 'items' */}
            {createSection === 'items' && (
              <div className="mb-4">
                <h3 className="text-lg font-bold mb-2 text-red-700">Enviar cotización</h3>
                {/* PDF Preview */}
                <div className="mb-6 border rounded-lg shadow p-6 bg-white" style={{maxWidth:'1200px',margin:'0 auto'}}>
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
                  {/* Descripción de la cotización */}
                  <div className="mb-4 pb-2 border-b">
                    <div className="font-semibold text-gray-700 mb-1">Descripción</div>
                    <div className="text-sm text-gray-800 whitespace-pre-wrap max-h-[60vh] overflow-auto">{createForm.description || '(vacío)'}</div>
                  </div>
                  {(createForm.execution_time || createForm.payment_method) && (
                    <div className="mb-4 pb-2 border-b">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="font-semibold text-gray-700">Tiempo de ejecución / entrega</div>
                          <div className="text-sm text-gray-800">{createForm.execution_time || '-'}</div>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-700">Forma de pago</div>
                          <div className="text-sm text-gray-800">{createForm.payment_method || '-'}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="mb-2">
                    <div className="font-semibold text-gray-700 mb-2">Servicios / Productos</div>
                    <table className="min-w-full text-xs border">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-2 py-1 border">Código</th>
                          <th className="px-2 py-1 border max-w-[220px]">Nombre</th>
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
                              <td className="px-2 py-1 border max-w-[220px] whitespace-normal break-words">{it.name}</td>
                              <td className="px-2 py-1 border">{Array.isArray(it.characteristics) ? it.characteristics.join(', ') : (it.characteristics || '-')}</td>
                              <td className="px-2 py-1 border text-center">{qty}</td>
                              <td className="px-2 py-1 border text-center">{it.unit_size || '-'} {it.measurement_unit || ''}</td>
                              <td className="px-2 py-1 border text-right">$ {formatCLP(valorProducto)}</td>
                              <td className="px-2 py-1 border text-right">{discount}%</td>
                              <td className="px-2 py-1 border text-right">$ {formatCLP(Math.round(subtotal))}</td>
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
                                <td style={{ textAlign: 'right', fontWeight: 'normal', padding: '8px 16px 4px 0', fontSize: '0.95rem' }}>$ {formatCLP(netoSinDescuento)}</td>
                              </tr>
                              <tr style={{ background: '#f7f7f7' }}>
                                <td style={{ fontWeight: 'normal', padding: '4px 0 4px 16px', fontSize: '0.95rem' }}>Total Neto:</td>
                                <td style={{ textAlign: 'right', fontWeight: 'normal', padding: '4px 16px 4px 0', fontSize: '0.95rem' }}>$ {formatCLP(netoConDescuento)}</td>
                              </tr>
                              <tr>
                                <td style={{ fontWeight: 'normal', padding: '4px 0 4px 16px', fontSize: '0.95rem' }}>IVA (19%):</td>
                                <td style={{ textAlign: 'right', fontWeight: 'normal', padding: '4px 16px 4px 0', fontSize: '0.95rem' }}>$ {formatCLP(iva)}</td>
                              </tr>
                              <tr>
                                <td style={{ fontWeight: 'bold', padding: '4px 0 8px 16px', fontSize: '1rem', color: '#a62626' }}>TOTAL:</td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '4px 16px 8px 0', fontSize: '1rem', color: '#a62626' }}>$ {formatCLP(total)}</td>
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
            <div className="mt-auto pt-4 pb-0">
              <div className="flex flex-row gap-3 w-full">
                {/* Left: Atrás */}
                <div className="flex items-center flex-1">
                  {createSection !== 'client' && (
                    <button
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 mr-2"
                      onClick={() => {
                        if (createSection === 'items') setCreateSection('products');
                        else if (createSection === 'products') setCreateSection('client');
                      }}
                    >Atrás</button>
                  )}
                </div>

                {/* Center: Cancelar */}
                <div className="flex items-center justify-center flex-1">
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
                  {showCancelConfirm && (
                    <>
                      <div className="fixed inset-0 bg-black/60 z-[88]" onClick={() => setShowCancelConfirm(false)} />
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
                </div>

                {/* Right: Siguiente / Guardar / Enviar */}
                <div className="flex items-center justify-end flex-1">
                  {createSection === 'client' && (
                    <button
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                      onClick={async () => {
                        if (selectedClientId) { setCreateSection('products'); return; }
                        if (!clientIsValid) { validateClientFields(); return; }
                        const ok = await handleCreateClient();
                        if (!ok) return;
                        return;
                      }}
                      disabled={!createForm.contact.company || creatingClient}
                    >
                      Siguiente
                    </button>
                  )}
                  {createSection === 'products' && (
                    <button
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                      onClick={() => setCreateSection('items')}
                    >
                      Siguiente
                    </button>
                  )}
                  {createSection === 'items' && (
                    <div className="flex gap-4">
                      <button
                        className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                        onClick={handleSaveDraft}
                        disabled={savingDraft}
                      >
                        {savingDraft ? 'Guardando...' : 'Guardar borrador'}
                      </button>
                      {/* Envío deshabilitado en sector Preview por seguridad: botón eliminado */}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Date Range Modal for Edit/Create */}
      {showDateModal && (
        <div className="fixed inset-0 bg-black/30 z-[100] flex items-center justify-center" onClick={() => { (window as any).__dateStart = ''; (window as any).__dateEnd = ''; setDateStart(''); setDateEnd(''); setShowDateModal(false); }}>
          <div className="bg-white rounded-lg shadow-2xl p-6 w-96 max-w-[95vw]" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-300">Seleccionar Rango de Fechas</h3>

            <div className="space-y-4">
              <div>
                <label className="font-semibold block text-sm text-gray-700 mb-2">Fecha Inicio</label>
                <input
                  type="date"
                  className="w-full border border-gray-300 px-3 py-2 rounded text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-200"
                  value={(window as any).__dateStart || dateStart || ''}
                  onChange={e => { (window as any).__dateStart = e.target.value; setDateStart(e.target.value); }}
                />
              </div>

              <div>
                <label className="font-semibold block text-sm text-gray-700 mb-2">Fecha Final</label>
                <input
                  type="date"
                  className="w-full border border-gray-300 px-3 py-2 rounded text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-200"
                  value={(window as any).__dateEnd || dateEnd || ''}
                  onChange={e => { (window as any).__dateEnd = e.target.value; setDateEnd(e.target.value); }}
                />
              </div>

              {(((window as any).__dateStart || dateStart) && ((window as any).__dateEnd || dateEnd)) && (() => {
                const s = new Date((window as any).__dateStart || dateStart);
                const e = new Date((window as any).__dateEnd || dateEnd);
                if (e >= s) {
                  const diffMs = e.getTime() - s.getTime();
                  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                  const weeks = Math.floor(days / 7);
                  const months = Math.floor(days / 30);
                  return (
                    <div className="bg-blue-50 p-3 rounded border border-blue-200 mt-4">
                      <p className="text-sm font-semibold text-gray-800 mb-2">Duración:</p>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="bg-white p-2 rounded border border-blue-100">
                          <p className="text-lg font-bold text-blue-600">{days}</p>
                          <p className="text-xs text-gray-600">Días</p>
                        </div>
                        <div className="bg-white p-2 rounded border border-blue-100">
                          <p className="text-lg font-bold text-blue-600">{weeks}</p>
                          <p className="text-xs text-gray-600">Semanas</p>
                        </div>
                        <div className="bg-white p-2 rounded border border-blue-100">
                          <p className="text-lg font-bold text-blue-600">{months}</p>
                          <p className="text-xs text-gray-600">Meses</p>
                        </div>
                      </div>
                    </div>
                  );
                }
                return <p className="text-sm text-red-600 mt-2">La fecha final debe ser posterior a la inicial</p>;
              })()}

              <div className="flex gap-3 justify-end mt-5 pt-4 border-t border-gray-200">
                <button
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 font-medium text-sm transition-colors"
                  onClick={() => { (window as any).__dateStart = ''; (window as any).__dateEnd = ''; setDateStart(''); setDateEnd(''); setShowDateModal(false); }}
                >
                  Cancelar
                </button>
                <button
                  className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-medium text-sm transition-colors"
                  onClick={() => {
                    const start = (window as any).__dateStart || dateStart;
                    const end = (window as any).__dateEnd || dateEnd;
                    if (start && end) {
                      if (editedQuote) {
                        setEditedQuote(prev => prev ? ({ ...prev, execution_time: `${start}|${end}` }) : prev);
                      }
                      if (showCreateModal) {
                        setCreateForm((p:any) => ({ ...p, execution_time: `${start}|${end}` }));
                      }
                      setShowDateModal(false);
                    }
                  }}
                >
                  Confirmar
                </button>
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
        <div className="px-2 sm:px-4 py-4 space-y-2 mt-0 lg:mt-1 overflow-x-hidden">
          {quotes.map((q) => (
            <div key={q.id} className="bg-white border-2 border-gray-300 rounded-lg shadow-md overflow-hidden p-2">
              {/* Header con cliente y estado */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-300 p-4 flex justify-between items-start relative">
                <div className="flex-1">
                  <div className="font-bold text-lg text-red-700">{q.name}</div>
                  <div className="text-sm text-gray-600 mt-1">{q.email} | {q.phone}</div>
                </div>
                <div className="flex items-center gap-3">
                  {(() => {
                    const s = (q.status ?? '').toString().toUpperCase();
                    let cls = 'bg-gray-400 text-white';
                    let label = q.status ?? '';
                    if (s === 'PENDING' || s === 'PENDIENTE') { cls = 'bg-yellow-400 text-yellow-700'; label = 'PENDIENTE'; }
                    else if (s === 'SENT' || s === 'ENVIADO') { cls = 'bg-orange-500 text-white'; label = 'ENVIADO'; }
                    else if (s === 'APPROVED' || s === 'ACEPTADO') { cls = 'bg-green-600 text-white'; label = 'ACEPTADO'; }
                    else if (s === 'REJECTED' || s === 'RECHAZADO') { cls = 'bg-red-600 text-white'; label = 'RECHAZADO'; }
                    return (
                      <button className={`px-4 py-2 rounded-full text-sm font-semibold ${cls}`} aria-hidden>
                        {label}
                      </button>
                    );
                  })()}
                  <button
                    onClick={() => toggleCollapse(q.id)}
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center justify-center w-10 h-10 rounded-md hover:bg-gray-200"
                    aria-label={collapsedQuotes[q.id] ? 'Expandir cotización' : 'Colapsar cotización'}
                    title={collapsedQuotes[q.id] ? 'Expandir' : 'Colapsar'}
                  >
                    {collapsedQuotes[q.id] ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="18 15 12 9 6 15"></polyline>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {!collapsedQuotes[q.id] && (
                <>
                  {/* Grid consolidado de información */}
                  <div className="grid grid-cols-5 gap-1 p-1">
                    <div className="p-1 border border-gray-300 rounded bg-red-700">
                      <div className="text-xs font-semibold text-white/50 uppercase">Cotización</div>
                      <div className="text-base text-white text-center font-bold -mt-2">{q.correlative ?? '-'}</div>
                    </div>
                    <div className="p-1 border border-gray-300 rounded bg-white">
                      <div className="text-xs font-semibold text-gray-400 uppercase">Estado</div>
                      <div className="text-xs text-gray-900 text-center">{q.status ?? '-'}</div>
                    </div>
                    <div className="p-1 border border-gray-300 rounded bg-white">
                      <div className="text-xs font-semibold text-gray-400 uppercase">Creado</div>
                      <div className="text-xs text-gray-900 text-center">{q.createdAt ? new Date(q.createdAt).toLocaleDateString() : '-'}</div>
                    </div>
                    <div className="p-1 border border-gray-300 rounded bg-white">
                      <div className="text-xs font-semibold text-gray-400 uppercase">Compañía</div>
                      <div className="text-xs text-gray-900 text-center">{q.items?.[0]?.company ?? '-'}</div>
                    </div>
                    <div className="p-1 border border-gray-300 rounded bg-white">
                      <div className="text-xs font-semibold text-gray-400 uppercase">Documento</div>
                      <div className="text-xs text-gray-900 text-center">{q.items?.[0]?.document ?? '-'}</div>
                    </div>
                    <div className="p-1 border border-gray-300 rounded bg-white">
                      <div className="text-xs font-semibold text-gray-400 uppercase">Email</div>
                      <div className="text-xs text-gray-900 text-center truncate">{q.items?.[0]?.email ?? '-'}</div>
                    </div>
                    <div className="p-1 border border-gray-300 rounded bg-white">
                      <div className="text-xs font-semibold text-gray-400 uppercase">Teléfono</div>
                      <div className="text-xs text-gray-900 text-center">{q.items?.[0]?.phone ?? '-'}</div>
                    </div>
                    <div className="p-1 border border-gray-300 rounded bg-white">
                      <div className="text-xs font-semibold text-gray-400 uppercase">Descuento</div>
                      <div className="text-xs text-gray-900 text-center">{q.items?.[0]?.discount ? `${q.items[0].discount}%` : '-'}</div>
                    </div>
                    <div className="p-1 border border-gray-300 rounded bg-white">
                      <div className="text-xs font-semibold text-gray-400 uppercase">Ejecución</div>
                      <div className="text-xs text-gray-900 text-center">{q.execution_time ? String(q.execution_time).replace(/\|/g, ' / ') : '-'}</div>
                    </div>
                    <div className="p-1 border border-gray-300 rounded bg-white">
                      <div className="text-xs font-semibold text-gray-400 uppercase">Forma Pago</div>
                      <div className="text-xs text-gray-900 text-center">{q.payment_method ?? '-'}</div>
                    </div>
                    <div className="p-1 border border-gray-300 rounded bg-white">
                      <div className="text-xs font-semibold text-gray-400 uppercase">Quote ID</div>
                      <div className="text-xs text-gray-700 font-mono truncate text-center">{q.items?.[0]?.quote_id ? q.items[0].quote_id.substring(0, 20) + '...' : '-'}</div>
                    </div>
                  </div>

                  {/* Descripción */}
                  <div className="p-1 bg-gray-50 w-full">
                    <div className="text-xs font-semibold text-gray-700 uppercase mb-1">Descripción</div>
                    <div className="text-xs text-gray-800 whitespace-pre-wrap p-2 bg-white border border-gray-200 rounded max-h-[60vh] overflow-auto w-full">
                      {q.description || '(vacío)'}
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="bg-gray-50 p-1 flex gap-1 justify-end border-t border-gray-300">
                    <button className="px-4 py-2 bg-blue-900 text-white rounded hover:bg-blue-800 transition font-semibold text-sm" onClick={() => {
                      setSelectedQuote(q);
                      // Crear copia mutable de la cotización
                      const quoteForEditing: Quote = {
                        ...q,
                        name: q.name || '',
                        email: q.email || '',
                        phone: q.phone || '',
                        execution_time: q.execution_time || '',
                        payment_method: q.payment_method || '',
                        description: q.description || '',
                        items: q.items ? q.items.map(item => ({ ...item })) : []
                      };
                      setEditedQuote(quoteForEditing);
                      // inicializar precios, cantidades y descuentos editables
                      const prices: Record<string, number> = {};
                      const qtys: Record<string, number> = {};
                      const discounts: Record<string, number> = {};
                      (q.items || []).forEach(it => {
                        prices[it.id] = it.update_price ?? it.price ?? 0;
                        qtys[it.id] = it.qty ?? 1;
                        discounts[it.id] = it.discount ?? 0;
                      });
                      setEditedPrices(prices);
                      setEditedQtys(qtys);
                      setEditedDiscounts(discounts);
                      const units: Record<string, string> = {};
                      const chars: Record<string, string[]> = {};
                      (q.items || []).forEach(it => {
                        const src = (it as any).measurement_unit ?? (it as any).unit_measure ?? (it as any).measurementUnit ?? (it.product?.measurement_unit ?? '');
                        units[it.id] = normalizeUnitKey(src);
                        // normalize characteristics: prefer item.characteristics, fallback to product.characteristics
                        let c: any = (it as any).characteristics ?? (it.product && (it.product.characteristics ?? null)) ?? null;
                        if (typeof c === 'string') {
                          try { c = JSON.parse(c); } catch { c = c.split(',').map((s:string)=>s.trim()).filter(Boolean); }
                        }
                        if (!Array.isArray(c)) c = [];
                        chars[it.id] = c;
                      });
                      setEditedUnits(units);
                      setEditedCharacteristics(chars);
                      setShowModal(true);
                      // Use the current items order from `q.items` so reopening respects last known order
                      const ordered = (q.items || []).map((item:any) => item.id);
                      syncOriginalOrder(ordered);
                    }}>Editar cotización</button>
                    <button
                      disabled={sending}
                      className={`px-4 py-2 ${sending ? 'bg-red-800 cursor-not-allowed' : 'bg-red-700 hover:bg-red-800'} text-white rounded transition font-semibold text-sm`}
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/quotes');
                          if (res.ok) {
                            const all = await res.json();
                            const latest = all.find((x: Quote) => x.id === q.id) ?? q;
                            setQuoteToSend(latest);
                          } else {
                            setQuoteToSend(q);
                          }
                        } catch {
                          setQuoteToSend(q);
                        }
                    setShowQuoteSendConfirm(true);
                  }}
                >
                  {sending ? 'Enviando...' : 'Enviar Cotización'}
                </button>
                <button className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition" onClick={() => { console.log('[Versions] Historial clicked', q.id); openVersionsModal(q.id); }}>Historial</button>
                <button
                  className={`px-3 py-2 ${previewingPdfId === q.id ? 'bg-indigo-700 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded transition`}
                  onClick={async () => {
                    setPreviewingPdfId(q.id);
                    await previewQuotePdf(q);
                    setPreviewingPdfId(null);
                  }}
                  disabled={previewingPdfId === q.id}
                >
                  {previewingPdfId === q.id ? 'Generando...' : 'Previsualizar PDF'}
                </button>
              </div>
              {/* Mobile: items as cards */}
              <div className="md:hidden space-y-1">
                {q.items && q.items.length > 0 ? (
                  q.items.map((item) => (
                        <div key={item.id} className="border rounded p-2">
                          <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 truncate">{item.name}</div>
                          <div className="text-xs text-gray-600">Qty: {item.qty} · {(item.measurement_unit || '').replace(/^unidad\s+/i, '')}</div>
                          <div className="text-xs text-gray-600">Precio: {item.price ? `$${formatCLP(item.price)}` : '-'}</div>
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
                      <th className="px-1 py-0.5 border-b w-[10%]">product_id</th>
                      <th className="px-1 py-0.5 border-b w-[20%]">Producto</th>
                      <th className="px-1 py-0.5 border-b w-[10%]">Imagen</th>
                      <th className="px-1 py-0.5 border-b w-[8%]">Cantidad</th>
                      <th className="px-1 py-0.5 border-b w-[14%] text-center">Unidad</th>
                      <th className="px-1 py-0.5 border-b w-[14%]">Características</th>
                      <th className="px-1 py-0.5 border-b w-[20%]">Descripción</th>
                      {/* <th className="px-2 py-1 border-b w-[10%]">Fabricante</th> */}
                      <th className="px-1 py-0.5 border-b w-[12%] text-center">Valor unitario</th>
                      <th className="px-1 py-0.5 border-b w-[12%] text-center">Precio</th>
                      <th className="px-1 py-0.5 border-b w-[10%]">Descuento (%)</th>
                      <th className="px-1 py-0.5 border-b w-[12%] text-center">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.items && q.items.length > 0 ? (
                      q.items.map((item) => {
                        // Prefer data from the quote item (fasercon_quote_items)
                        const itemImage = item.image_url ?? item.product?.image_url ?? null;
                        const itemName = item.name ?? item.product?.name ?? '';
                        let itemCharacteristics: string[] = [];
                        if (Array.isArray(item.characteristics)) itemCharacteristics = item.characteristics;
                        else if (typeof item.characteristics === 'string') {
                          try { itemCharacteristics = JSON.parse(item.characteristics); } catch { itemCharacteristics = String(item.characteristics).split(',').map((s:string)=>s.trim()).filter(Boolean); }
                        } else if (item.product) {
                          const pchars = item.product.characteristics;
                          if (Array.isArray(pchars)) itemCharacteristics = pchars;
                          else if (typeof pchars === 'string') {
                            try { itemCharacteristics = JSON.parse(pchars); } catch { itemCharacteristics = String(pchars).split(',').map((s:string)=>s.trim()).filter(Boolean); }
                          }
                        }

                        const perUnit = typeof item.update_price === 'number' ? item.update_price : (typeof item.price === 'number' ? item.price : (item.product?.price ?? null));
                        const priceTotal = (typeof perUnit === 'number' && typeof item.qty === 'number') ? Math.round(perUnit * item.qty) : null;
                        const discountPercent = typeof item.discount === 'number' ? item.discount : 0;
                        const discountAmount = priceTotal !== null ? Math.round(priceTotal * (discountPercent / 100)) : 0;
                        const subtotal = priceTotal !== null ? (priceTotal - discountAmount) : 0;

                        return (
                          <tr key={item.id} className="border-b">
                              <td className="px-1 py-0.5 truncate">
                                <span title={String(item.product_id ?? item.product?.id ?? '')}>
                                  {String(item.product_id ?? item.product?.id ?? '').split('-')[0]}
                                </span>
                              </td>
                              <td className="px-1 py-0.5" style={{ maxWidth: '640px' }}>
                                <div style={{ whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{itemName}</div>
                              </td>
                              <td className="px-1 py-0.5">
                              {itemImage ? (
                                <div className="relative w-10 h-10">
                                  <Image src={Array.isArray(itemImage) ? itemImage[0] as string : (itemImage as string)} alt={itemName || ''} fill className="object-contain rounded border" sizes="40px" />
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                              <td className="px-1 py-0.5 text-center">{item.qty}</td>
                              <td className="px-1 py-0.5 text-center">{(() => {
                                  const source = item.measurement_unit ?? item.product?.measurement_unit ?? '';
                                  const key = normalizeUnitKey(source);
                                  return unitLabels[key] ?? String(source).replace(/^unidad\s+/i, '');
                                })()}</td>
                              <td className="px-1 py-0.5 truncate">
                              {itemCharacteristics.length > 0 ? (
                                  <div className="flex flex-wrap gap-1 overflow-hidden">
                                  {itemCharacteristics.map((c, idx) => (
                                      <span key={idx} className="inline-block bg-gray-100 border border-gray-300 rounded-full px-2 py-0.5 text-[10px] text-gray-700">
                                      {c}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                              <td className="px-2 py-1" style={{ maxWidth: '180px' }}>
                                <div style={{ whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'break-word' }} title={item.description ?? ''}>
                                  {item.description ?? '-'}
                                </div>
                              </td>
                              <td className="px-1 py-0.5 text-center">{typeof perUnit === 'number' ? `$${formatCLP(perUnit)}` : '-'}</td>
                              <td className="px-1 py-0.5 text-center">{priceTotal !== null ? `$${formatCLP(priceTotal)}` : '-'}</td>
                              <td className="px-1 py-0.5 text-center">{item.discount ? `${item.discount}%` : '-'}</td>
                              <td className="px-1 py-0.5 text-center">{subtotal ? `$${formatCLP(subtotal)}` : '-'}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr><td colSpan={14} className="text-center text-gray-400 py-2">Sin productos</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Resumen de totales (mostrar debajo de la tabla en la vista principal) */}
              <div className="flex justify-end mt-4">
                {(() => {
                  const netoSinDescuento = (q.items || []).reduce((acc: number, item: any) => {
                    const perUnit = typeof item.update_price === 'number' ? item.update_price : (typeof item.price === 'number' ? item.price : (item.product?.price ?? 0));
                    const qty = Number(item.qty) || 0;
                    return acc + (perUnit * qty);
                  }, 0);
                  const netoConDescuento = (q.items || []).reduce((acc: number, item: any) => {
                    const perUnit = typeof item.update_price === 'number' ? item.update_price : (typeof item.price === 'number' ? item.price : (item.product?.price ?? 0));
                    const qty = Number(item.qty) || 0;
                    const discount = typeof item.discount === 'number' ? item.discount : 0;
                    const priceTotal = perUnit * qty;
                    const discounted = Math.round(priceTotal - (priceTotal * (discount / 100)));
                    return acc + discounted;
                  }, 0);
                  const descuentoTotal = Math.round(netoSinDescuento - netoConDescuento);
                  const iva = Math.round(netoConDescuento * 0.19);
                  const total = netoConDescuento + iva;
                  return (
                    <div style={{ border: '1px solid #e5e7eb', minWidth: '340px', background: '#fff', marginLeft: '-40px' }}>
                      <table style={{ width: '100%' }}>
                        <tbody>
                          <tr>
                            <td style={{ fontWeight: 'normal', padding: '6px 0 4px 12px', fontSize: '0.85rem' }}>Total Neto Sin Descuento:</td>
                            <td style={{ textAlign: 'right', fontWeight: 'normal', padding: '6px 12px 4px 0', fontSize: '0.85rem' }}>$ {formatCLP(netoSinDescuento)}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 'normal', padding: '4px 0 4px 12px', fontSize: '0.85rem' }}>Descuento:</td>
                            <td style={{ textAlign: 'right', fontWeight: 'normal', padding: '4px 12px 4px 0', fontSize: '0.85rem' }}>$ {formatCLP(descuentoTotal)}</td>
                          </tr>
                          <tr style={{ background: '#fafafa' }}>
                            <td style={{ fontWeight: 'normal', padding: '4px 0 4px 12px', fontSize: '0.85rem' }}>Total Neto:</td>
                            <td style={{ textAlign: 'right', fontWeight: 'normal', padding: '4px 12px 4px 0', fontSize: '0.85rem' }}>$ {formatCLP(netoConDescuento)}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 'normal', padding: '4px 0 4px 12px', fontSize: '0.85rem' }}>IVA (19%):</td>
                            <td style={{ textAlign: 'right', fontWeight: 'normal', padding: '4px 12px 4px 0', fontSize: '0.85rem' }}>$ {formatCLP(iva)}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 'bold', padding: '6px 0 8px 12px', fontSize: '0.95rem', color: '#a62626' }}>TOTAL:</td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '6px 12px 8px 0', fontSize: '0.95rem', color: '#a62626' }}>$ {formatCLP(total)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      {/* Versions Modal - rendered at top level */}
      {versionsModalOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-[120]" onClick={() => { setVersionsModalOpen(false); setSelectedVersionPayload(null); setSelectedVersionMeta(null); }} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[121] w-[95%] max-w-7xl h-[85vh] bg-white rounded-xl shadow-2xl flex flex-col">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-2xl font-bold">Historial de Versiones</h2>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded" onClick={() => { setSelectedVersionPayload(null); setSelectedVersionMeta(null); }}>Limpiar</button>
                <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded" onClick={() => { setVersionsModalOpen(false); setSelectedVersionPayload(null); setSelectedVersionMeta(null); }}>Cerrar</button>
              </div>
            </div>
            <div className="flex flex-1 overflow-hidden">
              {/* Versions List */}
              <div className="w-64 border-r bg-gray-50 overflow-auto p-4">
                <div className="text-sm font-semibold text-gray-700 mb-3">Versiones disponibles</div>
                {versionsLoading ? (
                  <div className="text-sm text-gray-600">Cargando...</div>
                ) : versionsList.length === 0 ? (
                  <div className="text-sm text-gray-500">Sin versiones</div>
                ) : (
                  <ul className="space-y-2">
                    {versionsList.map((v: any) => (
                      <li key={v.id} className="border rounded p-3 bg-white hover:bg-blue-50 cursor-pointer transition">
                        <div className="font-semibold text-sm">v{v.version}</div>
                        <div className="text-xs text-gray-600 mt-1">{v.correlativo ? `Correlativo: ${v.correlativo}` : '-'}</div>
                        <div className="text-xs text-gray-500 mt-1">{v.created_at ? new Date(v.created_at).toLocaleDateString() : '-'}</div>
                        <div className="flex gap-1 mt-2">
                          <button className="flex-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs" onClick={() => fetchAndShowVersion(selectedQuoteForVersions || v.quote_id, v.version)}>Ver</button>
                          <button className="flex-1 px-2 py-1 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded text-xs" onClick={async () => {
                            const res = await fetch(`/api/quotes/${encodeURIComponent(selectedQuoteForVersions || v.quote_id)}/versions/${v.version}`);
                            const data = await res.json();
                            const blob = new Blob([JSON.stringify(data.payload ?? {}, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `quote_${v.quote_id}_v${v.version}.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}>JSON</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {/* Content Area */}
              <div className="flex-1 overflow-auto p-6">
                {selectedVersionPayload ? (
                  <div>
                    {/* Graphic view of the quote */}
                    <div className="mb-6">
                      <h3 className="text-xl font-bold mb-4">Cotización {selectedVersionPayload.pdf_correlative || selectedVersionPayload.quote?.correlativo || '-'}</h3>
                      
                      {/* Quote info */}
                      <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded">
                        <div><span className="font-semibold">Cliente:</span> {selectedVersionPayload.quote?.name ?? selectedVersionPayload.quote?.contact_name ?? '-'}</div>
                        <div><span className="font-semibold">Documento:</span> {selectedVersionPayload.quote?.document ?? '-'}</div>
                        <div><span className="font-semibold">Email:</span> {selectedVersionPayload.quote?.email ?? '-'}</div>
                        <div><span className="font-semibold">Teléfono:</span> {selectedVersionPayload.quote?.phone ?? '-'}</div>
                        <div><span className="font-semibold">Dirección:</span> {selectedVersionPayload.quote?.company_address ?? '-'}</div>
                        <div><span className="font-semibold">Estado:</span> {selectedVersionPayload.quote?.status ?? '-'}</div>
                        <div><span className="font-semibold">Tipo:</span> {selectedVersionPayload.quote?.material_type ?? '-'}</div>
                        <div><span className="font-semibold">Correlativo:</span> {selectedVersionPayload.quote?.correlative ?? selectedVersionPayload.pdf_correlative ?? '-'}</div>
                        <div className="col-span-2"><span className="font-semibold">Generado:</span> {selectedVersionPayload.metadata?.generatedAt ? new Date(selectedVersionPayload.metadata.generatedAt).toLocaleString() : (selectedVersionPayload.generatedAt ? new Date(selectedVersionPayload.generatedAt).toLocaleString() : '-')}</div>
                      </div>

                      {/* Items table */}
                      <div className="mb-6">
                        <h4 className="font-semibold mb-2">Productos/Servicios</h4>
                        <div className="border rounded overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-100 border-b">
                                <th className="px-3 py-2 text-left">SKU</th>
                                <th className="px-3 py-2 text-left">Producto</th>
                                <th className="px-3 py-2 text-center">Cantidad</th>
                                <th className="px-3 py-2 text-center">Unidad</th>
                                <th className="px-3 py-2 text-right">Precio Unit.</th>
                                <th className="px-3 py-2 text-right">Desc.</th>
                                <th className="px-3 py-2 text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedVersionPayload.items && selectedVersionPayload.items.length > 0 ? (
                                selectedVersionPayload.items.map((item: any, idx: number) => {
                                  const basePrice = item.update_price || item.price || 0;
                                  const qty = item.qty || 0;
                                  const discount = item.discount || 0;
                                  const subtotal = basePrice * qty;
                                  const total = subtotal * (1 - discount / 100);
                                  return (
                                    <tr key={idx} className="border-b hover:bg-gray-50">
                                      <td className="px-3 py-2 text-xs text-gray-600">{item.product_id?.substring(0, 8) || item.id?.substring(0, 8) || '-'}</td>
                                      <td className="px-3 py-2">{item.name || '-'}</td>
                                      <td className="px-3 py-2 text-center">{qty}</td>
                                      <td className="px-3 py-2 text-center text-xs">{item.measurement_unit || ''}</td>
                                      <td className="px-3 py-2 text-right">${basePrice > 0 ? formatCLP(basePrice) : '0'}</td>
                                      <td className="px-3 py-2 text-right">{discount > 0 ? `${discount}%` : '-'}</td>
                                      <td className="px-3 py-2 text-right font-semibold">${total > 0 ? formatCLP(total) : '0'}</td>
                                    </tr>
                                  );
                                })
                              ) : (
                                <tr><td colSpan={7} className="px-3 py-2 text-gray-500">Sin items</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Summary */}
                      <div className="flex justify-end">
                        <div className="w-64 space-y-2 p-4 bg-gray-50 rounded">
                          <div className="flex justify-between">
                            <span>Subtotal:</span> 
                            <span>${selectedVersionPayload.quote?.subtotal ? formatCLP(selectedVersionPayload.quote.subtotal) : (selectedVersionPayload.items ? formatCLP(selectedVersionPayload.items.reduce((sum: number, item: any) => sum + ((item.update_price || item.price || 0) * (item.qty || 0) * (1 - (item.discount || 0) / 100)), 0)) : '0')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Impuesto:</span> 
                            <span>${selectedVersionPayload.quote?.tax ? formatCLP(selectedVersionPayload.quote.tax) : '0'}</span>
                          </div>
                          <div className="flex justify-between font-bold text-lg border-t pt-2">
                            <span>Total:</span> 
                            <span>${selectedVersionPayload.quote?.total ? formatCLP(selectedVersionPayload.quote.total) : (selectedVersionPayload.items ? formatCLP(selectedVersionPayload.items.reduce((sum: number, item: any) => sum + ((item.update_price || item.price || 0) * (item.qty || 0) * (1 - (item.discount || 0) / 100)), 0)) : '0')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 text-center mt-20">
                    <p className="text-lg">Selecciona una versión para ver la cotización</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

