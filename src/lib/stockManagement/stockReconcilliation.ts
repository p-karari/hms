'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
import { revalidatePath } from 'next/cache';
import { StockLevel } from './stockReport';
import { StockOperationType } from './stockOperationTypes';
// import { StockOperationType } from './stockOperation';
// import { StockOperationType } from './stock-operation.actions';
// import { StockLevel } from './stock-report.actions';

// ==================== TYPES & INTERFACES ====================

export interface DispensingEvent {
  dispensingId: string;
  patientUuid: string;
  patientName?: string;
  medicationUuid: string;
  medicationName: string;
  quantity: number;
  unit: string;
  dispensingDate: string;
  locationUuid: string;
  prescriberUuid?: string;
  encounterUuid?: string;
  prescriptionUuid?: string;
  
  // For reconciliation
  batchNumber?: string;
  stockBatchUuid?: string;
  reconciled?: boolean;
  reconciliationDate?: string;
  reconciledByUuid?: string;
}

export interface ReconciliationItem {
  stockItemUuid: string;
  stockItemName: string;
  batchNumber?: string;
  stockBatchUuid?: string;
  
  locationUuid: string;
  locationName: string;
  
  // Theoretical stock (based on transactions)
  theoreticalQuantity: number;
  
  // Actual stock (from stock levels)
  actualQuantity: number;
  
  // Dispensed quantity (period)
  dispensedQuantity: number;
  
  // Other transactions
  receivedQuantity: number;
  adjustedQuantity: number;
  transferredOutQuantity: number;
  transferredInQuantity: number;
  disposedQuantity: number;
  returnedQuantity: number;
  
  // Variance
  varianceQuantity: number;
  variancePercentage: number;
  
  // Status
  status: 'MATCH' | 'MINOR_VARIANCE' | 'MAJOR_VARIANCE' | 'UNRECONCILED';
  requiresInvestigation: boolean;
  
  // Investigation notes
  investigationNotes?: string;
  resolvedByUuid?: string;
  resolutionDate?: string;
  resolutionType?: 'ADJUSTMENT' | 'WRITE_OFF' | 'CORRECTION' | 'OTHER';
}

export interface ReconciliationPeriod {
  startDate: string;
  endDate: string;
  periodType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM';
  locationUuid: string;
}

export interface ReconciliationReport {
  period: ReconciliationPeriod;
  generatedDate: string;
  generatedByUuid: string;
  
  // Summary
  totalItems: number;
  matchedItems: number;
  minorVarianceItems: number;
  majorVarianceItems: number;
  unreconciledItems: number;
  
  totalTheoreticalValue: number;
  totalActualValue: number;
  totalVarianceValue: number;
  
  // Items
  items: ReconciliationItem[];
  
  // Status
  status: 'IN_PROGRESS' | 'COMPLETED' | 'REVIEWED' | 'APPROVED' | 'FINALIZED';
  approvedByUuid?: string;
  approvalDate?: string;
  notes?: string;
  
  // Auto-generated adjustments
  autoAdjustmentUuid?: string;
  manualAdjustments: string[]; // UUIDs of manual adjustments made
}

export interface BatchReconciliation {
  batchNumber: string;
  stockBatchUuid?: string;
  stockItemUuid: string;
  stockItemName: string;
  
  openingBalance: number;
  receivedQuantity: number;
  dispensedQuantity: number;
  adjustedQuantity: number;
  disposedQuantity: number;
  returnedQuantity: number;
  closingBalance: number;
  
  expirationDate?: string;
  daysToExpiry?: number;
  
  // Actual count
  actualQuantity: number;
  varianceQuantity: number;
  
  // Batch status
  batchStatus: 'ACTIVE' | 'EXPIRED' | 'DEPLETED' | 'NEAR_EXPIRY';
  
  // Reconciliation
  lastReconciledDate?: string;
  reconciliationStatus: 'RECONCILED' | 'VARIANCES' | 'UNRECONCILED';
}

export interface AuditTrailEntry {
  timestamp: string;
  userUuid: string;
  userName?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ADJUST' | 'DISPENSE' | 'RECONCILE' | 'APPROVE';
  entityType: 'STOCK_ITEM' | 'STOCK_OPERATION' | 'STOCK_LEVEL' | 'BATCH' | 'RECONCILIATION';
  entityUuid: string;
  entityName?: string;
  
  // Changes
  previousValue?: any;
  newValue?: any;
  changes?: Record<string, { from: any; to: any }>;
  
  locationUuid?: string;
  ipAddress?: string;
  userAgent?: string;
  
  // Additional context
  referenceUuid?: string; // e.g., prescription ID, patient ID
  notes?: string;
}

export interface ReconciliationParams {
  period: ReconciliationPeriod;
  locationUuid: string;
  generateAdjustments?: boolean;
  adjustmentReason?: string;
  autoApproveMinorVariances?: boolean;
  varianceThreshold?: number; // Percentage threshold for minor vs major variances
}

// ==================== API ERROR HANDLER ====================

