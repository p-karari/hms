'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, AlertTriangle, Calendar, Clock, MapPin, User, XCircle, CheckCircle } from 'lucide-react';

// --- Import Necessary Actions and Types ---
import { getPatientAppointments, Appointment } from '@/lib/appointments/getPatientAppointments';
import { formatDate } from '@/lib/utils/utils'; // Reusing your utility function

interface AppointmentListProps {
    patientUuid: string;
    refreshKey: number; // To force refresh after a new appointment is booked or status changes
}

/**
 * Displays the patient's schedule, categorized into Upcoming and Past appointments.
 */
export default function AppointmentList({ patientUuid, refreshKey }: AppointmentListProps) {
    const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // --- Data Fetching ---
    const fetchAppointments = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getPatientAppointments(patientUuid);
            // Sort chronologically (oldest first)
            data.sort((a, b) => new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime());
            setAllAppointments(data);
        } catch (e) {
            console.error("Error fetching appointments:", e);
            setError("Failed to load patient appointment schedule. Check OpenMRS Appointment Scheduling module configuration.");
            setAllAppointments([]);
        } finally {
            setIsLoading(false);
        }
    }, [patientUuid]);

    // Re-fetch data whenever the refreshKey changes
    useEffect(() => {
        fetchAppointments();
    }, [fetchAppointments, refreshKey]);
    
    // --- Categorization Logic ---
    const { upcomingAppointments, pastAppointments } = useMemo(() => {
        const now = new Date();
        const upcoming: Appointment[] = [];
        const past: Appointment[] = [];

        for (const appt of allAppointments) {
            if (new Date(appt.startDatetime) >= now) {
                upcoming.push(appt);
            } else {
                past.push(appt);
            }
        }
        
        // Reverse past list to show most recent first
        past.reverse(); 

        return { upcomingAppointments: upcoming, pastAppointments: past };
    }, [allAppointments]);

    // --- Utility Functions for Display ---
    const getStatusStyles = (status: string) => {
        switch (status.toUpperCase()) {
            case 'SCHEDULED':
                return { icon: <Clock className="w-4 h-4 mr-1 text-blue-700" />, textClass: 'bg-blue-100 text-blue-800 border-blue-300', text: 'Scheduled' };
            case 'COMPLETED':
                return { icon: <CheckCircle className="w-4 h-4 mr-1 text-green-700" />, textClass: 'bg-green-100 text-green-800 border-green-300', text: 'Completed' };
            case 'CANCELLED':
            case 'MISSED':
                return { icon: <XCircle className="w-4 h-4 mr-1 text-red-700" />, textClass: 'bg-red-100 text-red-800 border-red-300', text: status.charAt(0) + status.slice(1).toLowerCase() };
            default:
                return { icon: <Calendar className="w-4 h-4 mr-1 text-gray-700" />, textClass: 'bg-gray-100 text-gray-800 border-gray-300', text: status };
        }
    };
    
    const renderAppointmentSection = (title: string, appointments: Appointment[]) => (
        <div className="mt-8">
            <h3 className="text-xl font-semibold text-gray-700 border-b pb-2 mb-4">
                {title} ({appointments.length})
            </h3>
            
            {appointments.length === 0 ? (
                <div className="p-4 text-gray-500 border border-dashed rounded-lg">
                    {title === "Upcoming Appointments" 
                        ? "No appointments are currently scheduled."
                        : "No historical appointment records found."
                    }
                </div>
            ) : (
                <div className="space-y-4">
                    {appointments.map((appt) => {
                        const { icon, textClass, text } = getStatusStyles(appt.status);
                        // const startTime = new Date(appt.startDatetime);
                        const endTime = new Date(appt.endDatetime);
                        
                        return (
                            <div key={appt.uuid} className="p-4 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition duration-150 flex justify-between items-center">
                                
                                {/* Details */}
                                <div className="flex-1 min-w-0 space-y-1">
                                    <div className="flex items-center space-x-3">
                                        <Calendar className="w-6 h-6 text-indigo-600" />
                                        <p className="text-lg font-bold text-gray-900 truncate">
                                            {appt.serviceType.display}
                                        </p>
                                    </div>
                                    
                                    <div className="text-sm text-gray-600 space-y-1 ml-8">
                                        <p className="flex items-center">
                                            <Clock className="w-4 h-4 mr-2 text-gray-500" />
                                            {/* FIX: Pass the original string (appt.startDatetime) to formatDate */}
                                            {formatDate(appt.startDatetime)} - {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        <p className="flex items-center">
                                            <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                                            Location: **{appt.location?.display || 'N/A'}**
                                        </p>
                                        <p className="flex items-center">
                                            <User className="w-4 h-4 mr-2 text-gray-500" />
                                            Provider: **{appt.provider?.display || 'Any Available'}**
                                        </p>
                                        {appt.reason && (
                                            <p className="text-xs text-gray-500 italic truncate pt-1">
                                                Reason: {appt.reason}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Status and Actions */}
                                <div className="text-right">
                                    <span 
                                        className={`inline-flex px-3 py-1 text-xs leading-5 rounded-full font-semibold border ${textClass}`}
                                    >
                                        {icon}
                                        {text}
                                    </span>
                                    {/* Action buttons (e.g., Cancel, Reschedule) would go here */}
                                    {title === "Upcoming Appointments" && appt.status.toUpperCase() === 'SCHEDULED' && (
                                        <div className="mt-2 space-x-2">
                                            <button className="text-sm text-red-500 hover:text-red-700">Cancel</button>
                                            <button className="text-sm text-indigo-500 hover:text-indigo-700">Reschedule</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );


    if (error) {
        return (
            <div className="text-center p-8 border border-red-300 bg-red-50 text-red-700 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 mr-3" />
                {error}
            </div>
        );
    }

    if (isLoading && allAppointments.length === 0) {
        return (
            <div className="text-center p-12 text-indigo-600">
                <Loader2 className="w-8 h-8 mx-auto animate-spin mb-3" />
                Loading appointment schedule...
            </div>
        );
    }

    // --- Component JSX ---
    return (
        <div className="bg-white shadow-xl rounded-xl p-6">
            
            {renderAppointmentSection("Upcoming Appointments", upcomingAppointments)}
            
            <hr className="my-6 border-t border-gray-200" />
            
            {renderAppointmentSection("Past Appointments", pastAppointments)}
            
        </div>
    );
}