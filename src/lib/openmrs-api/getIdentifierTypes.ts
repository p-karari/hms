'use server';

import { getAuthHeaders, redirectToLogin } from "../auth/auth";

export interface IdentifierType {
  uuid: string;
  display: string;
  name: string;
  description: string | null;
}

export interface IdentifierTypeApiResponse {
  results: IdentifierType[];
}

let IDENTIFIER_TYPES_CACHE: IdentifierType[] | null = null;

export default async function getIdentifierTypes(): Promise<IdentifierTypeApiResponse | null> {
  if (IDENTIFIER_TYPES_CACHE) {
    return { results: IDENTIFIER_TYPES_CACHE };
  }

  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch (error) {
    redirectToLogin();
    console.error("Auth error while fetching identifier types:", error);
    return null;
  }

  try {
    const baseUrl = process.env.OPENMRS_API_URL;
    const url = `${baseUrl}/patientidentifiertype?v=full`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...headers,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Failed to fetch identifier types: ${err}`);
    }

    const data: IdentifierTypeApiResponse = await response.json();
    IDENTIFIER_TYPES_CACHE = data.results; 
    return data;
  } catch (error) {
    console.error("Error getting identifier types:", error);
    return null;
  }
}
