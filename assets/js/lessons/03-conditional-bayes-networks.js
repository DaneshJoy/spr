;
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  function css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }
  function el(t, a) { var e = document.createElementNS(NS, t); for (var k in a) e.setAttribute(k, a[k]); return e; }
  // line endpoints on node borders (hw/hh half sizes; tri=ellipse shape, rect otherwise)
  function geo(a, b, hw, hh, tri) {
    var dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l;
    var t = tri ? 1 / Math.sqrt((ux * ux) / (hw * hw) + (uy * uy) / (hh * hh))
      : Math.min(hw / Math.abs(ux || 1e-9), hh / Math.abs(uy || 1e-9));
    var sx = a.x + ux * (t + 1), sy = a.y + uy * (t + 1);
    var ex = b.x - ux * (t + 10), ey = b.y - uy * (t + 10);
    return { sx: sx, sy: sy, ex: ex, ey: ey, mx: (sx + ex) / 2, my: (sy + ey) / 2, nx: -uy, ny: ux };
  }
  var painters = [];
  var bn = document.getElementById('bn-svg'), bncap = document.getElementById('bn-cap');
  if (bn && bncap) {
    var N = [
      { id: 'cloud', fa: 'ابری', en: 'Cloudy', x: 320, y: 58 },
      { id: 'rain', fa: 'باران', en: 'Rain', x: 150, y: 198 },
      { id: 'spr', fa: 'اسپرینکلر', en: 'Sprinkler', x: 490, y: 198 },
      { id: 'grass', fa: 'چمن خیس', en: 'Grass wet', x: 320, y: 318 }];
    var E = [
      { f: 'cloud', t: 'rain', lbl: 'P(باران|ابری)=0.8' },
      { f: 'cloud', t: 'spr', lbl: 'P(اسپرینکلر|ابری)=0.1' },
      { f: 'rain', t: 'grass', lbl: 'P(چمن خیس|باران)=0.9' },
      { f: 'spr', t: 'grass', lbl: 'P(چمن خیس|اسپرینکلر)=0.9' }];
    var CAP = {
      none: 'هیچ گره‌ای مشاهده نشده است. روی هر گره کلیک کن (یا با Tab انتخاب و با Enter یا Space تأیید کن) تا به‌عنوان شاهد ثبت شود. پیشفرض مدل: P(ابری)=0.5.',
      cloud: 'با مشاهدهٔ ابری، مسیرهای گذر از آن قطع می‌شوند: باران و اسپرینکلر دیگر از طریق ابری به هم وابسته نیستند.',
      rain: 'با مشاهدهٔ باران، فقط مسیر ابری → باران → چمن خیس قطع می‌شود؛ مسیر ابری → اسپرینکلر → چمن خیس هنوز باز است، پس ابری همچنان دربارهٔ چمن خیس اطلاعات می‌دهد.',
      spr: 'با مشاهدهٔ اسپرینکلر، فقط مسیر ابری → اسپرینکلر → چمن خیس قطع می‌شود؛ مسیر ابری → باران → چمن خیس هنوز باز است، پس ابری همچنان دربارهٔ چمن خیس اطلاعات می‌دهد.',
      grass: 'با مشاهدهٔ چمن خیس، باران و اسپرینکلر وابسته می‌شوند — توجیه‌کنندهٔ ظاهری! دو علتِ رقیب برای یک شاهد داریم: اگر باران ببارد، روشن بودن اسپرینکلر کمتر محتمل می‌شود.' };
    var byId = {}; N.forEach(function (n) { byId[n.id] = n; });
    var seen = {};
    var defs = el('defs', {});
    function marker(id) { var m = el('marker', { id: id, viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '11', markerHeight: '11', markerUnits: 'userSpaceOnUse', orient: 'auto' }); var p = el('path', { d: 'M0 0L10 5L0 10Z' }); m.appendChild(p); defs.appendChild(m); return p; }
    var mfill = marker('bn-ar'), mfillb = marker('bn-arb');
    bn.appendChild(defs);
    var eg = E.map(function (e) {
      var g = geo(byId[e.f], byId[e.t], 75, 31, false);
      var base = el('line', { x1: g.sx, y1: g.sy, x2: g.ex, y2: g.ey, 'marker-end': 'url(#bn-ar)', 'stroke-width': 2 });
      var ov = el('line', { x1: g.sx, y1: g.sy, x2: g.ex, y2: g.ey, 'stroke-width': 3.5, 'stroke-dasharray': '7 5', visibility: 'hidden' });
      var lbl = el('text', { x: g.mx + g.nx * 22, y: g.my + g.ny * 22, 'font-size': 12.5, 'text-anchor': 'middle' });
      lbl.textContent = e.lbl;
      bn.appendChild(base); bn.appendChild(ov); bn.appendChild(lbl);
      return { f: e.f, t: e.t, base: base, ov: ov, lbl: lbl };
    });
    var nds = N.map(function (n) {
      var g = el('g', { class: 'bnn', role: 'button', tabindex: '0', 'aria-pressed': 'false' });
      var ring = el('rect', { x: n.x - 79, y: n.y - 36, width: 158, height: 76, rx: 22, fill: 'none', 'stroke-width': 5, visibility: 'hidden' });
      var rc = el('rect', { class: 'nshape', x: n.x - 75, y: n.y - 31, width: 150, height: 62, rx: 16, 'stroke-width': 2 });
      var t1 = el('text', { x: n.x, y: n.y - 2, 'text-anchor': 'middle', 'font-size': 17, 'font-weight': 800 });
      t1.textContent = n.fa;
      var t2 = el('text', { x: n.x, y: n.y + 18, 'text-anchor': 'middle', 'font-size': 12 });
      t2.textContent = n.en;
      g.appendChild(ring); g.appendChild(rc); g.appendChild(t1); g.appendChild(t2);
      bn.appendChild(g);
      function toggle() { seen[n.id] = !seen[n.id]; g.setAttribute('aria-pressed', String(!!seen[n.id])); paint(); }
      g.addEventListener('click', toggle);
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
      return { n: n, ring: ring, rc: rc, t1: t1, t2: t2 };
    });
    function paint() {
      var a = css('--a'), bad = css('--bad'), line = css('--line'), text = css('--text'), card = css('--card'), muted = css('--muted');
      mfill.setAttribute('fill', muted); mfillb.setAttribute('fill', bad);
      var red = [];
      N.forEach(function (o) {
        if (!seen[o.id]) return;
        var pa = [], ch = [];
        eg.forEach(function (e) { if (e.t === o.id) pa.push(e); if (e.f === o.id) ch.push(e); });
        // chain: parent-edge + child-edge blocked; fork: both child-edges blocked; collider: opens, nothing blocked
        pa.forEach(function (i) { ch.forEach(function (j) { [i, j].forEach(function (e) { if (red.indexOf(e) < 0) red.push(e); }); }); });
        ch.forEach(function (i, k1) { ch.forEach(function (j, k2) { if (k1 < k2) [i, j].forEach(function (e) { if (red.indexOf(e) < 0) red.push(e); }); }); });
      });
      eg.forEach(function (e) {
        e.ov.setAttribute('visibility', red.indexOf(e) >= 0 ? 'visible' : 'hidden');
        e.base.setAttribute('stroke', muted);
        e.lbl.setAttribute('fill', muted);
      });
      nds.forEach(function (o) {
        var on = !!seen[o.n.id];
        o.rc.setAttribute('fill', on ? a : card); o.rc.setAttribute('stroke', on ? a : line);
        o.t1.setAttribute('fill', on ? '#fff' : text); o.t2.setAttribute('fill', on ? '#fff' : muted);
        o.ring.setAttribute('stroke', a); o.ring.setAttribute('visibility', on ? 'visible' : 'hidden');
      });
      var msg = [];
      N.forEach(function (n) { if (seen[n.id]) msg.push(CAP[n.id]); });
      bncap.textContent = msg.length ? msg.join(' ') : CAP.none;
    }
    painters.push(paint);
  }
  function trio(svgId, capId, kind, onT, onVar, offT) {
    var svg = document.getElementById(svgId), out = document.getElementById(capId);
    if (!svg || !out) return;
    var pts = { A: { x: 45, y: 60 }, B: { x: 130, y: 60 }, C: { x: 215, y: 60 } };
    var defs = el('defs', {});
    var m = el('marker', { id: svgId + '-ar', viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '11', markerHeight: '11', markerUnits: 'userSpaceOnUse', orient: 'auto' });
    var mfill = el('path', { d: 'M0 0L10 5L0 10Z' });
    m.appendChild(mfill); defs.appendChild(m); svg.appendChild(defs);
    var lines = [];
    var ED = { chain: [['A', 'B'], ['B', 'C']], fork: [['B', 'A'], ['B', 'C']], coll: [['A', 'B'], ['C', 'B']] }[kind];
    ED.forEach(function (e) {
      var g = geo(pts[e[0]], pts[e[1]], 27, 20, true);
      var l = el('line', { x1: g.sx, y1: g.sy, x2: g.ex, y2: g.ey, 'marker-end': 'url(#' + svgId + '-ar)', 'stroke-width': 2 });
      lines.push(l); svg.appendChild(l);
    });
    var seenB = false, mid = null;
    ['A', 'B', 'C'].forEach(function (k) {
      var p = pts[k];
      var gg = el('g', k === 'B' ? { class: 'bnn', role: 'button', tabindex: '0', 'aria-pressed': 'false' } : { 'aria-hidden': 'true' });
      var c = el('ellipse', { class: 'nshape', cx: p.x, cy: p.y, rx: 27, ry: 20, 'stroke-width': 2 });
      var t1 = el('text', { x: p.x, y: p.y + 5, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 800 });
      t1.textContent = k;
      gg.appendChild(c); gg.appendChild(t1); svg.appendChild(gg);
      if (k === 'B') {
        mid = { c: c, t1: t1 };
        function toggle() { seenB = !seenB; gg.setAttribute('aria-pressed', String(seenB)); paint(); }
        gg.addEventListener('click', toggle);
        gg.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
      }
    });
    function paint() {
      var a = css('--a'), line = css('--line'), text = css('--text'), card = css('--card'), muted = css('--muted'), bad = css('--bad');
      mfill.setAttribute('fill', muted);
      lines.forEach(function (l) { l.setAttribute('stroke', muted); });
      mid.c.setAttribute('fill', seenB ? a : card); mid.c.setAttribute('stroke', seenB ? a : line);
      mid.t1.setAttribute('fill', seenB ? '#fff' : text);
      out.textContent = seenB ? onT : offT;
      out.style.color = seenB ? (onVar === 'bad' ? bad : a) : muted;
    }
    painters.push(paint);
  }
  trio('t-chain', 'tc-chain', 'chain', 'با مشاهدهٔ B مسیر قطع می‌شود: استقلال برقرار است ✓', 'a', 'بدون مشاهده، اثر A از راه B به C می‌رسد: وابستگی برقرار است.');
  trio('t-fork', 'tc-fork', 'fork', 'با مشاهدهٔ B، علت مشترک حذف می‌شود: استقلال برقرار است ✓', 'a', 'بدون مشاهده، علت مشترک A و C را هم‌بسته می‌کند: وابستگی برقرار است.');
  trio('t-coll', 'tc-coll', 'coll', 'با مشاهدهٔ B، دو علتِ رقیب وابسته می‌شوند: وابستگی باقی می‌ماند ✗ (توجیه‌کنندهٔ ظاهری)', 'bad', 'بدون مشاهده، A و C مستقل‌اند: استقلال برقرار است.');
  // Bayes calculator (tab ماشین‌حساب بیز)
  var bp = document.getElementById('b-prev'), bs = document.getElementById('b-sens'), bf = document.getElementById('b-fpr'),
    bpost = document.getElementById('b-post'), bmeter = document.getElementById('b-meter'), bnum = document.getElementById('b-num'),
    bden = document.getElementById('b-den'), bsubst = document.getElementById('b-subst'), bcap = document.getElementById('b-cap'),
    breset = document.getElementById('b-reset'), bpv = document.getElementById('b-prevv'), bsv = document.getElementById('b-sensv'), bfv = document.getElementById('b-fprv');
  if (bp && bs && bf && bpost && bmeter && bnum && bden && bsubst && bcap && breset) {
    function fa(x) { return String(x).replace(/[0-9]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[+d]; }).replace(/\./g, '٫'); }
    function upd() {
      var p = bp.value / 100, s = bs.value / 100, f = bf.value / 100;
      var num = s * p, den = num + f * (1 - p), post = num / den;
      bmeter.style.width = Math.min(100, post * 100) + '%';
      bmeter.style.background = css('--a');
      bpost.textContent = fa((post * 100).toFixed(2)) + '٪';
      bnum.textContent = fa(num.toFixed(4));
      bden.textContent = fa(den.toFixed(4));
      bsubst.textContent = s.toFixed(2) + ' × ' + p.toFixed(2) + ' ÷ (' + s.toFixed(2) + ' × ' + p.toFixed(2) + ' + ' + f.toFixed(2) + ' × ' + (1 - p).toFixed(2) + ') = ' + post.toFixed(3);
      bcap.textContent = 'از هر ۱۰۰ نتیجهٔ مثبت، حدود ' + fa(String(Math.round(post * 100))) + ' مورد مربوط به فرد بیمار است (بر اساس این مدل).';
      if (bpv) bpv.textContent = fa(bp.value) + '٪';
      if (bsv) bsv.textContent = fa(bs.value) + '٪';
      if (bfv) bfv.textContent = fa(bf.value) + '٪';
    }
    bp.addEventListener('input', upd);
    bs.addEventListener('input', upd);
    bf.addEventListener('input', upd);
    breset.addEventListener('click', function () { bp.value = '1'; bs.value = '90'; bf.value = '5'; upd(); });
    document.addEventListener('themechange', function () { bmeter.style.background = css('--a'); });
    upd();
  }
  document.addEventListener('themechange', function () { painters.forEach(function (f) { f(); }); });
  painters.forEach(function (f) { f(); });
})();
