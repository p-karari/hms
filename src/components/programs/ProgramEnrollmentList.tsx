'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangle, CheckCircle, TrendingUp, XCircle, Clock, ExternalLink, FolderOpen } from 'lucide-react';

// --- Import Necessary Actions and Types ---
import { getPatientProgramEnrollments, ProgramEnrollment, ProgramState } from '@/lib/programs/getPatientProgramEnrollments';
import { formatDate } from '@/lib/utils/utils'; // Reusing your utility function

interface ProgramEnrollmentListProps {
    patientUuid: string;
    refreshKey: number; // To force refresh after a new enrollment or status change
    onExitProgram: (enrollmentUuid: string) => void; // Handler to trigger the exit modal/form
    onChangeState: (enrollmentUuid: string) => void; // Handler to trigger the state change modal/form
}

/**
 * Displays the patient's program enrollment history and current status.
 */
export default function ProgramEnrollmentList({ 
    patientUuid, 
    refreshKey, 
    onExitProgram,
    onChangeState 
}: ProgramEnrollmentListProps) {
    
    const [enrollments, setEnrollments] = useState<ProgramEnrollment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // --- Data Fetching ---
    const fetchEnrollments = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getPatientProgramEnrollments(patientUuid);
            // Sort by active status, then by enrollment date
            data.sort((a, b) => {
                const isActiveA = a.dateCompleted === null ? 1 : 0;
                const isActiveB = b.dateCompleted === null ? 1 : 0;
                if (isActiveA !== isActiveB) return isActiveB - isActiveA; // Active first
                return new Date(b.dateEnrolled).getTime() - new Date(a.dateEnrolled).getTime(); // Newest first
            });
            setEnrollments(data);
        } catch (e) {
            console.error("Error fetching program enrollments:", e);
            setError("Failed to load patient program history. Check OpenMRS /programenrollment configuration.");
            setEnrollments([]);
        } finally {
            setIsLoading(false);
        }
    }, [patientUuid]);

    // Re-fetch data whenever the refreshKey changes
    useEffect(() => {
        fetchEnrollments();
    }, [fetchEnrollments, refreshKey]);

    // --- Utility Functions ---

    /** Determines the most recent state for a given enrollment. */
    const getCurrentState = (states: ProgramState[]): ProgramState | null => {
        if (!states || states.length === 0) return null;
        return states.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0];
    };
    
    /** Gets display styles based on program status. */
    const getStatusStyles = (enrollment: ProgramEnrollment) => {
        if (enrollment.dateCompleted) {
            return { icon: <XCircle className="w-4 h-4 mr-1 text-gray-500" />, textClass: 'bg-gray-100 text-gray-600 border-gray-300', statusText: 'Exited' };
        }
        
        const currentState = getCurrentState(enrollment.states);
        
        if (currentState) {
            // For active enrollment, use the state name
            return { icon: <CheckCircle className="w-4 h-4 mr-1 text-green-700" />, textClass: 'bg-green-100 text-green-800 border-green-300', statusText: currentState.state.display };
        }
        
        // Active but no specific state recorded
        return { icon: <TrendingUp className="w-4 h-4 mr-1 text-blue-700" />, textClass: 'bg-blue-100 text-blue-800 border-blue-300', statusText: 'Active' };
    };


    if (error) {
        return (
            <div className="text-center p-8 border border-red-300 bg-red-50 text-red-700 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 mr-3" />
                {error}
            </div>
        );
    }

    if (isLoading && enrollments.length === 0) {
        return (
            <div className="text-center p-12 text-blue-600">
                <Loader2 className="w-8 h-8 mx-auto animate-spin mb-3" />
                Loading program enrollments...
            </div>
        );
    }

    // --- Component JSX ---
    return (
        <div className="bg-white shadow-xl rounded-xl p-6">

            <div className="flex items-center text-xl font-bold text-gray-700 mb-4 border-b pb-2">
                <FolderOpen className="w-6 h-6 mr-2 text-purple-600" />
                Program Enrollment History ({enrollments.length})
            </div>

            {enrollments.length === 0 ? (
                <div className="text-center p-8 text-gray-500 border border-dashed rounded-lg">
                    No program enrollment records found for this patient.
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Program Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status / Current State</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enrolled Since</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exit Date</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {enrollments.map((enrollment) => {
                                const { icon, textClass, statusText } = getStatusStyles(enrollment);
                                const currentState = getCurrentState(enrollment.states);
                                const isActive = !enrollment.dateCompleted;

                                return (
                                    <tr key={enrollment.uuid} className={`hover:bg-purple-50 transition duration-100 ${!isActive ? 'opacity-70' : ''}`}>

                                        {/* Program Name */}
                                        <td className="px-6 py-4 text-sm font-bold text-purple-800">
                                            {enrollment.program.display}
                                        </td>

                                        {/* Status / Current State */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span 
                                                className={`inline-flex px-3 py-1 text-xs leading-5 rounded-full font-semibold border ${textClass}`}
                                            >
                                                {icon}
                                                {statusText}
                                            </span>
                                            {currentState && (
                                                <span className="block text-xs text-gray-500 mt-0.5">
                                                    Since: {formatDate(currentState.startDate)}
                                                </span>
                                            )}
                                        </td>

                                        {/* Enrolled Date */}
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                            <TrendingUp className="w-4 h-4 mr-1 inline-block text-gray-500" />
                                            {formatDate(enrollment.dateEnrolled)}
                                        </td>

                                        {/* Exit Date */}
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                            {enrollment.dateCompleted ? formatDate(enrollment.dateCompleted) : '—'}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                            {isActive && (
                                                <>
                                                    <button
                                                        onClick={() => onChangeState(enrollment.uuid)}
                                                        className="text-blue-500 hover:text-blue-700 disabled:opacity-50"
                                                        title="Change Program State"
                                                        disabled={isLoading}
                                                    >
                                                        <Clock className="w-5 h-5 inline" />
                                                    </button>
                                                    <button
                                                        onClick={() => onExitProgram(enrollment.uuid)}
                                                        className="text-red-500 hover:text-red-700 disabled:opacity-50"
                                                        title="Exit Program"
                                                        disabled={isLoading}
                                                    >
                                                        <XCircle className="w-5 h-5 inline" />
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
                                                title="View Details"
                                            >
                                                <ExternalLink className="w-5 h-5 inline ml-2" />
                                            </button>
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