/* eslint-disable require-jsdoc */
const mysql = require('mysql2/promise');

async function connect() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      database: process.env.DB_NAME,
      password: process.env.DB_PASS,
      charset: 'utf8mb4',
    });
    return connection;
  } catch (error) {
    console.error('Erro: ', error);
    throw error;
  }
}
async function query(sql) {
  const connection = await connect();
  try {
    const [rows, fields] = await connection.execute(sql);
    return rows;
  } catch (error) {
    console.error('Erro:', error);
    throw error;
  } finally {
    if (connection) {
      connection.end();
    }
  }
}



module.exports = {
  query,
};