async function handleApiError(response: Response, source: string) {
  if (response.status === 401 || response.status === 403) {
    redirectToLogin();
    throw new Error(`Authentication failed: HTTP ${response.status}`);
  }

  const errorText = await response.text();
  console.error(`Stock Reconciliation API Error [${source}] ${response.status}: ${errorText}`);
  throw new Error(`Failed to ${source}: HTTP ${response.status} - ${errorText}`);
}

// ==================== HELPER FUNCTIONS ====================

function calculateVarianceStatus(
  varianceQuantity: number,
  variancePercentage: number,
  threshold: number = 10
): 'MATCH' | 'MINOR_VARIANCE' | 'MAJOR_VARIANCE' | 'UNRECONCILED' {
  if (varianceQuantity === 0) return 'MATCH';
  
  if (Math.abs(variancePercentage) <= threshold) {
    return 'MINOR_VARIANCE';
  } else if (Math.abs(variancePercentage) <= threshold * 3) {
    return 'MAJOR_VARIANCE';
  } else {
    return 'UNRECONCILED';
  }
}

function formatReconciliationForAPI(report: Partial<ReconciliationReport>): any {
  return {
    period: report.period,
    generatedDate: report.generatedDate,
    generatedByUuid: report.generatedByUuid,
    totalItems: report.totalItems,
    matchedItems: report.matchedItems,
    minorVarianceItems: report.minorVarianceItems,
    majorVarianceItems: report.majorVarianceItems,
    unreconciledItems: report.unreconciledItems,
    totalTheoreticalValue: report.totalTheoreticalValue,
    totalActualValue: report.totalActualValue,
    totalVarianceValue: report.totalVarianceValue,
    status: report.status,
    approvedByUuid: report.approvedByUuid,
    approvalDate: report.approvalDate,
    notes: report.notes,
    autoAdjustmentUuid: report.autoAdjustmentUuid,
    manualAdjustments: report.manualAdjustments,
    reconciliationItems: report.items?.map(item => ({
      stockItemUuid: item.stockItemUuid,
      batchNumber: item.batchNumber,
      stockBatchUuid: item.stockBatchUuid,
      locationUuid: item.locationUuid,
      theoreticalQuantity: item.theoreticalQuantity,
      actualQuantity: item.actualQuantity,
      dispensedQuantity: item.dispensedQuantity,
      receivedQuantity: item.receivedQuantity,
      adjustedQuantity: item.adjustedQuantity,
      transferredOutQuantity: item.transferredOutQuantity,
      transferredInQuantity: item.transferredInQuantity,
      disposedQuantity: item.disposedQuantity,
      returnedQuantity: item.returnedQuantity,
      varianceQuantity: item.varianceQuantity,
      variancePercentage: item.variancePercentage,
      status: item.status,
      requiresInvestigation: item.requiresInvestigation,
      investigationNotes: item.investigationNotes,
      resolvedByUuid: item.resolvedByUuid,
      resolutionDate: item.resolutionDate,
      resolutionType: item.resolutionType
    })) || []
  };
}

function parseReconciliationFromAPI(data: any): ReconciliationReport {
  return {
    period: data.period,
    generatedDate: data.generatedDate,
    generatedByUuid: data.generatedBy?.uuid || data.generatedByUuid,
    totalItems: data.totalItems || 0,
    matchedItems: data.matchedItems || 0,
    minorVarianceItems: data.minorVarianceItems || 0,
    majorVarianceItems: data.majorVarianceItems || 0,
    unreconciledItems: data.unreconciledItems || 0,
    totalTheoreticalValue: data.totalTheoreticalValue || 0,
    totalActualValue: data.totalActualValue || 0,
    totalVarianceValue: data.totalVarianceValue || 0,
    status: data.status || 'IN_PROGRESS',
    approvedByUuid: data.approvedBy?.uuid || data.approvedByUuid,
    approvalDate: data.approvalDate,
    notes: data.notes,
    autoAdjustmentUuid: data.autoAdjustmentUuid,
    manualAdjustments: data.manualAdjustments || [],
    items: data.reconciliationItems?.map((item: any) => ({
      stockItemUuid: item.stockItemUuid,
      stockItemName: item.stockItemName,
      batchNumber: item.batchNumber,
      stockBatchUuid: item.stockBatchUuid,
      locationUuid: item.locationUuid,
      locationName: item.locationName,
      theoreticalQuantity: item.theoreticalQuantity || 0,
      actualQuantity: item.actualQuantity || 0,
      dispensedQuantity: item.dispensedQuantity || 0,
      receivedQuantity: item.receivedQuantity || 0,
      adjustedQuantity: item.adjustedQuantity || 0,
      transferredOutQuantity: item.transferredOutQuantity || 0,
      transferredInQuantity: item.transferredInQuantity || 0,
      disposedQuantity: item.disposedQuantity || 0,
      returnedQuantity: item.returnedQuantity || 0,
      varianceQuantity: item.varianceQuantity || 0,
      variancePercentage: item.variancePercentage || 0,
      status: item.status || 'UNRECONCILED',
      requiresInvestigation: item.requiresInvestigation || false,
      investigationNotes: item.investigationNotes,
      resolvedByUuid: item.resolvedByUuid,
      resolutionDate: item.resolutionDate,
      resolutionType: item.resolutionType
    })) || []
  };
}

// ==================== STOCK RECONCILIATION ACTIONS ====================

