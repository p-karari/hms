'use server';
import { db, DBResult, runSqlFlat } from '@/lib/db/openmrsDb';
import { v4 as uuidv4 } from 'uuid'; // Assuming you have uuid installed: npm install uuid @types/uuid

/**
 * Interface for the mandatory fields of a Location.
 * location_id and date_created are handled by the database or the action, 
 * but we include location_id for READ/UPDATE/DELETE.
 */
export interface Location {
  location_id?: number;
  name: string;
  creator: number;
  // Non-mandatory fields included for convenience but can be null/undefined on creation
  description?: string | null;
  parent_location?: number | null;
  // Mandatory fields handled by the action on creation:
  // date_created: Date; 
  // retired: 0 | 1;
  // uuid: string;
}

// --- CREATE ---

/**
 * Creates a new location in the OpenMRS database.
 * @param locationData The mandatory data for the new location (name, creator).
 * @returns The location_id of the newly created location.
 */
export async function createLocation(locationData: Omit<Location, 'location_id'>): Promise<number> {
  const { name, creator, description = null, parent_location = null } = locationData;
  const newUuid = uuidv4();
  const retired = 0; // Mandatory field, default to not retired
  
  // NOTE: date_created is also mandatory, but we set it to NOW() in the query.

  const sql = `
    INSERT INTO location 
      (name, description, creator, date_created, retired, parent_location, uuid)
    VALUES (?, ?, ?, NOW(), ?, ?, ?)
  `;
  
  const params = [
    name, 
    description, 
    creator, 
    retired, 
    parent_location, 
    newUuid
  ];

  try {
    const result = await db.execute(sql, params);
    const insertId = (result[0][0] as DBResult).insertId;

    if (!insertId) {
        throw new Error("Failed to retrieve insertId after creating location.");
    }
    
    return insertId;
  } catch (error) {
    console.error("Error creating location:", error);
    throw new Error(`Database error during location creation: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// --- READ ---

/**
 * Retrieves a single location by its location_id.
 * @param location_id The ID of the location to retrieve.
 * @returns The Location object or null if not found.
 */
export async function getLocationById(location_id: number): Promise<Location | null> {
  const sql = `
    SELECT location_id, name, description, creator, parent_location 
    FROM location 
    WHERE location_id = ? AND retired = 0
  `; // Filter by retired = 0 to get active locations
  
  const params = [location_id];

  try {
    const rows = await runSqlFlat<Location>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("Error fetching location by ID:", error);
    throw new Error(`Database error during location read: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Retrieves all active locations.
 * @returns An array of Location objects.
 */
export async function getAllLocations(): Promise<Location[]> {
  const sql = `
    SELECT location_id, name, description, creator, parent_location 
    FROM location 
    WHERE retired = 0 
    ORDER BY name
  `;
  
  try {
    const rows = await runSqlFlat<Location>(sql);
    return rows;
  } catch (error) {
    console.error("Error fetching all locations:", error);
    throw new Error(`Database error during all locations read: ${error instanceof Error ? error.message : String(error)}`);
  }
}


// --- UPDATE ---

/**
 * Updates an existing location's non-identifying fields.
 * Includes name (mandatory), description, and parent_location. 
 * Also updates changed_by and date_changed (both non-mandatory but good practice).
 * @param locationData The location data to update (must include location_id, name, and changed_by).
 * @returns true if the update was successful, false otherwise.
 */
export async function updateLocation(locationData: Location & { changed_by: number }): Promise<boolean> {
  const { location_id, name, description = null, parent_location = null, changed_by } = locationData;
  
  if (!location_id) {
    throw new Error("Location ID is required for update.");
  }
  
  // Only update fields that can change
  const sql = `
    UPDATE location 
    SET 
      name = ?, 
      description = ?, 
      parent_location = ?,
      changed_by = ?,
      date_changed = NOW()
    WHERE location_id = ? AND retired = 0
  `;
  
  const params = [
    name, 
    description, 
    parent_location,
    changed_by,
    location_id
  ];

  try {
    const result = await db.execute(sql, params);
    const affectedRows = (result[0][0] as DBResult).affectedRows;
    return (affectedRows ?? 0) > 0;
  } catch (error) {
    console.error("Error updating location:", error);
    throw new Error(`Database error during location update: ${error instanceof Error ? error.message : String(error)}`);
  }
}


// --- DELETE (Retire) ---

/**
 * Retires (soft delete) a location.
 * In OpenMRS, locations are typically retired, not hard deleted.
 * @param location_id The ID of the location to retire.
 * @param retired_by The ID of the user retiring the location.
 * @param retire_reason Optional reason for retiring the location.
 * @returns true if the location was successfully retired, false otherwise.
 */
export async function retireLocation(
    location_id: number, 
    retired_by: number, 
    retire_reason: string = 'No reason provided'
): Promise<boolean> {
  
  // Mandatory fields for retiring: retired=1, retired_by, date_retired, retire_reason
  const sql = `
    UPDATE location 
    SET 
      retired = 1, 
      retired_by = ?, 
      date_retired = NOW(), 
      retire_reason = ? 
    WHERE location_id = ?
  `;
  
  const params = [
    retired_by, 
    retire_reason, 
    location_id
  ];

  try {
    const result = await db.execute(sql, params);
    const affectedRows = (result[0][0] as DBResult).affectedRows;
    return (affectedRows ?? 0) > 0;
  } catch (error) {
    console.error("Error retiring location:", error);
    throw new Error(`Database error during location retirement: ${error instanceof Error ? error.message : String(error)}`);
  }
}