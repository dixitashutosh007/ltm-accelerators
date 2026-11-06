'use strict';
/**
 * Claims due for review soon (the enduring rule behind check-claims rule 5). `check-claims` fails CI the day after a claim's
 * nextReview passes, so a review date can break unrelated pull requests without warning. This lists, from the register, every
 * claim whose review falls within the window (default 30 days) or has already passed, grouped by owner and accelerator, and
 * exits 1 when anything is already overdue. The weekly workflow (.github/workflows/claims-due-soon.yml) runs it and writes the
 * list into the run summary, so a review is scheduled before CI would fail.
 *   node scripts/claims-due-soon.cjs [--days 30] [--today YYYY-MM-DD] [--markdown]
 */
const fs = require('fs');
const path = require('path');

const REGISTER = path.resolve(__dirname, '..', 'packages/engine-core/src/claims/claims-register.json');
const isDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const dayNumber = s => Math.floor(Date.parse(`${s}T00:00:00Z`) / 86400000);

/** The claims overdue or due within `days` of `today`, soonest first. Pure, so a test can run it on a made-up register. */
function dueSoon(register, today, days = 30) {
  const t = dayNumber(today);
  return register.claims
    .filter(c => isDate(c.nextReview))
    .map(c => ({
      id: c.id, accelerators: c.accelerators || [], owner: c.owner || '', volatile: !!c.volatile, nextReview: c.nextReview,
      inDays: dayNumber(c.nextReview) - t, statement: String(c.statement || '').replace(/\s+/g, ' ').slice(0, 110), url: c.source && c.source.url || ''
    }))
    .filter(c => c.inDays <= days)
    .sort((a, b) => a.inDays - b.inDays || a.id.localeCompare(b.id));
}

function render(list, today, days, markdown) {
  if (!list.length) return `No claim is overdue or due for review within ${days} days of ${today}.\n`;
  const overdue = list.filter(c => c.inDays < 0);
  const lines = [];
  lines.push(markdown ? `### Claims due for review within ${days} days of ${today}` : `Claims due for review within ${days} days of ${today}:`);
  if (overdue.length) lines.push(markdown ? `**${overdue.length} already overdue: CI fails until they are renewed.**` : `${overdue.length} already overdue: CI fails until they are renewed.`);
  if (markdown) lines.push('', '| Claim | Accelerator | Due | In days | Volatile | Statement |', '|---|---|---|---|---|---|');
  for (const c of list) {
    const row = [c.id, c.accelerators.join(', '), c.nextReview, c.inDays, c.volatile ? 'yes' : 'no', c.statement];
    lines.push(markdown ? `| ${row.join(' | ').replace(/\|\s*$/, '')} |` : `  ${c.id}  due ${c.nextReview} (${c.inDays} days)  ${c.accelerators.join(',')}  ${c.statement}`);
  }
  return lines.join('\n') + '\n';
}

if (require.main === module) {
  const arg = (name, dflt) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : dflt; };
  const days = Number(arg('--days', 30));
  const today = arg('--today', new Date().toISOString().slice(0, 10));
  const list = dueSoon(JSON.parse(fs.readFileSync(REGISTER, 'utf8')), today, days);
  process.stdout.write(render(list, today, days, process.argv.includes('--markdown')));
  process.exit(list.some(c => c.inDays < 0) ? 1 : 0);
}

module.exports = { dueSoon, render };
