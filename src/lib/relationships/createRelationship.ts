'use server'

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { getAuthHeaders, redirectToLogin } from "../auth/auth";


export async function getRelationshipTypes() {
     const url = `${process.env.OPENMRS_API_URL}/relationshiptype`;
     let headers;
      try {

        headers = await getAuthHeaders();
      } catch (error) {
        redirectToLogin();
        console.error(error)
      }

      try {
        const response = await fetch((url), {
            method: 'GET',
            headers: {
                ...headers,
                'Application-Type': 'application/json',
                Accept: 'application/json'
            },
            cache: "no-store"
        });
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                redirectToLogin();
            }
            const errorDetail = await response.text();
            console.error(errorDetail)
            throw new Error(`Relationship types fetch failed: ${errorDetail}`)
        }

        const data = await response.json();
        return data;
      } catch (error) {
        if (isRedirectError(error)) throw error;
        throw new Error("Could not get relationship types due to a server or network issue")
      }
}

export async function createRelationship(formData: FormData) {
    const url = `${process.env.OPENMRS_API_URL}\relationship`
    let headers;
    try {
        headers = await getAuthHeaders()
    } catch (error) {
        redirectToLogin()
        console.error(error)
    }

    const NewRelationshipPayload = {
        personA: formData.get('personA'),
        personB: formData.get('personB'),
        relationshipType: formData.get('relationshipType'),
    };

    try {
    const response = await fetch((url), {
        method: 'POST',
        headers: {
            ...headers,
            'Application-Type': 'application/json',
            Accept: 'application/json'
        },
        body: JSON.stringify(NewRelationshipPayload)
    });
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                redirectToLogin();
            }
            const errorDetail = await response.text();
            console.error(errorDetail)
            throw new Error(`Relationship creation failed: ${errorDetail}`)
        }
        const data = await response.json();
        return data;
    } catch (error) {
        if (isRedirectError(error)) throw error;
        throw new Error("Could not create relationship due to a server or network issue")
    }

    
}