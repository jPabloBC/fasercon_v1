'use client'
import React, { useEffect, useState } from 'react'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import COUNTRIES from '@/lib/countries'

type ContactInfo = {
  phone?: string | null
  website?: string | null
  contact_person?: string | null
  notes?: string | null
}

type Supplier = {
  id: string
  name: string
  email?: string | null
  address?: string | null
  country?: string | null
  phone?: string | null
  website?: string | null
  contact_info?: ContactInfo | null
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [newCountry, setNewCountry] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newContactPerson, setNewContactPerson] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [newWebsite, setNewWebsite] = useState('')
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Partial<Supplier>>({})
  // Edit validation state reserved for future inline edit UI
  // const [editValidationErrors, setEditValidationErrors] = useState<Record<string, string>>({})
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [total, setTotal] = useState(0)

  const fetchSuppliers = async (opts?: { page?: number, q?: string }) => {
    setLoading(true)
    try {
      const p = opts?.page ?? page
      const q = opts?.q ?? searchQuery
      const res = await fetch(`/api/suppliers?limit=${limit}&page=${p}` + (q ? `&q=${encodeURIComponent(q)}` : ''))
      const json = await res.json()
      if (res.ok) {
        setSuppliers(json.data || [])
        setTotal(json.total || 0)
        setPage(json.page || p)
      } else {
        console.error('Error fetching suppliers', json)
        setErrorMessage(json?.error || 'Error')
      }
    } catch (e) {
      console.error('Error fetching suppliers', e)
      setErrorMessage('Error de red')
    } finally {
      setLoading(false)
    }
  }

  const [searchQuery, setSearchQuery] = useState('')

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchSuppliers({ page: 1, q: '' }) }, [])

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      fetchSuppliers({ page: 1, q: searchQuery })
    }, 400)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  const createSupplier = async () => {
    if (!newName) {
      setValidationErrors(prev => ({ ...prev, name: 'Nombre requerido' }))
      return
    }
    // validations
    const errs: Record<string, string> = {}
    if (newEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) errs.email = 'Email inválido'
    let normalizedWebsite = newWebsite
    if (normalizedWebsite && !/^https?:\/\//i.test(normalizedWebsite)) normalizedWebsite = 'https://' + normalizedWebsite
    // basic website validation: must contain a dot after protocol
    if (normalizedWebsite && !/https?:\/\/.+\..+/i.test(normalizedWebsite)) errs.website = 'Website inválido'
    const normalizedContactPerson = newContactPerson ? newContactPerson.split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ') : ''
    if (normalizedContactPerson && !/^[\p{L} .'-]{2,}$/u.test(normalizedContactPerson)) errs.contact_person = 'Nombre inválido'
    if (Object.keys(errs).length) {
      setValidationErrors(errs)
      return
    }
    setValidationErrors({})
    setBusy(true)
    setErrorMessage(null); setMessage(null)
  const body: Record<string, unknown> = { name: newName }
  if (newEmail) body.email = newEmail
  if (newAddress) body.address = newAddress
  if (newCountry) body.country = newCountry
    // include contact_info as structured JSON
  const contactInfo: ContactInfo = {}
  if (newPhone) contactInfo.phone = newPhone
  if (normalizedContactPerson) contactInfo.contact_person = normalizedContactPerson
  if (normalizedWebsite) contactInfo.website = normalizedWebsite
  if (newNotes) contactInfo.notes = newNotes
  if (Object.keys(contactInfo).length) body.contact_info = contactInfo
  const res = await fetch('/api/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    setBusy(false)
    if (res.ok) {
      setNewName(''); setNewEmail(''); setNewAddress(''); setNewCountry('')
      setNewPhone(''); setNewContactPerson(''); setNewWebsite(''); setNewNotes('')
      setMessage('Proveedor creado')
      fetchSuppliers({ page: 1, q: searchQuery })
  setShowCreateModal(false)
  setValidationErrors({})
      setTimeout(() => setMessage(null), 3000)
    } else {
      setErrorMessage(data?.error || 'Error')
      setTimeout(() => setErrorMessage(null), 4000)
    }
  }

  const startEdit = (s: Supplier) => {
    // Build a normalized edit object containing both top-level fields and contact_info fields
    const rawCi: ContactInfo = s.contact_info ? { ...(s.contact_info) } : {}
      // Prefer top-level columns if present, fallback to contact_info
      const ci: ContactInfo = {
        phone: s.phone ?? rawCi.phone ?? null,
        website: s.website ?? rawCi.website ?? null,
        contact_person: rawCi.contact_person ?? null,
        notes: rawCi.notes ?? null,
      }

    const normalized: Partial<Supplier> = {
      name: s.name || '',
      email: s.email ?? '',
      address: s.address ?? '',
      country: s.country ?? '',
    }

    // Only attach contact_info if any of the fields are non-null/non-empty
    const ciHasData = Object.values(ci).some(v => v !== null && v !== undefined && v !== '')
  if (ciHasData) (normalized as Partial<Supplier>).contact_info = ci

    setEditingId(s.id)
    setEditValues(normalized)
    setShowEditModal(true)
  }
  const cancelEdit = () => { setEditingId(null); setEditValues({}); setShowEditModal(false) }

  const saveEdit = async () => {
    if (!editingId) return
    setBusy(true); setErrorMessage(null); setMessage(null)
    // normalize edited values
    const toSend = { id: editingId, ...editValues } as Record<string, unknown>
    if (toSend.email && typeof toSend.email === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toSend.email)) {
      setErrorMessage('Email inválido')
      setBusy(false)
      return
    }
    // normalize website/contact_person inside contact_info if present
    const rawCi = (toSend as Record<string, unknown>)['contact_info']
    if (rawCi && typeof rawCi === 'object') {
      const ci = rawCi as ContactInfo
      if (ci.website && !/^https?:\/\//i.test(ci.website)) {
        ci.website = 'https://' + ci.website
      }
      if (ci.contact_person && typeof ci.contact_person === 'string') {
        ci.contact_person = ci.contact_person.split(' ').map((p: string) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ')
      }
      ;(toSend as Record<string, unknown>)['contact_info'] = ci
    }

    const body = toSend as Record<string, unknown>
    // if editValues.contact_info is present and fields are empty strings, normalize to null
    const bodyCi = body['contact_info']
    if (bodyCi && typeof bodyCi === 'object') {
      const obj = bodyCi as Record<string, unknown>
      const keys = Object.keys(obj)
      for (const k of keys) {
        if (obj[k] === '') obj[k] = null
      }
      body['contact_info'] = obj
    }
    const res = await fetch('/api/suppliers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    setBusy(false)
    if (res.ok) {
      cancelEdit()
      setMessage('Proveedor actualizado')
      fetchSuppliers({ page, q: searchQuery })
      setTimeout(() => setMessage(null), 3000)
    } else {
      setErrorMessage(data?.error || 'Error')
      setTimeout(() => setErrorMessage(null), 4000)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const deleteSupplier = async (id: string) => {
    if (!confirm('Eliminar proveedor? Esto desvinculará productos que lo referencien.')) return
    setBusy(true); setErrorMessage(null); setMessage(null)
    const res = await fetch('/api/suppliers', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    const data = await res.json()
    setBusy(false)
    if (res.ok) {
      setMessage('Proveedor eliminado')
      fetchSuppliers({ page, q: searchQuery })
      setTimeout(() => setMessage(null), 3000)
    } else {
      setErrorMessage(data?.error || 'Error')
      setTimeout(() => setErrorMessage(null), 4000)
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Proveedores</h1>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <input placeholder="Buscar..." className="border px-2 py-1 rounded" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          <button onClick={() => fetchSuppliers({ page: 1, q: searchQuery })} className="px-2 py-1 bg-gray-200 text-gray-800 rounded">Buscar</button>
        </div>
        <div>
          <button onClick={() => setShowCreateModal(true)} aria-label="Crear proveedor" title="Crear proveedor" className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16M4 12h16" />
            </svg>
          </button>
        </div>
      </div>

  <div className="bg-gray-50 p-4 rounded shadow-sm">
        <h3 className="font-semibold mb-2">Lista de proveedores</h3>
        {message && <div className="mb-2 text-sm text-green-700">{message}</div>}
        {errorMessage && <div className="mb-2 text-sm text-red-700">{errorMessage}</div>}
        {loading ? <div>Cargando...</div> : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse table-auto">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="px-3 py-2 text-sm font-semibold text-gray-700 border-b">Nombre</th>
                  <th className="px-3 py-2 text-sm font-semibold text-gray-700 border-b">Email</th>
                  <th className="px-3 py-2 text-sm font-semibold text-gray-700 border-b">Dirección</th>
                  <th className="px-3 py-2 text-sm font-semibold text-gray-700 border-b">País</th>
                  <th className="px-3 py-2 text-sm font-semibold text-gray-700 border-b">Teléfono</th>
                  <th className="px-3 py-2 text-sm font-semibold text-gray-700 border-b">Website</th>
                  <th className="px-3 py-2 text-sm font-semibold text-gray-700 border-b">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map(s => (
                  <tr key={s.id} className="odd:bg-white even:bg-gray-50">
                    <td className="px-3 py-2 align-top border-b">
                      <div className="font-medium text-gray-900">{s.name}</div>
                      <div className="text-xs font-mono text-gray-500">{(s.id || '').split('-')[0]}</div>
                    </td>
                    <td className="px-3 py-2 align-top border-b text-sm text-gray-700">{s.email || ''}</td>
                    <td className="px-3 py-2 align-top border-b text-sm text-gray-700">{s.address || ''}</td>
                    <td className="px-3 py-2 align-top border-b text-sm text-gray-700">{s.country || ''}</td>
                    <td className="px-3 py-2 align-top border-b text-sm text-gray-700">
                      {(s.phone ?? s.contact_info?.phone) || ''}
                    </td>
                    <td className="px-3 py-2 align-top border-b text-sm text-gray-700">
                      {(() => {
                        const raw = s.website ?? s.contact_info?.website
                        if (!raw) return ''
                        const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
                        return (<a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{raw}</a>)
                      })()}
                    </td>
                    <td className="px-3 py-2 align-top border-b text-sm text-gray-700">
                      <button disabled={busy} onClick={() => { startEdit(s) }} className="px-2 py-1 bg-yellow-400 text-black rounded">Editar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4">
          <div className="text-sm text-gray-600">Mostrando {suppliers.length} de {total}</div>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowCreateModal(false); setValidationErrors({}) }}></div>
          <div className="relative bg-white rounded-lg shadow-lg w-full max-w-2xl p-6 z-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-semibold text-gray-900">Crear proveedor</h3>
              <button onClick={() => { setShowCreateModal(false); setValidationErrors({}) }} aria-label="Cerrar" className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input className="w-full border border-gray-300 px-3 py-2 rounded-md mb-0 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="Nombre" value={newName} onChange={(e) => { setNewName(e.target.value); setValidationErrors(prev => ({ ...prev, name: '' })) }} />
                {validationErrors.name && <div className="text-sm text-red-600 mt-1">{validationErrors.name}</div>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input className="w-full border border-gray-300 px-3 py-2 rounded-md mb-0 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="Email" value={newEmail} onChange={(e) => { setNewEmail(e.target.value); setValidationErrors(prev => ({ ...prev, email: '' })) }} />
                {validationErrors.email && <div className="text-sm text-red-600 mt-1">{validationErrors.email}</div>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input className="w-full border border-gray-300 px-3 py-2 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="Dirección" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">País</label>
                <select value={newCountry} onChange={(e) => setNewCountry(e.target.value)} className="w-full border border-gray-300 px-3 py-2 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100">
                  <option value="">Seleccionar país</option>
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>


              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <PhoneInput
                  international
                  defaultCountry="CL"
                  value={newPhone || undefined}
                  onChange={(val) => setNewPhone(val || '')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="+56 9 1234 5678"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Persona de contacto</label>
                <input className="w-full border border-gray-300 px-3 py-2 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="Persona de contacto" value={newContactPerson} onChange={(e) => { setNewContactPerson(e.target.value); setValidationErrors(prev => ({ ...prev, contact_person: '' })) }} />
                {validationErrors.contact_person && <div className="text-sm text-red-600 mt-1">{validationErrors.contact_person}</div>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input className="w-full border border-gray-300 px-3 py-2 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="Website" value={newWebsite} onChange={(e) => { setNewWebsite(e.target.value); setValidationErrors(prev => ({ ...prev, website: '' })) }} />
                {validationErrors.website && <div className="text-sm text-red-600 mt-1">{validationErrors.website}</div>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas / Horario</label>
                <textarea className="w-full border border-gray-300 px-3 py-2 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 min-h-[100px]" placeholder="Notas / Horario" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => { setNewName(''); setNewEmail(''); setNewAddress(''); setNewCountry(''); setNewPhone(''); setNewContactPerson(''); setNewWebsite(''); setNewNotes(''); setShowCreateModal(false); setValidationErrors({}) }} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button onClick={async () => { await createSupplier(); }} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Crear</button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => { cancelEdit() }}></div>
          <div className="relative bg-white rounded-lg shadow-lg w-full max-w-2xl p-6 z-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-semibold text-gray-900">Editar proveedor <span className="text-sm font-mono text-gray-500">{(editingId || '').split('-')[0]}</span></h3>
              <button onClick={() => cancelEdit()} aria-label="Cerrar" className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input className="w-full border border-gray-300 px-3 py-2 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="Nombre" value={(editValues.name as string) || ''} onChange={(e) => setEditValues(prev => ({ ...prev, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input className="w-full border border-gray-300 px-3 py-2 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="Email" value={(editValues.email as string) || ''} onChange={(e) => setEditValues(prev => ({ ...prev, email: e.target.value }))} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input className="w-full border border-gray-300 px-3 py-2 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="Dirección" value={(editValues.address as string) || ''} onChange={(e) => setEditValues(prev => ({ ...prev, address: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">País</label>
                <select value={(editValues.country as string) || ''} onChange={(e) => setEditValues(prev => ({ ...prev, country: e.target.value }))} className="w-full border border-gray-300 px-3 py-2 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100">
                  <option value="">Seleccionar país</option>
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <PhoneInput
                  international
                  defaultCountry="CL"
                  value={((editValues.contact_info as ContactInfo | undefined)?.phone) || undefined}
                  onChange={(val) => setEditValues(prev => ({ ...prev, contact_info: { ...(prev.contact_info as ContactInfo || {}), phone: val || null } }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="+56 9 1234 5678"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Persona de contacto</label>
                <input className="w-full border border-gray-300 px-3 py-2 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="Persona de contacto" value={(editValues.contact_info?.contact_person) || ''} onChange={(e) => setEditValues(prev => ({ ...prev, contact_info: { ...(prev.contact_info as ContactInfo || {}), contact_person: e.target.value } }))} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input className="w-full border border-gray-300 px-3 py-2 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="Website" value={(editValues.contact_info?.website) || ''} onChange={(e) => setEditValues(prev => ({ ...prev, contact_info: { ...(prev.contact_info as ContactInfo || {}), website: e.target.value } }))} />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas / Horario</label>
                <textarea className="w-full border border-gray-300 px-3 py-2 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 min-h-[100px]" placeholder="Notas / Horario" value={(editValues.contact_info?.notes) || ''} onChange={(e) => setEditValues(prev => ({ ...prev, contact_info: { ...(prev.contact_info as ContactInfo || {}), notes: e.target.value } }))} />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => { cancelEdit() }} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button onClick={async () => { await saveEdit(); }} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
