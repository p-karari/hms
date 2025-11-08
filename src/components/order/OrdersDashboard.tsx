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
    // NOTE: In a real system, the active encounter UUID would be passed down 
    // from the parent page or fetched here via a dedicated Server Action.
    currentEncounterUuid: string; 
}

/**
 * The main container component for the patient's Non-Medication Clinical Orders area.
 * It manages the prescription workflow and displays the history table.
 */
export default function OrdersDashboard({ 
    patientUuid, 
    hasKnownAllergies, 
    currentEncounterUuid 
}: OrdersDashboardProps) {
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    // This state is crucial for refreshing the table after a new order is submitted or discontinued
    const [refreshKey, setRefreshKey] = useState(0); 

    // Function to trigger a refresh of the history table
    const handleOrderUpdate = () => {
        // Incrementing the key forces React to remount the OrderHistoryTable, 
        // triggering a fresh data fetch via its useEffect hook.
        setRefreshKey(prevKey => prevKey + 1);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-extrabold text-gray-900 border-b pb-2">
                Clinical Orders Management
            </h1>
            
            {/* 1. Allergy Alert Banner */}
            {hasKnownAllergies && (
                <AllergyAlertBanner patientUuid={patientUuid} />
            )}
            
            {/* 2. Controls (New Order Button) */}
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

            {/* 3. Order History Table */}
            {/* The key forces a refresh when an order is created or discontinued */}
            <OrderHistoryTable 
                key={refreshKey} 
                patientUuid={patientUuid} 
                currentEncounterUuid={currentEncounterUuid}
                onOrderDiscontinued={handleOrderUpdate} // Refresh on discontinue
            />

            {/* 4. New Order Modal */}
            <NewOrderModal
                patientUuid={patientUuid}
                // currentEncounterUuid={currentEncounterUuid}
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