'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
import { revalidatePath } from 'next/cache';
import { StockOperationType } from './stockOperationTypes';
// import { StockOperationType } from './stockOperation';
// import { StockOperationType } from './stock-operation.actions';

// ==================== TYPES & INTERFACES ====================

export interface StockTakeItem {
  stockItemUuid: string;
  stockItemName: string;
  batchNumber?: string;
  expirationDate?: string;
  stockBatchUuid?: string;
  
  // Current stock levels (from system)
  systemQuantity: number;
  systemExpirationDate?: string;
  
  // Physical count
  physicalQuantity: number;
  physicalExpirationDate?: string;
  
  // Calculated variance
  varianceQuantity: number;
  variancePercentage: number;
  
  // Packaging
  packagingUomUuid?: string;
  packagingUomName?: string;
  
  // Remarks
  remarks?: string;
  
  // Status
  counted?: boolean;
  hasVariance?: boolean;
  requiresRecount?: boolean;
}

export interface StockTakeSession {
  uuid?: string;
  locationUuid: string;
  locationName?: string;
  operationDate: string; // ISO date string
  
  // Status
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'FINALIZED';
  
  // Personnel
  startedByUuid?: string;
  startedByName?: string;
  startDate?: string;
  completedByUuid?: string;
  completedByName?: string;
  completionDate?: string;
  
  // Count information
  totalItems: number;
  itemsCounted: number;
  itemsWithVariance: number;
  
  // Variance summary
  totalVarianceQuantity: number;
  totalVarianceValue?: number;
  maxVariancePercentage?: number;
  
  // Stock operation links
  stockTakeOperationUuid?: string; // Stock Take operation
  adjustmentOperationUuid?: string; // Adjustment operation created from variances
  
  // Settings
  includeExpiredItems: boolean;
  includeZeroQuantityItems: boolean;
  allowPartialCounts: boolean;
  
  // Metadata
  remarks?: string;
  cancellationReason?: string;
  dateCreated?: string;
  creatorUuid?: string;
  creatorName?: string;
  
  // Items
  items: StockTakeItem[];
}

export interface CreateStockTakeParams {
  locationUuid: string;
  operationDate: string;
  includeExpiredItems?: boolean;
  includeZeroQuantityItems?: boolean;
  allowPartialCounts?: boolean;
  remarks?: string;
}

export interface UpdateStockTakeItemParams {
  sessionUuid: string;
  stockItemUuid: string;
  batchNumber?: string;
  physicalQuantity: number;
  physicalExpirationDate?: string;
  remarks?: string;
}

export interface CompleteStockTakeParams {
  sessionUuid: string;
  generateAdjustment?: boolean;
  adjustmentReason?: string;
  completedByUuid: string;
}

export interface StockTakeSearchParams {
  locationUuid?: string;
  status?: string | string[];
  operationDateFrom?: string;
  operationDateTo?: string;
  startedByUuid?: string;
  completedByUuid?: string;
  hasVariance?: boolean;
  startIndex?: number;
  limit?: number;
  includeCancelled?: boolean;
}

// ==================== API ERROR HANDLER ====================

async function handleApiError(response: Response, source: string) {
  if (response.status === 401 || response.status === 403) {
    redirectToLogin();
    throw new Error(`Authentication failed: HTTP ${response.status}`);
  }

  const errorText = await response.text();
  console.error(`Stock Take API Error [${source}] ${response.status}: ${errorText}`);
  throw new Error(`Failed to ${source}: HTTP ${response.status} - ${errorText}`);
}

// ==================== HELPER FUNCTIONS ====================

function calculateVariance(systemQty: number, physicalQty: number): {
  varianceQuantity: number;
  variancePercentage: number;
} {
  const varianceQuantity = physicalQty - systemQty;
  const variancePercentage = systemQty > 0 
    ? (varianceQuantity / systemQty) * 100 
    : (physicalQty > 0 ? 100 : 0);
  
  return {
    varianceQuantity,
    variancePercentage: Math.round(variancePercentage * 100) / 100 // Round to 2 decimal places
  };
}

