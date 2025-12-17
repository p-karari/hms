// lib/billing/manageBillableItems.ts
'use server';
import { runSql, runSqlFlat } from '../db/openmrsDb';
import { v4 as uuidv4 } from 'uuid';
import { CashierItem } from './services/billingServices';


// GET - Get a single billable item by ID
export async function getBillableItem(itemId: number): Promise<CashierItem & { price: number; department_name: string } | null> {
  const sql = `
    SELECT
        ci.item_id, ci.name, ci.description, ci.department_id, ci.uuid,
        ci.default_price_id,
        cd.name AS department_name,
        cip.price
    FROM cashier_item ci
    JOIN cashier_department cd ON ci.department_id = cd.department_id
    LEFT JOIN cashier_item_price cip ON ci.default_price_id = cip.item_price_id
    WHERE ci.item_id = ? AND ci.retired = 0;
  `;
  
  const rows = await runSqlFlat<CashierItem & { price: number; department_name: string }>(sql, [itemId]);
  return rows[0] || null;
}

// GET - Get all billable items
export async function getAllBillableItems(): Promise<Array<CashierItem & { price: number; department_name: string }>> {
  const sql = `
    SELECT
        ci.item_id, ci.name, ci.description, ci.department_id, ci.uuid,
        ci.default_price_id,
        cd.name AS department_name,
        cip.price
    FROM cashier_item ci
    JOIN cashier_department cd ON ci.department_id = cd.department_id
    LEFT JOIN cashier_item_price cip ON ci.default_price_id = cip.item_price_id
    WHERE ci.retired = 0
    ORDER BY ci.name;
  `;
  
  const rows = await runSqlFlat<CashierItem & { price: number; department_name: string }>(sql);
  return rows;
}

// GET - Get item prices (including those with NULL item_id)
export async function getItemPrices(itemId: number): Promise<Array<{
  item_price_id: number;
  price: number;
  name: string;
  payment_mode: number | null;
}>> {
  const sql = `
    SELECT 
        item_price_id,
        price,
        name,
        payment_mode
    FROM cashier_item_price
    WHERE (item_id = ? OR item_id IS NULL) AND voided = 0
    ORDER BY item_price_id;
  `;
  
  const rows = await runSqlFlat(sql, [itemId]);
  return rows;
}

// EDIT - Update an existing billable item
export interface EditBillableItemData {
  item_id: number;
  name?: string;
  description?: string | null;
  department_id?: number;
  changed_by: number;
  prices?: Array<{
    price: number;
    payment_mode?: number | null;
    price_name?: string;
  }>;
}

export async function editBillableItem(data: EditBillableItemData): Promise<boolean> {
  const dateChanged = new Date();
  
  try {
    // Build dynamic update query for item details
    const updates: string[] = [];
    const params: any[] = [];
    
    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }
    
    if (data.description !== undefined) {
      updates.push('description = ?');
      params.push(data.description);
    }
    
    if (data.department_id !== undefined) {
      updates.push('department_id = ?');
      params.push(data.department_id);
    }
    
    // Always update changed_by and date_changed
    updates.push('changed_by = ?', 'date_changed = ?');
    params.push(data.changed_by, dateChanged);
    
    if (updates.length > 2) { // More than just changed_by and date_changed
      const sql = `
        UPDATE cashier_item
        SET ${updates.join(', ')}
        WHERE item_id = ? AND retired = 0;
      `;
      
      params.push(data.item_id);
      await runSql(sql, params);
    }
    
    // Update prices if provided
    if (data.prices && data.prices.length > 0) {
      await updateItemPrices(data.item_id, data.prices, data.changed_by);
    }
    
    return true;
  } catch (error) {
    console.error('Error editing billable item:', error);
    throw error;
  }
}

// Helper function to update item prices
async function updateItemPrices(
  itemId: number,
  prices: Array<{
    price: number;
    payment_mode?: number | null;
    price_name?: string;
  }>,
  creatorId: number
): Promise<void> {
  const dateCreated = new Date();
  
  // Void existing prices for this item first (soft delete)
  const voidSql = `
    UPDATE cashier_item_price
    SET voided = 1, voided_by = ?, date_voided = ?, void_reason = 'Updated via edit'
    WHERE item_id = ? AND voided = 0;
  `;
  
  await runSql(voidSql, [creatorId, dateCreated, itemId]);
  
  // Insert new prices with NULL item_id
  for (const price of prices) {
    const priceUuid = uuidv4();
    const insertSql = `
      INSERT INTO cashier_item_price
      (item_id, price, payment_mode, name, creator, date_created, voided, uuid)
      VALUES (NULL, ?, ?, ?, ?, ?, 0, ?);
    `;
    
    await runSql(insertSql, [
      price.price,
      price.payment_mode || null,
      price.price_name || 'Default Price',
      creatorId,
      dateCreated,
      priceUuid,
    ]);
    
    // If this is the first price, update item's default_price_id
    if (price === prices[0]) {
      // Get the newly inserted price ID
      const getPriceIdSql = `
        SELECT item_price_id 
        FROM cashier_item_price 
        WHERE uuid = ?;
      `;
      
      const priceRows = await runSqlFlat<{ item_price_id: number }>(getPriceIdSql, [priceUuid]);
      if (priceRows[0]) {
        const updateDefaultSql = `
          UPDATE cashier_item
          SET default_price_id = ?
          WHERE item_id = ?;
        `;
        await runSql(updateDefaultSql, [priceRows[0].item_price_id, itemId]);
      }
    }
  }
}

