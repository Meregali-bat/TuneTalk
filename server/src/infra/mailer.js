// Envio de email pela API HTTP do Resend (sem SDK). Sem RESEND_API_KEY, o email só aparece
// no terminal, para dar para testar o "esqueci minha senha" em desenvolvimento.

export function createResendMailer({ apiKey, from, fetch = globalThis.fetch }) {
  return {
    async send({ to, subject, html, text }) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [to], subject, html, text }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(`Resend ${res.status}: ${body.message ?? 'erro desconhecido'}`);
      }
    },
  };
}

export function createConsoleMailer({ log = console.log } = {}) {
  return {
    async send({ to, subject, text }) {
      log(`[email] para ${to} — ${subject}\n${text}`);
    },
  };
}
