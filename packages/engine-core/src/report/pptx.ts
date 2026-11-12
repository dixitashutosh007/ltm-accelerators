/**
 * Slide rendering of the shared report model (product-grade plan B3): a ReportDocument becomes a 16:9 deck in the LTM slide
 * master (docs/BRAND.md). A title slide in LTM black with the ribbon, then one slide per section, its blocks stacked from the
 * top; a section that does not fit continues on a second slide. Everything is native and editable: text, tables and shapes,
 * no pictures of charts. It is a pure rendering, like pdf.ts, so the deck shows the same traced figures as the PDF and is
 * checked by the same report checks before it is issued.
 *
 * Arial throughout: it is installed with PowerPoint and Keynote, so the deck lays out the same in both.
 */
import PptxGenJS from 'pptxgenjs';
import type { Block, ReportDocument, ReportSection, Seg, Tone } from './model';
import { LTM_BLACK, LTM_CORAL, LTM_LOGO_PNG, LTM_RIBBON_JPEG } from './brand';

const INK = '141414', MUTED = '4B5563', CORAL = LTM_CORAL.slice(1), BLACK = LTM_BLACK.slice(1), LINE = 'D1D5DB', FILL = 'F3F4F6', BLUE_BG = 'EEF7FA', AMBER_BG = 'FDF6EB';
const FONT = 'Arial';
const W = 13.333, H = 7.5, X = 0.55, CW = W - 2 * X, TOP = 1.45, BOTTOM = 6.85;
const TONE: Record<Tone, string> = { good: '3C8D5A', partial: 'C99A2E', weak: 'D9822B', bad: 'C0392B', unknown: '9CA3AF' };

type Run = { text: string; options?: Record<string, unknown> };
const runs = (segs: Seg[], extra: Record<string, unknown> = {}): Run[] =>
  segs.map(s => (typeof s === 'string' ? { text: s, options: { ...extra } } : { text: s.text, options: { ...extra, bold: s.strong || extra.bold || undefined, italic: s.italic || undefined } }));
const plain = (segs: Seg[]) => segs.map(s => (typeof s === 'string' ? s : s.text)).join('');

/** Lines a text takes at a font size in a width, from an average Arial character width of half the point size. */
function lines(text: string, pt: number, width: number): number {
  const perLine = Math.max(8, Math.floor((width * 72) / (pt * 0.5)));
  return text.split('\n').reduce((n, l) => n + Math.max(1, Math.ceil(l.length / perLine)), 0);
}
const lineH = (pt: number) => (pt * 1.25) / 72;

/** Column widths in inches from the model's widths (PDF points over a 495-point body, or '*' to share the rest). */
function columns(widths: Array<number | '*' | 'auto'> | undefined, n: number, total: number): number[] {
  const w = widths ?? Array(n).fill('*');
  const fixed = w.reduce<number>((t, x) => t + (typeof x === 'number' ? x : 0), 0);
  const stars = w.filter(x => x !== undefined && typeof x !== 'number').length;
  const scale = total / 495;
  const rest = Math.max(0.6 * stars, total - fixed * scale);
  const out = w.map(x => (typeof x === 'number' ? x * scale : rest / Math.max(1, stars)));
  const sum = out.reduce((t, x) => t + x, 0);
  return out.map(x => (x * total) / sum);
}

interface Placed { height: number; draw: (s: PptxGenJS.Slide, y: number) => void }

