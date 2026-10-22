/**
 * FinOps IQ dashboard charts: plain SVG and HTML, no library, so the page loads nothing from outside the platform.
 * Each builder takes data the server already returned and draws it; none computes a score or a value. Charts carry
 * an accessible name (role="img"), and the same figures are in tables on the page. Motion (count-up numbers, bars
 * and arcs drawing in) is skipped when the user asks for reduced motion.
 */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var reduced = function () { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; };

  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    set(e, attrs);
    add(e, kids);
    return e;
  }
  function s(tag, attrs, kids) {
    var e = document.createElementNS(NS, tag);
    set(e, attrs);
    add(e, kids);
    return e;
  }
  function set(e, attrs) {
    if (!attrs) return;
    for (var k in attrs) {
      var v = attrs[k];
      if (v === undefined || v === null || v === false) continue;
      if (k === 'text') e.textContent = v;
      else if (k === 'class') e.setAttribute('class', v);
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
  }
  function add(e, kids) {
    if (kids === undefined || kids === null || kids === false) return;
    if (Array.isArray(kids)) { kids.forEach(function (k) { add(e, k); }); return; }
    e.appendChild(typeof kids === 'string' || typeof kids === 'number' ? document.createTextNode(String(kids)) : kids);
  }
  /** Runs fn on the next frame after the element is in the page, so CSS transitions play from the start state. */
  function onShow(fn) { requestAnimationFrame(function () { requestAnimationFrame(fn); }); }

  /** A number that counts up from zero to its value, formatted by fmt at every frame. */
  function countUp(target, value, fmt, ms) {
    if (typeof value !== 'number' || reduced()) { target.textContent = fmt(value); return; }
    var start = null, dur = ms || 1200;
    target.textContent = fmt(0);
    function step(t) {
      if (start === null) start = t;
      var p = Math.min(1, (t - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      target.textContent = fmt(p < 1 ? value * eased : value);
      if (p < 1) requestAnimationFrame(step);
    }
    onShow(function () { requestAnimationFrame(step); });
  }

  /** Semicircle gauge, 0 to 100, with band marks. */
  function gauge(o) {
    var r = 80, cx = 100, cy = 96, len = Math.PI * r;
    var arc = 'M ' + (cx - r) + ' ' + cy + ' A ' + r + ' ' + r + ' 0 0 1 ' + (cx + r) + ' ' + cy;
    var v = Math.max(0, Math.min(100, o.value || 0));
    var fill = s('path', { d: arc, class: 'g-fill', 'stroke-dasharray': len, 'stroke-dashoffset': len, stroke: o.color || '#D33826' });
    var svg = s('svg', { viewBox: '0 0 200 112', class: 'gauge', role: 'img', 'aria-label': o.label },
      [s('path', { d: arc, class: 'g-track' }), fill]);
    onShow(function () { fill.setAttribute('stroke-dashoffset', String(len * (1 - v / 100))); });
    return svg;
  }

  /** Donut: parts [{ value, color, label }], with a centre label. */
  function donut(o) {
    var total = o.parts.reduce(function (t, p) { return t + (p.value > 0 ? p.value : 0); }, 0);
    var r = 54, c = 2 * Math.PI * r, at = 0;
    var svg = s('svg', { viewBox: '0 0 140 140', class: 'donut', role: 'img', 'aria-label': o.label });
    svg.appendChild(s('circle', { cx: 70, cy: 70, r: r, class: 'd-track' }));
    o.parts.forEach(function (p) {
      if (!(p.value > 0) || !total) return;
      var share = p.value / total;
      var seg = s('circle', { cx: 70, cy: 70, r: r, class: 'd-seg', stroke: p.color, 'stroke-dasharray': '0 ' + c, transform: 'rotate(' + (-90 + at * 360) + ' 70 70)' },
        s('title', { text: p.label + ': ' + (p.display || p.value) }));
      var dash = Math.max(0, share * c - (o.parts.length > 1 ? 1.5 : 0));
      onShow(function () { seg.setAttribute('stroke-dasharray', dash + ' ' + c); });
      svg.appendChild(seg);
      at += share;
    });
    if (o.center) svg.appendChild(s('text', { x: 70, y: o.sub ? 68 : 75, class: 'd-center', 'text-anchor': 'middle' }, o.center));
    if (o.sub) svg.appendChild(s('text', { x: 70, y: 86, class: 'd-sub', 'text-anchor': 'middle' }, o.sub));
    return svg;
  }

  function legend(parts) {
    return el('ul', { class: 'legend' }, parts.map(function (p) {
      return el('li', null, [el('i', { style: 'background:' + p.color, 'aria-hidden': 'true' }), el('span', null, p.label), p.display !== undefined ? el('strong', null, String(p.display)) : null]);
    }));
  }

  /** Radar: axes [{ label, today, target }] on a 0..max scale; today filled, target outlined. */
  function radar(o) {
    var n = o.axes.length, size = 360, cx = size / 2, cy = size / 2, R = 118, max = o.max || 3;
    var svg = s('svg', { viewBox: '-70 -10 ' + (size + 140) + ' ' + (size + 20), class: 'radar', role: 'img', 'aria-label': o.label });
    var pt = function (i, v) { var a = -Math.PI / 2 + (2 * Math.PI * i) / n; return [cx + Math.cos(a) * R * v / max, cy + Math.sin(a) * R * v / max]; };
    for (var ring = 1; ring <= max; ring++) {
      var pts = [];
      for (var i = 0; i < n; i++) pts.push(pt(i, ring).join(','));
      svg.appendChild(s('polygon', { points: pts.join(' '), class: 'r-grid' }));
    }
    o.axes.forEach(function (a, i) {
      var end = pt(i, max), lab = pt(i, max + 0.42);
      svg.appendChild(s('line', { x1: cx, y1: cy, x2: end[0], y2: end[1], class: 'r-axis' }));
      var anchor = Math.abs(lab[0] - cx) < 8 ? 'middle' : lab[0] > cx ? 'start' : 'end';
      var short = a.label.length > 30 ? a.label.slice(0, 29) + '…' : a.label;
      svg.appendChild(s('text', { x: lab[0], y: lab[1] + 3, class: 'r-label', 'text-anchor': anchor }, [short, s('title', { text: a.label })]));
    });
    (o.levels || []).forEach(function (l, i) { svg.appendChild(s('text', { x: cx + 5, y: cy - R * (i + 1) / max + 12, class: 'r-level' }, l)); });
    var poly = function (key) { return o.axes.map(function (a, i) { return pt(i, a[key] == null ? 0 : a[key]).join(','); }).join(' '); };
    var target = s('polygon', { points: poly('target'), class: 'r-target' });
    var today = s('polygon', { points: poly('today'), class: 'r-today' });
    var g = s('g', { class: 'r-shapes' }, [target, today]);
    svg.appendChild(g);
    o.axes.forEach(function (a, i) {
      if (a.today == null) return;
      var p = pt(i, a.today);
      svg.appendChild(s('circle', { cx: p[0], cy: p[1], r: 3.5, class: 'r-dot' }, s('title', { text: a.label + ': ' + a.todayLabel + (a.targetLabel ? ', target ' + a.targetLabel : '') })));
    });
    onShow(function () { g.classList.add('in'); });
    return svg;
  }

  /** Horizontal range bars: rows [{ label, low, mid, high, note }]; mid drawn as the bar, low..high as the whisker. */
  function rangeBars(o) {
    var max = Math.max.apply(null, o.rows.map(function (r) { return r.high || r.mid || 0; }).concat([1]));
    return el('div', { class: 'rbars', role: 'img', 'aria-label': o.label }, o.rows.map(function (r, i) {
      var bar = el('i', { class: 'rb-bar', style: 'width:0' });
      var range = el('b', { class: 'rb-range', style: 'left:' + (100 * (r.low || 0) / max) + '%;width:' + (100 * Math.max(0, (r.high || 0) - (r.low || 0)) / max) + '%' });
      onShow(function () { setTimeout(function () { bar.style.width = (100 * (r.mid || 0) / max) + '%'; }, i * 80); });
      return el('div', { class: 'rb-row', title: r.title || '' }, [
        el('span', { class: 'rb-label' }, r.label),
        el('span', { class: 'rb-track', 'aria-hidden': 'true' }, [bar, range]),
        el('span', { class: 'rb-value' }, r.display)
      ]);
    }));
  }

  /** Grouped columns: groups [{ label, bars: [{ value, color, display, name }] }]. */
  function columns(o) {
    var max = Math.max.apply(null, [1].concat.apply([], o.groups.map(function (g) { return g.bars.map(function (b) { return b.value || 0; }); })));
    return el('div', { class: 'cols', role: 'img', 'aria-label': o.label }, o.groups.map(function (g, gi) {
      return el('div', { class: 'col-group' }, [
        el('div', { class: 'col-bars', 'aria-hidden': 'true' }, g.bars.map(function (b, bi) {
          var bar = el('i', { style: 'height:0;background:' + b.color, title: b.name + ': ' + b.display });
          onShow(function () { setTimeout(function () { bar.style.height = Math.max(2, 100 * Math.max(0, b.value || 0) / max) + '%'; }, (gi * g.bars.length + bi) * 70); });
          return bar;
        })),
        el('span', { class: 'col-label' }, g.label),
        g.caption ? el('strong', { class: 'col-caption' }, g.caption) : null
      ]);
    }));
  }

  /** Heatmap: rows [{ label, cells: [{ label, sub, cls, title }] }], HTML so the text stays crisp and readable. */
  function heatmap(o) {
    return el('div', { class: 'heatmap', role: 'img', 'aria-label': o.label }, o.rows.map(function (r, ri) {
      return el('div', { class: 'hm-row' }, [
        el('div', { class: 'hm-head' }, r.label),
        el('div', { class: 'hm-cells' }, r.cells.map(function (c, ci) {
          return el('div', { class: 'hm-cell ' + (c.cls || ''), title: c.title || '', style: 'animation-delay:' + (ri * 90 + ci * 35) + 'ms' }, [el('span', null, c.label), c.sub ? el('small', null, c.sub) : null]);
        }))
      ]);
    }));
  }

  /**
   * Matrix: rows by cols of counts, each cell a bubble sized by its count. A cell can be picked (onPick(row, col)),
   * and the picked cell stays marked; picking it again clears the filter.
   */
  function matrix(o) {
    var max = 1;
    o.cells.forEach(function (row) { row.forEach(function (c) { max = Math.max(max, c.count); }); });
    var grid = el('div', { class: 'matrix', style: 'grid-template-columns: minmax(84px, auto) repeat(' + o.cols.length + ', minmax(0, 1fr))' });
    grid.appendChild(el('div', { class: 'mx-corner' }, o.corner || ''));
    o.cols.forEach(function (c) { grid.appendChild(el('div', { class: 'mx-col' }, c)); });
    o.rows.forEach(function (r, ri) {
      grid.appendChild(el('div', { class: 'mx-row ' + (o.rowClass ? o.rowClass[ri] : '') }, r));
      o.cols.forEach(function (c, ci) {
        var cell = o.cells[ri][ci];
        var size = cell.count ? 26 + 34 * Math.sqrt(cell.count / max) : 0;
        var picked = o.picked && o.picked[0] === ri && o.picked[1] === ci;
        var label = cell.count + ' ' + (cell.count === 1 ? o.unit[0] : o.unit[1]) + ': ' + r + ', ' + c;
        grid.appendChild(cell.count
          ? el('button', { type: 'button', class: 'mx-cell' + (picked ? ' picked' : ''), 'aria-pressed': picked ? 'true' : 'false', 'aria-label': label, onclick: function () { o.onPick(ri, ci); } },
            el('span', { class: 'mx-bubble ' + (o.rowClass ? o.rowClass[ri] : ''), style: 'width:' + size + 'px;height:' + size + 'px' }, String(cell.count)))
          : el('div', { class: 'mx-cell empty', 'aria-hidden': 'true' }));
      });
    });
    return grid;
  }

  /** Roadmap: rows [{ label, start, length, cls, title }] on a month axis of `months`. */
  function gantt(o) {
    var months = o.months;
    var ticks = [];
    for (var m = 0; m <= months; m += o.step || 3) ticks.push(m);
    var axis = el('div', { class: 'gt-axis', 'aria-hidden': 'true' }, ticks.map(function (t) { return el('span', { style: 'left:' + (100 * t / months) + '%' }, 'M' + t); }));
    return el('div', { class: 'gantt', role: 'img', 'aria-label': o.label }, [
      el('div', { class: 'gt-row gt-head' }, [el('span', { class: 'gt-label' }, o.head || ''), el('div', { class: 'gt-track' }, axis)]),
      o.rows.map(function (r, i) {
        var bar = el('i', { class: 'gt-bar ' + (r.cls || ''), style: 'left:' + (100 * r.start / months) + '%;width:0', title: r.title || '' });
        onShow(function () { setTimeout(function () { bar.style.width = (100 * Math.min(r.length, months - r.start) / months) + '%'; }, i * 45); });
        return el('div', { class: 'gt-row' }, [el('span', { class: 'gt-label', title: r.label }, r.label), el('div', { class: 'gt-track' }, [ticks.map(function (t) { return el('b', { style: 'left:' + (100 * t / months) + '%' }); }), bar])]);
      })
    ]);
  }

  window.FinOpsIqCharts = { countUp: countUp, gauge: gauge, donut: donut, legend: legend, radar: radar, rangeBars: rangeBars, columns: columns, heatmap: heatmap, matrix: matrix, gantt: gantt };
})();
