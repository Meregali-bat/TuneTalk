import { describe, it, expect } from 'vitest';
import { toJavaScript } from '../../../scripts/prisma-to-js.js';

describe('prisma-to-js', () => {
  it('remove os tipos e troca imports relativos .ts por .js', () => {
    const source = [
      "import * as $Class from './internal/class.ts';",
      'import type { Foo } from "./models.ts";',
      "export * from '../enums.ts';",
      "import pg from 'pg';",
      'export const n: number = 1;',
      'export type Bar = { a: string };',
    ].join('\n');

    const js = toJavaScript(source);

    expect(js).toContain("from './internal/class.js'");
    expect(js).toContain("from '../enums.js'");
    expect(js).toContain("from 'pg'");
    expect(js).not.toMatch(/\.ts['"]/);
    expect(js).not.toContain(': number');
    expect(js).toMatch(/export const n\s*=\s*1;/);
  });
});
