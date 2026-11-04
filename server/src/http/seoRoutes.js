import { Router } from 'express';

// Páginas abertas a quem não tem conta: são as que o Google consegue ler e mostrar na busca.
const PAGINAS_PUBLICAS = ['/', '/cadastrar', '/login'];

/**
 * robots.txt e sitemap.xml para os buscadores. Os links usam o endereço oficial do site
 * (APP_URL, ou o domínio de produção da Vercel), nunca o cabeçalho Host, que pode ser forjado.
 */
export function createSeoRoutes({ appUrl }) {
  const router = Router();

  router.get('/robots.txt', (req, res) => {
    res.type('text/plain').set('Cache-Control', 'public, max-age=86400').send([
      'User-agent: *',
      'Allow: /',
      'Disallow: /api/',
      'Disallow: /redefinir-senha',
      '',
      `Sitemap: ${appUrl}/sitemap.xml`,
      '',
    ].join('\n'));
  });

  router.get('/sitemap.xml', (req, res) => {
    const urls = PAGINAS_PUBLICAS.map((caminho) => [
      '  <url>',
      `    <loc>${appUrl}${caminho === '/' ? '/' : caminho}</loc>`,
      `    <priority>${caminho === '/' ? '1.0' : '0.5'}</priority>`,
      '  </url>',
    ].join('\n'));
    res.type('application/xml').set('Cache-Control', 'public, max-age=86400').send([
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls,
      '</urlset>',
      '',
    ].join('\n'));
  });

  return router;
}
