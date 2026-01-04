'use server';

import { db, withTransaction } from '@/lib/db/openmrsDb';
import { v4 as uuidv4 } from 'uuid';

// ==================== TYPES & INTERFACES ====================

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
  defaultBatchNo?: string;
  defaultExpiryMonths?: number;
  manufacturerCode?: string;
  
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
  maximumStock?: number;
  maximumStockUoM?: { uuid: string };
  maximum_stock_uom_id?: number;
  
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
  
  // Audit fields (from database)
  creator?: number;
  changed_by?: number;
  date_changed?: string;
  voided_by?: number;
  date_voided?: string;
  void_reason?: string;
}

export interface CreateStockItemParams extends Omit<StockItem, 
  'stock_item_id' | 'uuid' | 'dateCreated' | 'creator' | 'date_changed' | 'voided_by' | 'date_voided' | 'void_reason'
> {
  locationUuid?: string;
  preferredVendor?: { uuid: string };
}

export interface UpdateStockItemParams extends Partial<StockItem> {
  uuid: string;
  changed_by?: number;
}

export interface SearchStockItemsParams {
  name?: string;
  drugUuid?: string;
  conceptUuid?: string;
  categoryUuid?: string;
  hasExpiration?: boolean;
  voided?: boolean;
  startIndex?: number;
  limit?: number;
  sortBy?: 'name' | 'date' | 'price';
  sortOrder?: 'asc' | 'desc';
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Get concept ID by UUID
 */
async function getConceptIdByUuid(uuid: string): Promise<number | null> {
  const [result] = await db.execute(
    'SELECT concept_id FROM concept WHERE uuid = ?',
    [uuid]
  );
  
  if (result && result.length > 0) {
    return result[0].concept_id;
  }
  return null;
}

/**
 * Get drug ID by UUID
 */
async function getDrugIdByUuid(uuid: string): Promise<number | null> {
  const [result] = await db.execute(
    'SELECT drug_id FROM drug WHERE uuid = ?',
    [uuid]
  );
  
  if (result && result.length > 0) {
    return result[0].drug_id;
  }
  return null;
}

/**
 * Get user ID by username
 */
async function getUserIdByUsername(username: string): Promise<number | null> {
  const [result] = await db.execute(
    'SELECT user_id FROM users WHERE username = ? AND voided = 0',
    [username]
  );
  
  if (result && result.length > 0) {
    return result[0].user_id;
  }
  return null;
}

/**
 * Get stock source ID by UUID
 */
async function getStockSourceIdByUuid(uuid: string): Promise<number | null> {
  const [result] = await db.execute(
    'SELECT stock_source_id FROM stockmgmt_stock_source WHERE uuid = ? AND voided = 0',
    [uuid]
  );
  
  if (result && result.length > 0) {
    return result[0].stock_source_id;
  }
  return null;
}

/**
 * Get packaging UOM ID by UUID
 */
async function getPackagingUomIdByUuid(uuid: string): Promise<number | null> {
  const [result] = await db.execute(
    'SELECT stock_item_packaging_uom_id FROM stockmgmt_stock_item_packaging_uom WHERE uuid = ?',
    [uuid]
  );
  
  if (result && result.length > 0) {
    return result[0].stock_item_packaging_uom_id;
  }
  return null;
}

/**
 * Get concept name by ID
 */
async function getConceptNameById(conceptId: number): Promise<string> {
  const [result] = await db.execute(
    `SELECT name FROM concept_name 
     WHERE concept_id = ? AND concept_name_type = 'FULLY_SPECIFIED' AND voided = 0 
     LIMIT 1`,
    [conceptId]
  );
  
  if (result && result.length > 0) {
    return result[0].name;
  }
  return '';
}

/**
 * Get drug name by ID
 */
async function getDrugNameById(drugId: number): Promise<string> {
  const [result] = await db.execute(
    `SELECT d.name, cn.name as concept_name 
     FROM drug d
     LEFT JOIN concept_name cn ON d.concept_id = cn.concept_id 
       AND cn.concept_name_type = 'FULLY_SPECIFIED' 
       AND cn.voided = 0
     WHERE d.drug_id = ? AND d.voided = 0`,
    [drugId]
  );
  
  if (result && result.length > 0) {
    return result[0].name || result[0].concept_name || 'Unknown Drug';
  }
  return 'Unknown Drug';
}

// ==================== STOCK ITEM DATABASE ACTIONS ====================

/**
 * Create a new stock item directly in database
 */
export async function createStockItemDirect(
  params: CreateStockItemParams,
  creatorUsername: string = 'admin'
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
      let maximumStockUomId = null;
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
      if (params.preferredVendor?.uuid) {
        preferredVendorId = await getStockSourceIdByUuid(params.preferredVendor.uuid);
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

      if (params.maximumStockUoM?.uuid) {
        maximumStockUomId = await getPackagingUomIdByUuid(params.maximumStockUoM.uuid);
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
          creator, date_created, voided, uuid, category_id, expiry_notice,
          dispensing_unit_packaging_uom_id, maximum_stock, maximum_stock_uom_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        drugId, conceptId, params.hasExpiration ? 1 : 0, preferredVendorId,
        params.purchasePrice || null, purchasePriceUomId, dispensingUnitId,
        dispensingUnitPackagingUomId, defaultStockOperationsUomId,
        params.commonName || null, params.acronym || null, params.isDrug ? 1 : 0,
        params.reorderLevel || null, reorderLevelUomId,
        creatorId, now, 0, stockItemUuid, categoryId, params.expiryNotice || null,
        dispensingUnitPackagingUomId, params.maximumStock || null, maximumStockUomId
      ];

      // Execute the insertion
      const [resultRows] = await db.execute(sql, values);
      
      if (!resultRows || !resultRows[0] || !resultRows[0].insertId) {
        throw new Error('Failed to insert stock item');
      }

      const stockItemId = resultRows[0].insertId;

      return {
        stockItemId,
        stockItemUuid
      };
    });

