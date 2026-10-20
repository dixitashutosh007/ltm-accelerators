/**
 * Backlog CSV (WS-S4): RFC 4180 quoting, UTF-8 with a byte-order mark so spreadsheet tools read accented names,
 * and a guard against formula injection: a cell that starts with =, +, -, @, tab or carriage return is prefixed with
 * an apostrophe, because the client's own text (names, notes) can reach the file.
 */
import type { Backlog } from './model';

const FORMULA = /^[=+\-@\t\r]/;

export function cell(v: string | number): string {
  let s = typeof v === 'number' ? (Number.isFinite(v) ? String(v) : '') : String(v ?? '');
  if (typeof v !== 'number' && FORMULA.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(b: Backlog): string {
  return '﻿' + [b.header, ...b.rows].map(r => r.map(cell).join(',')).join('\r\n') + '\r\n';
}
