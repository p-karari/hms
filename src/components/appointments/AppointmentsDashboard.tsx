'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, CalendarDays, Loader2, AlertCircle } from 'lucide-react';

// --- Import built components and actions ---
import AppointmentList from '@/components/appointments/AppointmentList';
import { 
    getAppointmentSchedulingOptions, 
    AppointmentSchedulingContext 
} from '@/lib/appointments/getAppointmentSchedulingOptions';
import { getPatientLocations } from '@/lib/location/getPatientLocations'; 
import { scheduleAppointment, NewAppointmentData } from '@/lib/appointments/scheduleAppointment';

interface AppointmentsDashboardProps {
    patientUuid: string;
    patientName: string;
}

/**
 * The main container component for the patient's Appointments.
 * It manages the display of the list and the scheduling workflow.
 */
export default function AppointmentsDashboard({ patientUuid }: AppointmentsDashboardProps) {
    
    // Core States
    const [refreshKey, setRefreshKey] = useState(0); 
    const [isFormVisible, setIsFormVisible] = useState(false); // New Schedule Form visibility
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingContext, setIsLoadingContext] = useState(false);

    // Context Data
    const [schedulingContext, setSchedulingContext] = useState<AppointmentSchedulingContext | null>(null);
    const [locationOptions, setLocationOptions] = useState<Array<{ uuid: string; display: string }>>([]);

    // Form Data States
    const [scheduleData, setScheduleData] = useState<Omit<NewAppointmentData, 'patientUuid'>>({
        startDatetime: new Date().toISOString().substring(0, 16), // YYYY-MM-DDTHH:MM format
        endDatetime: '',
        serviceTypeUuid: '',
        locationUuid: '',
        providerUuid: undefined,
        reason: '',
    });

    // --- Derived State & Logic ---
    const selectedServiceType = useMemo(() => {
        if (!schedulingContext || !scheduleData.serviceTypeUuid) return null;
        return schedulingContext.serviceTypes.find(
            st => st.uuid === scheduleData.serviceTypeUuid
        );
    }, [schedulingContext, scheduleData.serviceTypeUuid]);

    // Automatically calculate end time when service type or start time changes
    useEffect(() => {
        if (selectedServiceType && scheduleData.startDatetime) {
            const startDate = new Date(scheduleData.startDatetime);
            // Add the service duration in minutes
            startDate.setMinutes(startDate.getMinutes() + selectedServiceType.duration);
            
            // Update endDatetime in the state
            setScheduleData(prev => ({
                ...prev,
                endDatetime: startDate.toISOString().substring(0, 16),
            }));
        } else {
             // Clear end time if no service is selected
             setScheduleData(prev => ({ ...prev, endDatetime: '' }));
        }
    }, [scheduleData.startDatetime, selectedServiceType]);


    // --- Initial Data Fetching ---
    const fetchInitialData = useCallback(async () => {
        setIsLoadingContext(true);
        try {
            // Fetch scheduling options (service types, providers) and locations
            const [context, locations] = await Promise.all([
                getAppointmentSchedulingOptions(),
                getPatientLocations(patientUuid), 
            ]);
            
            setSchedulingContext(context);
            setLocationOptions(locations.map(loc => ({ uuid: loc.uuid, display: loc.display })));
            
            // Set default location if available
            if (locations.length > 0) {
                setScheduleData(prev => ({ ...prev, locationUuid: locations[0].uuid }));
            }
            
        } catch (error) {
            console.error("Failed to load initial data for appointments form:", error);
            alert("Failed to load scheduling context. Check network and API configuration.");
        } finally {
            setIsLoadingContext(false);
        }
    }, [patientUuid]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);


    // --- Scheduling Submission Handler ---
    const handleScheduleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!scheduleData.serviceTypeUuid || !scheduleData.locationUuid || !scheduleData.endDatetime) {
            alert('Missing Service Type, Location, or Appointment Time.');
            return;
        }

        setIsSubmitting(true);
        
        // Convert YYYY-MM-DDTHH:MM local time to ISO 8601 (with Z or offset)
        const formatForApi = (datetimeLocal: string) => new Date(datetimeLocal).toISOString();

        const finalPayload: NewAppointmentData = {
            patientUuid: patientUuid,
            startDatetime: formatForApi(scheduleData.startDatetime),
            endDatetime: formatForApi(scheduleData.endDatetime),
            serviceTypeUuid: scheduleData.serviceTypeUuid,
            locationUuid: scheduleData.locationUuid,
            providerUuid: scheduleData.providerUuid,
            reason: scheduleData.reason,
        };

        try {
            await scheduleAppointment(finalPayload);
            
            alert(`Appointment scheduled successfully for ${finalPayload.startDatetime.split('T')[0]}`);
            setRefreshKey(prevKey => prevKey + 1); // Refresh the list
            
            // Reset state
            setIsFormVisible(false);
            setScheduleData(prev => ({
                 ...prev,
                 startDatetime: new Date().toISOString().substring(0, 16),
                 serviceTypeUuid: '',
                 providerUuid: undefined,
                 reason: '',
            }));

        } catch (error: any) {
            console.error('Appointment scheduling failed:', error);
            alert(`Scheduling failed. Check if the slot is already taken. Error: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // --- New Appointment Form JSX (Inline Component) ---
    const NewScheduleForm = () => (
        <div className="bg-white border border-indigo-200 rounded-lg p-6 shadow-md mb-8">
            <h3 className="text-xl font-semibold text-indigo-700 mb-4 flex items-center">
                <Plus className="w-5 h-5 mr-2" /> Book New Appointment
            </h3>
            
            {isLoadingContext ? (
                <div className="text-center p-4 text-gray-600">
                    <Loader2 className="w-5 h-5 mx-auto animate-spin" />
                    Preparing scheduling options...
                </div>
            ) : !schedulingContext ? (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-sm rounded flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    **Critical Error**: Could not load scheduling options (Service Types/Providers).
                </div>
            ) : (
                <form onSubmit={handleScheduleSubmit} className="space-y-4">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        
                        {/* 1. Service Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                            <select
                                value={scheduleData.serviceTypeUuid}
                                onChange={(e) => setScheduleData({ ...scheduleData, serviceTypeUuid: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-indigo-500 focus:border-indigo-500"
                                required
                                disabled={isSubmitting}
                            >
                                <option value="">Select Service</option>
                                {schedulingContext.serviceTypes.map(st => (
                                    <option key={st.uuid} value={st.uuid}>
                                        {st.display} ({st.duration} min)
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        {/* 2. Start Date and Time */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date/Time</label>
                            <input
                                type="datetime-local"
                                value={scheduleData.startDatetime}
                                onChange={(e) => setScheduleData({ ...scheduleData, startDatetime: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-indigo-500 focus:border-indigo-500"
                                required
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* 3. Calculated End Time */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Calculated End Time</label>
                            <input
                                type="text"
                                value={scheduleData.endDatetime ? new Date(scheduleData.endDatetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Select Service/Start Time'}
                                className="w-full border border-gray-300 bg-gray-100 rounded-lg p-2 text-gray-600"
                                readOnly
                            />
                        </div>

                        {/* 4. Location */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                            <select
                                value={scheduleData.locationUuid}
                                onChange={(e) => setScheduleData({ ...scheduleData, locationUuid: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-indigo-500 focus:border-indigo-500"
                                required
                                disabled={isSubmitting}
                            >
                                <option value="">Select Location</option>
                                {locationOptions.map(loc => (
                                    <option key={loc.uuid} value={loc.uuid}>{loc.display}</option>
                                ))}
                            </select>
                        </div>
                        
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        
                        {/* 5. Provider (Optional) */}
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Assign Provider (Optional)</label>
                            <select
                                value={scheduleData.providerUuid || ''}
                                onChange={(e) => setScheduleData({ ...scheduleData, providerUuid: e.target.value || undefined })}
                                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-indigo-500 focus:border-indigo-500"
                                disabled={isSubmitting}
                            >
                                <option value="">Any Available</option>
                                {schedulingContext.providers.map(p => (
                                    <option key={p.uuid} value={p.uuid}>{p.display}</option>
                                ))}
                            </select>
                        </div>
                        
                        {/* 6. Reason/Notes */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Appointment</label>
                            <input
                                type="text"
                                value={scheduleData.reason}
                                onChange={(e) => setScheduleData({ ...scheduleData, reason: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Brief reason for the visit (e.g., Follow-up lab results, Annual physical)"
                                disabled={isSubmitting}
                            />
                        </div>

                    </div>
                    
                    {/* Submission Button */}
                    <div className="flex justify-end space-x-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsFormVisible(false)}
                            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 flex items-center"
                            disabled={isSubmitting || !scheduleData.serviceTypeUuid || !scheduleData.locationUuid || !scheduleData.endDatetime}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Booking Slot...
                                </>
                            ) : (
                                <>
                                    <CalendarDays className="w-4 h-4 mr-2" /> Schedule Appointment
                                </>
                            )}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );


    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-extrabold text-gray-900 border-b pb-2">
                Appointment Scheduling
            </h1>
            
            {/* Action Bar */}
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-700 flex items-center">
                    <CalendarDays className="w-6 h-6 mr-2 text-indigo-600" /> Patient Schedule
                </h2>
                <button
                    onClick={() => setIsFormVisible(prev => !prev)}
                    className="flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg shadow-md hover:bg-indigo-700 transition duration-150"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    {isFormVisible ? 'Hide Scheduling Form' : 'Book New Appointment'}
                </button>
            </div>

            {/* 2. New Appointment Form */}
            {isFormVisible && <NewScheduleForm />}

            {/* 3. Appointment List */}
            <AppointmentList 
                patientUuid={patientUuid} 
                refreshKey={refreshKey}
            />
        </div>
    );
}