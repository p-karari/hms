'use server';

import { redirectToLogin, getAuthHeaders } from '../auth/auth';
import { SingleAppointmentResponse } from './scheduleSingleAppointment'; // Reuse response structure


export type AppointmentStatus = 'Scheduled' | 'CheckedIn' | 'Completed' | 'Missed' | 'Cancelled';

// Define the required payload for the search endpoint
export interface AppointmentSearchPayload {
    startDate: string; // ISO 8601 string with offset (e.g., "2025-11-27T00:00:00.000+0300")
    endDate: string;   // ISO 8601 string with offset
    status?: AppointmentStatus; // Optional status filter
    serviceUuid?: string;      // Optional filter by service
    locationUuid?: string;     // Optional filter by location
    patientUuid?: string;      // Optional filter by a specific patient
}


export async function searchAppointments(searchPayload: AppointmentSearchPayload): Promise<SingleAppointmentResponse[]> {
    console.log("searchAppointments function running with payload:", searchPayload);
    
    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
        
    } catch {
        redirectToLogin();
        return [];
    }

    const url = `${process.env.OPENMRS_API_URL}/appointments/search`;

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(searchPayload),
        });
        
        if (!res.ok) {
            const errorText = await res.text();
            console.error(`Appointment search failed (${res.status}). Error: ${errorText.substring(0, 300)}`);
            return [];
        }
        
        const appointments: SingleAppointmentResponse[] = await res.json();
        
        console.log(`Successfully retrieved ${appointments.length} appointments matching the criteria.`);
        return appointments;

    } catch (error) {
        console.error('Critical network or parsing error during appointment search:', error);
        return [];
    }
}