// import { runSql } from '../lib/db/openmrsDb';
'use server';
import { v4 as uuidv4 } from 'uuid'; // Assuming you use a UUID generator
import { runSql, runSqlFlat } from '../db/openmrsDb';
import { CashierDepartment, CashierItem } from './services/billingServices';

// --- 2. DEPARTMENT MANAGEMENT ---

/**
 * Fetches all active billing departments.
 */
export async function getAllDepartments(): Promise<CashierDepartment[]> {
  const sql = `
    SELECT department_id, name, description, uuid 
    FROM cashier_department 
    WHERE retired = 0
    ORDER BY name;
  `;

  const departmentRows = await runSqlFlat<CashierDepartment>(sql);
  // console.log('department rows:', departmentRows);
  return departmentRows;
}

/**
 * Creates a new billing department.
 */
export async function createDepartment(
  name: string, 
  description: string | null, 
  creatorId: number
): Promise<number> {
  const uuid = uuidv4();
  const sql = `
    INSERT INTO cashier_department 
    (name, description, creator, date_created, retired, uuid)
    VALUES (?, ?, ?, NOW(), 0, ?);
  `;
  
  // 💡 FIX: Remove the array destructuring brackets ([])
  // We assume runSql returns a single object { insertId: number }
  const [result] = await runSql<{ insertId: number }>(sql, [
    name, 
    description, 
    creatorId, 
    uuid
  ]);
  
  return result.insertId;
}

// --- 3. BILLABLE ITEM MANAGEMENT (Services) ---

export async function getAllBillableItems(): Promise<
  (CashierItem & { price: number; department_name: string })[]
> {
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
  // console.log('Fetched Billable Items:', rows);
  return rows;
}


/**
 * Creates a new billable item and its initial default price.
 * This is a transactional operation (simplified here without explicit transaction control).
 */
export async function createBillableItem(
  itemName: string,
  departmentId: number,
  initialPrice: number,
  creatorId: number,
  description: string | null = null,
  priceName: string = 'Default Price'
): Promise<CashierItem> {
  
  try {
  const itemUuid = uuidv4();
  const dateCreated = new Date();

  // INSERT cashier_item
  const itemSql = `
    INSERT INTO cashier_item
    (name, description, department_id, creator, date_created, retired, uuid)
    VALUES (?, ?, ?, ?, ?, 0, ?);
  `;

  const itemResult = await runSql<{ insertId: number }>(itemSql, [
    itemName,
    description,
    departmentId,
    creatorId,
    dateCreated,
    itemUuid,
  ]);

  const newItemId = (itemResult as any).insertId;

  // INSERT cashier_item_price with NULL item_id
  const priceUuid = uuidv4();
  const priceSql = `
    INSERT INTO cashier_item_price
    (item_id, price, name, creator, date_created, voided, uuid)
    VALUES (NULL, ?, ?, ?, ?, 0, ?);
  `;

  const priceResult = await runSql<{ insertId: number }>(priceSql, [
    initialPrice,
    priceName,
    creatorId,
    dateCreated,
    priceUuid,
  ]);

  const newPriceId = (priceResult as any).insertId;

  // UPDATE cashier_item.default_price_id
  const updateSql = `
    UPDATE cashier_item
    SET default_price_id = ?
    WHERE item_id = ?;
  `;
  await runSql(updateSql, [newPriceId, newItemId]);

  return {
    item_id: newItemId,
    name: itemName,
    description: description || '',
    department_id: departmentId,
    default_price_id: newPriceId,
    uuid: itemUuid,
  };

  } catch (error) {
    console.error('Error creating billable item:', error);
    
  }
  return {} as CashierItem;
}


// --- 4. ITEM PRICE MANAGEMENT ---

/**
 * Adds a new price to an existing billable item.
 */
export async function addItemPrice(
  itemId: number,
  price: number,
  creatorId: number,
  priceName: string,
  paymentModeId: number | null = null // Optional link to cashier_payment_mode
): Promise<number> {
  const uuid = uuidv4();
  const sql = `
    INSERT INTO cashier_item_price
    (item_id, price, payment_mode, name, creator, date_created, voided, uuid)
    VALUES (?, ?, ?, ?, ?, NOW(), 0, ?);
  `;
  const [result] = await runSql<{ insertId: number }>(sql, [
    itemId,
    price,
    paymentModeId,
    priceName,
    creatorId,
    uuid,
  ]);
  return result.insertId;
}

/**
 * Voids a price, rather than deleting it (Standard OpenMRS practice).
 */
export async function voidItemPrice(
  itemPriceId: number,
  voidReason: string,
  voidedBy: number
): Promise<void> {
  const sql = `
    UPDATE cashier_item_price
    SET voided = 1, voided_by = ?, date_voided = NOW(), void_reason = ?
    WHERE item_price_id = ?;
  `;
  await runSql(sql, [voidedBy, voidReason, itemPriceId]);
}

