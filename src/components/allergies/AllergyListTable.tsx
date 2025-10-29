'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangle, Pill, Apple, Leaf, AlertCircle, XCircle } from 'lucide-react';

// --- Import Necessary Actions and Types ---
import { getPatientAllergies, Allergy } from '@/lib/allergies/getPatientAllergies';
import { formatDate } from '@/lib/utils/utils'; // Reusing your utility function

interface AllergyListTableProps {
    patientUuid: string;
    // Callback to trigger a refresh of the parent dashboard if actions were implemented
    onRemoveAllergy?: (allergyUuid: string) => void; 
}

/**
 * Displays the patient's current list of documented allergies and ADRs.
 */
export default function AllergyListTable({ patientUuid, onRemoveAllergy }: AllergyListTableProps) {
    const [allergies, setAllergies] = useState<Allergy[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Filtering State
    const [filterType, setFilterType] = useState<'ALL' | 'DRUG' | 'FOOD' | 'ENVIRONMENTAL'>('ALL');

    // --- Data Fetching ---
    const fetchAllergies = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getPatientAllergies(patientUuid);
            setAllergies(data);
        } catch (e) {
            console.error("Error fetching allergies:", e);
            setError("Failed to load patient allergy history.");
            setAllergies([]);
        } finally {
            setIsLoading(false);
        }
    }, [patientUuid]);

    useEffect(() => {
        fetchAllergies();
    }, [fetchAllergies]);

    // --- Filtering Logic ---
    const filteredAllergies = allergies
        .filter(allergy => {
            if (filterType === 'ALL') return true;
            return allergy.allergyType === filterType;
        });

    // --- Utility Functions for Styling/Icons ---
    const getSeverityClass = (severity: Allergy['severity']) => {
        switch (severity) {
            case 'HIGH': return 'bg-red-200 text-red-900 border-red-500';
            case 'MODERATE': return 'bg-yellow-200 text-yellow-900 border-yellow-500';
            case 'LOW': return 'bg-green-200 text-green-900 border-green-500';
            default: return 'bg-gray-200 text-gray-700';
        }
    };
    
    const getTypeIcon = (type: Allergy['allergyType']) => {
        switch (type) {
            case 'DRUG': return <Pill className="w-4 h-4 mr-1 inline" />;
            case 'FOOD': return <Apple className="w-4 h-4 mr-1 inline" />;
            case 'ENVIRONMENTAL': return <Leaf className="w-4 h-4 mr-1 inline" />;
            default: return <AlertCircle className="w-4 h-4 mr-1 inline" />;
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
            
            <h3 className="text-xl font-bold text-red-700 mb-4 flex items-center">
                <AlertTriangle className="w-6 h-6 mr-2" /> Documented Allergies / ADRs
            </h3>

            {/* Filtering Controls */}
            <div className="mb-6 flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-4 justify-start items-center">
                <span className="text-sm font-medium text-gray-700">Filter by Type:</span>
                {(['ALL', 'DRUG', 'FOOD', 'ENVIRONMENTAL'] as const).map(type => (
                    <button
                        key={type}
                        onClick={() => setFilterType(type)}
                        className={`px-3 py-1 text-sm rounded-full transition ${
                            filterType === type 
                                ? 'bg-red-600 text-white shadow-sm' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        disabled={isLoading}
                    >
                        {type.charAt(0) + type.slice(1).toLowerCase()}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div className="text-center p-12 text-red-600">
                    <Loader2 className="w-8 h-8 mx-auto animate-spin mb-3" />
                    Loading allergy records...
                </div>
            ) : (
                <>
                    {allergies.length === 0 ? (
                        <div className="text-center p-8 text-green-700 border border-dashed rounded-lg bg-green-50">
                            ✅ No known allergies or adverse reactions documented.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Allergen / Substance</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reactions</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Onset Date</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredAllergies.map((allergy) => (
                                        <tr key={allergy.uuid} className="hover:bg-red-50">
                                            
                                            {/* Allergen */}
                                            <td className="px-4 py-4 text-sm text-gray-900 font-semibold max-w-sm truncate">
                                                {allergy.allergen.display}
                                            </td>
                                            
                                            {/* Type */}
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                                {getTypeIcon(allergy.allergyType)}
                                                {allergy.allergyType}
                                            </td>
                                            
                                            {/* Severity */}
                                            <td className="px-4 py-4 text-center whitespace-nowrap">
                                                <span 
                                                    className={`inline-flex px-3 py-1 text-xs leading-5 rounded-full font-bold uppercase border ${getSeverityClass(allergy.severity)}`}
                                                >
                                                    {allergy.severity}
                                                </span>
                                            </td>
                                            
                                            {/* Reactions */}
                                            <td className="px-4 py-4 text-sm text-gray-700">
                                                {allergy.reaction.map(r => r.display).join(', ')}
                                            </td>
                                            
                                            {/* Onset Date */}
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                                {allergy.onsetDate ? formatDate(allergy.onsetDate) : 'Unknown'}
                                            </td>
                                            
                                            {/* Actions (Resolve/Remove) */}
                                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                {/* In a real system, clicking this would trigger an API call to VOID or RESOLVE the allergy */}
                                                <button
                                                    onClick={() => onRemoveAllergy && onRemoveAllergy(allergy.uuid)}
                                                    className="text-gray-400 hover:text-red-600 disabled:opacity-50"
                                                    title="Resolve / Remove Allergy"
                                                >
                                                    <XCircle className="w-5 h-5" />
                                                </button>
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