'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
import { revalidatePath } from 'next/cache';

// ==================== TYPES & INTERFACES ====================
import { 
  StockOperationType, 
  StockOperationSummary, 
  StockOperationItem, 
  StockOperationCreateParams,
  StockOperationUpdateParams,
  StockOperationSearchParams,
  StockOperation 
} from './stockOperationTypes';


// export const StockOperationTypeLabels: Record<StockOperationType, string> = {
//   [StockOperationType.ADJUSTMENT]: 'Adjustment',
//   [StockOperationType.DISPOSAL]: 'Disposal',
//   [StockOperationType.TRANSFER_OUT]: 'Transfer Out',
//   [StockOperationType.RECEIPT]: 'Receipt',
//   [StockOperationType.RETURN]: 'Return',
//   [StockOperationType.STOCK_ISSUE]: 'Stock Issue',
//   [StockOperationType.REQUISITION]: 'Requisition',
//   [StockOperationType.STOCK_TAKE]: 'Stock Take',
//   [StockOperationType.OPENING_STOCK]: 'Opening Stock'
// };


export interface StockOperationBase {
  operationType: StockOperationType;
  operationNumber?: string;
  operationDate: string; // ISO date string
  locationUuid: string;
  locationName?: string;
  
  // Source/Destination for transfers
  sourceLocationUuid?: string;
  sourceLocationName?: string;
  destinationLocationUuid?: string;
  destinationLocationName?: string;
  
  // Responsible persons
  responsiblePersonUuid?: string;
  responsiblePersonName?: string;
  responsiblePersonOther?: string;
  
  // Approval
  approvalRequired?: boolean;
  approvedByUuid?: string;
  approvedByName?: string;
  approvalDate?: string;
  
  // Status
  status?: 'NEW' | 'SUBMITTED' | 'APPROVED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
  reasonUuid?: string;
  reasonName?: string;
  reasonOther?: string;
  
  // Remarks
  remarks?: string;
  cancellationReason?: string;
  
  // Locking
  locked?: boolean;
  operationOrder?: number;
}

// export interface StockOperationCreateParams extends StockOperationBase {
//   items: StockOperationItem[];
// }

// export interface StockOperationUpdateParams extends Partial<StockOperationBase> {
//   uuid: string;
//   items?: StockOperationItem[];
// }

// export interface StockOperationSearchParams {
//   operationType?: StockOperationType | StockOperationType[];
//   locationUuid?: string;
//   sourceLocationUuid?: string;
//   destinationLocationUuid?: string;
//   status?: string | string[];
//   operationDateFrom?: string;
//   operationDateTo?: string;
//   stockItemUuid?: string;
//   batchNumber?: string;
//   searchQuery?: string;
//   startIndex?: number;
//   limit?: number;
//   includeVoided?: boolean;
// }

// export interface StockOperation extends StockOperationBase {
//   uuid?: string;
//   items: StockOperationItem[];
//   dateCreated?: string;
//   creatorUuid?: string;
//   creatorName?: string;
//   dateChanged?: string;
//   changedByUuid?: string;
//   changedByName?: string;
//   voided?: boolean;
//   voidReason?: string;
//   dateVoided?: string;
//   voidedByUuid?: string;
//   voidedByName?: string;
// }



// ==================== API ERROR HANDLER ====================

async function handleApiError(response: Response, source: string) {
  if (response.status === 401 || response.status === 403) {
    redirectToLogin();
    throw new Error(`Authentication failed: HTTP ${response.status}`);
  }

  const errorText = await response.text();
  console.error(`Stock Operation API Error [${source}] ${response.status}: ${errorText}`);
  throw new Error(`Failed to ${source}: HTTP ${response.status} - ${errorText}`);
}

// ==================== HELPER FUNCTIONS ====================

function formatOperationForAPI(operation: Partial<StockOperationCreateParams>): any {
  return {
    operationType: operation.operationType,
    operationNumber: operation.operationNumber,
    operationDate: operation.operationDate,
    locationUuid: operation.locationUuid,
    sourceLocationUuid: operation.sourceLocationUuid,
    destinationLocationUuid: operation.destinationLocationUuid,
    responsiblePersonUuid: operation.responsiblePersonUuid,
    responsiblePersonOther: operation.responsiblePersonOther,
    approvalRequired: operation.approvalRequired,
    approvedByUuid: operation.approvedByUuid,
    approvalDate: operation.approvalDate,
    status: operation.status || 'NEW',
    reasonUuid: operation.reasonUuid,
    reasonOther: operation.reasonOther,
    remarks: operation.remarks,
    cancellationReason: operation.cancellationReason,
    locked: operation.locked,
    operationOrder: operation.operationOrder,
    stockOperationItems: operation.items?.map(item => ({
      stockItemUuid: item.stockItemUuid,
      quantity: item.quantity,
      stockBatchUuid: item.stockBatchUuid,
      batchNumber: item.batchNumber,
      expirationDate: item.expirationDate,
      purchasePrice: item.purchasePrice,
      sellingPrice: item.sellingPrice,
      calculatedExpiration: item.calculatedExpiration,
      stockItemPackagingUOMUuid: item.stockItemPackagingUOMUuid,
      packagingUomName: item.packagingUomName
    })) || []
  };
}

