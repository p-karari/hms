'use server';

import { db, withTransaction } from '@/lib/db/openmrsDb'; // Your DB connection
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';

// ==================== DATABASE HELPER FUNCTIONS ====================

/**
 * Get concept ID by UUID from the database
 */
async function getConceptIdByUuid(uuid: string): Promise<number | null> {
  const result = await db.execute(
    'SELECT concept_id FROM concept WHERE uuid = ?',
    [uuid]
  );
  
  if (result[0] && result[0].length > 0) {
    return result[0][0].concept_id;
  }
  return null;
}

/**
 * Get drug ID by UUID from the database
 */
async function getDrugIdByUuid(uuid: string): Promise<number | null> {
  const result = await db.execute(
    'SELECT drug_id FROM drug WHERE uuid = ?',
    [uuid]
  );
  
  if (result[0] && result[0].length > 0) {
    return result[0][0].drug_id;
  }
  return null;
}

/**
 * Get user ID by username (for creator/changed_by fields)
 */
async function getUserIdByUsername(username: string): Promise<number | null> {
  const result = await db.execute(
    'SELECT user_id FROM users WHERE username = ?',
    [username]
  );
  
  if (result[0] && result[0].length > 0) {
    return result[0][0].user_id;
  }
  return null;
}

/**
 * Get stock source ID by UUID (for preferred vendor)
 */
async function getStockSourceIdByUuid(uuid: string): Promise<number | null> {
  const result = await db.execute(
    'SELECT stock_source_id FROM stockmgmt_stock_source WHERE uuid = ?',
    [uuid]
  );
  
  if (result[0] && result[0].length > 0) {
    return result[0][0].stock_source_id;
  }
  return null;
}

/**
 * Get packaging UOM ID by UUID
 */
async function getPackagingUomIdByUuid(uuid: string): Promise<number | null> {
  const result = await db.execute(
    'SELECT stock_item_packaging_uom_id FROM stockmgmt_stock_item_packaging_uom WHERE uuid = ?',
    [uuid]
  );
  
  if (result[0] && result[0].length > 0) {
    return result[0][0].stock_item_packaging_uom_id;
  }
  return null;
}

// ==================== DATABASE-BASED STOCK ITEM CREATION ====================

/**
 * Create a new stock item directly in database
 */