    return {
      success: true,
      message: 'Stock item created successfully',
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
        d.name as drug_name,
        c.uuid as concept_uuid,
        cat.uuid as category_uuid,
        du.uuid as dispensing_unit_uuid,
        ss.uuid as preferred_vendor_uuid,
        pprice.uuid as purchase_price_uom_uuid,
        duom.uuid as dispensing_unit_packaging_uom_uuid,
        dsuom.uuid as default_stock_operations_uom_uuid,
        rluom.uuid as reorder_level_uom_uuid,
        msuom.uuid as maximum_stock_uom_uuid,
        u.username as creator_username,
        cb.username as changed_by_username
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
      LEFT JOIN stockmgmt_stock_item_packaging_uom msuom ON si.maximum_stock_uom_id = msuom.stock_item_packaging_uom_id
      LEFT JOIN users u ON si.creator = u.user_id
      LEFT JOIN users cb ON si.changed_by = cb.user_id
      WHERE si.uuid = ? AND si.voided = 0
    `;

    const [rows] = await db.execute(sql, [uuid]);

    if (!rows || rows.length === 0) {
      return { success: false, message: 'Stock item not found' };
    }

    const item = rows[0];

    // Get drug name
    let drugName = item.drug_name;
    if (!drugName && item.drug_id) {
      drugName = await getDrugNameById(item.drug_id);
    } else if (!drugName && item.common_name) {
      drugName = item.common_name;
    } else if (!drugName) {
      drugName = 'Unknown Item';
    }

    // Transform database row to StockItem interface
    const stockItem: StockItem = {
      stock_item_id: item.stock_item_id,
      uuid: item.uuid,
      drug: item.drug_uuid ? { uuid: item.drug_uuid } : undefined,
      drug_id: item.drug_id,
      drugName,
      concept: item.concept_uuid ? { uuid: item.concept_uuid } : undefined,
      concept_id: item.concept_id,
      commonName: item.common_name,
      acronym: item.acronym,
      hasExpiration: item.has_expiration === 1,
      expiryNotice: item.expiry_notice,
      defaultBatchNo: item.default_batch_no,
      defaultExpiryMonths: item.default_expiry_months,
      manufacturerCode: item.manufacturer_code,
      purchasePrice: item.purchase_price,
      purchasePriceUoM: item.purchase_price_uom_uuid ? { uuid: item.purchase_price_uom_uuid } : undefined,
      purchase_price_uom_id: item.purchase_price_uom_id,
      defaultStockOperationsUoM: item.default_stock_operations_uom_uuid ? { uuid: item.default_stock_operations_uom_uuid } : undefined,
      default_stock_operations_uom_id: item.default_stock_operations_uom_id,
      dispensingUnit: item.dispensing_unit_uuid ? { uuid: item.dispensing_unit_uuid } : undefined,
      dispensing_unit_id: item.dispensing_unit_id,
      dispensingUnitPackagingUoM: item.dispensing_unit_packaging_uom_uuid ? { uuid: item.dispensing_unit_packaging_uom_uuid } : undefined,
      dispensing_unit_packaging_uom_id: item.dispensing_unit_packaging_uom_id,
      reorderLevel: item.reorder_level,
      reorderLevelUoM: item.reorder_level_uom_uuid ? { uuid: item.reorder_level_uom_uuid } : undefined,
      reorder_level_uom_id: item.reorder_level_uom_id,
      maximumStock: item.maximum_stock,
      maximumStockUoM: item.maximum_stock_uom_uuid ? { uuid: item.maximum_stock_uom_uuid } : undefined,
      maximum_stock_uom_id: item.maximum_stock_uom_id,
      category: item.category_uuid ? { uuid: item.category_uuid } : undefined,
      category_id: item.category_id,
      preferred_vendor_id: item.preferred_vendor_id,
      preferredVendor: item.preferred_vendor_uuid ? { uuid: item.preferred_vendor_uuid } : undefined,
      isDrug: item.is_drug === 1,
      voided: item.voided === 1,
      dateCreated: item.date_created,
      creator: item.creator,
      changed_by: item.changed_by,
      date_changed: item.date_changed,
      voided_by: item.voided_by,
      date_voided: item.date_voided,
      void_reason: item.void_reason
    };

    return {
      success: true,
      data: stockItem,
      message: 'Stock item retrieved successfully'
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

/**
 * Search stock items with filters
 */

export async function searchStockItemsDirect(
  params: SearchStockItemsParams = {}
): Promise<{
  success: boolean;
  data?: StockItem[];
  totalCount?: number;
  message: string;
}> {
  try {
    const whereClauses: string[] = ['si.voided = 0'];
    const whereParams: any[] = [];

    // ---------------- Filters ----------------
    if (params.name) {
      whereClauses.push('(si.common_name LIKE ? OR d.name LIKE ? OR si.acronym LIKE ?)');
      const term = `%${params.name}%`;
      whereParams.push(term, term, term);
    }

    if (params.drugUuid) {
      const drugId = await getDrugIdByUuid(params.drugUuid);
      if (Number.isInteger(drugId)) {
        whereClauses.push('si.drug_id = ?');
        whereParams.push(drugId);
      }
    }

    if (params.conceptUuid) {
      const conceptId = await getConceptIdByUuid(params.conceptUuid);
      if (Number.isInteger(conceptId)) {
        whereClauses.push('si.concept_id = ?');
        whereParams.push(conceptId);
      }
    }

    if (params.categoryUuid) {
      const categoryId = await getConceptIdByUuid(params.categoryUuid);
      if (Number.isInteger(categoryId)) {
        whereClauses.push('si.category_id = ?');
        whereParams.push(categoryId);
      }
    }

    if (typeof params.hasExpiration === 'boolean') {
      whereClauses.push('si.has_expiration = ?');
      whereParams.push(params.hasExpiration ? 1 : 0);
    }

    if (typeof params.voided === 'boolean') {
      whereClauses.push('si.voided = ?');
      whereParams.push(params.voided ? 1 : 0);
    }

    const whereClause = `WHERE ${whereClauses.join(' AND ')}`;

    // ---------------- ORDER BY (strict whitelist) ----------------
    let orderBy = 'COALESCE(si.common_name, d.name) ASC';
    if (params.sortBy) {
      switch (params.sortBy) {
        case 'name':
          orderBy = `COALESCE(si.common_name, d.name) ${params.sortOrder === 'desc' ? 'DESC' : 'ASC'}`;
          break;
        case 'date':
          orderBy = `si.date_created ${params.sortOrder === 'desc' ? 'DESC' : 'ASC'}`;
          break;
        case 'price':
          orderBy = `si.purchase_price ${params.sortOrder === 'desc' ? 'DESC' : 'ASC'}`;
          break;
      }
    }

    // ---------------- COUNT ----------------
    const countSql = `
      SELECT COUNT(*) AS total
      FROM stockmgmt_stock_item si
      LEFT JOIN drug d ON si.drug_id = d.drug_id
      ${whereClause}
    `;

    const [countRows]: any = await db.execute(countSql, [...whereParams]);
    const totalCount = Number(countRows?.[0]?.total ?? 0);

    // ---------------- Pagination (INLINE, NOT BOUND) ----------------
    const limit =
      Number.isInteger(Number(params.limit)) && Number(params.limit) > 0
        ? Number(params.limit)
        : 15;

    const offset =
      Number.isInteger(Number(params.startIndex)) && Number(params.startIndex) >= 0
        ? Number(params.startIndex)
        : 0;

    // ---------------- Main Query ----------------
    const sql = `
      SELECT 
        si.*,
        d.uuid AS drug_uuid,
        d.name AS drug_name,
        c.uuid AS concept_uuid,
        cat.uuid AS category_uuid,
        du.uuid AS dispensing_unit_uuid,
        ss.uuid AS preferred_vendor_uuid,
        pprice.uuid AS purchase_price_uom_uuid,
        duom.uuid AS dispensing_unit_packaging_uom_uuid,
        dsuom.uuid AS default_stock_operations_uom_uuid,
        rluom.uuid AS reorder_level_uom_uuid
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
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [rows]: any[] = await db.execute(sql, [...whereParams]);

    return {
      success: true,
      data: rows,
      totalCount,
      message: `Found ${rows.length} stock item(s)`
    };
  } catch (error) {
    console.error('Error searching stock items:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to search stock items'
    };
  }
}



