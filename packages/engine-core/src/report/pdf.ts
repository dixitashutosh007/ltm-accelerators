/**
 * Renders a ReportDocument to PDF on the server (WS-S4). pdfmake's self-contained build with the Roboto fonts it
 * ships as base64 data, so nothing is read from disk and the renderer bundles into a Lambda. (The package's Node
 * entry reads font-shaping tables from files beside its own source, which the Lambda bundle does not carry.) LTM brand
 * (owner request, 12 Nov 2026; docs/BRAND.md): a black cover with the LTM logo and ribbon, the LTM coral for rules and
 * marks, the logo in the running header, ink text, and the platform footer on every page.
 */
import pdfMake from 'pdfmake/build/pdfmake.js';
import vfsFonts from 'pdfmake/build/vfs_fonts.js';
import type { Content, TDocumentDefinitions, TableCell } from 'pdfmake/interfaces';
import type { Block, ReportDocument, Seg, Tone } from './model';
import { LTM_BLACK, LTM_CORAL, LTM_LOGO_SVG, LTM_RIBBON_JPEG } from './brand';

const VFS: Record<string, string> = (vfsFonts as any).pdfMake?.vfs ?? (vfsFonts as any).vfs ?? (vfsFonts as any);
const FONTS = {
  Roboto: { normal: 'Roboto-Regular.ttf', bold: 'Roboto-Medium.ttf', italics: 'Roboto-Italic.ttf', bolditalics: 'Roboto-MediumItalic.ttf' }
};

const INK = '#141414', MUTED = '#4B5563', RED = LTM_CORAL, LINE = '#D1D5DB', FILL = '#F3F4F6', AMBER_BG = '#FDF6EB', BLUE_BG = '#EEF7FA';

/** Fills and text colours for heatmap cells and bars (WCAG AA text on each fill). */
const TONE: Record<Tone, { fill: string; text: string; bar: string }> = {
  good: { fill: '#DDF1E4', text: '#1E5132', bar: '#3C8D5A' },
  partial: { fill: '#FBF0D2', text: '#6B4A00', bar: '#C99A2E' },
  weak: { fill: '#FBDEC8', text: '#7A3A10', bar: '#D9822B' },
  bad: { fill: '#F9D0CA', text: '#7F1D12', bar: '#C0392B' },
  unknown: { fill: '#EEF0F2', text: '#374151', bar: '#9CA3AF' }
};

const run = (segs: Seg[]): Content[] => segs.map(s => (typeof s === 'string' ? { text: s } : { text: s.text, bold: s.strong || undefined, italics: s.italic || undefined }));

function block(b: Block): Content {
  switch (b.kind) {
    case 'paragraph':
      return { text: run(b.segs), style: b.style === 'lead' ? 'lead' : b.style === 'fine' ? 'fine' : b.style === 'small' || b.style === 'note' ? 'small' : 'body', ...(b.style === 'note' ? { color: MUTED } : {}) };
    case 'subheading':
      return { text: b.text, style: 'h3', headlineLevel: 2 };
    case 'list':
      return { ul: b.items.map(i => ({ text: run(i) })), style: b.small ? 'small' : 'body', margin: [0, 0, 0, 8] };
    case 'callout':
      return {
        table: { widths: ['*'], body: [[{ stack: [...(b.title ? [{ text: b.title, bold: true, margin: [0, 0, 0, 2] } as Content] : []), { text: run(b.segs) }], fillColor: b.tone === 'warn' ? AMBER_BG : BLUE_BG, margin: [8, 6, 8, 6] }]] },
        layout: 'noBorders', margin: [0, 2, 0, 10], style: 'small', unbreakable: true
      };
    case 'kpis':
      return {
        table: {
          widths: b.items.map(() => '*'),
          body: [b.items.map(i => ({
            stack: [{ text: i.label.toUpperCase(), style: 'kpiLabel' }, { text: run(i.value), style: 'kpiValue' }, ...(i.note ? [{ text: run(i.note), style: 'tiny' } as Content] : [])],
            margin: [6, 6, 6, 6]
          }))]
        },
        layout: { hLineColor: () => LINE, vLineColor: () => LINE }, margin: [0, 2, 0, 10]
      };
    case 'table':
      return table(b);
    case 'heatmap':
      return heatmap(b);
    case 'bars':
      return bars(b);
    case 'steps':
      return steps(b);
    case 'ranges':
      return ranges(b);
    case 'matrix':
      return matrix(b);
  }
}

