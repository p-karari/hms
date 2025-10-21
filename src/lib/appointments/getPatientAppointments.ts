'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
// import { ConceptReference } from '@/actions/medications/getPatientMedicationOrders'; // Reusing ConceptReference type

// --- Core Appointment Interface ---
export interface Appointment {
    uuid: string;
    
    // Appointment details
    startDatetime: string; // ISO format
    endDatetime: string;   // ISO format
    
    // Status (e.g., SCHEDULED, COMPLETED, CANCELLED, MISSED)
    status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'MISSED' | string;
    
    // The type of service requested (e.g., 'General Consultation')
    serviceType: { uuid: string; display: string }; 
    
    // The location/clinic where the appointment is scheduled
    location: { uuid: string; display: string } | null;
    
    // The provider/staff member assigned to the slot
    provider: { uuid: string; display: string } | null;
    
    // The patient requesting the appointment
    patient: { uuid: string; display: string };
    
    // Notes or reason for the visit
    reason: string | null;
}

// --- Helper for API Error Checking ---
async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to fetch patient appointments: HTTP ${response.status}.`);
}

/**
 * Fetches the list of all appointments (past and future) scheduled for a specific patient.
 * * NOTE: This relies on the OpenMRS Appointment Scheduling module being installed and configured.
 * * @param patientUuid The UUID of the patient.
 * @returns A promise that resolves to an array of Appointment objects.
 */
export async function getPatientAppointments(patientUuid: string): Promise<Appointment[]> {
    if (!patientUuid) {
        console.error("Patient UUID is required to fetch appointments.");
        return [];
    }

    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        return [];
    }

    // The endpoint for fetching appointments, filtered by patient.
    // The 'v' parameter ensures we get necessary linked data (provider, serviceType, etc.).
    const url = `${process.env.OPENMRS_API_URL}/appointment?patient=${patientUuid}&v=full`;

    try {
        const response = await fetch(url, { 
            headers, 
            cache: 'no-store' // Appointments are time-sensitive, no caching
        });

        if (!response.ok) {
            await handleApiError(response, "getPatientAppointments");
            return [];
        }

        const data: { results: any[] } = await response.json();
        
        // --- Custom Logic: Map API data to Appointment Interface ---
        const appointments: Appointment[] = data.results
            .map(item => ({
                uuid: item.uuid,
                startDatetime: item.startDatetime,
                endDatetime: item.endDatetime,
                status: item.status,
                serviceType: { 
                    uuid: item.appointmentType?.uuid || 'N/A', 
                    display: item.appointmentType?.display || 'N/A' 
                },
                location: item.location || null,
                provider: item.provider || null,
                patient: item.patient,
                reason: item.reason || null,
            }));
        
        // Sort chronologically (oldest first, but usually you want upcoming first)
        appointments.sort((a, b) => new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime());
        
        return appointments;

    } catch (error) {
        console.error('Final error in getPatientAppointments:', error);
        return [];
    }
}