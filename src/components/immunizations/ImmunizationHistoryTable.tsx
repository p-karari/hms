'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangle, Syringe, CheckCircle, Clock } from 'lucide-react';

// --- Import Necessary Actions and Types ---
import { getPatientImmunizations, Immunization } from '@/lib/immunizations/getPatientImmunizations';
import { formatDate } from '@/lib/utils/utils'; // Reusing your utility function

interface ImmunizationHistoryTableProps {
    patientUuid: string;
    refreshKey: number; // To force refresh after a new immunization is documented
}

/**
 * Displays the patient's chronological history of administered vaccines.
 */
export default function ImmunizationHistoryTable({ patientUuid, refreshKey }: ImmunizationHistoryTableProps) {
    const [immunizations, setImmunizations] = useState<Immunization[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // --- Data Fetching ---
    const fetchImmunizations = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getPatientImmunizations(patientUuid);
            // Sort chronologically (most recent first)
            data.sort((a, b) => new Date(b.administrationDate).getTime() - new Date(a.administrationDate).getTime());
            setImmunizations(data);
        } catch (e) {
            console.error("Error fetching immunizations:", e);
            setError("Failed to load patient immunization history. Check OpenMRS encounter/obs configuration.");
            setImmunizations([]);
        } finally {
            setIsLoading(false);
        }
    }, [patientUuid]);

    // Re-fetch data whenever the refreshKey changes
    useEffect(() => {
        fetchImmunizations();
    }, [fetchImmunizations, refreshKey]);

    // --- Utility Functions for Display ---
    const getStatusStyles = () => {
        // Since we only track 'administered' here, the status is generally complete/given
        return { icon: <CheckCircle className="w-4 h-4 mr-1 text-green-700" />, textClass: 'bg-green-100 text-green-800' };
    };


    if (error) {
        return (
            <div className="text-center p-8 border border-red-300 bg-red-50 text-red-700 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 mr-3" />
                {error}
            </div>
        );
    }

    if (isLoading && immunizations.length === 0) {
        return (
            <div className="text-center p-12 text-blue-600">
                <Loader2 className="w-8 h-8 mx-auto animate-spin mb-3" />
                Loading immunization history...
            </div>
        );
    }

    // --- Component JSX ---
    return (
        <div className="bg-white shadow-xl rounded-xl p-6">

            <div className="flex items-center text-xl font-bold text-gray-700 mb-4 border-b pb-2">
                <Syringe className="w-6 h-6 mr-2 text-blue-600" />
                Administered Vaccines ({immunizations.length})
            </div>

            {immunizations.length === 0 ? (
                <div className="text-center p-8 text-gray-500 border border-dashed rounded-lg">
                    No immunization records found for this patient.
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vaccine</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Administered</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dose / Sequence</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recorded By</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {immunizations.map((imm) => {
                                const { icon, textClass } = getStatusStyles();
                                return (
                                    <tr key={imm.uuid} className="hover:bg-blue-50 transition duration-100">

                                        {/* Vaccine Name */}
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                            {imm.vaccineConcept.display}
                                        </td>

                                        {/* Administration Date */}
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                            <Clock className="w-4 h-4 mr-1 inline-block text-gray-500" />
                                            {formatDate(imm.administrationDate)}
                                        </td>

                                        {/* Dose Sequence */}
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                            {imm.doseSequence || 'Not Specified'}
                                        </td>

                                        {/* Provider */}
                                        <td className="px-6 py-4 text-sm text-gray-700">
                                            {imm.provider?.display || 'N/A'}
                                        </td>

                                        {/* Status */}
                                        <td className="px-6 py-4 text-center whitespace-nowrap">
                                            <span
                                                className={`inline-flex px-3 py-1 text-xs leading-5 rounded-full font-semibold ${textClass}`}
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