/**
 * A table keeps its header with the first row and repeats it on each page. A subheading just before it becomes its
 * first header row (`title`), so the heading can never be left at the foot of a page above the table (M7 D7).
 */
function table(b: Extract<Block, { kind: 'table' }>, title?: string): Content {
  const t = title ? 1 : 0;
  const head: TableCell[] = b.head.map(h => ({ text: h, style: 'th' }));
  const rows: TableCell[][] = b.rows.map(r => r.map(c => ({ text: run(c) })));
  const heading: TableCell[][] = title ? [[{ text: title, style: 'h3', colSpan: b.head.length, margin: [-4, 0, 0, 0] }, ...b.head.slice(1).map(() => ({}))]] : [];
  return {
    table: { headerRows: 1 + t, keepWithHeaderRows: 1, widths: b.widths ?? b.head.map(() => '*'), body: [...heading, head, ...rows], dontBreakRows: true },
    layout: {
      fillColor: (i: number) => (i === t ? FILL : null), hLineColor: () => LINE, vLineWidth: () => 0,
      hLineWidth: (i: number, node: any) => (i < t ? 0 : i === t || i === t + 1 || i === node.table.body.length ? 0.8 : 0.4),
      paddingTop: () => 3, paddingBottom: () => 3, paddingLeft: () => 4, paddingRight: () => 4
    },
    style: b.small ? 'tableSmall' : 'table', margin: [0, 2, 0, 10]
  };
}

/** A heatmap: one row per group, its cells four to a line, each filled by tone; a legend under it. */
function heatmap(b: Extract<Block, { kind: 'heatmap' }>): Content {
  const PER = 4;
  const body: TableCell[][] = [];
  for (const r of b.rows) {
    for (let i = 0; i < r.cells.length; i += PER) {
      const cells = r.cells.slice(i, i + PER);
      body.push([
        i === 0 ? { text: r.label, bold: true, fontSize: 8 } : { text: '' },
        ...Array.from({ length: PER }, (_, k) => {
          const c = cells[k];
          return c ? { stack: [{ text: c.label, bold: true, fontSize: 7.5, color: TONE[c.tone].text }, ...(c.note ? [{ text: c.note, fontSize: 7, color: TONE[c.tone].text } as Content] : [])], fillColor: TONE[c.tone].fill, margin: [3, 2, 3, 2] } as TableCell : { text: '' };
        })
      ]);
    }
  }
  const legend: Content[] = b.legend ? [{
    columns: b.legend.map(l => ({ width: 'auto', columns: [{ canvas: [{ type: 'rect', x: 0, y: 1, w: 8, h: 8, color: TONE[l.tone].fill, lineColor: TONE[l.tone].bar }], width: 12 }, { text: l.label, fontSize: 7, color: MUTED, width: 'auto' }], columnGap: 2 })),
    columnGap: 10, margin: [0, 0, 0, 10]
  } as Content] : [];
  return { stack: [{ table: { widths: [86, '*', '*', '*', '*'], body, dontBreakRows: true }, layout: { hLineColor: () => '#FFFFFF', vLineColor: () => '#FFFFFF', hLineWidth: () => 2, vLineWidth: () => 2 }, margin: [0, 2, 0, 4] }, ...legend] };
}

/** Bars: label, a bar to scale on a light track, and the shown value. */
function bars(b: Extract<Block, { kind: 'bars' }>): Content {
  const W = 220;
  return {
    table: {
      widths: [150, W + 4, '*'],
      body: b.items.map(i => [
        { text: i.label, fontSize: 8 },
        { canvas: [{ type: 'rect', x: 0, y: 2, w: W, h: 8, color: '#EEF0F2' }, { type: 'rect', x: 0, y: 2, w: Math.max(1, Math.round((W * Math.max(0, Math.min(i.value, b.max))) / b.max)), h: 8, color: TONE[i.tone].bar }] },
        { text: run(i.shown), fontSize: 8, bold: true }
      ]),
      dontBreakRows: true
    },
    unbreakable: true,
    layout: 'noBorders', margin: [0, 2, 0, 10]
  };
}

