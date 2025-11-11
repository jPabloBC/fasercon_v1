import Image from 'next/image';
import {
  ChartBarIcon, // Resumen
  ArchiveBoxIcon, // Productos
  DocumentTextIcon, // Cotizaciones
  UserGroupIcon, // Contactos
  ClipboardDocumentListIcon, // Formulario
  TruckIcon, // Proveedores
  Cog6ToothIcon, // Configuración
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import React, { Fragment } from 'react';

const NAV = [
  { id: 'overview', name: 'Resumen', icon: ChartBarIcon, href: '/dashboard' },
  { id: 'products', name: 'Productos', icon: ArchiveBoxIcon, href: '/dashboard/products' },
  { id: 'quotes', name: 'Cotizaciones', icon: DocumentTextIcon, href: '/dashboard/quotes' },
  { id: 'contacts', name: 'Contactos', icon: UserGroupIcon, href: '/dashboard/contact' },
  { id: 'contact-form', name: 'Formulario', icon: ClipboardDocumentListIcon, href: '/dashboard/contact-form' },
  { id: 'suppliers', name: 'Proveedores', icon: TruckIcon, href: '/dashboard/suppliers' },
  { id: 'settings', name: 'Configuración', icon: Cog6ToothIcon, href: '/dashboard/settings' },
];

export default function DashboardAside({
  isCollapsed,
  setCollapsed,
  isMobileVisible,
  setMobileVisible,
  className,
}: {
  isCollapsed: boolean;
  setCollapsed: (c: boolean) => void;
  isMobileVisible: boolean;
  setMobileVisible: (v: boolean) => void;
  className?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const asideContent = (
    <>
      <div className={`relative flex items-center justify-between mb-8 ${isCollapsed ? 'px-2' : 'px-6'}`}>
        <Image
          src={isCollapsed ? '/fasercon_icon.png' : '/assets/images/fasercon_logo2.png'}
          alt="Fasercon Logo"
          width={isCollapsed ? 48 : 120}
          height={isCollapsed ? 48 : 120}
          className="transition-all duration-300"
        />
        <button
          onClick={() => setMobileVisible(false)}
          className="lg:hidden p-2 text-gray-500 rounded-md hover:bg-gray-100"
          aria-label="Cerrar menú"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>
      <nav className="flex-1 space-y-2 px-2">
        {NAV.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.href && tab.href !== '#') router.push(tab.href);
              setMobileVisible(false);
            }}
            className={`w-full flex items-center px-3 py-3 rounded-md text-base font-medium transition-colors ${
              (tab.href !== '#' && pathname === tab.href)
                ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
            } ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? tab.name : undefined}
          >
            <tab.icon className={`w-6 h-6 transition-all ${isCollapsed ? '' : 'mr-3'}`} />
            {!isCollapsed && <span className="truncate">{tab.name}</span>}
          </button>
        ))}
      </nav>
      <div className="mt-auto pt-8 flex flex-col items-center px-2">
        <button
          onClick={() => signOut({ callbackUrl: '/auth/login' })}
          className={`w-full flex items-center px-3 py-2 rounded-md text-base text-red-600 hover:bg-red-50 transition-colors ${isCollapsed ? 'justify-center' : ''}`}
          title={isCollapsed ? "Cerrar Sesión" : undefined}
        >
          <svg className={`w-6 h-6 ${isCollapsed ? '' : 'mr-3'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
          {!isCollapsed && <span>Cerrar Sesión</span>}
        </button>
      </div>
      {/* Collapse button at the bottom right edge of the aside */}
      <div className="hidden lg:block absolute z-50" style={{ bottom: '24px', right: '-12px' }}>
        <button
          onClick={() => setCollapsed(!isCollapsed)}
          className="bg-white p-1 rounded-full shadow-md hover:bg-gray-100 focus:outline-none border border-gray-200"
          aria-label={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            {isCollapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            )}
          </svg>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile sidebar */}
      <div
        className={`fixed inset-0 bg-gray-900 bg-opacity-50 z-20 lg:hidden transition-opacity duration-300 ${isMobileVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setMobileVisible(false)}
        aria-hidden="true"
      ></div>
      <div
        className={`fixed inset-y-0 left-0 bg-white border-r border-gray-200 flex flex-col py-4 z-30 transition-transform duration-300 transform lg:hidden ${isMobileVisible ? 'translate-x-0' : '-translate-x-full'} w-64`}>
        {asideContent}
      </div>

      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex lg:flex-col bg-white border-r border-gray-200 py-4 transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-52'} ${className}`}>
        {asideContent}
      </aside>
    </>
  );
}
