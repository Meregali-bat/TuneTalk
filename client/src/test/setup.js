import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// O jsdom não implementa rolagem nem mídia; os testes que precisam observam com vi.spyOn.
window.scrollTo = () => {};
window.HTMLMediaElement.prototype.pause = () => {};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