function formatStockTakeForAPI(session: Partial<StockTakeSession>): any {
  return {
    uuid: session.uuid,
    locationUuid: session.locationUuid,
    operationDate: session.operationDate,
    status: session.status,
    startedByUuid: session.startedByUuid,
    startDate: session.startDate,
    completedByUuid: session.completedByUuid,
    completionDate: session.completionDate,
    totalItems: session.totalItems,
    itemsCounted: session.itemsCounted,
    itemsWithVariance: session.itemsWithVariance,
    totalVarianceQuantity: session.totalVarianceQuantity,
    totalVarianceValue: session.totalVarianceValue,
    maxVariancePercentage: session.maxVariancePercentage,
    stockTakeOperationUuid: session.stockTakeOperationUuid,
    adjustmentOperationUuid: session.adjustmentOperationUuid,
    includeExpiredItems: session.includeExpiredItems ?? true,
    includeZeroQuantityItems: session.includeZeroQuantityItems ?? false,
    allowPartialCounts: session.allowPartialCounts ?? false,
    remarks: session.remarks,
    cancellationReason: session.cancellationReason,
    stockTakeItems: session.items?.map(item => ({
      stockItemUuid: item.stockItemUuid,
      batchNumber: item.batchNumber,
      expirationDate: item.expirationDate,
      stockBatchUuid: item.stockBatchUuid,
      systemQuantity: item.systemQuantity,
      systemExpirationDate: item.systemExpirationDate,
      physicalQuantity: item.physicalQuantity,
      physicalExpirationDate: item.physicalExpirationDate,
      varianceQuantity: item.varianceQuantity,
      variancePercentage: item.variancePercentage,
      packagingUomUuid: item.packagingUomUuid,
      packagingUomName: item.packagingUomName,
      remarks: item.remarks,
      counted: item.counted,
      hasVariance: item.hasVariance,
      requiresRecount: item.requiresRecount
    })) || []
  };
}

function parseStockTakeFromAPI(data: any): StockTakeSession {
  const items = data.stockTakeItems?.map((item: any) => {
    const { varianceQuantity, variancePercentage } = calculateVariance(
      item.systemQuantity || 0,
      item.physicalQuantity || 0
    );

    return {
      stockItemUuid: item.stockItem?.uuid,
      stockItemName: item.stockItem?.display,
      batchNumber: item.batchNumber,
      expirationDate: item.expirationDate,
      stockBatchUuid: item.stockBatchUuid,
      systemQuantity: item.systemQuantity || 0,
      systemExpirationDate: item.systemExpirationDate,
      physicalQuantity: item.physicalQuantity || 0,
      physicalExpirationDate: item.physicalExpirationDate,
      varianceQuantity,
      variancePercentage,
      packagingUomUuid: item.packagingUomUuid,
      packagingUomName: item.packagingUomName,
      remarks: item.remarks,
      counted: item.counted || false,
      hasVariance: item.hasVariance || false,
      requiresRecount: item.requiresRecount || false
    };
  }) || [];

  const itemsCounted = items.filter((item: { counted: any; }) => item.counted).length;
  const itemsWithVariance = items.filter((item: { hasVariance: any; }) => item.hasVariance).length;
  const totalVarianceQuantity = items.reduce((sum: any, item: { varianceQuantity: any; }) => sum + item.varianceQuantity, 0);
  const maxVariancePercentage = items.length > 0 
    ? Math.max(...items.map((item: { variancePercentage: number; }) => Math.abs(item.variancePercentage)))
    : 0;

  return {
    uuid: data.uuid,
    locationUuid: data.location?.uuid,
    locationName: data.location?.display,
    operationDate: data.operationDate,
    status: data.status || 'DRAFT',
    startedByUuid: data.startedBy?.uuid,
    startedByName: data.startedBy?.display,
    startDate: data.startDate,
    completedByUuid: data.completedBy?.uuid,
    completedByName: data.completedBy?.display,
    completionDate: data.completionDate,
    totalItems: items.length,
    itemsCounted,
    itemsWithVariance,
    totalVarianceQuantity,
    totalVarianceValue: data.totalVarianceValue,
    maxVariancePercentage,
    stockTakeOperationUuid: data.stockTakeOperationUuid,
    adjustmentOperationUuid: data.adjustmentOperationUuid,
    includeExpiredItems: data.includeExpiredItems ?? true,
    includeZeroQuantityItems: data.includeZeroQuantityItems ?? false,
    allowPartialCounts: data.allowPartialCounts ?? false,
    remarks: data.remarks,
    cancellationReason: data.cancellationReason,
    dateCreated: data.dateCreated,
    creatorUuid: data.creator?.uuid,
    creatorName: data.creator?.display,
    items
  };
}

