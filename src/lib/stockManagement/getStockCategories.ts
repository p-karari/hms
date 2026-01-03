'use server';

import { db } from '@/lib/db/openmrsDb';

export interface Category {
  uuid: string;
  name: string;
  display?: string;
  description?: string;
}

export async function getStockCategories(): Promise<{
  success: boolean;
  data?: Category[];
  message: string;
}> {
  try {
    const sql = `
      SELECT DISTINCT
        c.uuid,
        cn.name AS concept_name,
        cd.description
      FROM concept c
      INNER JOIN concept_name cn
        ON c.concept_id = cn.concept_id
        AND cn.concept_name_type = 'FULLY_SPECIFIED'
        AND cn.voided = 0
      LEFT JOIN concept_description cd
        ON c.concept_id = cd.concept_id
        AND cd.voided = 0
      WHERE c.retired = 0
        AND c.concept_id IN (
          SELECT DISTINCT category_id
          FROM stockmgmt_stock_item
          WHERE category_id IS NOT NULL
        )
      ORDER BY cn.name ASC
    `;

    const [rows]: any[] = await db.execute(sql);

    const categories: Category[] = rows.map((row: { uuid: any; concept_name: any; description: any; }) => ({
      uuid: row.uuid,
      name: row.concept_name,
      display: row.concept_name,
      description: row.description
    }));

    return {
      success: true,
      data: categories,
      message: `Found ${categories.length} categor(ies)`
    };
  } catch (error) {
    console.error('Error fetching categories:', error);
    return {
      success: false,
      message: error instanceof Error
        ? error.message
        : 'Failed to fetch categories'
    };
  }
}
