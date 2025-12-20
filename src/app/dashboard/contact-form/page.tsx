"use client";
import { useEffect, useState } from "react";

import { Phone, Mail, MessageCircle, Eye, CircleCheck, CircleX } from 'lucide-react';

type ContactForm = {
  id: string;
  nombre?: string;
  name?: string;
  email: string;
  telefono?: string;
  phone?: string;
  mensaje?: string;
  message?: string;
  status?: string;
  estado?: string;
  fecha?: string;
  createdAt?: string;
};

export default function ContactFormPage() {

  const [forms, setForms] = useState<ContactForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Filtro de búsqueda
  const filteredForms = forms.filter((f: ContactForm) => {
    const q = search.toLowerCase();
    return (
      (f.nombre || f.name || '').toLowerCase().includes(q) ||
      (f.email || '').toLowerCase().includes(q) ||
      (f.telefono || f.phone || '').toLowerCase().includes(q)
    );
  });

  async function fetchForms() {
    try {
      const res = await fetch('/api/contact');
      if (!res.ok) throw new Error('Error al cargar formularios');
      const data = await res.json();
      setForms(data);
    } catch {
      setError('No se pudieron cargar los formularios');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchForms();
    const interval = setInterval(fetchForms, 5000);
    return () => clearInterval(interval);
  }, []);

  // Escuchar eventos de almacenamiento local para refresco inmediato
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === 'fasercon_contact_form_submitted') {
        fetchForms();
      }
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);



  return (
    <>
      {/* Remove DashboardHeader, now rendered in layout */}
      {/* <DashboardHeader title="Formulario" /> */}
  <div className="overflow-x-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-xl font-semibold">Datos enviados</h2>
          <input
            type="text"
            placeholder="Buscar por nombre, email o teléfono..."
            className="w-full sm:w-80 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {loading ? (
          <div className="text-gray-500">Cargando...</div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : (
          <>
            {/* Vista de tarjetas para móvil */}
            <div className="block md:hidden space-y-4">
              {filteredForms.length > 0 ? (
                filteredForms.map((f) => (
                  <div key={f.id} className="bg-white rounded-lg shadow border border-gray-200 p-4">
                    <div className="space-y-3">
                      <div>
                        <span className="text-xs text-gray-500">Nombre</span>
                        <p className="font-semibold break-words">{f.nombre || f.name}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Email</span>
                        <p className="break-words text-sm">{f.email}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Teléfono</span>
                        <p className="break-words text-sm">{f.telefono || f.phone}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Mensaje</span>
                        <p className="break-words text-sm">{f.mensaje || f.message}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Estado</span>
                        <div className="mt-1">
                          <span className={
                            `inline-block px-2 py-1 rounded text-xs font-semibold ` +
                            (f.estado === 'CERRADO' || f.status === 'CERRADO'
                              ? 'bg-gray-200 text-gray-600'
                              : f.estado === 'PROCESADO' || f.status === 'PROCESADO'
                              ? 'bg-blue-100 text-blue-800'
                              : f.estado === 'LEIDO' || f.status === 'LEIDO'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-700')
                          }>
                            {(() => {
                              const estado = f.estado || f.status;
                              if (!estado || estado === 'PENDING') return 'Pendiente';
                              if (estado === 'LEIDO') return 'Leído';
                              if (estado === 'PROCESADO') return 'Procesado';
                              if (estado === 'CERRADO') return 'Cerrado';
                              return estado;
                            })()}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Fecha</span>
                        <p className="text-sm">{
                          f.fecha || f.createdAt
                            ? new Date(f.fecha || f.createdAt || '').toLocaleString('es-CL', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''
                        }</p>
                      </div>
                      <div className="pt-2 border-t">
                        <span className="text-xs text-gray-500 block mb-2">Acciones</span>
                        <div className="flex items-center gap-2 flex-wrap">
                          {f.telefono || f.phone ? (
                            <a href={`tel:${f.telefono || f.phone}`} title="Llamar" className="text-blue-600 hover:text-blue-800">
                              <Phone size={18} />
                            </a>
                          ) : null}
                          {f.email ? (
                            <a href={`mailto:${f.email}`} title="Enviar correo" className="text-blue-600 hover:text-blue-800">
                              <Mail size={18} />
                            </a>
                          ) : null}
                          {f.telefono || f.phone ? (
                            <a href={`https://wa.me/${(f.telefono || f.phone)?.replace(/[^\d]/g, '')}`} target="_blank" rel="noopener noreferrer" title="WhatsApp" className="text-green-600 hover:text-green-800">
                              <MessageCircle size={18} />
                            </a>
                          ) : null}
                          <button
                            className={`rounded-full p-1 transition-colors ${f.estado === 'LEIDO' || f.status === 'LEIDO' ? 'bg-yellow-100 text-yellow-700' : 'hover:bg-yellow-50 text-yellow-500'}`}
                            title="Marcar como LEÍDO"
                            onClick={async () => {
                              await fetch(`/api/contact?id=${f.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'LEIDO' }),
                              });
                              window.localStorage.setItem('fasercon_contact_form_submitted', Date.now().toString());
                            }}
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            className={`rounded-full p-1 transition-colors ${f.estado === 'PROCESADO' || f.status === 'PROCESADO' ? 'bg-blue-100 text-blue-700' : 'hover:bg-blue-50 text-blue-500'}`}
                            title="Marcar como PROCESADO"
                            onClick={async () => {
                              await fetch(`/api/contact?id=${f.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'PROCESADO' }),
                              });
                              window.localStorage.setItem('fasercon_contact_form_submitted', Date.now().toString());
                            }}
                          >
                            <CircleCheck size={18} />
                          </button>
                          <button
                            className={`rounded-full p-1 transition-colors ${f.estado === 'CERRADO' || f.status === 'CERRADO' ? 'bg-gray-200 text-gray-700' : 'hover:bg-gray-50 text-gray-500'}`}
                            title="Marcar como CERRADO"
                            onClick={async () => {
                              await fetch(`/api/contact?id=${f.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'CERRADO' }),
                              });
                              window.localStorage.setItem('fasercon_contact_form_submitted', Date.now().toString());
                            }}
                          >
                            <CircleX size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-400">No hay formularios registrados.</div>
              )}
            </div>

            {/* Vista de tabla para escritorio */}
            <div className="hidden md:block bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
              <div className="overflow-x-hidden">
                <table className="min-w-full table-fixed text-sm">
                  <thead className="bg-blue-50">
                    <tr>
                      <th className="px-4 py-3 border-b font-semibold text-gray-700 text-left w-[16%]">Nombre</th>
                      <th className="px-4 py-3 border-b font-semibold text-gray-700 text-left w-[20%]">Email</th>
                      <th className="px-4 py-3 border-b font-semibold text-gray-700 text-left w-[14%]">Teléfono</th>
                      <th className="px-4 py-3 border-b font-semibold text-gray-700 text-left w-[26%]">Mensaje</th>
                      <th className="px-4 py-3 border-b font-semibold text-gray-700 text-left w-[10%]">Estado</th>
                      <th className="px-4 py-3 border-b font-semibold text-gray-700 text-center w-[8%]">Acciones</th>
                      <th className="px-4 py-3 border-b font-semibold text-gray-700 text-left w-[12%]">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredForms.length > 0 ? (
                      filteredForms.map((f) => (
                        <tr key={f.id} className="border-b hover:bg-blue-50 transition-colors">
                          <td className="px-4 py-3 truncate">{f.nombre || f.name}</td>
                          <td className="px-4 py-3 truncate">{f.email}</td>
                          <td className="px-4 py-3 truncate">{f.telefono || f.phone}</td>
                          <td className="px-4 py-3 truncate" title={f.mensaje || f.message}>{f.mensaje || f.message}</td>
                          <td className="px-4 py-3">
                            <span className={
                              `inline-block px-2 py-1 rounded text-xs font-semibold ` +
                              (f.estado === 'CERRADO' || f.status === 'CERRADO'
                                ? 'bg-gray-200 text-gray-600'
                                : f.estado === 'PROCESADO' || f.status === 'PROCESADO'
                                ? 'bg-blue-100 text-blue-800'
                                : f.estado === 'LEIDO' || f.status === 'LEIDO'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-700')
                            }>
                              {(() => {
                                const estado = f.estado || f.status;
                                if (!estado || estado === 'PENDING') return 'Pendiente';
                                if (estado === 'LEIDO') return 'Leído';
                                if (estado === 'PROCESADO') return 'Procesado';
                                if (estado === 'CERRADO') return 'Cerrado';
                                return estado;
                              })()}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 justify-center">
                              {f.telefono || f.phone ? (
                                <a href={`tel:${f.telefono || f.phone}`} title="Llamar" className="text-blue-600 hover:text-blue-800">
                                  <Phone size={18} />
                                </a>
                              ) : null}
                              {f.email ? (
                                <a href={`mailto:${f.email}`} title="Enviar correo" className="text-blue-600 hover:text-blue-800">
                                  <Mail size={18} />
                                </a>
                              ) : null}
                              {f.telefono || f.phone ? (
                                <a href={`https://wa.me/${(f.telefono || f.phone)?.replace(/[^\d]/g, '')}`} target="_blank" rel="noopener noreferrer" title="WhatsApp" className="text-green-600 hover:text-green-800">
                                  <MessageCircle size={18} />
                                </a>
                              ) : null}
                              <button
                                className={`rounded-full p-1 transition-colors ${f.estado === 'LEIDO' || f.status === 'LEIDO' ? 'bg-yellow-100 text-yellow-700' : 'hover:bg-yellow-50 text-yellow-500'}`}
                                title="Marcar como LEÍDO"
                                onClick={async () => {
                                  await fetch(`/api/contact?id=${f.id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ status: 'LEIDO' }),
                                  });
                                  window.localStorage.setItem('fasercon_contact_form_submitted', Date.now().toString());
                                }}
                              >
                                <Eye size={18} />
                              </button>
                              <button
                                className={`rounded-full p-1 transition-colors ${f.estado === 'PROCESADO' || f.status === 'PROCESADO' ? 'bg-blue-100 text-blue-700' : 'hover:bg-blue-50 text-blue-500'}`}
                                title="Marcar como PROCESADO"
                                onClick={async () => {
                                  await fetch(`/api/contact?id=${f.id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ status: 'PROCESADO' }),
                                  });
                                  window.localStorage.setItem('fasercon_contact_form_submitted', Date.now().toString());
                                }}
                              >
                                <CircleCheck size={18} />
                              </button>
                              <button
                                className={`rounded-full p-1 transition-colors ${f.estado === 'CERRADO' || f.status === 'CERRADO' ? 'bg-gray-200 text-gray-700' : 'hover:bg-gray-50 text-gray-500'}`}
                                title="Marcar como CERRADO"
                                onClick={async () => {
                                  await fetch(`/api/contact?id=${f.id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ status: 'CERRADO' }),
                                  });
                                  window.localStorage.setItem('fasercon_contact_form_submitted', Date.now().toString());
                                }}
                              >
                                <CircleX size={18} />
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3">{
                            f.fecha || f.createdAt
                              ? new Date(f.fecha || f.createdAt || '').toLocaleString('es-CL', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : ''
                          }</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="text-center py-6 text-gray-400">No hay formularios registrados.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
