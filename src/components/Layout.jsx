import { useState } from 'react';
import Sidebar from './Sidebar';

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface flex overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 lg:ml-[280px]">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 bg-surface/80 backdrop-blur-md sticky top-0 z-30 border-b border-outline-variant/30">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container text-on-surface-variant hover:bg-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined text-[24px]">menu</span>
          </button>
          <span className="brand-logo text-primary text-2xl italic font-bold">Charm</span>
          <div className="w-10" /> {/* Spacer for centering */}
        </header>
        
        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
