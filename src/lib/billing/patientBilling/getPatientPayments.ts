'use server';

import { db } from '@/lib/db/openmrsDb';

/**
 * Get all payments for a patient by patient UUID
 */
export async function getPatientPayments(patientUuid: string) {
  try {
    // First get numeric patient_id from UUID
    const [patientRows] = await db.execute(
      `SELECT p.patient_id 
       FROM patient p
       JOIN person per ON p.patient_id = per.person_id
       WHERE per.uuid = ? AND p.voided = 0 AND per.voided = 0`,
      [patientUuid]
    );
    
    const patientRow = (patientRows as any[])[0];
    if (!patientRow) {
      return [];
    }
    
    const patientId = patientRow.patient_id;
    
    // Get all payments for this patient
    const [rows] = await db.execute(
      `SELECT 
          cbp.bill_payment_id,
          cbp.amount,
          cbp.amount_tendered,
          cbp.date_created,
          cbp.bill_id,
          cpm.name as payment_mode_name,
          u.username as creator_username,
          cb.receipt_number
       FROM cashier_bill_payment cbp
       JOIN cashier_bill cb ON cbp.bill_id = cb.bill_id
       LEFT JOIN cashier_payment_mode cpm ON cbp.payment_mode_id = cpm.payment_mode_id
       LEFT JOIN users u ON cbp.creator = u.user_id
       WHERE cb.patient_id = ? 
         AND cbp.voided = 0 
         AND cb.voided = 0
       ORDER BY cbp.date_created DESC`,
      [patientId]
    );
    
    return rows as any[];
  } catch (error) {
    console.error('Error fetching patient payments:', error);
    return [];
  }
}

/**
 * Get payment summary for a patient
 */
export async function getPatientPaymentSummary(patientUuid: string) {
  try {
    // First get numeric patient_id from UUID
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
        totalPaid: 0,
        totalBills: 0,
        paymentCount: 0,
        paymentMethods: []
      };
    }
    
    const patientId = patientRow.patient_id;
    
    // Get payment summary
    const [summaryRows] = await db.execute(
      `SELECT 
          COUNT(DISTINCT cb.bill_id) as total_bills,
          COUNT(cbp.bill_payment_id) as payment_count,
          SUM(cbp.amount) as total_paid,
          GROUP_CONCAT(DISTINCT cpm.name) as payment_methods
       FROM cashier_bill cb
       LEFT JOIN cashier_bill_payment cbp ON cb.bill_id = cbp.bill_id AND cbp.voided = 0
       LEFT JOIN cashier_payment_mode cpm ON cbp.payment_mode_id = cpm.payment_mode_id
       WHERE cb.patient_id = ? AND cb.voided = 0`,
      [patientId]
    );
    
    const summary = (summaryRows as any[])[0] || {};
    
    return {
      totalPaid: Number(summary.total_paid) || 0,
      totalBills: Number(summary.total_bills) || 0,
      paymentCount: Number(summary.payment_count) || 0,
      paymentMethods: summary.payment_methods ? summary.payment_methods.split(',') : []
    };
  } catch (error) {
    console.error('Error fetching payment summary:', error);
    return {
      totalPaid: 0,
      totalBills: 0,
      paymentCount: 0,
      paymentMethods: []
    };
  }
}