// /lib/billing/patientBilling/billItemActions.ts

//Bill line item operations

'use server';

import { db } from '@/lib/db/openmrsDb';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';

export interface BillItemData {
  billId: number;
  price: number;
  priceName?: string;
  quantity: number;
  lineItemOrder: number;
  priceId?: number;
  serviceId?: number;
  orderId?: number;
  paymentStatus?: 'PENDING' | 'PAID';
}

// Helper function to convert undefined to null
function toNull(value: any): any {
  return value === undefined ? null : value;
}

/**
 * Add item to a bill (No longer used directly by client, only kept for completeness/server logic)
 * Note: itemId is set to null as per requirements
 */
export async function addBillItem(itemData: BillItemData) {
  try {
    // FIX 1: Ensure creator is NOT undefined. Use a guaranteed number or null.
    const creator = 1; // Replace this with a robust session check.
    
    // Safety check for the placeholder (if it's temporary):
    if (creator === undefined) {
       throw new Error('Creator ID must be defined or explicitly null.');
    }
    
    const now = new Date();
    const uuid = uuidv4();
    
    // FIX 2: Ensure all parameters are explicitly handled using toNull 
    // and correctly typed (like price and quantity).
    const params = [
      Number(itemData.billId), // Ensure billId is a number
      null, // item_id as per requirements
      Number(itemData.price), // Ensure price is a number
      toNull(itemData.priceName), // Handles string | undefined | null
      Number(itemData.quantity), // Ensure quantity is a number
      Number(itemData.lineItemOrder), // Ensure order is a number
      creator, // Guaranteed number
      now,
      uuid,
      toNull(itemData.priceId),
      itemData.paymentStatus ?? 'PENDING', // Guaranteed string
      toNull(itemData.serviceId),
      toNull(itemData.orderId)
    ];
    
    // debugParams(params); // Removed debugging function
    
    const [result] = await db.execute(
      `INSERT INTO cashier_bill_line_item 
       (bill_id, item_id, price, price_name, quantity, line_item_order, 
        creator, date_created, uuid, price_id, payment_status, service_id, order_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params
    );
    
    const billLineItemId = (result as any)[0]?.insertId;
    
    // Update bill status if needed
    await updateBillStatusIfNeeded(itemData.billId);
    
    revalidatePath('/patient-billing');
    return {
      success: true,
      billLineItemId,
      message: 'Item added to bill successfully'
    };
  } catch (error: any) {
    console.error('Error adding bill item:', error);
    
    // More detailed error logging
    console.error('Item data that caused error:', itemData);
    
    return {
      success: false,
      message: `Failed to add item to bill: ${error.message}`
    };
  }
}

/**
 * Get all items for a bill
 */
export async function getBillItems(billId: number) {
  try {
    const [rows] = await db.execute(
      `SELECT cbli.*, 
              ci.name as item_name,
              cbs.name as service_name,
              cip.name as price_name
       FROM cashier_bill_line_item cbli
       LEFT JOIN cashier_item ci ON cbli.item_id = ci.item_id
       LEFT JOIN cashier_billable_service cbs ON cbli.service_id = cbs.service_id
       LEFT JOIN cashier_item_price cip ON cbli.price_id = cip.item_price_id
       WHERE cbli.bill_id = ? AND cbli.voided = 0
       ORDER BY cbli.line_item_order`,
      [billId]
    );
    
    return rows as any[];
  } catch (error) {
    console.error('Error fetching bill items:', error);
    return [];
  }
}

/**
 * Remove item from bill (void it)
 */
export async function removeBillItem(billLineItemId: number, voidReason: string) {
  try {
    // Placeholder: Get current user ID from session
    const voidedBy = 1; // TODO: Implement session-based user ID retrieval
    
    const now = new Date();
    
    // First get the bill ID for revalidation
    const [itemRows] = await db.execute(
      `SELECT bill_id FROM cashier_bill_line_item WHERE bill_line_item_id = ?`,
      [billLineItemId]
    );
    
    const billId = (itemRows as any[])[0]?.bill_id;
    
    await db.execute(
      `UPDATE cashier_bill_line_item 
       SET voided = 1, voided_by = ?, date_voided = ?, void_reason = ?
       WHERE bill_line_item_id = ? AND voided = 0`,
      [voidedBy, now, voidReason, billLineItemId]
    );
    
    if (billId) {
      await updateBillStatusIfNeeded(billId);
      revalidatePath(`/patient-billing/${billId}`);
    }
    
    return {
      success: true,
      message: 'Item removed from bill successfully'
    };
  } catch (error) {
    console.error('Error removing bill item:', error);
    return {
      success: false,
      message: 'Failed to remove item from bill'
    };
  }
}

/**
 * Update bill item quantity or price
 */
export async function updateBillItem(billLineItemId: number, updates: { quantity?: number; price?: number }) {
  try {
    // Placeholder: Get current user ID from session
    const changedBy = 1; // TODO: Implement session-based user ID retrieval
    
    const now = new Date();
    
    const setClauses = [];
    const values = [];
    
    if (updates.quantity !== undefined) {
      setClauses.push('quantity = ?');
      values.push(updates.quantity);
    }
    
    if (updates.price !== undefined) {
      setClauses.push('price = ?');
      values.push(updates.price);
    }
    
    if (setClauses.length === 0) {
      return { success: false, message: 'No updates provided' };
    }
    
    setClauses.push('changed_by = ?', 'date_changed = ?');
    values.push(changedBy, now);
    values.push(billLineItemId);
    
    const query = `UPDATE cashier_bill_line_item SET ${setClauses.join(', ')} WHERE bill_line_item_id = ? AND voided = 0`;
    
    await db.execute(query, values);
    
    // Get bill ID for status update
    const [itemRows] = await db.execute(
      `SELECT bill_id FROM cashier_bill_line_item WHERE bill_line_item_id = ?`,
      [billLineItemId]
    );
    
    const billId = (itemRows as any[])[0]?.bill_id;
    if (billId) {
      await updateBillStatusIfNeeded(billId);
      revalidatePath(`/patient-billing/${billId}`);
    }
    
    return {
      success: true,
      message: 'Bill item updated successfully'
    };
  } catch (error) {
    console.error('Error updating bill item:', error);
    return {
      success: false,
      message: 'Failed to update bill item'
    };
  }
}

/**
 * Helper function to update bill status based on items
 */
async function updateBillStatusIfNeeded(billId: number) {
  try {
    // Calculate total and paid amounts
    const [totalRows] = await db.execute(
      `SELECT SUM(price * quantity) as total_amount
       FROM cashier_bill_line_item 
       WHERE bill_id = ? AND voided = 0`,
      [billId]
    );
    
    const [paidRows] = await db.execute(
      `SELECT SUM(amount) as amount_paid
       FROM cashier_bill_payment 
       WHERE bill_id = ? AND voided = 0`,
      [billId]
    );
    
    const total = (totalRows as any[])[0]?.total_amount || 0;
    const paid = (paidRows as any[])[0]?.amount_paid || 0;
    
    let newStatus = 'PENDING';
    if (paid >= total && total > 0) {
      newStatus = 'PAID';
    } else if (paid > 0 && paid < total) {
      newStatus = 'PARTIALLY_PAID';
    }
    
    // Placeholder: Get current user ID from session
    const changedBy = 1; // TODO: Implement session-based user ID retrieval
    
    const now = new Date();
    
    await db.execute(
      `UPDATE cashier_bill 
       SET status = ?, changed_by = ?, date_changed = ?
       WHERE bill_id = ? AND voided = 0`,
      [newStatus, changedBy, now, billId]
    );
    
  } catch (error) {
    console.error('Error updating bill status:', error);
  }
}