/** Each block as a height and a drawing function, so the section can be laid out and split across slides. */
function place(b: Block): Placed | null {
  switch (b.kind) {
    case 'paragraph': {
      const pt = b.style === 'lead' ? 18 : b.style === 'small' || b.style === 'note' ? 12 : b.style === 'fine' ? 9 : 14;
      const h = lines(plain(b.segs), pt, CW) * lineH(pt) + 0.12;
      return { height: h, draw: (s, y) => s.addText(runs(b.segs) as any, { x: X, y, w: CW, h, fontFace: FONT, fontSize: pt, color: b.style === 'note' || b.style === 'fine' ? MUTED : INK, valign: 'top', margin: 0, paraSpaceAfter: 2 }) };
    }
    case 'subheading':
      return { height: 0.45, draw: (s, y) => s.addText(b.text, { x: X, y, w: CW, h: 0.4, fontFace: FONT, fontSize: 16, bold: true, color: INK, margin: 0, valign: 'top' }) };
    case 'list': {
      const pt = b.small ? 12 : 14;
      const h = b.items.reduce((t, i) => t + lines(plain(i), pt, CW - 0.3) * lineH(pt), 0) + 0.15;
      return { height: h, draw: (s, y) => s.addText(b.items.flatMap((i, k) => runs(i).map((r, n) => ({ text: r.text, options: { ...r.options, ...(n === 0 ? { bullet: true } : {}), breakLine: n === i.length - 1 && k < b.items.length - 1 } }))) as any, { x: X, y, w: CW, h, fontFace: FONT, fontSize: pt, color: INK, valign: 'top', margin: 0 }) };
    }
    case 'callout': {
      const pt = 13, inner = CW - 0.4;
      const h = (b.title ? 0.35 : 0) + lines(plain(b.segs), pt, inner) * lineH(pt) + 0.3;
      return { height: h + 0.1, draw: (s, y) => {
        s.addShape('rect', { x: X, y, w: CW, h, fill: { color: b.tone === 'warn' ? AMBER_BG : BLUE_BG }, line: { color: b.tone === 'warn' ? AMBER_BG : BLUE_BG } });
        s.addText([...(b.title ? [{ text: b.title, options: { bold: true, breakLine: true } }] : []), ...runs(b.segs)] as any, { x: X + 0.2, y: y + 0.12, w: inner, h: h - 0.24, fontFace: FONT, fontSize: pt, color: INK, valign: 'top', margin: 0 });
      } };
    }
    case 'kpis': {
      const n = b.items.length, gap = 0.15, bw = (CW - gap * (n - 1)) / n;
      const vpt = n > 4 ? 22 : 26;
      const tallest = Math.max(...b.items.map(i => lines(plain(i.value), vpt, bw - 0.3)));
      const h = 0.45 + tallest * lineH(vpt) + 0.55;
      return { height: h + 0.15, draw: (s, y) => b.items.forEach((i, k) => {
        const x = X + k * (bw + gap);
        s.addShape('rect', { x, y, w: bw, h, fill: { color: 'FFFFFF' }, line: { color: LINE, width: 1 } });
        s.addShape('rect', { x, y, w: bw, h: 0.06, fill: { color: CORAL }, line: { color: CORAL } });
        s.addText(i.label.toUpperCase(), { x: x + 0.15, y: y + 0.15, w: bw - 0.3, h: 0.3, fontFace: FONT, fontSize: 10, bold: true, color: MUTED, margin: 0 });
        s.addText(runs(i.value) as any, { x: x + 0.15, y: y + 0.45, w: bw - 0.3, h: tallest * lineH(vpt), fontFace: FONT, fontSize: vpt, bold: true, color: INK, margin: 0, valign: 'top' });
        if (i.note) s.addText(runs(i.note) as any, { x: x + 0.15, y: y + h - 0.5, w: bw - 0.3, h: 0.4, fontFace: FONT, fontSize: 10, color: MUTED, margin: 0, valign: 'top' });
      }) };
    }
    case 'table': {
      const pt = b.rows.length > 6 ? 10 : 11;
      const cw = columns(b.widths, b.head.length, CW);
      const rowH = (cells: string[]) => Math.max(...cells.map((t, k) => lines(t, pt, cw[k] - 0.15))) * lineH(pt) + 0.12;
      const head = rowH(b.head), body = b.rows.map(r => rowH(r.map(plain)));
      const h = head + body.reduce((t, x) => t + x, 0);
      const cell = (segs: Seg[], first: boolean) => ({ text: runs(segs) as any, options: { fontFace: FONT, fontSize: pt, color: INK, valign: 'top', bold: first ? undefined : undefined } });
      return { height: h + 0.15, draw: (s, y) => s.addTable([
        b.head.map(t => ({ text: t, options: { bold: true, color: MUTED, fill: { color: FILL }, fontFace: FONT, fontSize: pt } })),
        ...b.rows.map(r => r.map((c, k) => cell(c, k === 0)))
      ] as any, { x: X, y, w: CW, colW: cw, border: { type: 'solid', pt: 0.5, color: LINE }, margin: 0.06, rowH: [head, ...body], autoPage: false }) };
    }
    case 'ranges': {
      const rowH = 0.42, labelW = 4.6, barW = 5.2, valueX = X + labelW + barW + 0.3;
      const top = Math.max(1, ...b.items.map(i => (i.high ? i.high.trace.value : i.low.trace.value * 1.25)));
      const at = (v: number) => (barW * Math.max(0, Math.min(v, top))) / top;
      return { height: rowH * b.items.length + 0.15, draw: (s, y) => b.items.forEach((i, k) => {
        const ry = y + k * rowH, bx = X + labelW, color = i.total ? INK : CORAL;
        if (i.total) s.addShape('line', { x: X, y: ry - 0.04, w: CW, h: 0, line: { color: LINE, width: 0.75 } });
        s.addText(i.label, { x: X, y: ry, w: labelW - 0.1, h: rowH, fontFace: FONT, fontSize: 12, bold: i.total || undefined, color: INK, margin: 0, valign: 'middle' });
        s.addShape('line', { x: bx, y: ry + rowH / 2, w: barW, h: 0, line: { color: LINE, width: 0.75 } });
        const x0 = Math.min(at(i.low.trace.value), barW - 0.05), x1 = i.high ? Math.max(at(i.high.trace.value), x0 + 0.05) : barW;
        s.addShape('roundRect', { x: bx + x0, y: ry + 0.11, w: x1 - x0, h: 0.2, fill: { color }, line: { color }, rectRadius: 0.05 });
        if (!i.high) s.addShape('rightArrow', { x: bx + barW - 0.15, y: ry + 0.08, w: 0.2, h: 0.26, fill: { color }, line: { color } });
        s.addText(runs(i.shown) as any, { x: valueX, y: ry, w: X + CW - valueX, h: rowH, fontFace: FONT, fontSize: 12, bold: i.total || undefined, color: INK, margin: 0, valign: 'middle' });
      }) };
    }
    case 'matrix': {
      const mw = 6.4, mh = 4.3, L = 0.55, M = 0.32;
      const ymax = Math.max(1e-9, ...b.points.map(p => p.y.trace.value)) * 1.15;
      const px = (v: number) => L + ((mw - L - 0.1) * Math.max(0, Math.min(v, b.x.max))) / b.x.max;
      const py = (v: number) => mh - 0.35 - ((mh - 0.7) * Math.max(0, v)) / ymax;
      const placed: Array<{ x: number; y: number; label: string }> = [];
      for (const p of [...b.points].sort((a, c) => c.y.trace.value - a.y.trace.value)) {
        const x = px(p.x); let y = py(p.y.trace.value);
        while (placed.some(q => Math.abs(q.x - x) < M && Math.abs(q.y - y) < M)) y += M;
        placed.push({ x, y: Math.min(y, mh - 0.35 - M / 2), label: p.label });
      }
      return { height: mh + 0.2, draw: (s, y) => {
        const ox = X, oy = y, plotW = mw - L - 0.1, plotH = mh - 0.7, midX = ox + L + plotW / 2, midY = oy + 0.35 + plotH / 2;
        s.addShape('rect', { x: ox + L, y: oy + 0.35, w: plotW / 2, h: plotH / 2, fill: { color: BLUE_BG }, line: { color: BLUE_BG } });
        s.addShape('rect', { x: ox + L, y: oy + 0.35, w: plotW, h: plotH, fill: { type: 'none' } as any, line: { color: LINE, width: 0.75 } });
        s.addShape('line', { x: midX, y: oy + 0.35, w: 0, h: plotH, line: { color: LINE, width: 0.75, dashType: 'dash' } });
        s.addShape('line', { x: ox + L, y: midY, w: plotW, h: 0, line: { color: LINE, width: 0.75, dashType: 'dash' } });
        if (b.quadrant) s.addText(b.quadrant, { x: ox + L + 0.08, y: oy + 0.4, w: 2.5, h: 0.25, fontFace: FONT, fontSize: 10, color: MUTED, margin: 0 });
        s.addText(b.y.high, { x: ox, y: oy + 0.35, w: L - 0.05, h: 0.25, fontFace: FONT, fontSize: 10, color: MUTED, margin: 0 });
        s.addText(b.y.low, { x: ox, y: oy + mh - 0.6, w: L - 0.05, h: 0.25, fontFace: FONT, fontSize: 10, color: MUTED, margin: 0 });
        s.addText(b.x.low, { x: ox + L, y: oy + mh - 0.32, w: 1.2, h: 0.25, fontFace: FONT, fontSize: 10, color: MUTED, margin: 0 });
        s.addText(b.x.high, { x: ox + mw - 1.3, y: oy + mh - 0.32, w: 1.2, h: 0.25, fontFace: FONT, fontSize: 10, color: MUTED, margin: 0, align: 'right' });
        for (const q of placed) s.addText(q.label, { x: ox + q.x - M / 2, y: oy + q.y - M / 2, w: M, h: M, shape: 'ellipse' as any, fill: { color: CORAL }, line: { color: 'FFFFFF', width: 1.5 }, fontFace: FONT, fontSize: 11, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle', margin: 0 });
        const kx = ox + mw + 0.35, kw = X + CW - kx;
        s.addText([
          { text: b.y.label, options: { bold: true, breakLine: true } }, { text: b.x.label, options: { bold: true, breakLine: true } }, { text: ' ', options: { breakLine: true } },
          ...b.key.flatMap((k, n) => runs(k).map((r, i) => ({ text: r.text, options: { ...r.options, breakLine: i === k.length - 1 && n < b.key.length - 1 } })))
        ] as any, { x: kx, y: oy + 0.3, w: kw, h: mh - 0.3, fontFace: FONT, fontSize: 12, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 4 });
      } };
    }
    case 'bars': {
      const rowH = 0.32, labelW = 4.2, barW = 5.6;
      return { height: rowH * b.items.length + 0.15, draw: (s, y) => b.items.forEach((i, k) => {
        const ry = y + k * rowH;
        s.addText(i.label, { x: X, y: ry, w: labelW, h: rowH, fontFace: FONT, fontSize: 11, color: INK, margin: 0, valign: 'middle' });
        s.addShape('rect', { x: X + labelW, y: ry + 0.09, w: barW, h: 0.14, fill: { color: 'EEF0F2' }, line: { color: 'EEF0F2' } });
        s.addShape('rect', { x: X + labelW, y: ry + 0.09, w: Math.max(0.02, (barW * Math.max(0, Math.min(i.value, b.max))) / b.max), h: 0.14, fill: { color: TONE[i.tone] }, line: { color: TONE[i.tone] } });
        s.addText(runs(i.shown) as any, { x: X + labelW + barW + 0.2, y: ry, w: CW - labelW - barW - 0.2, h: rowH, fontFace: FONT, fontSize: 11, bold: true, color: INK, margin: 0, valign: 'middle' });
      }) };
    }
    default:
      return null;
  }
}

function titleOf(s: PptxGenJS.Slide, title: string) {
  s.addText(title, { x: X, y: 0.62, w: CW, h: 0.6, fontFace: FONT, fontSize: 26, bold: true, color: INK, margin: 0, valign: 'bottom' });
  s.addShape('line', { x: X, y: 1.27, w: CW, h: 0, line: { color: CORAL, width: 1.5 } });
}

/** The slides of one section: blocks stacked from the top; a block that does not fit starts a continuation slide. */
function sectionSlides(pptx: PptxGenJS, sec: ReportSection) {
  let s = pptx.addSlide({ masterName: 'LTM' }), y = TOP, part = 1;
  titleOf(s, sec.title);
  sec.blocks.forEach((b, i) => {
    const p = place(b);
    if (!p) return;
    // A subheading moves with the block after it.
    const next = b.kind === 'subheading' ? place(sec.blocks[i + 1]) : null;
    const need = p.height + (next?.height ?? 0);
    if (y + need > BOTTOM && y > TOP) { s = pptx.addSlide({ masterName: 'LTM' }); titleOf(s, `${sec.title} (continued${++part > 2 ? ` ${part - 1}` : ''})`); y = TOP; }
    p.draw(s, y);
    y += p.height + 0.08;
  });
}

/** The deck bytes (.pptx). Deterministic in content for the same document. */
export async function renderPptx(doc: ReportDocument): Promise<Buffer> {
  const m = doc.meta;
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = m.preparedBy; pptx.company = 'LTM'; pptx.title = `${m.product}: ${m.title} · ${m.client}`; pptx.subject = m.subtitle;
  pptx.defineSlideMaster({
    title: 'LTM',
    background: { color: 'FFFFFF' },
    objects: [
      { image: { x: X, y: 0.22, w: 0.73, h: 0.2, data: LTM_LOGO_PNG } },
      { text: { text: m.platform, options: { x: X + 0.9, y: 0.19, w: 6, h: 0.26, fontFace: FONT, fontSize: 10, color: MUTED, margin: 0 } } },
      { text: { text: `${m.product} · ${m.client}`, options: { x: W - X - 5, y: 0.19, w: 5, h: 0.26, fontFace: FONT, fontSize: 10, color: MUTED, align: 'right', margin: 0 } } },
      { text: { text: m.footer, options: { x: X, y: H - 0.42, w: 9, h: 0.25, fontFace: FONT, fontSize: 9, color: MUTED, margin: 0 } } }
    ],
    slideNumber: { x: W - X - 1, y: H - 0.42, w: 1, h: 0.25, fontFace: FONT, fontSize: 9, color: MUTED, align: 'right' } as any
  });
  // Title slide: LTM black, the logo and the ribbon across the foot, as the PDF cover.
  const t = pptx.addSlide();
  t.background = { color: BLACK };
  t.addImage({ data: LTM_RIBBON_JPEG, x: 0, y: H - (W * 553) / 1200 * 0.62, w: W, h: ((W * 553) / 1200) * 0.62, sizing: { type: 'cover', w: W, h: ((W * 553) / 1200) * 0.62 } });
  t.addImage({ data: LTM_LOGO_PNG, x: X, y: 0.55, w: 1.47, h: 0.4 });
  t.addText(`${m.platform.toUpperCase()}`, { x: X, y: 1.45, w: CW, h: 0.3, fontFace: FONT, fontSize: 12, bold: true, color: CORAL, charSpacing: 2, margin: 0 });
  t.addText(m.product, { x: X, y: 1.8, w: CW, h: 0.75, fontFace: FONT, fontSize: 40, bold: true, color: 'FFFFFF', margin: 0 });
  t.addText(m.title, { x: X, y: 2.55, w: CW, h: 0.5, fontFace: FONT, fontSize: 22, color: 'FFFFFF', margin: 0 });
  t.addText(`${m.client} · ${m.date} · ${m.version}`, { x: X, y: 3.15, w: CW, h: 0.35, fontFace: FONT, fontSize: 14, color: 'A1A1AA', margin: 0 });
  if (m.status) t.addText(m.status, { x: X, y: 3.5, w: CW, h: 0.35, fontFace: FONT, fontSize: 12, color: 'A1A1AA', margin: 0 });
  for (const sec of doc.sections) sectionSlides(pptx, sec);
  const out = await pptx.write({ outputType: 'nodebuffer', compression: true });
  return Buffer.from(out as ArrayBuffer);
}
