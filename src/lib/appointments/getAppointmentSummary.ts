'use server';

import { redirectToLogin, getAuthHeaders } from '../auth/auth'; // Assuming these functions exist


// Represents the counts for a specific date within the summary
interface CountDetails {
    allAppointmentsCount: number;
    missedAppointmentsCount: number;
    appointmentDate: number; 
    appointmentServiceUuid: string;
}

// Maps a date string (YYYY-MM-DD) to its CountDetails
export interface AppointmentCountMap {
    [date: string]: CountDetails;
}

// The core structure for a single service summary item
export interface AppointmentSummary {
    appointmentService: {
        appointmentServiceId: number;
        name: string;
        description: string | null;
        speciality: {
            name: string;
            uuid: string;
        };
        uuid: string;
        color: string;
        // Add other relevant fields like durationMins, location, etc.
    };
    appointmentCountMap: AppointmentCountMap;
}


function getTodayDateRangeForOpenMRS(): { startDate: string, endDate: string, dateKey: string } {
    const now = new Date();
    
    // Set start and end of day in local time
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Calculate timezone offset in the required format (+HHMM or -HHMM)
    const offsetMinutes = startOfDay.getTimezoneOffset();
    const sign = offsetMinutes > 0 ? '-' : '+'; 
    const offsetHours = Math.abs(Math.floor(offsetMinutes / 60));
    const offsetMins = Math.abs(offsetMinutes % 60);
    const timezoneOffset = `${sign}${String(offsetHours).padStart(2, '0')}${String(offsetMins).padStart(2, '0')}`;

    // Format the date strings for the OpenMRS API
    const formattedStartDate = `${startOfDay.toISOString().slice(0, -1)}${timezoneOffset}`;
    const formattedEndDate = `${endOfDay.toISOString().slice(0, -1)}${timezoneOffset}`;
    
    // Create the date key (YYYY-MM-DD) used to look up the count in appointmentCountMap
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`; 

    return { startDate: formattedStartDate, endDate: formattedEndDate, dateKey };
}


export async function getAppointmentSummary(): Promise<AppointmentSummary[]> {
    console.log("getAppointmentSummary function running to fetch daily service breakdown.");
    
    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
        
    } catch {
        redirectToLogin();
        return [];
    }

    const { startDate, endDate } = getTodayDateRangeForOpenMRS();
    
    const url = `${process.env.OPENMRS_API_URL}/appointment/appointmentSummary?startDate=${startDate}&endDate=${endDate}`;

    try {
        const res = await fetch(url, { headers, next: { tags: ['appointmentSummary'] } }); 
        
        if (!res.ok) {
            const logUrl = url.substring(0, url.indexOf('?')); 
            
            if (res.status === 404) {
                console.warn(`Appointment REST resource not found at ${logUrl} (Status 404).`);
            } else {
                 const errorText = await res.text();
                 console.error(`Appointment API failed at ${logUrl} (${res.status}). Error: ${errorText.substring(0, 200)}`);
            }
            return [];
        }
        
        const data: AppointmentSummary[] = await res.json();
        
        if (Array.isArray(data)) {
            console.log(`Successfully fetched ${data.length} appointment service summaries.`);
            return data;
        }

        return [];

    } catch (error) {
        console.error('Critical network or parsing error fetching appointment summary:', error);
        return [];
    }
}