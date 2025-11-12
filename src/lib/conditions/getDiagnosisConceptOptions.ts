'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';

export interface DiagnosisConceptOption {
    uuid: string;
    display: string;
}


export async function getDiagnosisConceptOptions(searchTerm: string): Promise<DiagnosisConceptOption[]> {
    if (!searchTerm) return [];

    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        return [];
    }

    const url = `${process.env.OPENMRS_API_URL}/concept?name=${encodeURIComponent(
        searchTerm
    )}&searchType=fuzzy&class=8d4918b0-c2cc-11de-8d13-0010c6dffd0f&v=custom:(uuid,display)`;

    try {
        const response = await fetch(url, {
            headers,
            cache: 'no-store',
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch concepts: HTTP ${response.status}`);
        }

        const data: { results: any[] } = await response.json();

        return data.results.map((c) => ({
            uuid: c.uuid,
            display: c.display,
        }));
    } catch (error) {
        console.error('Error fetching diagnosis concepts:', error);
        return [];
    }
}