// ==================== STOCK TAKE ACTIONS ====================

/**
 * Create a new stock take session
 */
export async function createStockTakeSession(
  params: CreateStockTakeParams
): Promise<{
  success: boolean;
  message: string;
  sessionUuid?: string;
  session?: StockTakeSession;
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
    if (!params.locationUuid) {
      return { success: false, message: 'Location is required' };
    }

    if (!params.operationDate) {
      return { success: false, message: 'Operation date is required' };
    }

    // First, get current stock levels for the location
    const stockLevelsResponse = await fetch(
      `${process.env.OPENMRS_API_URL}/stockmanagement/stocklevel?locationUuid=${params.locationUuid}&v=full`,
      { headers }
    );

    if (!stockLevelsResponse.ok) {
      await handleApiError(stockLevelsResponse, 'fetch stock levels');
    }

    const stockLevelsData = await stockLevelsResponse.json();
    const stockLevels = stockLevelsData.results || [];

    // Prepare stock take items from current stock levels
    const items: StockTakeItem[] = stockLevels
      .filter((level: any) => {
        // Filter based on session settings
        if (!params.includeExpiredItems && level.expirationDate) {
          const expiryDate = new Date(level.expirationDate);
          const today = new Date();
          if (expiryDate < today) return false;
        }
        
        if (!params.includeZeroQuantityItems && level.quantity <= 0) {
          return false;
        }
        
        return true;
      })
      .map((level: any) => {
        const item: StockTakeItem = {
          stockItemUuid: level.stockItem?.uuid,
          stockItemName: level.stockItem?.display,
          batchNumber: level.batchNumber,
          expirationDate: level.expirationDate,
          stockBatchUuid: level.stockBatchUuid,
          systemQuantity: level.quantity || 0,
          systemExpirationDate: level.expirationDate,
          physicalQuantity: 0, // To be filled during counting
          physicalExpirationDate: level.expirationDate,
          varianceQuantity: 0,
          variancePercentage: 0,
          packagingUomUuid: level.packagingUomUuid,
          packagingUomName: level.packagingUomName,
          counted: false,
          hasVariance: false,
          requiresRecount: false
        };

        // Set initial physical quantity to system quantity (assume correct)
        item.physicalQuantity = item.systemQuantity;
        const variance = calculateVariance(item.systemQuantity, item.physicalQuantity);
        item.varianceQuantity = variance.varianceQuantity;
        item.variancePercentage = variance.variancePercentage;

        return item;
      });

    // Create stock take session
    const session: Partial<StockTakeSession> = {
      locationUuid: params.locationUuid,
      operationDate: params.operationDate,
      status: 'DRAFT',
      totalItems: items.length,
      itemsCounted: 0,
      itemsWithVariance: 0,
      totalVarianceQuantity: 0,
      includeExpiredItems: params.includeExpiredItems ?? true,
      includeZeroQuantityItems: params.includeZeroQuantityItems ?? false,
      allowPartialCounts: params.allowPartialCounts ?? false,
      remarks: params.remarks,
      items
    };

    const apiPayload = formatStockTakeForAPI(session);

    const url = `${process.env.OPENMRS_API_URL}/stockmanagement/stocktake`;

    console.log('Creating stock take session:', JSON.stringify(apiPayload, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(apiPayload)
    });

    if (!response.ok) {
      await handleApiError(response, 'create stock take session');
    }

    const data = await response.json();

    if (!data?.uuid) {
      throw new Error('Stock take session created but no UUID returned');
    }

    revalidatePath('/pharmacy/stock/stocktakes');
    revalidatePath(`/pharmacy/stock/stocktakes/${data.uuid}`);

    const createdSession = parseStockTakeFromAPI(data);

    return {
      success: true,
      message: 'Stock take session created successfully',
      sessionUuid: data.uuid,
      session: createdSession
    };

  } catch (error) {
    console.error('Error creating stock take session:', error);
    return {
      success: false,
      message: error instanceof Error
        ? error.message
        : 'Failed to create stock take session'
    };
  }
}

