// Leitor mínimo de arquivos gerados pelo mysqldump: CREATE TABLE (só os nomes das colunas)
// e INSERT INTO ... VALUES (...),(...); com as regras de escape do MySQL.

const ESCAPES = { 0: '\0', b: '\b', n: '\n', r: '\r', t: '\t', Z: '\x1a' };

function readColumns(sql) {
  const tables = {};
  for (const match of sql.matchAll(/CREATE TABLE `(\w+)` \(\n([\s\S]*?)\n\)/g)) {
    const columns = [...match[2].matchAll(/^\s*`(\w+)`/gm)].map((m) => m[1]);
    tables[match[1]] = { columns, rows: [] };
  }
  return tables;
}

function readString(sql, start) {
  let value = '';
  let i = start + 1;
  while (i < sql.length) {
    const char = sql[i];
    if (char === '\\') {
      const next = sql[i + 1];
      value += ESCAPES[next] ?? next;
      i += 2;
    } else if (char === "'" && sql[i + 1] === "'") {
      value += "'";
      i += 2;
    } else if (char === "'") {
      return { value, end: i + 1 };
    } else {
      value += char;
      i += 1;
    }
  }
  throw new Error('String sem fechamento no dump.');
}

function readToken(sql, start) {
  let i = start;
  while (i < sql.length && sql[i] !== ',' && sql[i] !== ')') i += 1;
  const token = sql.slice(start, i).trim();
  if (token.toUpperCase() === 'NULL') return { value: null, end: i };
  const number = Number(token);
  if (Number.isNaN(number)) throw new Error(`Valor inesperado no dump: ${token}`);
  return { value: number, end: i };
}

function readTuples(sql, start) {
  const tuples = [];
  let i = start;
  const skipSpace = () => { while (/\s/.test(sql[i])) i += 1; };

  for (;;) {
    skipSpace();
    if (sql[i] !== '(') throw new Error(`Esperava "(" na posição ${i} do dump.`);
    i += 1;
    const tuple = [];
    for (;;) {
      skipSpace();
      const read = sql[i] === "'" ? readString(sql, i) : readToken(sql, i);
      tuple.push(read.value);
      i = read.end;
      skipSpace();
      if (sql[i] === ',') { i += 1; continue; }
      if (sql[i] === ')') { i += 1; break; }
      throw new Error(`Esperava "," ou ")" na posição ${i} do dump.`);
    }
    tuples.push(tuple);
    skipSpace();
    if (sql[i] === ',') { i += 1; continue; }
    if (sql[i] === ';') return tuples;
    throw new Error(`Esperava "," ou ";" na posição ${i} do dump.`);
  }
}

export function parseDump(sql) {
  const tables = readColumns(sql);

  for (const match of sql.matchAll(/INSERT INTO `(\w+)` VALUES /g)) {
    const name = match[1];
    const table = tables[name] ?? (tables[name] = { columns: [], rows: [] });
    for (const tuple of readTuples(sql, match.index + match[0].length)) {
      if (tuple.length !== table.columns.length) {
        throw new Error(
          `Tabela "${name}": esperava ${table.columns.length} colunas, mas o INSERT tem ${tuple.length} valor(es).`,
        );
      }
      table.rows.push(Object.fromEntries(table.columns.map((column, i) => [column, tuple[i]])));
    }
  }

  return tables;
}