/**
 * Reconcile dispensing events with stock levels
 */
export async function reconcileDispensingWithStock(
  params: ReconciliationParams
): Promise<{
  success: boolean;
  message: string;
  report?: ReconciliationReport;
  autoAdjustments?: string[]; // UUIDs of auto-generated adjustments
}> {
  let headers: Record<string, string>;

  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return { success: false, message: 'Authentication failed' };
  }

  try {
    const {
      period,
      locationUuid,
      generateAdjustments = false,
      adjustmentReason = 'Auto-adjustment from reconciliation',
      autoApproveMinorVariances = false,
      varianceThreshold = 5
    } = params;

    if (!period || !period.startDate || !period.endDate) {
      return { success: false, message: 'Valid period is required' };
    }

    if (!locationUuid) {
      return { success: false, message: 'Location is required' };
    }

    console.log(`Starting reconciliation for location ${locationUuid}, period ${period.startDate} to ${period.endDate}`);

    // 1. Get current stock levels
    const stockLevelsResponse = await fetch(
      `${process.env.OPENMRS_API_URL}/stockmanagement/stocklevel?locationUuid=${locationUuid}&v=full`,
      { headers }
    );

    if (!stockLevelsResponse.ok) {
      await handleApiError(stockLevelsResponse, 'fetch stock levels');
    }

    const stockLevelsData = await stockLevelsResponse.json();
    const stockLevels: StockLevel[] = stockLevelsData.results?.map((level: any) => ({
      stockItemUuid: level.stockItem?.uuid,
      stockItemName: level.stockItem?.display,
      locationUuid: level.location?.uuid,
      locationName: level.location?.display,
      quantity: level.quantity || 0,
      batchNumber: level.batchNumber,
      stockBatchUuid: level.stockBatchUuid,
      expirationDate: level.expirationDate
    })) || [];

    // 2. Get dispensing events for the period (from FHIR MedicationDispense)
    // Note: This would need to query your dispensing module's data
    // For now, we'll simulate or use a placeholder
    const dispensingEvents = await getDispensingEventsForPeriod(
      period.startDate,
      period.endDate,
      locationUuid,
      headers
    );

    // 3. Get stock operations for the period
    const operationsResponse = await fetch(
      `${process.env.OPENMRS_API_URL}/stockmanagement/stockoperation?` +
      `locationUuid=${locationUuid}&` +
      `operationDateFrom=${period.startDate}&` +
      `operationDateTo=${period.endDate}&` +
      `status=COMPLETED&v=full&limit=1000`,
      { headers }
    );

    if (!operationsResponse.ok) {
      await handleApiError(operationsResponse, 'fetch stock operations');
    }

    const operationsData = await operationsResponse.json();
    const operations = operationsData.results || [];

    // 4. Calculate theoretical stock for each item
    const reconciliationItems = calculateTheoreticalStock(
      stockLevels,
      dispensingEvents,
      operations,
      period
    );

    // 5. Compare with actual stock and calculate variances
    const reportItems: ReconciliationItem[] = [];
    const autoAdjustments: string[] = [];

    for (const item of reconciliationItems) {
      const actualStock = stockLevels.find(
        level => level.stockItemUuid === item.stockItemUuid &&
        level.batchNumber === item.batchNumber
      );

      const actualQuantity = actualStock?.quantity || 0;
      const varianceQuantity = actualQuantity - item.theoreticalQuantity;
      const variancePercentage = item.theoreticalQuantity > 0 
        ? (varianceQuantity / item.theoreticalQuantity) * 100 
        : (actualQuantity > 0 ? 100 : 0);

      const status = calculateVarianceStatus(varianceQuantity, Math.abs(variancePercentage), varianceThreshold);
      const requiresInvestigation = status === 'MAJOR_VARIANCE' || status === 'UNRECONCILED';

      const reconciliationItem: ReconciliationItem = {
        ...item,
        actualQuantity,
        varianceQuantity,
        variancePercentage,
        status,
        requiresInvestigation
      };

      reportItems.push(reconciliationItem);

      // Auto-generate adjustments if enabled
      if (generateAdjustments && Math.abs(varianceQuantity) > 0.001) {
        // Check if auto-approve applies
        const shouldAutoAdjust = autoApproveMinorVariances && status === 'MINOR_VARIANCE';
        
        if (shouldAutoAdjust) {
          const adjustmentResult = await createAutoAdjustment(
            locationUuid,
            item.stockItemUuid,
            item.stockItemName,
            varianceQuantity,
            item.batchNumber,
            adjustmentReason,
            headers
          );

          if (adjustmentResult.success && adjustmentResult.operationUuid) {
            autoAdjustments.push(adjustmentResult.operationUuid);
            reconciliationItem.resolutionType = 'ADJUSTMENT';
            reconciliationItem.resolvedByUuid = 'SYSTEM';
            reconciliationItem.resolutionDate = new Date().toISOString();
            reconciliationItem.requiresInvestigation = false;
            reconciliationItem.status = 'MATCH';
          }
        }
      }
    }

    // 6. Create reconciliation report
    const matchedItems = reportItems.filter(item => item.status === 'MATCH').length;
    const minorVarianceItems = reportItems.filter(item => item.status === 'MINOR_VARIANCE').length;
    const majorVarianceItems = reportItems.filter(item => item.status === 'MAJOR_VARIANCE').length;
    const unreconciledItems = reportItems.filter(item => item.status === 'UNRECONCILED').length;

    const totalTheoreticalValue = reportItems.reduce((sum, item) => {
      // Would need item cost from stock item
      return sum + item.theoreticalQuantity;
    }, 0);

    const totalActualValue = reportItems.reduce((sum, item) => {
      return sum + item.actualQuantity;
    }, 0);

    const totalVarianceValue = Math.abs(totalActualValue - totalTheoreticalValue);

    const report: ReconciliationReport = {
      period,
      generatedDate: new Date().toISOString(),
      generatedByUuid: 'CURRENT_USER', // Would need to get from auth
      totalItems: reportItems.length,
      matchedItems,
      minorVarianceItems,
      majorVarianceItems,
      unreconciledItems,
      totalTheoreticalValue,
      totalActualValue,
      totalVarianceValue,
      items: reportItems,
      status: autoAdjustments.length > 0 ? 'COMPLETED' : 'IN_PROGRESS',
      notes: `Reconciliation completed with ${autoAdjustments.length} auto-adjustments`,
      autoAdjustmentUuid: autoAdjustments.length > 0 ? autoAdjustments[0] : undefined,
      manualAdjustments: [],
      // Save to database if your system supports it
    };

    // 7. Save reconciliation report (if supported by your OpenMRS module)
    // const saveResult = await saveReconciliationReport(report, headers);
    
    // 8. Update dispensing events as reconciled
    await markDispensingEventsAsReconciled(
      dispensingEvents,
      period,
      headers
    );

    revalidatePath('/pharmacy/stock/reconciliation');
    revalidatePath('/pharmacy/dashboard');

    return {
      success: true,
      message: `Reconciliation completed: ${matchedItems} matched, ${minorVarianceItems} minor variances, ${majorVarianceItems} major variances`,
      report,
      autoAdjustments
    };

  } catch (error) {
    console.error('Error reconciling dispensing with stock:', error);
    return {
      success: false,
      message: error instanceof Error
        ? error.message
        : 'Failed to reconcile dispensing with stock'
    };
  }
}

