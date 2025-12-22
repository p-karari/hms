// actions/lab-orders/updateOrderStatus.ts
'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';

export async function updateOrderStatus(
  orderUuid: string,
  data: {
    fulfillerStatus: 'IN_PROGRESS' | 'COMPLETED' | 'DECLINED';
    fulfillerComment?: string;
  }
): Promise<{ success: boolean; message: string }> {
  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return { success: false, message: 'Authentication failed' };
  }

  const apiBaseUrl = process.env.OPENMRS_API_URL;
  
  try {
    // Use the correct OpenMRS endpoint for status updates
    const url = `${apiBaseUrl}/order/${orderUuid}/fulfillerdetails/`;
    
    const payload = {
      fulfillerStatus: data.fulfillerStatus,
      fulfillerComment: data.fulfillerComment || ''
    };
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Status update failed:', errorText);
      throw new Error(`Failed to update order status: ${response.status}`);
    }
    
    return {
      success: true,
      message: 'Order status updated successfully'
    };
  } catch (error: any) {
    console.error('Error updating order status:', error);
    return {
      success: false,
      message: error.message || 'Failed to update order status'
    };
  }
}

export async function startOrderProgress(orderUuid: string) {
  return updateOrderStatus(orderUuid, {
    fulfillerStatus: 'IN_PROGRESS',
    fulfillerComment: 'Order picked up'
  });
}

export async function completeOrder(orderUuid: string, comment?: string) {
  return updateOrderStatus(orderUuid, {
    fulfillerStatus: 'COMPLETED',
    fulfillerComment: comment || 'Test Results Entered'
  });
}

export async function declineOrder(orderUuid: string, reason: string) {
  return updateOrderStatus(orderUuid, {
    fulfillerStatus: 'DECLINED',
    fulfillerComment: reason
  });
}