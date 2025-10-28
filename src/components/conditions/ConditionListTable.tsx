'use client';

import React, { useState, useEffect, useCallback, useMemo, JSX } from 'react';
import { Loader2, AlertTriangle, CheckCircle, Clock, XCircle, Edit } from 'lucide-react';

// --- Import Necessary Actions and Types ---
import { updatePatientCondition } from '@/lib/conditions/submitPatientCondition';
import { formatDate } from '@/lib/utils/utils'; // Reusing your utility function
import { Condition, getPatientConditions } from '@/lib/conditions/getpatientConditions';

interface ConditionListTableProps {
    patientUuid: string;
    // Key used by the parent dashboard to force a refresh after creation or status change
    refreshKey: number; 
    onStatusChange: () => void; // Callback to notify parent of an update
}

/**
 * Displays the patient's problem list, categorized by clinical status.
 */
export default function ConditionListTable({ patientUuid, refreshKey, onStatusChange }: ConditionListTableProps) {
    const [conditions, setConditions] = useState<Condition[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // --- Data Fetching ---
    const fetchConditions = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getPatientConditions(patientUuid);
            // Sort by status priority: ACTIVE > INACTIVE > RESOLVED
            data.sort((a, b) => {
                const statusOrder = ['ACTIVE', 'INACTIVE', 'RESOLVED'];
                return statusOrder.indexOf(a.clinicalStatus) - statusOrder.indexOf(b.clinicalStatus);
            });
            setConditions(data);
        } catch (e) {
            console.error("Error fetching conditions:", e);
            setError("Failed to load patient condition history.");
            setConditions([]);
        } finally {
            setIsLoading(false);
        }
    }, [patientUuid]);

    // Re-fetch data whenever the refreshKey changes
    useEffect(() => {
        fetchConditions();
    }, [fetchConditions, refreshKey]);

    // --- Status Update Logic ---
    const handleResolveCondition = async (conditionUuid: string) => {
        if (!confirm("Are you sure you want to RESOLVE this condition? This will update its status to 'Resolved' with today's date.")) {
            return;
        }

        setIsLoading(true); // Disable buttons during update
        try {
            await updatePatientCondition({
                conditionUuid: conditionUuid,
                clinicalStatus: 'RESOLVED',
                // endDate will default to today if not provided, per the action file logic
            });
            onStatusChange(); // Notify parent to refresh data
            alert("Condition successfully resolved.");
        } catch (e) {
            console.error("Failed to resolve condition:", e);
            setError("Failed to update condition status.");
        } finally {
            setIsLoading(false);
        }
    };
    
    // --- Utility Functions for Display ---
    const getStatusStyles = (status: Condition['clinicalStatus']) => {
        switch (status) {
            case 'ACTIVE': return { icon: <CheckCircle className="w-4 h-4 mr-1 text-green-700" />, textClass: 'bg-green-100 text-green-800 border-green-300' };
            case 'INACTIVE': return { icon: <Clock className="w-4 h-4 mr-1 text-yellow-700" />, textClass: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
            case 'RESOLVED': return { icon: <XCircle className="w-4 h-4 mr-1 text-gray-500" />, textClass: 'bg-gray-100 text-gray-600 border-gray-300' };
            default: return { icon: <Edit className="w-4 h-4 mr-1 text-blue-700" />, textClass: 'bg-blue-100 text-blue-800 border-blue-300' };
        }
    };

    const activeConditions = useMemo(() => conditions.filter(c => c.clinicalStatus === 'ACTIVE'), [conditions]);
    const resolvedConditions = useMemo(() => conditions.filter(c => c.clinicalStatus !== 'ACTIVE'), [conditions]);


    if (error) {
        return (
            <div className="text-center p-8 border border-red-300 bg-red-50 text-red-700 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 mr-3" />
                {error}
            </div>
        );
    }

    if (isLoading && conditions.length === 0) {
        return (
            <div className="text-center p-12 text-blue-600">
                <Loader2 className="w-8 h-8 mx-auto animate-spin mb-3" />
                Loading problem list...
            </div>
        );
    }
    
    // --- Component JSX ---
    return (
        <div className="space-y-8">
            
            {/* --- Active Problems Section --- */}
            <div className="bg-white shadow-lg rounded-xl">
                <div className="p-4 border-b bg-red-50 rounded-t-xl">
                    <h3 className="text-xl font-bold text-red-700">Active Problems ({activeConditions.length})</h3>
                    <p className="text-sm text-red-600">These are the patient&apos;s current, ongoing health issues.</p>
                </div>
                
                {activeConditions.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 border-t border-dashed rounded-b-xl">
                        No **Active** conditions currently documented.
                    </div>
                ) : (
                    <ConditionTableBody 
                        conditions={activeConditions} 
                        getStatusStyles={getStatusStyles} 
                        handleResolveCondition={handleResolveCondition}
                        isDisabled={isLoading}
                        isActionable={true}
                    />
                )}
            </div>

            {/* --- Resolved/Inactive Problems Section --- */}
            <div className="bg-white shadow-lg rounded-xl">
                <div className="p-4 border-b bg-gray-50 rounded-t-xl">
                    <h3 className="text-xl font-bold text-gray-700">History / Resolved Problems ({resolvedConditions.length})</h3>
                    <p className="text-sm text-gray-500">Past problems or conditions currently in remission.</p>
                </div>
                
                {resolvedConditions.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 border-t border-dashed rounded-b-xl">
                        No resolved conditions documented.
                    </div>
                ) : (
                    <ConditionTableBody 
                        conditions={resolvedConditions} 
                        getStatusStyles={getStatusStyles} 
                        handleResolveCondition={() => {}} // No action on resolved items
                        isDisabled={isLoading}
                        isActionable={false}
                    />
                )}
            </div>
        </div>
    );
}


