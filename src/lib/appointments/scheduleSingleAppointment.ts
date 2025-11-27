'use server';

import { redirectToLogin, getAuthHeaders } from '../auth/auth';
import { AppointmentData, ConflictAppointment } from './checkAppointmentConflicts'; // Re-use types

// Define the required structure for the POST response
export interface SingleAppointmentResponse extends Omit<ConflictAppointment, 'service' | 'location'> {
    // Note: The response uses Unix milliseconds for date/time fields
    startDateTime: number; 
    endDateTime: number;
    // Full service/location objects are often returned, but we'll stick to key identifiers for simplicity
    service: { uuid: string; name: string };
    location: { uuid: string; name: string };
    comments: string;
    recurring: boolean; // Should be false for single appointment
}

/**
 * Schedules a single, non-recurring appointment in OpenMRS.
 * @param appointmentData The time, patient, service, location, and provider details.
 * @returns A Promise resolving to the confirmed Appointment object, or null on failure.
 */
export async function scheduleSingleAppointment(appointmentData: AppointmentData): Promise<SingleAppointmentResponse | null> {
    console.log("scheduleSingleAppointment function running.");

    // We must ensure 'status' is set appropriately, usually "Scheduled"
    const payload = {
        ...appointmentData,
        appointmentKind: "Scheduled",
        status: "Scheduled", // Explicitly set status if not passed in AppointmentData
        // dateAppointmentScheduled is often set server-side but can be sent as now()
    };
    
    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
        
    } catch {
        redirectToLogin();
        return null;
    }

    const url = `${process.env.OPENMRS_API_URL}/appointment`; // Single appointment endpoint

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        
        if (!res.ok) {
            const errorText = await res.text();
            console.error(`Single appointment scheduling failed (${res.status}). Error: ${errorText.substring(0, 300)}`);
            return null;
        }
        
        const confirmedAppointment: SingleAppointmentResponse = await res.json();
        
        console.log(`Appointment ${confirmedAppointment.uuid} successfully scheduled.`);

        return confirmedAppointment;

    } catch (error) {
        console.error('Critical network or parsing error during single appointment scheduling:', error);
        return null;
    }
}