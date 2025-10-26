'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangle, XCircle, Clock, Search } from 'lucide-react';

// --- Import Necessary Actions and Types ---
import { getPatientClinicalOrders, ClinicalOrder } from '@/lib/order/getPatientClinicalOrders';
import { updateClinicalOrder } from '@/lib/order/updateClinicalOrder';
import { formatDate } from '@/lib/utils/utils';
// import { formatDate } from '@/lib/utils'; // Reusing your utility function

interface OrderHistoryTableProps {
    patientUuid: string;
    currentEncounterUuid: string; // Needed for update actions
    onOrderDiscontinued: () => void; // Callback to refresh the parent dashboard
}

/**
 * Displays the patient's non-medication clinical order history with filtering and actions.
 */
export default function OrderHistoryTable({ patientUuid, currentEncounterUuid, onOrderDiscontinued }: OrderHistoryTableProps) {
    const [orders, setOrders] = useState<ClinicalOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState<string | null>(null); // UUID of the order being updated

    // Filtering State
    const [filterType, setFilterType] = useState<'ALL' | 'ACTIVE' | 'DISCONTINUED'>('ACTIVE');
    const [searchTerm, setSearchTerm] = useState('');

    // --- Data Fetching ---
    const fetchOrders = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getPatientClinicalOrders(patientUuid);
            setOrders(data);
        } catch (e) {
            console.error("Error fetching clinical orders:", e);
            setError("Failed to load patient order history. Check server logs.");
            setOrders([]);
        } finally {
            setIsLoading(false);
        }
    }, [patientUuid]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);


    // --- Discontinue Action ---
    const handleDiscontinue = async (order: ClinicalOrder) => {
        if (!confirm(`Are you sure you want to discontinue the order for: ${order.concept.display}?`)) {
            return;
        }

        setIsUpdating(order.uuid);
        try {
            await updateClinicalOrder({
                patientUuid: patientUuid,
                existingOrderUuid: order.uuid, // Not strictly used by payload, but useful for context
                previousOrderUuid: order.uuid, // The UUID of the active order being discontinued
                conceptUuid: order.concept.uuid,
                orderType: order.type.toLowerCase() as any, // Map 'TestOrder' -> 'testorder'
                action: 'DISCONTINUE',
                encounterUuid: currentEncounterUuid,
                reasonText: "Discontinued by clinician via dashboard",
            });

            alert(`Order for ${order.concept.display} discontinued successfully.`);
            onOrderDiscontinued(); // Trigger refresh in parent
            fetchOrders(); // Local refresh
        } catch (e: any) {
            console.error("Discontinue failed:", e);
            alert(`Failed to discontinue order: ${e.message}`);
        } finally {
            setIsUpdating(null);
        }
    };

    // --- Filtering Logic ---
    const filteredOrders = orders
        .filter(order => {
            // Filter by Active/Discontinued status
            if (filterType === 'ACTIVE') return order.status === 'ACTIVE';
            if (filterType === 'DISCONTINUED') return order.status !== 'ACTIVE';
            return true; // ALL
        })
        .filter(order => 
            // Filter by search term
            order.concept.display.toLowerCase().includes(searchTerm.toLowerCase())
        );

    // --- Status Styling Utility ---
    const getStatusClass = (status: ClinicalOrder['status']) => {
        switch (status) {
            case 'ACTIVE': return 'bg-blue-100 text-blue-800';
            case 'COMPLETED': return 'bg-green-100 text-green-800';
            case 'DISCONTINUED': return 'bg-gray-100 text-gray-600';
            case 'DUE': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-200 text-gray-700';
        }
    };
    
    // --- Order Type Styling Utility ---
    const getTypeClass = (type: ClinicalOrder['type']) => {
        switch (type) {
            case 'TestOrder': return 'bg-indigo-50 text-indigo-700';
            case 'RadiologyOrder': return 'bg-purple-50 text-purple-700';
            case 'ProcedureOrder': return 'bg-pink-50 text-pink-700';
            default: return 'bg-gray-50 text-gray-600';
        }
    };

    if (error) {
        return (
            <div className="text-center p-8 border border-red-300 bg-red-50 text-red-700 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 mr-3" />
                {error}
            </div>
        );
    }

    // --- Component JSX ---
    return (
        <div className="bg-white shadow-xl rounded-xl p-6">
            
            {/* Filtering and Search Controls */}
            <div className="mb-4 flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-4 justify-between items-center">
                
                {/* Status Filter Buttons */}
                <div className="flex space-x-2 text-sm font-medium">
                    {(['ACTIVE', 'DISCONTINUED', 'ALL'] as const).map(type => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`px-3 py-1 rounded-full transition ${
                                filterType === type 
                                    ? 'bg-blue-600 text-white shadow-sm' 
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                            disabled={isLoading}
                        >
                            {type.charAt(0) + type.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>

                {/* Search Input */}
                <div className="relative w-full md:w-1/3">
                    <input
                        type="text"
                        placeholder="Search order concept..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2.5 pl-10 text-sm focus:ring-blue-500 focus:border-blue-500"
                        disabled={isLoading}
                    />
                    <Search className="absolute inset-y-0 left-0 ml-3 my-auto h-5 w-5 text-gray-400" />
                </div>
            </div>

            {isLoading ? (
                <div className="text-center p-12 text-blue-600">
                    <Loader2 className="w-8 h-8 mx-auto animate-spin mb-3" />
                    Loading clinical orders...
                </div>
            ) : (
                <>
                    {filteredOrders.length === 0 ? (
                        <div className="text-center p-12 text-gray-500 border border-dashed rounded-lg">
                            No {filterType !== 'ALL' ? filterType.toLowerCase() : ''} orders found.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orderer</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredOrders.map((order) => (
                                        <tr key={order.uuid} className="hover:bg-gray-50">
                                            
                                            {/* Date */}
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {formatDate(order.dateActivated)}
                                            </td>
                                            
                                            {/* Concept/Order Name */}
                                            <td className="px-4 py-4 text-sm text-gray-900 font-medium max-w-xs truncate">
                                                {order.concept.display}
                                            </td>
                                            
                                            {/* Order Type */}
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <span 
                                                    className={`inline-flex px-2 py-1 text-xs leading-5 font-semibold rounded-full ${getTypeClass(order.type)}`}
                                                >
                                                    {order.type.replace('Order', '')}
                                                </span>
                                            </td>
                                            
                                            {/* Orderer */}
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                                {order.orderer.person?.display}
                                            </td>
                                            
                                            {/* Status */}
                                            <td className="px-4 py-4 text-center whitespace-nowrap">
                                                <span 
                                                    className={`inline-flex px-3 py-1 text-xs leading-5 rounded-full font-semibold ${getStatusClass(order.status)}`}
                                                >
                                                    {order.status}
                                                </span>
                                            </td>
                                            
                                            {/* Actions */}
                                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                {order.status === 'ACTIVE' ? (
                                                    <button
                                                        onClick={() => handleDiscontinue(order)}
                                                        className="text-red-600 hover:text-red-900 ml-3 disabled:opacity-50 flex items-center float-right"
                                                        disabled={isUpdating === order.uuid}
                                                    >
                                                        {isUpdating === order.uuid ? (
                                                            <>
                                                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                                                Closing...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <XCircle className="w-4 h-4 mr-1" />
                                                                Discontinue
                                                            </>
                                                        )}
                                                    </button>
                                                ) : (
                                                    <span className="text-gray-400">
                                                        <Clock className="w-4 h-4 mr-1 inline-block" />
                                                        Closed
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}