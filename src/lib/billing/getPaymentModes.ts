// lib/billing/getPaymentModes.ts
'use server';
import { runSqlFlat } from '../db/openmrsDb';

export interface PaymentMode {
  payment_mode_id: number;
  name: string;
  description?: string;
  sort_order?: number;
}

export async function getPaymentModes(): Promise<PaymentMode[]> {
  const sql = `
    SELECT 
        payment_mode_id,
        name,
        description,
        sort_order
    FROM cashier_payment_mode
    WHERE retired = 0
    ORDER BY sort_order, name;
  `;

  try {
    const rows = await runSqlFlat<PaymentMode>(sql);
    console.log('Fetched payment modes:', rows);
    return rows;
  } catch (error) {
    console.error('Error fetching payment modes:', error);
    return [];
  }
}