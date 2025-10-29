'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';

// --- Import all built components ---
import AllergyListTable from '@/components/allergies/AllergyListTable';
import NewAllergyModal from '@/components/allergies/NewAllergyModal';
import AllergyAlertBanner from '../medications/AllergyAlertBanner';

interface AllergiesDashboardProps {
    patientUuid: string;
    patientName: string;
    hasKnownAllergies: boolean; // Passed from Server Component
}

/**
 * The main container component for the patient's Allergies Management area.
 * It manages the display of the allergy list and the documentation workflow.
 */
export default function AllergiesDashboard({ 
    patientUuid, 

}: AllergiesDashboardProps) {
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    // State to force refresh the AllergyListTable after a new record is added
    const [refreshKey, setRefreshKey] = useState(0); 

    // Function to trigger a refresh of the history table
    const handleAllergyUpdate = () => {
        // Incrementing the key forces React to remount the AllergyListTable
        setRefreshKey(prevKey => prevKey + 1);
    };

    const handleRemoveAllergy = (allergyUuid: string) => {
        // NOTE: In a production system, this would call a Server Action
        // (e.g., updatePatientAllergy(uuid, 'RESOLVED'))
        if (confirm("Are you sure you want to RESOLVE this allergy record? This action cannot be easily undone.")) {
            alert(`Attempting to resolve allergy ${allergyUuid}... (Functionality to be implemented)`);
            // For now, we just refresh to demonstrate the flow
            handleAllergyUpdate(); 
        }
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-extrabold text-gray-900 border-b pb-2">
                Allergies & Adverse Drug Reactions (ADRs)
            </h1>
            
            {/* 1. Allergy Alert Banner (Always visible on this page) */}
            <AllergyAlertBanner patientUuid={patientUuid} />
            
            {/* 2. Controls (New Allergy Button) */}
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-700">Allergy Record</h2>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center px-4 py-2 bg-red-600 text-white font-medium rounded-lg shadow-md hover:bg-red-700 transition duration-150"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Document New Allergy
                </button>
            </div>

            {/* 3. Allergy History Table */}
            {/* The key forces a refresh when an allergy is documented or resolved */}
            <AllergyListTable 
                key={refreshKey} 
                patientUuid={patientUuid} 
                onRemoveAllergy={handleRemoveAllergy} 
            />

            {/* 4. New Allergy Modal */}
            <NewAllergyModal
                patientUuid={patientUuid}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onAllergySuccess={handleAllergyUpdate} // Refresh on success
            />
        </div>
    );
}