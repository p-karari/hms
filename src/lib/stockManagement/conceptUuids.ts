'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';

// ==================== TYPES & INTERFACES ====================

export interface Concept {
  uuid: string;
  display: string;
  name: string;
  conceptClass?: {
    uuid: string;
    display: string;
  };
  datatype?: {
    uuid: string;
    display: string;
  };
}

export interface UOMConcept extends Concept {
  isUnitOfMeasure: boolean;
}

// ==================== API ERROR HANDLER ====================

async function handleApiError(response: Response, source: string) {
  if (response.status === 401 || response.status === 403) {
    redirectToLogin();
    throw new Error(`Authentication failed: HTTP ${response.status}`);
  }

  const errorText = await response.text();
  console.error(`Concepts API Error [${source}] ${response.status}: ${errorText}`);
  throw new Error(`Failed to ${source}: HTTP ${response.status}`);
}

// ==================== CONCEPT ACTIONS ====================

/**
 * Search concepts by name or other criteria
 */
export async function searchConcepts(
  searchTerm?: string,
  conceptClass?: string,
  limit: number = 50
): Promise<{
  success: boolean;
  data?: Concept[];
  message: string;
}> {
  let headers: Record<string, string>;

  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return { success: false, message: 'Authentication failed' };
  }

  try {
    const searchParams = new URLSearchParams();
    searchParams.append('v', 'custom:(uuid,display,name,conceptClass:(uuid,display),datatype:(uuid,display))');
    searchParams.append('limit', limit.toString());
    
    if (searchTerm && searchTerm.trim().length > 0) {
      searchParams.append('q', searchTerm.trim());
    }
    
    if (conceptClass && conceptClass.trim().length > 0) {
      searchParams.append('conceptClass', conceptClass.trim());
    }

    const url = `${process.env.OPENMRS_API_URL}/concept?${searchParams.toString()}`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
      await handleApiError(response, 'search concepts');
    }

    const data = await response.json();
    
    const concepts: Concept[] = (data.results || []).map((item: any) => ({
      uuid: item.uuid,
      display: item.display,
      name: item.name?.name || item.display,
      conceptClass: item.conceptClass ? {
        uuid: item.conceptClass.uuid,
        display: item.conceptClass.display
      } : undefined,
      datatype: item.datatype ? {
        uuid: item.datatype.uuid,
        display: item.datatype.display
      } : undefined
    }));

    return {
      success: true,
      data: concepts,
      message: `Found ${concepts.length} concept(s)`
    };

  } catch (error) {
    console.error('Error searching concepts:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to search concepts'
    };
  }
}

/**
 * Get specific concept by UUID
 */
export async function getConceptByUuid(
  uuid: string
): Promise<{
  success: boolean;
  data?: Concept;
  message: string;
}> {
  let headers: Record<string, string>;

  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return { success: false, message: 'Authentication failed' };
  }

  try {
    if (!uuid || uuid.trim() === '') {
      return { success: false, message: 'Concept UUID is required' };
    }

    const url = `${process.env.OPENMRS_API_URL}/concept/${uuid}?v=full`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, message: 'Concept not found' };
      }
      await handleApiError(response, 'fetch concept');
    }

    const item = await response.json();
    
    const concept: Concept = {
      uuid: item.uuid,
      display: item.display,
      name: item.name?.name || item.display,
      conceptClass: item.conceptClass ? {
        uuid: item.conceptClass.uuid,
        display: item.conceptClass.display
      } : undefined,
      datatype: item.datatype ? {
        uuid: item.datatype.uuid,
        display: item.datatype.display
      } : undefined
    };

    return {
      success: true,
      data: concept,
      message: 'Concept retrieved successfully'
    };

  } catch (error) {
    console.error('Error fetching concept:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch concept'
    };
  }
}

/**
 * Get Units of Measure (UOM) concepts
 */
export async function getUOMConcepts(
  searchTerm?: string,
  limit: number = 100
): Promise<{
  success: boolean;
  data?: UOMConcept[];
  message: string;
}> {
  try {
    // Common UOM concept classes and names
    const uomClasses = ['Unit of Measure', 'Units of Measure', 'Measure', 'Unit'];
    const uomKeywords = ['tablet', 'capsule', 'ml', 'mg', 'g', 'kg', 'liter', 'bottle', 'box', 'vial', 'ampule', 'tube', 'pack', 'unit', 'dose'];

    let allConcepts: UOMConcept[] = [];
    
    // Search by UOM classes
    for (const conceptClass of uomClasses) {
      const result = await searchConcepts(searchTerm, conceptClass, limit);
      if (result.success && result.data) {
        const uomConcepts = result.data.map(concept => ({
          ...concept,
          isUnitOfMeasure: true
        }));
        allConcepts = [...allConcepts, ...uomConcepts];
      }
    }

    // Also search by UOM keywords if no specific search term
    if (!searchTerm || searchTerm.trim().length === 0) {
      for (const keyword of uomKeywords) {
        const result = await searchConcepts(keyword, undefined, 10);
        if (result.success && result.data) {
          const uomConcepts = result.data.map(concept => ({
            ...concept,
            isUnitOfMeasure: true
          }));
          // Avoid duplicates
          uomConcepts.forEach(concept => {
            if (!allConcepts.some(c => c.uuid === concept.uuid)) {
              allConcepts.push(concept);
            }
          });
        }
      }
    }

    // Remove duplicates
    const uniqueConcepts = Array.from(
      new Map(allConcepts.map(item => [item.uuid, item])).values()
    );

    // Sort alphabetically
    uniqueConcepts.sort((a, b) => a.display.localeCompare(b.display));

    return {
      success: true,
      data: uniqueConcepts.slice(0, limit), // Limit results
      message: `Found ${uniqueConcepts.length} UOM concept(s)`
    };

  } catch (error) {
    console.error('Error fetching UOM concepts:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch UOM concepts'
    };
  }
}