/**
 * Update stock item in database
 */
export async function updateStockItemDirect(
  params: UpdateStockItemParams,
  updaterUsername: string = 'admin'
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    if (!params.uuid || params.uuid.trim() === '') {
      return { success: false, message: 'Stock item UUID is required' };
    }

    const result = await withTransaction(async () => {
      // Get updater user ID
      const updaterId = await getUserIdByUsername(updaterUsername);
      if (!updaterId) {
        throw new Error(`Updater user '${updaterUsername}' not found`);
      }

      // Check if stock item exists
      const existingResult = await db.execute(
        'SELECT stock_item_id FROM stockmgmt_stock_item WHERE uuid = ? AND voided = 0',
        [params.uuid]
      );

      if (!existingResult[0] || existingResult[0].length === 0) {
        throw new Error('Stock item not found');
      }

      const stockItemId = existingResult[0][0].stock_item_id;

      // Build update fields
      const updateFields: string[] = ['changed_by = ?', 'date_changed = ?'];
      const updateValues: any[] = [updaterId, new Date().toISOString().slice(0, 19).replace('T', ' ')];

      // Update fields from params
      if (params.drug?.uuid !== undefined) {
        const drugId = params.drug.uuid ? await getDrugIdByUuid(params.drug.uuid) : null;
        updateFields.push('drug_id = ?');
        updateValues.push(drugId);
      }

      if (params.concept?.uuid !== undefined) {
        const conceptId = params.concept.uuid ? await getConceptIdByUuid(params.concept.uuid) : null;
        updateFields.push('concept_id = ?');
        updateValues.push(conceptId);
      }

      if (params.commonName !== undefined) {
        updateFields.push('common_name = ?');
        updateValues.push(params.commonName || null);
      }

      if (params.acronym !== undefined) {
        updateFields.push('acronym = ?');
        updateValues.push(params.acronym || null);
      }

      if (params.hasExpiration !== undefined) {
        updateFields.push('has_expiration = ?');
        updateValues.push(params.hasExpiration ? 1 : 0);
      }

      if (params.expiryNotice !== undefined) {
        updateFields.push('expiry_notice = ?');
        updateValues.push(params.expiryNotice || null);
      }

      if (params.purchasePrice !== undefined) {
        updateFields.push('purchase_price = ?');
        updateValues.push(params.purchasePrice || null);
      }

      if (params.purchasePriceUoM?.uuid !== undefined) {
        const uomId = params.purchasePriceUoM.uuid ? await getPackagingUomIdByUuid(params.purchasePriceUoM.uuid) : null;
        updateFields.push('purchase_price_uom_id = ?');
        updateValues.push(uomId);
      }

      if (params.defaultStockOperationsUoM?.uuid !== undefined) {
        const uomId = params.defaultStockOperationsUoM.uuid ? await getPackagingUomIdByUuid(params.defaultStockOperationsUoM.uuid) : null;
        updateFields.push('default_stock_operations_uom_id = ?');
        updateValues.push(uomId);
      }

      if (params.dispensingUnit?.uuid !== undefined) {
        const unitId = params.dispensingUnit.uuid ? await getConceptIdByUuid(params.dispensingUnit.uuid) : null;
        updateFields.push('dispensing_unit_id = ?');
        updateValues.push(unitId);
      }

      if (params.reorderLevel !== undefined) {
        updateFields.push('reorder_level = ?');
        updateValues.push(params.reorderLevel || null);
      }

      if (params.maximumStock !== undefined) {
        updateFields.push('maximum_stock = ?');
        updateValues.push(params.maximumStock || null);
      }

      if (params.category?.uuid !== undefined) {
        const categoryId = params.category.uuid ? await getConceptIdByUuid(params.category.uuid) : null;
        updateFields.push('category_id = ?');
        updateValues.push(categoryId);
      }

      if (params.voided !== undefined) {
        updateFields.push('voided = ?');
        updateValues.push(params.voided ? 1 : 0);
      }

      // Execute update
      const sql = `
        UPDATE stockmgmt_stock_item
        SET ${updateFields.join(', ')}
        WHERE uuid = ? AND voided = 0
      `;

      updateValues.push(params.uuid);

      const [result] = await db.execute(sql, updateValues);

      if (!result || !result[0] || result[0].affectedRows === 0) {
        throw new Error('Failed to update stock item');
      }

      return { success: true };
    });

    return {
      success: true,
      message: 'Stock item updated successfully'
    };

  } catch (error) {
    console.error('Error updating stock item:', error);
    return {
      success: false,
      message: error instanceof Error
        ? error.message
        : 'Failed to update stock item'
    };
  }
}

