'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangle, Syringe, CheckCircle, Clock } from 'lucide-react';
import { formatDate } from '@/lib/utils/utils';
import { getPatientImmunizations, Immunization } from '@/lib/immunizations/getPatientImmunizations';

interface ImmunizationHistoryTableProps {
    patientUuid: string;
    refreshKey: number;
}

export default function ImmunizationHistoryTable({ patientUuid, refreshKey }: ImmunizationHistoryTableProps) {
    const [immunizations, setImmunizations] = useState<Immunization[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchImmunizations = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getPatientImmunizations(patientUuid);
            data.sort((a, b) => new Date(b.administrationDate).getTime() - new Date(a.administrationDate).getTime());
            setImmunizations(data);
        } catch (e) {
            console.error("Error fetching immunizations:", e);
            setError("Failed to load patient immunization history. Check OpenMRS FHIR R4 Immunization configuration.");
            setImmunizations([]);
        } finally {
            setIsLoading(false);
        }
    }, [patientUuid]);

    useEffect(() => {
        if (patientUuid) {
            fetchImmunizations();
        }
    }, [fetchImmunizations, refreshKey, patientUuid]);

    const getStatusStyles = () => {
        return { icon: <CheckCircle className="w-3.5 h-3.5 mr-1.5 text-green-600" />, textClass: 'bg-green-50 text-green-700' };
    };

    if (error) {
        return (
            <div className="text-center p-4 border border-red-200 bg-red-50 text-red-600 rounded-lg flex items-center justify-center text-sm">
                <AlertTriangle className="w-4 h-4 mr-2" />
                {error}
            </div>
        );
    }

    if (isLoading && immunizations.length === 0) {
        return (
            <div className="text-center p-6 text-gray-600">
                <Loader2 className="w-5 h-5 mx-auto animate-spin mb-2" />
                <div className="text-sm">Loading immunization history...</div>
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center text-base font-semibold text-gray-900 mb-3">
                <Syringe className="w-4 h-4 mr-2 text-blue-600" />
                Administered Vaccines ({immunizations.length})
            </div>

            {immunizations.length === 0 ? (
                <div className="text-center p-4 text-gray-500 text-sm border border-dashed border-gray-300 rounded-lg">
                    No immunization records found for this patient.
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Vaccine</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Dose</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Recorded By</th>
                                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {immunizations.map((imm) => {
                                const { icon, textClass } = getStatusStyles();
                                return (
                                    <tr key={imm.uuid} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                                            {imm.vaccineConcept.display}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                            <Clock className="w-3.5 h-3.5 mr-1.5 inline-block text-gray-400" />
                                            {formatDate(imm.administrationDate)}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                            {imm.doseSequence !== null && imm.doseSequence !== undefined ? `Dose ${imm.doseSequence}` : 'Not Specified'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {imm.provider?.display || 'N/A'}
                                        </td>
                                        <td className="px-4 py-3 text-center whitespace-nowrap">
                                            <span
                                                className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${textClass}`}
                                            >
                                                {icon}
                                                Administered
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}