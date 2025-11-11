'use server'

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export async function getEncounterTypeUuid(encounterTypeName: string) {
    const url = `${process.env.OPENMRS_API_URL}/encountertype?q=${encodeURIComponent(encounterTypeName)}&v=custom:(uuid)`; 
    
    const cookieStore = await cookies();
    const jsessionid = cookieStore.get('JSESSIONID');
    
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
            cache: 'no-store' 
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                cookieStore.delete('JSESSIONID'); 
                redirect('/login');
            }
            const errorDetail = await response.text();
            throw new Error(`OpenMRS API Error (Encounter Type Lookup): HTTP ${response.status}. Detail: ${errorDetail.substring(0, 100)}...`)
        }

        const data: { results: Array<{ uuid: string }> } = await response.json();

        if (data.results.length === 0) {
            throw new Error(`No encounter type found matching: ${encounterTypeName}. System configuration missing.`);
        }

        return data.results[0].uuid;

    } catch (error: unknown) {
        if (isRedirectError(error)) {
            throw error;
        }
        console.error("Error fetching encounter type UUID:", error);
        throw new Error(`Could not fetch UUID for encounter type: ${encounterTypeName}.`)
    }
}
