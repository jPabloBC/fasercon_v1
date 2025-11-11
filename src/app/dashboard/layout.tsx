"use client";
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import DashboardAside from '@/components/DashboardAside';
import DashboardHeader from '@/components/DashboardHeader';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isAsideCollapsed, setIsAsideCollapsed] = useState(false);
  const [isAsideVisible, setIsAsideVisible] = useState(false);
  const pathname = usePathname();

  // Set header title based on route
  let headerTitle = '';
  if (pathname === '/dashboard/quotes') headerTitle = 'Cotizaciones';
  else if (pathname === '/dashboard/contact') headerTitle = 'Contactos';
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
        {/* Fixed Header, starts after aside */}
        <DashboardHeader isAsideCollapsed={isAsideCollapsed} title={headerTitle} />
        <main className="flex-1 py-2 px-4 mt-[4px]">
          {children}
        </main>
      </div>
    </div>
  );
}
