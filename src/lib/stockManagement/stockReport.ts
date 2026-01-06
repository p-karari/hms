'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';

// ==================== TYPES & INTERFACES ====================

export interface StockLevel {
  uuid?: string;
  stockItemUuid: string;
  stockItemName: string;
  drugUuid?: string;
  conceptUuid?: string;
  
  locationUuid: string;
  locationName: string;
  
  quantity: number;
  quantityUom: string;
  
  batchNumber?: string;
  batchUuid?: string;
  expirationDate?: string;
  
  purchasePrice?: number;
  purchasePriceCurrency?: string;
  sellingPrice?: number;
  sellingPriceCurrency?: string;
  
  packagingUomUuid?: string;
  packagingUomName?: string;
  
  hasExpiration: boolean;
  isExpired: boolean;
  daysToExpiry?: number;
  
  reorderLevel?: number;
  reorderLevelUom?: string;
  maximumStock?: number;
  
  dateCreated?: string;
  dateUpdated?: string;
  
  // Calculated fields
  stockValue?: number;
  belowReorderLevel: boolean;
  aboveMaximumStock: boolean;
  stockStatus: 'NORMAL' | 'LOW' | 'OVERSTOCK' | 'EXPIRED' | 'CRITICAL';
}

export interface ExpiryItem {
  stockItemUuid: string;
  stockItemName: string;
  locationUuid: string;
  locationName: string;
  batchNumber: string;
  quantity: number;
  quantityUom: string;
  expirationDate: string;
  daysToExpiry: number;
  expiryStatus: 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'SAFE';
  purchasePrice?: number;
  stockValue?: number;
}

export interface ConsumptionItem {
  stockItemUuid: string;
  stockItemName: string;
  locationUuid: string;
  locationName: string;
  
  period: string; // e.g., '2024-01', '2024-W01', '2024-Q1'
  startDate: string;
  endDate: string;
  
  openingBalance: number;
  receipts: number;
  adjustments: number;
  issues: number;
  returns: number;
  disposals: number;
  transfersOut: number;
  transfersIn: number;
  closingBalance: number;
  
  totalConsumption: number;
  averageDailyConsumption?: number;
  consumptionRate?: number; // Percentage change from previous period
  
  unitCost?: number;
  totalCost?: number;
}

export interface StockAlert {
  stockItemUuid: string;
  stockItemName: string;
  locationUuid: string;
  locationName: string;
  
  alertType: 'LOW_STOCK' | 'EXPIRING' | 'OVERSTOCK' | 'EXPIRED' | 'NEEDS_REORDER';
  alertLevel: 'INFO' | 'WARNING' | 'CRITICAL';
  
  currentQuantity: number;
  thresholdQuantity?: number;
  reorderLevel?: number;
  maximumStock?: number;
  
  batchNumber?: string;
  expirationDate?: string;
  daysToExpiry?: number;
  
  message: string;
  suggestedAction?: string;
  dateGenerated: string;
  
  acknowledged?: boolean;
  acknowledgedByUuid?: string;
  acknowledgedByName?: string;
  acknowledgementDate?: string;
}

export interface StockReportParams {
  locationUuid?: string | string[];
  stockItemUuid?: string;
  drugUuid?: string;
  conceptUuid?: string;
  
  // Date ranges
  startDate?: string;
  endDate?: string;
  dateRange?: 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_QUARTER' | 'THIS_YEAR' | 'CUSTOM';
  
  // Filtering
  includeExpired?: boolean;
  includeZeroQuantity?: boolean;
  belowReorderLevelOnly?: boolean;
  aboveMaximumStockOnly?: boolean;
  
  // Expiry filters
  expiryThresholdDays?: number; // Items expiring within X days
  expiryStatus?: 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'SAFE' | 'ALL';
  
  // Pagination
  startIndex?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface StockSummary {
  locationUuid: string;
  locationName: string;
  
  totalItems: number;
  totalStockValue: number;
  
  itemsInStock: number;
  itemsOutOfStock: number;
  itemsBelowReorderLevel: number;
  itemsAboveMaximumStock: number;
  
  expiredItems: number;
  expiringSoonItems: number; // Within 30 days
  
  totalQuantity: number;
  averageStockValuePerItem: number;
  
  lastUpdated: string;
}

export interface ReorderRecommendation {
  stockItemUuid: string;
  stockItemName: string;
  locationUuid: string;
  locationName: string;
  
  currentQuantity: number;
  reorderLevel: number;
  maximumStock: number;
  
  averageDailyConsumption: number;
  leadTimeDays: number; // Estimated days to receive new stock
  safetyStock: number;
  
  recommendedOrderQuantity: number;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedCost?: number;
  
