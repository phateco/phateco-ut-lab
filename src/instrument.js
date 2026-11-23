/* ============ Virtual flaw detector ============ */
(function (UT) {
  const el = UT.el;

  UT.dacRef = function (setup, s) { // reference dB (amp at 0 dB gain) at screen path s
    const P = setup.dac.pts;
    if (!P.length) return null;
    if (P.length === 1) return P[0].ref;
    if (s <= P[0].s) return P[0].ref;
    for (let i = 0; i < P.length - 1; i++) if (s <= P[i + 1].s) { const t = (s - P[i].s) / (P[i + 1].s - P[i].s); return P[i].ref + t * (P[i + 1].ref - P[i].ref); }
    const n = P.length, k = (P[n - 1].ref - P[n - 2].ref) / (P[n - 1].s - P[n - 2].s);
    return P[n - 1].ref + UT.clamp(k * (s - P[n - 1].s), -12, 12);
  };

  UT.Instrument = function (container, opts) {
    const I = { probeId: opts.probeId || opts.probes[0], data: null, read: { found: false }, peak: null, frozen: false };
    I.probe = () => UT.PROBES[I.probeId];
    I.setup = () => UT.SETUPS[I.probeId];
    const N = 900;
    let buf = new Float32Array(N), hold = new Float32Array(N);

    // ---------- layout ----------
    const scr = el('div', { class: 'ascan' });
    const head = el('div', { class: 'ascan-head' });
    const scrWrap = el('div', { class: 'ascan-wrap' }, head, scr);
    const reads = el('div', { class: 'reads' });
    const tabsBar = el('div', { class: 'itabs', role: 'tablist' });
    const panes = el('div', { class: 'ipanes' });
    const root = el('div', { class: 'inst' + (opts.compact ? ' compact' : '') }, scrWrap, reads, el('div', { class: 'ictl' }, tabsBar, panes));
    container.appendChild(root);

    const cv = UT.canvas(scr, () => draw());

    // readouts
    const R = {};
    [['S', 'S', 'mm'], ['D', 'D (sâu)', 'mm'], ['P', 'P', 'mm'], ['R', 'P−X', 'mm'], ['A', 'A', '%FSH'], ['DAC', 'DAC', '%']].forEach(([k, l, u]) => {
      R[k] = el('b'); R[k + 's'] = el('small', null, u); reads.appendChild(el('div', { class: 'rd rd-' + k }, el('span', null, l), R[k], R[k + 's']));
    });

    // ---------- controls ----------
    const ctls = [];
    const S = () => I.setup();
    const changed = () => { UT.saveSetups(); opts.onChange && opts.onChange(); };
    const mk = (cfg) => { const c = UT.NumCtl(Object.assign({}, cfg, { set: (v) => { cfg.set(v); changed(); } })); ctls.push(c); return c; };
    const tabs = {};
    function addTab(id, title, content) {
      const b = el('button', { type: 'button', class: 'itab', role: 'tab' }, title);
      const p = el('div', { class: 'ipane' }, content);
      b.addEventListener('click', () => show(id));
      tabsBar.appendChild(b); panes.appendChild(p);
      tabs[id] = { b, p };
    }
    function show(id) { for (const k in tabs) { tabs[k].b.classList.toggle('on', k === id); tabs[k].p.classList.toggle('on', k === id); } }

    const want = opts.tabs || ['base', 'gate', 'probe', 'dac', 'auto'];
    const gainCtl = mk({ label: 'Gain', unit: 'dB', get: () => S().gain, set: v => S().gain = v, steps: [1, 0.5, 2, 6, 0.1], min: 0, max: 110, cls: 'big' });
    if (want.includes('base')) addTab('base', 'Cơ bản', el('div', { class: 'grid-ctl' },
      gainCtl,
      mk({ label: 'Range', unit: 'mm', get: () => S().range, set: v => S().range = v, steps: [5, 1, 10, 50, 0.5], min: 5, max: 1000 }),
      mk({ label: 'Velocity', unit: 'm/s', get: () => S().vel, set: v => S().vel = v, steps: [10, 1, 100], min: 1000, max: 9000, dec: 0 }),
      mk({ label: 'Probe delay', unit: 'µs', get: () => S().delay, set: v => S().delay = v, steps: [0.1, 0.01, 0.001, 1], min: 0, max: 50, dec: 3 }),
      mk({ label: 'Reject', unit: '%', get: () => S().reject, set: v => S().reject = v, steps: [5, 1], min: 0, max: 80, dec: 0 }),
    ));
    if (want.includes('gate')) {
      const gm = UT.seg([{ v: 'peak', t: 'Đỉnh (peak)' }, { v: 'flank', t: 'Sườn (flank)' }], S().gateMode, v => { S().gateMode = v; changed(); });
      addTab('gate', 'Cổng A', el('div', { class: 'grid-ctl' },
        mk({ label: 'Gate start', unit: 'mm', get: () => S().gA.start, set: v => S().gA.start = v, steps: [1, 0.1, 5, 10], min: 0, max: 1000 }),
        mk({ label: 'Gate width', unit: 'mm', get: () => S().gA.width, set: v => S().gA.width = v, steps: [1, 0.1, 5, 10], min: 0.5, max: 1000 }),
        mk({ label: 'Ngưỡng', unit: '%FSH', get: () => S().gA.thr, set: v => S().gA.thr = v, steps: [5, 1], min: 2, max: 95, dec: 0 }),
        el('div', { class: 'nc wide' }, el('div', { class: 'nc-lab' }, el('span', null, 'Chế độ đo')), gm),
        el('p', { class: 'mini' }, 'Mẹo: kéo thanh cổng ngay trên màn hình A-scan để dời vị trí và ngưỡng.')
      ));
      I._gm = gm;
    }
    let probeSel = null;
    if (want.includes('probe')) {
      probeSel = el('select', { class: 'sel', id: 'probe-' + Math.random().toString(36).slice(2, 7) }, opts.probes.map(id => el('option', { value: id }, UT.PROBES[id].name)));
      probeSel.value = I.probeId;
      probeSel.addEventListener('change', () => I.setProbe(probeSel.value));
      addTab('probe', 'Đầu dò', el('div', { class: 'grid-ctl' },
        el('div', { class: 'nc wide' }, el('div', { class: 'nc-lab' }, el('span', null, 'Đầu dò đang dùng')), probeSel),
        mk({ label: 'Góc (Angle)', unit: '°', get: () => S().angle, set: v => S().angle = v, steps: [0.5, 0.1, 1], min: 0, max: 85 }),
        mk({ label: 'X-value', unit: 'mm', get: () => S().X, set: v => S().X = v, steps: [0.5, 0.1, 1], min: 0, max: 40 }),
        mk({ label: 'Chiều dày T', unit: 'mm', get: () => S().thk, set: v => S().thk = v, steps: [1, 0.1, 5], min: 0, max: 500 }),
      ));
    }
    if (want.includes('dac')) {
      const info = el('div', { class: 'dacinfo' });
      const onBtn = el('button', { type: 'button', class: 'btn' }, 'DAC: bật');
      const recB = el('button', { type: 'button', class: 'btn pri' }, 'Ghi điểm DAC');
      const undoB = el('button', { type: 'button', class: 'btn' }, 'Xoá điểm cuối');
      const clrB = el('button', { type: 'button', class: 'btn danger' }, 'Xoá DAC');
      recB.addEventListener('click', () => I.recordDAC());
      undoB.addEventListener('click', () => { S().dac.pts.pop(); if (!S().dac.pts.length) S().dac.refGain = null; changed(); });
      clrB.addEventListener('click', () => { S().dac.pts = []; S().dac.refGain = null; changed(); });
      onBtn.addEventListener('click', () => { S().dac.on = !S().dac.on; changed(); });
      I._dacInfo = () => {
        const d = S().dac;
        onBtn.textContent = 'DAC: ' + (d.on ? 'bật' : 'tắt');
        info.innerHTML = d.pts.length ? d.pts.map((p, i) => `<span>#${i + 1}: S ${UT.fmt(p.s)} mm · ${UT.fmt(p.amp, 0)}% @ ${UT.fmt(p.gain)} dB</span>`).join('') + (d.block ? `<em>Mẫu: ${d.block}</em>` : '') : '<em>Chưa có điểm. Đặt cổng A lên xung lỗ khoan ngang đã cực đại hoá rồi bấm "Ghi điểm DAC".</em>';
      };
      addTab('dac', 'DAC', el('div', { class: 'grid-ctl' },
        el('div', { class: 'btnrow' }, recB, undoB, clrB, onBtn), info,
        mk({ label: 'Bù truyền âm', unit: 'dB', get: () => S().transfer, set: v => S().transfer = v, steps: [0.5, 1, 0.1], min: -10, max: 20 }),
      ));
    }
    if (want.includes('auto')) {
      const st = { s1: 25, s2: 100, t1: null, t2: null };
      const msg = el('div', { class: 'mini' });
      const b1 = el('button', { type: 'button', class: 'btn' }, 'Đo Ref 1');
      const b2 = el('button', { type: 'button', class: 'btn' }, 'Đo Ref 2');
      const bc = el('button', { type: 'button', class: 'btn pri' }, 'Tính velocity + delay');
      const tOf = (s) => S().delay + 2 * s * 1000 / S().vel;
      b1.addEventListener('click', () => { if (!I.read.found) return UT.toast('Cổng A chưa bắt được xung', 'bad'); st.t1 = tOf(I.read.pos); upd(); });
      b2.addEventListener('click', () => { if (!I.read.found) return UT.toast('Cổng A chưa bắt được xung', 'bad'); st.t2 = tOf(I.read.pos); upd(); });
      bc.addEventListener('click', () => {
        if (st.t1 === null || st.t2 === null) return UT.toast('Cần đo đủ Ref 1 và Ref 2', 'bad');
        const v = 2000 * (st.s2 - st.s1) / (st.t2 - st.t1);
        if (!(v > 1000 && v < 9000)) return UT.toast('Kết quả vô lý, kiểm tra lại xung đã chọn', 'bad');
        S().vel = Math.round(v); S().delay = +(st.t1 - 2 * st.s1 * 1000 / S().vel).toFixed(3);
        changed(); ctls.forEach(c => c.refresh()); UT.toast('Đã tính: v = ' + S().vel + ' m/s, delay = ' + UT.fmt(S().delay, 3) + ' µs', 'good');
      });
      function upd() { msg.innerHTML = `Ref 1: ${st.t1 === null ? '–' : UT.fmt(st.t1, 3) + ' µs'} &nbsp;·&nbsp; Ref 2: ${st.t2 === null ? '–' : UT.fmt(st.t2, 3) + ' µs'}`; }
      upd();
      addTab('auto', 'Tự động', el('div', { class: 'grid-ctl' },
        UT.NumCtl({ label: 'S-Ref 1', unit: 'mm', get: () => st.s1, set: v => { st.s1 = v; }, steps: [1, 0.1, 5], min: 0.5, max: 500 }),
        UT.NumCtl({ label: 'S-Ref 2', unit: 'mm', get: () => st.s2, set: v => { st.s2 = v; }, steps: [1, 0.1, 5], min: 1, max: 1000 }),
        el('div', { class: 'btnrow' }, b1, b2, bc), msg,
        el('p', { class: 'mini' }, 'Hiệu chuẩn 2 điểm: đặt cổng A lên xung đã biết khoảng cách S-Ref 1, bấm "Đo Ref 1", rồi làm tương tự với xung S-Ref 2.')
      ));
    }
    show(want[0]);

    // screen toggles
    const holdB = el('button', { type: 'button', class: 'chip' }, 'Giữ đỉnh');
    const frzB = el('button', { type: 'button', class: 'chip' }, 'Đóng băng');
    const g6p = el('button', { type: 'button', class: 'chip' }, '+6 dB');
    const g6m = el('button', { type: 'button', class: 'chip' }, '−6 dB');
    holdB.addEventListener('click', () => { S().peakHold = !S().peakHold; hold.fill(0); changed(); });
    frzB.addEventListener('click', () => { I.frozen = !I.frozen; });
    g6p.addEventListener('click', () => { S().gain = Math.min(110, S().gain + 6); changed(); gainCtl.refresh(); });
    g6m.addEventListener('click', () => { S().gain = Math.max(0, S().gain - 6); changed(); gainCtl.refresh(); });
    const hTxt = el('span', { class: 'ah-t' });
    head.append(hTxt, el('span', { class: 'ah-b' }, g6m, g6p, holdB, frzB));

    I.recordDAC = function () {
      const s = S();
      if (!I.read.found) return UT.toast('Cổng A chưa bắt được xung nào trên ngưỡng', 'bad');
      if (I.read.amp >= 100) return UT.toast('Xung bão hoà (≥100% FSH). Giảm gain rồi ghi lại.', 'bad');
      const ref = UT.dB(I.read.amp) - s.gain - (s.transfer || 0);
      s.dac.pts.push({ s: I.read.pos, amp: I.read.amp, gain: s.gain, ref });
      s.dac.pts.sort((a, b) => a.s - b.s);
      if (s.dac.refGain === null) s.dac.refGain = s.gain;
      s.dac.block = opts.blockName ? opts.blockName() : s.dac.block;
      changed(); UT.toast('Đã ghi điểm DAC #' + s.dac.pts.length, 'good');
    };
    I.setProbe = function (id) {
      if (!UT.PROBES[id]) return;
      I.probeId = id; if (probeSel) probeSel.value = id; hold.fill(0);
      ctls.forEach(c => c.refresh()); if (I._gm) I._gm.set(S().gateMode);
      opts.onProbeChange && opts.onProbeChange(id);
    };
    I.refresh = () => { ctls.forEach(c => c.refresh()); if (I._gm) I._gm.set(S().gateMode); };

    // gate drag on screen
    let gd = null;
    cv.c.addEventListener('pointerdown', (e) => {
      const r = cv.c.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top;
      const g = S().gA; const m = geom();
      const gx0 = m.X(g.start), gx1 = m.X(g.start + g.width), gy = m.Y(g.thr);
      if (Math.abs(y - gy) < 16 && x > gx0 - 10 && x < gx1 + 10) {
        gd = { x, y, s: g.start, t: g.thr, edge: Math.abs(x - gx1) < 12 ? 'w' : 'm', w: g.width };
        cv.c.setPointerCapture(e.pointerId); e.preventDefault();
      }
    });
    cv.c.addEventListener('pointermove', (e) => {
      if (!gd) return;
      const r = cv.c.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top;
      const m = geom(); const g = S().gA;
      const ds = (x - gd.x) / m.pw * S().range;
      if (gd.edge === 'w') g.width = Math.max(0.5, +(gd.w + ds).toFixed(1));
      else g.start = Math.max(0, +(gd.s + ds).toFixed(1));
      g.thr = UT.clamp(Math.round(gd.t - (y - gd.y) / m.ph * 110), 2, 95);
      ctls.forEach(c => c.refresh());
    });
    const gend = () => { if (gd) { gd = null; changed(); } };
    cv.c.addEventListener('pointerup', gend); cv.c.addEventListener('pointercancel', gend);

    function geom() {
      const L = 34, Rr = 8, T = 8, B = 22;
      const pw = cv.w - L - Rr, ph = cv.h - T - B;
      return { L, T, pw, ph, X: (s) => L + s / S().range * pw, Y: (a) => T + ph - a / 110 * ph };
    }
    function draw() {
      const ctx = cv.ctx, m = geom(), s = S();
      if (!cv.w) return;
      ctx.clearRect(0, 0, cv.w, cv.h);
      ctx.fillStyle = '#081016'; ctx.fillRect(m.L, m.T, m.pw, m.ph);
      // grid
      ctx.strokeStyle = 'rgba(120,170,200,0.16)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let i = 0; i <= 10; i++) { const x = m.L + m.pw * i / 10; ctx.moveTo(x + .5, m.T); ctx.lineTo(x + .5, m.T + m.ph); }
      for (let a = 0; a <= 100; a += 10) { const y = Math.round(m.Y(a)) + .5; ctx.moveTo(m.L, y); ctx.lineTo(m.L + m.pw, y); }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(120,170,200,0.35)'; ctx.beginPath(); const y100 = Math.round(m.Y(100)) + .5; ctx.moveTo(m.L, y100); ctx.lineTo(m.L + m.pw, y100); ctx.stroke();
      // labels
      ctx.fillStyle = '#7f97a8'; ctx.font = '11px "JetBrains Mono", ui-monospace, monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      for (let a = 0; a <= 100; a += 20) ctx.fillText(a, m.L - 5, m.Y(a));
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      for (let i = 0; i <= 5; i++) ctx.fillText(UT.fmt(s.range * i / 5, s.range < 20 ? 1 : 0), m.L + m.pw * i / 5, m.T + m.ph + 5);
      // DAC curves
      if (s.dac.on && s.dac.pts.length >= 2) {
        const lv = [[0, '#ff5a5f', 'DAC'], [-6, '#ffb347', '−6 dB'], [-14, '#ffe08a', '−14 dB']];
        const s0 = s.dac.pts[0].s, s1 = s.dac.pts[s.dac.pts.length - 1].s;
        for (const [off, col] of lv) {
          ctx.strokeStyle = col; ctx.lineWidth = 1.4; ctx.setLineDash([]);
          for (const seg of [[0, s0, true], [s0, s1, false], [s1, s.range, true]]) {
            ctx.setLineDash(seg[2] ? [4, 4] : []); ctx.beginPath(); let first = true;
            for (let k = 0; k <= 60; k++) {
              const sp = seg[0] + (seg[1] - seg[0]) * k / 60; if (sp < 0 || sp > s.range) continue;
              const a = UT.fromdB(UT.dacRef(s, sp) + s.gain + off);
              const y = m.Y(Math.min(112, a)); const x = m.X(sp);
              if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
            }
            ctx.stroke();
          }
        }
        ctx.setLineDash([]);
        for (const p of s.dac.pts) { const a = UT.fromdB(p.ref + s.gain); ctx.fillStyle = '#ff5a5f'; ctx.beginPath(); ctx.arc(m.X(p.s), m.Y(Math.min(112, a)), 3.5, 0, 7); ctx.fill(); }
      } else if (s.dac.pts.length === 1) {
        const p = s.dac.pts[0]; const a = UT.fromdB(p.ref + s.gain); ctx.fillStyle = '#ff5a5f'; ctx.beginPath(); ctx.arc(m.X(p.s), m.Y(Math.min(112, a)), 3.5, 0, 7); ctx.fill();
      }
      // peak hold
      if (s.peakHold) {
        ctx.strokeStyle = 'rgba(255,214,102,0.45)'; ctx.lineWidth = 1; ctx.beginPath();
        for (let i = 0; i < N; i++) { const x = m.L + i / (N - 1) * m.pw, y = m.Y(hold[i]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
        ctx.stroke();
      }
      // trace
      const d = buf;
      ctx.beginPath(); ctx.moveTo(m.L, m.Y(0));
      for (let i = 0; i < N; i++) ctx.lineTo(m.L + i / (N - 1) * m.pw, m.Y(d[i]));
      ctx.lineTo(m.L + m.pw, m.Y(0)); ctx.closePath();
      ctx.fillStyle = 'rgba(126,240,180,0.10)'; ctx.fill();
      ctx.beginPath();
      for (let i = 0; i < N; i++) { const x = m.L + i / (N - 1) * m.pw, y = m.Y(d[i]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.strokeStyle = '#8af5be'; ctx.lineWidth = 1.5; ctx.stroke();
      // gate A
      const g = s.gA;
      ctx.strokeStyle = '#ff7a45'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(m.X(g.start), m.Y(g.thr)); ctx.lineTo(m.X(Math.min(s.range, g.start + g.width)), m.Y(g.thr)); ctx.stroke();
      ctx.fillStyle = '#ff7a45'; ctx.font = '600 10px "Be Vietnam Pro", system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
      ctx.fillText('A', m.X(g.start) + 2, m.Y(g.thr) - 3);
      if (I.read.found) {
        const x = m.X(I.read.pos);
        ctx.strokeStyle = 'rgba(255,122,69,0.7)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(x, m.T); ctx.lineTo(x, m.T + m.ph); ctx.stroke(); ctx.setLineDash([]);
      }
      if (opts.onDraw) opts.onDraw(ctx, m, s);
      // frame
      ctx.strokeStyle = 'rgba(120,170,200,0.4)'; ctx.strokeRect(m.L + .5, m.T + .5, m.pw, m.ph);
      // saturation flag
      let sat = false; const i0s = Math.max(8, d.mbEnd || 0); for (let i = i0s; i < N; i++) if (d[i] >= 110) { sat = true; break; }
      hTxt.innerHTML = `<b>${UT.PROBES[I.probeId].short}</b> · Gain <b>${UT.fmt(s.gain)}</b> dB · Range ${UT.fmt(s.range, 0)} mm · v ${s.vel} m/s` + (s.transfer ? ` · bù ${UT.fmt(s.transfer)} dB` : '') + (sat ? ' · <span class="sat">BÃO HOÀ</span>' : '') + (I.coupled === false ? ' · <span class="sat">MẤT TIẾP ÂM</span>' : '');
    }

    // ---------- main loop ----------
    let alive = true, raf = 0, lastT = 0;
    function frame(t) {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      if (t - lastT < 33) return; lastT = t;
      const s = S(), p = I.probe(), tr = UT.TRUTH[I.probeId];
      if (!I.frozen) {
        const r = opts.getEchoes(I.probeId);
        I.coupled = r.coupled;
        buf = UT.ascan({ probe: p, truth: tr, inst: s, echoes: r.echoes, N, noiseKey: r.noiseKey, coupled: r.coupled, time: t / 1000, buf, extraGain: s.transfer || 0, grain: r.grain });
        if (s.peakHold) for (let i = 0; i < N; i++) if (buf[i] > hold[i]) hold[i] = buf[i];
        I.data = buf;
        I.read = UT.gate(buf, s, s.gA, s.gateMode);
      }
      // readouts
      const rd = I.read;
      if (rd.found) {
        const g = UT.readouts(s, rd.pos, p);
        R.S.textContent = UT.fmt(g.S); R.D.textContent = UT.fmt(g.D); R.Ds.textContent = p.type === 'angle' ? 'mm · chân ' + g.leg : 'mm';
        R.P.textContent = p.type === 'angle' ? UT.fmt(g.P) : '–'; R.R.textContent = p.type === 'angle' ? UT.fmt(g.R) : '–';
        R.A.textContent = UT.fmt(rd.amp, 0);
        const ref = (s.dac.on && s.dac.pts.length >= 2) ? UT.dacRef(s, rd.pos) : null;
        if (ref !== null) {
          const pct = 100 * rd.amp / UT.fromdB(ref + s.gain);
          R.DAC.textContent = UT.fmt(pct, 0) + '%'; R.DACs.textContent = (pct >= 100 ? '+' : '') + UT.fmt(UT.dB(pct / 100)) + ' dB';
          I.read.pct = pct;
        } else { R.DAC.textContent = '–'; R.DACs.textContent = '%'; I.read.pct = null; }
        I.read.geo = g;
      } else { ['S', 'D', 'P', 'R', 'A', 'DAC'].forEach(k => R[k].textContent = '–'); R.DACs.textContent = '%'; I.read.pct = null; I.read.geo = null; }
      reads.classList.toggle('hot', rd.found && rd.amp > 0);
      if (I._dacInfo) I._dacInfo();
      draw();
      opts.onFrame && opts.onFrame(I);
    }
    raf = requestAnimationFrame(frame);
    I.root = root; I.show = show;
    I.dispose = () => { alive = false; cancelAnimationFrame(raf); cv.dispose(); root.remove(); };
    return I;
  };
})(UT);
