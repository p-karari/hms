'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangle, Calendar, Clock, ChevronDown, ChevronUp, Users } from 'lucide-react';

// --- Import Necessary Actions and Types ---
import { getPatientVisitHistory, Visit } from '@/lib/visits/getPatientVisitHistory';
import { getVisitEncounters, Encounter } from '@/lib/visits/getVisitEncounters';
import { formatDate } from '@/lib/utils/utils'; // Reusing your utility function

interface VisitHistoryTableProps {
    patientUuid: string;
}

/**
 * Displays the patient's chronological visit history, allowing expansion to view encounters.
 */
export default function VisitHistoryTable({ patientUuid }: VisitHistoryTableProps) {
    const [visits, setVisits] = useState<Visit[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // State to manage the UUID of the currently expanded visit
    const [expandedVisitUuid, setExpandedVisitUuid] = useState<string | null>(null);
    // State to cache the encounters for an expanded visit
    const [expandedEncounters, setExpandedEncounters] = useState<Encounter[] | null>(null);
    const [isLoadingEncounters, setIsLoadingEncounters] = useState(false);

    // --- Data Fetching (Visit History) ---
    const fetchVisitHistory = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getPatientVisitHistory(patientUuid);
            setVisits(data);
        } catch (e) {
            console.error("Error fetching visit history:", e);
            setError("Failed to load patient visit history.");
            setVisits([]);
        } finally {
            setIsLoading(false);
        }
    }, [patientUuid]);

    useEffect(() => {
        fetchVisitHistory();
    }, [fetchVisitHistory]);

    // --- Encounter Fetching (Drill-down) ---
    const handleVisitToggle = useCallback(async (visitUuid: string) => {
        if (expandedVisitUuid === visitUuid) {
            // Collapse the current expanded visit
            setExpandedVisitUuid(null);
            setExpandedEncounters(null);
            return;
        }

        // Expand new visit
        setExpandedVisitUuid(visitUuid);
        setExpandedEncounters(null);
        setIsLoadingEncounters(true);

        try {
            const encounters = await getVisitEncounters(visitUuid);
            setExpandedEncounters(encounters);
        } catch (e) {
            console.error("Error fetching visit encounters:", e);
            setExpandedEncounters([]);
        } finally {
            setIsLoadingEncounters(false);
        }
    }, [expandedVisitUuid]);
    
    // --- Helper for formatting time duration ---
    const formatDuration = (start: string, end: string | null) => {
        if (!end) return "Active";
        
        const startTime = new Date(start).getTime();
        const endTime = new Date(end).getTime();
        const diffMs = endTime - startTime;
        
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        const result = [];
        if (days > 0) result.push(`${days}d`);
        if (hours > 0) result.push(`${hours}h`);
        if (minutes > 0 && days === 0) result.push(`${minutes}m`); // Only show minutes if less than a day
        
        return result.join(' ') || '< 1m';
    };


    if (error) {
        return (
            <div className="text-center p-8 border border-red-300 bg-red-50 text-red-700 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 mr-3" />
                {error}
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="text-center p-12 text-blue-600">
                <Loader2 className="w-8 h-8 mx-auto animate-spin mb-3" />
                Loading patient visit history...
            </div>
        );
    }
    
    if (visits.length === 0) {
        return (
            <div className="text-center p-12 text-gray-500 border border-dashed rounded-lg">
                No patient visit history found.
            </div>
        );
    }

    // --- Component JSX ---
    return (
        <div className="bg-white shadow-xl rounded-xl">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visit Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Time</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {visits.map((visit) => (
                            <React.Fragment key={visit.uuid}>
                                {/* Visit Row */}
                                <tr 
                                    className={`hover:bg-gray-50 transition duration-150 cursor-pointer ${visit.uuid === expandedVisitUuid ? 'bg-indigo-50' : ''}`}
                                    onClick={() => handleVisitToggle(visit.uuid)}
                                >
                                    {/* Expander Button */}
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <button className="text-indigo-600 hover:text-indigo-900">
                                            {visit.uuid === expandedVisitUuid ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                        </button>
                                    </td>
                                    
                                    {/* Visit Type */}
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                        {visit.visitType.display}
                                    </td>
                                    
                                    {/* Location */}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {visit.location.display}
                                    </td>
                                    
                                    {/* Start Time */}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        <Calendar className="w-4 h-4 mr-1 inline-block text-gray-500" />
                                        {formatDate(visit.startDatetime)}
                                    </td>
                                    
                                    {/* Duration */}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {formatDuration(visit.startDatetime, visit.stopDatetime)}
                                    </td>
                                    
                                    {/* Status */}
                                    <td className="px-6 py-4 text-center whitespace-nowrap">
                                        <span 
                                            className={`inline-flex px-3 py-1 text-xs leading-5 rounded-full font-semibold ${visit.stopDatetime === null ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}
                                        >
                                            {visit.stopDatetime === null ? 'Active' : 'Closed'}
                                        </span>
                                    </td>
                                </tr>

                                {/* Encounters Detail Row (Collapsible) */}
                                {visit.uuid === expandedVisitUuid && (
                                    <tr>
                                        <td colSpan={6} className="p-0">
                                            <VisitEncountersDetails 
                                                isLoading={isLoadingEncounters} 
                                                encounters={expandedEncounters} 
                                            />
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// --- Nested Component for Encounter Details ---
interface VisitEncountersDetailsProps {
    isLoading: boolean;
    encounters: Encounter[] | null;
}

/**
 * Renders the detailed list of encounters for an expanded visit.
 */
function VisitEncountersDetails({ isLoading, encounters }: VisitEncountersDetailsProps) {
    if (isLoading) {
        return (
            <div className="p-8 text-center bg-indigo-50 text-indigo-700 border-t border-indigo-200">
                <Loader2 className="w-5 h-5 mx-auto animate-spin mb-2" />
                Loading visit details...
            </div>
        );
    }
    
    if (!encounters || encounters.length === 0) {
        return (
            <div className="p-6 text-center bg-indigo-50 text-gray-600 border-t border-indigo-200">
                No clinical activities (encounters) recorded during this visit.
            </div>
        );
    }

    return (
        <div className="p-6 bg-indigo-50 border-t border-indigo-200">
            <h4 className="text-md font-semibold text-indigo-800 mb-3 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Activities ({encounters.length})
            </h4>
            <ul className="space-y-3">
                {encounters.map(enc => (
                    <li key={enc.uuid} className="p-3 bg-white rounded-lg shadow-sm border border-indigo-100 flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-900">{enc.encounterType.display}</p>
                            <p className="text-xs text-gray-500">
                                <Clock className="w-3 h-3 inline-block mr-1" /> 
                                {formatDate(enc.encounterDatetime)}
                                {enc.provider && <span className="ml-3">| Provider: {enc.provider.display}</span>}
                            </p>
                            {/* You could add a quick summary of OBS/Orders here if needed */}
                        </div>
                        <span className="text-xs font-semibold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                            {enc.orders && enc.orders.length > 0 ? `${enc.orders.length} Order(s)` : 'Data Entry'}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}