  lastOrderDate?: string;
  lastOrderQuantity?: number;
}

// ==================== API ERROR HANDLER ====================

async function handleApiError(response: Response, source: string) {
  if (response.status === 401 || response.status === 403) {
    redirectToLogin();
    throw new Error(`Authentication failed: HTTP ${response.status}`);
  }

  const errorText = await response.text();
  console.error(`Stock Report API Error [${source}] ${response.status}: ${errorText}`);
  throw new Error(`Failed to ${source}: HTTP ${response.status} - ${errorText}`);
}

// ==================== HELPER FUNCTIONS ====================

function calculateDaysToExpiry(expirationDate?: string): number | undefined {
  if (!expirationDate) return undefined;
  
  const expiry = new Date(expirationDate);
  const today = new Date();
  
  // Reset time portion for accurate day calculation
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

function getExpiryStatus(daysToExpiry?: number): 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'SAFE' {
  if (daysToExpiry === undefined) return 'SAFE';
  if (daysToExpiry < 0) return 'EXPIRED';
  if (daysToExpiry <= 30) return 'CRITICAL'; // Within 30 days
  if (daysToExpiry <= 90) return 'WARNING'; // Within 90 days
  return 'SAFE';
}

function getStockStatus(
  quantity: number,
  reorderLevel?: number,
  maximumStock?: number,
  isExpired?: boolean
): 'NORMAL' | 'LOW' | 'OVERSTOCK' | 'EXPIRED' | 'CRITICAL' {
  if (isExpired) return 'EXPIRED';
  
  if (reorderLevel !== undefined) {
    if (quantity <= 0) return 'CRITICAL';
    if (quantity <= reorderLevel * 0.5) return 'CRITICAL'; // Below 50% of reorder level
    if (quantity <= reorderLevel) return 'LOW';
  }
  
  if (maximumStock !== undefined && quantity > maximumStock) {
    return 'OVERSTOCK';
  }
  
  return 'NORMAL';
}

function parseStockLevelFromAPI(data: any): StockLevel {
  const daysToExpiry = calculateDaysToExpiry(data.expirationDate);
  const isExpired = daysToExpiry !== undefined && daysToExpiry < 0;
  const expiryStatus = getExpiryStatus(daysToExpiry);
  
  const stockStatus = getStockStatus(
    data.quantity || 0,
    data.reorderLevel,
    data.maximumStock,
    isExpired
  );
  
  const stockValue = (data.quantity || 0) * (data.purchasePrice || 0);
  
  return {
    uuid: data.uuid,
    stockItemUuid: data.stockItem?.uuid,
    stockItemName: data.stockItem?.display,
    drugUuid: data.drugUuid,
    conceptUuid: data.conceptUuid,
    locationUuid: data.location?.uuid,
    locationName: data.location?.display,
    quantity: data.quantity || 0,
    quantityUom: data.quantityUom,
    batchNumber: data.batchNumber,
    batchUuid: data.stockBatchUuid,
    expirationDate: data.expirationDate,
    purchasePrice: data.purchasePrice,
    purchasePriceCurrency: data.purchasePriceCurrency,
    sellingPrice: data.sellingPrice,
    sellingPriceCurrency: data.sellingPriceCurrency,
    packagingUomUuid: data.packagingUomUuid,
    packagingUomName: data.packagingUomName,
    hasExpiration: data.hasExpiration || false,
    isExpired,
    daysToExpiry,
    reorderLevel: data.reorderLevel,
    reorderLevelUom: data.reorderLevelUom,
    maximumStock: data.maximumStock,
    dateCreated: data.dateCreated,
    dateUpdated: data.dateChanged,
    stockValue,
    belowReorderLevel: data.reorderLevel !== undefined && (data.quantity || 0) <= data.reorderLevel,
    aboveMaximumStock: data.maximumStock !== undefined && (data.quantity || 0) > data.maximumStock,
    stockStatus
  };
}

function getDateRangeParams(params: StockReportParams): { startDate: string; endDate: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  let startDate = params.startDate;
  let endDate = params.endDate;
  
  if (params.dateRange && !startDate && !endDate) {
    switch (params.dateRange) {
      case 'TODAY':
        startDate = today.toISOString().split('T')[0];
        endDate = today.toISOString().split('T')[0];
        break;
      case 'THIS_WEEK':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
        startDate = startOfWeek.toISOString().split('T')[0];
        endDate = today.toISOString().split('T')[0];
        break;
      case 'THIS_MONTH':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        endDate = today.toISOString().split('T')[0];
        break;
      case 'THIS_QUARTER':
        const quarter = Math.floor(today.getMonth() / 3);
        startDate = new Date(today.getFullYear(), quarter * 3, 1).toISOString().split('T')[0];
        endDate = today.toISOString().split('T')[0];
        break;
      case 'THIS_YEAR':
        startDate = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
        endDate = today.toISOString().split('T')[0];
        break;
    }
  }
  
  // Default to last 30 days if no range specified
  if (!startDate) {
    const defaultStart = new Date(today);
    defaultStart.setDate(today.getDate() - 30);
    startDate = defaultStart.toISOString().split('T')[0];
  }
  
  if (!endDate) {
    endDate = today.toISOString().split('T')[0];
  }
  
  return { startDate, endDate };
}

// ==================== STOCK REPORT ACTIONS ====================

/**
 * Get current stock levels with filters
 */
export async function getStockLevels(
  params: StockReportParams = {}
): Promise<{
  success: boolean;
  data?: StockLevel[];
  summary?: StockSummary;
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

    // Handle multiple locations
    if (params.locationUuid) {
      if (Array.isArray(params.locationUuid)) {
        params.locationUuid.forEach(location => searchParams.append('locationUuid', location));
      } else {
        searchParams.append('locationUuid', params.locationUuid);
      }
    }
    
    if (params.stockItemUuid) searchParams.append('stockItemUuid', params.stockItemUuid);
    if (params.drugUuid) searchParams.append('drugUuid', params.drugUuid);
    if (params.conceptUuid) searchParams.append('conceptUuid', params.conceptUuid);
    
    // Filter by expiry
    if (params.expiryThresholdDays !== undefined) {
      searchParams.append('expiryThresholdDays', params.expiryThresholdDays.toString());
    }
    
    if (params.includeExpired !== undefined) {
      searchParams.append('includeExpired', params.includeExpired.toString());
    }
    
    if (params.includeZeroQuantity !== undefined) {
      searchParams.append('includeZeroQuantity', params.includeZeroQuantity.toString());
    }
    
    if (params.belowReorderLevelOnly) {
      searchParams.append('belowReorderLevel', 'true');
    }
    
    if (params.aboveMaximumStockOnly) {
      searchParams.append('aboveMaximumStock', 'true');
    }
    
    // Pagination and sorting
    if (params.startIndex !== undefined) searchParams.append('startIndex', params.startIndex.toString());
    if (params.limit !== undefined) searchParams.append('limit', params.limit.toString());
    if (params.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.append('sortOrder', params.sortOrder);
    
    searchParams.append('v', 'full');

    const url = `${process.env.OPENMRS_API_URL}/stockmanagement/stockiteminventory?${searchParams.toString()}`;

    const response = await fetch(url, { headers });

    if (!response.ok) {
      await handleApiError(response, 'fetch stock levels');
    }

    const data = await response.json();
    const stockLevels = data.results?.map(parseStockLevelFromAPI) || [];

    // Calculate summary
    const summary = calculateStockSummary(stockLevels, params.locationUuid);

    return {
      success: true,
      data: stockLevels,
      summary,
      totalCount: data.totalCount || stockLevels.length,
      message: `Found ${stockLevels.length} stock level(s)`
    };

  } catch (error) {
    console.error('Error fetching stock levels:', error);
    return {
      success: false,
      message: error instanceof Error
        ? error.message
        : 'Failed to fetch stock levels'
    };
  }
}

/**
 * Get expiring/expired items
 */
export async function getExpiryItems(
  params: StockReportParams = {}
): Promise<{
  success: boolean;
  data?: ExpiryItem[];
  summary?: {
    totalItems: number;
    expiredCount: number;
    criticalCount: number;
    warningCount: number;
    safeCount: number;
    totalValue: number;
  };
  message: string;
}> {
  try {
    // First get stock levels
    const stockLevelsResult = await getStockLevels({
      ...params,
      includeExpired: params.includeExpired ?? true,
      includeZeroQuantity: false
    });

    if (!stockLevelsResult.success || !stockLevelsResult.data) {
      return { success: false, message: stockLevelsResult.message };
    }

    // Filter and transform to expiry items
    const expiryItems: ExpiryItem[] = stockLevelsResult.data
      .filter(level => {
        // Must have expiration info
        if (!level.hasExpiration || !level.expirationDate) return false;

        // If an expiryStatus filter is provided, evaluate it here so map never returns null
        if (params.expiryStatus && params.expiryStatus !== 'ALL') {
          const daysToExpiry = level.daysToExpiry || 0;
          const expiryStatus = getExpiryStatus(daysToExpiry);
          return params.expiryStatus === expiryStatus;
        }

        return true;
      })
      .map(level => {
        const daysToExpiry = level.daysToExpiry || 0;
        const expiryStatus = getExpiryStatus(daysToExpiry);

        return {
          stockItemUuid: level.stockItemUuid,
          stockItemName: level.stockItemName,
          locationUuid: level.locationUuid,
          locationName: level.locationName,
          batchNumber: level.batchNumber || 'DEFAULT',
          quantity: level.quantity,
          quantityUom: level.quantityUom,
          expirationDate: level.expirationDate!,
          daysToExpiry,
          expiryStatus,
          purchasePrice: level.purchasePrice,
          stockValue: level.stockValue
        };
      });

    // Calculate summary
    const summary = {
      totalItems: expiryItems.length,
      expiredCount: expiryItems.filter(item => item.expiryStatus === 'EXPIRED').length,
      criticalCount: expiryItems.filter(item => item.expiryStatus === 'CRITICAL').length,
      warningCount: expiryItems.filter(item => item.expiryStatus === 'WARNING').length,
      safeCount: expiryItems.filter(item => item.expiryStatus === 'SAFE').length,
      totalValue: expiryItems.reduce((sum, item) => sum + (item.stockValue || 0), 0)
    };

    return {
      success: true,
      data: expiryItems,
      summary,
      message: `Found ${expiryItems.length} expiring item(s)`
    };

  } catch (error) {
    console.error('Error fetching expiry items:', error);
    return {
      success: false,
      message: error instanceof Error
        ? error.message
        : 'Failed to fetch expiry items'
    };
  }
}

/**
 * Get consumption report
 */
export async function getConsumptionReport(
  params: StockReportParams = {}
): Promise<{
  success: boolean;
  data?: ConsumptionItem[];
  summary?: {
    totalItems: number;
    totalConsumption: number;
    totalCost: number;
    averageDailyConsumption: number;
    period: string;
  };
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
    const { startDate, endDate } = getDateRangeParams(params);
    
    // This would typically involve querying stock operations for the period
    // Since OpenMRS Stock Module might not have a direct consumption endpoint,
    // we'll simulate the logic by fetching operations and calculating
    
    const searchParams = new URLSearchParams();
    
    if (params.locationUuid) {
      if (Array.isArray(params.locationUuid)) {
        params.locationUuid.forEach(loc => searchParams.append('locationUuid', loc));
      } else {
        searchParams.append('locationUuid', params.locationUuid);
      }
    }
    
    searchParams.append('operationDateFrom', startDate);
    searchParams.append('operationDateTo', endDate);
    searchParams.append('status', 'COMPLETED');
    searchParams.append('v', 'full');
    searchParams.append('limit', '1000'); // Get all operations for period

    const url = `${process.env.OPENMRS_API_URL}/stockmanagement/stockoperation?${searchParams.toString()}`;

    const response = await fetch(url, { headers });

    if (!response.ok) {
      await handleApiError(response, 'fetch consumption data');
    }

    const data = await response.json();
    const operations = data.results || [];

    // Group operations by stock item and calculate consumption
    const consumptionMap = new Map<string, ConsumptionItem>();
    
    // First, get opening balances (stock levels at start date)
    // This is simplified - in production, you'd need historical stock level data
    
    // Process each operation
    operations.forEach((op: any) => {
      const operationType = op.operationType?.uuid;
      const locationUuid = op.location?.uuid;
      const locationName = op.location?.display;
      
      op.stockOperationItems?.forEach((item: any) => {
        const stockItemUuid = item.stockItem?.uuid;
        const stockItemName = item.stockItem?.display;
        const quantity = item.quantity || 0;
        
        if (!stockItemUuid) return;
        
        const key = `${stockItemUuid}_${locationUuid}`;
        
        if (!consumptionMap.has(key)) {
          consumptionMap.set(key, {
            stockItemUuid,
            stockItemName,
            locationUuid: locationUuid || '',
            locationName: locationName || 'Unknown',
            period: `${startDate} to ${endDate}`,
            startDate,
            endDate,
            openingBalance: 0, // Would need to calculate from historical data
            receipts: 0,
            adjustments: 0,
            issues: 0,
            returns: 0,
            disposals: 0,
            transfersOut: 0,
            transfersIn: 0,
            closingBalance: 0,
            totalConsumption: 0,
            unitCost: item.purchasePrice,
            totalCost: 0
          });
        }
        
        const consumptionItem = consumptionMap.get(key)!;
        
        // Categorize by operation type
        switch (operationType) {
          case '44444444-4444-4444-4444-444444444444': // Receipt
            consumptionItem.receipts += quantity;
            break;
          case '11111111-1111-1111-1111-111111111111': // Adjustment
            consumptionItem.adjustments += quantity;
            break;
          case '66666666-6666-6666-6666-666666666666': // Stock Issue
            consumptionItem.issues += quantity;
            break;
          case '55555555-5555-5555-5555-555555555555': // Return
            consumptionItem.returns += quantity;
            break;
          case '22222222-2222-2222-2222-222222222222': // Disposal
            consumptionItem.disposals += quantity;
            break;
          case '33333333-3333-3333-3333-333333333333': // Transfer Out
            consumptionItem.transfersOut += quantity;
            break;
          // Note: Transfer In would be a Receipt at destination
        }
      });
    });
    
    // Calculate derived fields
    const consumptionItems = Array.from(consumptionMap.values()).map(item => {
      // Calculate total consumption (issues + disposals + transfers out)
      item.totalConsumption = item.issues + item.disposals + item.transfersOut;
      
      // Calculate closing balance (simplified)
      item.closingBalance = item.openingBalance + item.receipts + item.adjustments + item.returns 
        - item.issues - item.disposals - item.transfersOut + item.transfersIn;
      
      // Calculate average daily consumption
      const daysInPeriod = Math.ceil(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;
      item.averageDailyConsumption = daysInPeriod > 0 ? item.totalConsumption / daysInPeriod : 0;
      
      // Calculate total cost
      item.totalCost = item.totalConsumption * (item.unitCost || 0);
      
      return item;
    });
    
    // Calculate summary
    const totalConsumption = consumptionItems.reduce((sum, item) => sum + item.totalConsumption, 0);
    const totalCost = consumptionItems.reduce((sum, item) => sum + (item.totalCost || 0), 0);
    const avgDailyConsumption = consumptionItems.reduce((sum, item) => sum + (item.averageDailyConsumption || 0), 0) / consumptionItems.length;
    
    const summary = {
      totalItems: consumptionItems.length,
      totalConsumption,
      totalCost,
      averageDailyConsumption: avgDailyConsumption,
      period: `${startDate} to ${endDate}`
    };

    return {
      success: true,
      data: consumptionItems,
      summary,
      message: `Generated consumption report for ${consumptionItems.length} item(s)`
    };

  } catch (error) {
    console.error('Error generating consumption report:', error);
    return {
      success: false,
      message: error instanceof Error
        ? error.message
        : 'Failed to generate consumption report'
    };
  }
}

/**
 * Get stock alerts (low stock, expiring items, etc.)
 */
export async function getStockAlerts(
  params: StockReportParams = {}
): Promise<{
  success: boolean;
  data?: StockAlert[];
  summary?: {
    totalAlerts: number;
    criticalAlerts: number;
    warningAlerts: number;
    infoAlerts: number;
    byType: Record<string, number>;
  };
  message: string;
}> {
  try {
    const alerts: StockAlert[] = [];
    const now = new Date().toISOString();

    // 1. Check for low stock alerts
    const stockLevelsResult = await getStockLevels({
      ...params,
      belowReorderLevelOnly: true,
      includeZeroQuantity: true
    });

    if (stockLevelsResult.success && stockLevelsResult.data) {
      stockLevelsResult.data.forEach(level => {
        if (level.belowReorderLevel && level.quantity > 0) {
          const alertLevel = level.quantity <= (level.reorderLevel || 0) * 0.5 ? 'CRITICAL' : 'WARNING';
          
          alerts.push({
            stockItemUuid: level.stockItemUuid,
            stockItemName: level.stockItemName,
            locationUuid: level.locationUuid,
            locationName: level.locationName,
            alertType: 'LOW_STOCK',
            alertLevel,
            currentQuantity: level.quantity,
            thresholdQuantity: level.reorderLevel,
            reorderLevel: level.reorderLevel,
            maximumStock: level.maximumStock,
            message: `${level.stockItemName} is below reorder level (${level.quantity} of ${level.reorderLevel})`,
            suggestedAction: `Reorder ${(level.maximumStock || level.reorderLevel || 0) - level.quantity} units`,
            dateGenerated: now
          });
        }
        
        if (level.quantity === 0) {
          alerts.push({
            stockItemUuid: level.stockItemUuid,
            stockItemName: level.stockItemName,
            locationUuid: level.locationUuid,
            locationName: level.locationName,
            alertType: 'NEEDS_REORDER',
            alertLevel: 'CRITICAL',
            currentQuantity: 0,
            reorderLevel: level.reorderLevel,
            maximumStock: level.maximumStock,
            message: `${level.stockItemName} is out of stock`,
            suggestedAction: `Urgently reorder ${level.maximumStock || (level.reorderLevel || 100) * 2} units`,
            dateGenerated: now
          });
        }
      });
    }

    // 2. Check for expiring items
    const expiryResult = await getExpiryItems({
      ...params,
      expiryStatus: 'CRITICAL' // Only critical expiry (within 30 days)
    });

    if (expiryResult.success && expiryResult.data) {
      expiryResult.data.forEach(item => {
        alerts.push({
          stockItemUuid: item.stockItemUuid,
          stockItemName: item.stockItemName,
          locationUuid: item.locationUuid,
          locationName: item.locationName,
          alertType: 'EXPIRING',
          alertLevel: 'CRITICAL',
          currentQuantity: item.quantity,
          batchNumber: item.batchNumber,
          expirationDate: item.expirationDate,
          daysToExpiry: item.daysToExpiry,
          message: `${item.stockItemName} (Batch: ${item.batchNumber}) expires in ${item.daysToExpiry} days`,
          suggestedAction: `Use soon or transfer to high-consumption location`,
          dateGenerated: now
        });
      });
    }

    // 3. Check for expired items
    const expiredResult = await getExpiryItems({
      ...params,
      expiryStatus: 'EXPIRED'
    });

    if (expiredResult.success && expiredResult.data) {
      expiredResult.data.forEach(item => {
        alerts.push({
          stockItemUuid: item.stockItemUuid,
          stockItemName: item.stockItemName,
          locationUuid: item.locationUuid,
          locationName: item.locationName,
          alertType: 'EXPIRED',
          alertLevel: 'WARNING',
          currentQuantity: item.quantity,
          batchNumber: item.batchNumber,
          expirationDate: item.expirationDate,
          daysToExpiry: item.daysToExpiry,
          message: `${item.stockItemName} (Batch: ${item.batchNumber}) expired ${Math.abs(item.daysToExpiry || 0)} days ago`,
          suggestedAction: `Dispose of ${item.quantity} expired units`,
          dateGenerated: now
        });
      });
    }

    // 4. Check for overstock
    const overstockResult = await getStockLevels({
      ...params,
      aboveMaximumStockOnly: true
    });

    if (overstockResult.success && overstockResult.data) {
      overstockResult.data.forEach(level => {
        if (level.aboveMaximumStock) {
          alerts.push({
            stockItemUuid: level.stockItemUuid,
            stockItemName: level.stockItemName,
            locationUuid: level.locationUuid,
            locationName: level.locationName,
            alertType: 'OVERSTOCK',
            alertLevel: 'INFO',
            currentQuantity: level.quantity,
            thresholdQuantity: level.maximumStock,
            maximumStock: level.maximumStock,
            message: `${level.stockItemName} is above maximum stock level (${level.quantity} of ${level.maximumStock})`,
            suggestedAction: `Consider transferring excess stock to other locations`,
            dateGenerated: now
          });
        }
      });
    }

    // Sort alerts by criticality
    const alertPriority: Record<'CRITICAL' | 'WARNING' | 'INFO', number> = {
      CRITICAL: 1,
      WARNING: 2,
      INFO: 3
    };

    alerts.sort((a, b) => {
      const priorityDiff = alertPriority[a.alertLevel] - alertPriority[b.alertLevel];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Same priority, sort by date
      return new Date(b.dateGenerated).getTime() - new Date(a.dateGenerated).getTime();
    });

    // Calculate summary
    const criticalAlerts = alerts.filter(a => a.alertLevel === 'CRITICAL').length;
    const warningAlerts = alerts.filter(a => a.alertLevel === 'WARNING').length;
    const infoAlerts = alerts.filter(a => a.alertLevel === 'INFO').length;
    
    const byType = alerts.reduce((acc, alert) => {
      acc[alert.alertType] = (acc[alert.alertType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const summary = {
      totalAlerts: alerts.length,
      criticalAlerts,
      warningAlerts,
      infoAlerts,
      byType
    };

    return {
      success: true,
      data: alerts,
      summary,
      message: `Found ${alerts.length} alert(s)`
    };

  } catch (error) {
    console.error('Error generating stock alerts:', error);
    return {
      success: false,
      message: error instanceof Error
        ? error.message
        : 'Failed to generate stock alerts'
    };
  }
}

/**
 * Get reorder recommendations
 */
export async function getReorderRecommendations(
  params: StockReportParams = {}
): Promise<{
  success: boolean;
  data?: ReorderRecommendation[];
  summary?: {
    totalRecommendations: number;
    criticalRecommendations: number;
    highRecommendations: number;
    totalEstimatedCost: number;
  };
  message: string;
}> {
  try {
    // Get low stock items
    const stockLevelsResult = await getStockLevels({
      ...params,
      belowReorderLevelOnly: true,
      includeZeroQuantity: true
    });

    if (!stockLevelsResult.success || !stockLevelsResult.data) {
      return { success: false, message: stockLevelsResult.message };
    }

    const lowStockItems = stockLevelsResult.data.filter(level => level.belowReorderLevel);

    // Get consumption data for these items (last 30 days)
    const consumptionResult = await getConsumptionReport({
      ...params,
      dateRange: 'THIS_MONTH'
    });

    const consumptionMap = new Map<string, number>();
    if (consumptionResult.success && consumptionResult.data) {
      consumptionResult.data.forEach(item => {
        const key = `${item.stockItemUuid}_${item.locationUuid}`;
        consumptionMap.set(key, item.averageDailyConsumption || 0);
      });
    }

    const recommendations: ReorderRecommendation[] = lowStockItems.map(item => {
      const key = `${item.stockItemUuid}_${item.locationUuid}`;
      const avgDailyConsumption = consumptionMap.get(key) || 1; // Default to 1 if no data
      
      const leadTimeDays = 7; // Assume 7-day lead time
      const safetyStock = avgDailyConsumption * leadTimeDays * 1.5; // 1.5x lead time demand
      
      const currentQuantity = item.quantity || 0;
      const reorderLevel = item.reorderLevel || 0;
      const maximumStock = item.maximumStock || (reorderLevel * 3);
      
      // Calculate recommended order quantity
      let recommendedOrderQuantity = maximumStock - currentQuantity;
      if (recommendedOrderQuantity < reorderLevel) {
        recommendedOrderQuantity = reorderLevel;
      }
      
      // Add safety stock consideration
      recommendedOrderQuantity = Math.max(recommendedOrderQuantity, safetyStock);
      
      // Determine urgency
      let urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
      const stockoutRisk = currentQuantity / (avgDailyConsumption * leadTimeDays);
      
      if (currentQuantity === 0) {
        urgency = 'CRITICAL';
      } else if (stockoutRisk < 1) {
        urgency = 'HIGH';
      } else if (stockoutRisk < 3) {
        urgency = 'MEDIUM';
      }
      
      // Estimate cost
      const estimatedCost = recommendedOrderQuantity * (item.purchasePrice || 0);

      return {
        stockItemUuid: item.stockItemUuid,
        stockItemName: item.stockItemName,
        locationUuid: item.locationUuid,
        locationName: item.locationName,
        currentQuantity,
        reorderLevel,
        maximumStock,
        averageDailyConsumption: avgDailyConsumption,
        leadTimeDays,
        safetyStock,
        recommendedOrderQuantity: Math.round(recommendedOrderQuantity),
        urgency,
        estimatedCost,
        lastOrderDate: item.dateUpdated,
        lastOrderQuantity: maximumStock // Simplified - would need actual order history
      };
    });

    // Sort by urgency
    const urgencyPriority: Record<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW', number> = {
      CRITICAL: 1,
      HIGH: 2,
      MEDIUM: 3,
      LOW: 4
    };

    recommendations.sort((a, b) => urgencyPriority[a.urgency] - urgencyPriority[b.urgency]);

    // Calculate summary
    const criticalRecs = recommendations.filter(r => r.urgency === 'CRITICAL').length;
    const highRecs = recommendations.filter(r => r.urgency === 'HIGH').length;
    const totalEstimatedCost = recommendations.reduce((sum, r) => sum + (r.estimatedCost || 0), 0);

    const summary = {
      totalRecommendations: recommendations.length,
      criticalRecommendations: criticalRecs,
      highRecommendations: highRecs,
      totalEstimatedCost
    };

    return {
      success: true,
      data: recommendations,
      summary,
      message: `Generated ${recommendations.length} reorder recommendation(s)`
    };

  } catch (error) {
    console.error('Error generating reorder recommendations:', error);
    return {
      success: false,
      message: error instanceof Error
        ? error.message
        : 'Failed to generate reorder recommendations'
    };
  }
}

/**
 * Helper function to calculate stock summary
 */
function calculateStockSummary(
  stockLevels: StockLevel[],
  locationFilter?: string | string[]
): StockSummary {
  const now = new Date().toISOString();
  
  // If multiple locations, create summary for each
  const locationMap = new Map<string, StockSummary>();
  
  stockLevels.forEach(level => {
    const locationUuid = level.locationUuid;
    
    if (!locationMap.has(locationUuid)) {
      locationMap.set(locationUuid, {
        locationUuid,
        locationName: level.locationName,
        totalItems: 0,
        totalStockValue: 0,
        itemsInStock: 0,
        itemsOutOfStock: 0,
        itemsBelowReorderLevel: 0,
        itemsAboveMaximumStock: 0,
        expiredItems: 0,
        expiringSoonItems: 0,
        totalQuantity: 0,
        averageStockValuePerItem: 0,
        lastUpdated: now
      });
    }
    
    const summary = locationMap.get(locationUuid)!;
    
    summary.totalItems++;
    summary.totalStockValue += level.stockValue || 0;
    summary.totalQuantity += level.quantity;
    
    if (level.quantity > 0) {
      summary.itemsInStock++;
    } else {
      summary.itemsOutOfStock++;
    }
    
    if (level.belowReorderLevel) {
      summary.itemsBelowReorderLevel++;
    }
    
    if (level.aboveMaximumStock) {
      summary.itemsAboveMaximumStock++;
    }
    
    if (level.isExpired) {
      summary.expiredItems++;
    } else if (level.daysToExpiry !== undefined && level.daysToExpiry <= 30) {
      summary.expiringSoonItems++;
    }
  });
  
  // Calculate averages
  locationMap.forEach(summary => {
    summary.averageStockValuePerItem = summary.totalItems > 0 
      ? summary.totalStockValue / summary.totalItems 
      : 0;
  });
  
  // If single location requested, return that summary
  if (locationFilter && !Array.isArray(locationFilter)) {
    return locationMap.get(locationFilter) || {
      locationUuid: locationFilter,
      locationName: 'Unknown Location',
      totalItems: 0,
      totalStockValue: 0,
      itemsInStock: 0,
      itemsOutOfStock: 0,
      itemsBelowReorderLevel: 0,
      itemsAboveMaximumStock: 0,
      expiredItems: 0,
      expiringSoonItems: 0,
      totalQuantity: 0,
      averageStockValuePerItem: 0,
      lastUpdated: now
    };
  }
  
  // Otherwise, return combined summary for all locations
  const combinedSummary: StockSummary = {
    locationUuid: 'ALL',
    locationName: 'All Locations',
    totalItems: 0,
    totalStockValue: 0,
    itemsInStock: 0,
    itemsOutOfStock: 0,
    itemsBelowReorderLevel: 0,
    itemsAboveMaximumStock: 0,
    expiredItems: 0,
    expiringSoonItems: 0,
    totalQuantity: 0,
    averageStockValuePerItem: 0,
    lastUpdated: now
  };
  
  locationMap.forEach(summary => {
    combinedSummary.totalItems += summary.totalItems;
    combinedSummary.totalStockValue += summary.totalStockValue;
    combinedSummary.itemsInStock += summary.itemsInStock;
    combinedSummary.itemsOutOfStock += summary.itemsOutOfStock;
    combinedSummary.itemsBelowReorderLevel += summary.itemsBelowReorderLevel;
    combinedSummary.itemsAboveMaximumStock += summary.itemsAboveMaximumStock;
    combinedSummary.expiredItems += summary.expiredItems;
    combinedSummary.expiringSoonItems += summary.expiringSoonItems;
    combinedSummary.totalQuantity += summary.totalQuantity;
  });
  
  combinedSummary.averageStockValuePerItem = combinedSummary.totalItems > 0 
    ? combinedSummary.totalStockValue / combinedSummary.totalItems 
    : 0;
  
  return combinedSummary;
}

/**
 * Export stock data to CSV/Excel
 */
export async function exportStockReport(
  params: StockReportParams,
  format: 'CSV' | 'JSON' | 'EXCEL' = 'CSV'
): Promise<{
  success: boolean;
  data?: string; // Base64 encoded or JSON string
  filename?: string;
  message: string;
}> {
  try {
    // Get the data based on report type
    let data: any[] = [];
    let filename = 'stock-report';
    
    if (params.expiryThresholdDays !== undefined || params.expiryStatus) {
      const result = await getExpiryItems(params);
      if (result.success && result.data) {
        data = result.data;
        filename = 'expiry-report';
      }
    } else if (params.belowReorderLevelOnly) {
      const result = await getStockLevels(params);
      if (result.success && result.data) {
        data = result.data;
        filename = 'low-stock-report';
      }
    } else if (params.startDate || params.endDate || params.dateRange) {
      const result = await getConsumptionReport(params);
      if (result.success && result.data) {
        data = result.data;
        filename = 'consumption-report';
      }
    } else {
      const result = await getStockLevels(params);
      if (result.success && result.data) {
        data = result.data;
        filename = 'stock-levels-report';
      }
    }
    
    if (data.length === 0) {
      return { success: false, message: 'No data to export' };
    }
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    filename = `${filename}-${timestamp}`;
    
    if (format === 'JSON') {
      return {
        success: true,
        data: JSON.stringify(data, null, 2),
        filename: `${filename}.json`,
        message: 'Report exported successfully'
      };
    }
    
    // For CSV/Excel, convert to CSV string
    if (data.length > 0) {
      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = (row as any)[header];
            if (value === null || value === undefined) return '';
            // Escape quotes and wrap in quotes if contains comma
            const stringValue = String(value).replace(/"/g, '""');
            return stringValue.includes(',') ? `"${stringValue}"` : stringValue;
          }).join(',')
        )
      ];
      
      const csvString = csvRows.join('\n');
      
      if (format === 'CSV') {
        return {
          success: true,
          data: csvString,
          filename: `${filename}.csv`,
          message: 'Report exported successfully'
        };
      }
      
      // For Excel, we would typically use a library like xlsx
      // For now, return CSV with .xlsx extension
      return {
        success: true,
        data: csvString,
        filename: `${filename}.xlsx`,
        message: 'Report exported successfully (CSV format with Excel extension)'
      };
    }
    
    return { success: false, message: 'Failed to generate export data' };

  } catch (error) {
    console.error('Error exporting stock report:', error);
    return {
      success: false,
      message: error instanceof Error
        ? error.message
        : 'Failed to export stock report'
    };
  }
}