function parseOperationFromAPI(data: any): StockOperation {
  return {
    uuid: data.uuid,
    operationType: data.operationType?.uuid as StockOperationType,
    operationNumber: data.operationNumber,
    operationDate: data.operationDate,
    locationUuid: data.location?.uuid,
    locationName: data.location?.display,
    sourceLocationUuid: data.sourceLocation?.uuid,
    sourceLocationName: data.sourceLocation?.display,
    destinationLocationUuid: data.destinationLocation?.uuid,
    destinationLocationName: data.destinationLocation?.display,
    responsiblePersonUuid: data.responsiblePerson?.uuid,
    responsiblePersonName: data.responsiblePerson?.display,
    responsiblePersonOther: data.responsiblePersonOther,
    approvalRequired: data.approvalRequired,
    approvedByUuid: data.approvedBy?.uuid,
    approvedByName: data.approvedBy?.display,
    approvalDate: data.approvalDate,
    status: data.status,
    reasonUuid: data.reason?.uuid,
    reasonName: data.reason?.display,
    reasonOther: data.reasonOther,
    remarks: data.remarks,
    cancellationReason: data.cancellationReason,
    locked: data.locked,
    operationOrder: data.operationOrder,
    items: data.stockOperationItems?.map((item: any) => ({
      stockItemUuid: item.stockItem?.uuid,
      stockItemName: item.stockItem?.display,
      quantity: item.quantity,
      batchNumber: item.batchNumber,
      expirationDate: item.expirationDate,
      purchasePrice: item.purchasePrice,
      sellingPrice: item.sellingPrice,
      calculatedExpiration: item.calculatedExpiration,
      stockItemPackagingUOMUuid: item.stockItemPackagingUOMUuid,
      packagingUomName: item.packagingUomName,
      stockBatchUuid: item.stockBatchUuid
    })) || [],
    dateCreated: data.dateCreated,
    creatorUuid: data.creator?.uuid,
    creatorName: data.creator?.display,
    dateChanged: data.dateChanged,
    changedByUuid: data.changedBy?.uuid,
    changedByName: data.changedBy?.display,
    voided: data.voided,
    voidReason: data.voidReason,
    dateVoided: data.dateVoided,
    voidedByUuid: data.voidedBy?.uuid,
    voidedByName: data.voidedBy?.display
  };
}

function parseOperationSummaryFromAPI(data: any): StockOperationSummary {
  const items = data.stockOperationItems || [];
  const totalQuantity = items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);

  return {
    uuid: data.uuid,
    operationNumber: data.operationNumber,
    operationType: data.operationType?.uuid as StockOperationType,
    operationDate: data.operationDate,
    status: data.status,
    locationName: data.location?.display || 'Unknown Location',
    sourceLocationName: data.sourceLocation?.display,
    destinationLocationName: data.destinationLocation?.display,
    totalItems: items.length,
    totalQuantity: totalQuantity,
    creatorName: data.creator?.display || 'Unknown User',
    dateCreated: data.dateCreated
  };
}

function validateOperationItems(items: StockOperationItem[], operationType: StockOperationType): string | null {
  if (!items || items.length === 0) {
    return 'At least one item is required';
  }

  for (const item of items) {
    if (!item.stockItemUuid) {
      return 'Stock item UUID is required for all items';
    }
    
    if (item.quantity <= 0) {
      return 'Quantity must be greater than zero';
    }
    
    // For certain operations, batch/expiry might be required
    if (operationType === StockOperationType.RECEIPT || 
        operationType === StockOperationType.OPENING_STOCK) {
      if (!item.batchNumber) {
        return 'Batch number is required for receipts and opening stock';
      }
      if (!item.expirationDate && operationType === StockOperationType.RECEIPT) {
        return 'Expiration date is required for receipts';
      }
    }
  }

  return null;
}

