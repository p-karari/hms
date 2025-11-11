'use server'

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";


interface EncounterProvider {
    provider: string;     
    encounterRole: string; 
}


export interface ObsPayload {
    concept: string;     
    value: unknown;          
    obsDatetime?: string;
    comment?: string;
    groupMembers?: ObsPayload[];
}


export interface SubmitEncounterData {
    patient: string;           
    encounterDatetime: string; 
    encounterType: string;     
    location: string;         
    encounterProviders?: EncounterProvider[]; 
    visit?: string;            
    obs?: ObsPayload[];        
    orders?: string[];
}


async function authenticateAndGetSessionId(): Promise<string> {
    const cookieStore = await cookies();
    const jsessionid = cookieStore.get('JSESSIONID');
    
    if (!jsessionid || !jsessionid.value) {
        cookieStore.delete('JSESSIONID');

        redirect('/login');
    }
    return jsessionid.value;
}


export async function getEncounterforms() {
    const url = `${process.env.OPENMRS_API_URL}/form?v=full`; 
    
    try {
        const jsessionidValue = await authenticateAndGetSessionId();
        const cookieStore = await cookies(); 

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Cookie': `JSESSIONID=${jsessionidValue}`
            },
            cache: 'no-store'
        })
        
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                cookieStore.delete('JSESSIONID'); 
                redirect('/login');
            }
            const errorDetail = await response.text();
            throw new Error(`OpenMRS API Error: HTTP ${response.status}. Detail: ${errorDetail.substring(0, 100)}...`);
        }
        
        const data = await response.json();
        return data; 
        
    } catch (error) {
        if (isRedirectError(error)) {
            throw error;
        }
        console.error(error);
        throw new Error("Could not get encounter forms due to a network or server issue.");
    }
}



export async function submitEncounter(encounterData: SubmitEncounterData) {
    const url = `${process.env.OPENMRS_API_URL}/encounter`;
    
    try {
        const jsessionidValue = await authenticateAndGetSessionId();
        const cookieStore = await cookies(); 

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Cookie': `JSESSIONID=${jsessionidValue}`
            },
            body: JSON.stringify(encounterData), 
            cache: 'no-store'
        })
        
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                cookieStore.delete('JSESSIONID');
                redirect('/login');
            }
            const errorDetail = await response.text();
            throw new Error(`Encounter Submission Error: HTTP ${response.status}. Detail: ${errorDetail.substring(0, 200)}...`);
        }
        
        const data = await response.json();
        return data; 

    } catch (error) {
        if (isRedirectError(error)) {
            throw error;
        }
        console.error("Error submitting encounter:", error);
        throw new Error("Could not submit the clinical encounter due to an issue with the data or the server.");
    }
}