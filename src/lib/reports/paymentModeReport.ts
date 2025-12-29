'use server';

import { getOpenmrsDb } from '../db/openmrsDb';
import { RowDataPacket } from 'mysql2/promise'; // Assuming you use mysql2/promise for type safety


export interface PaymentModeOption {
  id: number;
  name: string;
}

interface PaymentModeDbRow extends RowDataPacket {
  payment_mode_id: number;
  name: string;
  retired: number; // tinyint(1) comes back as a number (0 or 1)
}



export async function getPaymentModes(): Promise<PaymentModeOption[]> {
  const db = await getOpenmrsDb();
  
  const query = `
    SELECT 
      payment_mode_id,
      name
    FROM 
      cashier_payment_mode
    WHERE 
      retired = 0
    ORDER BY 
      name ASC;
  `;

  try {
    // Execute the query
    const [rows] = await db.execute<PaymentModeDbRow[]>(query);

    // Map the database rows to the cleaner frontend-friendly type
    const paymentModes: PaymentModeOption[] = rows.map(row => ({
      id: row.payment_mode_id,
      name: row.name,
    }));

    return paymentModes;
  } catch (error) {
    console.error("Error fetching payment modes:", error);
    throw new Error("Could not retrieve payment modes from the database.");
  }
}