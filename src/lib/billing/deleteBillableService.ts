// lib/billing/deleteBillableService.ts
'use server';
import { runSql } from '../db/openmrsDb';

export interface DeleteServiceData {
  service_id: number;
  voided_by: number;
  void_reason?: string;
}

export async function deleteBillableService(data: DeleteServiceData): Promise<boolean> {
  const dateVoided = new Date();
  
  const sql = `
    UPDATE cashier_billable_service
    SET voided = 1, 
        voided_by = ?, 
        date_voided = ?, 
        void_reason = ?
    WHERE service_id = ? AND voided = 0;
  `;
  
  try {
    const result = await runSql(sql, [
      data.voided_by,
      dateVoided,
      data.void_reason || '',
      data.service_id
    ]);
    return (result as any).affectedRows > 0;
  } catch (error) {
    console.error('Error deleting billable service:', error);
    throw error;
  }
}

// Optional: Also void related prices
export async function voidServicePrices(
  serviceId: number, 
  voidedBy: number, 
  voidReason?: string
): Promise<boolean> {
  const dateVoided = new Date();
  
  const sql = `
    UPDATE cashier_item_price
    SET voided = 1, 
        voided_by = ?, 
        date_voided = ?, 
        void_reason = ?
    WHERE service_id = ? AND voided = 0;
  `;
  
  try {
    const result = await runSql(sql, [
      voidedBy,
      dateVoided,
      voidReason || '',
      serviceId
    ]);
    return (result as any).affectedRows > 0;
  } catch (error) {
    console.error('Error voiding service prices:', error);
    throw error;
  }
}