'use client';

import React, { useEffect, useState, useCallback } from 'react';
import RenewDiscontinueActions from './RenewDiscontinueActions';
import { CheckCircle, XOctagon } from 'lucide-react';
import { SessionContextType, SessionContext } from '@/lib/context/session-context';
import { DrugOrder, getPatientMedicationOrders } from '@/lib/medications/getPatientMedicationOrders';

interface MedicationHistoryTableProps {
    patientUuid: string;
}

export default function MedicationHistoryTable({ patientUuid }: MedicationHistoryTableProps) {
    const sessionData = React.useContext<SessionContextType>(SessionContext);
    const [orders, setOrders] = useState<DrugOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
            setError("Unable to load medication history.");
        } finally {
            setIsLoading(false);
        }
    }, [patientUuid, sessionData.isAuthenticated]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);
    
    const getStatusIcon = (order: DrugOrder) => {
        if (order.dateStopped) {
            return <XOctagon className="w-3 h-3 text-red-500 mr-1" />;
        }
        return <CheckCircle className="w-3 h-3 text-green-500 mr-1"/>;
    };

    if (isLoading) {
        return <div className="p-3 text-sm text-gray-500">Loading medications...</div>;
    }

    if (error) {
        return <div className="p-3 text-sm text-red-600 border border-red-200 rounded">{error}</div>;
    }

    if (orders.length === 0) {
        return <div className="p-4 text-sm text-gray-500 text-center border border-dashed rounded">No medication orders found.</div>;
    }

    return (
        <div className="border border-gray-200 rounded">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-3 py-2 text-left text-xs text-gray-500 uppercase w-1/4">Medication</th>
                        <th className="px-3 py-2 text-left text-xs text-gray-500 uppercase w-1/4">Dose & Frequency</th>
                        <th className="px-3 py-2 text-left text-xs text-gray-500 uppercase">Instructions</th>
                        <th className="px-3 py-2 text-left text-xs text-gray-500 uppercase">Status</th>
                        <th className="px-3 py-2 text-left text-xs text-gray-500 uppercase w-[10%]">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {orders.map((order) => (
                        <tr key={order.uuid} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-sm">
                                <div className="font-medium text-gray-900">{order.drug?.display || 'Drug Name Missing'}</div>
                                <div className="text-xs text-gray-500">{order.drug?.strength}</div>
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-600">
                                <span className="font-medium">{order.dose} {order.doseUnits.display}</span>
                                <span className="mx-1">•</span>
                                {order.frequency.display}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-600 max-w-xs">
                                {order.instructions || `Dispense ${order.quantity} ${order.quantityUnits.display}`}
                            </td>
                            <td className="px-3 py-2 text-sm">
                                <div className="flex items-center">
                                    {getStatusIcon(order)}
                                    {order.dateStopped ? `Stopped` : 'Active'}
                                </div>
                            </td>
                            <td className="px-3 py-2 text-sm">
                                <RenewDiscontinueActions
                                    order={order}
                                    sessionData={sessionData}
                                    onActionSuccess={fetchOrders}
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}