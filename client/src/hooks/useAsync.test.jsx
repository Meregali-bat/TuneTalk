import { describe, it, expect, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useAsync } from './useAsync.js';

describe('useAsync', () => {
  it('carrega os dados e expõe loading', async () => {
    const load = vi.fn().mockResolvedValue([1, 2]);
    const { result } = renderHook(() => useAsync(load, []));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([1, 2]);
    expect(result.current.error).toBeNull();
  });

  it('expõe o erro quando a carga falha', async () => {
    const { result } = renderHook(() => useAsync(() => Promise.reject(new Error('falhou')), []));
    await waitFor(() => expect(result.current.error?.message).toBe('falhou'));
    expect(result.current.data).toBeNull();
  });

  it('reload busca de novo', async () => {
    const load = vi.fn().mockResolvedValueOnce('a').mockResolvedValueOnce('b');
    const { result } = renderHook(() => useAsync(load, []));
    await waitFor(() => expect(result.current.data).toBe('a'));

    await act(() => result.current.reload());
    expect(result.current.data).toBe('b');
  });

  it('recarrega quando as dependências mudam', async () => {
    const load = vi.fn((id) => Promise.resolve(`post-${id}`));
    const { result, rerender } = renderHook(({ id }) => useAsync(() => load(id), [id]), { initialProps: { id: 1 } });
    await waitFor(() => expect(result.current.data).toBe('post-1'));

    rerender({ id: 2 });
    await waitFor(() => expect(result.current.data).toBe('post-2'));
  });

  it('ignora respostas antigas que chegam depois de uma nova carga', async () => {
    let resolveFirst;
    const load = vi.fn()
      .mockImplementationOnce(() => new Promise((r) => { resolveFirst = r; }))
      .mockResolvedValueOnce('novo');
    const { result, rerender } = renderHook(({ id }) => useAsync(load, [id]), { initialProps: { id: 1 } });

    rerender({ id: 2 });
    await waitFor(() => expect(result.current.data).toBe('novo'));
    await act(async () => resolveFirst('velho'));
    expect(result.current.data).toBe('novo');
  });

  it('setData permite atualizar localmente', async () => {
    const { result } = renderHook(() => useAsync(() => Promise.resolve([1]), []));
    await waitFor(() => expect(result.current.data).toEqual([1]));
    act(() => result.current.setData((d) => [...d, 2]));
    expect(result.current.data).toEqual([1, 2]);
  });
});
