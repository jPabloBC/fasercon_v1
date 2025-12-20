"use client";
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import DashboardAside from '@/components/DashboardAside';


import { useEffect } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [isAsideCollapsed, setIsAsideCollapsed] = useState(false);
  const [isAsideVisible, setIsAsideVisible] = useState(false);
  const pathname = usePathname();

  // Redirigir si el usuario es admin y accede a /dashboard/settings SOLO en cliente
  useEffect(() => {
    if (session?.user?.role === 'admin' && pathname === '/dashboard/settings') {
      window.location.href = '/dashboard';
    }
  }, [session, pathname]);

  // Set header title based on route
  let headerTitle = '';
  if (pathname === '/dashboard/quotes') headerTitle = 'Cotizaciones';
  else if (pathname === '/dashboard/clients') headerTitle = 'Clientes';
  else if (pathname === '/dashboard/contact') headerTitle = 'Contactos';
  else if (pathname === '/dashboard/services') headerTitle = 'Servicios';
  else if (pathname === '/dashboard/products') headerTitle = 'Materiales y Suministros';
  else if (pathname === '/dashboard/contact-form') headerTitle = 'Formulario';
  else if (pathname === '/dashboard/settings') headerTitle = 'Configuración';
  else if (pathname === '/dashboard') headerTitle = 'Panel Administrativo';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Fixed Aside */}
      <DashboardAside
        isCollapsed={isAsideCollapsed}
        setCollapsed={setIsAsideCollapsed}
        isMobileVisible={isAsideVisible}
        setMobileVisible={setIsAsideVisible}
        className="fixed top-0 left-0 h-full z-20 bg-white shadow-md"
      />
      {/* Main Content */}
      <div className={`flex-1 flex flex-col ml-0 ${isAsideCollapsed ? 'lg:ml-16' : 'lg:ml-52'}`}> {/* Margin adapts to aside width on lg */}
        {/* Header with hamburger for mobile - Fixed on small/medium screens */}
        <div className={`flex items-center px-4 py-2 bg-red-800 fixed top-0 left-0 right-0 z-50 ${isAsideCollapsed ? 'lg:left-16' : 'lg:left-52'}`}>
          {/* Hamburger button for mobile */}
          <button
            className="lg:hidden mr-2 p-2 rounded-md text-gray-500 hover:bg-gray-100 focus:outline-none"
            aria-label="Abrir menú"
            onClick={() => setIsAsideVisible(true)}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {/* Title */}
          <span className="text-xl font-normal text-red-200">{headerTitle}</span>
        </div>
        <main className="flex-1 pt-14 px-4">
          {children}
        </main>
      </div>
    </div>
  );
}
