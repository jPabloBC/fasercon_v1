'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'

const navigation = [
  { name: 'Inicio', href: '/' },
  { name: 'Servicios', href: '/services' },
  { name: 'Productos', href: '/products' },
  // { name: 'Proyectos', href: '/projects' },
  { name: 'Clientes', href: '/clients' },
  { name: 'Nosotros', href: '/about-us' },
  { name: 'Contacto', href: '#contacto' },
]

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [quoteCount, setQuoteCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const isActive = (path: string) => pathname === path

  function handleNavClick(e: React.MouseEvent, href: string) {
    // contact anchors like '#contacto' should navigate to home and scroll
    if (href.startsWith('#')) {
      e.preventDefault()
      const id = href.replace('#', '')
      if (pathname === '/') {
        // already on home: scroll to element
        const el = document.getElementById(id)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' })
        }
      } else {
        // navigate to home with hash
        router.push(`/${href}`)
      }
      return
    }

    // prevent navigation / full reload if we're already on the same path
    if (pathname === href) {
      e.preventDefault()
    }
  }

  useEffect(() => {
    function readCount() {
      try {
        const raw = localStorage.getItem('fasercon_quote')
        const list = raw ? JSON.parse(raw) as Array<Record<string, unknown>> : []
        const total = (list || []).reduce((s: number, it: Record<string, unknown>) => s + (Number(it.qty as unknown) || 0), 0)
        setQuoteCount(total)
      } catch {
        setQuoteCount(0)
      }
    }

    readCount()

    // listen to storage events from other tabs
    function onStorage(e: StorageEvent) {
      if (e.key === 'fasercon_quote') readCount()
    }

    window.addEventListener('storage', onStorage)
    // custom event for same-window updates
    window.addEventListener('fasercon_quote_updated', readCount as EventListener)

    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('fasercon_quote_updated', readCount as EventListener)
    }
  }, [])

  return (
    <header className="bg-white shadow-lg fixed w-full top-0 z-50 border-b border-gray-200">
      <nav className="mx-auto flex max-w-7xl items-center justify-between py-4 px-6 lg:px-8" aria-label="Global">
        <div className="flex lg:flex-1">
          <Link href="/" className="-m-1.5 p-1.5">
            <span className="sr-only">Fasercom</span>
            <div className="flex items-center space-x-3">
              <Image
                src="/assets/images/fasercon_logo2.png"
                alt="Fasercom Logo"
                width={180}
                height={60}
                className="h-10 w-auto sm:h-12 md:h-16 lg:h-18 xl:h-18"
                style={{ width: 'auto', height: 'auto', aspectRatio: 'auto' }}
                priority
              />
            </div>
          </Link>
        </div>
        <div className="flex lg:hidden">
          <button
            type="button"
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className="sr-only">Abrir menú principal</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        <div className="hidden lg:flex gap-x-2 sm:gap-x-4 md:gap-x-5 lg:gap-x-6 xl:gap-x-10 2xl:gap-x-12">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={(e) => handleNavClick(e, item.href)}
              className={`text-lg font-semibold leading-6 hover:text-gray-700 transition-colors ${
                isActive(item.href) ? 'text-red-600' : 'text-gray-400'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>
        <div className="hidden lg:flex lg:flex-1 lg:justify-end">
          <Link
            href="/quote"
            className="relative rounded-md bg-red-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 transition-colors"
          >
            Cotizador
            {quoteCount > 0 && (
              <span className="absolute -top-2 -right-2 inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-yellow-400 text-xs font-semibold text-red-600 px-1">
                {quoteCount}
              </span>
            )}
          </Link>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden" role="dialog" aria-modal="true">
          <div className="fixed inset-0 z-50"></div>
          <div className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
            <div className="flex items-center justify-end">
              <button
                type="button"
                className="-m-2.5 rounded-md p-2.5 text-gray-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="sr-only">Cerrar menú</span>
                <XMarkIcon className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            {loading && (
              <div className="flex justify-center items-center py-4">
                <span className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></span>
                <span className="ml-2 text-red-600 font-semibold">Cargando...</span>
              </div>
            )}
            <div className="mt-6 flow-root">
              <div className="-my-6 divide-y divide-gray-500/10">
                <div className="space-y-2 py-6">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={async (e) => {
                        if (pathname !== item.href && !item.href.startsWith('#')) {
                          setLoading(true)
                          handleNavClick(e, item.href)
                          await router.push(item.href)
                          setLoading(false)
                          setMobileMenuOpen(false)
                        } else {
                          handleNavClick(e, item.href)
                          setMobileMenuOpen(false)
                        }
                      }}
                      className={`-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 hover:bg-gray-50 ${
                        isActive(item.href) ? 'text-red-600' : 'text-gray-400'
                      }`}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
                <div className="py-6">
                  <Link
                    href="/products"
                    className="relative block rounded-md bg-red-600 px-3.5 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Cotizador
                    {quoteCount > 0 && (
                      <span className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-yellow-400 text-xs font-semibold text-red-600">
                        {quoteCount}
                      </span>
                    )}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}