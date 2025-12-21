// actions/lab-orders/getOrderResults.ts
'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
import { getConceptDetails } from './getConceptDetails';

export async function getOrderResults(
  orderUuid: string
): Promise<{ 
  results: any[]; 
  formattedResults: any[];
  conceptStructure: any;
  success: boolean; 
  message: string 
}> {
  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return { 
      results: [], 
      formattedResults: [],
      conceptStructure: null,
      success: false, 
      message: 'Authentication failed' 
    };
  }

  const apiBaseUrl = process.env.OPENMRS_API_URL;
  
  try {
    // 1. Get FULL order details including concept UUID
    const orderUrl = `${apiBaseUrl}/order/${orderUuid}?v=custom:(uuid,orderNumber,concept:(uuid,display),encounter:(uuid),fulfillerStatus)`;
    const orderResponse = await fetch(orderUrl, { headers });
    
    if (!orderResponse.ok) {
      throw new Error('Failed to fetch order details');
    }
    
    const order = await orderResponse.json();
    
    // Debug logging
    // console.log('Order details for results:', JSON.stringify(order, null, 2));
    
    if (!order.concept || !order.concept.uuid) {
      throw new Error('Order has no concept reference');
    }
    
    // 2. Get ALL observations for this encounter WITHOUT filtering by order
    // This is CRITICAL - observations might not have order field populated
    if (!order.encounter || !order.encounter.uuid) {
      return { 
        results: [], 
        formattedResults: [],
        conceptStructure: null,
        success: true, 
        message: 'No encounter found for this order' 
      };
    }
    
    const params = new URLSearchParams();
    params.append('encounter', order.encounter.uuid);
    
    // Get COMPLETE observation details
    params.append('v', 'full');
    
    const obsUrl = `${apiBaseUrl}/obs?${params.toString()}`;
    const obsResponse = await fetch(obsUrl, { headers });
    
    if (!obsResponse.ok) {
      throw new Error('Failed to fetch observations');
    }
    
    const obsData = await obsResponse.json();
    const allObservations = obsData.results || [];
    
    // console.log(`Found ${allObservations.length} total observations for encounter ${order.encounter.uuid}`);
    // console.log('All observations:', JSON.stringify(allObservations, null, 2));
    
    // 3. Filter observations - MULTIPLE STRATEGIES
    let relevantObs = [];
    
    // Strategy 1: Filter by order reference
    const byOrderRef = allObservations.filter((obs: any) => {
      return obs.order && obs.order.uuid === orderUuid;
    });
    
    // Strategy 2: Filter by concept (for single tests)
    const byConcept = allObservations.filter((obs: any) => {
      return obs.concept && obs.concept.uuid === order.concept.uuid;
    });
    
    // Strategy 3: Find panel observations and check groupMembers
    const panelObs = allObservations.filter((obs: any) => {
      // Check if this is a panel observation (has groupMembers)
      if (obs.groupMembers && obs.groupMembers.length > 0) {
        // Check if panel concept matches order concept
        if (obs.concept && obs.concept.uuid === order.concept.uuid) {
          return true;
        }
      }
      return false;
    });
    
    // Use whichever strategy found results
    if (byOrderRef.length > 0) {
      relevantObs = byOrderRef;
      // console.log('Found observations by order reference:', byOrderRef.length);
    } else if (panelObs.length > 0) {
      relevantObs = panelObs;
      // console.log('Found panel observations:', panelObs.length);
    } else if (byConcept.length > 0) {
      relevantObs = byConcept;
      // console.log('Found observations by concept:', byConcept.length);
    } else {
      // console.log('No observations found with any strategy');
      relevantObs = allObservations; // Fallback: return all observations for debugging
    }
    
    // 4. Get concept structure for proper display
    const conceptStructure = await getConceptDetails(order.concept.uuid);
    
    // 5. Format results for display
    const formattedResults = await formatResultsForDisplay(
      relevantObs, 
      conceptStructure, 
      order.concept.uuid
    );
    
    return {
      results: relevantObs,
      formattedResults: formattedResults,
      conceptStructure: conceptStructure,
      success: true,
      message: relevantObs.length > 0 ? 'Results found' : 'No results found'
    };
    
  } catch (error: any) {
    console.error('Error fetching order results:', error);
    return {
      results: [],
      formattedResults: [],
      conceptStructure: null,
      success: false,
      message: error.message || 'Failed to fetch order results'
    };
  }
}

async function formatResultsForDisplay(
  observations: any[], 
  conceptStructure: any,
  orderConceptUuid: string
): Promise<any[]> {
  if (!observations.length || !conceptStructure) return [];
  
  const formatted = [];
  
  for (const obs of observations) {
    // Handle panel observations
    if (obs.groupMembers && obs.groupMembers.length > 0) {
      const panelResult: { type: string; panelName: any; tests: any[] } = {
        type: 'panel',
        panelName: conceptStructure.display,
        tests: []
      };
      
      // Map each group member to its concept structure
      for (const member of obs.groupMembers) {
        // Find this member in the concept structure
        const memberConcept = conceptStructure.setMembers?.find(
          (c: any) => c.uuid === member.concept.uuid
        );
        
        panelResult.tests.push({
          conceptUuid: member.concept.uuid,
          name: memberConcept?.display || member.concept.display,
          value: formatValue(member.value, memberConcept),
          units: memberConcept?.units || '',
          referenceRange: memberConcept ? 
            `${memberConcept.lowNormal || ''}-${memberConcept.hiNormal || ''}` : ''
        });
      }
      
      formatted.push(panelResult);
    } else {
      // Handle single test observations
      formatted.push({
        type: 'single',
        conceptUuid: obs.concept.uuid,
        name: conceptStructure.display,
        value: formatValue(obs.value, conceptStructure),
        units: conceptStructure.units || '',
        referenceRange: conceptStructure ? 
          `${conceptStructure.lowNormal || ''}-${conceptStructure.hiNormal || ''}` : ''
      });
    }
  }
  
  return formatted;
}

function formatValue(value: any, concept: any): string {
  if (value === null || value === undefined) return 'Not recorded';
  
  // If value is a concept reference (coded answer)
  if (typeof value === 'object' && value.uuid) {
    // Try to find the display name from concept answers
    if (concept && concept.answers) {
      const answer = concept.answers.find((a: any) => a.uuid === value.uuid);
      return answer?.display || value.display || value.uuid;
    }
    return value.display || value.uuid;
  }
  
  // If value is a simple type
  return String(value);
}