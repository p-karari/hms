'use server';

import { getAuthHeaders, redirectToLogin } from '../auth/auth';

export interface Role {
  uuid: string;
  display: string;
  name?: string;
}

/**
 * Get current user's roles from session
 */
export async function getUserRoles(): Promise<Role[]> {
  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return [];
  }

  const baseUrl = process.env.OPENMRS_API_URL;
  const sessionEndpoint = `${baseUrl}/session`;

  try {
    const response = await fetch(sessionEndpoint, { headers });
    
    if (!response.ok) {
      console.error(`Failed to fetch session: ${response.status}`);
      return [];
    }

    const sessionData = await response.json();
    return sessionData.user?.roles || [];
    
  } catch (error) {
    console.error('Error fetching user roles:', error);
    return [];
  }
}

/**
 * Check if user has specific role
 */
export async function userHasRole(roleName: string): Promise<boolean> {
  const roles = await getUserRoles();
  return roles.some(role => 
    role.display?.toLowerCase() === roleName.toLowerCase() ||
    role.name?.toLowerCase() === roleName.toLowerCase()
  );
}

/**
 * Get all available roles in the system
 */
export async function getAllSystemRoles(): Promise<Role[]> {
  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return [];
  }

  const baseUrl = process.env.OPENMRS_API_URL;
  const endpoint = `${baseUrl}/role?v=default`;

  try {
    const response = await fetch(endpoint, { headers });
    const data = await response.json();
    
    return data.results || [];
  } catch (error) {
    console.error('Error fetching all roles:', error);
    return [];
  }
}