// ==================== STOCK OPERATION ACTIONS ====================

/**
 * Create a new stock operation
 */
export async function createStockOperation(
  params: StockOperationCreateParams
): Promise<{
  success: boolean;
  message: string;
  operationUuid?: string;
  operationNumber?: string;
}> {
  let headers: Record<string, string>;

  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return { success: false, message: 'Authentication failed' };
  }

  try {
    // Validation
    if (!params.operationType) {
      return { success: false, message: 'Operation type is required' };
    }

    if (!params.locationUuid) {
      return { success: false, message: 'Location is required' };
    }

    if (!params.operationDate) {
      return { success: false, message: 'Operation date is required' };
    }

    // Validate items
    const itemsError = validateOperationItems(params.items, params.operationType);
    if (itemsError) {
      return { success: false, message: itemsError };
    }

    // For transfers, validate source/destination
    if (params.operationType === StockOperationType.TRANSFER_OUT) {
      if (!params.destinationLocationUuid) {
        return { success: false, message: 'Destination location is required for transfers' };
      }
    }

    // Prepare API payload
    const apiPayload = formatOperationForAPI(params);

    const url = `${process.env.OPENMRS_API_URL}/stockmanagement/stockoperation`;

    console.log('Creating stock operation:', JSON.stringify(apiPayload, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(apiPayload)
    });

    if (!response.ok) {
      await handleApiError(response, 'create stock operation');
    }

    const data = await response.json();

    if (!data?.uuid) {
      throw new Error('Stock operation created but no UUID returned');
    }

    revalidatePath('/pharmacy/stock/operations');
    revalidatePath('/pharmacy/dashboard');

    return {
      success: true,
      message: 'Stock operation created successfully',
      operationUuid: data.uuid,
      operationNumber: data.operationNumber
    };

  } catch (error) {
    console.error('Error creating stock operation:', error);
    return {
      success: false,
      message: error instanceof Error
        ? error.message
        : 'Failed to create stock operation'
    };
  }
}

/**
 * Update an existing stock operation
 */
export async function updateStockOperation(
  params: StockOperationUpdateParams
): Promise<{
  success: boolean;
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
    // Validation
    if (!params.uuid) {
      return { success: false, message: 'Operation UUID is required' };
    }

    // Prepare API payload
    const apiPayload = formatOperationForAPI(params);

    const url = `${process.env.OPENMRS_API_URL}/stockmanagement/stockoperation/${params.uuid}`;

    console.log('Updating stock operation:', JSON.stringify(apiPayload, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(apiPayload)
    });

    if (!response.ok) {
      await handleApiError(response, 'update stock operation');
    }

    revalidatePath('/pharmacy/stock/operations');
    revalidatePath(`/pharmacy/stock/operations/${params.uuid}`);
    revalidatePath('/pharmacy/dashboard');

    return {
      success: true,
      message: 'Stock operation updated successfully'
    };

  } catch (error) {
    console.error('Error updating stock operation:', error);
    return {
      success: false,
      message: error instanceof Error
        ? error.message
        : 'Failed to update stock operation'
    };
  }
}

/**
 * Get stock operation by UUID
 */
export async function getStockOperation(
  uuid: string
): Promise<{
  success: boolean;
  data?: StockOperation;
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
    if (!uuid) {
      return { success: false, message: 'Operation UUID is required' };
    }

    const url = `${process.env.OPENMRS_API_URL}/stockmanagement/stockoperation/${uuid}?v=full`;

    const response = await fetch(url, { headers });

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, message: 'Stock operation not found' };
      }
      await handleApiError(response, 'fetch stock operation');
    }

    const data = await response.json();

    return {
      success: true,
      data: parseOperationFromAPI(data),
      message: 'Stock operation retrieved successfully'
    };

  } catch (error) {
    console.error('Error fetching stock operation:', error);
    return {
      success: false,
      message: error instanceof Error
        ? error.message
        : 'Failed to fetch stock operation'
    };
  }
}

/**
 * Search stock operations with filters
 */
