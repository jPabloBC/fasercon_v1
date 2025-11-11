'use client'

import Link from 'next/link'
import React, { useRef } from 'react'
import Image from 'next/image'

export type SimilarItem = {
  id: string | number
  name: string
  image_url?: string | null
  description?: string | null
  unit_size?: string | null
  measurement_unit?: string | null
  multi?: boolean
}

export default function SimilarCarousel({ items }: { items: SimilarItem[] }) {
  const scroller = useRef<HTMLDivElement>(null)

  const scrollByAmount = (dir: 'left' | 'right') => {
    const el = scroller.current
    if (!el) return
    const amt = Math.max(240, Math.floor(el.clientWidth * 0.8))
    el.scrollBy({ left: dir === 'left' ? -amt : amt, behavior: 'smooth' })
  }

  return (
    <div className="relative">
      {/* Buttons only on md+ screens */}
      <button
        type="button"
        aria-label="Anterior"
        className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-8 h-8 rounded-full bg-white/80 shadow hover:bg-white"
        onClick={() => scrollByAmount('left')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-gray-700"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
      </button>
      <button
        type="button"
        aria-label="Siguiente"
        className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-8 h-8 rounded-full bg-white/80 shadow hover:bg-white"
        onClick={() => scrollByAmount('right')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-gray-700"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
      </button>

      <div
        ref={scroller}
        className="mt-3 flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth pr-1 pl-1 md:px-8 no-scrollbar flex-nowrap whitespace-nowrap"
      >
        {items.map((s) => (
          <Link
            key={s.id}
            href={`/products/${s.id}`}
            className="snap-start flex-none inline-block w-40 sm:w-44 md:w-48 lg:w-52 rounded border bg-white p-2 text-xs hover:shadow-md"
          >
            <div className="relative aspect-[4/3] mb-2 overflow-hidden rounded bg-white border border-gray-200 flex items-center justify-center">
              {s.image_url ? (
                <Image
                  src={String(s.image_url)}
                  alt={s.name}
                  fill
                  className="object-contain bg-white"
                  sizes="160px"
                  onError={(e) => { const img = e?.currentTarget as HTMLImageElement | undefined; if (img) { img.onerror = null } }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-gray-400">
                  <svg className="w-10 h-10 text-gray-300" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 7a2 2 0 0 1 2-2h1l1-2h6l1 2h1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              )}
            </div>
            <div className="truncate font-medium text-gray-900">{s.name}</div>
            {s.description ? (
              <div className="text-sm text-gray-600 mt-1 line-clamp-2">{s.description}</div>
            ) : null}
            {s.multi ? (
              <div className="text-[11px] text-gray-500 mt-1">varias dimensiones</div>
            ) : (s.unit_size || s.measurement_unit) ? (
              <div className="text-gray-600 truncate mt-1">
                {`${s.unit_size ?? ''}${s.measurement_unit ? ` ${s.measurement_unit}` : ''}`.trim()}
              </div>
            ) : null}
          </Link>
        ))}
      </div>
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
