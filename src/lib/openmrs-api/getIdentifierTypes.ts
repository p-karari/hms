'use server'


import { getAuthHeaders, redirectToLogin } from "../auth/auth"

export interface IdentifierType {
    uuid: string;
    display: string;
    name: string;
    description: string | null;
    // Add other properties if needed, e.g., format, formatDescription
}

// 2. Define the structure for the full API response object (standard OpenMRS REST format)
export interface IdentifierTypeApiResponse {
    results: IdentifierType[];
    // Add other top-level properties if needed, e.g., links
}

let IDENTIFIER_TYPES_CACHE: IdentifierType[] | null = null;
export default async function getIdentifierTypes() {
    if (IDENTIFIER_TYPES_CACHE) return IDENTIFIER_TYPES_CACHE;
    let headers;
    try {
        headers = await getAuthHeaders()
        return headers;
    } catch (error) {
        redirectToLogin();
        console.log(error)
    }
    
    try {
        const url = `${process.env.OPENMRS_API_URL}/patientidentifiertype`
        const response = await fetch((url), {
            method: 'GET',
            headers: {
                ...headers,
                Accept: 'application/json',
                'Content-type': 'application/json'
            },
            cache: 'no-store',
            
        });
        if (!response.ok) {
            const err  = await response.text();
            throw new Error(`failed to feth identifier types: ${err}`)
        }
        
        const data = await response.json()
        IDENTIFIER_TYPES_CACHE = data;
        return data;
    } catch (error) {
        throw new Error(`Error getting identifier types: ${error}`)
    }
}