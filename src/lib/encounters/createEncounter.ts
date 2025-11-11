'use server';

import { getAuthHeaders } from '@/lib/auth/auth';
import { getEncounterTypeUuid } from './encounterType';
import { getEncounterRoleUuid } from './encounterRole';
import { getCareSettingUuid } from '../config/careSetting';
import { getPatientActiveVisit } from '../visits/getActiveVisit';
import { SessionContextType } from '../context/session-context';

interface CreateEncounterOptions {
  patientUuid: string;
  encounterTypeName: string;
  sessionData: SessionContextType;
}


export async function createEncounter({ patientUuid, encounterTypeName, sessionData }: CreateEncounterOptions): Promise<string> {
  if (!sessionData.isAuthenticated || !sessionData.user.uuid) {
    throw new Error('User must be authenticated to create an encounter.');
  }

  const activeVisit = await getPatientActiveVisit(patientUuid);
  if (!activeVisit) {
    throw new Error('Cannot create encounter: Patient does not have an active visit.');
  }

  const [encounterTypeUuid, encounterRoleUuid] = await Promise.all([
    getEncounterTypeUuid(encounterTypeName),
    getEncounterRoleUuid('Clinician'), 
    getCareSettingUuid('Outpatient'), 
  ]);
const ordererUuid = process.env.NEXT_PUBLIC_DEFAULT_PROVIDER_UUID;
if (!ordererUuid) {
    throw new Error("Default provider UUID is not set in environment variables.");
}
  const providerUuid = ordererUuid;

  const nowISO = new Date().toISOString();
  const encounterPayload = {
    patient: patientUuid,
    visit: activeVisit.uuid,
    encounterType: encounterTypeUuid,
    encounterProviders: [
      {
        provider: providerUuid,
        encounterRole: encounterRoleUuid
      }
    ],
    location: sessionData.sessionLocation?.uuid || '', 
    encounterDatetime: nowISO,
  };

  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
    headers['Content-Type'] = 'application/json';
  } catch {
    throw new Error('Failed to authenticate while creating encounter.');
  }

  const url = `${process.env.OPENMRS_API_URL}/encounter`;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(encounterPayload),
    cache: 'no-store',
  });

  if (response.status !== 201) {
    const text = await response.text();
    console.error(`OpenMRS API Error ${response.status}: ${text.substring(0, 500)}`);
    throw new Error(`Failed to create encounter: HTTP ${response.status}`);
  }

  const data: { uuid: string } = await response.json();
  return data.uuid;
}
