import { describe, it, expect } from 'vitest';
import { croppedImageUrl, originalImageUrl } from './cloudinaryCrop.js';

const original = 'https://res.cloudinary.com/tunetalk/image/upload/v1700/tunetalk/posts/gato.gif';

describe('croppedImageUrl', () => {
  it('põe o corte escolhido no link do Cloudinary (GIF continua animado) e limita a largura', () => {
    expect(croppedImageUrl(original, { x: 80.4, y: 0, width: 640.2, height: 600 })).toBe(
      'https://res.cloudinary.com/tunetalk/image/upload/c_crop,x_80,y_0,w_640,h_600/c_limit,w_1600/v1700/tunetalk/posts/gato.gif',
    );
  });

  it('foto sem corte ("Original"), só limita a largura', () => {
    expect(croppedImageUrl(original.replace('.gif', '.jpg'), null)).toBe(
      'https://res.cloudinary.com/tunetalk/image/upload/c_limit,w_1600/v1700/tunetalk/posts/gato.jpg',
    );
  });

  it('GIF sem corte vai como foi enviado (o Cloudinary grátis recusa processar GIF grande)', () => {
    expect(croppedImageUrl(original, null)).toBe(original);
  });

  it('link que não é do Cloudinary (ex.: demo) fica como está', () => {
    expect(croppedImageUrl('data:image/gif;base64,AAAA', { x: 0, y: 0, width: 1, height: 1 })).toBe('data:image/gif;base64,AAAA');
  });
});

describe('originalImageUrl (reserva quando a versão transformada falha)', () => {
  it('tira as transformações e mantém a versão e o arquivo', () => {
    expect(originalImageUrl('https://res.cloudinary.com/dorm41uma/image/upload/c_limit,w_1600/v1793841683/tunetalk/posts/ednqw69yootbscqgj8ic.gif'))
      .toBe('https://res.cloudinary.com/dorm41uma/image/upload/v1793841683/tunetalk/posts/ednqw69yootbscqgj8ic.gif');
    expect(originalImageUrl('https://res.cloudinary.com/t/image/upload/c_crop,x_80,y_0,w_640,h_600/c_limit,w_1600/v1700/tunetalk/posts/gato.gif'))
      .toBe('https://res.cloudinary.com/t/image/upload/v1700/tunetalk/posts/gato.gif');
  });

  it('sem transformação, ou fora do Cloudinary, não tem reserva', () => {
    expect(originalImageUrl(original)).toBeNull();
    expect(originalImageUrl('data:image/gif;base64,AAAA')).toBeNull();
    expect(originalImageUrl(null)).toBeNull();
  });
});
