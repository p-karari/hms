'use server';

import { getAuthHeaders, redirectToLogin } from "../auth/auth";
import { getOpenMRSSessionDetails } from "../openmrs-api/session";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export interface DiagnosisData {
  encounter: string;
  patient: string;
  diagnosis: {
    coded: string;
  };
  condition: null,
  certainty: "PROVISIONAL" | "CONFIRMED";
  rank: number;
}

export interface SubmitDiagnosisResponse {
  uuid: string;
  display: string;
  diagnosis: {
    coded: {
      uuid: string;
      display: string;
    };
  };
  certainty: string;
  rank: number;
  encounter: {
    uuid: string;
    display: string;
  };
  patient: {
    uuid: string;
    display: string;
  };
}

export async function submitDiagnosis(payload: DiagnosisData): Promise<SubmitDiagnosisResponse> {
  const baseUrl = process.env.OPENMRS_API_URL;
  const url = `${baseUrl}/patientdiagnoses`;

  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
  }

  await getOpenMRSSessionDetails();

  try {
    console.log("🩺 SUBMITTING DIAGNOSIS PAYLOAD:", JSON.stringify(payload, null, 2));
    const headers = await getAuthHeaders();
    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) redirectToLogin();
      const errorDetail = await response.text();
      throw new Error(`Diagnosis submission failed: ${errorDetail.substring(0, 200)}...`);
    }

    const json = await response.json();
    return json;
  } catch (error: unknown) {
    if (isRedirectError(error)) throw error;

    if (error instanceof Error)
      console.error("Error submitting diagnosis:", error.message);
    else
      console.error("Error submitting diagnosis (unknown type):", error);

    throw new Error("Could not submit diagnosis due to a network or server issue.");
  }
}

// Search for diagnosis concepts
export interface ConceptSearchResult {
  uuid: string;
  display: string;
}

export async function searchDiagnosisConcepts(searchTerm: string): Promise<ConceptSearchResult[]> {
  const baseUrl = process.env.OPENMRS_API_URL;
  const url = `${baseUrl}/concept?name=${encodeURIComponent(searchTerm)}&searchType=fuzzy&class=8d4918b0-c2cc-11de-8d13-0010c6dffd0f&v=custom:(uuid,display)`;

  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
  }

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...headers,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) redirectToLogin();
      const errorDetail = await response.text();
      throw new Error(`Diagnosis concept search failed: ${errorDetail.substring(0, 200)}...`);
    }

    const data: { results: ConceptSearchResult[] } = await response.json();
    return data.results;
  } catch (error: unknown) {
    if (isRedirectError(error)) throw error;

    if (error instanceof Error)
      console.error("Error searching diagnosis concepts:", error.message);
    else
      console.error("Error searching diagnosis concepts (unknown type):", error);

    throw new Error("Could not search diagnosis concepts due to a network or server issue.");
  }
}