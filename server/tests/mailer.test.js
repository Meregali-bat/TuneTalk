import { describe, it, expect, vi } from 'vitest';
import { createConsoleMailer, createResendMailer } from '../src/infra/mailer.js';

const email = { to: 'ana@x.com', subject: 'Assunto', html: '<p>oi</p>', text: 'oi' };

describe('createResendMailer', () => {
  it('envia pela API do Resend com a chave e o remetente configurados', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'e1' }) });
    const mailer = createResendMailer({ apiKey: 're_teste', from: 'TuneTalk <oi@tunetalk.app>', fetch });

    await mailer.send(email);

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer re_teste', 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body)).toEqual({ from: 'TuneTalk <oi@tunetalk.app>', ...email, to: ['ana@x.com'] });
  });

  it('lança erro com a mensagem do Resend quando ele recusa', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: false, status: 403, json: async () => ({ message: 'You can only send testing emails to your own email address' }),
    });
    const mailer = createResendMailer({ apiKey: 're_teste', from: 'x', fetch });
    await expect(mailer.send(email)).rejects.toThrow(/Resend 403: You can only send testing emails/);
  });
});

describe('createConsoleMailer', () => {
  it('sem chave do Resend (desenvolvimento), só mostra o email no terminal', async () => {
    const log = vi.fn();
    await createConsoleMailer({ log }).send(email);
    expect(log.mock.calls[0][0]).toContain('ana@x.com');
    expect(log.mock.calls[0][0]).toContain('oi');
  });
});
