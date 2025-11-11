'use client';

// Esto convierte el componente en un Client Component para permitir interactividad como `onError` en imágenes.

import { CheckIcon } from '@heroicons/react/20/solid'
import { PhotoIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import Image from 'next/image'

type Product = {
  id: string | number
  name: string
  description?: string | null
  image?: string | null
  image_url?: string | null
  features?: string[]
  applications?: string[]
  unit_size?: string | null
  measurement_unit?: string | null
  moreInfoLink?: string | null
}

type Props = {
  products?: Product[]
}
type PropsWithLimit = Props & { limit?: number; columns?: 1 | 2 | 3 | 4 | 5 }

export default function ProductGallery({ products = [], limit, columns }: PropsWithLimit) {

  const colsMap: Record<number, string> = {
    1: 'lg:grid-cols-1',
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'lg:grid-cols-5',
  }
  const lgColsClass = columns ? colsMap[columns] : 'lg:grid-cols-3'

  // ProductGallery is a presentational component. Data should be passed from
  // a parent (server or client). If `products` is empty, it simply renders
  // no items — this avoids using client hooks so the component can be used
  // inside Server Components (like the home page).
  return (
    <div id="products" className="bg-white pt-2 pb-4 sm:pt-4 sm:pb-8">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Nuestros Productos</h2>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Ofrecemos una amplia gama de soluciones en cubiertas y revestimientos metálicos, adaptadas a las necesidades específicas de cada proyecto.
          </p>
        </div>
  <div className={`mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-20 lg:mx-0 lg:max-w-none ${lgColsClass} items-stretch`}>
          {(limit ? products.slice(0, limit) : products).map((product) => {
            return (
              <div key={product.id} className="flex flex-col items-start h-full">
                <div className="relative w-full">
                  <div className="aspect-[16/9] w-full rounded-2xl bg-white sm:aspect-[2/1] lg:aspect-[3/2] bg-contain bg-center bg-no-repeat overflow-hidden flex items-center justify-center">
                    {(product.image || product.image_url) ? (
                      <Image
                        src={product.image || product.image_url || ''}
                        alt={product.name}
                        fill
                        className="rounded-2xl object-contain"
                        sizes="(max-width: 640px) 100vw, 300px"
                        onError={(e) => { const t = e?.currentTarget as HTMLImageElement | undefined; if (t) t.style.display = 'none' }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-gray-500 p-4">
                        <PhotoIcon className="w-12 h-12 text-gray-300 mb-2" />
                        <div className="text-sm font-medium">no image</div>
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 rounded-2xl ring-2 ring-inset ring-gray-900/10" />
                </div>
                <div className="max-w-xl flex flex-col justify-between h-full">
                  <div className="mt-8 flex items-center gap-x-4 text-xs">
                    {(product.applications || []).map((app, index) => (
                      <span key={index} className="relative z-10 rounded-full bg-red-50 px-3 py-1.5 font-medium text-red-600">{app}</span>
                    ))}
                  </div>
                  <div className="group relative">
                    <h3 className="mt-3 text-lg font-semibold leading-6 text-gray-900 group-hover:text-gray-600">
                      {product.name ? (
                        <>
                          {product.name}
                          {product.unit_size || product.measurement_unit ? (
                            <span className="text-lg ml-2 font-bold text-gray-600">{`${product.unit_size ?? ''}${product.measurement_unit === 'in' ? '"' : product.measurement_unit ? ` ${product.measurement_unit}` : ''}`.trim()}</span>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-xl text-gray-300">...</span>
                      )}
                    </h3>
                    {product.description ? (
                      <p className="mt-5 line-clamp-3 text-sm leading-6 text-gray-600">{product.description}</p>
                    ) : (
                      <p className="mt-5 text-xl leading-6 text-gray-300">...</p>
                    )}
                                                                              <h4 className="text-sm font-semibold text-gray-900">Características:</h4>
                    <ul className="mt-1 space-y-1">
                      {(product.features && product.features.length > 0) ? (
                        (product.features || []).map((feature, index) => (
                          <li key={index} className="flex items-center text-sm text-gray-600">
                            <CheckIcon className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                            {feature}
                          </li>
                        ))
                      ) : (
                        <li className="text-xl text-gray-300">...</li>
                      )}
                    </ul>
                  </div>
                  <div className="mt-6">
                    <Link href={product.moreInfoLink || '#'}>
                      <button className="rounded-md bg-red-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600">
                        Más información
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-8 flex justify-center">
          <Link href="/products" className="inline-block rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500">Ver todos los productos</Link>
        </div>
      </div>
    </div>
  )
}