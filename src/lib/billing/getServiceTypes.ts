// lib/billing/getServiceTypes.ts
'use server';
import { runSqlFlat } from '../db/openmrsDb';

export interface ServiceType {
  concept_id: number;
  name: string;
}

export async function getServiceTypes(): Promise<ServiceType[]> {
  const sql = `
    SELECT 
        cs.concept_id,
        cn.name
    FROM concept_set cs
    JOIN concept_name cn ON cs.concept_id = cn.concept_id
    WHERE cs.concept_set = (
        SELECT concept_id 
        FROM concept 
        WHERE uuid = '21b8cf43-9f9f-4d02-9f4a-d710ece54261'
    )
    AND cn.locale = 'en' 
    AND cn.locale_preferred = 1
    AND cn.voided = 0
    ORDER BY cs.sort_weight, cn.name;
  `;

  try {
    const rows = await runSqlFlat<ServiceType>(sql);
    console.log('Fetched service types:', rows);
    return rows;
  } catch (error) {
    console.error('Error fetching service types:', error);
    return [];
  }
}