// DELETE - Soft delete (retire) a billable item
export interface DeleteBillableItemData {
  item_id: number;
  retired_by: number;
  retire_reason?: string;
}

export async function deleteBillableItem(data: DeleteBillableItemData): Promise<boolean> {
  const dateRetired = new Date();
  
  try {
    // Soft delete the item
    const itemSql = `
      UPDATE cashier_item
      SET retired = 1, 
          retired_by = ?, 
          date_retired = ?, 
          retire_reason = ?
      WHERE item_id = ? AND retired = 0;
    `;
    
    await runSql(itemSql, [
      data.retired_by,
      dateRetired,
      data.retire_reason || '',
      data.item_id
    ]);
    
    // Also void any associated prices (including those with NULL item_id)
    const priceSql = `
      UPDATE cashier_item_price
      SET voided = 1, 
          voided_by = ?, 
          date_voided = ?, 
          void_reason = ?
      WHERE (item_id = ? OR item_id IS NULL) AND voided = 0;
    `;
    
    await runSql(priceSql, [
      data.retired_by,
      dateRetired,
      `Item retired: ${data.retire_reason || 'No reason provided'}`,
      data.item_id
    ]);
    
    return true;
  } catch (error) {
    console.error('Error deleting billable item:', error);
    throw error;
  }
}

// BULK DELETE - Delete multiple items at once
export async function bulkDeleteBillableItems(
  itemIds: number[],
  retiredBy: number,
  retireReason?: string
): Promise<boolean> {
  if (itemIds.length === 0) return true;
  
  const dateRetired = new Date();
  const placeholders = itemIds.map(() => '?').join(',');
  
  try {
    // Soft delete items
    const itemSql = `
      UPDATE cashier_item
      SET retired = 1, 
          retired_by = ?, 
          date_retired = ?, 
          retire_reason = ?
      WHERE item_id IN (${placeholders}) AND retired = 0;
    `;
    
    await runSql(itemSql, [retiredBy, dateRetired, retireReason || '', ...itemIds]);
    
    // Void associated prices (including those with NULL item_id)
    // We need to handle this differently for NULL item_id
    const priceSql = `
      UPDATE cashier_item_price
      SET voided = 1, 
          voided_by = ?, 
          date_voided = ?, 
          void_reason = ?
      WHERE item_id IN (${placeholders}) AND voided = 0;
    `;
    
    await runSql(priceSql, [
      retiredBy, 
      dateRetired, 
      `Bulk item retirement: ${retireReason || 'No reason provided'}`,
      ...itemIds
    ]);
    
    return true;
  } catch (error) {
    console.error('Error in bulk delete billable items:', error);
    throw error;
  }
}

// VALIDATION - Check if item exists and is not retired
export async function validateBillableItem(itemId: number): Promise<boolean> {
  const sql = `
    SELECT COUNT(*) as count
    FROM cashier_item
    WHERE item_id = ? AND retired = 0;
  `;
  
  const rows = await runSqlFlat<{ count: number }>(sql, [itemId]);
  return rows[0]?.count > 0;
}

// SEARCH - Search billable items by name
export async function searchBillableItems(searchTerm: string): Promise<Array<{
  id: number;
  name: string;
  description: string;
  price: number;
  type: 'ITEM' | 'SERVICE';
  uuid: string;
  department_name?: string;
  service_id?: number;
  item_id?: number;
}>> {
  const searchPattern = `%${searchTerm}%`;
  
  const sql = `
    -- Items query
    SELECT
        ci.item_id as id,
        ci.name,
        ci.description,
        ci.uuid,
        cip.price,
        cd.name AS department_name,
        'ITEM' as type,
        ci.item_id,
        NULL as service_id
    FROM cashier_item ci
    JOIN cashier_department cd ON ci.department_id = cd.department_id
    LEFT JOIN cashier_item_price cip ON ci.default_price_id = cip.item_price_id
    WHERE ci.retired = 0 
    AND (ci.name LIKE ? OR ci.description LIKE ?)
    
    UNION ALL
    
    -- Services query (without description if column doesn't exist)
    SELECT
        cbs.service_id as id,
        cbs.name,
        '' as description,  -- Empty string instead of cbs.description
        cbs.uuid,
        cip.price,
        NULL as department_name,
        'SERVICE' as type,
        NULL as item_id,
        cbs.service_id
    FROM cashier_billable_service cbs
    LEFT JOIN cashier_item_price cip ON cbs.service_id = cip.service_id
    WHERE cbs.name LIKE ?
    AND cip.item_price_id IS NOT NULL
    
    ORDER BY name
    LIMIT 50;
  `;
  
  try {
    const rows = await runSqlFlat<any>(sql, [
      searchPattern, searchPattern, // For items query
      searchPattern  // For services query (only name search)
    ]);
    
    return rows;
  } catch (error) {
    console.error('Error searching billable items and services:', error);
    return [];
  }
}