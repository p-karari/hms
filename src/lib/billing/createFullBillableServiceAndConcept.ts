'use server';

import { runSql } from '../db/openmrsDb';
import { v4 as uuidv4 } from 'uuid';
import { CashierItem } from './services/billingServices';

export async function createFullBillableServiceAndConcept(
  serviceName: string,
  departmentId: number,
  initialPrice: number,
  creatorId: number,
  shortName: string,
  itemDescription: string | null = null,
  serviceTypeId: number | null = null,
  paymentModeId: number | null = null,
  priceName: string = 'Default Price'
): Promise<CashierItem> {
  const dateCreated = new Date();
  
  // 1. CREATE NEW OPENMRS CONCEPT
  const conceptUuid = uuidv4();
  const conceptSql = `
    INSERT INTO concept
    (datatype_id, class_id, is_set, creator, date_created, retired, uuid)
    VALUES (?, ?, 0, ?, ?, 0, ?);
  `;
  const conceptResult = await runSql<{ insertId: number }>(conceptSql, [
    4, // N/A datatype
    11, // Test class
    creatorId,
    dateCreated,
    conceptUuid,
  ]);
  const newConceptId = (conceptResult as any).insertId;

  // 1b. CREATE CONCEPT NAME
  const conceptNameUuid = uuidv4();
  const conceptNameSql = `
    INSERT INTO concept_name
    (concept_id, name, locale, locale_preferred, creator, date_created, voided, uuid)
    VALUES (?, ?, 'en', 1, ?, ?, 0, ?);
  `;
  await runSql(conceptNameSql, [
    newConceptId,
    serviceName,
    creatorId,
    dateCreated,
    conceptNameUuid,
  ]);

  // 1c. CREATE SHORT NAME CONCEPT NAME
  if (shortName && shortName !== serviceName) {
    const shortNameUuid = uuidv4();
    const shortNameSql = `
      INSERT INTO concept_name
      (concept_id, name, locale, locale_preferred, creator, date_created, voided, uuid, concept_name_type)
      VALUES (?, ?, 'en', 0, ?, ?, 0, ?, 'SHORT');
    `;
    await runSql(shortNameSql, [
      newConceptId,
      shortName,
      creatorId,
      dateCreated,
      shortNameUuid,
    ]);
  }

  // 2. CREATE BILLABLE SERVICE
  const serviceUuid = uuidv4();
  const serviceSql = `
    INSERT INTO cashier_billable_service
    (name, short_name, service_type, service_status, creator, date_created, voided, uuid, concept_id)
    VALUES (?, ?, ?, 'ENABLED', ?, ?, 0, ?, ?);
  `;
  const serviceResult = await runSql<{ insertId: number }>(serviceSql, [
    serviceName,
    shortName,
    serviceTypeId,
    creatorId,
    dateCreated,
    serviceUuid,
    newConceptId,
  ]);
  const newServiceId = (serviceResult as any).insertId;

  // 3. CREATE BILLABLE ITEM
  const itemUuid = uuidv4();
  const itemSql = `
    INSERT INTO cashier_item
    (name, description, department_id, creator, date_created, retired, uuid)
    VALUES (?, ?, ?, ?, ?, 0, ?);
  `;
  const itemResult = await runSql<{ insertId: number }>(itemSql, [
    serviceName,
    itemDescription,
    departmentId,
    creatorId,
    dateCreated,
    itemUuid,
  ]);
  const newItemId = (itemResult as any).insertId;

  // 4. CREATE ITEM PRICE - SET item_id TO NULL, link only to service
  const priceUuid = uuidv4();
  const priceSql = `
    INSERT INTO cashier_item_price
    (item_id, service_id, price, payment_mode, name, creator, date_created, voided, uuid)
    VALUES (NULL, ?, ?, ?, ?, ?, ?, 0, ?);
  `;
  await runSql(priceSql, [
    newServiceId,
    initialPrice,
    paymentModeId,
    priceName,
    creatorId,
    dateCreated,
    priceUuid,
  ]);

  return {
    item_id: newItemId,
    name: serviceName,
    description: itemDescription || '',
    department_id: departmentId,
    default_price_id: null,
    uuid: itemUuid,
  };
}