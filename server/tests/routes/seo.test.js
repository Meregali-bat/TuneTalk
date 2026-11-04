import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { buildTestApp } from '../helpers/buildTestApp.js';

describe('robots.txt e sitemap.xml', () => {
  const { app } = buildTestApp({ appUrl: 'https://tunetalk.app' });

  it('robots.txt libera o site, esconde a API e aponta o sitemap', async () => {
    const res = await request(app).get('/robots.txt').expect(200);
    expect(res.type).toBe('text/plain');
    expect(res.text).toContain('Allow: /');
    expect(res.text).toContain('Disallow: /api/');
    expect(res.text).toContain('Sitemap: https://tunetalk.app/sitemap.xml');
  });

  it('sitemap.xml lista as páginas públicas com o endereço oficial', async () => {
    const res = await request(app).get('/sitemap.xml').set('Host', 'site-falso.com').expect(200);
    expect(res.type).toBe('application/xml');
    expect(res.text).toContain('<loc>https://tunetalk.app/</loc>');
    expect(res.text).toContain('<loc>https://tunetalk.app/cadastrar</loc>');
    expect(res.text).not.toContain('site-falso.com');
  });
});