/**
 * Delete/Void a stock item
 */
export async function deleteStockItemDirect(
  uuid: string,
  reason: string = 'Deleted via pharmacy system',
  deletedByUsername: string = 'admin'
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    if (!uuid || uuid.trim() === '') {
      return { success: false, message: 'Stock item UUID is required' };
    }

    if (!reason || reason.trim() === '') {
      return { success: false, message: 'Deletion reason is required' };
    }

    const result = await withTransaction(async () => {
      // Get deleter user ID
      const deletedById = await getUserIdByUsername(deletedByUsername);
      if (!deletedById) {
        throw new Error(`User '${deletedByUsername}' not found`);
      }

      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      const sql = `
        UPDATE stockmgmt_stock_item
        SET voided = 1,
            voided_by = ?,
            date_voided = ?,
            void_reason = ?
        WHERE uuid = ? AND voided = 0
      `;

      const [result] = await db.execute(sql, [deletedById, now, reason, uuid]);

      if (!result || !result[0] || result[0].affectedRows === 0) {
        throw new Error('Stock item not found or already deleted');
      }

      return { success: true };
    });

    return {
      success: true,
      message: 'Stock item deleted successfully'
    };

  } catch (error) {
    console.error('Error deleting stock item:', error);
    return {
      success: false,
      message: error instanceof Error
        ? error.message
        : 'Failed to delete stock item'
    };
  }
}