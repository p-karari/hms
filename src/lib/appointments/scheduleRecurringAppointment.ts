'use server';

import { redirectToLogin, getAuthHeaders } from '../auth/auth';
import { AppointmentData } from './checkAppointmentConflicts';

// --- RECURRING TYPE DEFINITIONS ---

export type RecurrenceType = "DAY" | "WEEK" | "MONTH";

export interface RecurringPattern {
    type: RecurrenceType;
    period: number; // e.g., 1 for "every day", 2 for "every other week"
    endDate: string; // ISO 8601 string with offset (when the recurrence stops)
    daysOfWeek: number[]; // e.g., [1, 5] for Monday and Friday (if type is WEEK)
}

// Data structure for the recurring POST request
export interface RecurringAppointmentData extends AppointmentData {
    recurringPattern: RecurringPattern;
    // Add comments field here as it is required for all bookings
    comments: string;
}

// The response is an array of the newly created appointments
export interface RecurringAppointmentResponse {
    appointmentDefaultResponse: any; // Contains the full appointment details (similar to SingleAppointmentResponse)
    recurringPattern: any; // Details of the pattern used
}

/**
 * Schedules a series of recurring appointments in OpenMRS.
 * @param recurringData The appointment details including the recurrence pattern.
 * @returns A Promise resolving to an array of newly created appointment responses, or null on failure.
 */
export async function scheduleRecurringAppointment(recurringData: RecurringAppointmentData): Promise<RecurringAppointmentResponse[] | null> {
    console.log("scheduleRecurringAppointment function running.");

    const payload = {
        ...recurringData,
        appointmentKind: "Scheduled",
        status: "Scheduled",
    };
    
    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
        
    } catch {
        redirectToLogin();
        return null;
    }

    const url = `${process.env.OPENMRS_API_URL}/recurring-appointments`; // Recurring endpoint

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
            console.error(`Recurring appointment scheduling failed (${res.status}). Error: ${errorText.substring(0, 300)}`);
            return null;
        }
        
        const confirmedAppointments: RecurringAppointmentResponse[] = await res.json();
        
        console.log(`Successfully scheduled ${confirmedAppointments.length} recurring appointments.`);
        
        return confirmedAppointments;

    } catch (error) {
        console.error('Critical network or parsing error during recurring appointment scheduling:', error);
        return null;
    }
}