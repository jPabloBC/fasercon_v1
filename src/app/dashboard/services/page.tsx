"use client";
import React, { useEffect, useState } from "react";
import Image from 'next/image'
import { supabase } from "@/lib/supabase";
import type { Service } from "@/types/service";
import ServiceForm from "./ServiceForm";

export default function DashboardServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Service | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchServices() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("fasercon_services")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) setError(error.message);
    setServices(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchServices();
  }, []);

  async function handleSave(service: Service) {
    setError(null);
    try {
      const method = service.id ? 'PUT' : 'POST';
      const res = await fetch('/api/services', {
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
    // Use full available width in dashboard content area and tighten spacing on large screens
  <div className="w-full max-w-full p-2 sm:p-2 lg:p-4 mx-auto mt-2 overflow-x-hidden">
      <h1 className="text-2xl font-bold mb-4">Servicios</h1>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
  );
}
