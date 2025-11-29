'use client';

import React, { useState, useEffect, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppointmentData } from '@/lib/appointments/checkAppointmentConflicts';
import { getAppointmentLocations, Location } from '@/lib/appointments/getAppointmentLocations';
import { AppointmentService, getAppointmentServices } from '@/lib/appointments/getAppointmentServices';
import { RecurrenceType, RecurringAppointmentData, scheduleRecurringAppointment } from '@/lib/appointments/scheduleRecurringAppointment';
import { scheduleSingleAppointment } from '@/lib/appointments/scheduleSingleAppointment';
import { ListPatient, searchPatients } from '@/lib/patients/searchPatients';


interface Provider {
    uuid: string;
    name: string;
}

const getAvailableProviders = async (): Promise<Provider[]> => {

     console.warn("getAvailableProviders action is missing. Using dummy data.");
     return [{ uuid: '65acee3a-4f8b-445a-95c3-a6e3f4cafd89', name: 'Super User (Placeholder)' }];
};


function formatDateTimeToISO(date: Date): string {
    const offset = date.getTimezoneOffset(); 
    const sign = offset <= 0 ? '+' : '-';
    const absOffset = Math.abs(offset);
    const offsetHours = String(Math.floor(absOffset / 60)).padStart(2, '0');
    const offsetMinutes = String(absOffset % 60).padStart(2, '0');
    
    const isoString = date.toISOString().slice(0, 19);
    return `${isoString}${sign}${offsetHours}:${offsetMinutes}`;
}



interface FormProps {
    onSuccess: () => void;
}