export async function createStockItemDirect(
  params: CreateStockItemParams,
  creatorUsername: string = 'admin' // You'll need to get this from session
): Promise<{
  success: boolean;
  message: string;
  stockItemUuid?: string;
  stockItemId?: number;
}> {
  try {
    // Validate required fields
    if (!params.drug?.uuid && !params.concept?.uuid) {
      return { 
        success: false, 
        message: 'Either drug UUID or concept UUID is required' 
      };
    }

    // Start transaction for atomic operations
    const result = await withTransaction(async () => {
      // Get creator user ID
      const creatorId = await getUserIdByUsername(creatorUsername);
      if (!creatorId) {
        throw new Error(`Creator user '${creatorUsername}' not found`);
      }

      // Resolve foreign key IDs
      let drugId = null;
      let conceptId = null;
      let preferredVendorId = null;
      let purchasePriceUomId = null;
      let dispensingUnitId = null;
      let dispensingUnitPackagingUomId = null;
      let defaultStockOperationsUomId = null;
      let reorderLevelUomId = null;
      let categoryId = null;

      // Get drug ID if provided
      if (params.drug?.uuid) {
        drugId = await getDrugIdByUuid(params.drug.uuid);
        if (!drugId) {
          throw new Error(`Drug with UUID ${params.drug.uuid} not found`);
        }
      }

      // Get concept ID if provided
      if (params.concept?.uuid) {
        conceptId = await getConceptIdByUuid(params.concept.uuid);
        if (!conceptId) {
          throw new Error(`Concept with UUID ${params.concept.uuid} not found`);
        }
      }

      // Get preferred vendor ID if provided
      // Note: You need to pass this in params, it's not in your current interface
      if ((params as any).preferredVendor?.uuid) {
        preferredVendorId = await getStockSourceIdByUuid((params as any).preferredVendor.uuid);
      }

      // Get packaging UOM IDs
      if (params.purchasePriceUoM?.uuid) {
        purchasePriceUomId = await getPackagingUomIdByUuid(params.purchasePriceUoM.uuid);
      }

      if (params.dispensingUnit?.uuid) {
        dispensingUnitId = await getConceptIdByUuid(params.dispensingUnit.uuid);
      }

      if (params.dispensingUnitPackagingUoM?.uuid) {
        dispensingUnitPackagingUomId = await getPackagingUomIdByUuid(params.dispensingUnitPackagingUoM.uuid);
      }

      if (params.defaultStockOperationsUoM?.uuid) {
        defaultStockOperationsUomId = await getPackagingUomIdByUuid(params.defaultStockOperationsUoM.uuid);
      }

      if (params.reorderLevelUoM?.uuid) {
        reorderLevelUomId = await getPackagingUomIdByUuid(params.reorderLevelUoM.uuid);
      }

      if (params.category?.uuid) {
        categoryId = await getConceptIdByUuid(params.category.uuid);
      }

      // Generate UUID for the new stock item
      const stockItemUuid = uuidv4();
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      // Prepare SQL for stock item insertion
      const sql = `
        INSERT INTO stockmgmt_stock_item (
          drug_id, concept_id, has_expiration, preferred_vendor_id,
          purchase_price, purchase_price_uom_id, dispensing_unit_id,
          dispensing_unit_packaging_uom_id, default_stock_operations_uom_id,
          common_name, acronym, is_drug, reorder_level, reorder_level_uom_id,
          creator, date_created, voided, uuid, category_id, expiry_notice
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        drugId, conceptId, params.hasExpiration ? 1 : 0, preferredVendorId,
        params.purchasePrice || null, purchasePriceUomId, dispensingUnitId,
        dispensingUnitPackagingUomId, defaultStockOperationsUomId,
        params.commonName || null, params.acronym || null, params.isDrug ? 1 : 0,
        params.reorderLevel || null, reorderLevelUomId,
        creatorId, now, 0, stockItemUuid, categoryId, params.expiryNotice || null
      ];

      // Execute the insertion
      const [resultRows] = await db.execute(sql, values);
      
      if (!resultRows || !resultRows[0] || !resultRows[0].insertId) {
        throw new Error('Failed to insert stock item');
      }

      const stockItemId = resultRows[0].insertId;

      // If you need to create packaging UOM mappings, do it here
      // Example for purchase price UOM if it needs to be in stock_item_packaging_uom table:
      if (purchasePriceUomId) {
        const packagingUomUuid = uuidv4();
        const packagingUomSql = `
          INSERT INTO stockmgmt_stock_item_packaging_uom (
            stock_item_id, packaging_uom_id, factor, creator, date_created, voided, uuid
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        // Default factor of 1
        await db.execute(packagingUomSql, [
          stockItemId, purchasePriceUomId, 1.00, creatorId, now, 0, packagingUomUuid
        ]);
      }

      return {
        stockItemId,
        stockItemUuid
      };
    });

    revalidatePath('/pharmacy/stock/items');
    revalidatePath('/pharmacy/dashboard');

    return {
      success: true,
      message: 'Stock item created successfully in database',
      stockItemUuid: result.stockItemUuid,
      stockItemId: result.stockItemId
    };

  } catch (error) {
    console.error('Error creating stock item in database:', error);
    return {
      success: false,
      message: error instanceof Error
        ? error.message
        : 'Failed to create stock item in database'
    };
  }
}

/**
 * Get stock item directly from database
 */
