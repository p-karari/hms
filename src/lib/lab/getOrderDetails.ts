// actions/lab-orders/getOrderDetails.ts
'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';

export async function getOrderDetails(orderUuid: string): Promise<any> {
  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return null;
  }

  const apiBaseUrl = process.env.OPENMRS_API_URL;
  const customView = 'custom:(uuid,orderNumber,patient:(uuid,display,person:(uuid,display,age,gender)),concept:(uuid,display),dateActivated,fulfillerStatus,fulfillerComment,urgency,instructions,orderer:(uuid,display),encounter:(uuid,display),careSetting,orderType,action,scheduledDate,dateStopped,autoExpireDate)';
  
  const url = `${apiBaseUrl}/order/${orderUuid}?v=${customView}`;
  
  try {
    const response = await fetch(url, { headers, cache: 'no-store' });
    
    if (!response.ok) {
      console.error(`Failed to fetch order ${orderUuid}:`, response.status);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching order ${orderUuid}:`, error);
    return null;
  }
}