/**
 * Get concepts by concept class
 */
export async function getConceptsByClass(
  conceptClassName: string,
  searchTerm?: string,
  limit: number = 100
): Promise<{
  success: boolean;
  data?: Concept[];
  message: string;
}> {
  return searchConcepts(searchTerm, conceptClassName, limit);
}

/**
 * Get drug categories (concepts that can be used as stock item categories)
 */
export async function getDrugCategories(
  searchTerm?: string,
  limit: number = 50
): Promise<{
  success: boolean;
  data?: Concept[];
  message: string;
}> {
  // Common drug category classes
  const categoryClasses = ['Drug', 'Medication', 'Pharmaceutical', 'Therapeutic Class', 'Drug Class'];
  
  const allCategories: Concept[] = [];
  
  for (const categoryClass of categoryClasses) {
    const result = await searchConcepts(searchTerm, categoryClass, limit);
    if (result.success && result.data) {
      // Avoid duplicates
      result.data.forEach(concept => {
        if (!allCategories.some(c => c.uuid === concept.uuid)) {
          allCategories.push(concept);
        }
      });
    }
  }

  // Sort alphabetically
  allCategories.sort((a, b) => a.display.localeCompare(b.display));

  return {
    success: true,
    data: allCategories.slice(0, limit),
    message: `Found ${allCategories.length} category concept(s)`
  };
}

/**
 * Get concept by name (exact match)
 */
export async function getConceptByName(
  name: string
): Promise<{
  success: boolean;
  data?: Concept;
  message: string;
}> {
  let headers: Record<string, string>;

  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return { success: false, message: 'Authentication failed' };
  }

  try {
    if (!name || name.trim() === '') {
      return { success: false, message: 'Concept name is required' };
    }

    const searchParams = new URLSearchParams();
    searchParams.append('q', name.trim());
    searchParams.append('v', 'custom:(uuid,display,name,conceptClass:(uuid,display))');
    searchParams.append('limit', '10');

    const url = `${process.env.OPENMRS_API_URL}/concept?${searchParams.toString()}`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
      await handleApiError(response, 'search concept by name');
    }

    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      return { success: false, message: 'Concept not found' };
    }

    // Find exact match or return first
    const exactMatch = data.results.find((item: any) => 
      item.name?.name?.toLowerCase() === name.toLowerCase() || 
      item.display?.toLowerCase() === name.toLowerCase()
    );

    const item = exactMatch || data.results[0];
    
    const concept: Concept = {
      uuid: item.uuid,
      display: item.display,
      name: item.name?.name || item.display,
      conceptClass: item.conceptClass ? {
        uuid: item.conceptClass.uuid,
        display: item.conceptClass.display
      } : undefined
    };

    return {
      success: true,
      data: concept,
      message: 'Concept retrieved successfully'
    };

  } catch (error) {
    console.error('Error fetching concept by name:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch concept by name'
    };
  }
}

/**
 * Find specific UOM concepts by common names
 */
export async function getCommonUOMs(): Promise<{
  success: boolean;
  data: Record<string, string>; // name -> uuid mapping
  message: string;
}> {
  const commonUOMs = [
    'Tablet', 'Capsule', 'Milliliter', 'Milligram', 'Gram', 'Kilogram',
    'Bottle', 'Box', 'Vial', 'Ampule', 'Tube', 'Pack', 'Unit', 'Dose',
    'Each', 'Piece', 'Sachet', 'Puff', 'Drop', 'Spray'
  ];

  const uomMap: Record<string, string> = {};

  for (const uomName of commonUOMs) {
    try {
      const result = await getConceptByName(uomName);
      if (result.success && result.data) {
        uomMap[uomName.toLowerCase()] = result.data.uuid;
      }
    } catch (error) {
      console.error(`Failed to find UOM "${uomName}":`, error);
    }
  }

  return {
    success: true,
    data: uomMap,
    message: `Found ${Object.keys(uomMap).length} common UOMs`
  };
}