export async function getStockItemDirect(
  uuid: string
): Promise<{
  success: boolean;
  data?: StockItem;
  message: string;
}> {
  try {
    if (!uuid || uuid.trim() === '') {
      return { success: false, message: 'Stock item UUID is required' };
    }

    const sql = `
      SELECT 
        si.*,
        d.uuid as drug_uuid,
        c.uuid as concept_uuid,
        cat.uuid as category_uuid,
        du.uuid as dispensing_unit_uuid,
        ss.uuid as preferred_vendor_uuid,
        pprice.uuid as purchase_price_uom_uuid,
        duom.uuid as dispensing_unit_packaging_uom_uuid,
        dsuom.uuid as default_stock_operations_uom_uuid,
        rluom.uuid as reorder_level_uom_uuid
      FROM stockmgmt_stock_item si
      LEFT JOIN drug d ON si.drug_id = d.drug_id
      LEFT JOIN concept c ON si.concept_id = c.concept_id
      LEFT JOIN concept cat ON si.category_id = cat.concept_id
      LEFT JOIN concept du ON si.dispensing_unit_id = du.concept_id
      LEFT JOIN stockmgmt_stock_source ss ON si.preferred_vendor_id = ss.stock_source_id
      LEFT JOIN stockmgmt_stock_item_packaging_uom pprice ON si.purchase_price_uom_id = pprice.stock_item_packaging_uom_id
      LEFT JOIN stockmgmt_stock_item_packaging_uom duom ON si.dispensing_unit_packaging_uom_id = duom.stock_item_packaging_uom_id
      LEFT JOIN stockmgmt_stock_item_packaging_uom dsuom ON si.default_stock_operations_uom_id = dsuom.stock_item_packaging_uom_id
      LEFT JOIN stockmgmt_stock_item_packaging_uom rluom ON si.reorder_level_uom_id = rluom.stock_item_packaging_uom_id
      WHERE si.uuid = ?
    `;

    const [rows] = await db.execute(sql, [uuid]);

    if (!rows || rows.length === 0) {
      return { success: false, message: 'Stock item not found' };
    }

    const item = rows[0];

    // Transform database row to your StockItem interface
    const stockItem: StockItem = {
      uuid: item.uuid,
      drug: item.drug_uuid ? { uuid: item.drug_uuid } : undefined,
      drugName: item.common_name || 'Unknown',
      concept: item.concept_uuid ? { uuid: item.concept_uuid } : undefined,
      commonName: item.common_name,
      acronym: item.acronym,
      hasExpiration: item.has_expiration === 1,
      expiryNotice: item.expiry_notice,
      purchasePrice: item.purchase_price,
      purchasePriceUoM: item.purchase_price_uom_uuid ? { uuid: item.purchase_price_uom_uuid } : undefined,
      defaultStockOperationsUoM: item.default_stock_operations_uom_uuid ? { uuid: item.default_stock_operations_uom_uuid } : undefined,
      dispensingUnit: item.dispensing_unit_uuid ? { uuid: item.dispensing_unit_uuid } : undefined,
      dispensingUnitPackagingUoM: item.dispensing_unit_packaging_uom_uuid ? { uuid: item.dispensing_unit_packaging_uom_uuid } : undefined,
      reorderLevel: item.reorder_level,
      reorderLevelUoM: item.reorder_level_uom_uuid ? { uuid: item.reorder_level_uom_uuid } : undefined,
      category: item.category_uuid ? { uuid: item.category_uuid } : undefined,
      isDrug: item.is_drug === 1,
      voided: item.voided === 1,
      dateCreated: item.date_created
    };

    return {
      success: true,
      data: stockItem,
      message: 'Stock item retrieved successfully from database'
    };

  } catch (error) {
    console.error('Error fetching stock item from database:', error);
    return {
      success: false,
      message: error instanceof Error
        ? error.message
        : 'Failed to fetch stock item from database'
    };
  }
}

// ==================== UPDATE YOUR INTERFACE ====================

export interface StockItem {
  // Database fields
  stock_item_id?: number;
  uuid?: string;
  
  // Drug/Concept references
  drug_id?: number;
  drug?: { uuid: string };
  drugName: string;
  concept_id?: number;
  concept?: { uuid: string };
  
  // Basic information
  commonName?: string;
  acronym?: string;
  hasExpiration: boolean;
  expiryNotice?: number;
  // These fields don't exist:
  // defaultBatchNo?: string;
  // defaultExpiryMonths?: number;
  // manufacturerCode?: string;
  
  // Pricing
  purchasePrice?: number;
  purchasePriceUoM?: { uuid: string };
  purchase_price_uom_id?: number;
  
  // Unit of measure
  defaultStockOperationsUoM?: { uuid: string };
  default_stock_operations_uom_id?: number;
  dispensingUnit?: { uuid: string };
  dispensing_unit_id?: number;
  dispensingUnitPackagingUoM?: { uuid: string };
  dispensing_unit_packaging_uom_id?: number;
  reorderLevel?: number;
  reorderLevelUoM?: { uuid: string };
  reorder_level_uom_id?: number;
  
  // Category
  category?: { uuid: string };
  category_id?: number;
  
  // Vendor
  preferred_vendor_id?: number;
  preferredVendor?: { uuid: string };
  
  // Status
  isDrug: boolean;
  voided?: boolean;
  dateCreated?: string;
  
  // Audit fields
  creator?: number;
  changed_by?: number;
  date_changed?: string;
  voided_by?: number;
  date_voided?: string;
  void_reason?: string;
}

export interface CreateStockItemParams extends Omit<StockItem, 'uuid' | 'dateCreated'> {
  locationUuid?: string;
  // Add database-specific fields
  preferredVendor?: { uuid: string }; // Add this to your interface
}