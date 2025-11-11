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
      <div className="px-8 py-6">
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
          <div className="bg-white rounded-xl shadow-lg p-0 overflow-x-auto border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-blue-50">
                <tr>
                  <th className="px-4 py-3 border-b font-semibold text-gray-700">Nombre</th>
                  <th className="px-4 py-3 border-b font-semibold text-gray-700">Email</th>
                  <th className="px-4 py-3 border-b font-semibold text-gray-700">Teléfono</th>
                  <th className="px-4 py-3 border-b font-semibold text-gray-700">Mensaje</th>
                  <th className="px-4 py-3 border-b font-semibold text-gray-700">Estado</th>
                  <th className="px-4 py-3 border-b font-semibold text-gray-700 text-center">Acciones</th>
                  <th className="px-4 py-3 border-b font-semibold text-gray-700">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {filteredForms.length > 0 ? (
                  filteredForms.map((f) => (
                    <tr key={f.id} className="border-b hover:bg-blue-100 transition-colors group">
                      <td className="px-4 py-3">{f.nombre || f.name}</td>
                      <td className="px-4 py-3">{f.email}</td>
                      <td className="px-4 py-3">{f.telefono || f.phone}</td>
                      <td className="px-4 py-3 max-w-xs truncate" title={f.mensaje || f.message}>{f.mensaje || f.message}</td>
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
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center gap-2 justify-center">
                          {/* Acciones de contacto */}
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
                          {/* Botones de estado */}
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
                    <td colSpan={6} className="text-center py-6 text-gray-400">No hay formularios registrados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
