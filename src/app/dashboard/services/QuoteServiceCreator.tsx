"use client"

import React, { useRef, useState, useEffect } from "react";
import Image from 'next/image'
import type { QuoteService } from "@/types/quoteService";

interface Props {
  initial?: QuoteService | null;
  onSave?: (service: QuoteService) => void;
  onCancel?: () => void;
}

export default function QuoteServiceCreator({ initial = null, onSave, onCancel }: Props) {
  const [title, setTitle] = useState("");
  const [sku, setSku] = useState("");
  const [unit, setUnit] = useState("");
  const [billingType, setBillingType] = useState<QuoteService['billing_type']>('unit');
  const units = ['unidad','m','cm','mm','in','ft','m2','m3','l','kg','hora','otro'];
  const [selectedUnit, setSelectedUnit] = useState<string>('unidad');
  const [unitCustom, setUnitCustom] = useState<string>('');
  const [price, setPrice] = useState<string | number>(0);
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [orden, setOrden] = useState<number>(0);
  const [unitMeasure, setUnitMeasure] = useState<string>('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      try {
        const formData = new FormData();
        formData.append('file', file, cleanName);
        formData.append('filename', cleanName);
        formData.append('folder', 'services');

        const res = await fetch('/api/products/upload', {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert('Error subiendo imagen: ' + (err?.error || res.statusText));
          continue;
        }
        const data = await res.json();
        const publicUrl = data.publicUrl || data.url || data.path;
        if (!publicUrl) {
          alert('Error subiendo imagen: respuesta no contiene URL');
          continue;
        }
        uploaded.push(publicUrl);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        alert('Error subiendo imagen: ' + msg);
        continue;
      }
    }
    setImages(prev => [...prev, ...uploaded]);
    setUploading(false);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    await uploadFiles(e.target.files);
  }

  // generate a short readable SKU on mount/reset (single block, no hyphens)
  function genSku() {
    const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `QS${randomPart}`;
  }

  useEffect(() => {
    if (initial) {
      setTitle(initial.title || "");
      setSku(initial.sku || genSku());
      setSelectedUnit(initial.unit || 'unidad');
      setUnitMeasure(initial.unit_measure || (initial.unit === 'unidad' ? 'U/N' : ''));
      setUnit(initial.unit || '');
      setUnitCustom('');
      setBillingType(initial.billing_type || 'unit');
      setPrice(initial.price ?? 0);
      setDescription(initial.description || '');
      setActive(initial.active ?? true);
      setImages(initial.images || []);
      setOrden(initial.orden ?? 0);
    } else {
      if (!sku) setSku(genSku());
      setUnitMeasure('U/N'); // Set default for new services with unit=unidad
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }
  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }
  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length) {
      await uploadFiles(dt.files);
    }
  }

  function handleRemoveImage(idx: number) {
    setImages(prev => prev.filter((_, i) => i !== idx));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title) { alert('El título es obligatorio'); return; }
    // metadata not used from frontend; keep null
    const metadata: Record<string, unknown> | null = null;
    const payload: QuoteService = {
      id: initial?.id || "",
      sku,
      title: title,
      description,
      unit: selectedUnit === 'otro' ? (unitCustom || unit || sku || 'unidad') : (selectedUnit || unit || sku || 'unidad'),
      billing_type: billingType,
      price: Number(price),
      images,
      orden,
      unit_measure: unitMeasure || null,
      created_at: initial?.created_at || new Date().toISOString(),
      active,
      metadata,
    };
    onSave?.(payload);
    // reset
    setTitle(""); setSku(genSku()); setUnit(""); setUnitCustom(''); setSelectedUnit('unidad'); setPrice(0); setOrden(0); setUnitMeasure(''); setDescription(""); setImages([]); setActive(true);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Nombre</label>
        <input className="w-full border rounded px-3 py-2" value={title} onChange={e => setTitle(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">SKU</label>
          <input readOnly className="w-full border rounded px-3 py-2 bg-gray-50" value={sku} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Precio</label>
          <input type="number" className="w-full border rounded px-3 py-2" value={String(price)} onChange={e => setPrice(Number(e.target.value))} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Orden</label>
          <input type="number" className="w-full border rounded px-3 py-2" value={orden} onChange={e => setOrden(Number(e.target.value || 0))} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Unidad</label>
          <select className="w-full border rounded px-3 py-2" value={selectedUnit} onChange={e => { setSelectedUnit(e.target.value); if (e.target.value === 'unidad') setUnitMeasure('U/N'); else setUnitMeasure(''); }}>
            {units.map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          {selectedUnit === 'otro' && (
            <input className="w-full border rounded px-3 py-2 mt-2" placeholder="Unidad personalizada" value={unitCustom} onChange={e => setUnitCustom(e.target.value)} />
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Medida de unidad</label>
          <input className="w-full border rounded px-3 py-2" placeholder="p. ej. 2.5" value={unitMeasure} onChange={e => setUnitMeasure(e.target.value)} disabled={selectedUnit === 'unidad'} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Descripción</label>
        <textarea className="w-full border rounded px-3 py-2" rows={4} value={description} onChange={e => setDescription(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Tipo de facturación</label>
          <select className="w-full border rounded px-3 py-2" value={billingType} onChange={e => setBillingType(e.target.value as QuoteService['billing_type'])}>
            <option value="unit">Por unidad</option>
            <option value="hour">Por hora</option>
            <option value="lump_sum">Suma global</option>
            <option value="other">Otro</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Imágenes</label>
        <div className="flex flex-wrap gap-3 mb-2">
          {images.map((img, idx) => (
            <div key={img} className="relative group border rounded overflow-hidden bg-white" style={{ width: 96 }}>
              <Image src={img} alt={`imagen ${idx + 1}`} width={96} height={96} className="h-24 w-full object-cover" />
              <button type="button" onClick={() => handleRemoveImage(idx)} className="absolute bottom-1 right-1 bg-white/90 rounded px-2 py-0.5 text-xs">Eliminar</button>
            </div>
          ))}
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`w-full p-4 rounded border-dashed border-2 ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'} flex items-center justify-between`}
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
        >
          <div>
            <div className="font-medium">Arrastra y suelta imágenes aquí</div>
            <div className="text-sm text-gray-500">o pulsa el botón para seleccionar archivos</div>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }} className="bg-blue-600 text-white px-3 py-2 rounded">Seleccionar archivos</button>
            {uploading && <div className="text-sm text-gray-600">Subiendo...</div>}
          </div>
        </div>
        <input type="file" accept="image/*" multiple ref={fileInputRef} onChange={handleImageUpload} className="hidden" disabled={uploading} />
      </div>

      <div className="flex gap-2">
        <button type="submit" className="bg-red-600 text-white px-4 py-2 rounded">{initial ? 'Guardar modificación' : 'Crear servicio'}</button>
        {onCancel && <button type="button" className="bg-gray-200 px-4 py-2 rounded" onClick={onCancel}>Cancelar</button>}
      </div>
    </form>
  )
}