export default function CreateAppointmentForm({ onSuccess }: FormProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition(); 
    
    const [services, setServices] = useState<AppointmentService[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [providers, setProviders] = useState<Provider[]>([]);
    const [loadingLists, setLoadingLists] = useState(true);

    const [patientQuery, setPatientQuery] = useState('');
    const [patientResults, setPatientResults] = useState<ListPatient[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<ListPatient | null>(null);
    const [isSearching, setIsSearching] = useState(false);

    const [isRecurring, setIsRecurring] = useState(false);
    const [formData, setFormData] = useState({
        locationUuid: '',
        serviceUuid: '',
        providerUuid: '',
        date: new Date().toISOString().slice(0, 10),
        time: '12:00',
        durationMins: 30,
        comments: '',
        recurrenceType: 'DAY' as RecurrenceType,
        recurrencePeriod: 1,
        recurrenceEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        daysOfWeek: [] as number[],
    });

    useEffect(() => {
        const fetchLists = async () => {
            setLoadingLists(true);
            try {
                const [svc, loc, prov] = await Promise.all([
                    getAppointmentServices(),
                    getAppointmentLocations(),
                    getAvailableProviders(), 
                ]);
                setServices(svc);
                setLocations(loc);
                setProviders(prov);
            } catch (error) {
                console.error("Failed to load appointment lists:", error);
            } finally {
                setLoadingLists(false);
            }
        };
        fetchLists();
    }, []);

    useEffect(() => {
        if (patientQuery.length > 2) {
            setIsSearching(true);
            const debounceTimer = setTimeout(async () => {
                try {
                    const results = await searchPatients(patientQuery);
                    setPatientResults(results);
                } catch (error) {
                    console.error("Patient search failed:", error);
                    setPatientResults([]);
                } finally {
                    setIsSearching(false);
                }
            }, 500);

            return () => clearTimeout(debounceTimer);
        } else {
            setPatientResults([]);
            setIsSearching(false);
        }
    }, [patientQuery]);
    
    const selectedService = services.find(s => s.uuid === formData.serviceUuid);
    const serviceTypes = selectedService?.serviceTypes || [];

    const handlePatientSelect = (patient: ListPatient) => {
        setSelectedPatient(patient);
        setPatientQuery(patient.display);
        setPatientResults([]);
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleDurationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedDuration = Number(e.target.value);
        setFormData(prev => ({ ...prev, durationMins: selectedDuration }));
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedPatient || !formData.serviceUuid || !formData.locationUuid) {
            alert("Please select a patient, service, and location.");
            return;
        }
        
        const recurrenceEndDateObject = new Date(formData.recurrenceEndDate);

        const [hour, minute] = formData.time.split(':').map(Number);
        
        const startDate = new Date(formData.date);
        startDate.setHours(hour, minute, 0, 0);

        const endDate = new Date(startDate);
        endDate.setMinutes(startDate.getMinutes() + formData.durationMins);
        
        const startDateTimeISO = formatDateTimeToISO(startDate);
        const endDateTimeISO = formatDateTimeToISO(endDate);

        const corePayload: AppointmentData & { comments: string } = {
            patientUuid: selectedPatient.uuid,
            serviceUuid: formData.serviceUuid,
            locationUuid: formData.locationUuid,
            startDateTime: startDateTimeISO,
            endDateTime: endDateTimeISO,
            providers: formData.providerUuid ? [{ uuid: formData.providerUuid }] : [],
            comments: formData.comments || 'Scheduled appointment',
        };

        startTransition(async () => {
            try {
                let result;
                if (isRecurring) {
                    const recurringPayload: RecurringAppointmentData = {
                        ...corePayload,
                        recurringPattern: {
                            type: formData.recurrenceType,
                            period: formData.recurrencePeriod,
                            endDate: formatDateTimeToISO(recurrenceEndDateObject), 
                            daysOfWeek: formData.recurrenceType === 'WEEK' ? formData.daysOfWeek : [], 
                        }
                    };
                    result = await scheduleRecurringAppointment(recurringPayload);
                } else {
                    result = await scheduleSingleAppointment(corePayload);
                }

                if (result) {
                    alert('Appointment(s) successfully scheduled!');
                    router.refresh(); 
                    onSuccess();
                } else {
                    alert(`Scheduling failed. Check console for details.`);
                }
                
            } catch (error) {
                console.error(error);
                alert(`A critical error occurred during scheduling. Check console.`);
            }
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-2xl font-bold border-b pb-2">Create New Appointment</h2>

            <div className="space-y-2 relative">
                <label className="block text-sm font-medium text-gray-700">Patient Search</label>
                <input
                    type="text"
                    placeholder="Search patient by name or identifier..."
                    value={patientQuery}
                    onChange={(e) => {
                        setPatientQuery(e.target.value);
                        setSelectedPatient(null);
                    }}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    disabled={isPending}
                />
                
                {selectedPatient && (
                    <p className="text-sm text-green-600 font-semibold">
                        Selected: {selectedPatient.display} ({selectedPatient.identifiers[0]?.identifier || 'No Identifier'})
                    </p>
                )}

                {patientQuery.length > 2 && !selectedPatient && (
                    <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {isSearching && patientResults.length === 0 && (
                            <li className="p-2 text-gray-500">Searching...</li>
                        )}
                        {patientResults.map(patient => (
                            <li 
                                key={patient.uuid} 
                                onClick={() => handlePatientSelect(patient)}
                                className="p-2 cursor-pointer hover:bg-indigo-50 text-sm"
                            >
                                {patient.display} ({patient.identifiers[0]?.identifier || 'No Identifier'})
                            </li>
                        ))}
                         {!isSearching && patientResults.length === 0 && (
                            <li className="p-2 text-gray-500">No patients found.</li>
                        )}
                    </ul>
                )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Location</label>
                    <select
                        name="locationUuid"
                        value={formData.locationUuid}
                        onChange={handleChange}
                        disabled={loadingLists || isPending}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        required
                    >
                        <option value="">{loadingLists ? 'Loading...' : 'Choose a location'}</option>
                        {locations.map(loc => (
                            <option key={loc.uuid} value={loc.uuid}>{loc.display}</option>
                        ))}
                    </select>
                </div>
                
                <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Service</label>
                    <select
                        name="serviceUuid"
                        value={formData.serviceUuid}
                        onChange={handleChange}
                        disabled={loadingLists || isPending}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        required
                    >
                        <option value="">{loadingLists ? 'Loading...' : 'Select service'}</option>
                        {services.map(svc => (
                            <option key={svc.uuid} value={svc.uuid}>{svc.name}</option>
                        ))}
                    </select>
                </div>
                
                <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Appointment Type</label>
                    <select
                        name="appointmentType"
                        value="Scheduled"
                        disabled
                        className="w-full p-2 border border-gray-300 rounded-md bg-gray-50"
                    >
                        <option value="Scheduled">Scheduled</option>
                    </select>
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Duration (minutes)</label>
                    <select
                        name="durationMins"
                        value={formData.durationMins}
                        onChange={handleDurationChange}
                        disabled={!selectedService || isPending}
                        className="w-full p-2 border border-gray-300 rounded-md"
                    >
                        {serviceTypes.length > 0 ? serviceTypes.map(type => (
                            <option key={type.uuid} value={type.duration}>
                                {type.name} ({type.duration} min)
                            </option>
                        )) : (
                            <option value={30}>Default (30 min)</option>
                        )}
                    </select>
                </div>
                
                <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Provider</label>
                    <select
                        name="providerUuid"
                        value={formData.providerUuid}
                        onChange={handleChange}
                        disabled={loadingLists || isPending}
                        className="w-full p-2 border border-gray-300 rounded-md"
                    >
                        <option value="">{loadingLists ? 'Loading...' : 'Choose a provider'}</option>
                        {providers.map((p) => (
                            <option key={p.uuid} value={p.uuid}>{p.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Date</label>
                    <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                        min={new Date().toISOString().split('T')[0]}
                        disabled={isPending}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        required
                    />
                </div>
                
                <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Time</label>
                    <input
                        type="time"
                        name="time"
                        value={formData.time}
                        onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                        disabled={isPending}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        required
                    />
                </div>
                
                <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Date Issued</label>
                    <input
                        type="date"
                        value={new Date().toISOString().split('T')[0]}
                        disabled
                        className="w-full p-2 border border-gray-300 rounded-md bg-gray-50"
                    />
                </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
                <span className="text-sm font-medium text-gray-700">Recurring Appointment</span>
                <label className="flex items-center cursor-pointer">
                    <div className="relative">
                        <input
                            type="checkbox"
                            checked={isRecurring}
                            onChange={(e) => setIsRecurring(e.target.checked)}
                            className="sr-only"
                            disabled={isPending}
                        />
                        <div className={`block w-10 h-6 rounded-full transition ${isRecurring ? 'bg-indigo-600' : 'bg-gray-400'}`}></div>
                        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform ${isRecurring ? 'translate-x-full' : 'translate-x-0'}`}></div>
                    </div>
                </label>
            </div>
            
            {isRecurring && (
                <div className="grid grid-cols-1 gap-4 p-4 border rounded-md bg-yellow-50">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Recurrence Type</label>
                            <select
                                name="recurrenceType"
                                value={formData.recurrenceType}
                                onChange={handleChange}
                                className="w-full p-2 border border-gray-300 rounded-md"
                                disabled={isPending}
                            >
                                <option value="DAY">Daily</option>
                                <option value="WEEK">Weekly</option>
                                <option value="MONTH">Monthly</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Recurrence End Date</label>
                            <input
                                type="date"
                                name="recurrenceEndDate"
                                value={formData.recurrenceEndDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, recurrenceEndDate: e.target.value }))}
                                min={formData.date}
                                className="w-full p-2 border border-gray-300 rounded-md"
                                required
                                disabled={isPending}
                            />
                        </div>
                    </div>
                    
                    {formData.recurrenceType === 'WEEK' && (
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Days of Week (1=Mon, 7=Sun)</label>
                            <p className="text-xs text-gray-600 italic">
                                *Note: Day selection UI/Logic for `daysOfWeek` (e.g., checkboxes) is needed for WEEKLY recurrence.
                            </p>
                        </div>
                    )}
                </div>
            )}

            <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Note</label>
                <textarea
                    name="comments"
                    rows={3}
                    value={formData.comments}
                    onChange={handleChange}
                    placeholder="Write an additional note"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    disabled={isPending}
                />
            </div>

            <div className="flex justify-end space-x-3">
                <button
                    type="button"
                    onClick={() => onSuccess()}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                    disabled={isPending}
                >
                    Discard
                </button>
                <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                    disabled={isPending || !selectedPatient || !formData.locationUuid || !formData.serviceUuid}
                >
                    {isPending ? 'Scheduling...' : 'Save and close'}
                </button>
            </div>
            
        </form>
    );
}