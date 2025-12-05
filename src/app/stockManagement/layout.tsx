'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Package, 
  RefreshCw, 
  FileText, 
  BarChart3,
  Menu,
  X,
  ChevronRight,
  Building,
  User
} from 'lucide-react';

interface NavLinkProps {
  href: string;
  label: string;
  icon: React.ReactElement<{ size?: number, className?: string }>;
  onClick?: () => void;
}

const NavLink: React.FC<NavLinkProps> = ({ href, label, icon, onClick }) => {
  const pathname = usePathname();
  
  const isActive = useMemo(() => {
    if (href === '/stockManagement' && (pathname === href || pathname === '/stockManagement/')) {
      return true;
    }
    return href !== '/stockManagement' && pathname.startsWith(href);
  }, [pathname, href]);

  const baseClasses = "flex items-center justify-between p-2 rounded-lg transition-all duration-200 group border text-sm";
  const activeClasses = 'bg-blue-50 border-blue-200 text-blue-700 border-l-2 border-l-blue-500';
  const inactiveClasses = 'text-gray-600 border-transparent hover:bg-gray-50 hover:text-gray-900 hover:border-gray-200';

  return (
    <Link 
      href={href} 
      className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
      onClick={onClick}
    >
      <div className="flex items-center space-x-2">
        {
          React.isValidElement(icon)
            ? React.cloneElement(icon, { 
                size: 16, 
                className: `flex-shrink-0 transition-colors duration-200 ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}` 
              })
            : null
        }
        <span className={`font-medium ${isActive ? 'text-blue-700' : ''}`}>
          {label}
        </span>
      </div>
      {isActive && (
        <ChevronRight 
          size={14} 
          className={`transition-all duration-200 ${isActive ? 'text-blue-600' : 'text-gray-300 group-hover:text-gray-400'} transform group-hover:translate-x-0.5`}
        />
      )}
    </Link>
  );
};

export default function StockManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const navigation = useMemo(() => [
    { 
      name: 'Dashboard', 
      href: '/stockManagement', 
      icon: <LayoutDashboard />,
      label: 'Stock Dashboard'
    },
    { 
      name: 'Stock Items', 
      href: '/stockManagement/items', 
      icon: <Package />,
      label: 'Manage Stock Items'
    },
    { 
      name: 'Operations', 
      href: '/stockManagement/operations', 
      icon: <RefreshCw />,
      label: 'Stock Operations'
    },
    { 
      name: 'Stock Takes', 
      href: '/stockManagement/stocktakes', 
      icon: <FileText />,
      label: 'Stock Takes'
    },
    { 
      name: 'Reports', 
      href: '/stockManagement/reports', 
      icon: <BarChart3 />,
      label: 'Analytics & Reports'
    },
  ], []);

  const currentPage = navigation.find(item => 
    item.href === '/stockManagement' ? 
      pathname === item.href || pathname === '/stockManagement/' : 
      pathname.startsWith(item.href)
  )?.name || 'Stock Management';

  const handleLinkClick = () => {
    setSidebarOpen(false);
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white border border-gray-200 rounded-lg shadow-sm"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 backdrop-blur-sm bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-screen bg-white border-r border-gray-200 flex flex-col z-40
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0 w-56' : '-translate-x-full lg:translate-x-0 lg:w-56'}
      `}>
        
        {/* Header */}
        <div className="h-16 flex items-center px-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-sm font-bold text-gray-900 block leading-tight">
                STOCK MANAGEMENT
              </span>
              <span className="text-xs text-gray-500 block leading-tight">
                Pharmacy System
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
          <div className="space-y-1">
            <h3 className="text-xs font-semibold uppercase text-gray-500 px-2 tracking-wider">
              Navigation
            </h3>
            <div className="space-y-0.5">
              {navigation.map((item) => (
                <NavLink 
                  key={item.href} 
                  href={item.href} 
                  label={item.label} 
                  icon={item.icon} 
                  onClick={handleLinkClick}
                />
              ))}
            </div>
          </div>
        </nav>

        {/* Footer with location/user info */}
        <div className="p-3 border-t border-gray-200 bg-gray-50/50">
          <div className="space-y-1">
            <div className="flex items-center px-2 py-1 text-sm">
              <Building size={14} className="text-gray-400 mr-2" />
              <span className="text-gray-600 font-medium">Main Pharmacy</span>
            </div>
            <div className="flex items-center px-2 py-1 text-sm">
              <User size={14} className="text-gray-400 mr-2" />
              <span className="text-gray-600 font-medium">Pharmacist User</span>
            </div>
          </div>
          <div className="mt-2 px-2">
            <p className="text-xs text-gray-500 text-center">
              📊 Real-time inventory tracking
            </p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-56">
        {/* Top header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                {currentPage}
              </h1>
            </div>
            
            {/* Removed notification and settings icons as requested */}
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-[calc(100vh-4rem)]">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 sm:p-6">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}