export async function searchStockOperations(
  params: StockOperationSearchParams = {}
): Promise<{
  success: boolean;
  data?: StockOperationSummary[];
  totalCount?: number;
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

    if (params.operationType) {
      if (Array.isArray(params.operationType)) {
        params.operationType.forEach(type => searchParams.append('operationType', type));
      } else {
        searchParams.append('operationType', params.operationType);
      }
    }
    
    if (params.locationUuid) searchParams.append('locationUuid', params.locationUuid);
    if (params.sourceLocationUuid) searchParams.append('sourceLocationUuid', params.sourceLocationUuid);
    if (params.destinationLocationUuid) searchParams.append('destinationLocationUuid', params.destinationLocationUuid);
    if (params.status) {
      if (Array.isArray(params.status)) {
        params.status.forEach(s => searchParams.append('status', s));
      } else {
        searchParams.append('status', params.status);
      }
    }
    if (params.operationDateFrom) searchParams.append('operationDateFrom', params.operationDateFrom);
    if (params.operationDateTo) searchParams.append('operationDateTo', params.operationDateTo);
    if (params.stockItemUuid) searchParams.append('stockItemUuid', params.stockItemUuid);
    if (params.batchNumber) searchParams.append('batchNumber', params.batchNumber);
    if (params.searchQuery) searchParams.append('q', params.searchQuery);
    if (params.startIndex !== undefined) searchParams.append('startIndex', params.startIndex.toString());
    if (params.limit !== undefined) searchParams.append('limit', params.limit.toString());
    if (params.includeVoided !== undefined) searchParams.append('includeVoided', params.includeVoided.toString());

    searchParams.append('v', 'default');

    const url = `${process.env.OPENMRS_API_URL}/stockmanagement/stockoperation?${searchParams.toString()}`;

    const response = await fetch(url, { headers });

    if (!response.ok) {
      await handleApiError(response, 'search stock operations');
    }

    const data = await response.json();

    const operations = data.results?.map(parseOperationSummaryFromAPI) || [];

    return {
      success: true,
      data: operations,
      totalCount: data.totalCount || operations.length,
      message: `Found ${operations.length} operation(s)`
    };

  } catch (error) {
    console.error('Error searching stock operations:', error);
    return {
      success: false,
      message: error instanceof Error
        ? error.message
        : 'Failed to search stock operations'
    };
  }
}

/**
 * Submit a stock operation for approval/processing
 */
export async function submitStockOperation(
  uuid: string
): Promise<{
  success: boolean;
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
    if (!uuid) {
      return { success: false, message: 'Operation UUID is required' };
    }

    const url = `${process.env.OPENMRS_API_URL}/stockmanagement/stockoperation/${uuid}/submit`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    });

    if (!response.ok) {
      await handleApiError(response, 'submit stock operation');
    }

    revalidatePath('/pharmacy/stock/operations');
    revalidatePath(`/pharmacy/stock/operations/${uuid}`);

    return {
      success: true,
      message: 'Stock operation submitted successfully'
    };

  } catch (error) {
    console.error('Error submitting stock operation:', error);
    return {
      success: false,
      message: error instanceof Error
        ? error.message
        : 'Failed to submit stock operation'
    };
  }
}

/**
 * Approve a stock operation
 */
export async function approveStockOperation(
  uuid: string,
  approvedByUuid: string
): Promise<{
  success: boolean;
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
    if (!uuid) {
      return { success: false, message: 'Operation UUID is required' };
    }

    if (!approvedByUuid) {
      return { success: false, message: 'Approver UUID is required' };
    }

    const url = `${process.env.OPENMRS_API_URL}/stockmanagement/stockoperation/${uuid}/approve`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify({ approvedByUuid })
    });

    if (!response.ok) {
      await handleApiError(response, 'approve stock operation');
    }

    revalidatePath('/pharmacy/stock/operations');
    revalidatePath(`/pharmacy/stock/operations/${uuid}`);

    return {
      success: true,
      message: 'Stock operation approved successfully'
    };

  } catch (error) {
    console.error('Error approving stock operation:', error);
    return {
      success: false,
      message: error instanceof Error
        ? error.message
        : 'Failed to approve stock operation'
    };
  }
}

/**
 * Complete a stock operation
 */
export async function completeStockOperation(
  uuid: string
): Promise<{
  success: boolean;
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
    if (!uuid) {
      return { success: false, message: 'Operation UUID is required' };
    }

    const url = `${process.env.OPENMRS_API_URL}/stockmanagement/stockoperation/${uuid}/complete`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    });

    if (!response.ok) {
      await handleApiError(response, 'complete stock operation');
    }

    revalidatePath('/pharmacy/stock/operations');
    revalidatePath(`/pharmacy/stock/operations/${uuid}`);
    revalidatePath('/pharmacy/dashboard');
    revalidatePath('/pharmacy/stock/levels');

    return {
      success: true,
      message: 'Stock operation completed successfully'
    };

  } catch (error) {
    console.error('Error completing stock operation:', error);
    return {
      success: false,
      message: error instanceof Error
        ? error.message
        : 'Failed to complete stock operation'
    };
  }
}

