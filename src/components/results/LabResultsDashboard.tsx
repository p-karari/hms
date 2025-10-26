'use client';

import React from 'react';
import { AlertTriangle, TrendingUp } from 'lucide-react';

// --- Import Necessary Components ---
import LabResultsTable from '@/components/results/LabResultsTable';
import AllergyAlertBanner from '../medications/AllergyAlertBanner';
// Assuming a component or utility exists for fetching and displaying general patient data (like allergies)
// import AllergyAlertBanner from '@/components/patient/AllergyAlertBanner'; 

interface LabResultsDashboardProps {
    patientUuid: string;
    // patientName: string;
    hasKnownAllergies: boolean; 
}

/**
 * The main container component for the patient's Lab Results viewing area.
 * It ties together alerts, navigation, and the primary data table.
 */
export default function LabResultsDashboard({ patientUuid, hasKnownAllergies }: LabResultsDashboardProps) {
    // State could be used here to control a "Detailed Chart View" modal if implemented.
    // const [isChartViewOpen, setIsChartViewOpen] = useState(false); 

    // NOTE: In a full production application, you would implement a system 
    // to check for critical lab results and display a dedicated alert here.
    const hasCriticalResults = false; // Placeholder logic

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-extrabold text-gray-900 border-b pb-2">
                Lab Results History
            </h1>
            
            {/* 1. Alerts Section (Priority Alerts) */}
            {hasKnownAllergies && (
                <AllergyAlertBanner patientUuid={patientUuid} />
            )}

            {/* Placeholder for Critical Lab Result Alert */}
            {hasCriticalResults && (
                 <div className="flex items-center p-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
                    <AlertTriangle className="w-5 h-5 mr-3" />
                    <span className="font-bold">CRITICAL ALERT:</span> Review recent Hemoglobin results (7.2 g/dL).
                </div>
            )}


            {/* 2. Controls and Table Header */}
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-700">All Diagnostic Observations</h2>
                
                {/* Example of a future feature button */}
                <button
                    // onClick={() => setIsChartViewOpen(true)}
                    className="flex items-center px-4 py-2 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition duration-150 disabled:opacity-50"
                    disabled={true} // Disabled until chart functionality is implemented
                >
                    <TrendingUp className="w-5 h-5 mr-2" />
                    View Trend Charts
                </button>
            </div>

            {/* 3. Lab Results Table */}
            <LabResultsTable 
                patientUuid={patientUuid} 
            />

            {/* Future: Chart View Modal controlled by isChartViewOpen state */}
        </div>
    );
}