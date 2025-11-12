'use server';

import { redirectToLogin, getAuthHeaders } from '../auth/auth';

// --- TYPE DEFINITIONS ---

interface CountDetails {
    allAppointmentsCount: number;
    missedAppointmentsCount: number;
    appointmentDate: number; 
    appointmentServiceUuid: string;
}

interface AppointmentCountMap {
    [date: string]: CountDetails;
}

interface AppointmentSummary {
    appointmentService: {
        appointmentServiceId: number;
        name: string;
        uuid: string;
    };
    appointmentCountMap: AppointmentCountMap;
}

// --- DATE HELPER FUNCTION ---

function getTodayDateRangeForOpenMRS(): { startDate: string, endDate: string } {
    const now = new Date();
    
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const offsetMinutes = startOfDay.getTimezoneOffset();
    const sign = offsetMinutes > 0 ? '-' : '+'; 
    const offsetHours = Math.abs(Math.floor(offsetMinutes / 60));
    const offsetMins = Math.abs(offsetMinutes % 60);
    const timezoneOffset = `${sign}${String(offsetHours).padStart(2, '0')}${String(offsetMins).padStart(2, '0')}`;


    const formattedStartDate = `${startOfDay.toISOString().slice(0, -1)}${timezoneOffset}`;
    const formattedEndDate = `${endOfDay.toISOString().slice(0, -1)}${timezoneOffset}`;

    return { startDate: formattedStartDate, endDate: formattedEndDate };
}


export async function getAppointmentsTodayCount(): Promise<number> {
    console.log("getAppointmentsTodayCount function running");
    
    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
        
    } catch {
        redirectToLogin();
        return 0;
    }

    const { startDate, endDate } = getTodayDateRangeForOpenMRS();
    
    const url = `${process.env.OPENMRS_API_URL}/appointment/appointmentSummary?startDate=${startDate}&endDate=${endDate}`;

    const today = new Date(); 
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`; 


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

        if (Array.isArray(data)) {
            for (const serviceSummary of data) {
                const countMap = serviceSummary.appointmentCountMap;
                
                if (countMap && countMap[dateKey]) {
                    const countDetails = countMap[dateKey];
                    
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