/**
 * Cancel a stock operation
 */
export async function cancelStockOperation(
  uuid: string,
  reason: string
): Promise<{
  success: boolean;
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
    if (!uuid) {
      return { success: false, message: 'Operation UUID is required' };
    }

    if (!reason) {
      return { success: false, message: 'Cancellation reason is required' };
    }

    const url = `${process.env.OPENMRS_API_URL}/stockmanagement/stockoperation/${uuid}/cancel`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify({ reason })
    });

    if (!response.ok) {
      await handleApiError(response, 'cancel stock operation');
    }

    revalidatePath('/pharmacy/stock/operations');
    revalidatePath(`/pharmacy/stock/operations/${uuid}`);

    return {
      success: true,
      message: 'Stock operation cancelled successfully'
    };

  } catch (error) {
    console.error('Error cancelling stock operation:', error);
    return {
      success: false,
      message: error instanceof Error
        ? error.message
        : 'Failed to cancel stock operation'
    };
  }
}

/**
 * Delete/Void a stock operation
 */
export async function deleteStockOperation(
  uuid: string,
  reason: string = 'Deleted via pharmacy system'
): Promise<{
  success: boolean;
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
    if (!uuid) {
      return { success: false, message: 'Operation UUID is required' };
    }

    if (!reason) {
      return { success: false, message: 'Deletion reason is required' };
    }

    const url = `${process.env.OPENMRS_API_URL}/stockmanagement/stockoperation/${uuid}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify({ voidReason: reason })
    });

    if (!response.ok) {
      await handleApiError(response, 'delete stock operation');
    }

    revalidatePath('/pharmacy/stock/operations');
    revalidatePath('/pharmacy/dashboard');

    return {
      success: true,
      message: 'Stock operation deleted successfully'
    };

  } catch (error) {
    console.error('Error deleting stock operation:', error);
    return {
      success: false,
      message: error instanceof Error
        ? error.message
        : 'Failed to delete stock operation'
    };
  }
}

/**
 * Get operation types (for dropdowns)
 */
export async function getStockOperationTypes(): Promise<{
  success: boolean;
  data?: Array<{ uuid: StockOperationType; name: string }>;
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
    const url = `${process.env.OPENMRS_API_URL}/stockmanagement/stockoperationtype`;

    const response = await fetch(url, { headers });

    if (!response.ok) {
      await handleApiError(response, 'fetch operation types');
    }

    const data = await response.json();
    const types = data.results?.map((type: any) => ({
      uuid: type.uuid as StockOperationType,
      name: type.name
    })) || [];

    return {
      success: true,
      data: types,
      message: `Found ${types.length} operation type(s)`
    };

  } catch (error) {
    console.error('Error fetching operation types:', error);
    return {
      success: false,
      message: error instanceof Error
        ? error.message
        : 'Failed to fetch operation types'
    };
  }
}

/**
 * Quick operation helpers for common scenarios
 */

export async function createStockAdjustment(
  locationUuid: string,
  items: StockOperationItem[],
  reason: string,
  operationDate?: string
): Promise<{
  success: boolean;
  message: string;
  operationUuid?: string;
}> {
  return createStockOperation({
    operationType: StockOperationType.ADJUSTMENT,
    locationUuid,
    items,
    operationDate: operationDate || new Date().toISOString(),
    reasonOther: reason,
    status: 'NEW'
  });
}

export async function createStockTransfer(
  sourceLocationUuid: string,
  destinationLocationUuid: string,
  items: StockOperationItem[],
  remarks?: string
): Promise<{
  success: boolean;
  message: string;
  operationUuid?: string;
}> {
  return createStockOperation({
    operationType: StockOperationType.TRANSFER_OUT,
    locationUuid: sourceLocationUuid,
    sourceLocationUuid,
    destinationLocationUuid,
    items,
    operationDate: new Date().toISOString(),
    remarks,
    status: 'NEW'
  });
}

export async function createStockReceipt(
  locationUuid: string,
  items: StockOperationItem[],
  supplier?: string,
  invoiceNumber?: string
): Promise<{
  success: boolean;
  message: string;
  operationUuid?: string;
}> {
  return createStockOperation({
    operationType: StockOperationType.RECEIPT,
    locationUuid,
    items,
    operationDate: new Date().toISOString(),
    responsiblePersonOther: supplier,
    remarks: invoiceNumber ? `Invoice: ${invoiceNumber}` : undefined,
    status: 'NEW'
  });
}