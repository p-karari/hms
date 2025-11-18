'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangle, XCircle, Clock, Search } from 'lucide-react';
import { getPatientClinicalOrders, ClinicalOrder } from '@/lib/order/getPatientClinicalOrders';
import { discontinueClinicalOrder } from '@/lib/order/updateClinicalOrder';
import { formatDate } from '@/lib/utils/utils';

interface OrderHistoryTableProps {
    patientUuid: string;
    currentEncounterUuid: string;
    onOrderDiscontinued: () => void;
}

export default function OrderHistoryTable({ patientUuid, onOrderDiscontinued }: OrderHistoryTableProps) {
    const [orders, setOrders] = useState<ClinicalOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState<string | null>(null);

    const [filterType, setFilterType] = useState<'ALL' | 'ACTIVE' | 'DISCONTINUED'>('ACTIVE');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchOrders = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getPatientClinicalOrders(patientUuid);
            setOrders(data);
        } catch (e) {
            console.error("Error fetching clinical orders:", e);
            setError("Failed to load patient order history.");
            setOrders([]);
        } finally {
            setIsLoading(false);
        }
    }, [patientUuid]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const handleDiscontinueOrder = async (order: any) => {
        if (!patientUuid || !order?.uuid || !order?.concept?.uuid) {
            alert("Cannot discontinue: Missing patient or order details.");
            return;
        }

        setIsUpdating(order.uuid);
        try {
            await discontinueClinicalOrder({
                patientUuid: patientUuid,
                orderUuid: order.uuid,
                conceptUuid: order.concept.uuid,
                orderType: order.type.toLowerCase() as 'testorder' | 'drugorder',
            });

            alert(`Order for ${order.concept.display} discontinued successfully.`);
            onOrderDiscontinued();
            fetchOrders();
        } catch (e: any) {
            console.error("Discontinue failed:", e);
            alert(`Failed to discontinue order: ${e.message}`);
        } finally {
            setIsUpdating(null);
        }
    };

    const filteredOrders = orders
        .filter(order => {
            if (filterType === 'ACTIVE') return order.status === 'ACTIVE';
            if (filterType === 'DISCONTINUED') return order.status !== 'ACTIVE';
            return true;
        })
        .filter(order => 
            order.concept.display.toLowerCase().includes(searchTerm.toLowerCase())
        );

    const getStatusClass = (status: ClinicalOrder['status']) => {
        switch (status) {
            case 'ACTIVE': return 'bg-blue-50 text-blue-700';
            case 'COMPLETED': return 'bg-green-50 text-green-700';
            case 'DISCONTINUED': return 'bg-gray-50 text-gray-600';
            case 'DUE': return 'bg-yellow-50 text-yellow-700';
            default: return 'bg-gray-100 text-gray-600';
        }
    };
    
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
            <div className="text-center p-4 border border-red-200 bg-red-50 text-red-600 rounded-lg flex items-center justify-center text-sm">
                <AlertTriangle className="w-4 h-4 mr-2" />
                {error}
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
            
            <div className="mb-4 flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-3 justify-between items-start md:items-center">
                
                <div className="flex space-x-1 text-sm">
                    {(['ACTIVE', 'DISCONTINUED', 'ALL'] as const).map(type => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                                filterType === type 
                                    ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                            }`}
                            disabled={isLoading}
                        >
                            {type.charAt(0) + type.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-1/3">
                    <input
                        type="text"
                        placeholder="Search orders..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full border border-gray-300 rounded-md p-2 pl-8 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        disabled={isLoading}
                    />
                    <Search className="absolute inset-y-0 left-0 ml-2 my-auto h-4 w-4 text-gray-400" />
                </div>
            </div>

            {isLoading ? (
                <div className="text-center p-6 text-gray-600">
                    <Loader2 className="w-5 h-5 mx-auto animate-spin mb-2" />
                    <div className="text-sm">Loading clinical orders...</div>
                </div>
            ) : (
                <>
                    {filteredOrders.length === 0 ? (
                        <div className="text-center p-6 text-gray-500 text-sm border border-dashed border-gray-300 rounded-lg">
                            No {filterType !== 'ALL' ? filterType.toLowerCase() : ''} orders found.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Order</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Orderer</th>
                                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredOrders.map((order) => (
                                        <tr key={order.uuid} className="hover:bg-gray-50">
                                            <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">
                                                {formatDate(order.dateActivated)}
                                            </td>
                                            <td className="px-3 py-3 text-sm text-gray-900 font-medium max-w-xs truncate">
                                                {order.concept.display}
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap">
                                                <span 
                                                    className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getTypeClass(order.type)}`}
                                                >
                                                    {order.type.replace('Order', '')}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">
                                                {order.orderer.person?.display}
                                            </td>
                                            <td className="px-3 py-3 text-center whitespace-nowrap">
                                                <span 
                                                    className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getStatusClass(order.status)}`}
                                                >
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap text-right text-sm">
                                                {order.status === 'ACTIVE' ? (
                                                    <button
                                                        onClick={() => handleDiscontinueOrder(order)}
                                                        className="text-red-600 hover:text-red-700 disabled:opacity-50 flex items-center justify-end w-full"
                                                        disabled={isUpdating === order.uuid}
                                                    >
                                                        {isUpdating === order.uuid ? (
                                                            <>
                                                                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                                                                Closing...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <XCircle className="w-3.5 h-3.5 mr-1" />
                                                                Discontinue
                                                            </>
                                                        )}
                                                    </button>
                                                ) : (
                                                    <span className="text-gray-400 flex items-center justify-end w-full">
                                                        <Clock className="w-3.5 h-3.5 mr-1" />
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