// actions/lab-orders/getLabOrders.ts
'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
import { OrderStatus } from './lab-order';

export async function getLabOrders(
  status: OrderStatus,
  dateRange: { start: Date; end: Date }
): Promise<{ orders: any[]; count: number }> {
  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return { orders: [], count: 0 };
  }

  const apiBaseUrl = process.env.OPENMRS_API_URL;
  
  // Build query parameters - USE orderTypes (plural)
  const params = new URLSearchParams();
  params.append('orderTypes', '52a447d3-a64a-11e3-9aeb-50e549534c5e');
  
  // Simple custom view that works
  const customView = 'custom:(uuid,orderNumber,patient:(uuid,display,person:(age,gender)),concept:(uuid,display),dateActivated,fulfillerStatus,fulfillerComment,urgency,instructions,orderer:(uuid,display),encounter:(uuid,display))';
  params.append('v', customView);
  
  // Status filtering
  if (status !== undefined && status !== null) {
    params.append('fulfillerStatus', status);
  }
  
  // Date range filtering - Optional for now
  try {
    const startDate = new Date(dateRange.start);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(dateRange.end);
    endDate.setHours(23, 59, 59, 999);
    
    const formatDateForOpenMRS = (date: Date) => {
      return date.toISOString();
    };
    
    params.append('activatedOnOrAfterDate', formatDateForOpenMRS(startDate));
    params.append('activatedOnOrBeforeDate', formatDateForOpenMRS(endDate));
  } catch (dateError) {
    console.warn('Date formatting error, proceeding without date filter:', dateError);
  }
  
  // Add limit
  params.append('limit', '100');
  
  const url = `${apiBaseUrl}/order?${params.toString()}`;
  
  console.log('Fetching orders URL:', url);
  
  try {
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch lab orders. Status:', response.status);
      console.error('Error:', errorText);
      
      // Try without custom view if that fails
      const simpleParams = new URLSearchParams();
      simpleParams.append('orderTypes', '52a447d3-a64a-11e3-9aeb-50e549534c5e');
      simpleParams.append('v', 'default');
      simpleParams.append('limit', '100');
      
      const simpleUrl = `${apiBaseUrl}/order?${simpleParams.toString()}`;
      console.log('Trying simple URL:', simpleUrl);
      
      const simpleResponse = await fetch(simpleUrl, { headers });
      if (!simpleResponse.ok) {
        return { orders: [], count: 0 };
      }
      
      const data = await simpleResponse.json();
      const filteredOrders = filterOrdersByStatus(data.results || [], status);
      return { orders: filteredOrders, count: filteredOrders.length };
    }
    
    const data = await response.json();
    const filteredOrders = filterOrdersByStatus(data.results || [], status);
    
    return {
      orders: filteredOrders,
      count: filteredOrders.length
    };
  } catch (error) {
    console.error('Error fetching lab orders:', error);
    return { orders: [], count: 0 };
  }
}

export async function getLabOrderCounts(dateRange: { start: Date; end: Date }) {
  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return { ordered: 0, inProgress: 0, completed: 0, declined: 0 };
  }

  const apiBaseUrl = process.env.OPENMRS_API_URL;
  
  // Use orderTypes (plural) - this worked in your fallback!
  const params = new URLSearchParams();
  params.append('orderTypes', '52a447d3-a64a-11e3-9aeb-50e549534c5e');
  
  // Use 'default' view which is simpler
  params.append('v', 'default');
  
  // Add date range carefully
  try {
    const startDate = new Date(dateRange.start);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(dateRange.end);
    endDate.setHours(23, 59, 59, 999);
    
    const formatDateForOpenMRS = (date: Date) => {
      return date.toISOString();
    };
    
    params.append('activatedOnOrAfterDate', formatDateForOpenMRS(startDate));
    params.append('activatedOnOrBeforeDate', formatDateForOpenMRS(endDate));
  } catch (dateError) {
    console.warn('Date filter error, proceeding without:', dateError);
  }
  
  params.append('limit', '1000');
  
  const url = `${apiBaseUrl}/order?${params.toString()}`;
  
  console.log('Fetching counts URL:', url);
  
  try {
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch counts. Status:', response.status);
      console.error('Error response:', errorText);
      
      // Try without any filters at all
      const simplestUrl = `${apiBaseUrl}/order?orderTypes=52a447d3-a64a-11e3-9aeb-50e549534c5e&limit=100`;
      console.log('Trying simplest URL:', simplestUrl);
      
      const simpleResponse = await fetch(simplestUrl, { headers });
      if (simpleResponse.ok) {
        const data = await simpleResponse.json();
        return calculateCounts(data.results || []);
      }
      
      return { ordered: 0, inProgress: 0, completed: 0, declined: 0 };
    }
    
    const data = await response.json();
    const orders = data.results || [];
    
    return calculateCounts(orders);
    
  } catch (error) {
    console.error('Error fetching counts:', error);
    return { ordered: 0, inProgress: 0, completed: 0, declined: 0 };
  }
}

function filterOrdersByStatus(orders: any[], status: OrderStatus): any[] {
  if (status === null) {
    // Tests ordered tab: show only unpicked orders
    return orders.filter(order => 
      !order.fulfillerStatus || order.fulfillerStatus === null
    );
  }
  
  // Other tabs: filter by exact status
  return orders.filter(order => order.fulfillerStatus === status);
}

function calculateCounts(orders: any[]) {
  const counts = {
    ordered: 0,
    inProgress: 0,
    completed: 0,
    declined: 0
  };
  
  orders.forEach((order: any) => {
    if (!order.fulfillerStatus || order.fulfillerStatus === null) {
      counts.ordered++;
    } else if (order.fulfillerStatus === 'IN_PROGRESS') {
      counts.inProgress++;
    } else if (order.fulfillerStatus === 'COMPLETED') {
      counts.completed++;
    } else if (order.fulfillerStatus === 'DECLINED') {
      counts.declined++;
    }
  });
  
  console.log('Calculated counts:', counts);
  return counts;
}