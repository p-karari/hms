'use client';

import React, { useMemo } from 'react';
import {
  Home, Users, Calendar, BedDouble, ClipboardList,
  FlaskConical, CreditCard, FileText, UserCog, Settings, LogOut,
  MapPin, BookOpen,
} from 'lucide-react';

// --- MOCK SESSION AND PRIVILEGE CHECKING ---
// In a real application, this would come from a global AuthContext or hook.
const useMockSession = () => {
    // Mocking a Super User's privileges for demonstration
    const superUserPrivileges = [
      'View Patients', 'View Appointment Types', 'View Encounters', 'Add Observations', 
      'Add Visits', 'Add Orders', 'View Observations', 'Manage Billing', 
      'Run Reports', 'Manage Users', 'Manage Inventory', 'View Concepts', 
      'View Locations', 'Task: openmrs-core.admin.view', 'View Dashboard'
    ];
    return { privileges: superUserPrivileges, isAuthenticated: true };
};

const hasRequiredPrivilege = (privileges: string[], requiredPrivilege: string | undefined): boolean => {
  if (!requiredPrivilege) return true; // No privilege required means link is always visible
  return privileges.includes(requiredPrivilege);
};

// --- INTERNALIZED NAVLINK COMPONENT ---
// Replaces the external import and uses standard browser URL checking for active state.
interface NavLinkProps {
  href: string;
  label: string;
  icon: React.ReactElement<{ size?: number, className?: string }>;
  requiredPrivilege?: string;
  isLogout?: boolean;
}

const NavLink: React.FC<NavLinkProps> = ({ href, label, icon, isLogout = false }) => {
  // Use client-side check for current path
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  
  // Logic to handle active state: either exact match OR starts with (for nested routes like /patients/uuid)
  const isActive = useMemo(() => {
    if (href === '/dashboard' && currentPath === href) {
        return true; // Exact match for the root dashboard
    }
    // For all other links, check if the current path starts with the link's href
    return href !== '/dashboard' && currentPath.startsWith(href);
  }, [currentPath, href]);


  const baseClasses = "flex items-center space-x-3 p-3 rounded-lg transition-all duration-150";
  const activeClasses = isLogout 
    ? 'bg-red-700 text-white shadow-lg' 
    : 'bg-indigo-600 text-white shadow-lg';
    
  const inactiveClasses = isLogout 
    ? 'text-red-400 hover:bg-red-800 hover:text-white'
    : 'text-indigo-500 hover:bg-indigo-700 hover:text-white';
  
  return (
    // ❌ FIX: Using standard <a> tag instead of Next.js Link
    <a href={href} className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}>
      {
        React.isValidElement(icon)
          ? React.cloneElement(icon, { size: 18, className: "flex-shrink-0" })
          : null
      }
      <span className="text-sm font-medium">{label}</span>
    </a>
  );
};


// --- MAIN SIDEBAR COMPONENT ---
export function DashboardSidebar() {
  const { privileges } = useMockSession();
  
  // Define all links with their required privileges
  // NOTE: Links are grouped logically to enforce the EMR structure goal.
  const allNavLinks = useMemo(() => [
      // 1. Core Navigation (Global Entry Points)
      { section: "Core Navigation", links: [
          { href: "/dashboard", label: "Dashboard Home", icon: <Home />, requiredPrivilege: 'View Dashboard' },
          // Key "Find/Create Patient" function
          { href: "/dashboard/patients", label: "Find/Manage Patients", icon: <Users />, requiredPrivilege: "View Patients" }, 
      ]},
      
      // 2. Clinical Workflow Tools (Non-Patient Specific)
      { section: "Clinical Workflow", links: [
          { href: "/dashboard/appointments", label: "Appointments", icon: <Calendar />, requiredPrivilege: "View Appointment Types" },
          { href: "/dashboard/orders", label: "Order Management", icon: <ClipboardList />, requiredPrivilege: "Add Orders" },
          { href: "/dashboard/labs", label: "Lab Results Console", icon: <FlaskConical />, requiredPrivilege: "View Observations" },
          { href: "/dashboard/admissions", label: "Bed/Admission Mgmt", icon: <BedDouble />, requiredPrivilege: "Add Visits" },
          { href: "/dashboard/billing", label: "Billing & Claims", icon: <CreditCard />, requiredPrivilege: "Manage Billing" },
      ]},
      
      // 3. Administration & Setup (Superuser Tools)
      { section: "System & Administration", links: [
          { href: "/dashboard/reports", label: "Reports & Analytics", icon: <FileText />, requiredPrivilege: "Run Reports" },
          { href: "/dashboard/staff", label: "User & Staff Mgmt", icon: <UserCog />, requiredPrivilege: "Manage Users" },
          { href: "/dashboard/admin/concepts", label: "Concept Dictionary", icon: <BookOpen />, requiredPrivilege: "View Concepts" },
          { href: "/dashboard/admin/locations", label: "Locations & Wards", icon: <MapPin />, requiredPrivilege: "View Locations" },
          { href: "/dashboard/settings", label: "Global Settings", icon: <Settings />, requiredPrivilege: "Task: openmrs-core.admin.view" },
      ]},
      
      // Removed: Encounters, Vitals, Medications, Inventory as they are often handled as patient-contextual actions or are covered by the more general links.

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
    // FIX: Added 'fixed', 'top-0', and 'left-0' to pin the sidebar to the viewport.
    <aside className="fixed top-0 left-0 h-screen w-64 bg-gray-200 text-white flex flex-col shadow-2xl z-30">
      
      {/* Brand / Logo */}
      <div className="h-16 flex items-center px-6 border-b border-indigo-700">
        <span className="text-xl font-extrabold text-indigo-700 tracking-wider">
          ALPHIL HOSPITAL
        </span>
      </div>

      {/* Navigation Links */}
      {/* The 'flex-1' combined with 'overflow-y-auto' ensures this section scrolls independently. */}
      <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto custom-scrollbar text-indigo-400">
        
        {filteredNavLinks.map(section => (
          <div key={section.section} className="space-y-1">
            <h3 className="text-xs font-semibold uppercase text-indigo-500 px-3 pt-2 pb-1 border-b border-indigo-800/50">
                {section.section}
            </h3>
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
        ))}
        
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-indigo-700">
        <NavLink
          href="/logout"
          label="Logout"
          icon={<LogOut />}
          requiredPrivilege="View Dashboard" 
          isLogout={true}
        />
      </div>
      
      {/* Custom Scrollbar Styling (Required for consistent styling) */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #3730a3; /* Indigo-700 */
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #818cf8; /* Indigo-400 */
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a5b4fc; /* Indigo-300 */
        }
      `}</style>
    </aside>
  );
}

export default DashboardSidebar;