/**
 * Get batch-level reconciliation
 */
export async function getBatchReconciliation(
  locationUuid: string,
  stockItemUuid?: string
): Promise<{
  success: boolean;
  data?: BatchReconciliation[];
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
    if (!locationUuid) {
      return { success: false, message: 'Location is required' };
    }

    // Get stock levels with batches
    const stockLevelsResponse = await fetch(
      `${process.env.OPENMRS_API_URL}/stockmanagement/stocklevel?` +
      `locationUuid=${locationUuid}` +
      (stockItemUuid ? `&stockItemUuid=${stockItemUuid}` : '') +
      `&v=full`,
      { headers }
    );

    if (!stockLevelsResponse.ok) {
      await handleApiError(stockLevelsResponse, 'fetch batch stock levels');
    }

    const stockLevelsData = await stockLevelsResponse.json();
    const stockLevels = stockLevelsData.results || [];

    // Get operations for batches (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const fromDate = ninetyDaysAgo.toISOString().split('T')[0];

    const operationsResponse = await fetch(
      `${process.env.OPENMRS_API_URL}/stockmanagement/stockoperation?` +
      `locationUuid=${locationUuid}&` +
      `operationDateFrom=${fromDate}&` +
      `v=full&limit=1000`,
      { headers }
    );

    if (!operationsResponse.ok) {
      await handleApiError(operationsResponse, 'fetch batch operations');
    }

    const operationsData = await operationsResponse.json();
    const operations = operationsData.results || [];

    // Get dispensing events for batches (last 90 days)
    const dispensingEvents = await getDispensingEventsForPeriod(
      fromDate,
      new Date().toISOString().split('T')[0],
      locationUuid,
      headers
    );

    // Group by batch and calculate
    const batchMap = new Map<string, BatchReconciliation>();

    // Initialize from stock levels
    stockLevels.forEach((level: any) => {
      if (!level.batchNumber) return;

      const batchKey = `${level.stockItem?.uuid}_${level.batchNumber}`;
      const daysToExpiry = level.expirationDate 
        ? Math.ceil((new Date(level.expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : undefined;

      let batchStatus: 'ACTIVE' | 'EXPIRED' | 'DEPLETED' | 'NEAR_EXPIRY' = 'ACTIVE';
      if (level.quantity === 0) {
        batchStatus = 'DEPLETED';
      } else if (daysToExpiry !== undefined) {
        if (daysToExpiry < 0) {
          batchStatus = 'EXPIRED';
        } else if (daysToExpiry <= 30) {
          batchStatus = 'NEAR_EXPIRY';
        }
      }

      batchMap.set(batchKey, {
        batchNumber: level.batchNumber,
        stockBatchUuid: level.stockBatchUuid,
        stockItemUuid: level.stockItem?.uuid,
        stockItemName: level.stockItem?.display,
        openingBalance: 0, // Would need historical data
        receivedQuantity: 0,
        dispensedQuantity: 0,
        adjustedQuantity: 0,
        disposedQuantity: 0,
        returnedQuantity: 0,
        closingBalance: level.quantity || 0,
        expirationDate: level.expirationDate,
        daysToExpiry,
        actualQuantity: level.quantity || 0,
        varianceQuantity: 0,
        batchStatus,
        reconciliationStatus: 'UNRECONCILED',
        lastReconciledDate: undefined
      });
    });

    // Process operations to update batch quantities
    operations.forEach((op: any) => {
      const operationType = op.operationType?.uuid;
      
      op.stockOperationItems?.forEach((item: any) => {
        if (!item.batchNumber) return;
        
        const batchKey = `${item.stockItem?.uuid}_${item.batchNumber}`;
        const batch = batchMap.get(batchKey);
        
        if (!batch) return;
        
        const quantity = item.quantity || 0;
        
        switch (operationType) {
          case '44444444-4444-4444-4444-444444444444': // Receipt
            batch.receivedQuantity += quantity;
            break;
          case '11111111-1111-1111-1111-111111111111': // Adjustment
            batch.adjustedQuantity += quantity;
            break;
          case '22222222-2222-2222-2222-222222222222': // Disposal
            batch.disposedQuantity += quantity;
            break;
          case '55555555-5555-5555-5555-555555555555': // Return
            batch.returnedQuantity += quantity;
            break;
        }
      });
    });

    // Process dispensing events
    dispensingEvents.forEach((event: DispensingEvent) => {
      if (!event.batchNumber) return;
      
      const batchKey = `${event.medicationUuid}_${event.batchNumber}`;
      const batch = batchMap.get(batchKey);
      
      if (!batch) return;
      
      batch.dispensedQuantity += event.quantity;
    });

    // Calculate theoretical closing balance and variance
    const batchReconciliations = Array.from(batchMap.values()).map(batch => {
      const theoreticalClosing = batch.openingBalance + 
        batch.receivedQuantity + 
        batch.adjustedQuantity + 
        batch.returnedQuantity - 
        batch.dispensedQuantity - 
        batch.disposedQuantity;
      
      batch.varianceQuantity = batch.actualQuantity - theoreticalClosing;
      
      // Update reconciliation status based on variance
      if (Math.abs(batch.varianceQuantity) < 0.001) {
        batch.reconciliationStatus = 'RECONCILED';
      } else if (Math.abs(batch.varianceQuantity) <= batch.actualQuantity * 0.05) { // 5% variance
        batch.reconciliationStatus = 'VARIANCES';
      } else {
        batch.reconciliationStatus = 'UNRECONCILED';
      }
      
      return batch;
    });

    return {
      success: true,
      data: batchReconciliations,
      message: `Found ${batchReconciliations.length} batch(es)`
    };

  } catch (error) {
    console.error('Error getting batch reconciliation:', error);
    return {
      success: false,
      message: error instanceof Error
        ? error.message
        : 'Failed to get batch reconciliation'
    };
  }
}

/**
 * Get audit trail for stock movements
 */
export async function getStockAuditTrail(
  entityType?: 'STOCK_ITEM' | 'STOCK_OPERATION' | 'STOCK_LEVEL' | 'BATCH',
  entityUuid?: string,
  startDate?: string,
  endDate?: string,
  locationUuid?: string
): Promise<{
  success: boolean;
  data?: AuditTrailEntry[];
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
    // Note: OpenMRS Stock Module may not have a dedicated audit trail endpoint
    // This would need to be implemented based on your system's audit capabilities
    // For now, we'll simulate by combining data from various sources
    
    const auditTrail: AuditTrailEntry[] = [];

    // 1. Get stock operations as audit entries
    const opsParams = new URLSearchParams();
    if (locationUuid) opsParams.append('locationUuid', locationUuid);
    if (startDate) opsParams.append('operationDateFrom', startDate);
    if (endDate) opsParams.append('operationDateTo', endDate);
    opsParams.append('v', 'full');
    opsParams.append('limit', '100');

    const opsResponse = await fetch(
      `${process.env.OPENMRS_API_URL}/stockmanagement/stockoperation?${opsParams.toString()}`,
      { headers }
    );

    if (opsResponse.ok) {
      const opsData = await opsResponse.json();
      const operations = opsData.results || [];

      operations.forEach((op: any) => {
        auditTrail.push({
          timestamp: op.dateCreated || op.operationDate,
          userUuid: op.creator?.uuid,
          userName: op.creator?.display,
          action: 'CREATE',
          entityType: 'STOCK_OPERATION',
          entityUuid: op.uuid,
          entityName: `${op.operationType?.name} #${op.operationNumber}`,
          locationUuid: op.location?.uuid,
          notes: op.remarks
        });

        // Add status changes
        if (op.dateChanged && op.changedBy) {
          auditTrail.push({
            timestamp: op.dateChanged,
            userUuid: op.changedBy?.uuid,
            userName: op.changedBy?.display,
            action: 'UPDATE',
            entityType: 'STOCK_OPERATION',
            entityUuid: op.uuid,
            entityName: `${op.operationType?.name} #${op.operationNumber}`,
            locationUuid: op.location?.uuid,
            changes: { status: { from: 'PENDING', to: op.status } },
            notes: `Status changed to ${op.status}`
          });
        }
      });
    }

    // 2. Get dispensing events as audit entries (from your dispensing module)
    // This would need integration with your existing dispensing system
    
    // 3. Sort by timestamp
    auditTrail.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // 4. Filter by entity if specified
    let filteredTrail = auditTrail;
    if (entityType && entityUuid) {
      filteredTrail = auditTrail.filter(entry => 
        entry.entityType === entityType && entry.entityUuid === entityUuid
      );
    }

    return {
      success: true,
      data: filteredTrail,
      message: `Found ${filteredTrail.length} audit trail entry(s)`
    };

  } catch (error) {
    console.error('Error getting audit trail:', error);
    return {
      success: false,
      message: error instanceof Error
        ? error.message
        : 'Failed to get audit trail'
    };
  }
}

/**
 * Resolve reconciliation variances
 */
export async function resolveReconciliationVariance(
  stockItemUuid: string,
  batchNumber: string | undefined,
  locationUuid: string,
  varianceQuantity: number,
  resolutionType: 'ADJUSTMENT' | 'WRITE_OFF' | 'CORRECTION' | 'OTHER',
  resolvedByUuid: string,
  notes?: string
): Promise<{
  success: boolean;
  message: string;
  adjustmentUuid?: string;
}> {
  let headers: Record<string, string>;

  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return { success: false, message: 'Authentication failed' };
  }

  try {
    if (!stockItemUuid) {
      return { success: false, message: 'Stock item UUID is required' };
    }

    if (!locationUuid) {
      return { success: false, message: 'Location is required' };
    }

    if (!resolvedByUuid) {
      return { success: false, message: 'Resolver UUID is required' };
    }

    let adjustmentUuid: string | undefined;

    // Create adjustment operation if needed
    if (resolutionType === 'ADJUSTMENT' && Math.abs(varianceQuantity) > 0.001) {
      // Get stock item name
      const itemResponse = await fetch(
        `${process.env.OPENMRS_API_URL}/stockmanagement/stockitem/${stockItemUuid}`,
        { headers }
      );

      let stockItemName = 'Unknown Item';
      if (itemResponse.ok) {
        const itemData = await itemResponse.json();
        stockItemName = itemData.drugName || stockItemName;
      }

      const adjustmentResult = await createAutoAdjustment(
        locationUuid,
        stockItemUuid,
        stockItemName,
        varianceQuantity,
        batchNumber,
        `Manual adjustment from variance resolution: ${notes || 'No notes'}`,
        headers
      );

      if (adjustmentResult.success && adjustmentResult.operationUuid) {
        adjustmentUuid = adjustmentResult.operationUuid;
      }
    }

    // Record resolution in audit trail or custom table
    const resolutionEntry = {
      timestamp: new Date().toISOString(),
      userUuid: resolvedByUuid,
      action: 'RECONCILE' as const,
      entityType: 'STOCK_ITEM' as const,
      entityUuid: stockItemUuid,
      entityName: `Stock Item ${stockItemUuid}`,
      locationUuid,
      notes: `Variance resolution: ${resolutionType}. ${notes || ''}`
    };

    // Save resolution record (would need custom endpoint or table)
    // await saveResolutionRecord(resolutionEntry, headers);

    revalidatePath('/pharmacy/stock/reconciliation');
    revalidatePath('/pharmacy/dashboard');

    return {
      success: true,
      message: `Variance resolved with ${resolutionType}`,
      adjustmentUuid
    };

  } catch (error) {
    console.error('Error resolving reconciliation variance:', error);
    return {
      success: false,
      message: error instanceof Error
        ? error.message
        : 'Failed to resolve reconciliation variance'
    };
  }
}

