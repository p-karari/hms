//Cash point operations

'use server';

import { db } from '@/lib/db/openmrsDb';

/**
 * Get all active cash points
 */
export async function getCashPoints() {
  try {
    const [rows] = await db.execute(
      `SELECT * FROM cashier_cash_point WHERE retired = 0 ORDER BY name`
    );
    
    return rows as any[];
  } catch (error) {
    console.error('Error fetching cash points:', error);
    return [];
  }
}

/**
 * Get cash point by ID
 */
export async function getCashPointById(cashPointId: number) {
  try {
    const [rows] = await db.execute(
      `SELECT * FROM cashier_cash_point WHERE cash_point_id = ? AND retired = 0`,
      [cashPointId]
    );
    
    return (rows as any[])[0] || null;
  } catch (error) {
    console.error('Error fetching cash point:', error);
    return null;
  }
}

/**
 * Get current cash point from session/context
 * TODO: Implement session-based cash point retrieval
 */
export async function getCurrentCashPoint() {
  try {
    // Placeholder: This should come from user session/context
    const currentCashPointId = 1; // TODO: Implement session-based cash point ID retrieval
    
    if (!currentCashPointId) {
      return null;
    }
    
    return await getCashPointById(currentCashPointId);
  } catch (error) {
    console.error('Error fetching current cash point:', error);
    return null;
  }
}