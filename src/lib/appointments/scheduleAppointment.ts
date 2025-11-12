'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth'; 

export interface NewAppointmentData {
    patientUuid: string;
    
    startDatetime: string;      
    endDatetime: string;        
    
    serviceTypeUuid: string;    
    locationUuid: string;      
    providerUuid?: string;      
    
    reason: string;             
}


async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to schedule appointment: HTTP ${response.status}.`);
}



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
    
    const payload = {
        patient: patientUuid,
        startDatetime: startDatetime,
        endDatetime: endDatetime,
        location: locationUuid,
        appointmentType: serviceTypeUuid, 
        reason: reason || `Appointment for ${patientUuid}`,
        
        ...(providerUuid && { provider: providerUuid }), 

        status: "SCHEDULED",
    };

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
        
    } catch (error) {
        console.error("Final network error scheduling appointment:", error);
        throw new Error("Network or unexpected error during appointment scheduling.");
    }
}