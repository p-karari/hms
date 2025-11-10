'use server'
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

export interface NewPatientPayload {
    person: {
        names: Array<{ givenName: string; familyName: string; preferred: boolean; }>;
        gender: string;
        birthdate: string;
        addresses: Array<{ address1: string; cityVillage: string; stateProvince: string; country: string; preferred: boolean; }>;
    };
    identifiers: Array<{
        identifier: string;
        identifierType: string;
        location: string;
        preferred: boolean;
    }>;
}

export interface OpenMRSConfig {
    primaryIdentifierTypeUuid: string;
    locationUuid: string;
}


//searchpatients
export async function searchPatients(query:string) {
    console.log("search patients function running")
    const url = `${process.env.OPENMRS_API_URL}/patient?q=${query}&v=full`;
    const cookieStore = await cookies();
    const jsessionid = cookieStore.get('JSESSIONID')?.value;
    if (!jsessionid) {
        cookieStore.delete('JSESSIONID');
        redirect('/login')
    }
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Cookie': `JSESSIONID=${jsessionid}`
            },
            cache: 'no-store'
        })
        if (!response.ok ) {
            if (response.status === 401 || response.status === 403) {
                cookieStore.delete('JSESSIONID');
                redirect('/login');
            }
            const errorDetail = await response.text();
            throw new Error(`OpenMRS API Error: HTTP ${response.status}. Detail: ${errorDetail.substring(0, 100)}...`)
        }
        const data = await response.json();
        // console.log(data);
        return data;
    } catch (error) {
        if (isRedirectError(error)) {
            throw error
        }

        console.log("searchPatients Function end")

        throw new Error("Could not search patients due to a network or server issue.")        
    }
    
}

//registerpatients

const fetchConfigurationUuids = cache(async (): Promise<OpenMRSConfig> => {
    const baseUrl = process.env.OPENMRS_API_URL;
    const cookieStore = await cookies();
    const jsessionid = cookieStore.get('JSESSIONID')?.value;

    if (!jsessionid) {
        throw new Error("Session invalid during configuration fetch.");
    }

    const identifierTypeUrl = `${baseUrl}/patientidentifiertype?q=OpenMRS%20ID&v=full`;
    const typeResponse = await fetch(identifierTypeUrl, {
        headers: { 'Accept': 'application/json', 'Cookie': `JSESSIONID=${jsessionid}` },
        cache: 'force-cache' 
    });
    const typeData = await typeResponse.json();
    const primaryIdentifierTypeUuid = typeData.results?.[0]?.uuid;
    if (!primaryIdentifierTypeUuid) {
        throw new Error("Could not find required 'OpenMRS ID' patient identifier type UUID.");
    }

    
    const locationUrl = `${baseUrl}/location?q=Unknown&v=full`; 
    const locationResponse = await fetch(locationUrl, {
        headers: { 'Accept': 'application/json', 'Cookie': `JSESSIONID=${jsessionid}` },
        cache: 'force-cache' 
    });
    const locationData = await locationResponse.json();
    const locationUuid = locationData.results?.[0]?.uuid;
    if (!locationUuid) {
        throw new Error("Could not find a default location UUID (searched for 'Unknown').");
    }

    return { primaryIdentifierTypeUuid, locationUuid };
});


export async function registerpatients(formData: FormData) {
    const url = `${process.env.OPENMRS_API_URL}/patient`
    const cookieStore = await cookies();
    const jsessionid = cookieStore.get('JSESSIONID')?.value;

    if (!jsessionid) {
        cookieStore.delete('JSESSIONID');
        redirect('/login')
    }

    try {
        const { primaryIdentifierTypeUuid, locationUuid } = await fetchConfigurationUuids();
        
        const identifierValue = formData.get('identifierValue') as string || `TEMP-${Date.now()}`;
        
        const patientData: NewPatientPayload = {
            person: {
                names: [{
                    givenName: formData.get('givenName') as string,
                    familyName: formData.get('familyName') as string,
                    preferred: true,
                }],
                gender: formData.get('gender') as string,
                birthdate: formData.get('birthdate') as string,
                addresses: [{
                    address1: formData.get('address1') as string,
                    cityVillage: formData.get('cityVillage') as string,
                    stateProvince: formData.get('stateProvince') as string,
                    country: formData.get('country') as string,
                    preferred: true,
                }],
            },
            identifiers: [{
                identifier: identifierValue,
                identifierType: primaryIdentifierTypeUuid, // Dynamic UUID
                location: locationUuid,                   // Dynamic UUID
                preferred: true,
            }],
        };
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Cookie': `JSESSIONID=${jsessionid}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(patientData),
            cache: 'no-store'
        })
        
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                cookieStore.delete('JSESSIONID');
                redirect('/login')
            }
            const errorDetail = await response.json();
            throw new Error(`Registration failed: ${errorDetail?.error?.message || response.statusText}`);
        }
        
        const data = await response.json();
        return data;
        
    } catch (error) {
        if (isRedirectError(error)) {
            throw error;
        }
        throw new Error("Could not register patient due to a network or server issue.");
    }
}

export async function getPatientDetails(UUID:string) {
    const url = `${process.env.OPENMRS_API_URL}/patient/${UUID}?v=full`;
    const cookieStore = await cookies();
    const jsessionid = cookieStore.get('JSESSIONID')?.value;
    if (!jsessionid) {
        cookieStore.delete('JSESSIONID');
        redirect('/login');
    }
    console.log("getPatientDetails function has started")

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Cookie': `JSESSIONID=${jsessionid}`,
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
        console.log("getPatientDetails function end");
        throw new Error("Could not get patient details due to a network or server issue.")
    }
}