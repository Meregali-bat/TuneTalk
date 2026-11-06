import { HttpError } from '../errors.js';

/**
 * Limite de requisições por janela fixa: cada chave (ex.: "login-ip:1.2.3.4") conta quantas vezes
 * bateu até a janela expirar. Passou do máximo, responde 429 até a janela virar.
 *
 * Na Vercel cada requisição pode cair numa instância diferente, então em produção os contadores
 * ficam no Postgres. A versão em memória serve para desenvolvimento e testes.
 */

// Store: incrementar(chave, janelaSeg) -> { contagem, expiraEm (ms) }
export function createMemoryStore({ now = Date.now } = {}) {
  const contadores = new Map();
  return {
    async incrementar(chave, janelaSeg) {
      const agora = now();
      const atual = contadores.get(chave);
      if (!atual || atual.expiraEm <= agora) {
        const novo = { contagem: 1, expiraEm: agora + janelaSeg * 1000 };
        contadores.set(chave, novo);
        return { ...novo };
      }
      atual.contagem += 1;
      return { ...atual };
    },
  };
}

// Um único comando atômico: cria a chave, soma 1 ou recomeça a janela se ela já expirou.
const INCREMENTAR_SQL = `
  INSERT INTO limites_requisicao (chave, contagem, expira_em)
  VALUES ($1, 1, now() + make_interval(secs => $2))
  ON CONFLICT (chave) DO UPDATE SET
    contagem = CASE WHEN limites_requisicao.expira_em <= now() THEN 1 ELSE limites_requisicao.contagem + 1 END,
    expira_em = CASE WHEN limites_requisicao.expira_em <= now() THEN EXCLUDED.expira_em ELSE limites_requisicao.expira_em END
  RETURNING contagem, expira_em`;

// Para a tabela não crescer sem fim: de vez em quando, uma requisição apaga as janelas vencidas.
const CHANCE_LIMPEZA = 0.01;

export function createPostgresStore(pool, { random = Math.random } = {}) {
  return {
    async incrementar(chave, janelaSeg) {
      const { rows } = await pool.query(INCREMENTAR_SQL, [chave, janelaSeg]);
      if (random() < CHANCE_LIMPEZA) {
        pool.query('DELETE FROM limites_requisicao WHERE expira_em < now()').catch(() => {});
      }
      return { contagem: rows[0].contagem, expiraEm: new Date(rows[0].expira_em).getTime() };
    },
  };
}

const MENSAGEM = 'Muitas tentativas em pouco tempo. Espere um pouco e tente de novo.';
const TAMANHO_MAX_CHAVE = 255;

export function createLimitador({ store, now = Date.now, log = console.error }) {
  // Se o banco dos contadores falhar, a requisição passa: melhor sem limite por um instante
  // do que o app inteiro fora do ar por causa dele.
  const contar = async (chave, janelaSeg) => {
    try {
      return await store.incrementar(chave.slice(0, TAMANHO_MAX_CHAVE), janelaSeg);
    } catch (err) {
      log(`Limite de requisições indisponível: ${err?.message}`);
      return null;
    }
  };

  return {
    /**
     * Middleware. chave(req) devolve o identificador (ip, id do usuário...) ou null para não limitar.
     */
    middleware(nome, { max, janelaSeg, chave }) {
      return async (req, res, next) => {
        const id = chave(req);
        if (id == null || id === '') return next();
        const resultado = await contar(`${nome}:${id}`, janelaSeg);
        if (resultado && resultado.contagem > max) {
          const segundos = Math.max(1, Math.ceil((resultado.expiraEm - now()) / 1000));
          res.set('Retry-After', String(segundos));
          return next(new HttpError(429, MENSAGEM));
        }
        next();
      };
    },

    // true só na primeira vez que a chave aparece dentro da janela (ex.: avisar uma vez só).
    async primeiraVez(chave, janelaSeg) {
      const resultado = await contar(chave, janelaSeg);
      return !resultado || resultado.contagem === 1;
    },
  };
}