/**
 * Start a stock take session (begin counting)
 */
export async function startStockTakeSession(
  sessionUuid: string,
  startedByUuid: string
): Promise<{
  success: boolean;
  message: string;
  session?: StockTakeSession;
}> {
  let headers: Record<string, string>;

  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return { success: false, message: 'Authentication failed' };
  }

  try {
    if (!sessionUuid) {
      return { success: false, message: 'Session UUID is required' };
    }

    if (!startedByUuid) {
      return { success: false, message: 'Started by user UUID is required' };
    }

    const now = new Date().toISOString();
    const url = `${process.env.OPENMRS_API_URL}/stockmanagement/stocktake/${sessionUuid}/start`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify({
        startedByUuid,
        startDate: now
      })
    });

    if (!response.ok) {
      await handleApiError(response, 'start stock take session');
    }

    const data = await response.json();
    const session = parseStockTakeFromAPI(data);

    revalidatePath('/pharmacy/stock/stocktakes');
    revalidatePath(`/pharmacy/stock/stocktakes/${sessionUuid}`);

    return {
      success: true,
      message: 'Stock take session started successfully',
      session
    };

  } catch (error) {
    console.error('Error starting stock take session:', error);
    return {
      success: false,
      message: error instanceof Error
        ? error.message
        : 'Failed to start stock take session'
    };
  }
}

/**
 * Update a stock take item (record physical count)
 */
export async function updateStockTakeItem(
  params: UpdateStockTakeItemParams
): Promise<{
  success: boolean;
  message: string;
  session?: StockTakeSession;
}> {
  let headers: Record<string, string>;

  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return { success: false, message: 'Authentication failed' };
  }

  try {
    const { sessionUuid, stockItemUuid, batchNumber, physicalQuantity, physicalExpirationDate, remarks } = params;

    if (!sessionUuid) {
      return { success: false, message: 'Session UUID is required' };
    }

    if (!stockItemUuid) {
      return { success: false, message: 'Stock item UUID is required' };
    }

    if (physicalQuantity < 0) {
      return { success: false, message: 'Physical quantity cannot be negative' };
    }

    // First, get the current session
    const getUrl = `${process.env.OPENMRS_API_URL}/stockmanagement/stocktake/${sessionUuid}`;
    const getResponse = await fetch(getUrl, { headers });

    if (!getResponse.ok) {
      await handleApiError(getResponse, 'fetch stock take session');
    }

    const sessionData = await getResponse.json();
    const session = parseStockTakeFromAPI(sessionData);

    // Find and update the item
    const itemIndex = session.items.findIndex(item => 
      item.stockItemUuid === stockItemUuid && 
      (!batchNumber || item.batchNumber === batchNumber)
    );

    if (itemIndex === -1) {
      return { success: false, message: 'Stock item not found in session' };
    }

    const item = session.items[itemIndex];
    item.physicalQuantity = physicalQuantity;
    item.physicalExpirationDate = physicalExpirationDate || item.physicalExpirationDate;
    item.remarks = remarks;
    item.counted = true;
    
    // Calculate variance
    const variance = calculateVariance(item.systemQuantity, item.physicalQuantity);
    item.varianceQuantity = variance.varianceQuantity;
    item.variancePercentage = variance.variancePercentage;
    item.hasVariance = Math.abs(variance.varianceQuantity) > 0.001; // Small tolerance
    item.requiresRecount = Math.abs(variance.variancePercentage) > 10; // Flag if variance > 10%

    // Update session totals
    session.itemsCounted = session.items.filter(i => i.counted).length;
    session.itemsWithVariance = session.items.filter(i => i.hasVariance).length;
    session.totalVarianceQuantity = session.items.reduce((sum, i) => sum + i.varianceQuantity, 0);
    session.maxVariancePercentage = session.items.length > 0 
      ? Math.max(...session.items.map(i => Math.abs(i.variancePercentage)))
      : 0;

    // Update the session
    const updateUrl = `${process.env.OPENMRS_API_URL}/stockmanagement/stocktake/${sessionUuid}`;
    const apiPayload = formatStockTakeForAPI(session);

    const updateResponse = await fetch(updateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(apiPayload)
    });

    if (!updateResponse.ok) {
      await handleApiError(updateResponse, 'update stock take item');
    }

    const updatedData = await updateResponse.json();
    const updatedSession = parseStockTakeFromAPI(updatedData);

    revalidatePath(`/pharmacy/stock/stocktakes/${sessionUuid}`);

    return {
      success: true,
      message: 'Stock take item updated successfully',
      session: updatedSession
    };

  } catch (error) {
    console.error('Error updating stock take item:', error);
    return {
      success: false,
      message: error instanceof Error
        ? error.message
        : 'Failed to update stock take item'
    };
  }
}

