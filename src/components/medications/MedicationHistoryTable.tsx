'use client';

import React, { useEffect, useState, useCallback } from 'react';
import RenewDiscontinueActions from './RenewDiscontinueActions'; // The component we just built
import { CheckCircle, XOctagon } from 'lucide-react'; // Icons
import { SessionContextType, SessionContext } from '@/lib/context/session-context';
import { DrugOrder, getPatientMedicationOrders } from '@/lib/medications/getPatientMedicationOrders';

interface MedicationHistoryTableProps {
    patientUuid: string;
}

/**
 * Main component to fetch and display the patient's comprehensive medication history.
 * It integrates action components for management.
 */
export default function MedicationHistoryTable({ patientUuid }: MedicationHistoryTableProps) {
    const sessionData = React.useContext<SessionContextType>(SessionContext);
    const [orders, setOrders] = useState<DrugOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // --- Data Fetching Function ---
    const fetchOrders = useCallback(async () => {
        if (!patientUuid || !sessionData.isAuthenticated) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const fetchedOrders = await getPatientMedicationOrders(patientUuid);
            setOrders(fetchedOrders || []);
        } catch (err: any) {
            console.error("Failed to fetch medication orders:", err);
            setError("Unable to load medication history. Check API status.");
        } finally {
            setIsLoading(false);
        }
    }, [patientUuid, sessionData.isAuthenticated]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);
    
    // --- Helper Function for Display ---
    const getStatusIcon = (order: DrugOrder) => {
        if (order.dateStopped) {
            return <XOctagon className="w-4 h-4 text-red-500 mr-2" />;
        }
        return <CheckCircle className="w-4 h-4 text-green-500 mr-2"/>;
    };

    // --- Loading and Error States ---
    if (isLoading) {
        return <div className="p-4 text-center text-gray-500">Loading medication history...</div>;
    }

    if (error) {
        return <div className="p-4 text-center text-red-600 border border-red-300 rounded-lg">{error}</div>;
    }

    if (orders.length === 0) {
        return <div className="p-6 text-center text-gray-500 border border-dashed rounded-lg">No active or historical medication orders found for this patient.</div>;
    }

    // --- Main Table Rendering ---
    return (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">Medication</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">Dose & Frequency</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Instructions / Quantity</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {orders.map((order) => (
                        <tr key={order.uuid} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {order.drug?.display || 'Drug Name Missing'}
                                <div className="text-xs text-gray-500">{order.drug?.strength}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <span className="font-semibold">{order.dose} {order.doseUnits.display}</span>
                                <span className="mx-1">•</span>
                                {order.frequency.display} ({order.route.display})
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                {order.instructions || `Dispense ${order.quantity} ${order.quantityUnits.display}`}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <div className="flex items-center">
                                    {getStatusIcon(order)}
                                    {order.dateStopped ? `Stopped (${new Date(order.dateStopped).toLocaleDateString()})` : 'Active'}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                {/* 🎯 INTEGRATING THE ACTION COMPONENT */}
                                <RenewDiscontinueActions
                                    order={order}
                                    sessionData={sessionData}
                                    onActionSuccess={fetchOrders} // Passes the function to refresh the table
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}