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
  FlaskConical,
  CreditCard,
} from 'lucide-react';

const useSession = () => {
  const superUserPrivileges = [
    'View Patients', 'Get Observations', 'Get Orders', 'Get Allergies', 
    'Get Conditions', 'Get Visits', 'View Encounters', 'Get Patient Programs',
    'Get Encounter Types', 'View Attachments', 'View Appointments',
    'Get Concepts', 'View Observations', 'View Orders', 
    'Patient Dashboard - View Patient Summary', 
    'Patient Dashboard - View Overview Section',
    'View Problems',
    'View Allergies', 
    'View Attachments',
    'View Patient Programs',
    'View Appointments',
    'View Encounters',
  ];
  return { privileges: superUserPrivileges, isAuthenticated: true };
};

interface PatientSubNavProps {
  patientUuid: string;
}

const patientNavigationItems = [
  {
    path: '', // Index page - should be default active
    label: 'Summary',
    icon: FileText,
    requiredPrivilege: 'Patient Dashboard - View Patient Summary', 
  },
  {
    path: 'billing',
    label: 'Billing',
    icon: CreditCard,
    requiredPrivilege: 'View Observations', 
  },
  {
    path: 'vitals',
    label: 'Vitals',
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
    label: 'Visits',
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
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const { privileges } = useSession(); 
  const baseUrl = `/dashboard/patients/${patientUuid}`;

  const hasRequiredPrivilege = (requiredPrivilege: string | undefined): boolean => {
    if (!requiredPrivilege) return true;
    return privileges.includes(requiredPrivilege);
  };

  const filteredNavigation = patientNavigationItems.filter(item => 
    hasRequiredPrivilege(item.requiredPrivilege)
  );

  // Improved active state detection
  const getIsActive = (itemPath: string, href: string) => {
    // For summary page (empty path)
    if (itemPath === '') {
      return pathname === baseUrl || pathname === `${baseUrl}/` || pathname === baseUrl;
    }
    
    // For sub-pages - match exactly or as subpath
    const normalizedPathname = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
    const normalizedHref = href.endsWith('/') ? href.slice(0, -1) : href;
    
    return normalizedPathname === normalizedHref || 
           normalizedPathname.startsWith(`${normalizedHref}/`);
  };

  return (
    <nav className="border-b border-gray-200 bg-white overflow-x-auto">
      <div className="flex items-center space-x-1 px-4 py-2 min-w-max">
        {filteredNavigation.map((item) => {
          const href = `${baseUrl}${item.path ? `/${item.path}` : ''}`;
          const isActive = getIsActive(item.path, href);

          return (
            <a key={item.path} href={href} className="block">
              <div
                className={`
                  flex items-center px-3 py-2 text-sm font-medium rounded-md transition duration-150 ease-in-out cursor-pointer
                  ${isActive 
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
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