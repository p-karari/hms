'use client';

import React, { useMemo } from 'react';
import {
  Home, Users, Calendar, ClipboardList,
  FlaskConical, CreditCard, ChevronRight, Menu, X
} from 'lucide-react';

const useMockSession = () => {
    const superUserPrivileges = [
      'View Patients', 'View Appointment Types', 'View Encounters', 'Add Observations', 
      'Add Visits', 'Add Orders', 'View Observations', 'Manage Billing', 
      'Run Reports', 'Manage Users', 'Manage Inventory', 'View Concepts', 
      'View Locations', 'Task: openmrs-core.admin.view', 'View Dashboard'
    ];
    return { privileges: superUserPrivileges, isAuthenticated: true };
};

const hasRequiredPrivilege = (privileges: string[], requiredPrivilege: string | undefined): boolean => {
  if (!requiredPrivilege) return true;
  return privileges.includes(requiredPrivilege);
};

interface NavLinkProps {
  href: string;
  label: string;
  icon: React.ReactElement<{ size?: number, className?: string }>;
  requiredPrivilege?: string;
  isLogout?: boolean;
  onClick?: () => void;
}

const NavLink: React.FC<NavLinkProps> = ({ href, label, icon, isLogout = false, onClick }) => {
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  
  const isActive = useMemo(() => {
    if (href === '/dashboard' && (currentPath === href || currentPath === '/dashboard/')) {
        return true;
    }
    return href !== '/dashboard' && currentPath.startsWith(href);
  }, [currentPath, href]);

  const baseClasses = "flex items-center justify-between p-2 rounded-lg transition-all duration-200 group border text-sm";
  const activeClasses = isLogout 
    ? 'bg-red-50 border-red-200 text-red-700 border-l-2 border-l-red-500' 
    : 'bg-blue-50 border-blue-200 text-blue-700 border-l-2 border-l-blue-500';
    
  const inactiveClasses = isLogout 
    ? 'text-gray-600 border-transparent hover:bg-red-50 hover:text-red-700 hover:border-red-200'
    : 'text-gray-600 border-transparent hover:bg-gray-50 hover:text-gray-900 hover:border-gray-200';

  return (
    <a 
      href={href} 
      className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
      onClick={onClick}
    >
      <div className="flex items-center space-x-2">
        {
          React.isValidElement(icon)
            ? React.cloneElement(icon, { 
                size: 16, 
                className: `flex-shrink-0 transition-colors duration-200 ${isActive ? (isLogout ? 'text-red-600' : 'text-blue-600') : 'text-gray-400 group-hover:text-gray-600'}` 
              })
            : null
        }
        <span className={`font-medium ${isActive ? (isLogout ? 'text-red-700' : 'text-blue-700') : ''}`}>
          {label}
        </span>
      </div>
      {isActive && (
        <ChevronRight 
          size={14} 
          className={`transition-all duration-200 ${isActive ? (isLogout ? 'text-red-600' : 'text-blue-600') : 'text-gray-300 group-hover:text-gray-400'} transform group-hover:translate-x-0.5`}
        />
      )}
    </a>
  );
};

export function DashboardSidebar() {
  const { privileges } = useMockSession();
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  
  const allNavLinks = useMemo(() => [
    {
      section: "Core Navigation", 
      links: [
        { href: "/dashboard", label: "Dashboard Home", icon: <Home />, requiredPrivilege: 'View Dashboard' },
        { href: "/dashboard/patients", label: "Find/Manage Patients", icon: <Users />, requiredPrivilege: "View Patients" }, 
      ]
    },
    {
      section: "Clinical Workflow", 
      links: [
        { href: "/dashboard/appointments", label: "Appointments", icon: <Calendar />, requiredPrivilege: "View Appointment Types" },
        // Pharmacy Management removed
        { href: "/dashboard/pharmacy/dispensing", label: "Dispensing", icon: <ClipboardList />, requiredPrivilege: "Add Orders" },
        { href: "/dashboard/labs", label: "Lab Results Console", icon: <FlaskConical />, requiredPrivilege: "View Observations" },
        { href: "/dashboard/billing", label: "Billing & Claims", icon: <CreditCard />, requiredPrivilege: "Manage Billing" },
      ]
    },
    // {
    //   section: "System & Administration", 
    //   links: [
    //     { href: "/dashboard/reports", label: "Reports & Analytics", icon: <FileText />, requiredPrivilege: "Run Reports" },
    //     // User & Staff Management removed
    //     { href: "/dashboard/admin/locations", label: "Locations & Wards", icon: <MapPin />, requiredPrivilege: "View Locations" },
    //     // Global Settings removed
    //   ]
    // },
  ], []);

  const filteredNavLinks = useMemo(() => 
    allNavLinks.map(section => ({
      ...section,
      links: section.links.filter(link => 
        hasRequiredPrivilege(privileges, link.requiredPrivilege)
      )
    })).filter(section => section.links.length > 0)
  , [allNavLinks, privileges]);

  const handleLinkClick = () => {
    setIsMobileOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white border border-gray-200 rounded-lg shadow-sm"
      >
        {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 backdrop-blur-sm bg-opacity-50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside className={`
        fixed top-0 left-0 h-screen bg-white border-r border-gray-200 flex flex-col z-40
        transform transition-transform duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0 w-56' : '-translate-x-full lg:translate-x-0 lg:w-56'}
      `}>
        
        <div className="h-16 flex items-center px-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <span className="text-sm font-bold text-gray-900 block leading-tight">
                ALPHIL HOSPITAL
              </span>
              <span className="text-xs text-gray-500 block leading-tight">
                Medical System
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
          {filteredNavLinks.map(section => (
            <div key={section.section} className="space-y-1">
              <h3 className="text-xs font-semibold uppercase text-gray-500 px-2 tracking-wider">
                {section.section}
              </h3>
              <div className="space-y-0.5">
                {section.links.map(link => (
                  <NavLink 
                    key={link.href} 
                    href={link.href} 
                    label={link.label} 
                    icon={link.icon} 
                    requiredPrivilege={link.requiredPrivilege}
                    onClick={handleLinkClick}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer section simplified - removed Logout link and secure text */}
        <div className="p-3 border-t border-gray-200 bg-gray-50/50">
          {/* Only hospital info remains */}
          <div className="px-2">
            <p className="text-xs text-gray-500 text-center">
              ALPHIL HOSPITAL
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

export default DashboardSidebar;