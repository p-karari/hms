// lib/billing/editBillableService.ts
'use server';
import { runSql, runSqlFlat } from '../db/openmrsDb';
import { v4 as uuidv4 } from 'uuid';
export interface EditServiceData {
  service_id: number;
  name?: string;
  short_name?: string;
  service_type?: number | null;
  service_status?: string;
  concept_id?: number | null;
  changed_by: number;
}


// NEW: Interface for price updates
export interface ServicePriceUpdate {
  item_price_id?: number; // For existing prices
  price: number;
  payment_mode?: number | null;
  price_name?: string;
  is_new?: boolean; // Flag for new prices
}

// NEW: Function to update service prices
export async function updateServicePrices(
  serviceId: number,
  prices: ServicePriceUpdate[],
  creatorId: number
): Promise<void> {
  const dateCreated = new Date();
  
  // Void existing prices first (soft delete)
  const voidSql = `
    UPDATE cashier_item_price
    SET voided = 1, voided_by = ?, date_voided = ?, void_reason = 'Updated via edit'
    WHERE service_id = ? AND voided = 0;
  `;
  
  await runSql(voidSql, [creatorId, dateCreated, serviceId]);
  
  // Insert new/updated prices
  for (const price of prices) {
    const priceUuid = uuidv4();
    const insertSql = `
      INSERT INTO cashier_item_price
      (item_id, service_id, price, payment_mode, name, creator, date_created, voided, uuid)
      VALUES (NULL, ?, ?, ?, ?, ?, ?, 0, ?);
    `;
    
    await runSql(insertSql, [
      serviceId,
      price.price,
      price.payment_mode || null,
      price.price_name || 'Default Price',
      creatorId,
      dateCreated,
      priceUuid,
    ]);
  }
}

// NEW: Function to get service with prices
export async function getServiceWithPrices(serviceId: number) {
  const sql = `
    SELECT 
        cbs.service_id,
        cbs.name,
        cbs.short_name,
        cbs.service_type,
        cbs.service_status,
        cbs.concept_id,
        cip.item_price_id,
        cip.price,
        cip.payment_mode,
        cip.name as price_name
    FROM cashier_billable_service cbs
    LEFT JOIN cashier_item_price cip ON cbs.service_id = cip.service_id AND cip.voided = 0
    WHERE cbs.service_id = ? AND cbs.voided = 0;
  `;
  
  const rows = await runSqlFlat(sql, [serviceId]);
  return rows;
}

export async function editBillableService(data: EditServiceData): Promise<boolean> {
  const dateChanged = new Date();
  
  // Build dynamic update query
  const updates: string[] = [];
  const params: any[] = [];
  
  if (data.name !== undefined) {
    updates.push('name = ?');
    params.push(data.name);
  }
  
  if (data.short_name !== undefined) {
    updates.push('short_name = ?');
    params.push(data.short_name);
  }
  
  if (data.service_type !== undefined) {
    updates.push('service_type = ?');
    params.push(data.service_type);
  }
  
  if (data.service_status !== undefined) {
    updates.push('service_status = ?');
    params.push(data.service_status);
  }
  
  if (data.concept_id !== undefined) {
    updates.push('concept_id = ?');
    params.push(data.concept_id);
  }
  
  // Always update changed_by and date_changed
  updates.push('changed_by = ?', 'date_changed = ?');
  params.push(data.changed_by, dateChanged);
  
  if (updates.length === 0) {
    return false; // Nothing to update
  }
  
  const sql = `
    UPDATE cashier_billable_service
    SET ${updates.join(', ')}
    WHERE service_id = ? AND voided = 0;
  `;
  
  params.push(data.service_id);
  
  try {
    const result = await runSql(sql, params);
    return (result as any).affectedRows > 0;
  } catch (error) {
    console.error('Error editing billable service:', error);
    throw error;
  }
}

// Optional: Update related concept name
export async function updateServiceConceptName(
  conceptId: number, 
  newName: string, 
  changedBy: number
): Promise<boolean> {
  const dateChanged = new Date();
  
  const sql = `
    UPDATE concept_name
    SET name = ?, changed_by = ?, date_changed = ?
    WHERE concept_id = ? AND locale = 'en' AND locale_preferred = 1 AND voided = 0;
  `;
  
  try {
    const result = await runSql(sql, [newName, changedBy, dateChanged, conceptId]);
    return (result as any).affectedRows > 0;
  } catch (error) {
    console.error('Error updating concept name:', error);
    throw error;
  }
}