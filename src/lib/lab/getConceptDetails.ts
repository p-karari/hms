// actions/lab-orders/getConceptDetails.ts
'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
import { ConceptDetails } from './lab-order';

export async function getConceptDetails(conceptUuid: string): Promise<ConceptDetails | null> {
  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return null;
  }

  const apiBaseUrl = process.env.OPENMRS_API_URL;
  const url = `${apiBaseUrl}/concept/${conceptUuid}?v=custom:(uuid,display,name,datatype,set,answers,hiNormal,hiAbsolute,hiCritical,lowNormal,lowAbsolute,lowCritical,units,allowDecimal,setMembers:(uuid,display,answers,datatype,hiNormal,hiAbsolute,hiCritical,lowNormal,lowAbsolute,lowCritical,units,allowDecimal))`;
  
  try {
    const response = await fetch(url, { headers, cache: 'force-cache' });
    
    if (!response.ok) {
      console.error(`Failed to fetch concept ${conceptUuid}:`, response.status);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching concept ${conceptUuid}:`, error);
    return null;
  }
}

export async function getTestFormFields(conceptUuid: string) {
  const concept = await getConceptDetails(conceptUuid);
  
  if (!concept) {
    return { concept: null, fields: [] };
  }
  
  // If it's a panel (set = true), use setMembers as fields
  if (concept.set && concept.setMembers && concept.setMembers.length > 0) {
    return {
      concept,
      fields: concept.setMembers.map((member: any) => ({
        conceptUuid: member.uuid,
        display: member.display,
        datatype: member.datatype.display,
        units: member.units,
        allowDecimal: member.allowDecimal,
        answers: member.answers || [],
        lowNormal: member.lowNormal,
        hiNormal: member.hiNormal,
        lowAbsolute: member.lowAbsolute,
        hiAbsolute: member.hiAbsolute
      }))
    };
  }
  
  // If it's a single test, the concept itself is the field
  return {
    concept,
    fields: [{
      conceptUuid: concept.uuid,
      display: concept.display,
      datatype: concept.datatype.display,
      units: concept.units,
      allowDecimal: concept.allowDecimal,
      answers: concept.answers || [],
      lowNormal: concept.lowNormal,
      hiNormal: concept.hiNormal,
      lowAbsolute: concept.lowAbsolute,
      hiAbsolute: concept.hiAbsolute
    }]
  };
}