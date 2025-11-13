"use client";

import { useEffect, useState } from "react";
import Image from 'next/image'


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

  // Polling automático cada 10 segundos
  useEffect(() => {
    let stopped = false;
    const fetchQuotes = () => {
      fetch('/api/quotes')
        .then(res => res.json())
        .then(data => {
          if (!stopped) setQuotes(Array.isArray(data) ? data : []);
        })
        .finally(() => { if (!stopped) setLoading(false); });
    };
    fetchQuotes();
    const interval = setInterval(fetchQuotes, 10000); // 10 segundos
    return () => { stopped = true; clearInterval(interval); };
  }, []);

  return (
    <>
      {/* Remove DashboardHeader, now rendered in layout */}
      {/* <DashboardHeader title="Cotizaciones" /> */}
      {loading ? (
        <div>Cargando...</div>
      ) : (
        <div className="px-2 sm:px-4 py-4 space-y-8 mt-6 lg:mt-14 overflow-x-hidden">
          {quotes.map((q) => (
            <div key={q.id} className="bg-white border border-gray-200 rounded-lg shadow p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2 gap-2">
                <div>
                  <div className="font-bold text-lg text-red-700">{q.name}</div>
                  <div className="text-sm text-gray-600">{q.email} | {q.phone}</div>
                </div>
                <div className="text-xs text-gray-500">{q.createdAt ? new Date(q.createdAt).toLocaleString() : '-'}</div>
              </div>
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
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
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
                      <th className="px-2 py-1 border-b w-[8%]">ID</th>
                      <th className="px-2 py-1 border-b w-[18%]">Producto</th>
                      <th className="px-2 py-1 border-b w-[10%]">Imagen</th>
                      <th className="px-2 py-1 border-b w-[8%]">Cantidad</th>
                      <th className="px-2 py-1 border-b w-[14%]">Unidad</th>
                      <th className="px-2 py-1 border-b w-[12%]">Precio</th>
                      <th className="px-2 py-1 border-b w-[14%]">Características</th>
                      <th className="px-2 py-1 border-b w-[12%]">Descripción</th>
                      <th className="px-2 py-1 border-b w-[10%]">Fabricante</th>
                      <th className="px-2 py-1 border-b w-[10%]">product_id</th>
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
                        return (
                          <tr key={item.id} className="border-b">
                              <td className="px-2 py-1 truncate">
                                <span title={item.id} className="inline-block max-w-full truncate">{item.id.split('-')[0]}</span>
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
                              <td className="px-2 py-1 truncate">{product.unit_size ?? item.unit_size ?? '-'} {product.measurement_unit ?? item.measurement_unit ?? ''}</td>
                              <td className="px-2 py-1 truncate">{product.price ? `$${product.price.toLocaleString()}` : (item.price ? `$${item.price.toLocaleString()}` : '-')}</td>
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
                              <td className="px-2 py-1 truncate">{product.manufacturer ?? '-'}</td>
                              <td className="px-2 py-1 truncate">
                              <span title={product.id?.toString()}>
                                {product.id !== undefined && product.id !== null
                                  ? product.id.toString().split('-')[0]
                                  : ''}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr><td colSpan={14} className="text-center text-gray-400 py-2">Sin productos</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