// ==================== PRIVATE HELPER FUNCTIONS ====================

/**
 * Get dispensing events for a period (integrate with your dispensing module)
 */
async function getDispensingEventsForPeriod(
  startDate: string,
  endDate: string,
  locationUuid: string,
  headers: Record<string, string>
): Promise<DispensingEvent[]> {
  try {
    // This should integrate with your existing dispensing module
    // Using FHIR MedicationDispense endpoint
    const fhirUrl = `${process.env.OPENMRS_API_URL_ALT}/MedicationDispense?` +
      `_summary=data&` +
      `whenhandedover=ge${startDate}&` +
      `whenhandedover=le${endDate}&` +
      `location=${locationUuid}`;

    const response = await fetch(fhirUrl, { headers });

    if (!response.ok) {
      console.warn('Could not fetch dispensing events from FHIR:', response.status);
      return [];
    }

    const data = await response.json();
    const entries = data.entry || [];

    return entries.map((entry: any) => {
      const resource = entry.resource;
      return {
        dispensingId: resource.id,
        patientUuid: resource.subject?.reference?.replace('Patient/', ''),
        medicationUuid: resource.medicationReference?.reference?.replace('Medication/', ''),
        medicationName: resource.medicationReference?.display || 'Unknown Medication',
        quantity: resource.quantity?.value || 0,
        unit: resource.quantity?.unit || '',
        dispensingDate: resource.whenHandedOver || resource.whenPrepared,
        locationUuid: resource.location?.reference?.replace('Location/', ''),
        prescriberUuid: resource.performer?.[0]?.actor?.reference?.replace('Practitioner/', ''),
        encounterUuid: resource.context?.reference?.replace('Encounter/', ''),
        prescriptionUuid: resource.authorizingPrescription?.[0]?.reference?.replace('MedicationRequest/', ''),
        reconciled: false
      };
    });

  } catch (error) {
    console.error('Error fetching dispensing events:', error);
    return [];
  }
}