/**
 * Range bars on one scale from zero (B1). One series, in the brand colour; totals in ink below a rule. Values are labelled
 * directly beside each bar, so there is no axis to read. An open range runs to the edge and ends in an arrow.
 */
function ranges(b: Extract<Block, { kind: 'ranges' }>): Content {
  const W = 170, H = 9;
  const top = Math.max(1, ...b.items.map(i => (i.high ? i.high.trace.value : i.low.trace.value * 1.25)));
  const x = (v: number) => Math.round((W * Math.max(0, Math.min(v, top))) / top);
  const bar = (i: Extract<Block, { kind: 'ranges' }>['items'][number]) => {
    const color = i.total ? INK : RED, x0 = Math.min(x(i.low.trace.value), W - 2), x1 = i.high ? Math.max(x(i.high.trace.value), x0 + 2) : W - 6;
    return [
      { type: 'line', x1: 0, y1: 2 + H / 2, x2: W, y2: 2 + H / 2, lineWidth: 0.5, lineColor: LINE },
      { type: 'rect', x: x0, y: 2, w: x1 - x0, h: H, r: 2, color },
      ...(i.high ? [] : [{ type: 'polyline', points: [{ x: W - 6, y: 2 }, { x: W, y: 2 + H / 2 }, { x: W - 6, y: 2 + H }], closePath: true, color }])
    ];
  };
  return {
    table: {
      widths: [185, W + 4, '*'],
      body: b.items.map(i => [
        { text: i.label, fontSize: 8, bold: i.total || undefined },
        { canvas: bar(i) as any },
        { text: run(i.shown), fontSize: 8, bold: i.total || undefined }
      ]),
      dontBreakRows: true
    },
    unbreakable: true,
    layout: { hLineWidth: (row: number, node: any) => (b.items[row]?.total && row > 0 ? 0.75 : 0), vLineWidth: () => 0, hLineColor: () => LINE, paddingTop: () => 3, paddingBottom: () => 3 },
    margin: [0, 2, 0, 10]
  };
}

/**
 * Two axes, four quadrants (B1): planning time to deliver across, indicative value up. Points are numbered markers; the key
 * below names them. The top-left quadrant (more value, sooner) is shaded and captioned.
 */
function matrix(b: Extract<Block, { kind: 'matrix' }>): Content {
  const W = 300, H = 170, L = 18, R = 10, M = 9;
  const ymax = Math.max(1e-9, ...b.points.map(p => p.y.trace.value)) * 1.15;
  const px = (v: number) => L + Math.round(((W - L - R) * Math.max(0, Math.min(v, b.x.max))) / b.x.max);
  const py = (v: number) => H - 14 - Math.round(((H - 28) * Math.max(0, v)) / ymax);
  const midX = L + (W - L - R) / 2, midY = 14 + (H - 28) / 2;
  // Markers that would overlap are nudged apart vertically, so every number stays readable.
  const placed: Array<{ x: number; y: number; label: string }> = [];
  for (const p of [...b.points].sort((a, c) => c.y.trace.value - a.y.trace.value)) {
    let x = px(p.x), y = py(p.y.trace.value);
    while (placed.some(q => Math.abs(q.x - x) < 2 * M && Math.abs(q.y - y) < 2 * M)) y += 2 * M;
    placed.push({ x, y: Math.min(y, H - 14 - M), label: p.label });
  }
  const shapes: any[] = [
    // A full-size background fixes the canvas height at H, so the detached labels below can be placed from it.
    { type: 'rect', x: 0, y: 0, w: W, h: H, color: '#FFFFFF' },
    { type: 'rect', x: L, y: 14, w: midX - L, h: midY - 14, color: BLUE_BG },
    { type: 'rect', x: L, y: 14, w: W - L - R, h: H - 28, lineWidth: 0.75, lineColor: LINE },
    { type: 'line', x1: midX, y1: 14, x2: midX, y2: H - 14, lineWidth: 0.5, lineColor: LINE, dash: { length: 3 } },
    { type: 'line', x1: L, y1: midY, x2: W - R, y2: midY, lineWidth: 0.5, lineColor: LINE, dash: { length: 3 } },
    ...placed.flatMap(q => [{ type: 'ellipse', x: q.x, y: q.y, r1: M, r2: M, color: RED, lineWidth: 2, lineColor: '#FFFFFF' }])
  ];
  // Labels are detached nodes placed against the canvas: each is positioned from the point just below it, so y is offset by -H.
  const at = (x: number, y: number) => ({ relativePosition: { x, y: y - H } });
  const labels: Content[] = [
    ...placed.map(q => ({ text: q.label, fontSize: 7.5, bold: true, color: '#FFFFFF', ...at(q.x - (q.label.length > 1 ? 4 : 2), q.y - 4.5) } as Content)),
    ...(b.quadrant ? [{ text: b.quadrant, fontSize: 7, color: MUTED, ...at(L + 4, 17) } as Content] : []),
    { text: b.y.high, fontSize: 7, color: MUTED, ...at(0, 14) } as Content,
    { text: b.y.low, fontSize: 7, color: MUTED, ...at(0, H - 22) } as Content,
    { text: b.x.low, fontSize: 7, color: MUTED, ...at(L, H - 11) } as Content,
    { text: b.x.high, fontSize: 7, color: MUTED, ...at(W - R - 24, H - 11) } as Content
  ];
  return {
    columns: [
      { width: W, stack: [{ canvas: shapes }, ...labels] },
      { width: '*', stack: [{ text: b.y.label, fontSize: 7.5, bold: true, margin: [0, 10, 0, 2] }, { text: b.x.label, fontSize: 7.5, bold: true, margin: [0, 0, 0, 6] }, ...b.key.map(k => ({ text: run(k), fontSize: 7.5, margin: [0, 0, 0, 2] } as Content))] }
    ],
    columnGap: 12, unbreakable: true, margin: [0, 4, 0, 10]
  } as Content;
}

