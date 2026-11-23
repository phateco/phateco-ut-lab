/* ============ Specimens: calibration blocks, plates, welds ============ */
(function (UT) {
  const D2R = UT.D2R;
  const S = UT.SPEC = {};

  function arcPts(cx, cz, r, a0, a1, n) { // angles in deg, 0 = +x, 90 = +z(down)
    const out = [];
    for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * D2R; out.push([cx + r * Math.cos(a), cz + r * Math.sin(a)]); }
    return out;
  }

  // ---------------- transform per face ----------------
  function xf(face, f) {
    if (!face.map || face.map === 'top') return f;
    const g = Object.assign({}, f);
    if (face.map === 'bottom') {
      g.z = face.T - f.z;
      if (f.nA !== undefined) g.nA = -f.nA;
      g.cornerBottom = f.cornerTop; g.cornerTop = f.cornerBottom;
    } else if (face.map === 'side') { // probe on vertical face at x = face.X, looking toward -x
      g.x = f.z; g.z = face.X - f.x;
      if (f.nA !== undefined) g.nA = Math.atan2(-Math.cos(f.nA), Math.sin(f.nA));
      g.cornerBottom = g.cornerTop = false;
    }
    return g;
  }

  UT.computeEchoes = function (spec, probe, truth, pos) {
    const face = spec.faces[pos.face] || spec.faces[Object.keys(spec.faces)[0]];
    const bm = UT.beam(probe, truth);
    const isAngle = probe.type === 'angle';
    const xi = isAngle ? pos.x - pos.fx * truth.X : pos.x;
    const ctx = { probe, truth, bm, xi, yi: pos.y, fx: pos.fx, skew: (pos.skew || 0) * D2R, T: face.T, legs: face.legs || 3, spec, face, pos };
    // coupling
    let coupled = false;
    const half = isAngle ? null : probe.D / 2 + 2;
    for (const r of face.surf) {
      if (isAngle) {
        const back = pos.x - pos.fx * probe.len;
        const lo = Math.min(back, pos.x), hi = Math.max(back, pos.x);
        if (lo >= r[0] - 3 && hi <= r[1] + 3) coupled = true;
      } else if (xi - half * 0.4 >= r[0] - 1 && xi + half * 0.4 <= r[1] + 1) coupled = true;
    }
    if (spec.width && (pos.y < 2 || pos.y > spec.width - 2)) coupled = false;
    if (isAngle && face.straightOnly) coupled = false;
    if (!isAngle && face.angleOnly) coupled = false;
    const out = [];
    if (!coupled) return { echoes: out, coupled, ctx };
    for (const f0 of spec.features) {
      if (f0.faces && f0.faces.indexOf(pos.face) < 0) continue;
      const f = xf(face, f0);
      if (f.kind === 'sdh') UT.echoSDH(ctx, f, out);
      else if (f.kind === 'point') UT.echoPoint(ctx, f, out);
      else if (f.kind === 'facet') UT.echoFacet(ctx, f, out);
    }
    if (spec.extra) spec.extra(ctx, out, face);
    const tl = UT.fromdB(-(spec.transferLoss || 0));
    for (const e of out) e.p *= tl;
    return { echoes: out, coupled, ctx };
  };

  // ======================= V1 (ISO 2400 / IIW type 1, simplified) =======================
  // section 300 x 100 (depth), thickness (extrusion) 25 mm
  (function () {
    const outline = [[0, 0], [300, 0]].concat(arcPts(200, 0, 100, 0, 90, 30)).concat([[0, 100]]);
    S.V1 = {
      id: 'V1', name: 'Mẫu V1 (ISO 2400) – mặt trên, chiều sâu 100 mm', short: 'V1', kind: 'block', width: 25,
      outline, holes: [{ x: 88, z: 35, r: 25, label: 'Ø50' }, { x: 35, z: 85, r: 0.75, label: 'Ø1,5' }],
      bounds: { x0: -30, x1: 330, z0: -40, z1: 112 },
      faces: { top: { name: 'Mặt trên', surf: [[0, 300]], T: 100, legs: 1 } },
      features: [
        { kind: 'sdh', id: 'Ø50', x: 88, z: 35, d: 50 },
        { kind: 'sdh', id: 'Ø1,5', x: 35, z: 85, d: 1.5 },
        { kind: 'facet', id: 'Góc đáy trái', x: 0, z: 85, hh: 15, nA: 0, y1: -1, y2: 26, cornerBottom: true, refl: 0.9 },
      ],
      marks: [
        { type: 'slot', x: 200, label: 'Tâm R100' },
        { type: 'angleScale', hole: [35, 85], from: 35, to: 70, step: 5, side: -1, label: 'thang lỗ Ø1,5' },
        { type: 'angleScale', hole: [88, 35], from: 60, to: 76, step: 2, side: -1, label: 'Ø50', row2: true },
      ],
      extra(ctx, out) {
        const { probe, truth, bm, xi } = ctx;
        if (probe.type === 'angle') {
          if (ctx.fx > 0) { // toward R100
            const e = xi - 200, th = bm.theta;
            const w = 100 * Math.tan(bm.g6) + probe.D * 0.35;
            const loss = UT.lossG((e * Math.cos(th)) / w);
            const S1 = 100 - e * Math.sin(th);
            const p0 = UT.BW(bm, S1) * UT.attn(bm, S1) * 0.95 * loss;
            out.push({ S: S1, p: p0, src: 'R100' });
            out.push({ S: S1 + 100, p: p0 * 0.32, src: 'R100' });
            out.push({ S: S1 + 200, p: p0 * 0.1, src: 'R100' });
          }
        } else {
          // straight probe from top
          if (xi < 200) {
            const shadow = Math.abs(xi - 88) < 25 + probe.D / 2 ? UT.clamp((Math.abs(xi - 88) - 20) / (probe.D), 0, 1) : 1;
            UT.echoBackwall(ctx, 100, out, shadow, 4, 'đáy 100');
          } else if (xi < 300) {
            const tilt = Math.asin(UT.clamp((xi - 200) / 100, 0, 1));
            const dep = Math.sqrt(Math.max(0, 1e4 - (xi - 200) * (xi - 200)));
            const p = UT.BW(bm, dep) * UT.attn(bm, dep) * UT.lossG(2 * tilt / bm.g6);
            out.push({ S: dep, p, src: 'cung R100' });
          }
        }
      }
    };
    // V1 lying on its 25 mm face (thickness calibration)
    S.V1s = {
      id: 'V1s', name: 'Mẫu V1 – đặt đầu dò trên mặt bên (dày 25 mm)', short: 'V1·25', kind: 'block', width: 100,
      outline: [[0, 0], [300, 0], [300, 25], [0, 25]], holes: [],
      bounds: { x0: -20, x1: 320, z0: -40, z1: 40 },
      faces: { top: { name: 'Mặt bên', surf: [[0, 300]], T: 25, legs: 1, straightOnly: true } },
      features: [],
      extra(ctx, out) { if (ctx.probe.type !== 'angle') UT.echoBackwall(ctx, 25, out, 1, 9, 'đáy 25'); }
    };
    // Resolution notch area: three reflecting faces at 85 / 91 / 100
    S.V1r = {
      id: 'V1r', name: 'Mẫu V1 – vị trí kiểm tra độ phân giải (85 / 91 / 100 mm)', short: 'V1·phân giải', kind: 'block', width: 25,
      outline: [[0, 0], [60, 0], [60, 100], [33, 100], [33, 91], [27, 91], [27, 85], [0, 85]], holes: [],
      bounds: { x0: -20, x1: 80, z0: -40, z1: 112 },
      faces: { top: { name: 'Mặt đầu', surf: [[0, 60]], T: 100, legs: 1, straightOnly: true } },
      features: [],
      extra(ctx, out) {
        if (ctx.probe.type === 'angle') return;
        const xi = ctx.xi, r = ctx.probe.D / 2 + 1.5;
        const segs = [[0, 27, 85], [27, 33, 91], [33, 60, 100]];
        for (const s of segs) {
          const ov = Math.max(0, Math.min(xi + r, s[1]) - Math.max(xi - r, s[0])) / (2 * r);
          if (ov > 0) out.push({ S: s[2], p: UT.BW(ctx.bm, s[2]) * UT.attn(ctx.bm, s[2]) * Math.sqrt(ov) * 0.9, src: s[2] + ' mm' });
        }
      }
    };
  })();

  // ======================= V2 (ISO 7963, simplified) =======================
  (function () {
    const outline = [[-50, 0], [25, 0]].concat(arcPts(0, 0, 25, 0, 90, 16)).concat([[0, 50]]).concat(arcPts(0, 0, 50, 90, 180, 24));
    S.V2 = {
      id: 'V2', name: 'Mẫu V2 (ISO 7963) – R25 / R50, dày 12,5 mm', short: 'V2', kind: 'block', width: 12.5,
      outline, holes: [],
      bounds: { x0: -70, x1: 50, z0: -40, z1: 60 },
      faces: { top: { name: 'Mặt trên', surf: [[-50, 25]], T: 50, legs: 1, angleOnly: true } },
      features: [],
      marks: [{ type: 'slot', x: 0, label: 'Tâm R25/R50' }],
      extra(ctx, out) {
        const { probe, bm, xi } = ctx;
        if (probe.type !== 'angle') return;
        const e = xi, th = bm.theta;
        if (ctx.fx > 0) {
          const w = 25 * Math.tan(bm.g6) + probe.D * 0.3;
          const loss = UT.lossG((e * Math.cos(th)) / w);
          const S1 = 25 - e * Math.sin(th);
          const p0 = UT.BW(bm, S1) * UT.attn(bm, S1) * 0.9 * loss;
          out.push({ S: S1, p: p0, src: 'R25' }, { S: S1 + 75, p: p0 * 0.45, src: 'R25→R50' }, { S: S1 + 150, p: p0 * 0.16, src: 'R25' });
        } else {
          const w = 50 * Math.tan(bm.g6) + probe.D * 0.3;
          const loss = UT.lossG((e * Math.cos(th)) / w);
          const S1 = 50 + e * Math.sin(th);
          const p0 = UT.BW(bm, S1) * UT.attn(bm, S1) * 0.9 * loss;
          out.push({ S: S1, p: p0, src: 'R50' }, { S: S1 + 75, p: p0 * 0.4, src: 'R50→R25' }, { S: S1 + 150, p: p0 * 0.14, src: 'R50' });
        }
      }
    };
  })();

  // ======================= ASME basic calibration block (T-434.2) =======================
  S.makeDACBlock = function (T) {
    const d = T <= 19 ? 2.4 : 3.2;
    const L = 300, W = 60;
    const holes = [{ x: 120, z: T / 4, d, id: '¼T' }, { x: 150, z: T / 2, d, id: '½T' }, { x: 180, z: 3 * T / 4, d, id: '¾T' }];
    const nd = Math.max(0.4, 0.02 * T);
    return {
      id: 'DAC' + T, name: 'Mẫu chuẩn cơ bản ASME (T-434.2) T = ' + T + ' mm, lỗ Ø' + String(d).replace('.', ',') + ' mm', short: 'DAC ' + T, kind: 'block', width: W, T, holeD: d,
      outline: [[0, 0], [L, 0], [L, T], [0, T]],
      holes: holes.map(h => ({ x: h.x, z: h.z, r: d / 2, label: h.id })),
      notches: [{ x: 40, z0: T - nd, z1: T, label: 'Rãnh đáy' }, { x: 260, z0: 0, z1: nd, label: 'Rãnh mặt' }],
      bounds: { x0: -15, x1: L + 15, z0: -40, z1: T + 20 },
      faces: { top: { name: 'Mặt kiểm', surf: [[0, L]], T, legs: 3 } },
      features: holes.map(h => ({ kind: 'sdh', id: 'Lỗ ' + h.id, x: h.x, z: h.z, d })).concat([
        { kind: 'facet', id: 'Rãnh đáy', x: 40, z: T - nd / 2, hh: nd / 2, nA: 0, y1: 10, y2: 50, cornerBottom: true, refl: 1.4 },
        { kind: 'facet', id: 'Rãnh mặt', x: 260, z: nd / 2, hh: nd / 2, nA: 0, y1: 10, y2: 50, cornerTop: true, refl: 1.4 },
      ]),
      marks: holes.map(h => ({ type: 'tick', x: h.x, label: h.id })),
      extra(ctx, out) { if (ctx.probe.type !== 'angle') UT.echoBackwall(ctx, T, out, 1, 5, 'đáy'); }
    };
  };
  S.DAC19 = S.makeDACBlock(19);
  S.DAC38 = S.makeDACBlock(38);

  // ======================= Thickness specimens =======================
  (function () {
    const steps = [5, 10, 15, 20, 25];
    const outline = [[0, 0], [100, 0], [100, 25], [80, 25], [80, 20], [60, 20], [60, 15], [40, 15], [40, 10], [20, 10], [20, 5], [0, 5]];
    const thkAt = (x) => x < 0 || x > 100 ? 0 : steps[Math.min(4, Math.floor(x / 20))];
    S.STEP = {
      id: 'STEP', name: 'Mẫu bậc chuẩn chiều dày 5 – 10 – 15 – 20 – 25 mm', short: 'Mẫu bậc', kind: 'block', width: 30,
      outline, holes: [], bounds: { x0: -10, x1: 110, z0: -30, z1: 35 },
      faces: { top: { name: 'Mặt trên', surf: [[0, 100]], T: 25, legs: 1, straightOnly: true } },
      features: [], marks: steps.map((s, i) => ({ type: 'tick', x: i * 20 + 10, label: s + ' mm' })), thkAt,
      extra(ctx, out) { thicknessEchoes(ctx, out, thkAt, 0); }
    };
    // corroded plate, nominal 12 mm
    const pits = [{ x: 62, d: 2.1, w: 5 }, { x: 150, d: 4.3, w: 3.5 }, { x: 156, d: 2.0, w: 6 }, { x: 236, d: 1.2, w: 22 }];
    const tNom = 12.0;
    const thk = (x) => {
      if (x < 0 || x > 300) return 0;
      let t = tNom - 0.25 * Math.sin(x / 23) - 0.15 * Math.sin(x / 7.3);
      for (const p of pits) t -= p.d * Math.exp(-((x - p.x) * (x - p.x)) / (2 * p.w * p.w));
      return t;
    };
    const pts = [{ id: 'A', x: 25 }, { id: 'B', x: 62 }, { id: 'C', x: 152, zone: [135, 170] }, { id: 'D', x: 200 }, { id: 'E', x: 236 }];
    const outline2 = [[0, 0], [300, 0]];
    for (let x = 300; x >= 0; x -= 1) outline2.push([x, thk(x)]);
    S.CORR = {
      id: 'CORR', name: 'Tấm ăn mòn danh nghĩa 12 mm (ăn mòn mặt trong)', short: 'Tấm ăn mòn', kind: 'plate', width: 60,
      outline: outline2, holes: [], bounds: { x0: -10, x1: 310, z0: -30, z1: 22 },
      faces: { top: { name: 'Mặt ngoài', surf: [[0, 300]], T: 12, legs: 1, straightOnly: true } },
      features: [], thkAt: thk, points: pts, transferLoss: 1,
      marks: pts.map(p => ({ type: 'point', x: p.x, label: p.id, zone: p.zone })),
      extra(ctx, out) { thicknessEchoes(ctx, out, thk, 0.5); }
    };
    function thicknessEchoes(ctx, out, f, grain) {
      if (ctx.probe.type === 'angle') return;
      const r = ctx.probe.type === 'tr' ? 2.6 : ctx.probe.D * 0.35;
      const n = 9;
      const vp = ctx.truth.vpath || 0;
      for (let k = 0; k < n; k++) {
        const x = ctx.xi - r + 2 * r * k / (n - 1);
        const t = f(x); if (t <= 0) continue;
        const sl = (f(x + 0.4) - f(x - 0.4)) / 0.8;
        const tilt = Math.atan(Math.abs(sl));
        const w = UT.lossG(tilt / 0.12) / n;
        const Sapp = vp ? Math.sqrt(t * t + vp * vp) : t;
        const amp = UT.BW(ctx.bm, Sapp) * UT.attn(ctx.bm, Sapp) * w * (ctx.probe.type === 'tr' ? 1.4 : 1);
        out.push({ S: Sapp, p: amp, src: 'đáy' });
        out.push({ S: 2 * Sapp + 0.3, p: amp * 0.42, src: 'đáy 2' });
        if (ctx.probe.type !== 'tr') out.push({ S: 3 * t, p: amp * 0.2, src: 'đáy 3' });
      }
    }
  })();

  // ======================= Weld specimens =======================
  // flaw library helpers -> features
  function planar(id, type, pts, y1, y2, opt, rng) {
    // pts: [[x,z],[x,z]] segment, split into facets with jitter
    opt = opt || {};
    const [a, b] = pts;
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = opt.n || Math.max(1, Math.round(L / 1.6));
    const base = Math.atan2(b[1] - a[1], b[0] - a[0]) + Math.PI / 2; // normal
    const out = [];
    for (let i = 0; i < n; i++) {
      const t0 = (i + 0.5) / n;
      const jit = (opt.jit || 0) * (rng() - 0.5) * 2 * D2R;
      const off = (opt.off || 0) * (rng() - 0.5) * 2;
      out.push({
        kind: 'facet', id, type, x: a[0] + (b[0] - a[0]) * t0 + off, z: a[1] + (b[1] - a[1]) * t0,
        hh: L / n / 2 + 0.15, nA: base + jit, y1: y1 + (opt.yj ? (rng() - 0.5) * opt.yj : 0), y2: y2 + (opt.yj ? (rng() - 0.5) * opt.yj : 0),
        refl: (opt.refl || 1) * 1.25, tip: opt.tip, faces: opt.faces,
        cornerBottom: !!(opt.cornerBottom && i === n - 1), cornerTop: !!(opt.cornerTop && i === 0)
      });
    }
    return out;
  }

  S.FLAW_TYPES = {
    crack: { name: 'Nứt', en: 'Crack', color: '#ff4d6d' },
    lof: { name: 'Không ngấu vách', en: 'Lack of sidewall fusion', color: '#ffb020' },
    lop: { name: 'Không thấu', en: 'Incomplete penetration', color: '#c77dff' },
    slag: { name: 'Ngậm xỉ', en: 'Slag inclusion', color: '#4cc9f0' },
    pore: { name: 'Rỗ khí', en: 'Porosity', color: '#80ed99' },
  };

  // flaw descriptor -> features. d = {type, y1, y2, ...geometry}
  function flawFeatures(d, spec) {
    const rng = UT.rng(d.seed || 7);
    const id = d.id;
    if (d.type === 'pore') {
      const out = [];
      for (let i = 0; i < d.n; i++) out.push({ kind: 'point', id, type: 'pore', x: d.x + (rng() - 0.5) * d.sx, z: d.z + (rng() - 0.5) * d.sz, y: d.y1 + rng() * (d.y2 - d.y1), d: 0.8 + rng() * (d.dmax - 0.8), faces: d.faces });
      return out;
    }
    if (d.type === 'slag') {
      const out = [];
      for (let i = 0; i < 4; i++) out.push({ kind: 'facet', id, type: 'slag', x: d.x + (rng() - 0.5) * 1.2, z: d.z + (rng() - 0.5) * d.h, hh: d.h / 3 + 0.2, nA: rng() * Math.PI, y1: d.y1 + rng() * 3, y2: d.y2 - rng() * 3, refl: 1.1, tip: 0.12, faces: d.faces });
      return out;
    }
    if (d.type === 'crack') return planar(id, 'crack', d.seg, d.y1, d.y2, { jit: 18, off: 0.6, n: Math.max(3, Math.round(Math.hypot(d.seg[1][0] - d.seg[0][0], d.seg[1][1] - d.seg[0][1]) / 1.3)), cornerBottom: d.cornerBottom, cornerTop: d.cornerTop, tip: 0.07, yj: 4, faces: d.faces }, rng);
    if (d.type === 'lof') return planar(id, 'lof', d.seg, d.y1, d.y2, { jit: 3, n: 2, faces: d.faces, refl: 1.0 }, rng);
    if (d.type === 'lop') return planar(id, 'lop', d.seg, d.y1, d.y2, { jit: d.jit || 4, n: d.n || 2, cornerBottom: d.cornerBottom, cornerTop: d.cornerTop, faces: d.faces, tip: d.tip }, rng);
    return [];
  }
  S.flawFeatures = flawFeatures;

  // --------- geometry builders ---------
  function singleV(T) {
    const g = 2, rf = 1.5, b = 30 * D2R;
    const xt = g / 2 + (T - rf) * Math.tan(b); // half width at top
    const capH = 2.0, capW = xt + 2.5, rootW = g / 2 + 1.8, rootH = 1.6;
    const weld = [[-capW, 0]];
    for (let i = 1; i < 10; i++) { const t = i / 10; weld.push([-capW + 2 * capW * t, -capH * Math.sin(Math.PI * t)]); }
    weld.push([capW, 0], [xt, 0], [g / 2, T - rf], [g / 2, T], [rootW, T]);
    for (let i = 1; i < 6; i++) { const t = i / 6; weld.push([rootW - 2 * rootW * t, T + rootH * Math.sin(Math.PI * t)]); }
    weld.push([-rootW, T], [-g / 2, T], [-g / 2, T - rf], [-xt, 0]);
    const fusionL = [[-xt, 0], [-g / 2, T - rf]], fusionR = [[xt, 0], [g / 2, T - rf]];
    return { T, g, rf, b, xt, capW, rootW, weld, fusionL, fusionR };
  }
  function doubleV(T) {
    const g = 2, rf = 2, b = 30 * D2R, m = T / 2;
    const xt = g / 2 + (m - rf / 2) * Math.tan(b);
    const capH = 2, capW = xt + 2.5;
    const weld = [[-capW, 0]];
    for (let i = 1; i < 10; i++) { const t = i / 10; weld.push([-capW + 2 * capW * t, -capH * Math.sin(Math.PI * t)]); }
    weld.push([capW, 0], [xt, 0], [g / 2, m - rf / 2], [g / 2, m + rf / 2], [xt, T], [capW, T]);
    for (let i = 1; i < 10; i++) { const t = i / 10; weld.push([capW - 2 * capW * t, T + capH * Math.sin(Math.PI * t)]); }
    weld.push([-capW, T], [-xt, T], [-g / 2, m + rf / 2], [-g / 2, m - rf / 2], [-xt, 0]);
    return { T, g, rf, b, xt, capW, m, weld };
  }

  function weldPlate(cfg) {
    const L = 300, half = 150;
    const spec = {
      id: cfg.id, name: cfg.name, short: cfg.short, kind: 'weld', width: L, T: cfg.T, geo: cfg.geo, joint: cfg.joint,
      outline: cfg.outline || [[-half, 0], [half, 0], [half, cfg.T], [-half, cfg.T]],
      weld: cfg.geo.weld, holes: [],
      bounds: cfg.bounds || { x0: -half - 10, x1: half + 10, z0: -40, z1: cfg.T + 20 },
      faces: cfg.faces, transferLoss: cfg.transferLoss || 3,
      flaws: [], features: [], geoFeatures: cfg.geoFeatures || [], extra: cfg.extra,
      setFlaws(list) {
        this.flaws = list;
        let fs = [];
        list.forEach((d, i) => { d.id = d.id || ('F' + (i + 1)); fs = fs.concat(flawFeatures(d, this)); });
        this.features = fs.concat(this.geoFeatures);
      }
    };
    spec.setFlaws([]);
    return spec;
  }

  // ---- S1 single V, T = 20
  S.makeS1 = function () {
    const T = 20, G = singleV(T);
    const geoF = [
      { kind: 'facet', id: 'geo', type: 'geo', x: G.rootW, z: T - 0.7, hh: 0.8, nA: 0, y1: 0, y2: 300, cornerBottom: true, refl: 0.9 },
      { kind: 'facet', id: 'geo', type: 'geo', x: -G.rootW, z: T - 0.7, hh: 0.8, nA: 0, y1: 0, y2: 300, cornerBottom: true, refl: 0.9 },
      { kind: 'facet', id: 'geo', type: 'geo', x: G.capW, z: 0.6, hh: 0.7, nA: 0, y1: 0, y2: 300, cornerTop: true, refl: 0.7 },
      { kind: 'facet', id: 'geo', type: 'geo', x: -G.capW, z: 0.6, hh: 0.7, nA: 0, y1: 0, y2: 300, cornerTop: true, refl: 0.7 },
    ];
    return weldPlate({
      id: 'S1', name: 'S1 – Mối hàn giáp mối vát V đơn, t = 20 mm', short: 'V đơn 20', T, geo: G, joint: 'V',
      faces: { top: { name: 'Mặt A (mặt vát)', surf: [[-150, -G.capW - 0.5], [G.capW + 0.5, 150]], T, legs: 3 } },
      geoFeatures: geoF, transferLoss: 3
    });
  };
  S.presetS1 = function (sp) {
    const G = sp.geo, T = sp.T;
    const lofSeg = [[G.xt - 0.9 * (G.xt - G.g / 2) * 0.35, T * 0.35 * 0.9], [G.xt - (G.xt - G.g / 2) * 0.65, T * 0.62]];
    // compute points on right fusion line between z=7 and z=12
    const fx = (z) => G.xt - (G.xt - G.g / 2) * z / (T - G.rf);
    return [
      { type: 'lof', y1: 35, y2: 62, seg: [[fx(6), 6], [fx(10), 10]], seed: 11 },
      { type: 'pore', y1: 95, y2: 110, x: -1, z: 9, sx: 5, sz: 5, n: 9, dmax: 2.2, seed: 12 },
      { type: 'lop', y1: 145, y2: 180, seg: [[-G.g / 2, T - G.rf - 0.4], [-G.g / 2, T]], cornerBottom: true, seed: 13 },
      { type: 'slag', y1: 205, y2: 222, x: -3.5, z: 12, h: 1.6, seed: 14 },
      { type: 'crack', y1: 250, y2: 272, seg: [[0.3, 7], [-0.2, 15]], seed: 15 },
    ];
  };

  // ---- S2 double V, T = 30
  S.makeS2 = function () {
    const T = 30, G = doubleV(T);
    const geoF = [
      { kind: 'facet', id: 'geo', type: 'geo', x: G.capW, z: T - 0.6, hh: 0.7, nA: 0, y1: 0, y2: 300, cornerBottom: true, refl: 0.8 },
      { kind: 'facet', id: 'geo', type: 'geo', x: -G.capW, z: T - 0.6, hh: 0.7, nA: 0, y1: 0, y2: 300, cornerBottom: true, refl: 0.8 },
      { kind: 'facet', id: 'geo', type: 'geo', x: G.capW, z: 0.6, hh: 0.7, nA: 0, y1: 0, y2: 300, cornerTop: true, refl: 0.7 },
      { kind: 'facet', id: 'geo', type: 'geo', x: -G.capW, z: 0.6, hh: 0.7, nA: 0, y1: 0, y2: 300, cornerTop: true, refl: 0.7 },
    ];
    return weldPlate({
      id: 'S2', name: 'S2 – Mối hàn giáp mối vát V kép (X), t = 30 mm', short: 'V kép 30', T, geo: G, joint: 'X',
      faces: {
        top: { name: 'Mặt A', surf: [[-150, -G.capW - 0.5], [G.capW + 0.5, 150]], T, legs: 3 },
        bottom: { name: 'Mặt B (mặt dưới)', map: 'bottom', surf: [[-150, -G.capW - 0.5], [G.capW + 0.5, 150]], T, legs: 3 }
      },
      geoFeatures: geoF, transferLoss: 2.5
    });
  };
  S.presetS2 = function (sp) {
    const G = sp.geo, T = sp.T;
    const fxU = (z) => G.xt - (G.xt - G.g / 2) * z / (G.m - G.rf / 2); // upper right fusion
    return [
      { type: 'crack', y1: 30, y2: 58, seg: [[0.2, 3], [-0.3, 11]], seed: 21 },
      { type: 'lop', y1: 85, y2: 120, seg: [[0.4, G.m - 1.6], [-0.4, G.m + 1.6]], n: 3, jit: 22, tip: 0.12, seed: 22 },
      { type: 'lof', y1: 150, y2: 175, seg: [[-fxU(4), 4], [-fxU(9), 9]], seed: 23 },
      { type: 'slag', y1: 200, y2: 230, x: 2.5, z: 21, h: 1.8, seed: 24 },
      { type: 'pore', y1: 255, y2: 268, x: 0, z: 8, sx: 5, sz: 4, n: 7, dmax: 2.0, seed: 25 },
    ];
  };

  // ---- S3 T-joint: web t=16 (horizontal), flange 20 (vertical at x 0..20)
  S.makeS3 = function () {
    const t = 16, F = 20;
    const weld = [[-15, 0], [0, -6], [0, t + 6], [-15, t], [-9, t], [-2, 9], [-2, 7], [-9, 0]];
    const outline = [[-150, 0], [0, 0], [0, -60], [F, -60], [F, t + 60], [0, t + 60], [0, t], [-150, t]];
    const geo = { T: t, F, weld, capW: 15 };
    const geoF = [
      { kind: 'facet', id: 'geo', type: 'geo', x: -15, z: t - 0.6, hh: 0.7, nA: 0, y1: 0, y2: 300, cornerBottom: true, refl: 0.7, faces: ['A', 'B'] },
      { kind: 'facet', id: 'geo', type: 'geo', x: -15, z: 0.6, hh: 0.7, nA: 0, y1: 0, y2: 300, cornerTop: true, refl: 0.7, faces: ['A', 'B'] },
    ];
    const sp = weldPlate({
      id: 'S3', name: 'S3 – Mối hàn chữ T ngấu hoàn toàn (vát K), bản bụng 16 mm, bản cánh 20 mm', short: 'Chữ T 16/20', T: t, geo, joint: 'T',
      outline, bounds: { x0: -110, x1: 40, z0: -70, z1: t + 70 },
      faces: {
        A: { name: 'Mặt A (trên bản bụng)', surf: [[-150, -15.5]], T: t, legs: 3, angleOnly: true },
        B: { name: 'Mặt B (dưới bản bụng)', map: 'bottom', surf: [[-150, -15.5]], T: t, legs: 3, angleOnly: true },
        D: { name: 'Mặt D (mặt ngoài bản cánh)', map: 'side', X: F, surf: [[-58, t + 58]], T: null, legs: 1, straightOnly: true },
      },
      geoFeatures: geoF, transferLoss: 3,
      extra(ctx, out, face) {
        if (face.map !== 'side') return;
        // back wall of flange (inner face x=0) except where fused (z in -6..22)
        const u = ctx.xi, r = ctx.probe.D / 2 + 1;
        const lo = -6, hi = t + 6;
        const ov = Math.max(0, Math.min(u + r, hi) - Math.max(u - r, lo)) / (2 * r);
        let frac = 1 - ov;
        // LOF on flange face re-opens the interface: handled by facets
        UT.echoBackwall(ctx, F, out, frac, 5, 'mặt trong bản cánh');
        // through-web echo (far end of web) when beam in web band
        const ovw = Math.max(0, Math.min(u + r, t) - Math.max(u - r, 0)) / (2 * r);
        if (ovw > 0) out.push({ S: F + 2 + 150, p: UT.BW(ctx.bm, 172) * UT.attn(ctx.bm, 172) * ovw * 0.5, src: 'đầu bản bụng' });
      }
    });
    // T-joint: face 'A'/'B' map to top/bottom of web; features in global coords
    sp.faces.A.map = 'top';
    return sp;
  };
  S.presetS3 = function (sp) {
    const t = 16;
    return [
      { type: 'lof', y1: 30, y2: 70, seg: [[0, -4], [0, 4]], seed: 31, faces: ['A', 'B', 'D'] },
      { type: 'lop', y1: 100, y2: 135, seg: [[-2, 7], [-2, 9]], n: 1, seed: 32 },
      { type: 'slag', y1: 165, y2: 185, x: -5, z: 11, h: 1.5, seed: 33 },
      { type: 'pore', y1: 215, y2: 230, x: -6, z: 5, sx: 4, sz: 3, n: 8, dmax: 1.8, seed: 34 },
      { type: 'lof', y1: 250, y2: 280, seg: [[-9 + 1.5, t - 1.5], [-2 - 0.5, 9.5]], seed: 35 },
    ];
  };

  // random flaw generator for exam mode
  S.randomFlaws = function (sp, seed) {
    const r = UT.rng(seed);
    const types = ['crack', 'lof', 'lop', 'slag', 'pore'];
    const n = 3 + Math.floor(r() * 2);
    const chosen = [];
    const pool = types.slice();
    for (let i = 0; i < n; i++) { const k = Math.floor(r() * pool.length); chosen.push(pool.splice(k, 1)[0]); if (!pool.length) pool.push(...types); }
    const out = [];
    let y = 20 + r() * 15;
    const G = sp.geo, T = sp.T;
    for (const ty of chosen) {
      const len = ty === 'pore' ? 6 + r() * 12 : (ty === 'slag' ? 5 + r() * 18 : 8 + r() * 30);
      const y1 = y, y2 = y + len; y = y2 + 25 + r() * 25;
      if (y2 > 285) break;
      const side = r() < 0.5 ? -1 : 1;
      const sd = Math.floor(r() * 1e6);
      if (sp.joint === 'V') {
        const fx = (z) => G.xt - (G.xt - G.g / 2) * z / (T - G.rf);
        if (ty === 'crack') { const root = r() < 0.4; out.push(root ? { type: 'crack', y1, y2, seg: [[0.3, T - 4 - r() * 3], [0, T]], cornerBottom: true, seed: sd } : { type: 'crack', y1, y2, seg: [[0.3, 4 + r() * 4], [-0.2, 12 + r() * 4]], seed: sd }); }
        if (ty === 'lof') { const z1 = 3 + r() * 9, h = 2.5 + r() * 2.5; out.push({ type: 'lof', y1, y2, seg: [[side * fx(z1), z1], [side * fx(z1 + h), z1 + h]], seed: sd }); }
        if (ty === 'lop') out.push({ type: 'lop', y1, y2, seg: [[side * G.g / 2, T - G.rf - 0.4], [side * G.g / 2, T]], cornerBottom: true, seed: sd });
        if (ty === 'slag') out.push({ type: 'slag', y1, y2, x: side * (1 + r() * 3), z: 6 + r() * 9, h: 1 + r(), seed: sd });
        if (ty === 'pore') out.push({ type: 'pore', y1, y2, x: (r() - 0.5) * 4, z: 5 + r() * 10, sx: 4, sz: 4, n: 5 + Math.floor(r() * 6), dmax: 1.4 + r(), seed: sd });
      } else if (sp.joint === 'X') {
        const m = G.m;
        const fxU = (z) => G.xt - (G.xt - G.g / 2) * z / (m - G.rf / 2);
        if (ty === 'crack') { const z0 = 3 + r() * 18; out.push({ type: 'crack', y1, y2, seg: [[0.3, z0], [-0.2, z0 + 5 + r() * 4]], seed: sd }); }
        if (ty === 'lof') { const up = r() < 0.5; const z1 = 3 + r() * 8, h = 3 + r() * 2; const s = [[side * fxU(z1), z1], [side * fxU(z1 + h), z1 + h]]; out.push({ type: 'lof', y1, y2, seg: up ? s : s.map(p => [p[0], T - p[1]]), seed: sd }); }
        if (ty === 'lop') out.push({ type: 'lop', y1, y2, seg: [[0.4, m - 1.5], [-0.4, m + 1.5]], n: 3, jit: 22, tip: 0.12, seed: sd });
        if (ty === 'slag') out.push({ type: 'slag', y1, y2, x: side * (1 + r() * 4), z: 6 + r() * 18, h: 1 + r(), seed: sd });
        if (ty === 'pore') out.push({ type: 'pore', y1, y2, x: (r() - 0.5) * 4, z: 5 + r() * 20, sx: 4, sz: 4, n: 5 + Math.floor(r() * 6), dmax: 1.4 + r(), seed: sd });
      } else {
        if (ty === 'crack') out.push({ type: 'crack', y1, y2, seg: [[-1, 1 + r() * 3], [-1.4, 7 + r() * 4]], seed: sd });
        if (ty === 'lof') { if (r() < 0.5) { const z0 = -3 + r() * 12; out.push({ type: 'lof', y1, y2, seg: [[0, z0], [0, z0 + 5 + r() * 3]], seed: sd, faces: ['A', 'B', 'D'] }); } else out.push({ type: 'lof', y1, y2, seg: [[-7.5, 1.5], [-3, 6.5]], seed: sd }); }
        if (ty === 'lop') out.push({ type: 'lop', y1, y2, seg: [[-2, 7], [-2, 9]], n: 1, seed: sd });
        if (ty === 'slag') out.push({ type: 'slag', y1, y2, x: -3 - r() * 5, z: 3 + r() * 10, h: 1 + r(), seed: sd });
        if (ty === 'pore') out.push({ type: 'pore', y1, y2, x: -4 - r() * 4, z: 3 + r() * 10, sx: 3, sz: 3, n: 5 + Math.floor(r() * 5), dmax: 1.6, seed: sd });
      }
    }
    return out;
  };

  // summary geometry of a flaw descriptor (for answer key)
  S.flawBox = function (d) {
    if (d.type === 'pore') return { x: d.x, z0: d.z - d.sz / 2, z1: d.z + d.sz / 2, y1: d.y1, y2: d.y2 };
    if (d.type === 'slag') return { x: d.x, z0: d.z - d.h / 2, z1: d.z + d.h / 2, y1: d.y1, y2: d.y2 };
    const a = d.seg[0], b = d.seg[1];
    return { x: (a[0] + b[0]) / 2, z0: Math.min(a[1], b[1]), z1: Math.max(a[1], b[1]), y1: d.y1, y2: d.y2 };
  };
})(UT);