/**
 * Complete a stock take session
 */
export async function completeStockTakeSession(
  params: CompleteStockTakeParams
): Promise<{
  success: boolean;
  message: string;
  session?: StockTakeSession;
  adjustmentOperationUuid?: string;
}> {
  let headers: Record<string, string>;

  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return { success: false, message: 'Authentication failed' };
  }

  try {
    const { sessionUuid, generateAdjustment, adjustmentReason, completedByUuid } = params;

    if (!sessionUuid) {
      return { success: false, message: 'Session UUID is required' };
    }

    if (!completedByUuid) {
      return { success: false, message: 'Completed by user UUID is required' };
    }

    // First, get the current session
    const getUrl = `${process.env.OPENMRS_API_URL}/stockmanagement/stocktake/${sessionUuid}`;
    const getResponse = await fetch(getUrl, { headers });

    if (!getResponse.ok) {
      await handleApiError(getResponse, 'fetch stock take session');
    }

    const sessionData = await getResponse.json();
    const session = parseStockTakeFromAPI(sessionData);

    // Check if all items are counted
    if (session.itemsCounted < session.totalItems && !session.allowPartialCounts) {
      return { 
        success: false, 
        message: `Cannot complete session: ${session.totalItems - session.itemsCounted} items not counted` 
      };
    }

    const now = new Date().toISOString();
    let adjustmentOperationUuid: string | undefined;

    // Generate adjustment operation if requested and there are variances
    if (generateAdjustment && session.itemsWithVariance > 0) {
      // Create adjustment operation items from variances
      const adjustmentItems = session.items
        .filter(item => item.hasVariance && Math.abs(item.varianceQuantity) > 0.001)
        .map(item => ({
          stockItemUuid: item.stockItemUuid,
          stockItemName: item.stockItemName,
          quantity: Math.abs(item.varianceQuantity),
          batchNumber: item.batchNumber,
          expirationDate: item.expirationDate,
          purchasePrice: 0, // Would need to get from stock item
          sellingPrice: 0   // Would need to get from stock item
        }));

      if (adjustmentItems.length > 0) {
        // Use the stock operation action to create adjustment
        const adjustmentParams = {
          operationType: StockOperationType.ADJUSTMENT,
          locationUuid: session.locationUuid,
          items: adjustmentItems,
          operationDate: now,
          reasonOther: adjustmentReason || 'Stock take variance adjustment',
          status: 'COMPLETED' // Auto-complete since we're adjusting to match physical count
        };

        const adjustmentPayload = {
          operationType: adjustmentParams.operationType,
          locationUuid: adjustmentParams.locationUuid,
          operationDate: adjustmentParams.operationDate,
          status: adjustmentParams.status,
          reasonOther: adjustmentParams.reasonOther,
          stockOperationItems: adjustmentParams.items.map(item => ({
            stockItemUuid: item.stockItemUuid,
            quantity: item.quantity,
            batchNumber: item.batchNumber,
            expirationDate: item.expirationDate
          }))
        };

        const adjustmentUrl = `${process.env.OPENMRS_API_URL}/stockmanagement/stockoperation`;
        const adjustmentResponse = await fetch(adjustmentUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers
          },
          body: JSON.stringify(adjustmentPayload)
        });

        if (adjustmentResponse.ok) {
          const adjustmentData = await adjustmentResponse.json();
          adjustmentOperationUuid = adjustmentData.uuid;
        }
      }
    }

    // Complete the stock take session
    const completeUrl = `${process.env.OPENMRS_API_URL}/stockmanagement/stocktake/${sessionUuid}/complete`;

    const completeResponse = await fetch(completeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify({
        completedByUuid,
        completionDate: now,
        adjustmentOperationUuid
      })
    });

    if (!completeResponse.ok) {
      await handleApiError(completeResponse, 'complete stock take session');
    }

    const completedData = await completeResponse.json();
    const completedSession = parseStockTakeFromAPI(completedData);

    revalidatePath('/pharmacy/stock/stocktakes');
    revalidatePath(`/pharmacy/stock/stocktakes/${sessionUuid}`);
    revalidatePath('/pharmacy/stock/operations');
    revalidatePath('/pharmacy/dashboard');
    revalidatePath('/pharmacy/stock/levels');

    return {
      success: true,
      message: 'Stock take session completed successfully',
      session: completedSession,
      adjustmentOperationUuid
    };

  } catch (error) {
    console.error('Error completing stock take session:', error);
    return {
      success: false,
      message: error instanceof Error
        ? error.message
        : 'Failed to complete stock take session'
    };
  }
}

