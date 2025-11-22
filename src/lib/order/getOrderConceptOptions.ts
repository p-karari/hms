'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
import { ConceptReference } from '@/lib/medications/getPatientMedicationOrders';

export type OrderableConceptOption = ConceptReference & {
  isPanel?: boolean;
  panelUuid?: string;
  searchTerms: string[]; // All names for search
};

export interface OrderableConceptLists {
  labTests: OrderableConceptOption[];
  radiologyProcedures: OrderableConceptOption[];
  generalProcedures: OrderableConceptOption[];
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

// Helper function to extract English names from multilingual names array
// Update the extractEnglishDisplay function to be smarter about searching
function extractEnglishDisplay(
  names: Array<{ display: string }>, 
  defaultDisplay: string
): { 
  primary: string; 
  allNames: string[]; // Keep all names for search
} {
  if (!names || names.length === 0) {
    return { primary: defaultDisplay, allNames: [defaultDisplay] };
  }

  // Try to find the best English name
  let bestEnglishName = '';
  const allNames = names.map(n => n.display);
  
  // Look for English names (prioritize)
  for (const nameObj of names) {
    const display = nameObj.display;
    
    // Strong indicators of English
    const isLikelyEnglish = (
      !display.includes('é') && !display.includes('è') && !display.includes('ê') &&
      !display.includes('à') && !display.includes('â') && !display.includes('ç') &&
      !display.toLowerCase().includes('nan ') && !display.toLowerCase().includes('pou ') &&
      !display.toLowerCase().includes('tès ') && !display.includes('Présence') &&
      !display.includes('présence') && !display.includes('dans')
    );
    
    if (isLikelyEnglish) {
      // Check if it contains common English medical terms
      const hasEnglishMedicalTerms = /\b(test|panel|count|measurement|presence|serum|blood|urine|stool|function|hepatitis|glucose|creatinine|urea|bilirubin|transaminase)\b/i.test(display);
      
      if (hasEnglishMedicalTerms) {
        bestEnglishName = display;
        break;
      } else if (!bestEnglishName) {
        bestEnglishName = display; // Fallback to first likely English name
      }
    }
  }

  // If no English name found, use default
  if (!bestEnglishName) {
    bestEnglishName = defaultDisplay;
  }

  return { 
    primary: bestEnglishName,
    allNames: [...new Set([bestEnglishName, ...allNames])] // Remove duplicates
  };
}

// Recursive function to flatten concept hierarchy
function flattenConceptHierarchy(
  concept: any, 
  seenUuids: Set<string> = new Set(),
  parentIsPanel: boolean = false,
  panelUuid?: string
): OrderableConceptOption[] {
  const results: OrderableConceptOption[] = [];
  const uuid = concept.uuid;
  
  if (seenUuids.has(uuid)) {
    return results;
  }
  
  seenUuids.add(uuid);
  
  // Extract names with search terms
  const nameData = extractEnglishDisplay(concept.names, concept.display);
  
  const conceptOption: OrderableConceptOption = {
    uuid,
    display: nameData.primary,
    isPanel: parentIsPanel || concept.setMembers?.length > 0,
    panelUuid,
    searchTerms: nameData.allNames
  };
  
  results.push(conceptOption);
  
  if (concept.setMembers && concept.setMembers.length > 0) {
    concept.setMembers.forEach((member: any) => {
      const memberResults = flattenConceptHierarchy(member, seenUuids, true, uuid);
      results.push(...memberResults);
    });
  }
  
  return results;
}

export async function getOrderConceptOptions(): Promise<OrderableConceptLists> {
  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return { labTests: [], radiologyProcedures: [], generalProcedures: [] };
  }
  
  const conceptSetsToFetch = {
    labTests: "Tests Orderability",              
    radiologyProcedures: "Radiology department", 
    generalProcedures: "General",     
  };

  const apiBaseUrl = process.env.OPENMRS_API_URL;

  const conceptPromises = Object.entries(conceptSetsToFetch).map(async ([key, name]) => {
    try {
      // For lab tests, use the specific UUID from your response
      if (key === 'labTests' && name === 'Tests Orderability') {
        // Directly fetch the known concept set UUID
        const conceptUuid = "1748a953-d12e-4be1-914c-f6b096c6cdef";
        const fetchUrl = `${apiBaseUrl}/concept/${conceptUuid}?v=custom:(display,names:(display),uuid,setMembers:(display,uuid,names:(display),setMembers:(display,uuid,names:(display))))`;
        
        const response = await fetch(fetchUrl, { headers, cache: 'force-cache' });
        
        if (!response.ok) {
          await handleApiError(response, `Fetch for ${name}`);
          return { key: key as keyof OrderableConceptLists, data: [] };
        }
        
        const conceptData = await response.json();
        
        // Flatten the hierarchy and extract English names
        const flattened = flattenConceptHierarchy(conceptData);
        
        // Remove duplicates by UUID (just in case)
        const uniqueTests = Array.from(
          new Map(flattened.map(item => [item.uuid, item])).values()
        );
        
        // Sort alphabetically by display name
        uniqueTests.sort((a, b) => a.display.localeCompare(b.display));
        
        return { key: key as keyof OrderableConceptLists, data: uniqueTests };
      }
      
      // For other concept sets, use the existing logic
      const searchUrl = `${apiBaseUrl}/concept?q=${encodeURIComponent(name)}&v=custom:(uuid)`;
      
      const searchResponse = await fetch(searchUrl, { headers, cache: 'force-cache' });
      if (!searchResponse.ok) {
        await handleApiError(searchResponse, `Search for ${name}`);
        return { key: key as keyof OrderableConceptLists, data: [] };
      }
      
      const searchData: { results: Array<{ uuid: string }> } = await searchResponse.json();
      const parentConcept = searchData.results.find(c => c.uuid.length > 0); 
      
      if (!parentConcept) {
        console.warn(`Concept Set not found for name: ${name}`);
        return { key: key as keyof OrderableConceptLists, data: [] };
      }
      
      const fetchMembersUrl = `${apiBaseUrl}/concept/${parentConcept.uuid}?v=custom:(setMembers:(uuid,display,names:(display)))`;
      const membersResponse = await fetch(fetchMembersUrl, { headers, cache: 'force-cache' });
      
      if (!membersResponse.ok) {
        return { key: key as keyof OrderableConceptLists, data: [] };
      }

      const membersData: any = await membersResponse.json();
      
      const results = (membersData.setMembers || []).map((item: any) => ({
        uuid: item.uuid,
        display: extractEnglishDisplay(item.names, item.display)
      }));

      return { key: key as keyof OrderableConceptLists, data: results };
      
    } catch (error) {
      console.error(`Error fetching concept set for ${key}:`, error);
      return { key: key as keyof OrderableConceptLists, data: [] };
    }
  });

  const results = await Promise.all(conceptPromises);

  const finalLists: OrderableConceptLists = results.reduce((acc, result) => {
    if (result && 'key' in result) {
      acc[result.key] = result.data;
    }
    return acc;
  }, {} as OrderableConceptLists);

  return finalLists;
}