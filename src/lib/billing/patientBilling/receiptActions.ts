//Receipt generation and management actions

'use server';

import { db } from '@/lib/db/openmrsDb';

/**
 * Generate receipt for a bill
 */
export async function generateReceipt(billId: number) {
  try {
    // Get bill details
    const [billRows] = await db.execute(
      `SELECT cb.*, 
              p.patient_id, 
              CONCAT(pn.given_name, ' ', pn.family_name) as patient_name,
              cp.name as cash_point_name,
              u.username as cashier_name
       FROM cashier_bill cb
       LEFT JOIN patient p ON cb.patient_id = p.patient_id
       LEFT JOIN person_name pn ON p.patient_id = pn.person_id AND pn.voided = 0
       LEFT JOIN cashier_cash_point cp ON cb.cash_point_id = cp.cash_point_id
       LEFT JOIN users u ON cb.creator = u.user_id
       WHERE cb.bill_id = ?`,
      [billId]
    );
    
    const bill = (billRows as any[])[0];
    if (!bill) {
      return { success: false, message: 'Bill not found' };
    }
    
    // Get bill items
    const [itemRows] = await db.execute(
      `SELECT cbli.*, 
              ci.name as item_name,
              cbs.name as service_name
       FROM cashier_bill_line_item cbli
       LEFT JOIN cashier_item ci ON cbli.item_id = ci.item_id
       LEFT JOIN cashier_billable_service cbs ON cbli.service_id = cbs.service_id
       WHERE cbli.bill_id = ? AND cbli.voided = 0
       ORDER BY cbli.line_item_order`,
      [billId]
    );
    
    // Get payments
    const [paymentRows] = await db.execute(
      `SELECT cbp.*, 
              cpm.name as payment_mode_name,
              GROUP_CONCAT(CONCAT(cpmatt.name, ': ', cbpa.value_reference) SEPARATOR '; ') as payment_attributes
       FROM cashier_bill_payment cbp
       LEFT JOIN cashier_payment_mode cpm ON cbp.payment_mode_id = cpm.payment_mode_id
       LEFT JOIN cashier_bill_payment_attribute cbpa ON cbp.bill_payment_id = cbpa.bill_payment_id
       LEFT JOIN cashier_payment_mode_attribute_type cpmatt ON cbpa.payment_mode_attribute_type_id = cpmatt.payment_mode_attribute_type_id
       WHERE cbp.bill_id = ? AND cbp.voided = 0
       GROUP BY cbp.bill_payment_id
       ORDER BY cbp.date_created`,
      [billId]
    );
    
    // Calculate totals
    const totalAmount = (itemRows as any[]).reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalPaid = (paymentRows as any[]).reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
    const balance = totalAmount - totalPaid;
    
    // Generate receipt number if not exists
    if (!bill.receipt_number) {
      const receiptNumber = await generateReceiptNumber(bill.cash_point_id);
      await db.execute(
        `UPDATE cashier_bill SET receipt_number = ?, receipt_printed = 1 WHERE bill_id = ?`,
        [receiptNumber, billId]
      );
      bill.receipt_number = receiptNumber;
    }
    
    const receipt = {
      bill,
      items: itemRows,
      payments: paymentRows,
      summary: {
        totalAmount,
        totalPaid,
        balance,
        change: (paymentRows as any[]).reduce((sum, payment) => sum + (parseFloat(payment.amount_tendered) - parseFloat(payment.amount)), 0)
      },
      generatedAt: new Date().toISOString()
    };
    
    return {
      success: true,
      receipt,
      message: 'Receipt generated successfully'
    };
  } catch (error) {
    console.error('Error generating receipt:', error);
    return {
      success: false,
      message: 'Failed to generate receipt'
    };
  }
}

/**
 * Generate sequential receipt number
 */
async function generateReceiptNumber(cashPointId: number) {
  try {
    // Get receipt number configuration
    const [configRows] = await db.execute(
      `SELECT * FROM cashier_seq_receipt_number_generator LIMIT 1`
    );
    
    const config = (configRows as any[])[0];
    
    if (!config) {
      // Fallback to simple receipt number
      return `REC-${Date.now()}`;
    }
    
    // TODO: Implement proper receipt number generation based on configuration
    // This would involve sequence tracking, check digits, etc.
    
    // For now, generate a simple receipt number
    const receiptNumber = `${config.cashier_prefix}${config.cash_point_prefix}${Date.now().toString().slice(-6)}`;
    
    return receiptNumber;
  } catch (error) {
    console.error('Error generating receipt number:', error);
    return `REC-${Date.now()}`;
  }
}

/**
 * Mark receipt as printed
 */
export async function markReceiptPrinted(billId: number) {
  try {
    await db.execute(
      `UPDATE cashier_bill SET receipt_printed = 1 WHERE bill_id = ?`,
      [billId]
    );
    
    return {
      success: true,
      message: 'Receipt marked as printed'
    };
  } catch (error) {
    console.error('Error marking receipt as printed:', error);
    return {
      success: false,
      message: 'Failed to mark receipt as printed'
    };
  }
}

/**
 * Get receipt configuration
 */
export async function getReceiptConfiguration() {
  try {
    const [rows] = await db.execute(
      `SELECT * FROM cashier_seq_receipt_number_generator LIMIT 1`
    );
    
    return (rows as any[])[0] || null;
  } catch (error) {
    console.error('Error fetching receipt configuration:', error);
    return null;
  }
}