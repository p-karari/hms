'use server';

import { getOpenmrsDb } from '../db/openmrsDb';
import { PatientReportRow, PatientReportParams } from './types';

export async function getPatientReport(params: PatientReportParams): Promise<PatientReportRow[]> {
  const db = await getOpenmrsDb();
  const values: any[] = [];

  // Debug log to see what's coming in
  console.log("Filter params:", {
    visitTypeIds: params.visitTypeIds,
    locationIds: params.locationIds,
    visitTypeIdsLength: params.visitTypeIds?.length,
    locationIdsLength: params.locationIds?.length
  });

  // 1. Base SQL query with necessary joins for all filters
  let query = `
    SELECT
      MAX(v.date_started) AS visitDate,
      MAX(CONCAT_WS(' ', pn.prefix, pn.given_name, pn.middle_name, pn.family_name)) AS fullName,
      MAX(FLOOR(DATEDIFF(CURDATE(), p.birthdate)/365)) AS age,
      MAX(pa.address1) AS address,
      MAX(CASE WHEN pat.person_attribute_type_id = 1 THEN pat.value END) AS contact,
      MAX(vt.name) AS visitType,
      MAX(l.name) AS location,
      GROUP_CONCAT(DISTINCT ed.diagnosis_non_coded SEPARATOR ', ') AS diagnosis,
      GROUP_CONCAT(DISTINCT do.drug_non_coded SEPARATOR ', ') AS prescriptions,
      MAX(cb.receipt_number) AS billNumber,
      MAX(cbp.amount) AS billAmount,
      MAX(cpm.name) AS paymentMethod,
      MAX(p.gender) AS gender
    FROM person p
    INNER JOIN person_name pn ON pn.person_id = p.person_id
    LEFT JOIN person_address pa ON pa.person_id = p.person_id AND pa.preferred = 1
    LEFT JOIN person_attribute pat ON pat.person_id = p.person_id
    INNER JOIN visit v ON v.patient_id = p.person_id
    INNER JOIN visit_type vt ON vt.visit_type_id = v.visit_type_id
    LEFT JOIN encounter e ON e.patient_id = p.person_id AND e.visit_id = v.visit_id
    LEFT JOIN location l ON l.location_id = e.location_id
    LEFT JOIN encounter_diagnosis ed ON ed.encounter_id = e.encounter_id AND ed.dx_rank = 1
    LEFT JOIN orders o ON o.encounter_id = e.encounter_id
    LEFT JOIN drug_order do ON do.order_id = o.order_id
    LEFT JOIN cashier_bill cb ON cb.patient_id = p.person_id 
    LEFT JOIN cashier_bill_payment cbp ON cbp.bill_id = cb.bill_id
    LEFT JOIN cashier_payment_mode cpm ON cpm.payment_mode_id = cbp.payment_mode_id
    WHERE v.date_started BETWEEN ? AND ?
  `;

  // 2. Prepare mandatory date parameters
  values.push(params.startDate, params.endDate);

  // 3. Conditional Filters - USING UUIDs
  if (params.visitTypeIds?.length) {
    query += ` AND vt.uuid IN (${params.visitTypeIds.map(() => '?').join(',')})`;
    values.push(...params.visitTypeIds);
    console.log("Adding visit type filter with UUIDs:", params.visitTypeIds);
  }
  
  if (params.locationIds?.length) {
    query += ` AND l.uuid IN (${params.locationIds.map(() => '?').join(',')})`;
    values.push(...params.locationIds);
    console.log("Adding location filter with UUIDs:", params.locationIds);
  }

  // 4. Patient Demographics Filters
  if (params.gender) {
    query += ` AND p.gender = ?`;
    values.push(params.gender);
  }
  
  if (params.minAge !== undefined && params.maxAge !== undefined) {
    query += ` AND FLOOR(DATEDIFF(CURDATE(), p.birthdate)/365) BETWEEN ? AND ?`;
    values.push(params.minAge, params.maxAge);
  }
  
  if (params.fullName) {
    query += ` AND (pn.given_name LIKE ? OR pn.family_name LIKE ?)`;
    const likeName = `%${params.fullName}%`; 
    values.push(likeName, likeName);
  }

  // 5. Diagnosis/Prescription Filters
  const havingConditions: string[] = [];
  
  if (params.diagnosisQuery) {
    havingConditions.push(`diagnosis LIKE ?`);
    values.push(`%${params.diagnosisQuery}%`);
  }

  if (params.prescriptionQuery) {
    havingConditions.push(`prescriptions LIKE ?`);
    values.push(`%${params.prescriptionQuery}%`);
  }

  // 6. Payment Status/Mode Filters
  if (params.paymentMethod) {
    query += ` AND cpm.name = ?`; 
    values.push(params.paymentMethod);
  }

  if (params.minBillAmount !== undefined && params.maxBillAmount !== undefined) {
    const billCondition = `MAX(cbp.amount) BETWEEN ? AND ?`;
    values.push(params.minBillAmount, params.maxBillAmount);

    if (query.includes(' HAVING ')) {
      query += ` AND ${billCondition}`;
    } else if (havingConditions.length > 0) {
      // Will be added with HAVING clause
    } else {
      query += ` HAVING ${billCondition}`;
    }
  }

  // Add HAVING clause if needed
  if (havingConditions.length > 0) {
    query += ` HAVING ${havingConditions.join(' AND ')}`;
  }

  // 7. Final Grouping and Ordering
  query += ` GROUP BY v.visit_id ORDER BY MAX(v.date_started) DESC`;
  
  // Debug the final query
  // console.log("Final SQL query:", query);
  // console.log("Query values:", values);

  try {
    // Execute query
    const [rows] = await db.execute(query, values) as [any[], any];
    // console.log(`Found ${Array.isArray(rows) ? rows.length : 0} rows`);
    return rows as PatientReportRow[];
  } catch (error) {
    console.error("Database error:", error);
    console.error("Failed query:", query);
    console.error("Query values:", values);
    throw error;
  }
}