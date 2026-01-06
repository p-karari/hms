// /lib/db/openmrsDb.ts
import mysql from 'mysql2/promise';
import { PoolConnection } from 'mysql2/promise'; // Import Connection type

let pool: mysql.Pool | null = null;

export function getOpenmrsDb() {
  if (!pool) {
    pool = mysql.createPool({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '@password',
      database: 'dev-server',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  return pool;
}

/**
 * Helper function to run SQL queries with parameters.
 * NOTE: This relies on the 'db' object and should only be used for SELECT/UPDATE/INSERT/DELETE.
 */
export async function runSql<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const db_pool = getOpenmrsDb();
  // We cannot use db.execute here because of circular dependency/issue with transaction statements
  // Instead, we use the pool directly or rely on the logic within db.execute if it's correct.
  // Given your existing code structure, we rely on the internal logic of the 'db' object.
  const [rows] = await db.execute(sql, params);
  return rows as T[];
}

export async function runSqlFlat<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const db_pool = getOpenmrsDb();
  const result = await db_pool.execute(sql, params);

  // Normalize to a flat array of objects.
  const rows = Array.isArray(result)
    ? Array.isArray(result[0])
      ? result[0]
      : result
    : result;

  return rows as T[];
}


// Interface to match the expected db.execute pattern
export interface DBResult {
  insertId?: number;
  affectedRows?: number;
  changedRows?: number;
}

// Global Connection Reference for Transaction Management (Crucial Fix)
// This will hold the single connection used throughout the transaction.
let transactionConnection: PoolConnection | null = null;

// Main db object with execute method
export const db = {
  /**
   * Execute SQL query with parameters.
   * Uses the transaction connection if available, otherwise gets a connection from the pool.
   */
async execute(sql: string, params: any[] = []): Promise<[any[], any]> {
  const connection = transactionConnection || await getOpenmrsDb().getConnection();
  const releaseConnection = transactionConnection === null;

  try {
    const isSelect = sql.trim().toUpperCase().startsWith('SELECT');
    const isTransactionCommand = sql.trim().toUpperCase().startsWith('START TRANSACTION') || 
                                sql.trim().toUpperCase().startsWith('COMMIT') || 
                                sql.trim().toUpperCase().startsWith('ROLLBACK');

    if (isTransactionCommand) {
      // Use query() for transaction commands
      await connection.query(sql);
      return [[{}], []];
    }

    if (isSelect) {
      const [rows] = await connection.execute(sql, params);
      return [rows as any[], []];
    }
    
    // For DML (INSERT/UPDATE/DELETE)
    const [result] = await connection.execute(sql, params);
    
    const insertId = (result as any).insertId;
    const affectedRows = (result as any).affectedRows;

    return [[{
      insertId: insertId,
      affectedRows: affectedRows
    }], []];

  } finally {
    if (releaseConnection) {
      connection.release();
    }
  }
},
  /**
   * Start a transaction (FIXED: Uses query() for simple commands)
   */
  async beginTransaction(): Promise<void> {
    if (transactionConnection) {
      throw new Error('Transaction already in progress.');
    }
    
    // Get a dedicated connection from the pool
    const connection = await getOpenmrsDb().getConnection();
    
    try {
      // CRITICAL FIX: Use connection.query() for transaction control commands
      await connection.query('START TRANSACTION');
      transactionConnection = connection; // Store the connection for transaction use
    } catch (error) {
      connection.release(); // Release on failure to start
      throw error;
    }
  },

  /**
   * Commit a transaction (FIXED: Uses query() for simple commands)
   */
  async commit(): Promise<void> {
    if (!transactionConnection) {
      throw new Error('No transaction to commit.');
    }
    try {
      // CRITICAL FIX: Use connection.query() for transaction control commands
      await transactionConnection.query('COMMIT');
    } finally {
      transactionConnection.release(); // Release the dedicated connection
      transactionConnection = null;
    }
  },

  /**
   * Rollback a transaction (FIXED: Uses query() for simple commands)
   */
  async rollback(): Promise<void> {
    if (!transactionConnection) return;
    try {
      // CRITICAL FIX: Use connection.query() for transaction control commands
      await transactionConnection.query('ROLLBACK');
    } finally {
      transactionConnection.release(); // Release the dedicated connection
      transactionConnection = null;
    }
  }
};

/**
 * Helper function for transactions (Remains correct)
 */
export async function withTransaction<T>(
  callback: () => Promise<T>
): Promise<T> {
  try {
    // This calls the FIXED db.beginTransaction()
    await db.beginTransaction();
    const result = await callback();
    // This calls the FIXED db.commit()
    await db.commit();
    return result;
  } catch (error) {
    // This calls the FIXED db.rollback()
    await db.rollback();
    throw error;
  }
}

/**
 * Additional helper functions that might be useful
 */
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return runSqlFlat<T>(sql, params);
}

export async function execute(sql: string, params: any[] = []): Promise<any> {
  return runSql(sql, params);
}