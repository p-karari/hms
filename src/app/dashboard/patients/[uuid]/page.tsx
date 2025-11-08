// uuid/page.tsx (PatientDashboardPage)

'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams, usePathname } from 'next/navigation';

import PatientDetails from '@/components/patients/PatientDetails'; 
import PatientEncounters from '@/components/patients/PatientEncounters';
import PatientVisits from '@/components/patients/PatientVisits';

// import { Activity, AlertCircle } from 'lucide-react';
import { getPatientActiveVisit } from '@/lib/visits/getActiveVisit';
import { Visit } from '@/lib/patients/manageVisits';
import { PatientDashboardProvider } from '@/components/context/patient-dashboard-context'; 

// 💡 NEW IMPORT: The component containing all the summary cards
import PatientCardSummaryView from '@/components/summary/PatientCardSummaryView';


// --- TYPE DEFINITIONS (Unchanged) ---
interface PatientContentProps {
  patientUuid: string;
  clinicalKey: string;
  onActionComplete: () => void;
  onActiveVisitChange?: (visit: Visit | null) => void; 
}

// --- Component Definitions ---

const PlaceholderView: React.FC<{ title: string }> = ({ title }) => (
  <div className="text-sm">
    <h2 className="font-medium text-gray-900 mb-3 pb-2 border-b border-gray-200">{title}</h2>
    <p className="text-gray-500 text-sm">Content for {title} will load here.</p>
  </div>
);

// 💡 UPDATE: The '/' path now points to PatientCardSummaryView.
const TabComponentMap: Record<string, React.FC<PatientContentProps>> = {
  '/': PatientCardSummaryView, // <<<< DEFAULT VIEW IS THE NEW SUMMARY CARD VIEW
  '/vitals': () => <PlaceholderView title="Vitals" />, 
  '/medications': () => <PlaceholderView title="Medications" />,
  '/results': () => <PlaceholderView title="Lab Results" />,
  '/orders': () => <PlaceholderView title="Orders" />,
  '/visits': PatientVisits,             
  '/allergies': () => <PlaceholderView title="Allergies" />,
  '/conditions': () => <PlaceholderView title="Conditions" />,
  '/immunizations': () => <PlaceholderView title="Immunizations" />,
  '/attachments': () => <PlaceholderView title="Attachments" />,
  '/programs': () => <PlaceholderView title="Programs" />,
  '/appointments': () => <PlaceholderView title="Appointments" />,
  '/encounters': PatientEncounters,
};

// -----------------------------------------------------------------------------------

const PatientDashboardPage: React.FC = () => {
  const params = useParams();
  const routerPathname = usePathname();
  const patientUuid = params.uuid as string;

  const [activeVisit, setActiveVisit] = useState<Visit | null>(null);
  const [dataVersion, setDataVersion] = useState(0); 
  const [isLoadingVisit, setIsLoadingVisit] = useState(true);

  // --- State Management and Handlers (Unchanged) ---
  useEffect(() => {
    const fetchActiveVisitStatus = async () => {
      setIsLoadingVisit(true);
      try {
        const visit = await getPatientActiveVisit(patientUuid);
        setActiveVisit(visit);
      } catch (error) {
        console.error("Failed to fetch active visit status:", error);
      } finally {
        setIsLoadingVisit(false);
      }
    };
    fetchActiveVisitStatus();
  }, [patientUuid, dataVersion]);

  const handleActionComplete = useCallback(() => {
    setDataVersion(prev => prev + 1);
  }, []);

  const handleActiveVisitChange = useCallback((visit: Visit | null) => {
    setActiveVisit(visit);
  }, []);
  // ---------------------------------------------------

  const clinicalKey = `${patientUuid}-clinical-${dataVersion}`;
  const patientBaseUrl = `/dashboard/patients/${patientUuid}`;
  
  const currentPathSegment = useMemo(() => {
    if (routerPathname === patientBaseUrl || routerPathname === `${patientBaseUrl}/`) {
      return '/';
    }
    const path = routerPathname.substring(patientBaseUrl.length).toLowerCase();
    const match = path.match(/^\/([^/]+)/);
    return match ? `/${match[1]}` : '/';
  }, [routerPathname, patientBaseUrl]);
  
  // 💡 UPDATE: Default to PatientCardSummaryView if the segment is not found
  const ActiveComponent = TabComponentMap[currentPathSegment] || PatientCardSummaryView;

  return (
    // FIX: Wrap the entire dynamic content AND PatientDetails in the Provider
    <PatientDashboardProvider 
      activeVisit={activeVisit} 
      onActionComplete={handleActionComplete}
    >
      <div className="space-y-6"> {/* This content is the {children} in the layout */}
        
        {/* 1. Patient Details: Rendered here to ensure it has context and is functional */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <PatientDetails 
            patientUuid={patientUuid}
            activeVisit={activeVisit} // Pass state directly for immediate availability
            onActionComplete={handleActionComplete} // Pass handler
          />
        </div>

        {/* 2. Active Visit Banner (Relies on state) */}
        {isLoadingVisit ? (
            <div className="p-3 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-600 animate-pulse">
                Checking active visit status...
            </div>
        ) : activeVisit ? (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <div className="text-sm">
              <span className="font-medium text-green-900">Active Visit: </span>
              <span className="text-green-700">
                {activeVisit.visitType.display} • {new Date(activeVisit.startDatetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ) : (
             <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                No active visit. Start a new one to begin clinical actions.
            </div>
        )}
        
        {/* 3. Dynamic Content */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <ActiveComponent 
            patientUuid={patientUuid} 
            clinicalKey={clinicalKey}
            onActionComplete={handleActionComplete} 
            onActiveVisitChange={
              currentPathSegment === '/' || currentPathSegment === '/visits' 
              ? handleActiveVisitChange 
              : undefined
            }
          />
        </div>
      </div>
    </PatientDashboardProvider>
  );
};

export default PatientDashboardPage;