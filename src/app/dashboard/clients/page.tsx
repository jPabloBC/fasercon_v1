"use client";
import React, { useEffect, useState } from "react";
import { State, City } from 'country-state-city';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import COUNTRIES from '@/lib/countries';

type Client = {
  id?: string;
  is_active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  metadata?: any;
  document?: string;
  company_address?: string;
  city?: string;
  country?: string;
  postal_code?: string;
  notes?: string;
  region?: string;
  company?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
}

function ClientForm({ client, onSave, onCancel }: { client?: Client; onSave: (c: Client) => Promise<void>; onCancel: () => void }) {
  const [form, setForm] = useState<Client>(client || {});
  useEffect(() => setForm(client || {}), [client]);

  const [regionList, setRegionList] = useState<any[]>([]);
  const [cityList, setCityList] = useState<any[]>([]);
  const [, setDocumentValid] = useState<boolean>(false);
  const [, setDocumentExists] = useState<boolean>(false);

  const update = (k: keyof Client, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  // Capitalize name helper
  const capitalizeName = (s: string) =>
    s
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0]?.toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

  // RUT helpers (same logic as other pages)
  const cleanRut = (rut: string) => rut.replace(/[^0-9kK]/g, '').toUpperCase();
  const validateRut = (rutRaw: string): boolean => {
    const v = cleanRut(rutRaw);
    if (v.length < 2) return false;
    const body = v.slice(0, -1);
    const dv = v.slice(-1);
    let sum = 0;
    let mul = 2;
    for (let i = body.length - 1; i >= 0; i--) {
      sum += Number(body[i]) * mul;
      mul = mul === 7 ? 2 : mul + 1;
    }
    const res = 11 - (sum % 11);
    const dvCalc = res === 11 ? '0' : res === 10 ? 'K' : String(res);
    return dvCalc === dv;
  };
  const formatRut = (rutRaw: string): string => {
    const v = cleanRut(rutRaw);
    if (v.length < 2) return rutRaw;
    const body = v.slice(0, -1);
    const dv = v.slice(-1);
    let formatted = '';
    let cnt = 0;
    for (let i = body.length - 1; i >= 0; i--) {
      formatted = body[i] + formatted;
      cnt++;
      if (cnt === 3 && i !== 0) {
        formatted = '.' + formatted;
        cnt = 0;
      }
    }
    return `${formatted}-${dv}`;
  };

  useEffect(() => {
    try {
      const code = form.country || 'CL';
      const states = State.getStatesOfCountry(code) || [];
      setRegionList(states || []);
    } catch {
      setRegionList([]);
    }
    setCityList([]);
  }, [form.country]);

  useEffect(() => {
    try {
      const code = form.country || 'CL';
      const regionCode = form.region || '';
      if (!regionCode) return setCityList([]);
      const cities = City.getCitiesOfState(code, regionCode) || [];
      setCityList(cities || []);
    } catch {
      setCityList([]);
    }
  }, [form.country, form.region]);

  return (
    <div className="border rounded p-4 bg-white">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Empresa</label>
          <input value={form.company || ''} onChange={(e) => update('company', e.target.value)} className="mt-1 block w-full border rounded px-2 py-1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Contacto (Nombre y Apellido)</label>
          <input
            value={form.contact_name || ''}
            onChange={(e) => update('contact_name', e.target.value)}
            onBlur={() => update('contact_name', capitalizeName(String(form.contact_name || '')))}
            className="mt-1 block w-full border rounded px-2 py-1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">RUT / Documento</label>
          <input
            value={form.document || ''}
            onChange={(e) => {
              const v = e.target.value;
              update('document', v);
              const isValid = validateRut(String(v || ''));
              setDocumentValid(isValid);
              // user changed the value, reset existence flag until revalidated on blur
              setDocumentExists(false);
            }}
            onBlur={async () => {
              const raw = String(form.document || '').trim();
              const isValid = validateRut(raw);
              setDocumentValid(isValid);
              if (isValid) {
                // format to Chile style
                const formatted = formatRut(raw);
                update('document', formatted);
                // check existence via API (search by document)
                try {
                  const res = await fetch(`/api/clients?q=${encodeURIComponent(raw)}`);
                  if (res.ok) {
                    const data = await res.json();
                    const list = Array.isArray(data?.clients) ? data.clients : (Array.isArray(data) ? data : []);
                    const exists = (list || []).some((c: any) => {
                      const doc = String(c.document || c.rut || '').toLowerCase();
                      return doc.includes(raw.toLowerCase()) || doc.includes(formatted.toLowerCase());
                    });
                    setDocumentExists(Boolean(exists));
                  }
                } catch {
                  setDocumentExists(false);
                }
              } else {
                // if not valid, remove formatting characters so it doesn't look like a Chile format
                const cleaned = raw.replace(/[^0-9kK]/g, '').toUpperCase();
                update('document', cleaned);
                setDocumentExists(false);
              }
            }}
            className="mt-1 block w-full border rounded px-2 py-1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            value={form.email || ''}
            onChange={(e) => update('email', e.target.value)}
            onBlur={() => update('email', String(form.email || '').trim().toLowerCase())}
            className="mt-1 block w-full border rounded px-2 py-1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Teléfono</label>
          <div className="phone-wrapper">
            <PhoneInput
              international
              // `defaultCountry` typing expects CountryCode; cast to any for dynamic values
              defaultCountry={(form.country || 'CL') as any}
              value={form.phone || ''}
              onChange={(val) => update('phone', val || '')}
              className="mt-1 block w-full border rounded px-2 py-1"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">País</label>
          <select value={form.country || 'CL'} onChange={(e) => { update('country', e.target.value); update('region', ''); update('city', ''); }} className="mt-1 block w-full border rounded px-2 py-1">
            {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Región / Departamento</label>
          <select value={form.region || ''} onChange={(e) => { update('region', e.target.value); update('city', ''); }} className="mt-1 block w-full border rounded px-2 py-1">
            <option value="" disabled>-- Seleccionar --</option>
            {regionList.map(r => <option key={r.isoCode || r.state_code || r.code} value={r.isoCode || r.state_code || r.code}>{r.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Comuna / Ciudad</label>
          <select value={form.city || ''} onChange={(e) => update('city', e.target.value)} className="mt-1 block w-full border rounded px-2 py-1">
            <option value="" disabled>-- Seleccionar --</option>
            {cityList.map(cu => <option key={cu.name || cu.isoCode} value={cu.name}>{cu.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Dirección</label>
          <input value={form.company_address || ''} onChange={(e) => update('company_address', e.target.value)} className="mt-1 block w-full border rounded px-2 py-1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Código postal</label>
          <input value={form.postal_code || ''} onChange={(e) => update('postal_code', e.target.value)} className="mt-1 block w-full border rounded px-2 py-1" />
        </div>
        <div className="md:col-span-2 lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Notas</label>
          <textarea value={form.notes || ''} onChange={(e) => update('notes', e.target.value)} className="mt-1 block w-full border rounded px-2 py-1" rows={3} />
        </div>
        <div className="flex items-center gap-3 md:col-span-2 lg:col-span-3">
          <label className="inline-flex items-center">
            <input type="checkbox" checked={Boolean(form.is_active)} onChange={(e) => update('is_active', e.target.checked)} className="mr-2" />Activo
          </label>
        </div>
      </div>
      <div className="mt-4 flex gap-2 justify-end">
        <button onClick={() => onSave(form)} className="bg-red-600 text-white px-3 py-1 rounded">Guardar</button>
        <button onClick={onCancel} className="bg-gray-100 px-3 py-1 rounded">Cancelar</button>
      </div>
    </div>
  )
}

export default function DashboardClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Client | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [leftOffset, setLeftOffset] = useState<number>(0);

  const capitalizeNameLocal = (s?: string) =>
    (s || '')
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0]?.toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

  const cleanRutLocal = (rut: string) => rut.replace(/[^0-9kK]/g, '').toUpperCase();
  const validateRutLocal = (rutRaw: string): boolean => {
    const v = cleanRutLocal(rutRaw);
    if (v.length < 2) return false;
    const body = v.slice(0, -1);
    const dv = v.slice(-1);
    let sum = 0;
    let mul = 2;
    for (let i = body.length - 1; i >= 0; i--) {
      sum += Number(body[i]) * mul;
      mul = mul === 7 ? 2 : mul + 1;
    }
    const res = 11 - (sum % 11);
    const dvCalc = res === 11 ? '0' : res === 10 ? 'K' : String(res);
    return dvCalc === dv;
  };
  const formatRutLocal = (rutRaw: string): string => {
    const v = cleanRutLocal(rutRaw);
    if (v.length < 2) return rutRaw;
    const body = v.slice(0, -1);
    const dv = v.slice(-1);
    let formatted = '';
    let cnt = 0;
    for (let i = body.length - 1; i >= 0; i--) {
      formatted = body[i] + formatted;
      cnt++;
      if (cnt === 3 && i !== 0) {
        formatted = '.' + formatted;
        cnt = 0;
      }
    }
    return `${formatted}-${dv}`;
  };

  async function fetchClients() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/clients');
      const json = await res.json();
      setClients(json.clients || json.data || []);
    } catch {
      setError('Error cargando clientes');
      setClients([]);
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchClients() }, []);

  // Ensure the search bar never overlaps the aside by measuring its width
  useEffect(() => {
    function updateOffset() {
      try {
        const aside = document.querySelector('aside');
        const rect = aside instanceof HTMLElement ? aside.getBoundingClientRect() : null;
        const offset = (rect && window.innerWidth >= 1024) ? Math.round(rect.width) : 0;
        setLeftOffset(offset);
      } catch {
        setLeftOffset(0);
      }
    }

    updateOffset();
    window.addEventListener('resize', updateOffset);

    // Observe class/style changes on the aside (collapse/expand)
    const asideEl = document.querySelector('aside');
    let mo: MutationObserver | null = null;
    if (asideEl && typeof MutationObserver !== 'undefined') {
      mo = new MutationObserver(() => updateOffset());
      mo.observe(asideEl, { attributes: true, attributeFilter: ['class', 'style'] });
    }

    return () => {
      window.removeEventListener('resize', updateOffset);
      if (mo) mo.disconnect();
    };
  }, []);

  async function handleSave(client: Client) {
    setError(null);
    try {
      const payload: any = { ...client };
      // Normalize fields before sending
      if (payload.contact_name) payload.contact_name = capitalizeNameLocal(String(payload.contact_name));
      if (payload.email) payload.email = String(payload.email).trim().toLowerCase();
      if (payload.document) {
        if (validateRutLocal(payload.document)) payload.document = formatRutLocal(payload.document);
      }
      if (payload.phone) payload.phone = String(payload.phone).trim();

      const method = client.id ? 'PATCH' : 'POST';
      const res = await fetch('/api/clients', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Save failed');
      setShowForm(false);
      setEditing(null);
      await fetchClients();
    } catch {
      setError('Error guardando cliente');
    }
  }

  async function handleDelete(id?: string) {
    if (!id) return;
    if (!confirm('¿Eliminar este cliente?')) return;
    try {
      const res = await fetch('/api/clients', { method: 'DELETE', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ id }) });
      if (!res.ok) throw new Error('Delete failed');
      await fetchClients();
    } catch {
      setError('Error eliminando cliente');
    }
  }

  // Filter clients based on search term
  const filteredClients = clients.filter((c) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.company?.toLowerCase().includes(term) ||
      c.contact_name?.toLowerCase().includes(term) ||
      c.document?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.phone?.toLowerCase().includes(term) ||
      c.country?.toLowerCase().includes(term) ||
      c.city?.toLowerCase().includes(term) ||
      c.region?.toLowerCase().includes(term) ||
      c.company_address?.toLowerCase().includes(term) ||
      c.notes?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="w-full">
      {/* Search bar - fixed below header (no bg) */}
          <div className="fixed top-[50px] right-0 z-40 py-3 pointer-events-none" style={{ left: leftOffset ? leftOffset + 8 : 8 }}>
          <div className="max-w-xl px-2 relative pointer-events-auto">
          <input
            type="text"
            placeholder="Buscar clientes por empresa, contacto, documento, email, teléfono, país, ciudad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
          />

          {/* Buttons are rendered fixed to the right of the screen (see below) */}
        </div>
      </div>

      {/* Content area with padding for fixed search bar */}
      <div className="pt-16">
        {error && <div className="bg-red-100 text-red-700 px-4 py-2 mb-4 rounded mx-2">{error}</div>}
      {showForm && (
          <div className="mb-6 mx-2" id="client-form-anchor">
            <ClientForm client={editing || undefined} onSave={handleSave} onCancel={() => { setShowForm(false); setEditing(null); }} />
          </div>
        )}
        {loading ? (
          <div className="px-2">Cargando clientes...</div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-2">
          {filteredClients.length === 0 ? (
            <div className="col-span-full text-center text-gray-500 py-8">
              No se encontraron clientes{searchTerm && ` que coincidan con "${searchTerm}"`}
            </div>
          ) : (
            filteredClients.map((c) => {
            const companyVal = (c as any).company || (c as any).empresa || 'Sin nombre';
            const contactVal = (c as any).contact_name || (c as any).name || '—';
            const docVal = (c as any).document || (c as any).rut || (c as any).documento || '—';
            const addrVal = (c as any).company_address || (c as any).address || '—';
            const emailVal = (c as any).email || (c as any).correo || '—';
            const phoneVal = (c as any).phone || (c as any).telefono || '—';
            const countryVal = (c as any).country || (c as any).pais || '—';
            const regionVal = (c as any).region || (c as any).region_name || (c as any).departamento || '—';
            const cityVal = (c as any).city || (c as any).comuna || (c as any).ciudad || '—';
            // no mostrar `is_active` ni `postal_code` en la tarjeta según solicitud
            // Mostrar el nombre completo de la región si tenemos sólo un código
            let displayRegion = regionVal;
            try {
              if (regionVal && regionVal !== '—') {
                const countryCode = (c as any).country || (c as any).pais || 'CL';
                const states = State.getStatesOfCountry(countryCode) || [];
                const found = states.find((s: any) => [s.isoCode, s.state_code, s.code, s.name].some((x: any) => x && String(x).toLowerCase() === String(regionVal).toLowerCase()));
                if (found && found.name) displayRegion = found.name;
              }
            } catch {
              displayRegion = regionVal;
            }

            return (
            <div key={String(c.id)} className="border rounded p-4 flex flex-col gap-3 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{companyVal}</div>
                  {contactVal && <div className="text-sm text-gray-600">{contactVal}</div>}
                </div>
                <div className="text-xs text-gray-500">{displayRegion !== '—' ? displayRegion : (cityVal !== '—' ? cityVal : '')}</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">ID:</span>
                  <span className="truncate max-w-[14rem] min-w-0">{c.id ?? '—'}</span>
                </div>

                <div><span className="font-semibold">Documento:</span> {docVal}</div>
                <div><span className="font-semibold">Teléfono:</span> {phoneVal}</div>
                <div className="truncate flex items-center gap-2 min-w-0">
                  <span className="font-semibold">Email:</span>
                  <span className="truncate max-w-full min-w-0" title={emailVal} aria-label={emailVal}>{emailVal}</span>
                </div>
                <div><span className="font-semibold">País:</span> {countryVal}</div>
                <div><span className="font-semibold">Región:</span> {displayRegion}</div>
                <div><span className="font-semibold">Comuna/Ciudad:</span> {cityVal}</div>
                

                <div className="sm:col-span-2"><span className="font-semibold">Dirección:</span> {addrVal}</div>
                <div className="sm:col-span-2"><span className="font-semibold">Notas:</span> {c.notes || '—'}</div>
                
                <div><span className="font-semibold">Creado:</span> {c.created_at ? new Date(c.created_at).toLocaleDateString('es-ES') : '—'}</div>
                <div><span className="font-semibold">Actualizado:</span> {c.updated_at ? new Date(c.updated_at).toLocaleDateString('es-ES') : '—'}</div>
              </div>

              <div className="flex gap-2 mt-auto justify-center">
                <button className="bg-gray-700 text-white px-3 py-1 rounded" onClick={() => { setEditing(c); setShowForm(true); setTimeout(() => { const el = document.getElementById('client-form-anchor'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100); }}>Editar</button>
                <button className="bg-red-600 text-white px-3 py-1 rounded" onClick={() => handleDelete(c.id)}>Eliminar</button>
              </div>
            </div>
            );
            })
          )}
        </div>
      )}
      </div>

      {/* Floating action buttons at the right edge of the screen, aligned with search bar */}
        <div className="fixed top-[64px] right-8 z-45 flex flex-col gap-3 items-end">
        <div className="flex flex-row gap-2 items-center">
          <button
            onClick={() => { setEditing(null); setShowForm(prev => !prev); if (!showForm) { setTimeout(() => { const el = document.getElementById('client-form-anchor'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100); } }}
            aria-label={showForm ? 'Cerrar formulario' : 'Crear cliente'}
            title={showForm ? 'Cerrar formulario' : 'Crear cliente'}
            className="h-12 w-12 rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 transition-all flex items-center justify-center"
          >
            {showForm ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16M4 12h16" />
              </svg>
            )}
          </button>
          <button
            onClick={fetchClients}
            aria-label="Actualizar clientes"
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
  );
}
