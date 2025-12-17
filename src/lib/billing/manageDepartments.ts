// lib/billing/manageDepartments.ts
'use server';
import { runSql, runSqlFlat } from '../db/openmrsDb';
import { v4 as uuidv4 } from 'uuid';
import { CashierDepartment } from './services/billingServices';

// GET - Get all departments
export async function getAllDepartments(): Promise<CashierDepartment[]> {
  const sql = `
    SELECT department_id, name, description, uuid 
    FROM cashier_department 
    WHERE retired = 0
    ORDER BY name;
  `;

  const departmentRows = await runSqlFlat<CashierDepartment>(sql);
  return departmentRows;
}

// GET - Get single department by ID
export async function getDepartmentById(departmentId: number): Promise<CashierDepartment | null> {
  const sql = `
    SELECT department_id, name, description, uuid 
    FROM cashier_department 
    WHERE department_id = ? AND retired = 0;
  `;

  const rows = await runSqlFlat<CashierDepartment>(sql, [departmentId]);
  return rows[0] || null;
}

// GET - Get department by UUID
export async function getDepartmentByUuid(departmentUuid: string): Promise<CashierDepartment | null> {
  const sql = `
    SELECT department_id, name, description, uuid 
    FROM cashier_department 
    WHERE uuid = ? AND retired = 0;
  `;

  const rows = await runSqlFlat<CashierDepartment>(sql, [departmentUuid]);
  return rows[0] || null;
}

// CREATE - Create a new department
export async function createDepartment(
  name: string, 
  description: string | null, 
  creatorId: number
): Promise<number> {
  const uuid = uuidv4();
  const sql = `
    INSERT INTO cashier_department 
    (name, description, creator, date_created, retired, uuid)
    VALUES (?, ?, ?, NOW(), 0, ?);
  `;
  
  const [result] = await runSql<{ insertId: number }>(sql, [
    name, 
    description, 
    creatorId, 
    uuid
  ]);
  
  return result.insertId;
}

// EDIT - Update an existing department
export interface EditDepartmentData {
  department_id: number;
  name?: string;
  description?: string | null;
  changed_by: number;
}

export async function editDepartment(data: EditDepartmentData): Promise<boolean> {
  const dateChanged = new Date();
  
  // Build dynamic update query
  const updates: string[] = [];
  const params: any[] = [];
  
  if (data.name !== undefined) {
    updates.push('name = ?');
    params.push(data.name);
  }
  
  if (data.description !== undefined) {
    updates.push('description = ?');
    params.push(data.description);
  }
  
  // Always update changed_by and date_changed
  updates.push('changed_by = ?', 'date_changed = ?');
  params.push(data.changed_by, dateChanged);
  
  if (updates.length === 0) {
    return false; // Nothing to update
  }
  
  const sql = `
    UPDATE cashier_department
    SET ${updates.join(', ')}
    WHERE department_id = ? AND retired = 0;
  `;
  
  params.push(data.department_id);
  
  try {
    const result = await runSql(sql, params);
    return (result as any).affectedRows > 0;
  } catch (error) {
    console.error('Error editing department:', error);
    throw error;
  }
}

// DELETE - Soft delete (retire) a department
export interface DeleteDepartmentData {
  department_id: number;
  retired_by: number;
  retire_reason?: string;
}

export async function deleteDepartment(data: DeleteDepartmentData): Promise<boolean> {
  const dateRetired = new Date();
  
  const sql = `
    UPDATE cashier_department
    SET retired = 1, 
        retired_by = ?, 
        date_retired = ?, 
        retire_reason = ?
    WHERE department_id = ? AND retired = 0;
  `;
  
  try {
    const result = await runSql(sql, [
      data.retired_by,
      dateRetired,
      data.retire_reason || '',
      data.department_id
    ]);
    return (result as any).affectedRows > 0;
  } catch (error) {
    console.error('Error deleting department:', error);
    throw error;
  }
}

// BULK DELETE - Delete multiple departments at once
export async function bulkDeleteDepartments(
  departmentIds: number[],
  retiredBy: number,
  retireReason?: string
): Promise<boolean> {
  if (departmentIds.length === 0) return true;
  
  const dateRetired = new Date();
  const placeholders = departmentIds.map(() => '?').join(',');
  
  const sql = `
    UPDATE cashier_department
    SET retired = 1, 
        retired_by = ?, 
        date_retired = ?, 
        retire_reason = ?
    WHERE department_id IN (${placeholders}) AND retired = 0;
  `;
  
  try {
    const result = await runSql(sql, [
      retiredBy, 
      dateRetired, 
      retireReason || '', 
      ...departmentIds
    ]);
    return (result as any).affectedRows > 0;
  } catch (error) {
    console.error('Error in bulk delete departments:', error);
    throw error;
  }
}

// VALIDATION - Check if department exists and is not retired
export async function validateDepartment(departmentId: number): Promise<boolean> {
  const sql = `
    SELECT COUNT(*) as count
    FROM cashier_department
    WHERE department_id = ? AND retired = 0;
  `;
  
  const rows = await runSqlFlat<{ count: number }>(sql, [departmentId]);
  return rows[0]?.count > 0;
}

// VALIDATION - Check if department has active items
export async function checkDepartmentHasItems(departmentId: number): Promise<boolean> {
  const sql = `
    SELECT COUNT(*) as count
    FROM cashier_item
    WHERE department_id = ? AND retired = 0;
  `;
  
  const rows = await runSqlFlat<{ count: number }>(sql, [departmentId]);
  return rows[0]?.count > 0;
}

// VALIDATION - Check if department has active services
export async function checkDepartmentHasServices(departmentId: number): Promise<boolean> {
  const sql = `
    SELECT COUNT(*) as count
    FROM cashier_item ci
    JOIN cashier_billable_service cbs ON ci.concept_id = cbs.concept_id
    WHERE ci.department_id = ? AND ci.retired = 0 AND cbs.voided = 0;
  `;
  
  const rows = await runSqlFlat<{ count: number }>(sql, [departmentId]);
  return rows[0]?.count > 0;
}

// SEARCH - Search departments by name
export async function searchDepartments(searchTerm: string): Promise<CashierDepartment[]> {
  const sql = `
    SELECT department_id, name, description, uuid 
    FROM cashier_department 
    WHERE retired = 0 
    AND (name LIKE ? OR description LIKE ?)
    ORDER BY name;
  `;
  
  const searchPattern = `%${searchTerm}%`;
  const rows = await runSqlFlat<CashierDepartment>(sql, [searchPattern, searchPattern]);
  return rows;
}

// CHECK UNIQUE - Check if department name is unique (excluding retired)
export async function isDepartmentNameUnique(name: string, excludeDepartmentId?: number): Promise<boolean> {
  let sql = `
    SELECT COUNT(*) as count
    FROM cashier_department
    WHERE name = ? AND retired = 0
  `;
  
  const params: any[] = [name];
  
  if (excludeDepartmentId !== undefined) {
    sql += ` AND department_id != ?`;
    params.push(excludeDepartmentId);
  }
  
  const rows = await runSqlFlat<{ count: number }>(sql, params);
  return rows[0]?.count === 0;
}