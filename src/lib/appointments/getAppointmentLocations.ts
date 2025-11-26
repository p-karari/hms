'use server';

import { redirectToLogin, getAuthHeaders } from '../auth/auth'; 

// --- TYPE DEFINITIONS ---

export interface Location {
    uuid: string;
    display: string; 
}

interface LocationResult {
    results: Location[];
}


export async function getAppointmentLocations(): Promise<Location[]> {
    console.log("getAppointmentLocations function running to fetch bookable locations.");
    
    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
        
    } catch {
        // Redirect to login if authentication fails
        redirectToLogin();
        return [];
    }

    // URL to fetch locations specifically tagged as 'Appointment Location'
    const locationTag = encodeURIComponent('Appointment Location');
    const url = `${process.env.OPENMRS_API_URL}/location?tag=${locationTag}`;

    try {
        const res = await fetch(url, { headers, next: { tags: ['appointmentLocations'] } });
        
        if (!res.ok) {
            if (res.status === 404) {
                console.warn(`Location REST resource not found at ${url} (Status 404).`);
            } else {
                 const errorText = await res.text();
                 console.error(`Location API failed at ${url} (${res.status}). Error: ${errorText.substring(0, 200)}`);
            }
            return [];
        }
        
        const data: LocationResult = await res.json();
        
        if (data && Array.isArray(data.results)) {
            console.log(`Successfully fetched ${data.results.length} appointment locations.`);
            // Return only the array of locations
            return data.results;
        }

        return [];

    } catch (error) {
        console.error('Critical network or parsing error fetching locations:', error);
        return [];
    }
}