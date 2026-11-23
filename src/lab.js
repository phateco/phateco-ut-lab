/* ============ Lab layout: specimen + instrument + tasks ============ */
(function (UT) {
  const el = UT.el;

  UT.Lab = function (container, cfg) {
    const L = { specs: cfg.specs, ver: 0 };
    let spec = typeof cfg.specs[0] === 'string' ? UT.SPEC[cfg.specs[0]] : cfg.specs[0];
    const pos = { face: Object.keys(spec.faces)[0], x: 0, y: 0, fx: 1, skew: 0 };
    L.pos = pos;
    L.spec = () => spec;
    let reveal = !!cfg.reveal, rays = cfg.rays !== false, plot = cfg.plot !== false;

    // ---------- DOM ----------
    const specSel = el('select', { class: 'sel', id: 'spec-' + cfg.id }, cfg.specs.map(s => { const o = typeof s === 'string' ? UT.SPEC[s] : s; return el('option', { value: o.id }, o.name); }));
    const faceSel = el('select', { class: 'sel', id: 'face-' + cfg.id });
    const vSeg = UT.seg([{ v: '2d', t: 'Mặt cắt 2D' }, { v: '3d', t: '3D' }], cfg.view || '2d', v => setView(v));
    const viewBox = el('div', { class: 'viewbox' });
    const tools = el('div', { class: 'vtools' });
    const moveBar = el('div', { class: 'movebar' });
    const posTxt = el('span', { class: 'postxt' });
    const specCard = el('section', { class: 'card spec-card' },
      el('header', { class: 'card-h' }, el('div', { class: 'sel-wrap' }, specSel, faceSel), vSeg),
      el('div', { class: 'viewwrap' }, viewBox, tools), moveBar);
    const instBox = el('section', { class: 'card inst-card' });
    const side = el('aside', { class: 'lab-side' });
    const extra = el('div', { class: 'lab-extra' });
    const root = el('div', { class: 'lab' + (cfg.wide ? ' wide' : '') }, el('div', { class: 'lab-main' }, specCard, instBox, extra), side);
    container.appendChild(root);
    L.side = side; L.extra = extra; L.tools = tools; L.root = root;

    // ---------- instrument ----------
    L.inst = UT.Instrument(instBox, {
      probes: cfg.probes, probeId: cfg.probeId || cfg.probes[0], tabs: cfg.tabs,
      blockName: () => spec.short,
      getEchoes: (pid) => {
        const r = UT.computeEchoes(spec, UT.PROBES[pid], UT.TRUTH[pid], pos);
        if (cfg.echoHook) cfg.echoHook(r);
        r.noiseKey = Math.round(pos.x * 1.3) * 131 + Math.round(pos.y * 0.5) * 7 + (pos.face.charCodeAt(0) * 3);
        r.grain = spec.kind === 'weld' ? 1.6 : 1;
        return r;
      },
      onProbeChange: (id) => { placeDefault(); L.ver++; cfg.onProbe && cfg.onProbe(id); },
      onFrame: cfg.onFrame,
    });
    L.probeId = () => L.inst.probeId;
    UT._lab = L;

    // ---------- views ----------
    let v2 = null, v3 = null, curView = null;
    const viewOpts = {
      spec: () => spec, pos: () => pos, probeId: () => L.inst.probeId, inst: () => L.inst,
      reveal: () => reveal, showRays: () => rays, showPlot: () => plot, showIndex: () => cfg.showIndex !== false,
      move: (u, y) => L.move(u, y), moveCenter: (c, y) => L.moveCenter(c, y), version: () => L.ver, allowJump: () => true,
      yFilter: () => spec.kind === 'weld',
    };
    function setView(v) {
      if (v === curView) return; curView = v;
      if (v2) { v2.dispose(); v2 = null; } if (v3) { v3.dispose(); v3 = null; }
      tools.innerHTML = '';
      if (v === '2d') {
        v2 = UT.SpecView2D(viewBox, viewOpts);
        { const b = spec.bounds; if ((b.x1 - b.x0) / (b.z1 - b.z0) > 3.2) setTimeout(() => v2 && v2.focusProbe(2.6), 30); }
        tools.append(btn('Toàn cảnh', () => v2.fit()), btn('Phóng quanh đầu dò', () => v2.focusProbe(spec.kind === 'block' && spec.id.startsWith('V2') ? 3 : 5)));
      } else {
        v3 = UT.SpecView3D(viewBox, viewOpts);
        tools.append(btn('Góc nhìn chuẩn', () => v3.reset && v3.reset()), btn('Lại gần đầu dò', () => v3.focus && v3.focus()));
      }
      addToggles();
      cfg.onView && cfg.onView(v);
    }
    function btn(t, f, cls) { const b = el('button', { type: 'button', class: 'chip' + (cls ? ' ' + cls : '') }, t); b.addEventListener('click', f); return b; }
    function tog(t, get, set) { const b = btn(t, () => { set(!get()); b.classList.toggle('on', get()); }); b.classList.toggle('on', get()); return b; }
    function addToggles() {
      tools.append(tog('Tia âm', () => rays, v => rays = v));
      if (cfg.revealToggle !== false) tools.append(tog(spec.kind === 'weld' ? 'Hiện khuyết tật' : 'Nhìn xuyên', () => reveal, v => { reveal = v; }));
      if (cfg.plotToggle !== false) tools.append(tog('Vẽ vị trí cổng A', () => plot, v => plot = v));
    }
    L.setReveal = (v) => { reveal = v; const cv0 = curView; curView = null; setView(cv0); };
    L.revealed = () => reveal;

    // ---------- movement ----------
    L.move = function (u, y) {
      const b = spec.bounds; const face = spec.faces[pos.face];
      let lo = b.x0, hi = b.x1;
      if (face && face.map === 'side') { lo = b.z0; hi = b.z1; }
      pos.x = +UT.clamp(u, lo, hi).toFixed(2);
      if (y !== undefined && spec.width) pos.y = +UT.clamp(y, 0, spec.width).toFixed(2);
      // weld specimens: an angle probe always faces the weld; crossing the weld turns it around
      const pr = UT.PROBES[L.inst.probeId];
      if (spec.kind === 'weld' && pr.type === 'angle') {
        const c = pos.x - pos.fx * pr.len / 2;
        const want = spec.joint === 'T' ? 1 : (c < 0 ? 1 : -1);
        if (want !== pos.fx) { pos.fx = want; pos.x = +(c + want * pr.len / 2).toFixed(2); }
      }
      cfg.onMove && cfg.onMove();
    };
    L.moveCenter = function (c, y) {
      const pr = UT.PROBES[L.inst.probeId];
      L.move(pr.type === 'angle' ? c + pos.fx * pr.len / 2 : c, y);
    };
    const ctr = () => { const pr = UT.PROBES[L.inst.probeId]; return pr.type === 'angle' ? pos.x - pos.fx * pr.len / 2 : pos.x; };
    function mbtn(t, f, title) { const b = el('button', { type: 'button', class: 'mv', title: title || '' }, t); let t1, t2; b.addEventListener('pointerdown', (e) => { e.preventDefault(); f(); t1 = setTimeout(() => t2 = setInterval(f, 60), 350); }); ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, () => { clearTimeout(t1); clearInterval(t2); })); return b; }
    const flipB = el('button', { type: 'button', class: 'mv wide' }, 'Quay đầu dò ⇄');
    flipB.addEventListener('click', () => { const pr = UT.PROBES[L.inst.probeId]; if (pr.type === 'angle') { const c = pos.x - pos.fx * pr.len / 2; pos.fx = -pos.fx; pos.x = c + pos.fx * pr.len / 2; } });
    const skewCtl = UT.NumCtl({ label: 'Xoay (skew)', unit: '°', get: () => pos.skew, set: v => pos.skew = v, steps: [2, 5, 1], min: -30, max: 30, dec: 0, cls: 'skew' });
    moveBar.append(
      el('div', { class: 'mvgrp' }, el('span', { class: 'mvlab' }, 'Dịch đầu dò'), mbtn('«', () => L.moveCenter(ctr() - 5), '−5 mm'), mbtn('‹', () => L.moveCenter(ctr() - 1), '−1 mm'), mbtn('·‹', () => L.moveCenter(ctr() - 0.2), '−0,2 mm'), mbtn('›·', () => L.moveCenter(ctr() + 0.2), '+0,2 mm'), mbtn('›', () => L.moveCenter(ctr() + 1), '+1 mm'), mbtn('»', () => L.moveCenter(ctr() + 5), '+5 mm')),
      el('div', { class: 'mvgrp ygrp' }, el('span', { class: 'mvlab' }, 'Dọc mối hàn (y)'), mbtn('▼', () => L.move(pos.x, pos.y - 1), '−1 mm'), mbtn('▲', () => L.move(pos.x, pos.y + 1), '+1 mm'), mbtn('▼▼', () => L.move(pos.x, pos.y - 5), '−5 mm'), mbtn('▲▲', () => L.move(pos.x, pos.y + 5), '+5 mm')),
      el('div', { class: 'mvgrp' }, flipB, skewCtl), posTxt);
    function upd() {
      const pr = UT.PROBES[L.inst.probeId];
      flipB.style.display = (pr.type === 'angle' && spec.kind !== 'weld') ? '' : 'none';
      skewCtl.style.display = (pr.type === 'angle' && spec.kind === 'weld') ? '' : 'none';
      moveBar.querySelector('.ygrp').style.display = spec.kind === 'weld' ? '' : 'none';
      const face = spec.faces[pos.face];
      posTxt.textContent = (pr.type === 'angle' ? 'Mép trước đầu dò: ' : 'Tâm đầu dò: ') + (face && face.map === 'side' ? 'z = ' : 'x = ') + UT.fmt(pos.x) + ' mm' + (spec.kind === 'weld' ? ' · y = ' + UT.fmt(pos.y) + ' mm' : '') + (pr.type === 'angle' ? ' · hướng ' + (pos.fx > 0 ? '→' : '←') : '');
    }
    const iv = setInterval(upd, 150);

    // keyboard
    function onKey(e) {
      if (e.target.closest('input,select,textarea')) return;
      const st = e.shiftKey ? 0.2 : 1;
      if (e.key === 'ArrowLeft') { L.moveCenter(ctr() - st); e.preventDefault(); }
      if (e.key === 'ArrowRight') { L.moveCenter(ctr() + st); e.preventDefault(); }
      if (spec.kind === 'weld' && e.key === 'ArrowUp') { L.move(pos.x, pos.y + st); e.preventDefault(); }
      if (spec.kind === 'weld' && e.key === 'ArrowDown') { L.move(pos.x, pos.y - st); e.preventDefault(); }
    }
    window.addEventListener('keydown', onKey);

    // ---------- specimen / face ----------
    function fillFaces() {
      faceSel.innerHTML = '';
      const ks = Object.keys(spec.faces);
      ks.forEach(k => faceSel.appendChild(el('option', { value: k }, spec.faces[k].name)));
      faceSel.style.display = ks.length > 1 ? '' : 'none';
      if (ks.indexOf(pos.face) < 0) pos.face = ks[0];
      faceSel.value = pos.face;
    }
    function placeDefault() {
      const pr = UT.PROBES[L.inst.probeId];
      const d = cfg.defaultPos ? cfg.defaultPos(spec, pr, pos.face) : null;
      if (d) Object.assign(pos, d);
      else { pos.x = (spec.bounds.x0 + spec.bounds.x1) / 2; pos.fx = 1; }
      if (spec.width) pos.y = pos.y && pos.y <= spec.width ? pos.y : spec.width / 2;
      if (pr.type !== 'angle') pos.skew = 0;
    }
    L.setSpec = function (s) {
      spec = typeof s === 'string' ? (UT.SPEC[s] || cfg.specs.find(o => o.id === s)) : s;
      specSel.value = spec.id;
      fillFaces(); placeDefault(); L.ver++;
      if (v2) v2.fit();
      if (curView) { const v = curView; curView = null; setView(v); }
      cfg.onSpec && cfg.onSpec(spec);
    };
    specSel.addEventListener('change', () => L.setSpec(cfg.specs.map(x => typeof x === 'string' ? UT.SPEC[x] : x).find(o => o.id === specSel.value)));
    faceSel.addEventListener('change', () => { pos.face = faceSel.value; const fc = spec.faces[pos.face]; const pr = UT.PROBES[L.inst.probeId]; if (cfg.onFace) cfg.onFace(pos.face); placeDefault(); L.ver++; if (v2) v2.fit(); });
    L.setFace = (f) => { pos.face = f; faceSel.value = f; placeDefault(); L.ver++; };
    fillFaces(); placeDefault();
    setView(cfg.view || '2d');

    L.dispose = () => { clearInterval(iv); window.removeEventListener('keydown', onKey); if (v2) v2.dispose(); if (v3) v3.dispose(); L.inst.dispose(); root.remove(); };
    return L;
  };

  // info box helper
  UT.infoBox = function (title, html) {
    return el('section', { class: 'card info' }, el('h4', null, title), el('div', { class: 'info-b', html }));
  };
})(UT);
