'use server';

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";


async function authenticateAndGetSessionId(): Promise<string> {
    const cookieStore = await cookies();
    const jsessionid = cookieStore.get('JSESSIONID');
    
    if (!jsessionid || !jsessionid.value) {
        cookieStore.delete('JSESSIONID');
        redirect('/login');
    }
    return jsessionid.value;
}


export async function getActiveEncounterUuid(patientUuid: string): Promise<string | null> {
    if (!patientUuid) {
        console.error("Patient UUID is required to fetch active encounter.");
        return null;
    }


    const url = `${process.env.OPENMRS_API_URL}/encounter?patient=${patientUuid}&v=custom:(uuid,encounterDatetime,encounterType,visit:(uuid,stopDatetime))&limit=1`;

    try {
        const jsessionidValue = await authenticateAndGetSessionId();
        const cookieStore = cookies(); 

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Cookie': `JSESSIONID=${jsessionidValue}`
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                (await cookieStore).delete('JSESSIONID');
                redirect('/login');
            }
            const errorDetail = await response.text();
            throw new Error(`OpenMRS API Error: HTTP ${response.status}. Detail: ${errorDetail.substring(0, 100)}...`);
        }

        const data: { results: any[] } = await response.json();

        if (data.results.length === 0) {
            return null;
        }
        
        const mostRecentEncounter = data.results[0];
        

        if (mostRecentEncounter.stopDate === null) {
            return mostRecentEncounter.uuid;
        }

        return null;

    } catch (error) {
        if (isRedirectError(error)) {
            throw error;
        }
        console.error("Error fetching active encounter:", error);
        return null; 
    }
}