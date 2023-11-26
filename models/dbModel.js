/* eslint-disable require-jsdoc */
const mysql = require('mysql2/promise');

async function connect() {
  try {
    const connection = await mysql.createConnection({
      host: 'mysql30-farm10.kinghost.net',
      user: 'tunetalk',
      database: 'tunetalk',
      password: 'meregali2',
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
