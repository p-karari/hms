//payment mode related actions

'use server';

import { db } from '@/lib/db/openmrsDb';

/**
 * Get all active payment modes
 */
export async function getPaymentModes() {
  try {
    const [rows] = await db.execute(
      `SELECT * FROM cashier_payment_mode WHERE retired = 0 ORDER BY sort_order, name`
    );
    
    return rows as any[];
  } catch (error) {
    console.error('Error fetching payment modes:', error);
    return [];
  }
}

/**
 * Get payment mode by ID with attributes
 */
export async function getPaymentModeWithAttributes(paymentModeId: number) {
  try {
    const [modeRows] = await db.execute(
      `SELECT * FROM cashier_payment_mode 
       WHERE payment_mode_id = ? AND retired = 0`,
      [paymentModeId]
    );
    
    const paymentMode = (modeRows as any[])[0];
    if (!paymentMode) return null;
    
    // Get required attributes for this payment mode
    const [attributeRows] = await db.execute(
      `SELECT * FROM cashier_payment_mode_attribute_type 
       WHERE payment_mode_id = ? AND retired = 0
       ORDER BY attribute_order`,
      [paymentModeId]
    );
    
    paymentMode.attributes = attributeRows as any[];
    
    return paymentMode;
  } catch (error) {
    console.error('Error fetching payment mode with attributes:', error);
    return null;
  }
}

/**
 * Get payment mode attributes by payment mode ID
 */
export async function getPaymentModeAttributes(paymentModeId: number) {
  try {
    const [rows] = await db.execute(
      `SELECT * FROM cashier_payment_mode_attribute_type 
       WHERE payment_mode_id = ? AND retired = 0
       ORDER BY attribute_order`,
      [paymentModeId]
    );
    
    return rows as any[];
  } catch (error) {
    console.error('Error fetching payment mode attributes:', error);
    return [];
  }
}

/**
 * Process mobile money payment (M-Pesa/Daraja integration)
 * TODO: Implement actual mobile money API integration
 */
export async function processMobileMoneyPayment(
  billId: number, 
  amount: number, 
  phoneNumber: string,
  additionalData?: Record<string, string>
) {
  try {
    // Placeholder: Implement actual mobile money API call
    // This would integrate with M-Pesa Daraja API or similar
    
    console.log('Processing mobile money payment:', {
      billId,
      amount,
      phoneNumber,
      additionalData
    });
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate successful transaction
    const transactionCode = `MPESA${Date.now()}`;
    
    // Get mobile money payment mode ID
    const [modeRows] = await db.execute(
      `SELECT payment_mode_id FROM cashier_payment_mode 
       WHERE name LIKE '%mobile%' OR name LIKE '%mpesa%' AND retired = 0 LIMIT 1`
    );
    
    const paymentModeId = (modeRows as any[])[0]?.payment_mode_id;
    
    if (!paymentModeId) {
      return {
        success: false,
        message: 'Mobile money payment mode not configured'
      };
    }
    
    // Process payment using the generic payment function
    // You would import and use processPayment from payment-actions.ts
    // For now, return simulated success
    
    return {
      success: true,
      transactionCode,
      message: 'Mobile money payment initiated successfully'
    };
  } catch (error) {
    console.error('Error processing mobile money payment:', error);
    return {
      success: false,
      message: 'Failed to process mobile money payment'
    };
  }
}