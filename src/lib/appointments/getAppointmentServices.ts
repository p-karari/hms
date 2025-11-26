'use server';

import { redirectToLogin, getAuthHeaders } from '../auth/auth'; 

// --- TYPE DEFINITIONS ---

interface Speciality {
    name: string;
    uuid: string;
}

interface ServiceType {
    duration: number; 
    name: string;
    uuid: string;
}

// Defines the structure for a single Appointment Service (using the 'full' representation)
export interface AppointmentService {
    appointmentServiceId: number;
    name: string;
    description: string | null;
    speciality: Speciality;
    startTime: string; 
    endTime: string;   
    durationMins: number | null; 
    location: {}; 
    uuid: string;
    color: string;
    weeklyAvailability: any[]; 
    serviceTypes: ServiceType[]; 
}


export async function getAppointmentServices(): Promise<AppointmentService[]> {
    console.log("getAppointmentServices function running to fetch full service catalog.");
    
    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
        
    } catch {
        redirectToLogin();
        return [];
    }

    const url = `${process.env.OPENMRS_API_URL}/appointmentService/all/full`;

    try {
        const res = await fetch(url, { headers, next: { tags: ['appointmentServices'] } });
        
        if (!res.ok) {
            if (res.status === 404) {
                console.warn(`Appointment Service REST resource not found at ${url} (Status 404).`);
            } else {
                 const errorText = await res.text();
                 console.error(`Appointment Service API failed at ${url} (${res.status}). Error: ${errorText.substring(0, 200)}`);
            }
            return [];
        }
        
        const data: AppointmentService[] = await res.json();
        
        if (Array.isArray(data)) {
            console.log(`Successfully fetched ${data.length} appointment services.`);
            return data;
        }

        return [];

    } catch (error) {
        console.error('Critical network or parsing error fetching appointment services:', error);
        return [];
    }
}