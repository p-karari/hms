'use client';

import React, { useMemo } from 'react';
import {
  Home, Users, Calendar, BedDouble, ClipboardList,
  FlaskConical, CreditCard, FileText, UserCog, Settings, LogOut,
  MapPin, BookOpen, ChevronRight
} from 'lucide-react';

// --- MOCK SESSION AND PRIVILEGE CHECKING ---
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

// --- UPDATED NAVLINK COMPONENT ---
interface NavLinkProps {
  href: string;
  label: string;
  icon: React.ReactElement<{ size?: number, className?: string }>;
  requiredPrivilege?: string;
  isLogout?: boolean;
}

const NavLink: React.FC<NavLinkProps> = ({ href, label, icon, isLogout = false }) => {
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  
  const isActive = useMemo(() => {
    if (href === '/dashboard' && (currentPath === href || currentPath === '/dashboard/')) {
        return true;
    }
    // For other links, check if current path starts with the href
    return href !== '/dashboard' && currentPath.startsWith(href);
  }, [currentPath, href]);

  const baseClasses = "flex items-center justify-between p-3 rounded-xl transition-all duration-200 group border";
  const activeClasses = isLogout 
    ? 'bg-red-50 border-red-200 text-red-700 shadow-sm border-l-4 border-l-red-500' 
    : 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm border-l-4 border-l-blue-500';
    
  const inactiveClasses = isLogout 
    ? 'text-gray-600 border-transparent hover:bg-red-50 hover:text-red-700 hover:border-red-200'
    : 'text-gray-600 border-transparent hover:bg-gray-50 hover:text-gray-900 hover:border-gray-200';

  return (
    <a href={href} className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}>
      <div className="flex items-center space-x-3">
        {
          React.isValidElement(icon)
            ? React.cloneElement(icon, { 
                size: 18, 
                className: `flex-shrink-0 transition-colors duration-200 ${isActive ? (isLogout ? 'text-red-600' : 'text-blue-600') : 'text-gray-400 group-hover:text-gray-600'}` 
              })
            : null
        }
        <span className={`text-sm font-medium ${isActive ? (isLogout ? 'text-red-700' : 'text-blue-700') : ''}`}>
          {label}
        </span>
      </div>
      {isActive && (
        <div className="flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <ChevronRight 
            size={16} 
            className={`transition-all duration-200 ${isActive ? (isLogout ? 'text-red-600' : 'text-blue-600') : 'text-gray-300 group-hover:text-gray-400'} transform group-hover:translate-x-0.5`}
          />
        </div>
      )}
    </a>
  );
};

// --- MAIN UPDATED SIDEBAR COMPONENT ---
export function DashboardSidebar() {
  const { privileges } = useMockSession();
  
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
        { href: "/dashboard/orders", label: "Order Management", icon: <ClipboardList />, requiredPrivilege: "Add Orders" },
        { href: "/dashboard/labs", label: "Lab Results Console", icon: <FlaskConical />, requiredPrivilege: "View Observations" },
        { href: "/dashboard/admissions", label: "Bed/Admission Mgmt", icon: <BedDouble />, requiredPrivilege: "Add Visits" },
        { href: "/dashboard/billing", label: "Billing & Claims", icon: <CreditCard />, requiredPrivilege: "Manage Billing" },
      ]
    },
    {
      section: "System & Administration", 
      links: [
        { href: "/dashboard/reports", label: "Reports & Analytics", icon: <FileText />, requiredPrivilege: "Run Reports" },
        { href: "/dashboard/staff", label: "User & Staff Mgmt", icon: <UserCog />, requiredPrivilege: "Manage Users" },
        { href: "/dashboard/admin/concepts", label: "Concept Dictionary", icon: <BookOpen />, requiredPrivilege: "View Concepts" },
        { href: "/dashboard/admin/locations", label: "Locations & Wards", icon: <MapPin />, requiredPrivilege: "View Locations" },
        { href: "/dashboard/settings", label: "Global Settings", icon: <Settings />, requiredPrivilege: "Task: openmrs-core.admin.view" },
      ]
    },
  ], []);

  const filteredNavLinks = useMemo(() => 
    allNavLinks.map(section => ({
      ...section,
      links: section.links.filter(link => 
        hasRequiredPrivilege(privileges, link.requiredPrivilege)
      )
    })).filter(section => section.links.length > 0)
  , [allNavLinks, privileges]);

  return (
    <aside className="fixed top-0 left-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm z-30 mr-2">
      
      {/* Updated Brand / Logo */}
      <div className="h-20 flex items-center px-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <div>
            <span className="text-lg font-bold text-gray-900 tracking-tight block leading-tight">
              ALPHIL HOSPITAL
            </span>
            <span className="text-xs text-gray-500 font-medium block leading-tight">
              Medical System
            </span>
          </div>
        </div>
      </div>

      {/* Updated Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto custom-scrollbar">
        {filteredNavLinks.map(section => (
          <div key={section.section} className="space-y-2">
            <h3 className="text-xs font-semibold uppercase text-gray-500 px-3 tracking-wider">
              {section.section}
            </h3>
            <div className="space-y-1">
              {section.links.map(link => (
                <NavLink 
                  key={link.href} 
                  href={link.href} 
                  label={link.label} 
                  icon={link.icon} 
                  requiredPrivilege={link.requiredPrivilege} 
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Updated Footer / Logout */}
      <div className="p-4 border-t border-gray-200 bg-gray-50/50">
        <NavLink
          href="/logout"
          label="Logout"
          icon={<LogOut />}
          requiredPrivilege="View Dashboard" 
          isLogout={true}
        />
        <div className="mt-3 px-3">
          <p className="text-xs text-gray-500 text-center">
            🔒 Secure medical system
          </p>
        </div>
      </div>
      
      {/* Updated Custom Scrollbar Styling */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f9fafb;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d1d5db;
        }
      `}</style>
    </aside>
  );
}

export default DashboardSidebar;