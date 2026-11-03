// Gera um script SQL com os dados convertidos (saída de transformLegacyData), para colar no
// SQL Editor do Neon quando não dá para rodar o importador com acesso direto ao banco.
// Faz o mesmo que load.js: mantém os ids, ajusta as sequências e recusa banco com usuários.

const TABLES = [
  ['usuarios', 'usuarios', {
    id: 'id', nome: 'nome', email: 'email', senha: 'senha', fotoPerfil: 'foto_perfil', bio: 'bio', admin: 'admin', veterano: 'veterano',
  }],
  ['posts', 'posts', POST_COLUMNS()],
  ['respostas', 'posts', POST_COLUMNS()],
  ['curtidas', 'curtidas', { postId: 'post_id', usuarioId: 'usuario_id' }],
  ['seguimentos', 'seguimentos', { seguidorId: 'seguidor_id', seguidoId: 'seguido_id' }],
  ['notificacoes', 'notificacoes', {
    id: 'id', tipo: 'tipo', conteudo: 'conteudo', lida: 'lida', createdAt: 'created_at',
    destinatarioId: 'destinatario_id', autorId: 'autor_id', postId: 'post_id',
  }],
];

function POST_COLUMNS() {
  return {
    id: 'id', autorId: 'autor_id', parentId: 'parent_id', texto: 'texto', musicName: 'music_name',
    artistName: 'artist_name', posterMusica: 'poster_musica', albumName: 'album_name', posterAlbum: 'poster_album',
    postType: 'post_type', releaseDate: 'release_date', nota: 'nota', musicPreview: 'music_preview', createdAt: 'created_at',
  };
}

const SERIAL_TABLES = ['usuarios', 'posts', 'notificacoes'];

export function sqlValue(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') return String(value);
  if (value instanceof Date) return `'${value.toISOString()}'`;
  // Postgres padrão (standard_conforming_strings): só a aspa simples precisa ser dobrada.
  return `'${String(value).replace(/'/g, "''")}'`;
}

function inserts(table, columns, rows) {
  if (rows.length === 0) return '';
  const fields = Object.keys(columns);
  const header = `INSERT INTO "${table}" (${fields.map((f) => `"${columns[f]}"`).join(', ')}) VALUES\n`;
  const values = rows.map((row) => `  (${fields.map((f) => sqlValue(row[f])).join(', ')})`).join(',\n');
  return `${header}${values};\n\n`;
}

export function toSql(data) {
  let sql = 'BEGIN;\n\n'
    + "DO $$ BEGIN\n  IF EXISTS (SELECT 1 FROM \"usuarios\") THEN\n"
    + "    RAISE EXCEPTION 'O banco de destino não está vazio. Rode a importação num banco recém-criado.';\n"
    + '  END IF;\nEND $$;\n\n';

  for (const [key, table, columns] of TABLES) sql += inserts(table, columns, data[key] ?? []);

  for (const table of SERIAL_TABLES) {
    sql += `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM "${table}";\n`;
  }
  return `${sql}\nCOMMIT;\n`;
}
