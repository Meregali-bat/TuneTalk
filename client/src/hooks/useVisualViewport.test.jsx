import { describe, it, expect, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useVisualViewportVars } from './useVisualViewport.js';

// visualViewport falso: a área visível encolhe quando o teclado do celular abre.
function fakeViewport({ height, offsetTop = 0 }) {
  const listeners = {};
  return {
    height,
    offsetTop,
    addEventListener: (type, fn) => { listeners[type] = fn; },
    removeEventListener: (type) => { delete listeners[type]; },
    emit(type) { listeners[type]?.(); },
    listeners,
  };
}

const root = () => document.documentElement.style;

describe('useVisualViewportVars', () => {
  afterEach(() => {
    delete window.visualViewport;
  });

  it('expõe a altura e o deslocamento da área visível como variáveis CSS', () => {
    window.visualViewport = fakeViewport({ height: 600, offsetTop: 0 });
    renderHook(() => useVisualViewportVars(true));

    expect(root().getPropertyValue('--vvh')).toBe('600px');
    expect(root().getPropertyValue('--vvt')).toBe('0px');
  });

  it('atualiza quando o teclado abre (resize) ou a página rola por baixo (scroll)', () => {
    const viewport = fakeViewport({ height: 800 });
    window.visualViewport = viewport;
    renderHook(() => useVisualViewportVars(true));

    act(() => {
      viewport.height = 420;
      viewport.offsetTop = 120;
      viewport.emit('resize');
    });
    expect(root().getPropertyValue('--vvh')).toBe('420px');

    act(() => {
      viewport.offsetTop = 200;
      viewport.emit('scroll');
    });
    expect(root().getPropertyValue('--vvt')).toBe('200px');
  });

  it('limpa ao desligar e não faz nada quando desativado', () => {
    const viewport = fakeViewport({ height: 700 });
    window.visualViewport = viewport;
    const { rerender } = renderHook(({ active }) => useVisualViewportVars(active), { initialProps: { active: true } });

    rerender({ active: false });

    expect(root().getPropertyValue('--vvh')).toBe('');
    expect(viewport.listeners).toEqual({});
  });

  it('funciona em navegadores sem visualViewport', () => {
    delete window.visualViewport;
    expect(() => renderHook(() => useVisualViewportVars(true))).not.toThrow();
  });
});
