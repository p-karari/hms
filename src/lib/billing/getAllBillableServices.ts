'use server';
import { runSqlFlat } from "../db/openmrsDb";

export async function getAllBillableServices(): Promise<
  Array<{
    service_id: number;
    service_name: string;
    short_name: string;
    service_type: string;
    service_status: 'ENABLED' | 'DISABLED';
    prices: string;
  }>
> {
  const sql = `
    SELECT
        cbs.service_id,
        cbs.name,
        cbs.short_name,
        cbs.service_type,
        cbs.service_status,
        cbs.concept_id,
        cbs.uuid,
        -- Get service type name from concept_name
        COALESCE(
            MAX(CASE 
                WHEN cn.locale = 'en' AND cn.locale_preferred = 1 
                THEN cn.name 
            END),
            'No type specified'
        ) AS service_type_name,
        -- Get actual prices with payment mode names
        COALESCE(
            GROUP_CONCAT(
                DISTINCT CONCAT(
                    COALESCE(cpm.name, 'Default'), 
                    ' (', 
                    cip.price, 
                    ')'
                ) 
                ORDER BY cpm.name
                SEPARATOR ', '
            ),
            'No prices'
        ) AS prices
    FROM cashier_billable_service cbs
    -- Join for service type name (from concept)
    LEFT JOIN concept_name cn ON cbs.service_type = cn.concept_id 
        AND cn.voided = 0
    -- Join for prices
    LEFT JOIN cashier_item_price cip ON cbs.service_id = cip.service_id 
        AND cip.voided = 0
    -- Join for payment mode names
    LEFT JOIN cashier_payment_mode cpm ON cip.payment_mode = cpm.payment_mode_id 
        AND cpm.retired = 0
    WHERE cbs.voided = 0
    GROUP BY cbs.service_id
    ORDER BY cbs.name;
  `;

  const rows = await runSqlFlat<{
    service_id: number;
    name: string;
    short_name: string | null;
    service_type: number | null;
    service_status: string | null;
    concept_id: number | null;
    uuid: string;
    service_type_name: string;
    prices: string;
  }>(sql);
  
  return rows.map(row => {
    let status: 'ENABLED' | 'DISABLED' = 'ENABLED';
    if (row.service_status) {
      const statusLower = row.service_status.toLowerCase();
      if (statusLower === 'disabled' || statusLower === '0' || statusLower === 'false') {
        status = 'DISABLED';
      } else if (statusLower === 'enabled' || statusLower === '1' || statusLower === 'true') {
        status = 'ENABLED';
      }
    }

    return {
      service_id: row.service_id,
      service_name: row.name,
      short_name: row.short_name || '',
      service_type: row.service_type_name,
      service_status: status,
      prices: row.prices
    };
  });
}