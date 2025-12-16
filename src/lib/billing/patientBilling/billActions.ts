// /lib/billing/patientBilling/billActions.ts

//Main Bill Operations

'use server';

import { db, withTransaction } from '@/lib/db/openmrsDb';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';

// Re-declare necessary interface for the items array from the client
// ... (LineItemData and toNull function remain the same) ...

export interface LineItemData {
  price: number;
  priceName?: string;
  quantity: number;
  lineItemOrder: number;
  priceId?: number;
  serviceId?: number | null; // Changed from optional to required for services
  orderId?: number;
  paymentStatus?: 'PENDING' | 'PAID';
  itemId?: number | null; // Added: for items (null as per requirements)
  type?: 'ITEM' | 'SERVICE'; // Added: to distinguish item vs service
}

// Helper function to convert undefined to null (reused from billItemActions)
function toNull(value: any): any {
  return value === undefined ? null : value;
}


// Add this helper function at the top of the file
function debugParams(params: any[], label: string) {
  params.forEach((param, index) => {
    if (param === undefined) {
      console.error(`${label}: Parameter at index ${index} is undefined!`);
      console.error(`${label}: Full params array:`, params);
    }
  });
  return params;
}

// Add this function to convert undefined to null
function ensureNull(value: any): any {
  return value === undefined ? null : value;
}

