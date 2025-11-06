// pnjogu364@getMaxListeners.com - 

'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';

// --- Import all built components ---
import MedicationHistoryTable from '@/components/medications/MedicationHistoryTable';
import PrescribeNewModal from '@/components/medications/PrescribeNewModal';
import AllergyAlertBanner from './AllergyAlertBanner';

interface MedicationDashboardProps {
    patientUuid: string;
    hasKnownAllergies: boolean; 
}

export default function MedicationDashboard({ patientUuid, hasKnownAllergies }: MedicationDashboardProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0); 

    const handleOrderSuccess = () => {
        setRefreshKey(prevKey => prevKey + 1);
    };

    return (
        <div className="space-y-4">
            <h1 className="text-lg font-semibold text-gray-900">
                Medication Management
            </h1>
            
            {/* 1. Allergy Alert Banner */}
            {hasKnownAllergies && (
                <AllergyAlertBanner patientUuid={patientUuid} />
            )}

            {/* 2. Controls (Prescribe Button) */}
            <div className="flex justify-between items-center">
                <h2 className="text-sm font-medium text-gray-700">Current & Past Orders</h2>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                    <Plus className="w-4 h-4 mr-1" />
                    New Prescription
                </button>
            </div>

            {/* 3. Medication History Table */}
            <MedicationHistoryTable 
                key={refreshKey} 
                patientUuid={patientUuid} 
            />

            {/* 4. Prescription Modal */}
            <PrescribeNewModal
                patientUuid={patientUuid}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onOrderSuccess={handleOrderSuccess}
            />
        </div>
    );
}