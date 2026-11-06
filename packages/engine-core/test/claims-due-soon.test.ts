/**
 * The due-soon list (scripts/claims-due-soon.cjs, run weekly by .github/workflows/claims-due-soon.yml): overdue and soon-due
 * claims are listed soonest first, later ones are left out, and the real register has nothing overdue today.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const { dueSoon, render } = require('../../../scripts/claims-due-soon.cjs');
const claim = (id: string, nextReview: string | undefined, extra: object = {}) => ({ id, accelerators: ['x-iq'], owner: 'lead', nextReview, statement: `Statement ${id}`, ...extra });

describe('claims due soon', () => {
  const register = { claims: [claim('A', '2026-11-01'), claim('B', '2026-11-20'), claim('C', '2026-12-30'), claim('D', '2027-06-01'), claim('E', undefined), claim('F', '2026-11-06', { volatile: true })] };

  it('lists overdue and due-within-window claims, soonest first, and leaves out later ones and those with no date', () => {
    expect(dueSoon(register, '2026-11-06', 30).map((c: any) => c.id)).toEqual(['A', 'F', 'B']);
    expect(dueSoon(register, '2026-11-06', 60).map((c: any) => c.id)).toEqual(['A', 'F', 'B', 'C']);
  });

  it('counts days from today, negative when overdue, and keeps the volatile flag', () => {
    const list = dueSoon(register, '2026-11-06', 30);
    expect(list.map((c: any) => c.inDays)).toEqual([-5, 0, 14]);
    expect(list.find((c: any) => c.id === 'F').volatile).toBe(true);
  });

  it('says so when nothing is due, and warns when something is already overdue', () => {
    expect(render([], '2026-11-06', 30, false)).toContain('No claim is overdue or due for review within 30 days');
    const text = render(dueSoon(register, '2026-11-06', 30), '2026-11-06', 30, true);
    expect(text).toContain('1 already overdue');
    expect(text).toContain('| A |');
  });

  it('the real register has no overdue claim today (the same rule as check-claims)', () => {
    const real = JSON.parse(readFileSync(join(__dirname, '../src/claims/claims-register.json'), 'utf8'));
    const today = new Date().toISOString().slice(0, 10);
    expect(dueSoon(real, today, 0).filter((c: any) => c.inDays < 0)).toEqual([]);
  });
});
