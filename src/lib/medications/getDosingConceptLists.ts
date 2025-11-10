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

async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to fetch concept data for ${source}: HTTP ${response.status}.`);
}


async function getConceptSetMembersByName(conceptSetName: string, headers: Record<string, string>): Promise<DosingConceptOption[]> {
    const apiBaseUrl = process.env.OPENMRS_API_URL;
    const encodedName = encodeURIComponent(conceptSetName);

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

    if (!finalLists.frequencies || finalLists.frequencies.length === 0) {
        console.warn('No "Dosing Frequency" concept set found — performing individual frequency search...');
        finalLists.frequencies = await searchFrequencyConcepts(headers);
    }

    return finalLists;
}
