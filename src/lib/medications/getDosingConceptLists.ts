'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
import { ConceptReference } from './getPatientMedicationOrders';

export type DosingConceptOption = ConceptReference;

export interface DosingConceptLists {
    doseUnits: DosingConceptOption[];
    routes: DosingConceptOption[];
    frequencies: DosingConceptOption[];
    quantityUnits: DosingConceptOption[];
}

// --- Helper for API Error Checking (Matching your structure) ---
async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to fetch concept data for ${source}: HTTP ${response.status}.`);
}

/**
 * Executes a two-step lookup to find a Concept Set's members:
 * 1. Finds the parent Concept UUID by its display name.
 * 2. Fetches the set members (the list options) using that UUID.
 * @param conceptSetName The display name of the concept set (e.g., "Drug Dosing Units").
 * @param headers Authentication headers.
 */
async function getConceptSetMembersByName(conceptSetName: string, headers: Record<string, string>): Promise<DosingConceptOption[]> {
    const apiBaseUrl = process.env.OPENMRS_API_URL;
    const encodedName = encodeURIComponent(conceptSetName);

    // Step 1: Search for the parent Concept UUID by name
    const searchUrl = `${apiBaseUrl}/concept?q=${encodedName}&v=custom:(uuid)`;
    const searchResponse = await fetch(searchUrl, { headers, cache: 'force-cache' });

    if (!searchResponse.ok) {
        await handleApiError(searchResponse, `Search for ${conceptSetName}`);
        return [];
    }

    const searchData: { results: Array<{ uuid: string }> } = await searchResponse.json();
    const parentConcept = searchData.results.find(c => c.uuid.length > 0);

    if (!parentConcept) {
        console.warn(`Concept Set not found for name: ${conceptSetName}`);
        return [];
    }
    
    // Step 2: Fetch the set members using the found UUID
    const fetchMembersUrl = `${apiBaseUrl}/concept/${parentConcept.uuid}?v=custom:(setMembers:(uuid,display))`;
    const membersResponse = await fetch(fetchMembersUrl, { headers, cache: 'force-cache' });

    if (!membersResponse.ok) {
        await handleApiError(membersResponse, `Fetch members for ${conceptSetName}`);
        return [];
    }

    const membersData: any = await membersResponse.json();
    
    return (membersData.setMembers || []).map((item: any) => ({
        uuid: item.uuid,
        display: item.display
    }));
}

// --- Helper to search individual frequency concepts case-insensitively ---
async function searchFrequencyConcepts(headers: Record<string, string>): Promise<DosingConceptOption[]> {
    const apiBaseUrl = process.env.OPENMRS_API_URL;
    const searchTerms = [
        "once daily", "daily", "twice daily", "three times daily", "every 8 hours",
        "every 12 hours", "every 6 hours", "every 24 hours", "weekly",
        "monthly", "as needed", "prn", "every other day"
    ];

    const searchPromises = searchTerms.map(async term => {
        const encoded = encodeURIComponent(term);
        const res = await fetch(`${apiBaseUrl}/concept?q=${encoded}&v=full`, { headers, cache: 'no-store' });
        if (!res.ok) return [];

        const data = await res.json();
        return (data.results || []).filter((c: any) => {
            const display = (c.display || '').toLowerCase();
            const t = term.toLowerCase();
            return display.includes(t) || t.includes(display);
        }).map((c: any) => ({ uuid: c.uuid, display: c.display }));
    });

    const results = await Promise.all(searchPromises);
    const flattened = results.flat();

    // Deduplicate by UUID
    const seen = new Set();
    const deduped = flattened.filter(item => {
        if (seen.has(item.uuid)) return false;
        seen.add(item.uuid);
        return true;
    });

    return deduped;
}

export async function getDosingConceptLists(): Promise<DosingConceptLists> {
    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        return { doseUnits: [], routes: [], frequencies: [], quantityUnits: [] };
    }
    
    const conceptSetsToFetch = {
        doseUnits: "Dosing unit",
        routes: "Routes of administration",
        frequencies: "Dosing Frequency",
        quantityUnits: "Dispensing Units",
    };

    const conceptPromises = Object.entries(conceptSetsToFetch).map(([key, name]) => {
        return getConceptSetMembersByName(name, headers)
            .then(data => ({ key: key as keyof DosingConceptLists, data }))
            .catch(error => {
                console.error(`Final error fetching ${name}:`, error);
                return { key: key as keyof DosingConceptLists, data: [] };
            });
    });

    const results = await Promise.all(conceptPromises);

    const finalLists: DosingConceptLists = results.reduce((acc, result) => {
        acc[result.key] = result.data;
        return acc;
    }, {} as DosingConceptLists);

    // If no "Dosing Frequency" concept set found, try searching individual frequency terms
    if (!finalLists.frequencies || finalLists.frequencies.length === 0) {
        console.warn('No "Dosing Frequency" concept set found — performing individual frequency search...');
        finalLists.frequencies = await searchFrequencyConcepts(headers);
    }

    return finalLists;
}
