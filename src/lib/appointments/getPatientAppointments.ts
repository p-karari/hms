'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';

export interface Appointment {
    uuid: string;
    
    startDatetime: string; 
    endDatetime: string;   
    
    status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'MISSED' | string;
    
    serviceType: { uuid: string; display: string }; 
    
    location: { uuid: string; display: string } | null;
    
    provider: { uuid: string; display: string } | null;
    
    patient: { uuid: string; display: string };
    
    reason: string | null;
}

async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to fetch patient appointments: HTTP ${response.status}.`);
}


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

    const url = `${process.env.OPENMRS_API_URL}/appointment?patient=${patientUuid}&v=full`;

    try {
        const response = await fetch(url, { 
            headers, 
            cache: 'no-store' 
        });

        if (!response.ok) {
            await handleApiError(response, "getPatientAppointments");
            return [];
        }

        const data: { results: any[] } = await response.json();
        
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
        
        appointments.sort((a, b) => new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime());
        
        return appointments;

    } catch (error) {
        console.error('Final error in getPatientAppointments:', error);
        return [];
    }
}