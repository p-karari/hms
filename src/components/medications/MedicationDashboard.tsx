// pnjogu364@getMaxListeners.com - 

'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';

// --- Import all built components ---
import MedicationHistoryTable from '@/components/medications/MedicationHistoryTable';
import PrescribeNewModal from '@/components/medications/PrescribeNewModal';
import AllergyAlertBanner from './AllergyAlertBanner';
// import AllergyAlertBanner from '@/components/patient/AllergyAlertBanner';
// Assuming a shared patient context/data component exists for the patient's name/details

interface MedicationDashboardProps {
    patientUuid: string;
    // Assuming the allergy status is passed down from the parent page/layout
    hasKnownAllergies: boolean; 
}

/**
 * The main container component for the patient's medication management area.
 * It ties together the history table, the alert banner, and the prescription modal.
 */
export default function MedicationDashboard({ patientUuid, hasKnownAllergies }: MedicationDashboardProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    // This state is crucial for refreshing the table after a new order is submitted
    const [refreshKey, setRefreshKey] = useState(0); 

    // Function to trigger a refresh of the history table
    const handleOrderSuccess = () => {
        // Incrementing the key forces React to remount the MedicationHistoryTable, 
        // triggering a fresh data fetch via its useEffect hook.
        setRefreshKey(prevKey => prevKey + 1);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-extrabold text-gray-900 border-b pb-2">
                Medication Management
            </h1>
            
            {/* 1. Allergy Alert Banner */}
            {hasKnownAllergies && (
                <AllergyAlertBanner patientUuid={patientUuid} />
            )}

            {/* 2. Controls (Prescribe Button) */}
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-700">Current & Past Orders</h2>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg shadow-md hover:bg-blue-700 transition duration-150"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    New Prescription
                </button>
            </div>

            {/* 3. Medication History Table */}
            {/* The key forces a refresh when an order is renewed or submitted */}
            <MedicationHistoryTable 
                key={refreshKey} 
                patientUuid={patientUuid} 
            />

            {/* 4. Prescription Modal */}
            <PrescribeNewModal
                patientUuid={patientUuid}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onOrderSuccess={handleOrderSuccess} // 🎯 This links success to table refresh
            />
        </div>
    );
}