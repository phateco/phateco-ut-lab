/* ============ UT physics engine (simplified, consistent) ============ */
var UT = window.UT = window.UT || {};
(function (UT) {
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  UT.D2R = D2R; UT.R2D = R2D;

  // ---------- helpers ----------
  UT.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  UT.dB = (r) => 20 * Math.log10(Math.max(r, 1e-9));
  UT.fromdB = (d) => Math.pow(10, d / 20);
  // gaussian loss where x = 1 gives -6 dB
  UT.lossG = (x) => Math.exp(-0.6908 * x * x); // 10^(-6x^2/20)
  // erf approximation
  UT.erf = function (x) {
    const s = x < 0 ? -1 : 1; x = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * x);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return s * y;
  };
  UT.rng = function (seed) {
    let a = seed >>> 0;
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  };
  UT.hash = function (a, b) {
    let h = (a * 374761393 + b * 668265263) | 0;
    h = (h ^ (h >>> 13)) * 1274126177 | 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };

  // ---------- material ----------
  UT.MAT = { vL: 5920, vS: 3240, attL: 0.003, attS: 0.006 };

  // ---------- probes ----------
  UT.PROBES = {
    P0: { id: 'P0', short: '0° 4 MHz', name: 'Đầu dò thẳng 0°, 4 MHz, Ø10 mm (sóng dọc)', type: 'straight', f: 4, D: 10, W: 10, nom: 0, mode: 'L', len: 16 },
    TR: { id: 'TR', short: 'TR 5 MHz', name: 'Đầu dò kép TR 5 MHz, Ø10 mm (đo chiều dày)', type: 'tr', f: 5, D: 10, W: 10, nom: 0, mode: 'L', len: 16 },
    A45: { id: 'A45', short: '45° 4 MHz', name: 'Đầu dò góc 45°, 4 MHz, 8×9 mm (sóng ngang)', type: 'angle', f: 4, D: 9, W: 8, nom: 45, mode: 'S', len: 26 },
    A60: { id: 'A60', short: '60° 4 MHz', name: 'Đầu dò góc 60°, 4 MHz, 8×9 mm (sóng ngang)', type: 'angle', f: 4, D: 9, W: 8, nom: 60, mode: 'S', len: 26 },
    A70: { id: 'A70', short: '70° 4 MHz', name: 'Đầu dò góc 70°, 4 MHz, 8×9 mm (sóng ngang)', type: 'angle', f: 4, D: 9, W: 8, nom: 70, mode: 'S', len: 26 },
  };

  // hidden "true" properties of each physical probe, seeded per learner
  UT.makeTruth = function (seed) {
    const r = UT.rng(seed);
    const t = {};
    for (const id in UT.PROBES) {
      const p = UT.PROBES[id];
      if (p.type === 'angle') {
        t[id] = { angle: p.nom + (r() < 0.5 ? -1 : 1) * (1.2 + r() * 1.3), X: 9.5 + r() * 5, delay: 7.2 + r() * 3.2 };
      } else if (p.type === 'tr') {
        t[id] = { angle: 0, X: 0, delay: 4.6 + r() * 1.6, vpath: 1.6 };
      } else {
        t[id] = { angle: 0, X: 0, delay: 0.25 + r() * 0.5 };
      }
    }
    return t;
  };

  UT.vel = (probe) => probe.mode === 'L' ? UT.MAT.vL : UT.MAT.vS;

  // beam parameters
  UT.beam = function (probe, truth) {
    const v = UT.vel(probe);
    const lam = v / (probe.f * 1000);           // mm
    let N = probe.D * probe.D / (4 * lam);
    if (probe.type === 'angle') N = Math.max(4, N * 0.75 - 6);
    if (probe.type === 'tr') N = 6;
    const g6 = Math.asin(Math.min(0.9, 0.51 * lam / probe.D));
    const g6w = Math.asin(Math.min(0.9, 0.51 * lam / probe.W));
    return { lam, N, g6, g6w, theta: truth.angle * D2R, v, att: probe.mode === 'L' ? UT.MAT.attL : UT.MAT.attS };
  };
  // relative back-wall pressure at distance S
  UT.BW = function (bm, S) {
    const Se = Math.sqrt(S * S + 0.25 * bm.N * bm.N);
    const nf = S < bm.N ? 0.55 + 0.45 * S / bm.N : 1;
    return Math.min(1, Math.PI * bm.N / (2 * Se)) * nf;
  };
  UT.attn = (bm, S) => Math.pow(10, -2 * bm.att * S / 20);
  UT.beamWidth = (bm, probe, S) => 2 * S * Math.tan(bm.g6) + probe.D * 0.45;
  UT.beamWidthW = (bm, probe, S) => 2 * S * Math.tan(bm.g6w) + probe.W * 0.45;

  // corner-trap efficiency for shear waves vs beam angle (deg)
  UT.cornerEff = function (thDeg, mode) {
    if (mode === 'L') return 0.5;
    if (thDeg < 30) return 0.25;
    if (thDeg <= 52) return 1.0;
    if (thDeg <= 62) return 1.0 - 0.04 * (thDeg - 52);
    return Math.max(0.15, 0.6 - 0.035 * (thDeg - 62));
  };

  /* ---------- Context for echo computation ----------
     ctx = { probe, truth, bm, xi, yi, fx (+1/-1 beam direction along x), skew (rad),
             T (thickness for skip, null => no skip), legs, transfer (dB loss) }
     All feature coordinates already in the LOCAL frame of the scanning face:
       x = along surface (beam plane), z = depth from surface, y = along weld/extrusion
  */
  function along(ctx, xf, yf) {
    // horizontal along-beam distance h and lateral offset l for a feature at (xf, yf)
    if (ctx.probe.type !== 'angle') {
      return { h: xf - ctx.xi, l: yf - ctx.yi, yb: ctx.yi };
    }
    const c = Math.cos(ctx.skew), s = Math.sin(ctx.skew);
    const dx = (xf - ctx.xi) * ctx.fx;
    const t = dx / Math.max(0.2, c);
    const yb = ctx.yi + t * s * ctx.fx;
    return { h: t, l: (yf - yb) * c, yb };
  }
  function legDepth(z, leg, T) { return leg === 1 ? z : (leg === 2 ? 2 * T - z : 2 * T + z); }
  function latCoverage(ctx, S, y1, y2, yb) {
    const w = 0.5 * UT.beamWidthW(ctx.bm, ctx.probe, S);
    const k = 1 / (w * 1.2);
    return 0.5 * (UT.erf((y2 - yb) * k) - UT.erf((y1 - yb) * k));
  }
  function common(ctx, S, leg) {
    let f = UT.BW(ctx.bm, S) * UT.attn(ctx.bm, S) * Math.pow(0.9, leg - 1);
    return f;
  }
  function legs(ctx) { return (ctx.T && ctx.probe.type === 'angle') ? (ctx.legs || 3) : 1; }

  // Side drilled hole (cylinder along y)
  UT.echoSDH = function (ctx, f, out) {
    const nL = legs(ctx);
    for (let leg = 1; leg <= nL; leg++) {
      const zu = ctx.T ? legDepth(f.z, leg, ctx.T) : f.z;
      const a = along(ctx, f.x, 0);
      const S0 = Math.hypot(a.h, zu);
      const phi = Math.atan2(a.h, zu);
      const d = (phi - ctx.bm.theta) / ctx.bm.g6;
      if (Math.abs(d) > 3) continue;
      const S = Math.max(1, S0 - f.d / 2);
      const cov = (f.y1 === undefined) ? 1 : latCoverage(ctx, S, f.y1, f.y2, a.yb);
      let p = common(ctx, S, leg) * 0.5 * Math.pow(f.d / Math.max(S, ctx.bm.N), 0.15) * UT.lossG(d) * cov * (f.refl || 1);
      if (f.d > 10) p = common(ctx, S, leg) * 0.55 * UT.lossG(d) * cov; // large cylinder
      if (p > 1e-5) out.push({ S, p, src: f.id || 'sdh', leg });
    }
  };
  // small sphere / pore
  UT.echoPoint = function (ctx, f, out) {
    const nL = legs(ctx);
    for (let leg = 1; leg <= nL; leg++) {
      const zu = ctx.T ? legDepth(f.z, leg, ctx.T) : f.z;
      const a = along(ctx, f.x, f.y);
      const S = Math.hypot(a.h, zu);
      const phi = Math.atan2(a.h, zu);
      const d = (phi - ctx.bm.theta) / ctx.bm.g6;
      if (Math.abs(d) > 3) continue;
      const w = 0.5 * UT.beamWidthW(ctx.bm, ctx.probe, S);
      const lat = UT.lossG(a.l / w);
      const p = common(ctx, S, leg) * 2.8 * (f.d / Math.max(S, 6)) * UT.lossG(d) * lat * (f.refl || 1);
      if (p > 1e-5) out.push({ S, p, src: f.id || 'pt', leg });
    }
  };
  // planar facet in x-z plane extended along y, normal angle nA (rad from +x toward +z)
  UT.echoFacet = function (ctx, f, out) {
    const nL = legs(ctx);
    const nx = Math.cos(f.nA), nz = Math.sin(f.nA);
    const lam = ctx.bm.lam;
    for (let leg = 1; leg <= nL; leg++) {
      const zu = ctx.T ? legDepth(f.z, leg, ctx.T) : f.z;
      const a = along(ctx, f.x, 0);
      const S = Math.hypot(a.h, zu);
      if (S < 0.5) continue;
      const phi = Math.atan2(a.h, zu);
      const d = (phi - ctx.bm.theta) / ctx.bm.g6;
      if (Math.abs(d) > 3) continue;
      // direction of travel at the facet
      const dirx = (ctx.probe.type === 'angle' ? ctx.fx : Math.sign(a.h || 1)) * Math.abs(Math.sin(phi));
      const dirz = (leg % 2 === 1 ? 1 : -1) * Math.cos(phi);
      let mis = Math.acos(Math.min(1, Math.abs(dirx * nx + dirz * nz)));
      mis = Math.hypot(mis, ctx.probe.type === 'angle' ? ctx.skew : 0);
      const lobe = Math.max(0.06, 0.45 * lam / Math.max(0.3, f.hh));
      const size = Math.min(1, 2 * f.hh / UT.beamWidth(ctx.bm, ctx.probe, S));
      const cov = latCoverage(ctx, S, f.y1, f.y2, a.yb);
      const base = common(ctx, S, leg) * UT.lossG(d) * cov * (f.refl || 1);
      let p = base * size * (UT.lossG(mis / lobe) + (f.tip || 0.04));
      if (p > 1e-5) out.push({ S, p, src: f.id || 'facet', leg });
      // corner trap at the bottom (leg1, going down) or top (leg2, going up)
      if (f.cornerBottom && leg === 1 && ctx.T) {
        const zc = ctx.T;
        const Sc = Math.hypot(a.h, zc);
        const phic = Math.atan2(a.h, zc);
        const dc = (phic - ctx.bm.theta) / ctx.bm.g6;
        const hc = Math.min(1, 2 * f.hh / UT.beamWidth(ctx.bm, ctx.probe, Sc));
        const pc = common(ctx, Sc, 1) * UT.lossG(dc) * cov * hc * UT.cornerEff(ctx.truth.angle, ctx.probe.mode) * (f.refl || 1) * 1.1;
        if (pc > 1e-5) out.push({ S: Sc, p: pc, src: (f.id || 'facet'), leg: 1, corner: 1 });
      }
      if (f.cornerTop && leg === 2 && ctx.T) {
        const zc = 2 * ctx.T;
        const Sc = Math.hypot(a.h, zc);
        const phic = Math.atan2(a.h, zc);
        const dc = (phic - ctx.bm.theta) / ctx.bm.g6;
        const hc = Math.min(1, 2 * f.hh / UT.beamWidth(ctx.bm, ctx.probe, Sc));
        const pc = common(ctx, Sc, 2) * UT.lossG(dc) * cov * hc * UT.cornerEff(ctx.truth.angle, ctx.probe.mode) * (f.refl || 1);
        if (pc > 1e-5) out.push({ S: Sc, p: pc, src: (f.id || 'facet'), leg: 2, corner: 1 });
      }
    }
  };
  // flat back wall series for straight probes. frac = fraction of beam on the wall (0..1)
  UT.echoBackwall = function (ctx, T, out, frac, n, src) {
    frac = frac === undefined ? 1 : frac;
    n = n || 6;
    for (let k = 1; k <= n; k++) {
      const S = k * T;
      const p = UT.BW(ctx.bm, S) * UT.attn(ctx.bm, S) * frac * Math.pow(0.82, k - 1) * 0.92;
      if (p > 1e-5) out.push({ S, p, src: src || 'bw', leg: 1 });
    }
  };

  /* ---------- A-scan synthesis ----------
     echoes: [{S, p}] (S = true path in material, mm)
     returns {data: Float32Array(N) %FSH, N}
  */
  UT.KCAL = 4;
  UT.ascan = function (opt) {
    const { probe, truth, inst, echoes, N, noiseKey, coupled, time } = opt;
    const v = UT.vel(probe) / 1000; // mm/us
    const data = opt.buf && opt.buf.length === N ? opt.buf : new Float32Array(N);
    data.fill(0);
    const gainLin = UT.fromdB(inst.gain + (opt.extraGain || 0)) * UT.KCAL;
    const range = inst.range;
    const dx = range / N;
    const iv = inst.vel / 2000; // display mm per us
    const sigT = 0.42 / probe.f; // us
    const sigR = sigT * iv, sigD = sigR * 1.9;
    const toDisp = (S) => ((truth.delay + 2 * S / v) - inst.delay) * iv;
    // echoes
    const ripple = Math.max(0.15, (UT.vel(probe) / (probe.f * 1000)) * 0.5 * (inst.vel / UT.vel(probe)));
    function addPulse(pos, amp, wr, wd) {
      if (amp <= 0) return;
      const i0 = Math.max(0, Math.floor((pos - 4 * wr) / dx));
      const i1 = Math.min(N - 1, Math.ceil((pos + 4 * wd) / dx));
      for (let i = i0; i <= i1; i++) {
        const x = i * dx - pos;
        const w = x < 0 ? wr : wd;
        const e = Math.exp(-(x * x) / (w * w));
        const r = 0.78 + 0.22 * Math.abs(Math.cos(Math.PI * x / ripple));
        data[i] += amp * e * r;
      }
    }
    // initial pulse / main bang
    const mb = toDisp(0) - (truth.delay) * iv; // position of t=0
    addPulse(mb, probe.type === 'tr' ? 22 : 400, sigR * 2, sigD * 4 + (probe.type === 'straight' ? 0.6 * iv : 0));
    data.mbEnd = Math.ceil((mb + sigD * 10 + (probe.type === 'straight' ? 1.4 * iv : 0)) / dx);
    if (probe.type !== 'straight') {
      // wedge / delay-line reverberations, small
      const r = UT.rng(probe.id.charCodeAt(1) * 77);
      for (let k = 0; k < 6; k++) {
        const t = truth.delay * (0.15 + 0.13 * k + r() * 0.05);
        addPulse((t - inst.delay) * iv, gainLin * 0.00045 * (1 - k * 0.12), sigR, sigD);
      }
      if (probe.type === 'tr') addPulse((truth.delay * 0.97 - inst.delay) * iv, gainLin * 0.0012, sigR, sigD);
    }
    if (coupled !== false) {
      for (const e of echoes) {
        addPulse(toDisp(e.S), e.p * gainLin, sigR, sigD);
      }
      // grain noise
      const gn = (opt.grain === undefined ? 1 : opt.grain) * 0.0000075 * gainLin;
      const nk = noiseKey | 0;
      for (let i = 0; i < N; i++) {
        const sd = i * dx;
        const t = inst.delay + sd / iv;
        const S = (t - truth.delay) * v / 2;
        if (S <= 0.5) continue;
        const bin = Math.floor(S * 1.6);
        const h = UT.hash(bin, nk);
        const h2 = UT.hash(bin + 7919, nk + 13);
        const amp = gn * Math.pow(h, 6) * 3 * (0.8 + 0.4 * h2) * Math.exp(-S / 160) * (1 + 6 / (S + 3));
        data[i] += amp;
      }
    }
    // electronic noise + flicker
    const en = UT.fromdB(inst.gain - 86);
    const tt = (time || 0) * 1000;
    for (let i = 0; i < N; i++) {
      data[i] += en * (0.5 + UT.hash(i, tt | 0) * 1.5);
    }
    // reject (linear)
    if (inst.reject > 0) for (let i = 0; i < N; i++) if (data[i] < inst.reject) data[i] = 0;
    for (let i = 0; i < N; i++) if (data[i] > 112) data[i] = 112;
    return data;
  };
  // where a true path S shows on the screen (display mm)
  UT.dispPos = function (probe, truth, inst, S) {
    const v = UT.vel(probe) / 1000;
    return ((truth.delay + 2 * S / v) - inst.delay) * inst.vel / 2000;
  };

  // gate evaluation; returns {amp, pos, found}
  UT.gate = function (data, inst, g, mode) {
    const N = data.length, dx = inst.range / N;
    const i0 = Math.max(0, Math.floor(g.start / dx)), i1 = Math.min(N - 1, Math.floor((g.start + g.width) / dx));
    if (mode === 'flank') {
      for (let i = i0; i <= i1; i++) if (data[i] >= g.thr) {
        // interpolate crossing
        const a = data[i - 1] || 0, b = data[i];
        const fr = b === a ? 0 : (g.thr - a) / (b - a);
        // amplitude: local max after crossing
        let m = b; for (let k = i; k <= Math.min(N - 1, i + 40); k++) { if (data[k] > m) m = data[k]; else if (data[k] < m * 0.5) break; }
        return { found: true, pos: (i - 1 + UT.clamp(fr, 0, 1)) * dx, amp: m };
      }
      return { found: false, amp: 0, pos: 0 };
    }
    let mi = -1, mv = -1;
    for (let i = i0; i <= i1; i++) if (data[i] > mv) { mv = data[i]; mi = i; }
    if (mi < 0 || mv < g.thr) return { found: false, amp: Math.max(0, mv), pos: 0 };
    // parabolic peak interpolation
    const a = data[mi - 1] || mv, c = data[mi + 1] || mv;
    const den = a - 2 * mv + c;
    const off = den !== 0 ? 0.5 * (a - c) / den : 0;
    return { found: true, amp: mv, pos: (mi + UT.clamp(off, -0.5, 0.5)) * dx };
  };

  // geometry readouts from a sound path (instrument values)
  UT.readouts = function (inst, S, probe) {
    const th = (probe && probe.type !== 'angle') ? 0 : inst.angle * D2R;
    const P = S * Math.sin(th);
    let dep = S * Math.cos(th), leg = 1;
    if (inst.thk > 0 && probe && probe.type === 'angle') {
      const n = Math.floor(dep / inst.thk);
      leg = n + 1;
      dep = (n % 2 === 0) ? dep - n * inst.thk : (n + 1) * inst.thk - dep;
    }
    return { S, P, R: P - (inst.X || 0), D: dep, leg };
  };

  // App. 12 (ASME VIII Div.1) acceptance
  UT.app12Limit = function (t) { return t <= 19 ? 6 : (t <= 57 ? t / 3 : 19); };
  UT.app12 = function (type, pctDAC, len, t) {
    if (pctDAC <= 20) return { reject: false, why: 'Biên độ ≤ 20% DAC: không cần đánh giá' };
    if (type === 'crack' || type === 'lof' || type === 'lop') return { reject: true, why: 'Nứt / không ngấu / không thấu: loại bỏ bất kể chiều dài' };
    if (pctDAC <= 100) return { reject: false, why: 'Không vượt mức chuẩn (100% DAC): chấp nhận' };
    const lim = UT.app12Limit(t);
    return len > lim ? { reject: true, why: 'Vượt 100% DAC và dài ' + len.toFixed(1) + ' mm > ' + lim.toFixed(1) + ' mm' } : { reject: false, why: 'Vượt 100% DAC nhưng dài ' + len.toFixed(1) + ' mm ≤ ' + lim.toFixed(1) + ' mm' };
  };
})(UT);
