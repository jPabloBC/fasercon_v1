"use client";
import React, { useEffect, useState } from "react";
import Image from 'next/image'
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import type { Service } from "@/types/service";
import type { QuoteService } from "@/types/quoteService";
import ServiceForm from "./ServiceForm";
import QuoteServiceCreator from "./QuoteServiceCreator";

export default function DashboardServicesPage() {
  const { data: session } = useSession();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Service | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'servicios' | 'otra'>('otra');
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteServices, setQuoteServices] = useState<QuoteService[]>([]);
  const [quoteEditing, setQuoteEditing] = useState<QuoteService | null>(null);
  const [quoteSearchQuery, setQuoteSearchQuery] = useState('');
  const [debouncedQuoteSearch, setDebouncedQuoteSearch] = useState('');

  const company = session?.user?.company || 'fasercon';

  async function fetchServices() {
    setLoading(true);
    setError(null);
    // Note: This endpoint doesn't exist in the API, so we'll keep using direct Supabase query for now
    // In production, consider creating a GET endpoint at /api/services
    try {
      const response = await fetch(`/api/services?company=${company}`);
      if (response.ok) {
        const data = await response.json();
        setServices(data.data || []);
      } else {
        setError('Error al cargar servicios');
      }
    } catch (err) {
      setError('Error al cargar servicios');
    }
    setLoading(false);
  }

  async function fetchQuoteServices() {
    try {
      const response = await fetch(`/api/quote-services?company=${company}`);
      if (response.ok) {
        const data = await response.json();
        setQuoteServices(data.services || []);
      } else {
        console.error('Error fetching quote services');
      }
    } catch (err) {
      console.error('Error fetching quote services:', err);
    }
  }

  useEffect(() => {
    fetchServices();
    fetchQuoteServices();
  }, []);

  // debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuoteSearch(quoteSearchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [quoteSearchQuery]);

  const displayedQuoteServices = React.useMemo(() => {
    const q = String(debouncedQuoteSearch || '').toLowerCase();
    if (!q || q.length < 3) return quoteServices;
    return quoteServices.filter(item => JSON.stringify(item).toLowerCase().includes(q));
  }, [quoteServices, debouncedQuoteSearch]);

  async function handleSave(service: Service) {
    setError(null);
    try {
      const method = service.id ? 'PUT' : 'POST';
      const res = await fetch(`/api/services?company=${company}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(service),
      });
      const payload = await res.json();
      if (!res.ok) {
        setError(payload.error || 'Error saving servicio');
        return;
      }
      setShowForm(false);
      setEditing(null);
      fetchServices();
    } catch {
      setError('Error guardando servicio');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este servicio?")) return;
    try {
      const res = await fetch('/api/services', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setError(payload.error || 'Error eliminando');
        return;
      }
      fetchServices();
    } catch {
      setError('Error eliminando servicio');
    }
  }

  return (
    <div>
      {/* Tabs header: encapsula todo el contenido existente en la pestaña "Servicios" */}
        <div className="w-full max-w-full p-2 mx-auto mt-2 mb-0">
          <div className="border-b-2 border-gray-200">
            <div className="flex items-end gap-1 px-2 lg:px-4">
              <button
                className={`px-4 py-2 rounded-t-md transition-all ${activeTab === 'otra' ? 'bg-white text-gray-900 border border-b-0 border-gray-200' : 'bg-transparent text-gray-600 hover:text-gray-900'}`}
                onClick={() => setActiveTab('otra')}
                aria-pressed={activeTab === 'otra'}
              >
                Servicios de cotizaciones
              </button>
                <button
                className={`px-4 py-2 rounded-t-md transition-all ${activeTab === 'servicios' ? 'bg-white text-gray-900 border border-b-0 border-gray-200' : 'bg-transparent text-gray-600 hover:text-gray-900'}`}
                onClick={() => setActiveTab('servicios')}
                aria-pressed={activeTab === 'servicios'}
              >
                Servicios publicados
              </button>
            </div>
          </div>
        </div>

      {activeTab === 'servicios' && (
        // Contenido existente (sin cambios) — encapsulado en la pestaña "Servicios"
          <div className="w-full max-w-full pt-3 px-4 pb-4 mx-auto bg-white border border-gray-200 rounded-b-md shadow-sm -mt-3 overflow-x-hidden">
          <p className="text-gray-600 mb-4">Gestiona los servicios que aparecen en la página pública. Puedes crear, editar o eliminar servicios. La imagen se sube a Storage y se muestra en la web pública.</p>
          {error && <div className="bg-red-100 text-red-700 px-4 py-2 mb-4 rounded">{error}</div>}
          {showForm && (
            <div className="mb-6" id="service-form-anchor">
              <ServiceForm
                service={editing || undefined}
                onSave={handleSave}
                onCancel={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
              />
            </div>
          )}
          {!showForm && (
            <button
              className="fixed top-14 right-8 z-30 w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-300 transition-all"
              style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.18)' }}
              aria-label="Crear nuevo servicio"
              onClick={() => {
                setEditing(null);
                setShowForm(true);
                setTimeout(() => {
                  const el = document.getElementById('service-form-anchor');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
              }}
            >
              <span className="pointer-events-none select-none" style={{fontSize: '2rem', lineHeight: 1}}>+</span>
            </button>
          )}
          {loading ? (
            <div>Cargando servicios...</div>
          ) : (
            // Use responsive grid to make better use of horizontal space on large screens
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((service) => (
                <div key={service.id} className="border rounded p-4 flex flex-col lg:flex-row gap-4 w-full">
                  {/* Columna 1: Imagen principal, miniaturas, botones abajo */}
                  <div className="flex flex-col items-center w-full lg:w-56 h-auto">
                    <div className="w-full h-40 max-w-[14rem] bg-gray-50 rounded overflow-hidden flex items-center justify-center">
                      {service.images && service.images[0] ? (
                        <Image src={service.images[0]} alt={`${service.title} principal`} width={224} height={160} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-sm text-gray-400">Sin imagen</div>
                      )}
                    </div>
                    {/* Miniaturas debajo de la imagen principal */}
                    {service.images && service.images.length > 1 && (
                      <div className="mt-3 flex gap-2 flex-wrap justify-center">
                        {service.images.slice(1).map((img: string, idx: number) => (
                          <div key={img} className="w-16 h-12 bg-white rounded overflow-hidden border">
                            <Image src={img} alt={`${service.title} ${idx + 2}`} width={64} height={48} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Botones al fondo de la columna */}
                    <div className="flex flex-row gap-2 justify-center mt-auto w-full pt-6">
                      <button
                        className="bg-gray-700 text-white px-3 py-1 rounded w-full"
                        onClick={() => {
                          setEditing(service);
                          setShowForm(true);
                          setTimeout(() => {
                            const el = document.getElementById('service-form-anchor');
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }, 100);
                        }}
                      >Editar</button>
                      <button
                        className="bg-red-600 text-white px-3 py-1 rounded w-full"
                        onClick={() => handleDelete(service.id)}
                      >Eliminar</button>
                    </div>
                  </div>

                  {/* Columna 2: Título, descripción y fecha al final */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="font-semibold text-lg mb-2">{service.title}</div>
                      <div className="text-gray-600 text-sm mb-4">{service.description}</div>
                    </div>
                    <div className="text-xs text-gray-500 mt-auto text-right">{new Date(service.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'otra' && (
        <div className="w-full max-w-full pt-3 px-4 pb-4 mx-auto bg-white border border-gray-200 rounded-b-md shadow-sm -mt-3 overflow-x-hidden">
          <div className="flex items-center justify-between mb-4">
            {/* Floating + button styled like the active tab (white, border, shadow) */}
            {!showQuoteForm && (
              <button
                className="fixed top-15 right-8 z-40 w-12 h-12 rounded-full bg-gray-300 text-gray-900 hover:text-gray-100 border border-gray-300 shadow-md flex items-center justify-center hover:bg-gray-500 hover:shadow-lg transform transition-transform"
                title="Crear servicio"
                onClick={() => setShowQuoteForm(true)}
                style={{ marginTop: '-4px' }}
              >
                <span className="text-4xl leading-none">+</span>
              </button>
            )}
            {showQuoteForm && !quoteEditing && (
              <button
                className="px-3 py-1 rounded bg-gray-100 text-gray-600"
                onClick={() => setShowQuoteForm(false)}
              >Cerrar</button>
            )}
          </div>

          {showQuoteForm && (
            <QuoteServiceCreator
              initial={quoteEditing}
              onSave={(service) => {
                (async () => {
                  try {
                    if (service.id) {
                      // update
                      const { error } = await supabase
                        .from(`${company}_quote_services`)
                        .update({
                          sku: service.sku || null,
                          title: service.title,
                          description: service.description,
                          unit: service.unit,
                          unit_measure: service.unit_measure || null,
                          orden: service.orden || 0,
                          billing_type: service.billing_type,
                          price: service.price,
                          images: service.images,
                          active: service.active ?? true,
                          metadata: service.metadata || null,
                        })
                        .eq('id', service.id);
                      if (error) {
                        alert(error.message || 'Error actualizando servicio');
                        return;
                      }
                    } else {
                      // insert
                      const { error } = await supabase
                        .from(`${company}_quote_services`)
                        .insert([{
                          sku: service.sku || null,
                          title: service.title,
                          description: service.description,
                          unit: service.unit,
                          unit_measure: service.unit_measure || null,
                          orden: service.orden || 0,
                          billing_type: service.billing_type,
                          price: service.price,
                          images: service.images,
                          active: service.active ?? true,
                          metadata: service.metadata || null,
                        }]);
                      if (error) {
                        alert(error.message || 'Error creando servicio');
                        return;
                      }
                    }
                    setShowQuoteForm(false);
                    setQuoteEditing(null);
                    fetchQuoteServices();
                    setActiveTab('otra');
                  } catch {
                    alert('Error guardando servicio');
                  }
                })();
              }}
              onCancel={() => { setShowQuoteForm(false); setQuoteEditing(null); }}
            />
          )}

          {!showQuoteForm && (
            <div>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Buscar servicios de cotización (mín. 3 caracteres)..."
                  value={quoteSearchQuery}
                  onChange={(e) => setQuoteSearchQuery(e.target.value)}
                  className="w-full border border-gray-300 px-3 py-2 rounded text-sm focus:outline-none focus:border-blue-500"
                />
                <div className="text-xs text-gray-500 mt-1">Ingrese 3 caracteres para iniciar la búsqueda.</div>
              </div>

              {displayedQuoteServices.length === 0 ? (
                <div className="text-gray-600">No hay servicios de cotización que coincidan.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayedQuoteServices.map(q => (
                    <div key={q.id} className="border rounded p-4 flex flex-col gap-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold">{q.title}</div>
                          <div className="text-sm text-gray-600">SKU: {q.sku || '-'}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold">${Number(q.price).toFixed(2)}</div>
                          <div className="text-xs text-gray-500">{q.unit || ''} {q.unit_measure ? `· ${q.unit_measure}` : ''}</div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-700">{q.description}</div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex gap-2">
                          <button className="bg-blue-600 text-white px-3 py-2 rounded" onClick={() => {
                            setQuoteEditing(q);
                            setShowQuoteForm(true);
                          }} aria-label={`Editar ${q.title}`}>Editar</button>
                          <button className="bg-gray-200 px-3 py-2 rounded" onClick={async () => {
                            if (!confirm('Eliminar este servicio de cotización?')) return;
                            const { error } = await supabase.from(`${company}_quote_services`).delete().eq('id', q.id);
                            if (error) return alert(error.message || 'Error eliminando');
                            fetchQuoteServices();
                          }} aria-label={`Eliminar ${q.title}`}>Eliminar</button>
                        </div>
                        <div className="text-xs text-gray-500">Creado: {new Date(q.created_at).toLocaleDateString('es-419')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