/**
 * Calculate theoretical stock based on transactions
 */
function calculateTheoreticalStock(
  stockLevels: StockLevel[],
  dispensingEvents: DispensingEvent[],
  operations: any[],
  period: ReconciliationPeriod
): Array<{
  stockItemUuid: string;
  stockItemName: string;
  batchNumber?: string;
  stockBatchUuid?: string;
  locationUuid: string;
  locationName: string;
  theoreticalQuantity: number;
  dispensedQuantity: number;
  receivedQuantity: number;
  adjustedQuantity: number;
  transferredOutQuantity: number;
  transferredInQuantity: number;
  disposedQuantity: number;
  returnedQuantity: number;
}> {
  const itemMap = new Map<string, any>();

  // Initialize from stock levels (assume they represent opening balance)
  stockLevels.forEach(level => {
    const key = `${level.stockItemUuid}_${level.batchNumber || 'NO_BATCH'}`;
    itemMap.set(key, {
      stockItemUuid: level.stockItemUuid,
      stockItemName: level.stockItemName,
      batchNumber: level.batchNumber,
    //   stockBatchUuid: level.stockBatchUuid,
      locationUuid: level.locationUuid,
      locationName: level.locationName,
      theoreticalQuantity: level.quantity, // Start with current quantity
      dispensedQuantity: 0,
      receivedQuantity: 0,
      adjustedQuantity: 0,
      transferredOutQuantity: 0,
      transferredInQuantity: 0,
      disposedQuantity: 0,
      returnedQuantity: 0
    });
  });

  // Process dispensing events (reduce stock)
  dispensingEvents.forEach(event => {
    const batchKey = event.batchNumber || 'NO_BATCH';
    const key = `${event.medicationUuid}_${batchKey}`;
    
    if (itemMap.has(key)) {
      const item = itemMap.get(key);
      item.dispensedQuantity += event.quantity;
      item.theoreticalQuantity -= event.quantity; // Dispensing reduces stock
    } else {
      // Item not in current stock levels (completely dispensed)
      itemMap.set(key, {
        stockItemUuid: event.medicationUuid,
        stockItemName: event.medicationName,
        batchNumber: event.batchNumber,
        locationUuid: event.locationUuid,
        locationName: 'Unknown Location',
        theoreticalQuantity: -event.quantity, // Negative because all dispensed
        dispensedQuantity: event.quantity,
        receivedQuantity: 0,
        adjustedQuantity: 0,
        transferredOutQuantity: 0,
        transferredInQuantity: 0,
        disposedQuantity: 0,
        returnedQuantity: 0
      });
    }
  });

  // Process stock operations
  operations.forEach(op => {
    const operationType = op.operationType?.uuid;
    const locationUuid = op.location?.uuid;
    
    op.stockOperationItems?.forEach((item: any) => {
      const batchKey = item.batchNumber || 'NO_BATCH';
      const key = `${item.stockItem?.uuid}_${batchKey}`;
      
      if (!itemMap.has(key)) {
        itemMap.set(key, {
          stockItemUuid: item.stockItem?.uuid,
          stockItemName: item.stockItem?.display,
          batchNumber: item.batchNumber,
          stockBatchUuid: item.stockBatchUuid,
          locationUuid,
          locationName: op.location?.display || 'Unknown Location',
          theoreticalQuantity: 0,
          dispensedQuantity: 0,
          receivedQuantity: 0,
          adjustedQuantity: 0,
          transferredOutQuantity: 0,
          transferredInQuantity: 0,
          disposedQuantity: 0,
          returnedQuantity: 0
        });
      }
      
      const mapItem = itemMap.get(key);
      const quantity = item.quantity || 0;
      
      switch (operationType) {
        case '44444444-4444-4444-4444-444444444444': // Receipt
          mapItem.receivedQuantity += quantity;
          mapItem.theoreticalQuantity += quantity;
          break;
        case '11111111-1111-1111-1111-111111111111': // Adjustment
          mapItem.adjustedQuantity += quantity;
          mapItem.theoreticalQuantity += quantity;
          break;
        case '66666666-6666-6666-6666-666666666666': // Stock Issue
          mapItem.transferredOutQuantity += quantity;
          mapItem.theoreticalQuantity -= quantity;
          break;
        case '33333333-3333-3333-3333-333333333333': // Transfer Out
          mapItem.transferredOutQuantity += quantity;
          mapItem.theoreticalQuantity -= quantity;
          break;
        case '22222222-2222-2222-2222-222222222222': // Disposal
          mapItem.disposedQuantity += quantity;
          mapItem.theoreticalQuantity -= quantity;
          break;
        case '55555555-5555-5555-5555-555555555555': // Return
          mapItem.returnedQuantity += quantity;
          mapItem.theoreticalQuantity += quantity;
          break;
        // Note: Transfer In would be a Receipt at destination
      }
    });
  });

  return Array.from(itemMap.values());
}