// --- Nested Component for Table Rendering ---

interface TableBodyProps {
    conditions: Condition[];
    getStatusStyles: (status: Condition['clinicalStatus']) => { icon: JSX.Element; textClass: string };
    handleResolveCondition: (uuid: string) => void;
    isDisabled: boolean;
    isActionable: boolean;
}

function ConditionTableBody({ conditions, getStatusStyles, handleResolveCondition, isDisabled, isActionable }: TableBodyProps) {
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-white">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Diagnosis</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">OnsetDate</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resolved</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {conditions.map((condition) => {
                        const { icon, textClass } = getStatusStyles(condition.clinicalStatus);
                        return (
                            <tr key={condition.uuid} className="hover:bg-gray-50 transition duration-100">
                                
                                {/* Diagnosis */}
                                <td className="px-6 py-4 text-sm font-medium text-gray-900 max-w-sm">
                                    {condition.condition.display}
                                    <span className="block text-xs text-gray-500 mt-0.5">
                                        Verification: {condition.verificationStatus}
                                    </span>
                                </td>
                                
                                {/* Status */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span 
                                        className={`inline-flex px-3 py-1 text-xs leading-5 rounded-full font-semibold border ${textClass}`}
                                    >
                                        {icon}
                                        {condition.clinicalStatus}
                                    </span>
                                </td>
                                
                                {/* Onset Date */}
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                    {condition.onsetDate ? formatDate(condition.onsetDate) : 'N/A'}
                                </td>
                                
                                {/* Resolved Date */}
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                    {condition.endDate ? formatDate(condition.endDate) : '—'}
                                </td>
                                
                                {/* Actions */}
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    {isActionable && (
                                        <button
                                            onClick={() => handleResolveCondition(condition.uuid)}
                                            className="text-red-500 hover:text-red-700 disabled:opacity-50"
                                            title="Mark as Resolved"
                                            disabled={isDisabled}
                                        >
                                            <XCircle className="w-5 h-5" />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}