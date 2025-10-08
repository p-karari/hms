'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useParams, usePathname } from 'next/navigation';
import PatientActions from '@/components/patients/PatientActions';
import PatientDetails from '@/components/patients/PatientDetails';
import PatientEncounters from '@/components/patients/PatientEncounters';
import PatientObservations from '@/components/patients/PatientObservations';
import PatientVisits from '@/components/patients/PatientVisits';
import PatientSubNav from '@/components/patients/PatientSubNav'; // The persistent sub-nav component
import { Visit } from '@/lib/patients/manageVisits';

// --- Placeholder Component Definitions (Replace with your actual components) ---
// These interfaces and placeholders are necessary to make the dynamic mapping work.

interface PatientContentProps {
  patientUuid: string;
  clinicalKey: string;
  onActiveVisitChange?: (visit: Visit | null) => void;
}

// 1. Patient Summary: The default view, showing combined high-level data.
const PatientSummaryView: React.FC<PatientContentProps> = ({ patientUuid, clinicalKey }) => (
    <div className="space-y-8">
        <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">Patient Summary Overview</h2>
        <p className="text-gray-600 italic">This is the default view. It combines key data elements below.</p>
        
        {/* We reuse the Vitals component here for the summary view */}
        <PatientObservations 
            key={`${clinicalKey}-obs-summary`}
            patientUuid={patientUuid} 
        />
        <div className="p-4 bg-red-50 rounded-lg">
            <h3 className="font-semibold text-red-800">Active Conditions</h3>
            <p className="text-sm">List of active conditions goes here.</p>
        </div>
    </div>
);

// 2. Placeholder for Meds, Orders, Allergies, etc.
const PlaceholderView: React.FC<{ title: string }> = ({ title }) => (
    <div className="p-8 bg-gray-50 rounded-lg shadow-md border-t-4 border-indigo-500">
        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
        <p className="text-gray-500 mt-2">The dedicated content for the **{title}** section will load here.</p>
    </div>
);

// --- Content Component Mapping ---
// Map the final URL segment to the component responsible for that content view.
const TabComponentMap: Record<string, React.FC<PatientContentProps>> = {
  // Key '/' handles the index path: /dashboard/patients/[uuid]
  '/': PatientSummaryView, 
  // Map specific sub-paths to the relevant component
  '/vitals': PatientObservations,       
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
  // If the URL is something else, Encounters might be a good fallback
  '/encounters': PatientEncounters,
};

// --- Main Shell Component ---

const PatientDashboardShell: React.FC = () => {
  const params = useParams();
  const routerPathname = usePathname();
  const patientUuid = params.uuid as string;

  // 1. State for Active Visit Management
  const [activeVisit, setActiveVisit] = useState<Visit | null>(null);
  
  // 2. State/Callback to trigger data reloads across components
  const [dataVersion, setDataVersion] = useState(0); 

  const handleActionComplete = useCallback(() => {
    setDataVersion(prev => prev + 1);
  }, []);

  const handleActiveVisitChange = useCallback((visit: Visit | null) => {
    setActiveVisit(visit);
  }, []);

  const clinicalKey = `${patientUuid}-clinical-${dataVersion}`;

  // --- Dynamic Tab Content Logic (The core of layout persistence) ---
  
  // 1. Define the patient's base URL (e.g., /dashboard/patients/123-abc)
  const patientBaseUrl = `/dashboard/patients/${patientUuid}`;
  
  // 2. Determine the path segment that controls the component to render.
  const currentPathSegment = useMemo(() => {
    // 🎯 If the pathname is exactly the base URL, use the index key '/'
    if (routerPathname === patientBaseUrl || routerPathname === `${patientBaseUrl}/`) {
      return '/';
    }
    
    // 🎯 Otherwise, strip the base URL and find the first segment.
    const path = routerPathname.substring(patientBaseUrl.length).toLowerCase();
    // Use regex to capture the segment after the first slash (e.g., /vitals from /vitals/history)
    const match = path.match(/^\/([^/]+)/);
    
    return match ? `/${match[1]}` : '/'; // Fallback to summary if no clear segment is found
    
  }, [routerPathname, patientBaseUrl]);
  
  // 3. Select the component from the map.
  const ActiveComponent = TabComponentMap[currentPathSegment] || PatientSummaryView;

  // --- Render Layout ---
  return (
    // This top-level component acts as the PERSISTENT SHELL. ---- mx-auto p-6 space-y-8 -- bg-gray-50
    <div className="container  min-h-screen ">

      {/* 1. Patient Sub-Navigation Tabs (PERSISTS) */}
      {/* This component allows navigation to nested content routes. */}
      <PatientSubNav patientUuid={patientUuid} />
      
      {/* 2. Patient Details Banner (PERSISTS) */}
      <PatientDetails patientUuid={patientUuid} />
      


      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Column 1: Actions (PERSISTS) */}
        <div className="lg:col-span-1">
          <PatientActions 
            patientUuid={patientUuid}
            activeVisit={activeVisit} 
            onActionComplete={handleActionComplete} 
          />
        </div>

        {/* Column 2: Dynamic Core Clinical Data (DYNAMIC CONTENT AREA) */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Active Visit Banner (PERSISTS) */}
          {activeVisit && (
            <div className="p-4 bg-green-100 border-l-4 border-green-500 text-green-700 rounded-md shadow-sm">
                <p className="font-bold">Current Active Visit:</p>
                <p className="text-sm">
                    {activeVisit.visitType.display} started at {new Date(activeVisit.startDatetime).toLocaleTimeString()}
                </p>
            </div>
          )}
          
          {/* 🎯 ActiveComponent renders the content for the current tab only */}
          <ActiveComponent 
            patientUuid={patientUuid} 
            clinicalKey={clinicalKey} 
            // Pass visit change handler only to components that manage visit state (Summary or Visits tab)
            onActiveVisitChange={
                currentPathSegment === '/' || currentPathSegment === '/visits' 
                ? handleActiveVisitChange 
                : undefined
            }
          />
          
        </div>
      </div>
    </div>
  );
};

export default PatientDashboardShell;
