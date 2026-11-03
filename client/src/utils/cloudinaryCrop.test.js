import { describe, it, expect } from 'vitest';
import { croppedImageUrl } from './cloudinaryCrop.js';

const original = 'https://res.cloudinary.com/tunetalk/image/upload/v1700/tunetalk/posts/gato.gif';

describe('croppedImageUrl', () => {
  it('põe o corte escolhido no link do Cloudinary (GIF continua animado) e limita a largura', () => {
    expect(croppedImageUrl(original, { x: 80.4, y: 0, width: 640.2, height: 600 })).toBe(
      'https://res.cloudinary.com/tunetalk/image/upload/c_crop,x_80,y_0,w_640,h_600/c_limit,w_1600/v1700/tunetalk/posts/gato.gif',
    );
  });

  it('sem corte ("Original"), só limita a largura', () => {
    expect(croppedImageUrl(original, null)).toBe(
      'https://res.cloudinary.com/tunetalk/image/upload/c_limit,w_1600/v1700/tunetalk/posts/gato.gif',
    );
  });

  it('link que não é do Cloudinary (ex.: demo) fica como está', () => {
    expect(croppedImageUrl('data:image/gif;base64,AAAA', { x: 0, y: 0, width: 1, height: 1 })).toBe('data:image/gif;base64,AAAA');
  });
});