/**
 * Get stock take session by UUID
 */
export async function getStockTakeSession(
  uuid: string
): Promise<{
  success: boolean;
  data?: StockTakeSession;
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
      return { success: false, message: 'Session UUID is required' };
    }

    const url = `${process.env.OPENMRS_API_URL}/stockmanagement/stocktake/${uuid}?v=full`;

    const response = await fetch(url, { headers });

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, message: 'Stock take session not found' };
      }
      await handleApiError(response, 'fetch stock take session');
    }

    const data = await response.json();

    return {
      success: true,
      data: parseStockTakeFromAPI(data),
      message: 'Stock take session retrieved successfully'
    };

  } catch (error) {
    console.error('Error fetching stock take session:', error);
    return {
      success: false,
      message: error instanceof Error
        ? error.message
        : 'Failed to fetch stock take session'
    };
  }
}

/**
 * Search stock take sessions with filters
 */
export async function searchStockTakeSessions(
  params: StockTakeSearchParams = {}
): Promise<{
  success: boolean;
  data?: StockTakeSession[];
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

    if (params.locationUuid) searchParams.append('locationUuid', params.locationUuid);
    if (params.status) {
      if (Array.isArray(params.status)) {
        params.status.forEach(s => searchParams.append('status', s));
      } else {
        searchParams.append('status', params.status);
      }
    }
    if (params.operationDateFrom) searchParams.append('operationDateFrom', params.operationDateFrom);
    if (params.operationDateTo) searchParams.append('operationDateTo', params.operationDateTo);
    if (params.startedByUuid) searchParams.append('startedByUuid', params.startedByUuid);
    if (params.completedByUuid) searchParams.append('completedByUuid', params.completedByUuid);
    if (params.hasVariance !== undefined) searchParams.append('hasVariance', params.hasVariance.toString());
    if (params.startIndex !== undefined) searchParams.append('startIndex', params.startIndex.toString());
    if (params.limit !== undefined) searchParams.append('limit', params.limit.toString());
    if (params.includeCancelled !== undefined) searchParams.append('includeCancelled', params.includeCancelled.toString());

    searchParams.append('v', 'default');

    const url = `${process.env.OPENMRS_API_URL}/stockmanagement/stocktake?${searchParams.toString()}`;

    const response = await fetch(url, { headers });

    if (!response.ok) {
      await handleApiError(response, 'search stock take sessions');
    }

    const data = await response.json();
    const sessions = data.results?.map(parseStockTakeFromAPI) || [];

    return {
      success: true,
      data: sessions,
      totalCount: data.totalCount || sessions.length,
      message: `Found ${sessions.length} stock take session(s)`
    };

  } catch (error) {
    console.error('Error searching stock take sessions:', error);
    return {
      success: false,
      message: error instanceof Error
        ? error.message
        : 'Failed to search stock take sessions'
    };
  }
}

/**
 * Cancel a stock take session
 */
