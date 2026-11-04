import { describe, it, expect, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { AvisoSemInternet } from './AvisoSemInternet.jsx';

const ficar = (onLine) => {
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => onLine });
  act(() => { window.dispatchEvent(new Event(onLine ? 'online' : 'offline')); });
};

describe('AvisoSemInternet', () => {
  afterEach(() => { Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true }); });

  it('aparece quando a conexão cai e some quando volta', () => {
    render(<AvisoSemInternet />);
    expect(screen.queryByRole('status')).toBeNull();

    ficar(false);
    expect(screen.getByRole('status')).toHaveTextContent('Você está sem internet');

    ficar(true);
    expect(screen.queryByRole('status')).toBeNull();
  });
});
