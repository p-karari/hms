'use client';

import React from 'react';
// import { Plus } from 'lucide-react';

// --- Import all built components ---
import VisitHistoryTable from '@/components/visits/VisitHistoryTable';
import AllergyAlertBanner from '../medications/AllergyAlertBanner';
// import AllergyAlertBanner from '@/components/patient/AllergyAlertBanner';

interface VisitsDashboardProps {
    patientUuid: string;
    patientName: string;
    hasKnownAllergies: boolean;
    // NOTE: If your system supports creating a new visit from this page,
    // you would add a prop here to open a "New Visit Modal."
}

/**
 * The main container component for the patient's Visits History page.
 * It manages context and renders the chronological history table.
 */
export default function VisitsDashboard({ 
    patientUuid, 
    hasKnownAllergies 
}: VisitsDashboardProps) {
    
    // Placeholder for a "New Visit" modal state
    // const [isNewVisitModalOpen, setIsNewVisitModalOpen] = React.useState(false); 

    // const handleStartNewVisit = () => {
    //     // In a real application, this would open a modal 
    //     // that uses a Server Action to POST a new Visit to /visit.
    //     alert("Starting new visit functionality would be implemented here!");
    //     // setIsNewVisitModalOpen(true);
    // };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-extrabold text-gray-900 border-b pb-2">
                Patient Visits History
            </h1>
            
            {/* 1. Allergy Alert Banner */}
            {hasKnownAllergies && (
                <AllergyAlertBanner patientUuid={patientUuid} />
            )}
            
            {/* 2. Controls (Start New Visit Button) */}
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-700">Chronology of Care Encounters</h2>
                
                {/* Button to start a new patient visit */}
                {/* <button
                    onClick={handleStartNewVisit}
                    className="flex items-center px-4 py-2 bg-green-600 text-white font-medium rounded-lg shadow-md hover:bg-green-700 transition duration-150"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Start New Visit
                </button> */}
            </div>

            {/* 3. Visit History Table */}
            <VisitHistoryTable 
                patientUuid={patientUuid} 
            />

            {/* 4. Placeholder for New Visit Modal */}
            {/* {isNewVisitModalOpen && (
                <NewVisitModal 
                    patientUuid={patientUuid} 
                    onClose={() => setIsNewVisitModalOpen(false)}
                    onVisitStart={() => { 
                        // logic to refresh the table here 
                    }}
                />
            )} */}
        </div>
    );
}