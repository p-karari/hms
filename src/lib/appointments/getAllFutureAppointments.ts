// searchAppointments.ts (or a new dedicated file)

'use server';

import { SingleAppointmentResponse } from './scheduleSingleAppointment'; 
import { AppointmentSearchPayload, searchAppointments } from './searchAppointments'; // Import the search function

// --- UTILITY: Date Range Generator ---

/**
 * Generates the required startDate and a distant future endDate for the API.
 * The dates are formatted as ISO 8601 strings with the local timezone offset.
 */
function getFutureDateRangeForOpenMRS(): { startDate: string, endDate: string } {
    const now = new Date();
    
    // Set start of day in local time
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    // Set end date far into the future (e.g., 5 years from now)
    const futureDate = new Date();
    futureDate.setFullYear(now.getFullYear() + 5);
    // Ensure the future date is at the very end of the day for max coverage
    const endOfFutureDay = new Date(futureDate.getFullYear(), futureDate.getMonth(), futureDate.getDate(), 23, 59, 59, 999);
    
    // Calculate timezone offset
    const offsetMinutes = startOfDay.getTimezoneOffset();
    const sign = offsetMinutes > 0 ? '-' : '+'; 
    const offsetHours = Math.abs(Math.floor(offsetMinutes / 60));
    const offsetMins = Math.abs(offsetMinutes % 60);
    const timezoneOffset = `${sign}${String(offsetHours).padStart(2, '0')}${String(offsetMins).padStart(2, '0')}`;

    // Format the date strings for the OpenMRS API
    // Note: OpenMRS often expects the offset format '+HHMM' or similar, but the
    // `searchAppointments` payload type uses the colon: "2025-11-27T00:00:00.000+0300"
    // We will use the format expected by your existing payload type definition.
    
    // For simplicity, let's use the format without the colon for the minutes offset
    const formatDateTimeToISO = (date: Date): string => {
        const isoString = date.toISOString().slice(0, 23); // Up to milliseconds
        return `${isoString.replace('Z', '')}${timezoneOffset}`; // Append timezone offset
    };
    
    const formattedStartDate = formatDateTimeToISO(startOfDay);
    const formattedEndDate = formatDateTimeToISO(endOfFutureDay);
    
    return { startDate: formattedStartDate, endDate: formattedEndDate };
}

// --- NEW SERVER ACTION ---

/**
 * Fetches all scheduled appointments starting from today until a distant future date.
 * @returns A Promise resolving to an array of matching Appointment objects.
 */
export async function getAllFutureAppointments(): Promise<SingleAppointmentResponse[]> {
    console.log("getAllFutureAppointments function running to fetch all future scheduled bookings.");

    const { startDate, endDate } = getFutureDateRangeForOpenMRS();
    
    const searchPayload: AppointmentSearchPayload = {
        startDate: startDate,
        endDate: endDate,
        status: 'Scheduled', // Typically only want 'Scheduled' for future views
        // Optionally add other filters here if needed
    };

    // Re-use the existing search logic
    const appointments = await searchAppointments(searchPayload);
    
    console.log(`getAllFutureAppointments retrieved ${appointments.length} appointments.`);

    return appointments;
}

// Ensure you export the original searchAppointments function if it's used elsewhere
// export * from './searchAppointments';

/**
 * Fetches all future appointments for a specific patient.
 * @param patientUuid The patient's OpenMRS UUID
 * @returns A Promise resolving to an array of that patient's future scheduled appointments.
 */
export async function getAllFutureAppointmentsForPatient(
    patientUuid: string
): Promise<SingleAppointmentResponse[]> {
    console.log(
        `getAllFutureAppointmentsForPatient running for patient ${patientUuid}.`
    );

    const { startDate, endDate } = getFutureDateRangeForOpenMRS();

    const searchPayload: AppointmentSearchPayload = {
        startDate,
        endDate,
        status: 'Scheduled',
        patientUuid: patientUuid, // <-- The important part
    };

    const appointments = await searchAppointments(searchPayload);

    console.log(
        `getAllFutureAppointmentsForPatient retrieved ${appointments.length} appointments for ${patientUuid}.`
    );

    return appointments;
}
