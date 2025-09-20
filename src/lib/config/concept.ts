'use server'

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";

/**
 * Fetches the UUID for a specific OpenMRS concept by its name or partial name.
 * @param conceptName The name of the concept to search for (e.g., 'WEIGHT (KG)').
 * @returns The UUID of the first matching concept.
 */
export async function getConceptUuid(conceptName: string) {
    // The OpenMRS API endpoint to search for concepts
    const url = `${process.env.OPENMRS_API_URL}/concept?q=${encodeURIComponent(conceptName)}&v=custom:(uuid)`; 
    
    const cookieStore = await cookies();
    const jsessionid = cookieStore.get('JSESSIONID');
    
    // Auth Check
    if (!jsessionid || !jsessionid.value) {
        cookieStore.delete('JSESSIONID');
        redirect('/login')
    }

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Cookie': `JSESSIONID=${jsessionid.value}`
            },
            // Concepts are typically static, but we use 'no-store' to respect authentication.
            cache: 'no-store' 
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                cookieStore.delete('JSESSIONID'); 
                redirect('/login');
            }
            const errorDetail = await response.text();
            throw new Error(`OpenMRS API Error (Concept Lookup): HTTP ${response.status}. Detail: ${errorDetail.substring(0, 100)}...`)
        }

        const data: { results: Array<{ uuid: string }> } = await response.json();

        if (data.results.length === 0) {
            const responseContent = JSON.stringify(data);
            throw new Error(`No concept found matching: ${conceptName}. The system configuration may be incorrect.` + `Actual API respponse data: ${responseContent.substring(0, 150)}`);
        }

        return data.results[0].uuid;

    } catch (error: unknown) {
        if (isRedirectError(error)) {
            throw error;
        }
        console.error("Error fetching concept UUID:", error);
        throw new Error(`Could not fetch UUID for concept: ${conceptName}.`)
    }
}
