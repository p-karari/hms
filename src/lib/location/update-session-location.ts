'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { CurrentSessionLocation } from './location';

export async function updateSessionLocation(formData: FormData): Promise<CurrentSessionLocation> {
  const locationUuid = formData.get('locationUuid');
  const cookieStore = await cookies();
  const jsessionid = cookieStore.get('JSESSIONID')?.value;
  const baseUrl = process.env.OPENMRS_API_URL;

  if (!jsessionid) {
    cookieStore.delete('JSESSIONID');
    redirect('/login');
  }

  if (!locationUuid || typeof locationUuid !== 'string') {
    throw new Error('Invalid or missing location ID provided for session');
  }
  console.log(`[Session Action] Attempting to set session location to UUID: ${locationUuid}`);
  try {
    const postResponse = await fetch(`${baseUrl}/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `JSESSIONID=${jsessionid}`,
      },
      body: JSON.stringify({ sessionLocation: locationUuid }),
    });

    if (postResponse.status === 401 || postResponse.status === 403) {
      cookieStore.delete('JSESSIONID');
      redirect('/login');
    }

    if (!postResponse.ok && postResponse.status !== 204) {
      const detail = await postResponse.text();
      throw new Error(`Failed to update OpenMRS session: ${postResponse.status} ${detail}`);
    }

    const getResponse = await fetch(`${baseUrl}/session`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Cookie: `JSESSIONID=${jsessionid}`,
      },
    });

    if (!getResponse.ok) {
      const detail = await getResponse.text();
      throw new Error(`Failed to retrieve updated session: ${getResponse.status} ${detail}`);
    }

    const data = await getResponse.json();

    if (data?.sessionLocation?.uuid) {
        console.log(`[Session Action] Successfully confirmed new location: ${data.sessionLocation.display} (${data.sessionLocation.uuid})`);      return {
        uuid: data.sessionLocation.uuid,
        display: data.sessionLocation.display,
        
      };
    } else {
      throw new Error('Session updated but no sessionLocation found in response.');
    }
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error('Error setting session location for client update', error);
    throw new Error('Could not update the session location. Please try again.');
  }
}