/** Stepped levels: one box per step, filled up to the row's value, with an outlined marker step. */
function steps(b: Extract<Block, { kind: 'steps' }>): Content {
  const BOX = 40, GAP = 3, W = b.steps.length * (BOX + GAP);
  const FILL = ['#CFE3EC', '#9CC6D8', '#5E9FBB', '#1F5F78'];
  const shade = (i: number) => FILL[Math.min(FILL.length - 1, Math.round((i * (FILL.length - 1)) / Math.max(1, b.steps.length - 1)))];
  const head = [{ text: '', fontSize: 7 }, { columns: b.steps.map(s => ({ text: s, width: BOX + GAP, fontSize: 6.5, color: MUTED, alignment: 'center' })), columnGap: 0 }, { text: '', fontSize: 7 }];
  const row = (r: Extract<Block, { kind: 'steps' }>['rows'][number]) => [
    { text: r.label, fontSize: 8 },
    { canvas: b.steps.flatMap((_, i) => {
      const x = i * (BOX + GAP), filled = r.value != null && i < r.value;
      return [
        { type: 'rect', x, y: 1, w: BOX, h: 10, color: filled ? shade(i) : '#EEF0F2' },
        ...(r.marker != null && i === r.marker - 1 ? [{ type: 'rect', x: x - 1, y: 0, w: BOX + 2, h: 12, lineColor: '#D33826', lineWidth: 1.2 }] : [])
      ];
    }) },
    { text: run(r.shown), fontSize: 8, bold: true }
  ];
  return {
    stack: [
      { table: { widths: [150, W + 4, '*'], body: [head, ...b.rows.map(row)], dontBreakRows: true }, layout: 'noBorders' },
      ...(b.legend ? [{ text: b.legend, fontSize: 7, color: MUTED, margin: [0, 2, 0, 0] } as Content] : [])
    ],
    margin: [0, 2, 0, 10]
  } as Content;
}

/** headlineLevel marks headings (1 section, 2 subheading); RUNNING marks the page header and footer text. */
const RUNNING = 9;
const BODY_BOTTOM = 842 - 56;
/** Tables up to this many rows are kept whole on one page (a finding, a legend, a short list of figures). */
const SHORT_TABLE_ROWS = 7;

/**
 * A heading never ends a page (M7 CIO challenge D7): it moves to the next page when no body text follows it on this
 * page, or when it starts in the last inch, where pdfmake may still report a table row that it then moves on (rows
 * are kept whole and with the table header). Only text nodes count; the running header and footer do not.
 */
function keepHeadingsWithContent(node: any, following: any[]): boolean {
  if (node.headlineLevel !== 1 && node.headlineLevel !== 2) return false;
  const page = node.startPosition?.pageNumber;
  const body = following.some(f => f.text !== undefined && f.headlineLevel === undefined && f.style !== 'th' && f.startPosition?.pageNumber === page);
  return !body || node.startPosition.top > BODY_BOTTOM - 72;
}

