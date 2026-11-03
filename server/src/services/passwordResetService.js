import { badRequest } from '../errors.js';
import { PASSWORD_RULES_MESSAGE, isPasswordValid } from '../../../shared/passwordRules.js';

const VALIDADE_MIN = 60;
const MAX_PEDIDOS_POR_HORA = 3;
const LINK_INVALIDO = 'Este link é inválido ou já expirou. Peça um novo.';

// Web Crypto (globalThis.crypto) existe no Node e no navegador; a demo roda este mesmo serviço.
const toHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
const sha256 = async (text) =>
  toHex(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))));
const randomHex = () => toHex(globalThis.crypto.getRandomValues(new Uint8Array(32)));
const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);

function resetEmail({ nome, link }) {
  const saudacao = nome ? `Oi, ${nome}!` : 'Oi!';
  const text = `${saudacao}\n\nRecebemos um pedido para redefinir a sua senha do TuneTalk. `
    + `Abra o link abaixo para criar uma senha nova (ele vale por 1 hora e só funciona uma vez):\n\n${link}\n\n`
    + 'Se não foi você, é só ignorar este email: sua senha continua a mesma.';
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#111">
  <h2 style="color:#2ba84a">TuneTalk</h2>
  <p>${escapeHtml(saudacao)}</p>
  <p>Recebemos um pedido para redefinir a sua senha. O botão abaixo vale por 1 hora e só funciona uma vez.</p>
  <p><a href="${link}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#2ba84a;color:#000;text-decoration:none;font-weight:bold">Criar senha nova</a></p>
  <p style="font-size:13px;color:#555">Se o botão não abrir, copie este endereço no navegador:<br>${link}</p>
  <p style="font-size:13px;color:#555">Se não foi você, é só ignorar este email: sua senha continua a mesma.</p>
</div>`;
  return { subject: 'Redefinir sua senha do TuneTalk', text, html };
}

export function createPasswordResetService({
  users,
  resets,
  passwords,
  mailer,
  sessions,
  appUrl,
  now = () => new Date(),
  randomToken = randomHex,
  log = console.error,
}) {
  return {
    // Responde igual exista a conta ou não, para a tela não servir de consulta de emails cadastrados.
    async request(email) {
      const clean = (email ?? '').trim();
      if (!clean) return;
      const user = await users.findAuthByEmail(clean);
      if (!user) return;

      const agora = now();
      const umaHoraAtras = new Date(agora.getTime() - 60 * 60_000);
      if ((await resets.countSince(user.id, umaHoraAtras)) >= MAX_PEDIDOS_POR_HORA) return;

      const token = randomToken();
      await resets.create({
        usuarioId: user.id,
        tokenHash: await sha256(token),
        expiraEm: new Date(agora.getTime() + VALIDADE_MIN * 60_000),
      });

      // O código vai depois do "#": o navegador não manda essa parte para outros sites (Referer).
      const link = `${appUrl}/redefinir-senha#token=${token}`;
      try {
        await mailer.send({ to: user.email, ...resetEmail({ nome: user.nome, link }) });
      } catch (error) {
        log(`Falha ao enviar email de redefinição de senha: ${error.message}`);
      }
    },

    async reset(token, novaSenha) {
      if (!token) throw badRequest(LINK_INVALIDO);
      if (!isPasswordValid(novaSenha)) throw badRequest(PASSWORD_RULES_MESSAGE);

      const agora = now();
      const pedido = await resets.findValid(await sha256(token), agora);
      if (!pedido || !(await resets.claim(pedido.id, agora))) throw badRequest(LINK_INVALIDO);

      await users.updatePassword(pedido.usuarioId, await passwords.hash(novaSenha));
      await resets.deleteForUser(pedido.usuarioId);
      await sessions.destroyAll(pedido.usuarioId);
    },
  };
}
