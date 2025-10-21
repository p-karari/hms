'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth'; 

// --- Core Option Interfaces ---
export interface AppointmentServiceType {
    uuid: string;
    display: string;
    duration: number; // Default duration in minutes
}

export interface SchedulingProvider {
    uuid: string;
    display: string;
    // Includes provider attributes if necessary (e.g., specialty, clinic)
}

// --- Combined Context Interface ---
export interface AppointmentSchedulingContext {
    serviceTypes: AppointmentServiceType[];
    providers: SchedulingProvider[];
}


// --- Helper for API Error Checking ---
async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to fetch appointment scheduling options: HTTP ${response.status}.`);
}


/**
 * Fetches the reference data required for scheduling a new appointment, 
 * including available service types and providers.
 *
 * @returns A promise that resolves to the AppointmentSchedulingContext object.
 */
export async function getAppointmentSchedulingOptions(): Promise<AppointmentSchedulingContext> {
    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        throw new Error("Authentication failed during scheduling context retrieval.");
    }
    
    const apiBaseUrl = process.env.OPENMRS_API_URL;
    
    // Define the two concurrent fetches
    const serviceTypeUrl = `${apiBaseUrl}/appointmentservicetype?v=custom:(uuid,display,duration)`;
    // NOTE: OpenMRS often uses the /provider endpoint for scheduling staff
    const providerUrl = `${apiBaseUrl}/provider?v=custom:(uuid,display)`; 

    try {
        const [serviceTypeResponse, providerResponse] = await Promise.all([
            fetch(serviceTypeUrl, { headers, cache: 'force-cache' }),
            fetch(providerUrl, { headers, cache: 'force-cache' }),
        ]);

        if (!serviceTypeResponse.ok) {
            await handleApiError(serviceTypeResponse, "Appointment Service Types");
        }
        if (!providerResponse.ok) {
            await handleApiError(providerResponse, "Providers");
        }
        
        const serviceTypeData: { results: AppointmentServiceType[] } = await serviceTypeResponse.json();
        const providerData: { results: SchedulingProvider[] } = await providerResponse.json();

        // Filter and map results
        const serviceTypes = serviceTypeData.results.filter((item: any) => !item.retired);
        const providers = providerData.results.filter((item: any) => !item.retired);
        
        return {
            serviceTypes: serviceTypes,
            providers: providers,
        };

    } catch (error) {
        console.error('Final error fetching scheduling context:', error);
        throw new Error("Unable to initialize appointment scheduling settings.");
    }
}