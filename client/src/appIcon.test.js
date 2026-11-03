import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const client = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(client, file), 'utf8');
const pngSize = (file) => {
  const buffer = fs.readFileSync(path.join(client, 'public', file));
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
};

describe('ícone de app (tela inicial do celular)', () => {
  it('o index.html declara o ícone do iPhone (PNG 180x180) e o manifesto', () => {
    const html = read('index.html');
    expect(html).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png" />');
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest" />');
    expect(html).toContain('<meta name="apple-mobile-web-app-title" content="TuneTalk" />');
    expect(pngSize('apple-touch-icon.png')).toEqual([180, 180]);
  });

  it('o manifesto tem nome, abre em tela cheia e aponta para ícones que existem no tamanho certo', () => {
    const manifest = JSON.parse(read('public/manifest.webmanifest'));
    expect(manifest).toMatchObject({ name: 'TuneTalk', short_name: 'TuneTalk', display: 'standalone' });
    for (const icon of manifest.icons) {
      const [w, h] = icon.sizes.split('x').map(Number);
      expect(pngSize(icon.src.replace(/^\//, ''))).toEqual([w, h]);
    }
  });
});
