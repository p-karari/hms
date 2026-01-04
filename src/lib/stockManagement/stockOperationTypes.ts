// src/lib/stockManagement/stockOperationTypes.ts

// ==================== ENUMS ====================

export enum StockOperationType {
  ADJUSTMENT = '11111111-1111-1111-1111-111111111111',
  DISPOSAL = '22222222-2222-2222-2222-222222222222',
  TRANSFER_OUT = '33333333-3333-3333-3333-333333333333',
  RECEIPT = '44444444-4444-4444-4444-444444444444',
  RETURN = '55555555-5555-5555-5555-555555555555',
  STOCK_ISSUE = '66666666-6666-6666-6666-666666666666',
  REQUISITION = '77777777-7777-7777-7777-777777777777',
  STOCK_TAKE = '88888888-8888-8888-8888-888888888888',
  OPENING_STOCK = '99999999-9999-9999-9999-999999999999'
}

export const StockOperationTypeLabels: Record<StockOperationType, string> = {
  [StockOperationType.ADJUSTMENT]: 'Adjustment',
  [StockOperationType.DISPOSAL]: 'Disposal',
  [StockOperationType.TRANSFER_OUT]: 'Transfer Out',
  [StockOperationType.RECEIPT]: 'Receipt',
  [StockOperationType.RETURN]: 'Return',
  [StockOperationType.STOCK_ISSUE]: 'Stock Issue',
  [StockOperationType.REQUISITION]: 'Requisition',
  [StockOperationType.STOCK_TAKE]: 'Stock Take',
  [StockOperationType.OPENING_STOCK]: 'Opening Stock'
};

// ==================== INTERFACES ====================

export interface StockOperationItem {
  stockItemUuid: string;
  stockItemName: string;
  quantity: number;
  batchNumber?: string;
  expirationDate?: string; // ISO date string
  purchasePrice?: number;
  sellingPrice?: number;
  calculatedExpiration?: boolean;
  stockItemPackagingUOMUuid?: string;
  packagingUomName?: string;
  stockBatchUuid?: string;
}

export interface StockOperationBase {
  operationType: StockOperationType;
  operationNumber?: string;
  operationDate: string; // ISO date string
  locationUuid: string;
  locationName?: string;
  sourceLocationUuid?: string;
  sourceLocationName?: string;
  destinationLocationUuid?: string;
  destinationLocationName?: string;
  responsiblePersonUuid?: string;
  responsiblePersonName?: string;
  responsiblePersonOther?: string;
  approvalRequired?: boolean;
  approvedByUuid?: string;
  approvedByName?: string;
  approvalDate?: string;
  status?: 'NEW' | 'SUBMITTED' | 'APPROVED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
  reasonUuid?: string;
  reasonName?: string;
  reasonOther?: string;
  remarks?: string;
  cancellationReason?: string;
  locked?: boolean;
  operationOrder?: number;
}

export interface StockOperationCreateParams extends StockOperationBase {
  items: StockOperationItem[];
}

export interface StockOperationUpdateParams extends Partial<StockOperationBase> {
  uuid: string;
  items?: StockOperationItem[];
}

export interface StockOperationSearchParams {
  operationType?: StockOperationType | StockOperationType[];
  locationUuid?: string;
  sourceLocationUuid?: string;
  destinationLocationUuid?: string;
  status?: string | string[];
  operationDateFrom?: string;
  operationDateTo?: string;
  stockItemUuid?: string;
  batchNumber?: string;
  searchQuery?: string;
  startIndex?: number;
  limit?: number;
  includeVoided?: boolean;
}

export interface StockOperation extends StockOperationBase {
  uuid?: string;
  items: StockOperationItem[];
  dateCreated?: string;
  creatorUuid?: string;
  creatorName?: string;
  dateChanged?: string;
  changedByUuid?: string;
  changedByName?: string;
  voided?: boolean;
  voidReason?: string;
  dateVoided?: string;
  voidedByUuid?: string;
  voidedByName?: string;
}

export interface StockOperationSummary {
  uuid: string;
  operationNumber: string;
  operationType: StockOperationType;
  operationDate: string;
  status: string;
  locationName: string;
  sourceLocationName?: string;
  destinationLocationName?: string;
  totalItems: number;
  totalQuantity: number;
  creatorName: string;
  dateCreated: string;
}