export async function createBillWithLineItems(
  patientUuid: string, 
  cashPointId: number, 
  items: LineItemData[]
) {
  try {
    // Use the withTransaction helper instead of manual transaction control
    return await withTransaction(async () => {
      // 1. Get patient_id from UUID
      const [patientRows] = await db.execute(
        `SELECT p.patient_id 
         FROM patient p
         JOIN person per ON p.patient_id = per.person_id
         WHERE per.uuid = ? AND p.voided = 0 AND per.voided = 0`,
        [patientUuid]
      );
      
      const patientRow = (patientRows as any[])[0];
      if (!patientRow) {
        return {
          success: false,
          message: 'Patient not found or has been voided'
        };
      }
      
      const patientId = patientRow.patient_id;
      
      // 2. Get current user ID from session
      const creator = 1; // TODO: Implement session-based user ID retrieval
      
      // 3. Get provider ID from session
      const providerId = 1; // TODO: Implement session-based user ID retrieval
      
      const now = new Date();
      const uuid = uuidv4();
      
      // 4. Create the bill
      const billParams = [patientId, providerId, cashPointId, creator, now, uuid];
      // debugParams(billParams, 'Bill creation params'); // Keeping debug commented out for clean code
      
      const [billResult] = await db.execute(
        `INSERT INTO cashier_bill 
         (patient_id, provider_id, cash_point_id, creator, date_created, status, uuid)
         VALUES (?, ?, ?, ?, ?, 'PENDING', ?)`,
        billParams
      );
      
      // CRITICAL FIX: The insert result is an array containing an object with insertId.
      // We must access the [0] index to get the object with insertId.
      const billId = (billResult as any)[0]?.insertId; 
      
      if (!billId || typeof billId !== 'number') {
        throw new Error('Bill creation failed: Database did not return a valid bill ID.');
      }
      
      // 5. Insert all line items
      for (const item of items) {
        const itemUuid = uuidv4();
        
        // Prepare parameters with explicit null conversion
        const lineItemParams = [
          billId, // <-- NOW A VALID NUMBER, FIXING THE UNDEFINED ERROR
          // Convert undefined to null for item_id
          ensureNull(item.type === 'ITEM' ? item.itemId : null),
          item.price,
          ensureNull(item.priceName),
          item.quantity,
          item.lineItemOrder,
          creator,
          now,
          itemUuid,
          ensureNull(item.priceId),
          ensureNull(item.paymentStatus) || 'PENDING',
          // Convert undefined to null for service_id
          ensureNull(item.type === 'SERVICE' ? item.serviceId : null),
          // ensureNull(item.orderId) is safe because you explicitly map it to an object property
          ensureNull((item as any).orderId) 
        ];
        
        // debugParams(lineItemParams, `Line item ${item.lineItemOrder} params`); // Keeping debug commented out for clean code
        
        await db.execute(
          `INSERT INTO cashier_bill_line_item 
          (bill_id, item_id, price, price_name, quantity, line_item_order, 
            creator, date_created, uuid, price_id, payment_status, service_id, order_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          lineItemParams
        );
      }
      
      revalidatePath('/patient-billing');
      return {
        success: true,
        billId,
        message: 'Bill created with items successfully'
      };
    });
    
  } catch (error: any) {
    console.error('Error creating bill with items:', error);
    
    // Log the items that caused the error
    console.error('Items that caused error:', items);
    
    return {
      success: false,
      message: `Failed to create bill: ${error.message}`
    };
  }
}


/**
 * Create a new bill for a patient (Original - DO NOT USE FOR NEW WORKFLOW)
 */
export async function createBill(patientUuid: string, cashPointId: number) {
// ... (createBill remains the same) ...
  try {
    // 1. Get numeric patient_id from person table using UUID (with join to patient table)
    const [patientRows] = await db.execute(
      `SELECT p.patient_id 
       FROM patient p
       JOIN person per ON p.patient_id = per.person_id
       WHERE per.uuid = ? AND p.voided = 0 AND per.voided = 0`,
      [patientUuid]
    );
    
    const patientRow = (patientRows as any[])[0];
    if (!patientRow) {
      return {
        success: false,
        message: 'Patient not found or has been voided'
      };
    }
    
    const patientId = patientRow.patient_id;
    
    // 2. Get current user ID from session (placeholder)
    const creator = 1; // TODO: Implement session-based user ID retrieval
    
    // 3. Get provider ID from session or user context (placeholder)
    const providerId = 1; // TODO: Implement provider ID retrieval
    
    const now = new Date();
    const uuid = uuidv4();
    
    // 4. Create the bill with the numeric patient_id
    const [result] = await db.execute(
      `INSERT INTO cashier_bill 
       (patient_id, provider_id, cash_point_id, creator, date_created, status, uuid)
       VALUES (?, ?, ?, ?, ?, 'PENDING', ?)`,
      [patientId, providerId, cashPointId, creator, now, uuid]
    );
    
    // 5. Get the inserted bill ID
    const billId = (result as any)[0]?.insertId;
    
    revalidatePath('/patient-billing');
    return {
      success: true,
      billId,
      message: 'Bill created successfully'
    };
  } catch (error: any) {
    console.error('Error creating bill:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to create bill';
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      if (error.sqlMessage.includes('cashier_bill_patient_fk')) {
        errorMessage = 'Patient reference error - patient not found';
      } else if (error.sqlMessage.includes('cashier_bill_provider_fk')) {
        errorMessage = 'Provider reference error - provider not found';
      } else if (error.sqlMessage.includes('cashier_bill_cash_point_fk')) {
        errorMessage = 'Cash point reference error - cash point not found';
      }
    } else if (error.code === 'ER_DUP_ENTRY' && error.sqlMessage.includes('uuid')) {
      errorMessage = 'Duplicate UUID generated - please try again';
    }
    
    return {
      success: false,
      message: errorMessage
    };
  }
}

/**
 * Get bill by ID with details
 */
export async function getBillById(billId: number) {
  // FIX: Check if billId is valid before running the query
  if (!billId) {
    console.warn('Attempted to fetch bill with invalid/missing billId.');
    return null;
  }
  
  try {
    const [rows] = await db.execute(
      `SELECT cb.*, 
              p.patient_id, p.date_created as patient_date_created,
              cp.name as cash_point_name,
              u.username as creator_username
       FROM cashier_bill cb
       LEFT JOIN patient p ON cb.patient_id = p.patient_id
       LEFT JOIN cashier_cash_point cp ON cb.cash_point_id = cp.cash_point_id
       LEFT JOIN users u ON cb.creator = u.user_id
       WHERE cb.bill_id = ? AND cb.voided = 0`,
      [billId]
    );
    
    return (rows as any[])[0] || null;
  } catch (error) {
    console.error('Error fetching bill:', error);
    return null;
  }
}

/**
 * Get all bills for a patient
 */
export async function getPatientBills(patientUuid: string) {
  // 1. Input Validation for UUID
  if (!patientUuid) {
    console.warn('Attempted to fetch patient bills with missing patientUuid. Returning empty list.');
    return [];
  }
  
  try {
    // 2. Get numeric patient_id from UUID
    const [patientRows] = await db.execute(
        `SELECT p.patient_id 
         FROM patient p
         JOIN person per ON p.patient_id = per.person_id
         WHERE per.uuid = ? AND p.voided = 0 AND per.voided = 0`,
        [patientUuid]
    );

    const patientRow = (patientRows as any[])[0];
    
    if (!patientRow) {
        console.warn(`Patient not found for UUID: ${patientUuid}. Cannot fetch bills.`);
        return [];
    }
    
    const patientId = patientRow.patient_id;

    // 3. Fetch bills using the numeric ID
    const [rows] = await db.execute(
      `SELECT cb.*, 
              cp.name as cash_point_name,
              u.username as creator_username,
              (SELECT SUM(amount) FROM cashier_bill_payment WHERE bill_id = cb.bill_id AND voided = 0) as amount_paid,
              (SELECT SUM(price * quantity) FROM cashier_bill_line_item WHERE bill_id = cb.bill_id AND voided = 0) as total_amount
       FROM cashier_bill cb
       LEFT JOIN cashier_cash_point cp ON cb.cash_point_id = cp.cash_point_id
       LEFT JOIN users u ON cb.creator = u.user_id
       WHERE cb.patient_id = ? AND cb.voided = 0
       ORDER BY cb.date_created DESC`,
      [patientId]
    );
    
    return rows as any[];
  } catch (error) {
    console.error('Error fetching patient bills:', error);
    return [];
  }
}

/**
 * Update bill status
 */
export async function updateBillStatus(billId: number, status: 'PENDING' | 'PAID' | 'CANCELLED' | 'PARTIALLY_PAID') {
// ... (updateBillStatus remains the same) ...
  try {
    // Placeholder: Get current user ID from session
    const changedBy = 1; // TODO: Implement session-based user ID retrieval
    
    const now = new Date();
    
    await db.execute(
      `UPDATE cashier_bill 
       SET status = ?, changed_by = ?, date_changed = ?
       WHERE bill_id = ? AND voided = 0`,
      [status, changedBy, now, billId]
    );
    
    revalidatePath('/patient-billing');
    return {
      success: true,
      message: 'Bill status updated successfully'
    };
  } catch (error) {
    console.error('Error updating bill status:', error);
    return {
      success: false,
      message: 'Failed to update bill status'
    };
  }
}

/**
 * Void a bill
 */
export async function voidBill(billId: number, voidReason: string) {
// ... (voidBill remains the same) ...
  try {
    // Placeholder: Get current user ID from session
    const voidedBy = 1; // TODO: Implement session-based user ID retrieval
    
    const now = new Date();
    
    await db.execute(
      `UPDATE cashier_bill 
       SET voided = 1, voided_by = ?, date_voided = ?, void_reason = ?
       WHERE bill_id = ? AND voided = 0`,
      [voidedBy, now, voidReason, billId]
    );
    
    revalidatePath('/patient-billing');
    return {
      success: true,
      message: 'Bill voided successfully'
    };
  } catch (error) {
    console.error('Error voiding bill:', error);
    return {
      success: false,
      message: 'Failed to void bill'
    };
  }
}

/**
 * Calculate bill total
 */
export async function calculateBillTotal(billId: number) {
// ... (calculateBillTotal remains the same) ...
  try {
    const [rows] = await db.execute(
      `SELECT SUM(price * quantity) as total_amount
       FROM cashier_bill_line_item 
       WHERE bill_id = ? AND voided = 0`,
      [billId]
    );
    
    const total = (rows as any[])[0]?.total_amount || 0;
    
    const [paymentRows] = await db.execute(
      `SELECT SUM(amount) as amount_paid
       FROM cashier_bill_payment 
       WHERE bill_id = ? AND voided = 0`,
      [billId]
    );
    
    const paid = (paymentRows as any[])[0]?.amount_paid || 0;
    const balance = total - paid;
    
    return {
      totalAmount: Number(total),
      amountPaid: Number(paid),
      balance: Number(balance)
    };
  } catch (error) {
    console.error('Error calculating bill total:', error);
    return {
      totalAmount: 0,
      amountPaid: 0,
      balance: 0
    };
  }
}


export async function getPatientDataByUuid(patientUuid: string): Promise<{ id: number, name: string } | null> {
    // 1. Input Validation: Return null if the input is missing
    if (!patientUuid) {
        console.warn('getPatientDataByUuid called with missing UUID.');
        return null;
    }
    
    try {
        // 2. Database Lookup
        const [rows] = await db.execute(
            // Joins to person and person_name tables
            `SELECT p.patient_id, pn.given_name, pn.family_name 
             FROM patient p
             JOIN person per ON p.patient_id = per.person_id
             LEFT JOIN person_name pn ON p.patient_id = pn.person_id AND pn.voided = 0
             WHERE per.uuid = ? AND p.voided = 0 AND per.voided = 0
             LIMIT 1`,
            [patientUuid]
        );

        const patientRow = (rows as any[])[0];
        
        if (!patientRow) {
            console.warn(`Patient not found for UUID: ${patientUuid}`);
            return null;
        }

        // 3. Format Output
        const patientName = `${patientRow.given_name || ''} ${patientRow.family_name || ''}`.trim() || 'Unknown Patient';
        
        return { 
            id: patientRow.patient_id, 
            name: patientName
        };

    } catch (error) {
        console.error('Error resolving patient UUID to numeric ID:', error);
        return null;
    }
}