'use server';

import { redirectToLogin, getAuthHeaders } from '../auth/auth';
import { AppointmentService } from './getAppointmentServices'; // Re-use types

// --- TYPE DEFINITIONS ---

// The minimum required fields for checking conflicts or scheduling a single appointment
export interface AppointmentData {
    patientUuid: string;
    serviceUuid: string;
    locationUuid: string;
    startDateTime: string; // ISO 8601 string with offset (e.g., "2025-11-27T12:50:00+03:00")
    endDateTime: string;   // ISO 8601 string with offset
    providers: { uuid: string }[]; // Array of provider UUIDs
    // Note: comments and status are not required for conflict check
}

// Simplified structure for a conflicting appointment returned by the API
export interface ConflictAppointment {
    uuid: string;
    appointmentNumber: string;
    patient: {
        identifier: string; uuid: string; name: string 
};
    service: Pick<AppointmentService, 'name' | 'uuid'>;
    location: Pick<Location, 'display' | 'uuid'>;
    startDateTime: number; // Unix milliseconds timestamp in response
    endDateTime: number;   // Unix milliseconds timestamp in response
    status: string;
}


interface Location {
    uuid: string; // The OpenMRS unique identifier for the location
    display: string; // The human-readable name (e.g., "Outpatient Clinic")
    // Note: Other fields (links, tags) can be added here if needed later.
}

/**
 * Performs a pre-flight check for scheduling conflicts for a proposed appointment.
 * * @param appointmentData The time, patient, service, location, and provider details for the proposed booking.
 * @returns A Promise resolving to an array of ConflictAppointment objects. An empty array means no conflict.
 */
export async function checkAppointmentConflicts(appointmentData: AppointmentData): Promise<ConflictAppointment[]> {
    console.log("checkAppointmentConflicts function running.");
    
    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
        
    } catch {
        redirectToLogin();
        return [];
    }

    const url = `${process.env.OPENMRS_API_URL}/appointments/conflicts`;

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(appointmentData),
        });
        
        if (!res.ok) {
            const errorText = await res.text();
            console.error(`Conflict check API failed (${res.status}). Error: ${errorText.substring(0, 200)}`);
            // Return an array with an artificial conflict or throw, depending on desired UX on API failure
            throw new Error(`Failed to check conflicts: Status ${res.status}`);
        }
        
        const conflicts: ConflictAppointment[] = await res.json();
        
        if (conflicts.length > 0) {
            console.warn(`Conflict detected! Found ${conflicts.length} overlapping appointments.`);
        } else {
            console.log("No conflicts found. Appointment is clear to book.");
        }

        return conflicts;

    } catch (error) {
        console.error('Critical network or parsing error during conflict check:', error);
        return [];
    }
}