import React, { useState } from 'react';
import type { User } from '../../types';
import EcommerceHeader from './ecommerce/layout/EcommerceHeader';
import EcommerceSidebar from './ecommerce/layout/EcommerceSidebar';

interface EcommerceLayoutProps {
  user: User;
  children: React.ReactNode;
}

export default function EcommerceLayout({ user, children }: EcommerceLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans md:flex-row">
      <EcommerceSidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen((value) => !value)} />

      <main className="flex h-screen min-w-0 flex-1 flex-col overflow-y-auto">
        <EcommerceHeader user={user} onToggleSidebar={() => setIsSidebarOpen((value) => !value)} />
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
