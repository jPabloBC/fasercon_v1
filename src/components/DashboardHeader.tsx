"use client";
import { Bars3Icon } from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';

export default function DashboardHeader({
  toggleAside = () => {},
  title,
  subtitle,
  className,
  isAsideCollapsed = false,
}: {
  toggleAside?: () => void;
  title?: string;
  subtitle?: string;
  className?: string;
  isAsideCollapsed?: boolean;
}) {
  const [asideWidth, setAsideWidth] = useState(208);

  useEffect(() => {
    setAsideWidth(isAsideCollapsed ? 64 : 208);
  }, [isAsideCollapsed]);

  return (
    <header
      className={`bg-white border-b border-gray-200 z-40 fixed top-0 right-0 w-full lg:w-[calc(100%-var(--aside-width,208px))] lg:left-[var(--aside-width,208px)] ${className}`}
      style={{ height: '64px', '--aside-width': `${asideWidth}px` } as React.CSSProperties}
    >
      <div className="px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-center">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center">
            <button
              type="button"
              className="-ml-2 p-2 text-gray-500 rounded-md hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 lg:hidden"
              onClick={toggleAside}
            >
              <span className="sr-only">Open sidebar</span>
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          {title && (
            <div>
              <h1 className="text-2xl font-normal text-gray-400">{title}</h1>
              {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}