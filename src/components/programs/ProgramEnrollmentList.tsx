'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangle, CheckCircle, TrendingUp, XCircle, FolderOpen } from 'lucide-react';

import { getPatientProgramEnrollments, ProgramEnrollment, ProgramState } from '@/lib/programs/getPatientProgramEnrollments';
import { formatDate } from '@/lib/utils/utils';

interface ProgramEnrollmentListProps {
    patientUuid: string;
    refreshKey: number;
    onExitProgram: (enrollmentUuid: string) => void;
    onChangeState: (enrollmentUuid: string) => void;
}

export default function ProgramEnrollmentList({ 
    patientUuid, 
    refreshKey, 
    onExitProgram,
}: ProgramEnrollmentListProps) {
    
    const [enrollments, setEnrollments] = useState<ProgramEnrollment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchEnrollments = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getPatientProgramEnrollments(patientUuid);
            data.sort((a, b) => {
                const isActiveA = a.dateCompleted === null ? 1 : 0;
                const isActiveB = b.dateCompleted === null ? 1 : 0;
                if (isActiveA !== isActiveB) return isActiveB - isActiveA;
                return new Date(b.dateEnrolled).getTime() - new Date(a.dateEnrolled).getTime();
            });
            setEnrollments(data);
        } catch (e) {
            console.error("Error fetching program enrollments:", e);
            setError("Failed to load patient program history.");
            setEnrollments([]);
        } finally {
            setIsLoading(false);
        }
    }, [patientUuid]);

    useEffect(() => {
        fetchEnrollments();
    }, [fetchEnrollments, refreshKey]);

    const getCurrentState = (states: ProgramState[]): ProgramState | null => {
        if (!states || states.length === 0) return null;
        return states.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0];
    };
    
    const getStatusStyles = (enrollment: ProgramEnrollment) => {
        if (enrollment.dateCompleted) {
            return { icon: <XCircle className="w-3.5 h-3.5 mr-1.5 text-gray-500" />, textClass: 'bg-gray-50 text-gray-600', statusText: 'Exited' };
        }
        
        const currentState = getCurrentState(enrollment.states);
        
        if (currentState) {
            const stateDisplay = currentState.state.display || currentState.state.name || 'Active (Unknown State)';
            return { icon: <CheckCircle className="w-3.5 h-3.5 mr-1.5 text-green-600" />, textClass: 'bg-green-50 text-green-700', statusText: stateDisplay };
        }
        
        return { icon: <TrendingUp className="w-3.5 h-3.5 mr-1.5 text-blue-600" />, textClass: 'bg-blue-50 text-blue-700', statusText: 'Active' };
    };

    if (error) {
        return (
            <div className="text-center p-4 border border-red-200 bg-red-50 text-red-600 rounded-lg flex items-center justify-center text-sm">
                <AlertTriangle className="w-4 h-4 mr-2" />
                {error}
            </div>
        );
    }

    if (isLoading && enrollments.length === 0) {
        return (
            <div className="text-center p-6 text-gray-600">
                <Loader2 className="w-5 h-5 mx-auto animate-spin mb-2" />
                <div className="text-sm">Loading program enrollments...</div>
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center text-base font-semibold text-gray-900 mb-3">
                <FolderOpen className="w-4 h-4 mr-2 text-purple-600" />
                Program Enrollment History ({enrollments.length})
            </div>

            {enrollments.length === 0 ? (
                <div className="text-center p-4 text-gray-500 text-sm border border-dashed border-gray-300 rounded-lg">
                    No program enrollment records found for this patient.
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Program Name</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Enrolled</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Exit Date</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {enrollments.map((enrollment) => {
                                const { icon, textClass, statusText } = getStatusStyles(enrollment);
                                const currentState = getCurrentState(enrollment.states);
                                const isActive = !enrollment.dateCompleted;

                                return (
                                    <tr key={enrollment.uuid} className={`hover:bg-gray-50 ${!isActive ? 'opacity-70' : ''}`}>
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-medium text-gray-900">
                                                {enrollment.program.name || enrollment.program.display || enrollment.display}
                                            </div>
                                            {enrollment.program.description && (
                                                <div className="text-xs text-gray-500 mt-0.5">
                                                    {enrollment.program.description}
                                                </div>
                                            )}
                                        </td>

                                        <td className="px-4 py-3">
                                            <div className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${textClass}`}>
                                                {icon}
                                                {statusText}
                                            </div>
                                            {currentState && (
                                                <div className="text-xs text-gray-500 mt-0.5">
                                                    Since: {formatDate(currentState.startDate)}
                                                </div>
                                            )}
                                        </td>

                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                            <TrendingUp className="w-3.5 h-3.5 mr-1.5 inline-block text-gray-400" />
                                            {formatDate(enrollment.dateEnrolled)}
                                        </td>

                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                            {enrollment.dateCompleted ? formatDate(enrollment.dateCompleted) : '—'}
                                        </td>

                                        <td className="px-4 py-3 whitespace-nowrap text-right">
                                            {isActive && (
                                                <button
                                                    onClick={() => onExitProgram(enrollment.uuid)}
                                                    className="text-red-500 hover:text-red-700 disabled:opacity-50 text-sm"
                                                    title="Exit Program"
                                                    disabled={isLoading}
                                                >
                                                    <XCircle className="w-4 h-4 inline mr-1" />
                                                    Exit
                                                </button>
                                            )}
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