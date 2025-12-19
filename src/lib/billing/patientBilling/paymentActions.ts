// /lib/billing/patientBilling/paymentActions.ts

//Payment processing operations

'use server';

// Import db and the transaction wrapper
import { db, withTransaction } from '@/lib/db/openmrsDb'; 
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';

export interface PaymentData {
  billId: number;
  paymentModeId: number;
  amount: number;
  amountTendered: number;
  attributes?: Record<string, string>; // Payment mode specific attributes
}

/**
 * Process a payment for a bill (Now uses the atomic withTransaction helper)
 */
export async function processPayment(paymentData: PaymentData) {
  try {
    // Placeholder: Get current user ID from session
    const creator = 1; // TODO: Implement session-based user ID retrieval
    const now = new Date();
    const paymentUuid = uuidv4();
    
    // 1. Use the withTransaction wrapper to ensure atomicity
    const result = await withTransaction(async () => {
      
      // Create payment record
      const [paymentResult] = await db.execute(
        `INSERT INTO cashier_bill_payment 
         (bill_id, payment_mode_id, amount, amount_tendered, creator, date_created, uuid)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          paymentData.billId,
          paymentData.paymentModeId,
          paymentData.amount,
          paymentData.amountTendered,
          creator,
          now,
          paymentUuid
        ]
      );
      
      const billPaymentId = (paymentResult as any)[0]?.insertId;
      
      if (!billPaymentId) {
          throw new Error('Failed to create payment record.');
      }
      
      // Save payment attributes if any
      if (paymentData.attributes && Object.keys(paymentData.attributes).length > 0) {
        for (const [attributeTypeId, value] of Object.entries(paymentData.attributes)) {
          const attributeUuid = uuidv4();
          await db.execute(
            `INSERT INTO cashier_bill_payment_attribute 
             (bill_payment_id, payment_mode_attribute_type_id, value_reference, uuid)
             VALUES (?, ?, ?, ?)`,
            [billPaymentId, parseInt(attributeTypeId), value, attributeUuid]
          );
        }
      }
      
      // Update bill status
      await updateBillStatusAfterPayment(paymentData.billId);
      
      // Generate receipt number if bill is fully paid
      const billStatus = await getBillStatus(paymentData.billId);
      if (billStatus === 'PAID') {
        await generateAndAssignReceiptNumber(paymentData.billId);
      }
      
      // All commands succeeded, the transaction will automatically COMMIT
      return { billPaymentId };
    });
    
    revalidatePath('/patient-billing');
    return {
      success: true,
      billPaymentId: result.billPaymentId,
      message: 'Payment processed successfully'
    };
  } catch (error) {
    // The withTransaction helper automatically handles the ROLLBACK
    console.error('Error processing payment:', error);
    return {
      success: false,
      message: `Failed to process payment: ${(error as Error).message}`
    };
  }
}

/**
 * Get all payments for a bill
 */
export async function getBillPayments(billId: number) {
// ... (rest of the functions remain the same) ...

  try {
    const [rows] = await db.execute(
      `SELECT cbp.*, 
              cpm.name as payment_mode_name,
              u.username as creator_username
       FROM cashier_bill_payment cbp
       LEFT JOIN cashier_payment_mode cpm ON cbp.payment_mode_id = cpm.payment_mode_id
       LEFT JOIN users u ON cbp.creator = u.user_id
       WHERE cbp.bill_id = ? AND cbp.voided = 0
       ORDER BY cbp.date_created`,
      [billId]
    );
    
    return rows as any[];
  } catch (error) {
    console.error('Error fetching bill payments:', error);
    return [];
  }
}

/**
 * Get payment details with attributes
 */
export async function getPaymentDetails(billPaymentId: number) {
  try {
    const [paymentRows] = await db.execute(
      `SELECT cbp.*, cpm.name as payment_mode_name
       FROM cashier_bill_payment cbp
       LEFT JOIN cashier_payment_mode cpm ON cbp.payment_mode_id = cpm.payment_mode_id
       WHERE cbp.bill_payment_id = ? AND cbp.voided = 0`,
      [billPaymentId]
    );
    
    const payment = (paymentRows as any[])[0];
    if (!payment) return null;
    
    // Get payment attributes
    const [attributeRows] = await db.execute(
      `SELECT cbpa.*, cpmatt.name as attribute_name
       FROM cashier_bill_payment_attribute cbpa
       LEFT JOIN cashier_payment_mode_attribute_type cpmatt ON cbpa.payment_mode_attribute_type_id = cpmatt.payment_mode_attribute_type_id
       WHERE cbpa.bill_payment_id = ?`,
      [billPaymentId]
    );
    
    payment.attributes = attributeRows as any[];
    
    return payment;
  } catch (error) {
    console.error('Error fetching payment details:', error);
    return null;
  }
}

/**
 * Void a payment
 */
export async function voidPayment(billPaymentId: number, voidReason: string) {
  try {
    // Placeholder: Get current user ID from session
    const voidedBy = 1; // TODO: Implement session-based user ID retrieval
    
    const now = new Date();
    
    // Get bill ID for revalidation
    const [paymentRows] = await db.execute(
      `SELECT bill_id FROM cashier_bill_payment WHERE bill_payment_id = ?`,
      [billPaymentId]
    );
    
    const billId = (paymentRows as any[])[0]?.bill_id;
    
    await db.execute(
      `UPDATE cashier_bill_payment 
       SET voided = 1, voided_by = ?, date_voided = ?, void_reason = ?
       WHERE bill_payment_id = ? AND voided = 0`,
      [voidedBy, now, voidReason, billPaymentId]
    );
    
    if (billId) {
      await updateBillStatusAfterPayment(billId);
      revalidatePath(`/patient-billing/${billId}`);
    }
    
    return {
      success: true,
      message: 'Payment voided successfully'
    };
  } catch (error) {
    console.error('Error voiding payment:', error);
    return {
      success: false,
      message: 'Failed to void payment'
    };
  }
}

/**
 * Helper function to update bill status after payment
 */
async function updateBillStatusAfterPayment(billId: number) {
  try {
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
    console.error('Error updating bill status after payment:', error);
  }
}

/**
 * Helper function to get bill status
 */
async function getBillStatus(billId: number) {
  try {
    const [rows] = await db.execute(
      `SELECT status FROM cashier_bill WHERE bill_id = ?`,
      [billId]
    );
    
    return (rows as any[])[0]?.status || 'PENDING';
  } catch (error) {
    console.error('Error getting bill status:', error);
    return 'PENDING';
  }
}

/**
 * Helper function to generate and assign receipt number
 */
async function generateAndAssignReceiptNumber(billId: number) {
  try {
    // TODO: Implement receipt number generation logic
    // This would use cashier_seq_receipt_number_generator table
    
    // For now, generate a simple receipt number
    const receiptNumber = `REC-${Date.now()}-${billId}`;
    
    await db.execute(
      `UPDATE cashier_bill SET receipt_number = ? WHERE bill_id = ?`,
      [receiptNumber, billId]
    );
    
    return receiptNumber;
  } catch (error) {
    console.error('Error generating receipt number:', error);
    return null;
  }
}