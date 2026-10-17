import mysql from 'mysql2/promise';

export function createPool(dbConfig) {
  return mysql.createPool({
    ...dbConfig,
    charset: 'utf8mb4',
    namedPlaceholders: true,
    connectionLimit: 10,
  });
}

// Fachada mínima usada pelos repositórios: query(sql, params) → linhas.
export function createDatabase(pool) {
  return {
    async query(sql, params = {}) {
      const [rows] = await pool.execute(sql, params);
      return rows;
    },
  };
}
