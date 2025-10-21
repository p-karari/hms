'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth'; 

// --- Submission Data Interface ---
export interface NewAppointmentData {
    patientUuid: string;
    
    // Appointment details
    startDatetime: string;      // ISO format, e.g., "YYYY-MM-DDTThh:mm:ssZ"
    endDatetime: string;        // ISO format
    
    serviceTypeUuid: string;    // UUID of the appointment type (e.g., General Consultation)
    locationUuid: string;       // UUID of the clinic/location
    providerUuid?: string;      // Optional: UUID of the specific provider/staff
    
    reason: string;             // Clinician notes or reason for the appointment
}


// --- Helper for API Error Checking ---
async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to schedule appointment: HTTP ${response.status}.`);
}


/**
 * Schedules a new appointment by posting the required details to the OpenMRS Appointment API.
 * * @param appointmentData The structured data payload for the new appointment.
 * @returns A promise that resolves when the appointment is successfully created.
 */
export async function scheduleAppointment(appointmentData: NewAppointmentData): Promise<void> {
    const { 
        patientUuid, 
        startDatetime, 
        endDatetime, 
        serviceTypeUuid, 
        locationUuid,
        providerUuid,
        reason
    } = appointmentData;

    if (!patientUuid || !serviceTypeUuid || !startDatetime || !locationUuid) {
        throw new Error("Missing critical data for scheduling (Patient, Service Type, Time, or Location).");
    }

    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        throw new Error("Authentication failed during appointment scheduling.");
    }
    
    // --- Construct the Appointment Payload ---
    // Note: The OpenMRS Appointment Scheduling API often uses 'appointmentType' for the service UUID.
    const payload = {
        patient: patientUuid,
        startDatetime: startDatetime,
        endDatetime: endDatetime,
        location: locationUuid,
        appointmentType: serviceTypeUuid, 
        reason: reason || `Appointment for ${patientUuid}`,
        
        // Only include provider if one was specifically selected
        ...(providerUuid && { provider: providerUuid }), 

        // Default to a status like SCHEDULED or BOOKED
        status: "SCHEDULED",
    };

    // The endpoint for creating a new appointment
    const url = `${process.env.OPENMRS_API_URL}/appointment`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/json', 
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            await handleApiError(response, "scheduleAppointment");
        }
        
        // Successfully scheduled (response status 201 Created)
    } catch (error) {
        console.error("Final network error scheduling appointment:", error);
        throw new Error("Network or unexpected error during appointment scheduling.");
    }
}