/**
 * Create auto-adjustment for variances
 */
async function createAutoAdjustment(
  locationUuid: string,
  stockItemUuid: string,
  stockItemName: string,
  varianceQuantity: number,
  batchNumber: string | undefined,
  reason: string,
  headers: Record<string, string>
): Promise<{
  success: boolean;
  operationUuid?: string;
  message: string;
}> {
  try {
    // Variance quantity is actual - theoretical
    // If positive, we have more than expected (need negative adjustment)
    // If negative, we have less than expected (need positive adjustment)
    const adjustmentQuantity = -varianceQuantity; // Inverse to correct the variance
    
    const adjustmentPayload = {
      operationType: StockOperationType.ADJUSTMENT,
      locationUuid,
      operationDate: new Date().toISOString(),
      status: 'COMPLETED',
      reasonOther: reason,
      stockOperationItems: [
        {
          stockItemUuid,
          quantity: Math.abs(adjustmentQuantity),
          batchNumber,
          adjustmentType: adjustmentQuantity > 0 ? 'ADD' : 'REMOVE'
        }
      ]
    };

    const url = `${process.env.OPENMRS_API_URL}/stockmanagement/stockoperation`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(adjustmentPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create auto-adjustment: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return {
      success: true,
      operationUuid: data.uuid,
      message: 'Auto-adjustment created successfully'
    };

  } catch (error) {
    console.error('Error creating auto-adjustment:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create auto-adjustment'
    };
  }
}

/**
 * Mark dispensing events as reconciled
 */
async function markDispensingEventsAsReconciled(
  events: DispensingEvent[],
  period: ReconciliationPeriod,
  headers: Record<string, string>
): Promise<void> {
  // This would update your dispensing records to mark them as reconciled
  // Implementation depends on your dispensing module structure
  
  // For FHIR MedicationDispense, you could add an extension or tag
  // Or maintain a separate reconciliation tracking table
  
  console.log(`Marking ${events.length} dispensing events as reconciled for period ${period.startDate} to ${period.endDate}`);
  
  // Placeholder implementation
  // In production, you would:
  // 1. Update each dispensing record with reconciliation metadata
  // 2. Or create reconciliation records linking to dispensing events
  // 3. Or update a custom table tracking reconciliation status
}

/**
 * Get stock consumption rate for an item
 */
export async function getStockConsumptionRate(
  stockItemUuid: string,
  locationUuid: string,
  days: number = 30
): Promise<{
  success: boolean;
  averageDailyConsumption?: number;
  daysOfStockRemaining?: number;
  consumptionTrend?: 'INCREASING' | 'DECREASING' | 'STABLE';
  message: string;
}> {
  try {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    // Get dispensing events for the period
    const events = await getDispensingEventsForPeriod(
      startDateStr,
      endDate,
      locationUuid,
      await getAuthHeaders()
    );

    const itemEvents = events.filter(event => event.medicationUuid === stockItemUuid);
    const totalConsumption = itemEvents.reduce((sum, event) => sum + event.quantity, 0);
    
    const averageDailyConsumption = days > 0 ? totalConsumption / days : 0;

    // Get current stock
    const stockLevelsResult = await fetch(
      `${process.env.OPENMRS_API_URL}/stockmanagement/stocklevel?` +
      `stockItemUuid=${stockItemUuid}&locationUuid=${locationUuid}`,
      { headers: await getAuthHeaders() }
    );

    let daysOfStockRemaining: number | undefined;
    if (stockLevelsResult.ok) {
      const stockData = await stockLevelsResult.json();
      const currentStock = stockData.results?.[0]?.quantity || 0;
      
      if (averageDailyConsumption > 0) {
        daysOfStockRemaining = Math.floor(currentStock / averageDailyConsumption);
      }
    }

    // Simple trend analysis (compare first half vs second half of period)
    const midDate = new Date(startDate.getTime() + (days * 24 * 60 * 60 * 1000) / 2);
    const midDateStr = midDate.toISOString().split('T')[0];
    
    const firstHalfEvents = itemEvents.filter(event => event.dispensingDate < midDateStr);
    const secondHalfEvents = itemEvents.filter(event => event.dispensingDate >= midDateStr);
    
    const firstHalfConsumption = firstHalfEvents.reduce((sum, event) => sum + event.quantity, 0);
    const secondHalfConsumption = secondHalfEvents.reduce((sum, event) => sum + event.quantity, 0);
    
    let consumptionTrend: 'INCREASING' | 'DECREASING' | 'STABLE' = 'STABLE';
    if (firstHalfConsumption > 0) {
      const change = ((secondHalfConsumption - firstHalfConsumption) / firstHalfConsumption) * 100;
      if (change > 10) consumptionTrend = 'INCREASING';
      else if (change < -10) consumptionTrend = 'DECREASING';
    }

    return {
      success: true,
      averageDailyConsumption: Math.round(averageDailyConsumption * 100) / 100,
      daysOfStockRemaining,
      consumptionTrend,
      message: `Consumption analysis completed`
    };

  } catch (error) {
    console.error('Error calculating consumption rate:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to calculate consumption rate'
    };
  }
}