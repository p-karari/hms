'use server';

import { redirectToLogin, getAuthHeaders } from '../auth/auth';

// --- TYPE DEFINITIONS ---

// Define the structure of the count details object (based on your JSON output)
interface CountDetails {
    allAppointmentsCount: number;
    missedAppointmentsCount: number;
    appointmentDate: number; // Unix timestamp
    appointmentServiceUuid: string;
}

// Define the structure of the nested count map (keys are dates, values are CountDetails objects)
interface AppointmentCountMap {
    [date: string]: CountDetails;
}

// Define the structure of a single element in the response array
interface AppointmentSummary {
    appointmentService: {
        appointmentServiceId: number;
        name: string;
        uuid: string;
        // ... other service properties
    };
    appointmentCountMap: AppointmentCountMap;
}

// --- DATE HELPER FUNCTION ---

/**
 * Creates date strings for the start and end of the current day,
 * formatted as YYYY-MM-DDT00:00:00.000+HHMM for OpenMRS REST queries.
 * @returns {{ startDate: string, endDate: string }} The formatted date strings for today.
 */
function getTodayDateRangeForOpenMRS(): { startDate: string, endDate: string } {
    const now = new Date();
    
    // 1. Calculate Start of Day (00:00:00.000)
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    
    // 2. Calculate End of Day (23:59:59.999)
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    // 3. Calculate Timezone Offset (OpenMRS requires the literal sign)
    // Date.prototype.getTimezoneOffset() returns minutes *difference* from UTC.
    // Positive means West of UTC (e.g., America), requiring a '-' sign for the literal offset.
    // Negative means East of UTC (e.g., Europe, Africa), requiring a '+' sign.
    const offsetMinutes = startOfDay.getTimezoneOffset();
    const sign = offsetMinutes > 0 ? '-' : '+'; 
    const offsetHours = Math.abs(Math.floor(offsetMinutes / 60));
    const offsetMins = Math.abs(offsetMinutes % 60);
    const timezoneOffset = `${sign}${String(offsetHours).padStart(2, '0')}${String(offsetMins).padStart(2, '0')}`;

    // 4. Format ISO strings and append the offset
    // slice(0, -1) removes the trailing 'Z' from toISOString()
    const formattedStartDate = `${startOfDay.toISOString().slice(0, -1)}${timezoneOffset}`;
    const formattedEndDate = `${endOfDay.toISOString().slice(0, -1)}${timezoneOffset}`;

    return { startDate: formattedStartDate, endDate: formattedEndDate };
}

// --- SERVER ACTION ---

/**
 * Fetches the count of all appointments for the current day by querying the 
 * /appointment/appointmentSummary endpoint and summing the 'allAppointmentsCount' 
 * across all services.
 */
export async function getAppointmentsTodayCount(): Promise<number> {
    console.log("getAppointmentsTodayCount function running");
    
    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
        
    } catch {
        redirectToLogin();
        // Authentication failed, redirect already called
        return 0;
    }

    const { startDate, endDate } = getTodayDateRangeForOpenMRS();
    
    // The CONFIRMED WORKING ENDPOINT
    const url = `${process.env.OPENMRS_API_URL}/appointment/appointmentSummary?startDate=${startDate}&endDate=${endDate}`;

    // --- SYSTEMATIC FIX IMPLEMENTED HERE ---
    // Generate the YYYY-MM-DD key directly from the local Date object.
    const today = new Date(); 
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`; 
    // ---------------------------------------

    // --- DEBUGGING LOGS (Optional, but helpful) ---
    // console.log(`Debug: API StartDate (full): ${startDate}`);
    // console.log(`Debug: Date Key for Lookup: ${dateKey}`);
    // ----------------------------------------------

    try {
        const res = await fetch(url, { headers });
        
        if (!res.ok) {
            const logUrl = url.substring(0, url.indexOf('?')); 

            if (res.status === 404) {
                console.warn(`Appointment REST resource not found at ${logUrl} (Status 404).`);
            } else {
                 const errorText = await res.text();
                 console.error(`Appointment API failed at ${logUrl} (${res.status}). Error: ${errorText.substring(0, 200)}`);
            }
            return 0;
        }
        
        const data: AppointmentSummary[] = await res.json();
        
        let totalCount = 0;

        // 2. Iterate through each service summary object
        if (Array.isArray(data)) {
            for (const serviceSummary of data) {
                const countMap = serviceSummary.appointmentCountMap;
                
                // 3. Check if the map exists and contains the count details for our GUARANTEED dateKey
                if (countMap && countMap[dateKey]) {
                    const countDetails = countMap[dateKey];
                    
                    // 4. Sum the count from the specific field: 'allAppointmentsCount'
                    totalCount += countDetails.allAppointmentsCount;
                }
            }
        }
        
        console.log("total count", totalCount)
        return totalCount;

    } catch (error) {
        console.error('Critical network or parsing error fetching appointments:', error);
        return 0;
    }
}