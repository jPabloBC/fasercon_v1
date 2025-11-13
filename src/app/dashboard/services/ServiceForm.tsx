"use client"

import React, { useRef, useState } from "react";
import Image from 'next/image'
import type { Service } from "@/types/service";

interface Props {
  service?: Service;
  onSave: (service: Service) => void;
  onCancel: () => void;
}

export default function ServiceForm({ service, onSave, onCancel }: Props) {
  const [title, setTitle] = useState(service?.title || "");
  const [description, setDescription] = useState(service?.description || "");
  const [images, setImages] = useState<string[]>(service?.images || []);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      // Upload via server endpoint which uses the service role client to avoid RLS issues
      try {
        const formData = new FormData();
        formData.append('file', file, cleanName);
        formData.append('filename', cleanName);
        // indicate we want to upload to the services folder
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

  // Drag & drop handlers
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

  function setPrimary(idx: number) {
    setImages(prev => {
      if (idx === 0) return prev
      const copy = [...prev]
      const [item] = copy.splice(idx, 1)
      copy.unshift(item)
      return copy
    })
  }

  function moveImage(from: number, to: number) {
    setImages(prev => {
      const copy = [...prev]
      const [item] = copy.splice(from, 1)
      copy.splice(to, 0, item)
      return copy
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || images.length === 0) {
      alert("Título e imagen son obligatorios");
      return;
    }
    const payload: Service = {
      title,
      description,
      images,
      created_at: service?.created_at || new Date().toISOString(),
      id: service?.id || "", // Ensure id is always a string
    };
    onSave(payload);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="block font-medium mb-1">Título</label>
        <input
          className="w-full border rounded px-3 py-2"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block font-medium mb-1">Descripción</label>
        <textarea
          className="w-full border rounded px-3 py-2"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
      </div>
      <div>
        <label className="block font-medium mb-1">Imágenes</label>
        <div className="flex flex-wrap gap-3 mb-2">
          {images.map((img, idx) => (
            <div key={img} className="relative group border rounded overflow-hidden bg-white" style={{ width: 96 }}>
              <Image src={img} alt={`Imagen ${idx + 1} del servicio`} width={96} height={96} className={`h-24 w-full object-cover ${idx === 0 ? 'ring-4 ring-blue-300' : ''}`} />
              {/* Badge for primary */}
              {idx === 0 ? (
                <div className="absolute left-1 top-1 bg-blue-600 text-white text-xs px-2 py-0.5 rounded">Principal</div>
              ) : (
                <button type="button" onClick={() => setPrimary(idx)} className="absolute left-1 top-1 bg-white text-xs px-2 py-0.5 rounded shadow">Usar como principal</button>
              )}

              <div className="absolute right-1 top-1 flex flex-col gap-1">
                <button type="button" onClick={() => moveImage(idx, Math.max(0, idx - 1))} className="bg-white/90 rounded px-1 text-xs">▲</button>
                <button type="button" onClick={() => moveImage(idx, Math.min(images.length - 1, idx + 1))} className="bg-white/90 rounded px-1 text-xs">▼</button>
              </div>

              <button type="button" onClick={() => handleRemoveImage(idx)} className="absolute bottom-1 right-1 bg-white/90 rounded px-2 py-0.5 text-xs">Eliminar</button>
            </div>
          ))}
        </div>
        {/* Custom file selector + drag & drop area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`w-full p-4 rounded border-dashed border-2 ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'} flex items-center justify-between`}
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
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
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={uploading}>
          {service ? "Guardar" : "Crear"}
        </button>
        <button type="button" className="bg-gray-200 px-4 py-2 rounded" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