export async function cancelStockTakeSession(
  sessionUuid: string,
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
    if (!sessionUuid) {
      return { success: false, message: 'Session UUID is required' };
    }

    if (!reason) {
      return { success: false, message: 'Cancellation reason is required' };
    }

    const url = `${process.env.OPENMRS_API_URL}/stockmanagement/stocktake/${sessionUuid}/cancel`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify({ reason })
    });

    if (!response.ok) {
      await handleApiError(response, 'cancel stock take session');
    }

    revalidatePath('/pharmacy/stock/stocktakes');
    revalidatePath(`/pharmacy/stock/stocktakes/${sessionUuid}`);

    return {
      success: true,
      message: 'Stock take session cancelled successfully'
    };

  } catch (error) {
    console.error('Error cancelling stock take session:', error);
    return {
      success: false,
      message: error instanceof Error
        ? error.message
        : 'Failed to cancel stock take session'
    };
  }
}

/**
 * Get items that need recount (variance > threshold)
 */
export async function getItemsNeedingRecount(
  sessionUuid: string,
  varianceThreshold: number = 10
): Promise<{
  success: boolean;
  data?: StockTakeItem[];
  message: string;
}> {
  try {
    const result = await getStockTakeSession(sessionUuid);

    if (!result.success || !result.data) {
      return { success: false, message: result.message };
    }

    const itemsNeedingRecount = result.data.items.filter(
      item => Math.abs(item.variancePercentage) > varianceThreshold
    );

    return {
      success: true,
      data: itemsNeedingRecount,
      message: `Found ${itemsNeedingRecount.length} item(s) needing recount`
    };

  } catch (error) {
    console.error('Error getting items needing recount:', error);
    return {
      success: false,
      message: error instanceof Error
        ? error.message
        : 'Failed to get items needing recount'
    };
  }
}

/**
 * Generate variance report for a stock take session
 */
export async function generateStockTakeVarianceReport(
  sessionUuid: string
): Promise<{
  success: boolean;
  data?: {
    session: StockTakeSession;
    summary: {
      totalItems: number;
      itemsCounted: number;
      itemsWithVariance: number;
      totalVarianceQuantity: number;
      maxVariancePercentage: number;
      completionRate: number;
      varianceRate: number;
    };
    itemsByVariance: {
      highVariance: StockTakeItem[]; // > 20%
      mediumVariance: StockTakeItem[]; // 5-20%
      lowVariance: StockTakeItem[]; // < 5%
      noVariance: StockTakeItem[];
    };
  };
  message: string;
}> {
  try {
    const result = await getStockTakeSession(sessionUuid);

    if (!result.success || !result.data) {
      return { success: false, message: result.message };
    }

    const session = result.data;
    
    const completionRate = session.totalItems > 0 
      ? (session.itemsCounted / session.totalItems) * 100 
      : 0;
    
    const varianceRate = session.itemsCounted > 0
      ? (session.itemsWithVariance / session.itemsCounted) * 100
      : 0;

    const itemsByVariance = {
      highVariance: session.items.filter(item => Math.abs(item.variancePercentage) > 20),
      mediumVariance: session.items.filter(item => 
        Math.abs(item.variancePercentage) >= 5 && Math.abs(item.variancePercentage) <= 20
      ),
      lowVariance: session.items.filter(item => 
        Math.abs(item.variancePercentage) > 0 && Math.abs(item.variancePercentage) < 5
      ),
      noVariance: session.items.filter(item => Math.abs(item.variancePercentage) === 0)
    };

    const summary = {
      totalItems: session.totalItems,
      itemsCounted: session.itemsCounted,
      itemsWithVariance: session.itemsWithVariance,
      totalVarianceQuantity: session.totalVarianceQuantity,
      maxVariancePercentage: session.maxVariancePercentage || 0,
      completionRate: Math.round(completionRate * 100) / 100,
      varianceRate: Math.round(varianceRate * 100) / 100
    };

    return {
      success: true,
      data: { session, summary, itemsByVariance },
      message: 'Variance report generated successfully'
    };

  } catch (error) {
    console.error('Error generating variance report:', error);
    return {
      success: false,
      message: error instanceof Error
        ? error.message
        : 'Failed to generate variance report'
    };
  }
}