export function definition(doc: ReportDocument): TDocumentDefinitions {
  const m = doc.meta;
  const brief = m.layout === 'brief';
  let n = 0, a = 0;
  const body: Content[] = [];
  for (const s of doc.sections) {
    const label = brief ? s.title : s.appendix ? `Appendix ${String.fromCharCode(65 + a++)}. ${s.title}` : `${++n}. ${s.title}`;
    body.push({ text: label, style: brief ? 'h3' : 'h2', pageBreak: s.appendix || s.newPage ? 'before' : undefined, id: s.id, tocItem: !brief, headlineLevel: 1 });
    body.push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 495, y2: 0, lineWidth: 1, lineColor: RED }], margin: [0, 0, 0, 8] });
    const skip = new Set<number>();
    s.blocks.forEach((b, i) => {
      if (skip.has(i)) return;
      const next = s.blocks[i + 1];
      if (b.kind === 'subheading' && (next?.kind === 'table' || next?.kind === 'bars')) return;
      const prev = s.blocks[i - 1];
      // A bar group moves to the next page whole, and takes its subheading with it (CQ12).
      if (b.kind === 'bars') { body.push(prev?.kind === 'subheading' ? { stack: [block(prev), block(b)], unbreakable: true } as Content : block(b)); return; }
      const t = b.kind === 'table' ? (prev?.kind === 'subheading' ? table(b, prev.text) : table(b)) : block(b);
      if (b.kind !== 'table') { body.push(t); return; }
      // A short table stays on one page, and keeps the source note written under it (a note is never left alone on the next page).
      const note = next?.kind === 'paragraph' && (next.style === 'small' || next.style === 'note') ? next : undefined;
      if (note) skip.add(i + 1);
      if (b.rows.length <= SHORT_TABLE_ROWS) body.push({ stack: [t, ...(note ? [block(note)] : [])], unbreakable: true } as Content);
      else body.push(t, ...(note ? [block(note)] : []));
    });
  }
  // The cover is LTM black with the ribbon across its foot (the page background), in light text.
  const COVER_TEXT = '#FFFFFF', COVER_MUTED = '#A1A1AA';
  const cover: Content[] = [
    { svg: LTM_LOGO_SVG, width: 110, margin: [0, 8, 0, 0] } as Content,
    // The client's logo sits in the space above the badge when one was given, so the cover does not shift.
    m.clientLogo ? { image: m.clientLogo, fit: [180, 64], margin: [0, 40, 0, 18] } : { text: '', margin: [0, 92, 0, 0] },
    { text: m.platform.toUpperCase(), style: 'coverBadge', margin: [0, 0, 0, 18] },
    { text: m.product, style: 'coverProduct' },
    { text: m.title, style: 'coverTitle' },
    { text: m.subtitle, style: 'coverSubtitle', margin: [0, 6, 0, 36] },
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 120, y2: 0, lineWidth: 3, lineColor: RED }], margin: [0, 0, 0, 20] },
    {
      table: {
        widths: [120, '*'],
        body: [
          ['Client', m.client], ['Assessment date', m.date], ['Prepared by', m.preparedBy], ['Data provided by', m.dataProvidedBy],
          ['Version', m.version], ['Edition', m.view === 'client' ? 'Client edition' : 'Consultant edition (includes consultant-only checks)'],
          ...(m.status ? [['Status', m.status]] : [])
        ].map(([k, v]) => [{ text: k, color: COVER_MUTED }, { text: v, color: COVER_TEXT }])
      },
      layout: 'noBorders', style: 'body'
    },
    { text: 'Contents', style: 'h3', margin: [0, 40, 0, 4], pageBreak: 'before' },
    { toc: { title: { text: '' }, numberStyle: { fontSize: 9 } }, style: 'small' }
  ];
  // The brief's masthead: the logo, what the document is, for whom and when, and its status, above a coral rule.
  const masthead: Content[] = [
    { columns: [
      { svg: LTM_LOGO_SVG, width: 64, margin: [0, 4, 0, 0] } as Content,
      { width: '*', stack: [
        { text: `${m.platform.toUpperCase()} · ${m.product.toUpperCase()}`, style: 'coverBadge', margin: [0, 0, 0, 3] },
        { text: m.title, fontSize: 17, bold: true },
        { text: `${m.client} · ${m.date} · ${m.version}`, color: MUTED, fontSize: 8.5, margin: [0, 2, 0, 0] }
      ] }
    ], columnGap: 16 },
    ...(m.status ? [{ text: m.status, fontSize: 8, color: MUTED, margin: [0, 6, 0, 0] } as Content] : []),
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 495, y2: 0, lineWidth: 1.5, lineColor: RED }], margin: [0, 6, 0, 6] }
  ];
  return {
    pageSize: 'A4',
    pageMargins: [50, 56, 50, 56],
    info: { title: `${m.product}: ${m.title} · ${m.client}`, author: m.preparedBy, subject: m.subtitle, creator: m.platform, producer: m.platform },
    defaultStyle: { font: 'Roboto', fontSize: 9.5, color: INK, lineHeight: 1.25 },
    background: (page: number, size: { width: number; height: number }) => (page === 1 && !brief ? [
      { canvas: [{ type: 'rect', x: 0, y: 0, w: size.width, h: size.height, color: LTM_BLACK }] },
      { image: LTM_RIBBON_JPEG, width: size.width, absolutePosition: { x: 0, y: size.height - size.width * 553 / 1200 } }
    ] as Content : null) as any,
    header: (page: number) => (page === 1 ? null : {
      columns: [
        { svg: LTM_LOGO_SVG, width: 30, margin: [0, 1, 0, 0] } as Content,
        { text: m.platform, color: MUTED, headlineLevel: RUNNING, width: '*' },
        { text: `${m.product} · ${m.client}`, alignment: 'right', color: MUTED, headlineLevel: RUNNING, width: 'auto' }
      ],
      columnGap: 8, margin: [50, 22, 50, 0], fontSize: 7.5
    }),
    // The cover carries no footer: the ribbon fills its foot.
    footer: (page: number, pages: number) => (page === 1 && !brief ? null : {
      columns: [{ text: m.footer, color: MUTED, headlineLevel: RUNNING }, { text: `Page ${page} of ${pages}`, alignment: 'right', color: MUTED, headlineLevel: RUNNING }],
      margin: [50, 18, 50, 0], fontSize: 7.5
    }),
    content: brief ? [...masthead, ...body] : [...cover, { text: '', pageBreak: 'after' }, ...body],
    pageBreakBefore: keepHeadingsWithContent,
    styles: {
      body: { margin: [0, 0, 0, 6] },
      lead: { fontSize: 11, margin: [0, 0, 0, 8] },
      small: { fontSize: 8.5, margin: [0, 0, 0, 6] },
      tiny: { fontSize: 7.5, color: MUTED },
      fine: { fontSize: 7.5, lineHeight: 1.2, color: MUTED, margin: [0, 0, 0, 4] },
      h2: { fontSize: 15, bold: true, margin: [0, 6, 0, 4] },
      h3: { fontSize: 11, bold: true, margin: [0, 8, 0, 4] },
      th: { bold: true, fontSize: 8, color: MUTED },
      table: { fontSize: 8.5 },
      tableSmall: { fontSize: 7.5 },
      kpiLabel: { fontSize: 7, color: MUTED, bold: true },
      kpiValue: { fontSize: 15, bold: true, margin: [0, 2, 0, 2] },
      coverBadge: { fontSize: 9, bold: true, color: LTM_CORAL, characterSpacing: 1.5 },
      coverProduct: { fontSize: 30, bold: true, color: COVER_TEXT },
      coverTitle: { fontSize: 16, margin: [0, 4, 0, 0], color: COVER_TEXT },
      coverSubtitle: { fontSize: 11, color: COVER_MUTED }
    }
  };
}

/** The PDF bytes. Deterministic for the same document: creation date fixed to the assessment date. */
export function renderPdf(doc: ReportDocument): Promise<Buffer> {
  const def = definition(doc);
  def.info = { ...def.info, creationDate: new Date(`${doc.meta.date}T00:00:00Z`) } as any;
  return new Promise((resolve, reject) => {
    try { (pdfMake as any).createPdf(def, undefined, FONTS, VFS).getBuffer((b: Uint8Array) => resolve(Buffer.from(b))); }
    catch (e) { reject(e); }
  });
}
