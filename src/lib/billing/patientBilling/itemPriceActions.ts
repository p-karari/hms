//Billable items and prices lookup and management actions

'use server';

import { db } from '@/lib/db/openmrsDb';

/**
 * Search for billable items by name or description
 */
export async function searchBillableItems(searchTerm: string, departmentId?: number) {
  try {
    let query = `
      SELECT ci.*, cip.item_price_id, cip.price, cip.name as price_name, 
             cip.payment_mode, cd.name as department_name
      FROM cashier_item ci
      LEFT JOIN cashier_item_price cip ON ci.item_id = cip.item_id
      LEFT JOIN cashier_department cd ON ci.department_id = cd.department_id
      WHERE ci.retired = 0 
        AND (ci.name LIKE ? OR ci.description LIKE ?)
    `;
    
    const params = [`%${searchTerm}%`, `%${searchTerm}%`];
    
    if (departmentId) {
      query += ` AND ci.department_id = ?`;
      params.push(departmentId.toString());
    }
    
    query += ` ORDER BY ci.name LIMIT 20`;
    
    const [rows] = await db.execute(query, params);
    
    return rows as any[];
  } catch (error) {
    console.error('Error searching billable items:', error);
    return [];
  }
}

/**
 * Get item by ID with prices
 */
export async function getItemWithPrices(itemId: number) {
  try {
    const [itemRows] = await db.execute(
      `SELECT ci.*, cd.name as department_name
       FROM cashier_item ci
       LEFT JOIN cashier_department cd ON ci.department_id = cd.department_id
       WHERE ci.item_id = ? AND ci.retired = 0`,
      [itemId]
    );
    
    const item = (itemRows as any[])[0];
    if (!item) return null;
    
    const [priceRows] = await db.execute(
      `SELECT cip.*, cpm.name as payment_mode_name
       FROM cashier_item_price cip
       LEFT JOIN cashier_payment_mode cpm ON cip.payment_mode = cpm.payment_mode_id
       WHERE cip.item_id = ? AND cip.voided = 0
       ORDER BY cip.date_created`,
      [itemId]
    );
    
    item.prices = priceRows as any[];
    
    return item;
  } catch (error) {
    console.error('Error fetching item with prices:', error);
    return null;
  }
}

/**
 * Get available payment mode specific prices for an item
 */
export async function getItemPricesByPaymentMode(itemId: number, paymentModeId?: number) {
  try {
    let query = `
      SELECT cip.*, cpm.name as payment_mode_name
      FROM cashier_item_price cip
      LEFT JOIN cashier_payment_mode cpm ON cip.payment_mode = cpm.payment_mode_id
      WHERE cip.item_id = ? AND cip.voided = 0
    `;
    
    const params = [itemId];
    
    if (paymentModeId) {
      query += ` AND cip.payment_mode = ?`;
      params.push(paymentModeId);
    }
    
    query += ` ORDER BY cip.date_created`;
    
    const [rows] = await db.execute(query, params);
    
    return rows as any[];
  } catch (error) {
    console.error('Error fetching item prices:', error);
    return [];
  }
}

/**
 * Get billable services (alternative to items)
 */
export async function getBillableServices(searchTerm?: string) {
  try {
    let query = `
      SELECT cbs.*, cip.item_price_id, cip.price, cip.name as price_name, 
             cip.payment_mode, cpm.name as payment_mode_name
      FROM cashier_billable_service cbs
      LEFT JOIN cashier_item_price cip ON cbs.service_id = cip.service_id
      LEFT JOIN cashier_payment_mode cpm ON cip.payment_mode = cpm.payment_mode_id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (searchTerm) {
      query += ` AND (cbs.name LIKE ? OR cbs.description LIKE ?)`;
      params.push(`%${searchTerm}%`, `%${searchTerm}%`);
    }
    
    query += ` ORDER BY cbs.name LIMIT 20`;
    
    const [rows] = await db.execute(query, params);
    
    return rows as any[];
  } catch (error) {
    console.error('Error fetching billable services:', error);
    return [];
  }
}

/**
 * Get default price for an item
 */
export async function getDefaultItemPrice(itemId: number) {
  try {
    const [rows] = await db.execute(
      `SELECT cip.* 
       FROM cashier_item_price cip
       WHERE cip.item_id = ? AND cip.voided = 0
       ORDER BY cip.date_created DESC
       LIMIT 1`,
      [itemId]
    );
    
    return (rows as any[])[0] || null;
  } catch (error) {
    console.error('Error fetching default item price:', error);
    return null;
  }
}