"use client"
import React from 'react';
import { FaWrench, FaCog } from 'react-icons/fa';

export default function AnimatedGears() {
  return (
    <div className="flex items-center justify-center mb-3" aria-hidden>
      <div className="flex items-center text-gray-700">
        {/* Wrench icon with right margin */}
        <FaWrench size={32} className="mr-2" />
        {/* Smaller gear */}
        <FaCog size={48} />
        {/* Larger gear with slight rotation */}
        <div className="relative" style={{ transform: 'translateY(-40px) rotate(22deg)' }}>
          <FaCog size={96} className="-ml-4" />
        </div>
      </div>
    </div>
  );
}
