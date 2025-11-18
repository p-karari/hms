'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import AllergyAlertBanner from '../medications/AllergyAlertBanner';
import NewOrderModal from './NewOrderModal';
import OrderHistoryTable from './OrderHistoryTable';

interface OrdersDashboardProps {
    patientUuid: string;
    patientName: string;
    hasKnownAllergies: boolean;
    currentEncounterUuid: string; 
}


export default function OrdersDashboard({ 
    patientUuid, 
    hasKnownAllergies, 
    currentEncounterUuid 
}: OrdersDashboardProps) {
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0); 

    const handleOrderUpdate = () => {

        setRefreshKey(prevKey => prevKey + 1);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-extrabold text-gray-900 border-b pb-2">
                Clinical Orders Management
            </h1>
            
            {hasKnownAllergies && (
                <AllergyAlertBanner patientUuid={patientUuid} />
            )}
            
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-700">Order History</h2>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg shadow-md hover:bg-indigo-700 transition duration-150"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Place New Order
                </button>
            </div>

            <OrderHistoryTable 
                key={refreshKey} 
                patientUuid={patientUuid} 
                currentEncounterUuid={currentEncounterUuid}
                onOrderDiscontinued={handleOrderUpdate} 
            />

            <NewOrderModal
                patientUuid={patientUuid}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onOrderSuccess={handleOrderUpdate}
            />

            {!currentEncounterUuid && (
                <div className="p-3 mt-4 text-sm font-medium text-red-800 rounded-lg bg-red-50">
                    ⚠️ **Error:** Cannot place new orders. No active encounter UUID provided.
                </div>
            )}
        </div>
    );
}