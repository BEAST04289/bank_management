const mysql = require('mysql2/promise');
require('dotenv').config();

let poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'BankDB',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true
};

let pool = mysql.createPool(poolConfig);

/**
 * Reconfigure the MySQL pool at runtime (e.g., from the UI gear icon modal).
 */
const reconfigurePool = async (newConfig) => {
  if (pool) {
    await pool.end().catch(() => {});
  }
  poolConfig = { ...poolConfig, ...newConfig };
  pool = mysql.createPool(poolConfig);
  const conn = await pool.getConnection();
  await conn.ping();
  conn.release();
  return true;
};

/**
 * Execute a SQL query and return both the result rows and a sqlMeta telemetry object.
 * Every API response uses this so the Live SQL Inspector drawer can display the query.
 */
const executeWithAudit = async (sql, params = [], labTag = 'SQL Query') => {
  const start = process.hrtime.bigint();
  const [rows] = await pool.execute(sql, params);
  const end = process.hrtime.bigint();
  const durationMs = Number(end - start) / 1e6;

  // Build the formatted SQL string with parameters interpolated for display
  let formattedSql = sql;
  if (params.length > 0) {
    let i = 0;
    formattedSql = sql.replace(/\?/g, () => {
      const val = params[i++];
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'string') return `'${val}'`;
      return String(val);
    });
  }

  return {
    rows,
    sqlMeta: {
      executedSql: formattedSql,
      labTag,
      durationMs: Number(durationMs.toFixed(2)),
      rowCount: Array.isArray(rows) ? rows.length : (rows.affectedRows || 0),
      timestamp: new Date().toLocaleTimeString()
    }
  };
};

/**
 * Execute a raw query (for multi-statement or CALL queries that don't work with execute).
 */
const queryWithAudit = async (sql, params = [], labTag = 'SQL Query') => {
  const start = process.hrtime.bigint();
  const [rows] = await pool.query(sql, params);
  const end = process.hrtime.bigint();
  const durationMs = Number(end - start) / 1e6;

  let formattedSql = sql;
  if (params.length > 0) {
    let i = 0;
    formattedSql = sql.replace(/\?/g, () => {
      const val = params[i++];
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'string') return `'${val}'`;
      return String(val);
    });
  }

  return {
    rows,
    sqlMeta: {
      executedSql: formattedSql,
      labTag,
      durationMs: Number(durationMs.toFixed(2)),
      rowCount: Array.isArray(rows) ? rows.length : 0,
      timestamp: new Date().toLocaleTimeString()
    }
  };
};

module.exports = {
  getPool: () => pool,
  reconfigurePool,
  executeWithAudit,
  queryWithAudit,
  getConfig: () => ({ ...poolConfig, password: poolConfig.password ? '***' : '' })
};
