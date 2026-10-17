import { describe, it, expect } from 'vitest';
import { parseDump } from '../../src/migration/mysqlDump.js';

const dump = `
DROP TABLE IF EXISTS \`usuario\`;
CREATE TABLE \`usuario\` (
  \`idusuario\` int(11) NOT NULL AUTO_INCREMENT,
  \`nome\` varchar(45) NOT NULL,
  \`bio\` varchar(255) DEFAULT NULL,
  \`admin\` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (\`idusuario\`)
) ENGINE=InnoDB;

CREATE TABLE \`post\` (
  \`idpost\` int(11) NOT NULL AUTO_INCREMENT,
  \`texto\` varchar(5000) NOT NULL,
  \`nota\` float NOT NULL,
  \`data\` datetime NOT NULL,
  PRIMARY KEY (\`idpost\`)
);

LOCK TABLES \`usuario\` WRITE;
INSERT INTO \`usuario\` VALUES (1,'Ana','diz \\'oi\\', \\"tchau\\"',1),(2,'Bia',NULL,NULL),(3,'Caio','linha1\\r\\nlinha2; com ponto e vírgula',0);
UNLOCK TABLES;
INSERT INTO \`post\` VALUES (10,'(texto com parênteses), vírgulas',4.5,'2023-12-01 15:30:00'),(11,'',-1,'2024-01-02 00:00:00');
`;

describe('parseDump', () => {
  it('lê colunas do CREATE TABLE e linhas dos INSERTs', () => {
    const tables = parseDump(dump);
    expect(Object.keys(tables).sort()).toEqual(['post', 'usuario']);
    expect(tables.usuario.columns).toEqual(['idusuario', 'nome', 'bio', 'admin']);
    expect(tables.usuario.rows).toHaveLength(3);
  });

  it('converte números, NULL e strings com escapes do MySQL', () => {
    const { usuario, post } = parseDump(dump);
    expect(usuario.rows[0]).toEqual({ idusuario: 1, nome: 'Ana', bio: 'diz \'oi\', "tchau"', admin: 1 });
    expect(usuario.rows[1]).toEqual({ idusuario: 2, nome: 'Bia', bio: null, admin: null });
    expect(usuario.rows[2].bio).toBe('linha1\r\nlinha2; com ponto e vírgula');
    expect(post.rows).toEqual([
      { idpost: 10, texto: '(texto com parênteses), vírgulas', nota: 4.5, data: '2023-12-01 15:30:00' },
      { idpost: 11, texto: '', nota: -1, data: '2024-01-02 00:00:00' },
    ]);
  });

  it('tabela sem INSERT fica com lista vazia', () => {
    const tables = parseDump('CREATE TABLE `vazia` (\n  `id` int NOT NULL\n);');
    expect(tables.vazia).toEqual({ columns: ['id'], rows: [] });
  });

  it('falha com mensagem clara se um INSERT não bate com as colunas', () => {
    const bad = 'CREATE TABLE `t` (\n  `a` int,\n  `b` int\n);\nINSERT INTO `t` VALUES (1);';
    expect(() => parseDump(bad)).toThrow(/t.*2 colunas.*1 valor/);
  });
});
