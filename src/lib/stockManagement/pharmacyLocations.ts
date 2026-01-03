'use server'

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export interface FhirLocation {
    resource: {
        id: string;
        resourceType: "Location";
        name: string;
        status: string;
    }
}

export interface FhirBundleResponse {
    resourceType: "Bundle";
    total: number;
    entry?: FhirLocation[];
}

/**
 * Fetches pharmacy/store locations using the specific FHIR _tag filter
 */
export async function getPharmacyLocations() {
    const cookieStore = await cookies();
    const jsessionid = cookieStore.get('JSESSIONID')?.value;
    
    if (!jsessionid) {
        console.warn("[DEBUG] No JSESSIONID found. Redirecting...");
        cookieStore.delete('JSESSIONID');
        redirect("/login");
    }

    // Using the exact working parameters from your example
    // Tags need to be URL encoded as: main%20store%2Cmain%20pharmacy%2Cdispensary
    const baseUrl = process.env.OPENMRS_API_URL_ALT; 
    const url = `${baseUrl}/Location?_summary=data&_tag=main%20store%2Cmain%20pharmacy%2Cdispensary`;

    console.log(`[DEBUG] Requesting URL: ${url}`);
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/fhir+json',
                'Cookie': `JSESSIONID=${jsessionid}`,
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            console.error(`[DEBUG] Response Error: ${response.status} ${response.statusText}`);
            
            // Try to read response body for more details
            try {
                const errorText = await response.text();
                console.error(`[DEBUG] Response Body: ${errorText}`);
            } catch (e) {
                console.error("[DEBUG] Could not read error response body");
            }
            
            if (response.status === 401 || response.status === 403) {
                cookieStore.delete('JSESSIONID');
                redirect("/login");
            }
            throw new Error(`FHIR API Error: ${response.status}`);
        }

        const data: FhirBundleResponse = await response.json();
        
        // Debug log the entire response structure
        console.log(`[DEBUG] API Response Structure:`, {
            resourceType: data.resourceType,
            total: data.total,
            hasEntries: !!data.entry,
            entryCount: data.entry?.length || 0,
            firstEntry: data.entry?.[0]?.resource
        });

        if (!data.entry || data.entry.length === 0) {
            console.warn("[DEBUG] Request successful but 0 entries returned.");
            return [];
        }

        console.log(`[DEBUG] Found ${data.entry.length} locations matching tags.`);
        
        // Log each location for debugging
        data.entry.forEach((item, index) => {
            console.log(`[DEBUG] Location ${index + 1}:`, {
                id: item.resource.id,
                name: item.resource.name,
                status: item.resource.status
            });
        });

        // Mapping to the format your frontend expects
        return data.entry.map(item => ({
            uuid: item.resource.id,
            display: item.resource.name,
        }));
        
    } catch (error) {
        if (isRedirectError(error)) throw error;
        console.error("[DEBUG] Catch Block Error:", error);
        throw new Error("Could not fetch pharmacy locations.");
    }
}