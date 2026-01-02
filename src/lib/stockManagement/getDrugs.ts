'use server';

import { db } from '@/lib/db/openmrsDb';

export interface Drug {
  uuid: string;
  name: string;
  display?: string;
  strength?: string;
  dosageForm?: string;
  concept?: { uuid: string };
  route?: string;
  manufacturer?: string;
}

export async function getDrugs(
  searchTerm: string = '',
  limit: number = 10
): Promise<{
  success: boolean;
  data?: Drug[];
  message: string;
}> {
  try {
    let sql = `
      SELECT 
        d.uuid,
        d.name,
        cn.name as concept_name,
        d.strength,
        d.dosage_form,
        d.route,
        d.manufacturer,
        c.uuid as concept_uuid
      FROM drug d
      LEFT JOIN concept c ON d.concept_id = c.concept_id
      LEFT JOIN concept_name cn ON d.concept_id = cn.concept_id 
        AND cn.concept_name_type = 'FULLY_SPECIFIED' 
        AND cn.voided = 0
      WHERE d.retired = 0 AND d.voided = 0
    `;

    const params: any[] = [];

    if (searchTerm) {
      sql += ` AND (
        d.name LIKE ? 
        OR cn.name LIKE ?
        OR d.manufacturer LIKE ?
        OR d.dosage_form LIKE ?
      )`;
      const searchParam = `%${searchTerm}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }

    sql += ` ORDER BY d.name ASC LIMIT ?`;
    params.push(limit);

    const [rows] = await db.execute(sql, params);

    const drugs: Drug[] = rows.map((row: any) => ({
      uuid: row.uuid,
      name: row.name,
      display: row.concept_name || row.name,
      strength: row.strength,
      dosageForm: row.dosage_form,
      route: row.route,
      manufacturer: row.manufacturer,
      concept: row.concept_uuid ? { uuid: row.concept_uuid } : undefined
    }));

    return {
      success: true,
      data: drugs,
      message: `Found ${drugs.length} drug(s)`
    };

  } catch (error) {
    console.error('Error fetching drugs:', error);
    return {
      success: false,
      message: error instanceof Error
        ? error.message
        : 'Failed to fetch drugs'
    };
  }
}