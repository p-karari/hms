'use server';

import { getAuthHeaders, redirectToLogin } from '../auth/auth';

export interface OpenMRSSession {
  authenticated: boolean;
  user: {
    uuid: string;
    display: string;
    username: string | null;
    systemId: string;
    person: {
      uuid: string;
      display: string;
    };
    privileges: Array<{
      uuid: string;
      display: string;
    }>;
    roles: Array<{
      uuid: string;
      display: string;
      name?: string;
    }>;
    userProperties?: Record<string, any>;
  };
  sessionLocation: {
    uuid: string;
    display: string;
  };
  locale: string;
  allowedLocales: string[];
  currentProvider?: {
    uuid: string;
    display: string;
  };
}

/**
 * Fetch current session from OpenMRS
 */
export async function getOpenMRSSession(): Promise<OpenMRSSession | null> {
  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return null;
  }

  const baseUrl = process.env.OPENMRS_API_URL;
  const endpoint = `${baseUrl}/session`;

  try {
    const response = await fetch(endpoint, { headers });
    
    if (!response.ok) {
      console.error(`Failed to fetch session: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data as OpenMRSSession;
  } catch (error) {
    console.error('Error fetching session:', error);
    return null;
  }
}