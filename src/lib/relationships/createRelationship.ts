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

export async function createRelationship(formData: FormData, patientUuid: string) {
  const baseUrl = process.env.OPENMRS_API_URL;
  const headers = await getAuthHeaders();

  let relatedPersonUuid = formData.get('relatedPersonUuid')?.toString();
  const relationshipType = formData.get('relationshipType')?.toString();

  // 1. If no existing UUID, create a new Person record for the relative first
  if (!relatedPersonUuid && formData.get('relatedGivenName')) {
    const personPayload = {
      names: [{ 
        givenName: formData.get('relatedGivenName'), 
        familyName: formData.get('relatedFamilyName') 
      }],
      gender: formData.get('relatedGender') || 'U',
    };

    const personRes = await fetch(`${baseUrl}/person`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(personPayload),
    });
    
    const personData = await personRes.json();
    relatedPersonUuid = personData.uuid;
  }

  if (!relatedPersonUuid || !relationshipType) return null;

  // 2. Create the relationship link
  const relationshipPayload = {
    personA: relatedPersonUuid, // The Relative
    personB: patientUuid,       // The New Patient
    relationshipType: relationshipType,
  };

  const response = await fetch(`${baseUrl}/relationship`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(relationshipPayload),
  });

  return await response.json();
}