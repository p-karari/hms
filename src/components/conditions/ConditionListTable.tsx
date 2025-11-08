'use client';

import React, { useState, useEffect, useCallback, useMemo, JSX } from 'react';
import { Loader2, AlertTriangle, CheckCircle, Clock, XCircle, Edit } from 'lucide-react';

import { formatDate } from '@/lib/utils/utils';
import { Condition, getPatientConditions } from '@/lib/conditions/getpatientConditions';
import { updatePatientCondition } from '@/lib/conditions/updatePacientConditions';

interface ConditionListTableProps {
    patientUuid: string;
    refreshKey: number; 
    onStatusChange: () => void; 
}

export default function ConditionListTable({ patientUuid, refreshKey, onStatusChange }: ConditionListTableProps) {
    const [conditions, setConditions] = useState<Condition[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchConditions = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getPatientConditions(patientUuid);
            data.sort((a, b) => {
                const order = ['active', 'inactive', 'resolved'];
                return order.indexOf(a.clinicalStatus) - order.indexOf(b.clinicalStatus);
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

    useEffect(() => {
        fetchConditions();
    }, [fetchConditions, refreshKey]);

    const handleResolveCondition = async (conditionUuid: string) => {
        if (!confirm("Resolve this condition?")) return;
        setIsLoading(true);
        try {
            await updatePatientCondition({ conditionUuid, clinicalStatus: 'resolved' });
            onStatusChange();
            alert("Condition resolved.");
        } catch (e) {
            console.error(e);
            setError("Failed to update condition.");
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusStyles = (status: Condition['clinicalStatus']) => {
        switch (status) {
            case 'active': return { icon: <CheckCircle className="w-3.5 h-3.5 mr-1.5 text-green-600" />, textClass: 'bg-green-50 text-green-700 border-green-200' };
            case 'inactive': return { icon: <Clock className="w-3.5 h-3.5 mr-1.5 text-yellow-600" />, textClass: 'bg-yellow-50 text-yellow-700 border-yellow-200' };
            case 'resolved': return { icon: <XCircle className="w-3.5 h-3.5 mr-1.5 text-gray-500" />, textClass: 'bg-gray-50 text-gray-600 border-gray-200' };
            default: return { icon: <Edit className="w-3.5 h-3.5 mr-1.5 text-blue-600" />, textClass: 'bg-blue-50 text-blue-700 border-blue-200' };
        }
    };

    const activeConditions = useMemo(() => conditions.filter(c => c.clinicalStatus === 'active'), [conditions]);
    const resolvedConditions = useMemo(() => conditions.filter(c => c.clinicalStatus !== 'active'), [conditions]);

    if (error) return (
        <div className="text-center p-4 border border-red-200 bg-red-50 text-red-600 rounded-lg flex items-center justify-center text-sm">
            <AlertTriangle className="w-4 h-4 mr-2" /> {error}
        </div>
    );

    if (isLoading && conditions.length === 0) return (
        <div className="text-center p-6 text-gray-600">
            <Loader2 className="w-5 h-5 mx-auto animate-spin mb-2" />
            <div className="text-sm">Loading problem list...</div>
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-lg">
                <div className="p-3 border-b bg-red-50">
                    <h3 className="text-base font-semibold text-gray-900">Active Problems ({activeConditions.length})</h3>
                </div>
                {activeConditions.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                        No active conditions
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

            <div className="bg-white border border-gray-200 rounded-lg">
                <div className="p-3 border-b bg-gray-50">
                    <h3 className="text-base font-semibold text-gray-900">History / Resolved Problems ({resolvedConditions.length})</h3>
                </div>
                {resolvedConditions.length === 0 ? (
                    <div className="p-4 text-center text-gray-400 text-sm">
                        No resolved conditions
                    </div>
                ) : (
                    <ConditionTableBody 
                        conditions={resolvedConditions} 
                        getStatusStyles={getStatusStyles} 
                        handleResolveCondition={() => {}}
                        isDisabled={isLoading}
                        isActionable={false}
                    />
                )}
            </div>
        </div>
    );
}

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
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Diagnosis</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Onset Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Resolved Date</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {conditions.map(condition => {
                        const { icon, textClass } = getStatusStyles(condition.clinicalStatus);
                        return (
                            <tr key={condition.uuid} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-900 max-w-sm font-medium">{condition.code?.coding[0]?.display || 'N/A'}</td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded border ${textClass}`}>
                                        {icon} {condition.clinicalStatus}
                                    </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{condition.onsetDateTime ? formatDate(condition.onsetDateTime) : 'N/A'}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{condition.abatementDateTime ? formatDate(condition.abatementDateTime) : '—'}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-right">
                                    {isActionable && (
                                        <button onClick={() => handleResolveCondition(condition.uuid)}
                                            className="text-gray-400 hover:text-red-500 transition-colors"
                                            disabled={isDisabled}
                                            title="Mark as Resolved"
                                        >
                                            <XCircle className="w-4 h-4" />
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