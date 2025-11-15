'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import AllergyListTable from '@/components/allergies/AllergyListTable';
import NewAllergyModal from '@/components/allergies/NewAllergyModal';
import AllergyAlertBanner from '../medications/AllergyAlertBanner';

interface AllergiesDashboardProps {
    patientUuid: string;
    patientName: string;
    hasKnownAllergies: boolean; 
}


export default function AllergiesDashboard({ 
    patientUuid, 

}: AllergiesDashboardProps) {
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0); 

    const handleAllergyUpdate = () => {
        setRefreshKey(prevKey => prevKey + 1);
    };

    const handleRemoveAllergy = (allergyUuid: string) => {
        if (confirm("Are you sure you want to RESOLVE this allergy record? This action cannot be easily undone.")) {
            alert(`Attempting to resolve allergy ${allergyUuid}... (Functionality to be implemented)`);
            handleAllergyUpdate(); 
        }
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-extrabold text-gray-900 border-b pb-2">
                Allergies & Adverse Drug Reactions (ADRs)
            </h1>
            
            <AllergyAlertBanner patientUuid={patientUuid} />
            
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

            <AllergyListTable 
                key={refreshKey} 
                patientUuid={patientUuid} 
                onRemoveAllergy={handleRemoveAllergy} 
            />

            <NewAllergyModal
                patientUuid={patientUuid}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onAllergySuccess={handleAllergyUpdate} 
            />
        </div>
    );
}