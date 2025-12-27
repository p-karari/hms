'use server';

import { getAuthHeaders, redirectToLogin } from '../auth/auth';
import { validatePasswordStrength } from './validatePassword';

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
}

/**
 * Change password action - OpenMRS will handle permission validation server-side
 * @param data - Old and new password
 */
export async function changePassword(
  data: ChangePasswordRequest
): Promise<ChangePasswordResponse> {
  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return { success: false, message: 'Authentication failed. Please log in again.' };
  }

  // Validate password requirements
  if (!data.oldPassword || !data.newPassword) {
    return {
      success: false,
      message: 'Both old and new passwords are required.',
    };
  }

  if (data.oldPassword === data.newPassword) {
    return {
      success: false,
      message: 'New password must be different from old password.',
    };
  }

  // Add password strength validation
  const strengthCheck = validatePasswordStrength(data.newPassword);
  if (!strengthCheck.isValid) {
    return {
      success: false,
      message: `Password must have: ${strengthCheck.messages.join(', ')}.`,
    };
  }

  const baseUrl = process.env.OPENMRS_API_URL;
  const endpoint = `${baseUrl}/password`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        oldPassword: data.oldPassword,
        newPassword: data.newPassword,
      }),
    });

    if (response.ok) {
      return {
        success: true,
        message: 'Password changed successfully.',
      };
    }

    // Handle specific OpenMRS error responses
    const errorHandlers: Record<number, () => Promise<ChangePasswordResponse>> = {
      401: async () => ({
        success: false,
        message: 'Current password is incorrect.',
      }),
      
      403: async () => ({
        success: false,
        message: 'Permission denied. You may need additional privileges.',
      }),
      
      400: async () => {
        try {
          const errorData = await response.json();
          return {
            success: false,
            message: errorData.error?.message || 'Invalid password format or requirements not met.',
            errors: errorData.errors,
          };
        } catch {
          return {
            success: false,
            message: 'Invalid request format.',
          };
        }
      },
    };

    if (errorHandlers[response.status]) {
      return await errorHandlers[response.status]();
    }

    return {
      success: false,
      message: `Failed to change password. Server responded with status: ${response.status}`,
    };

  } catch (error) {
    console.error('Error changing password:', error);
    return {
      success: false,
      message: 'Network error. Please check your connection and try again.',
    };
  }
}

/**
 * Fetch all privileges from OpenMRS
 * Useful for debugging or displaying available privileges
 */
export async function getAllPrivileges(): Promise<Array<{ uuid: string; display: string }>> {
  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return [];
  }

  const baseUrl = process.env.OPENMRS_API_URL;
  const endpoint = `${baseUrl}/privilege?v=default`;

  try {
    const response = await fetch(endpoint, { headers });
    const data = await response.json();
    
    return data.results || [];
  } catch (error) {
    console.error('Error fetching privileges:', error);
    return [];
  }
}