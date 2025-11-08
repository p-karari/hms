'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
    Loader2, AlertTriangle, Calendar, Clock, ChevronDown, ChevronUp, Users,
 Stethoscope, Package
} from 'lucide-react';

// --- Import Types and New Action Function ---
// Assuming this path points to the server action file we just created


// Assuming this utility function is available
import { formatDate } from '@/lib/utils/utils'; 
import { Encounter, getPatientVisitsWithEncounters, VisitWithEncounters } from '@/lib/visits/getVisitEncounters';

interface VisitHistoryTableProps {
    patientUuid: string;
}

/**
 * Displays the patient's chronological visit history, loading all visit and 
 * encounter summaries in a single efficient request.
 */
export default function VisitHistoryTable({ patientUuid }: VisitHistoryTableProps) {
    // State now holds the comprehensive VisitWithEncounters array
    const [visits, setVisits] = useState<VisitWithEncounters[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // State to manage the UUID of the currently expanded visit
    const [expandedVisitUuid, setExpandedVisitUuid] = useState<string | null>(null);

    // --- Data Fetching (Single, Comprehensive Request) ---
    const fetchVisitHistory = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Use the new, efficient action to get all visits and nested encounters
            const data = await getPatientVisitsWithEncounters(patientUuid);
            setVisits(data);
        } catch (e) {
            console.error("Error fetching visit history:", e);
            setError("Failed to load patient visit history. Please check the API configuration and network.");
            setVisits([]);
        } finally {
            setIsLoading(false);
        }
    }, [patientUuid]);

    useEffect(() => {
        fetchVisitHistory();
    }, [fetchVisitHistory]);

    // --- Visit Toggle (Local State Access Only) ---
    const handleVisitToggle = useCallback((visitUuid: string) => {
        if (expandedVisitUuid === visitUuid) {
            // Collapse
            setExpandedVisitUuid(null);
        } else {
            // Expand (data is already loaded, no API call needed here!)
            setExpandedVisitUuid(visitUuid);
        }
    }, [expandedVisitUuid]);
    
    // --- Helper for formatting time duration (unchanged) ---
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
        if (minutes > 0 && days === 0) result.push(`${minutes}m`); 
        
        return result.join(' ') || '< 1m';
    };

    // --- Render Logic (Loading, Error, Empty) ---
    if (error) {
        return (
            <div className="text-center p-8 border border-red-300 bg-red-50 text-red-700 rounded-xl flex items-center justify-center font-inter">
                <AlertTriangle className="w-6 h-6 mr-3" />
                {error}
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="text-center p-12 text-indigo-600 font-inter">
                <Loader2 className="w-8 h-8 mx-auto animate-spin mb-3" />
                Loading patient visit history...
            </div>
        );
    }
    
    if (visits.length === 0) {
        return (
            <div className="text-center p-12 text-gray-500 border border-dashed rounded-xl font-inter">
                No patient visit history found.
            </div>
        );
    }

    // --- Main Component JSX ---
    return (
        <div className="bg-white shadow-2xl rounded-xl overflow-hidden font-inter">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-indigo-600 text-white">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider"></th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Visit Type</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Location</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Start Time</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Duration</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {visits.map((visit) => (
                            <React.Fragment key={visit.uuid}>
                                {/* Visit Summary Row */}
                                <tr 
                                    className={`transition duration-150 cursor-pointer ${visit.uuid === expandedVisitUuid ? 'bg-indigo-50 border-l-4 border-indigo-500' : 'hover:bg-gray-50'}`}
                                    onClick={() => handleVisitToggle(visit.uuid)}
                                >
                                    {/* Expander Button */}
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <button className="text-indigo-600 hover:text-indigo-800 focus:outline-none">
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
                                            {/* Pass the encounters array directly from the visit object */}
                                            <VisitEncountersDetails 
                                                isLoading={false} 
                                                encounters={visit.encounters} 
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
    // We set isLoading to false when rendering from local state
    isLoading: boolean;
    // The encounters are pulled directly from the Visit object
    encounters: Encounter[] | null;
}

/**
 * Renders the detailed list of encounters and related data (Diagnoses, Orders) 
 * for an expanded visit, using the already-loaded nested data.
 */
function VisitEncountersDetails({ encounters }: VisitEncountersDetailsProps) {
    // Since we are using the custom V-query, we rely on the encounter array being present
    // and assume obs/orders/diagnoses arrays inside each encounter are empty (as per your custom query response)
    
    // In the custom query, we only have Encounter objects with basic metadata.
    // If we wanted OBS/Orders/Diagnoses summaries, we would need to switch to v=full 
    // for the main /visit call, which might be too slow.
    // For this implementation, we can only summarize the count of Encounters.
    
    const totalEncounters = encounters?.length || 0;
    
    if (totalEncounters === 0) {
        return (
            <div className="p-6 text-center bg-indigo-50 text-gray-600 border-t border-indigo-200">
                No clinical activities (encounters) recorded during this visit.
            </div>
        );
    }
    
    // --- Rendered Sections (Summaries are simplified based on limited custom query data) ---
    const renderSummarySection = (Icon: React.ElementType, title: string, content: React.ReactNode) => (
        <div className="py-2 border-b border-indigo-100 last:border-b-0">
            <h5 className="text-sm font-semibold text-indigo-700 flex items-center mb-1">
                <Icon className="w-4 h-4 mr-2" />
                {title}
            </h5>
            <div className="text-gray-700 text-sm pl-6">
                {content}
            </div>
        </div>
    );

    // --- Helper to render the encounter list itself ---
    const renderEncounterList = () => (
        <ul className="space-y-3 mt-3">
            {encounters?.map(enc => (
                <li key={enc.uuid} className="p-3 bg-white rounded-lg shadow-sm border border-indigo-100">
                    <div className="flex justify-between items-start">
                        <p className="text-sm font-medium text-gray-900 flex-1">
                            {enc.encounterType.display}
                        </p>
                        {/* We can check the display property for "Order" as a heuristic */}
                        <span className="text-xs font-semibold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full ml-4 whitespace-nowrap">
                            {enc.display?.includes("Order") ? 'Order Entry' : 'Data Entry'}
                        </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                        <Clock className="w-3 h-3 inline-block mr-1" /> 
                        {formatDate(enc.encounterDatetime)}
                        {/* Location is optional in the encounter API response */}
                        {enc.location && <span className="ml-3">| Location: {enc.location.display}</span>}
                        {enc.provider && <span className="ml-3">| Provider: {enc.provider.display}</span>}
                    </p>
                </li>
            ))}
        </ul>
    );

    
    return (
        <div className="p-6 bg-indigo-50 border-t border-indigo-200 space-y-4">
            <h4 className="text-lg font-bold text-indigo-800">
                Summary of Visit Activities
            </h4>

            {/* Diagnostics, Notes, and Meds sections are now placeholders
                because the custom query does not return the nested OBS/Orders/Diagnoses data. 
                We use the total encounter count for a high-level summary.
            */}
            {renderSummarySection(
                Stethoscope, 
                "Clinical Activities", 
                `${totalEncounters} forms/notes/orders recorded in total.`
            )}

            {renderSummarySection(
                Package, 
                "Medications & Orders", 
                "Detailed order information is not available in this view, see Encounters below."
            )}
            
            {/* Encounters List Section */}
            <div className="pt-2">
                 <h5 className="text-sm font-semibold text-indigo-700 flex items-center mb-2">
                    <Users className="w-4 h-4 mr-2" />
                    Encounters ({totalEncounters})
                </h5>
                {renderEncounterList()}
            </div>
        </div>
    );
}