'use client';

import React from 'react';
import {
  FileText,
  HeartPulse,
  Pill,
  ClipboardList,
  Stethoscope,
  Briefcase,
  Syringe,
  FileBadge,
  Calendar,
  Layers,
  Archive,
  FlaskConical, // Added FlaskConical here to fix the previous import pattern
} from 'lucide-react';

// --- Placeholder for Session/Privilege Context Hook ---
// IMPORTANT: Replace this placeholder with your actual hook to get user privileges.
// This structure assumes you get a list of privilege strings (e.g., ["View Observations", "Add Orders"]).
const useSession = () => {
  // Mocking the privileges of the Super User provided in your prompt for demonstration
  const superUserPrivileges = [
    'View Patients', 'Get Observations', 'Get Orders', 'Get Allergies', 
    'Get Conditions', 'Get Visits', 'View Encounters', 'Get Patient Programs',
    'Get Encounter Types', 'View Attachments', 'View Appointments',
    'Get Concepts', 'View Observations', 'View Orders', 
    'Patient Dashboard - View Patient Summary', 
    'Patient Dashboard - View Overview Section',
    'View Problems', // Used for Conditions
    // Ensure all required privileges for the defined links are present for the Super User mock
    'View Allergies', 
    'View Attachments',
    'View Patient Programs',
    'View Appointments',
    'View Encounters',
  ];
  return { privileges: superUserPrivileges, isAuthenticated: true };
};
// ----------------------------------------------------

interface PatientSubNavProps {
  patientUuid: string;
}

// Defines the structure and required privileges for each patient tab.
const patientNavigationItems = [
  {
    path: '', // Index page, e.g., /patients/[uuid]
    label: 'Summary',
    icon: FileText,
    requiredPrivilege: 'Patient Dashboard - View Patient Summary', 
  },
  {
    path: 'vitals',
    label: 'Vitals & Biometrics',
    icon: HeartPulse,
    requiredPrivilege: 'View Observations', 
  },
  {
    path: 'medications',
    label: 'Medications',
    icon: Pill,
    requiredPrivilege: 'View Orders', 
  },
  {
    path: 'results',
    label: 'Results',
    icon: FlaskConical,
    requiredPrivilege: 'View Observations', 
  },
  {
    path: 'orders',
    label: 'Orders',
    icon: ClipboardList,
    requiredPrivilege: 'View Orders',
  },
  {
    path: 'visits',
    label: 'Visits & Encounters',
    icon: Stethoscope,
    requiredPrivilege: 'View Encounters', 
  },
  {
    path: 'allergies',
    label: 'Allergies',
    icon: FileBadge,
    requiredPrivilege: 'View Allergies', 
  },
  {
    path: 'conditions',
    label: 'Conditions',
    icon: Briefcase,
    requiredPrivilege: 'View Problems', 
  },
  {
    path: 'immunizations',
    label: 'Immunizations',
    icon: Syringe,
    requiredPrivilege: 'View Observations', 
  },
  {
    path: 'attachments',
    label: 'Attachments',
    icon: Archive,
    requiredPrivilege: 'View Attachments',
  },
  {
    path: 'programs',
    label: 'Programs',
    icon: Layers,
    requiredPrivilege: 'View Patient Programs', 
  },
  {
    path: 'appointments',
    label: 'Appointments',
    icon: Calendar,
    requiredPrivilege: 'View Appointments', 
  },
];

const PatientSubNav: React.FC<PatientSubNavProps> = ({ patientUuid }) => {
  // ❌ FIX: Using window.location.pathname as a fallback for usePathname
  // This is safe because this component is marked 'use client'
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  
  const { privileges } = useSession(); 
  
  // Base URL for all patient links (e.g., /dashboard/patients/123-abc)
  const baseUrl = `/dashboard/patients/${patientUuid}`;

  // Helper function to check if a user has a required privilege
  const hasRequiredPrivilege = (requiredPrivilege: string | undefined): boolean => {
    if (!requiredPrivilege) return true;
    return privileges.includes(requiredPrivilege);
  };

  const filteredNavigation = patientNavigationItems.filter(item => 
    hasRequiredPrivilege(item.requiredPrivilege)
  );

  return (
    // Horizontal Tab Bar Layout 
    <nav className="border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm overflow-x-auto whitespace-nowrap">
      <div className="flex items-center space-x-2 px-4 sm:px-6 md:px-8 py-2">
        {filteredNavigation.map((item) => {
          const href = `${baseUrl}/${item.path}`;
          
          // Determine if the current link is active.
          // Handle the index path carefully: it should match the base URL exactly,
          // but if it's not the index, it should match the start of the path.
          const isIndexActive = item.path === '' && (pathname === baseUrl || pathname === `${baseUrl}/`);
          const isSubPathActive = item.path !== '' && pathname.startsWith(href);
          const isActive = isIndexActive || isSubPathActive;

          return (
            // ❌ FIX: Using standard <a> tag instead of Next.js <Link>
            // to avoid the dependency error.
            <a key={item.path} href={href}>
              <div
                className={`
                  flex items-center px-4 py-2 text-sm font-medium rounded-lg transition duration-150 ease-in-out cursor-pointer
                  ${isActive 
                    ? 'bg-indigo-500 text-white shadow-md' 
                    : 'text-gray-600 hover:bg-gray-100'
                  }
                `}
              >
                <item.icon size={16} className="mr-2" />
                {item.label}
              </div>
            </a>
          );
        })}
      </div>
    </nav>
  );
};

export default PatientSubNav;
