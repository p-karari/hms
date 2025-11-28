'use server';

import { getAuthHeaders, redirectToLogin } from '../auth/auth';

/** * API Response interfaces 
 */
interface VisitResult {
  uuid: string;
  startDatetime: string;
  stopDatetime: string | null;
  patient: {
    uuid: string;
    identifiers: Array<{
      identifier: string;
      uuid: string;
    }>;
    person: {
      age: number;
      display: string;
      gender: string;
      uuid: string;
    };
  };
  visitType: {
    uuid: string;
    name: string;
    display: string;
  };
  location: {
    uuid: string;
    name: string;
    display: string;
  };
}

export interface VisitSummary {
  totalCount: number;
  activeCount: number;
  inactiveCount: number;
  visits: VisitResult[];
}

export async function getDailyVisitStats(locationUuid?: string): Promise<VisitSummary> {
  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch (error) {
    console.error('Failed to get auth headers:', error);
    redirectToLogin();
    // Return empty data after redirect
    return {
      totalCount: 0,
      activeCount: 0,
      inactiveCount: 0,
      visits: [],
    };
  }

  // Get current date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  // Build query parameters
  const params = new URLSearchParams({
    includeInactive: 'true',
    includeParentLocations: 'true',
    fromStartDate: today,
    v: 'custom:(uuid,patient:(uuid,identifiers:(identifier,uuid),person:(age,display,gender,uuid)),visitType:(uuid,name,display),location:(uuid,name,display),startDatetime,stopDatetime)'
  });

  // Add location filter if provided
  if (locationUuid) {
    params.append('location', locationUuid);
  }

  const url = `${process.env.OPENMRS_API_URL}/visit?${params.toString()}`;

  try {
    const response = await fetch(url, { headers, cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`OpenMRS API responded with ${response.status}`);
    }

    const data = await response.json();
    const allVisits: VisitResult[] = data.results || [];

    // Separate active and inactive based on the presence of stopDatetime
    const activeVisits = allVisits.filter(v => v.stopDatetime === null);
    const inactiveVisits = allVisits.filter(v => v.stopDatetime !== null);

    return {
      totalCount: allVisits.length,
      activeCount: activeVisits.length,
      inactiveCount: inactiveVisits.length,
      visits: allVisits,
    };

  } catch (error) {
    console.error('Failed to fetch daily visits:', error);
    return {
      totalCount: 0,
      activeCount: 0,
      inactiveCount: 0,
      visits: [],
    };
  }
}