/* ============ Core UI helpers, storage, 3D viewer ============ */
(function (UT) {
  UT.$ = (s, r) => (r || document).querySelector(s);
  UT.el = function (tag, attrs, ...kids) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else if (k === 'html') e.innerHTML = v;
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) if (c !== null && c !== undefined && c !== false) e.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    return e;
  };
  const el = UT.el;
  UT.fmt = (v, d) => (v === undefined || v === null || isNaN(v)) ? '–' : Number(v).toFixed(d === undefined ? 1 : d).replace('.', ',');

  // storage (safe)
  UT.store = {
    get(k, d) { try { const v = localStorage.getItem('utlab:' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('utlab:' + k, JSON.stringify(v)); } catch (e) { } }
  };

  // learner seed and probe truths
  UT.seed = UT.store.get('seed', 0) || Math.floor(Math.random() * 1e9);
  UT.store.set('seed', UT.seed);
  UT.TRUTH = UT.makeTruth(UT.seed);
  UT.newProbes = function () { UT.seed = Math.floor(Math.random() * 1e9); UT.store.set('seed', UT.seed); UT.TRUTH = UT.makeTruth(UT.seed); UT.store.set('setups', null); UT.SETUPS = defaultSetups(); };

  // instrument setups per probe (persisted)
  function defaultSetups() {
    const s = {};
    for (const id in UT.PROBES) {
      const p = UT.PROBES[id];
      s[id] = {
        range: p.type === 'angle' ? 100 : 50, vel: p.type === 'angle' ? 3000 : 5800,  delay: 0, gain: 30, reject: 0,
        angle: p.nom, X: 0, thk: 0, gainInit: true,
        gA: { start: 10, width: 20, thr: 30 }, gateMode: p.type === 'tr' ? 'flank' : 'peak',
        dac: { pts: [], on: true, refGain: null, block: null }, transfer: 0, peakHold: false,
        cal: {}
      };
    }
    return s;
  }
  UT.SETUPS = UT.store.get('setups', null) || defaultSetups();
  for (const id in UT.PROBES) if (!UT.SETUPS[id]) UT.SETUPS[id] = defaultSetups()[id];
  UT.saveSetups = () => UT.store.set('setups', UT.SETUPS);
  UT.resetSetup = (id) => { UT.SETUPS[id] = defaultSetups()[id]; UT.saveSetups(); };
  // "reference" calibration for learners who skip ahead
  UT.loadReferenceCal = function (id, opts) {
    const p = UT.PROBES[id], t = UT.TRUTH[id], s = UT.SETUPS[id];
    s.vel = UT.vel(p); s.delay = t.delay; s.angle = Math.round(t.angle * 2) / 2; s.X = Math.round(t.X * 2) / 2;
    if (p.type === 'tr') { s.delay = t.delay + 0.02; }
    s.cal = { done: true, ref: true };
    UT.saveSetups();
  };

  // progress
  UT.progress = UT.store.get('progress', {});
  UT.setProgress = (mod, val) => { UT.progress[mod] = Math.max(UT.progress[mod] || 0, val); UT.store.set('progress', UT.progress); };

  // ---------- number control ----------
  // cfg: {label, unit, get(), set(v), steps:[..], min, max, dec, id}
  UT.NumCtl = function (cfg) {
    let si = cfg.stepIndex || 0;
    const val = el('button', { class: 'nc-val', type: 'button', title: 'Chạm để nhập số' });
    const stepB = el('button', { class: 'nc-step', type: 'button', title: 'Đổi bước chỉnh' });
    const minus = el('button', { class: 'nc-btn', type: 'button', 'aria-label': 'Giảm ' + cfg.label }, '−');
    const plus = el('button', { class: 'nc-btn', type: 'button', 'aria-label': 'Tăng ' + cfg.label }, '+');
    const root = el('div', { class: 'nc' + (cfg.cls ? ' ' + cfg.cls : '') },
      el('div', { class: 'nc-lab' }, el('span', null, cfg.label), cfg.unit ? el('small', null, cfg.unit) : null),
      el('div', { class: 'nc-row' }, minus, val, plus), cfg.steps && cfg.steps.length > 1 ? stepB : null);
    function refresh() {
      const v = cfg.get();
      val.textContent = UT.fmt(v, cfg.dec === undefined ? 1 : cfg.dec);
      stepB.textContent = 'bước ' + String(cfg.steps[si]).replace('.', ',');
    }
    function change(dir) {
      let v = cfg.get() + dir * cfg.steps[si];
      const st = cfg.steps[si];
      v = Math.round(v / st) * st;
      if (cfg.min !== undefined) v = Math.max(cfg.min, v);
      if (cfg.max !== undefined) v = Math.min(cfg.max, v);
      cfg.set(+v.toFixed(4)); refresh();
    }
    function hold(btn, dir) {
      let t1, t2;
      const start = (e) => { e.preventDefault(); change(dir); t1 = setTimeout(() => { t2 = setInterval(() => change(dir), 70); }, 380); };
      const stop = () => { clearTimeout(t1); clearInterval(t2); };
      btn.addEventListener('pointerdown', start);
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, stop));
    }
    hold(minus, -1); hold(plus, 1);
    stepB.addEventListener('click', () => { si = (si + 1) % cfg.steps.length; refresh(); });
    root.addEventListener('wheel', (e) => { e.preventDefault(); change(e.deltaY < 0 ? 1 : -1); }, { passive: false });
    val.addEventListener('click', () => {
      const inp = el('input', { class: 'nc-input', type: 'number', step: 'any', value: cfg.get(), inputmode: 'decimal' });
      val.replaceWith(inp); inp.focus(); inp.select();
      const done = () => {
        const v = parseFloat(String(inp.value).replace(',', '.'));
        if (!isNaN(v)) cfg.set(UT.clamp(v, cfg.min === undefined ? -1e9 : cfg.min, cfg.max === undefined ? 1e9 : cfg.max));
        inp.replaceWith(val); refresh();
      };
      inp.addEventListener('blur', done);
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') inp.blur(); if (e.key === 'Escape') { inp.value = cfg.get(); inp.blur(); } });
    });
    refresh();
    root.refresh = refresh;
    return root;
  };

  UT.seg = function (opts, cur, on) { // segmented buttons
    const wrap = el('div', { class: 'seg', role: 'group' });
    const btns = opts.map(o => {
      const b = el('button', { type: 'button', class: 'seg-b' + (o.v === cur ? ' on' : '') }, o.t);
      b.addEventListener('click', () => { btns.forEach(x => x.classList.remove('on')); b.classList.add('on'); on(o.v); });
      wrap.appendChild(b); return b;
    });
    wrap.set = (v) => btns.forEach((b, i) => b.classList.toggle('on', opts[i].v === v));
    return wrap;
  };

  UT.toast = function (msg, kind) {
    document.querySelectorAll('.toast').forEach(x => x.remove());
    const t = el('div', { class: 'toast ' + (kind || '') }, msg);
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 2600);
  };

  // ---------- 3D viewer with custom orbit + pick-drag ----------
  UT.Viewer3D = function (container, opts) {
    opts = opts || {};
    const THREE = window.THREE;
    const ok = !!THREE && (function () { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl') || c.getContext('experimental-webgl')); } catch (e) { return false; } })();
    if (!ok) {
      container.appendChild(el('div', { class: 'no3d' }, 'Thiết bị/trình duyệt không hỗ trợ WebGL (3D). Hãy dùng chế độ 2D.'));
      return { ok: false, dispose() { }, render() { }, scene: null };
    }
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    if (opts.clip) renderer.localClippingEnabled = true;
    container.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = 'none';
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(opts.fov || 40, 1, opts.near || 1, opts.far || 5000);
    scene.add(new THREE.HemisphereLight(0xdfe9f5, 0x2a3440, 0.9));
    const dl = new THREE.DirectionalLight(0xffffff, 0.75); dl.position.set(0.6, 1, 0.8); scene.add(dl);
    const dl2 = new THREE.DirectionalLight(0x9fc4ff, 0.3); dl2.position.set(-1, 0.3, -0.6); scene.add(dl2);
    const sph = { r: opts.dist || 400, th: opts.theta === undefined ? 0.7 : opts.theta, ph: opts.phi === undefined ? 1.05 : opts.phi };
    const target = new THREE.Vector3().copy(opts.target || new THREE.Vector3());
    function place() {
      sph.ph = UT.clamp(sph.ph, 0.05, Math.PI - 0.05);
      camera.position.set(target.x + sph.r * Math.sin(sph.ph) * Math.sin(sph.th), target.y + sph.r * Math.cos(sph.ph), target.z + sph.r * Math.sin(sph.ph) * Math.cos(sph.th));
      camera.lookAt(target); dirty = true;
    }
    let dirty = true, alive = true, anim = null;
    const ptrs = new Map(); let mode = null, last = null, pinch0 = 0;
    const dom = renderer.domElement;
    const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2();
    function toNDC(e) { const r = dom.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); return ray; }
    dom.addEventListener('pointerdown', (e) => {
      dom.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 1) {
        if (opts.onPick && e.button === 0 && opts.onPick(toNDC(e), e)) { mode = 'drag'; }
        else mode = (e.button === 2 || e.shiftKey) ? 'pan' : 'rot';
      } else if (ptrs.size === 2) {
        mode = 'pinch'; const a = [...ptrs.values()]; pinch0 = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
        last = { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 };
      }
      if (mode !== 'pinch') last = { x: e.clientX, y: e.clientY };
    });
    dom.addEventListener('pointermove', (e) => {
      if (!ptrs.has(e.pointerId)) {
        if (opts.onHover) opts.onHover(toNDC(e), e);
        return;
      }
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (mode === 'drag') { opts.onDrag && opts.onDrag(toNDC(e), e); dirty = true; return; }
      if (mode === 'pinch' && ptrs.size === 2) {
        const a = [...ptrs.values()]; const d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
        sph.r = UT.clamp(sph.r * pinch0 / Math.max(10, d), opts.minDist || 30, opts.maxDist || 3000); pinch0 = d;
        const c = { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 };
        pan(c.x - last.x, c.y - last.y); last = c; place(); return;
      }
      const dx = e.clientX - last.x, dy = e.clientY - last.y; last = { x: e.clientX, y: e.clientY };
      if (mode === 'rot') { sph.th -= dx * 0.008; sph.ph -= dy * 0.008; place(); }
      else if (mode === 'pan') { pan(dx, dy); place(); }
    });
    function pan(dx, dy) {
      const k = sph.r * 0.0016;
      const right = new THREE.Vector3(); const up = new THREE.Vector3();
      camera.matrix.extractBasis(right, up, new THREE.Vector3());
      target.addScaledVector(right, -dx * k).addScaledVector(up, dy * k);
    }
    const end = (e) => { ptrs.delete(e.pointerId); if (mode === 'drag' && opts.onDragEnd) opts.onDragEnd(); if (ptrs.size === 0) mode = null; else if (ptrs.size === 1) { mode = 'rot'; last = [...ptrs.values()][0]; } };
    dom.addEventListener('pointerup', end); dom.addEventListener('pointercancel', end);
    dom.addEventListener('contextmenu', (e) => e.preventDefault());
    dom.addEventListener('wheel', (e) => { e.preventDefault(); sph.r = UT.clamp(sph.r * (e.deltaY > 0 ? 1.1 : 0.9), opts.minDist || 30, opts.maxDist || 3000); place(); }, { passive: false });
    const ro = new ResizeObserver(() => {
      const w = container.clientWidth, h = container.clientHeight;
      if (w < 2 || h < 2) return;
      renderer.setSize(w, h, false); dom.style.width = w + 'px'; dom.style.height = h + 'px';
      camera.aspect = w / h; camera.updateProjectionMatrix(); dirty = true;
    });
    ro.observe(container);
    place();
    function loop(t) {
      if (!alive) return;
      if (opts.onFrame) { if (opts.onFrame(t)) dirty = true; }
      if (dirty) { renderer.render(scene, camera); dirty = false; }
      anim = requestAnimationFrame(loop);
    }
    anim = requestAnimationFrame(loop);
    return {
      ok: true, THREE, scene, camera, renderer, target, sph,
      render() { dirty = true; }, place,
      setView(th, ph, r, tgt) { sph.th = th; sph.ph = ph; if (r) sph.r = r; if (tgt) target.copy(tgt); place(); },
      dispose() { alive = false; cancelAnimationFrame(anim); ro.disconnect(); scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); } }); renderer.dispose(); renderer.domElement.remove(); }
    };
  };

  // text sprite for 3D labels
  UT.label3D = function (THREE, text, opts) {
    opts = opts || {};
    const c = document.createElement('canvas'); const ctx = c.getContext('2d');
    const fs = 44; ctx.font = '600 ' + fs + 'px "Be Vietnam Pro", system-ui, sans-serif';
    const w = Math.ceil(ctx.measureText(text).width) + 28; c.width = w; c.height = fs + 22;
    ctx.font = '600 ' + fs + 'px "Be Vietnam Pro", system-ui, sans-serif';
    ctx.fillStyle = opts.bg || 'rgba(12,20,30,0.82)'; ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(0, 0, w, c.height, 14); else ctx.rect(0, 0, w, c.height); ctx.fill();
    ctx.fillStyle = opts.color || '#e9f1f8'; ctx.textBaseline = 'middle'; ctx.fillText(text, 14, c.height / 2 + 2);
    const tex = new THREE.CanvasTexture(c); tex.minFilter = THREE.LinearFilter;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    const s = opts.size || 10; sp.scale.set(s * w / c.height, s, 1); sp.renderOrder = 10;
    return sp;
  };

  // canvas helper with DPR handling
  UT.canvas = function (container, onResize) {
    const c = el('canvas', { class: 'cv' });
    container.appendChild(c);
    const ctx = c.getContext('2d');
    const st = { c, ctx, w: 0, h: 0, dpr: 1 };
    const ro = new ResizeObserver(() => {
      const r = container.getBoundingClientRect();
      st.dpr = Math.min(2, window.devicePixelRatio || 1);
      st.w = Math.max(10, r.width); st.h = Math.max(10, r.height);
      c.width = Math.round(st.w * st.dpr); c.height = Math.round(st.h * st.dpr);
      c.style.width = st.w + 'px'; c.style.height = st.h + 'px';
      ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
      onResize && onResize(st);
    });
    ro.observe(container);
    st.dispose = () => { ro.disconnect(); c.remove(); };
    return st;
  };

  // ---------- task panel ----------
  // steps: [{t: title, h: hint html, check: () => bool | 'warn'}]
  UT.TaskPanel = function (container, modId, title, steps, opts) {
    opts = opts || {};
    const list = el('ol', { class: 'steps' });
    const score = el('div', { class: 'score' });
    const root = el('section', { class: 'tasks' }, el('header', null, el('h3', null, title), score), list);
    container.appendChild(root);
    const items = steps.map((s, i) => {
      const hint = el('div', { class: 'hint', html: s.h || '' });
      const li = el('li', { class: 'step' }, el('div', { class: 'st-head' }, el('span', { class: 'st-dot' }), el('span', { class: 'st-t' }, s.t)), hint);
      li.addEventListener('click', (e) => { if (e.target.closest('button,input,select')) return; li.classList.toggle('open'); });
      list.appendChild(li); return li;
    });
    let firstOpen = -1;
    const done = new Array(steps.length).fill(false);
    function tick() {
      let n = 0;
      steps.forEach((s, i) => {
        let r = false; try { r = s.check ? s.check() : false; } catch (e) { r = false; }
        if (s.sticky && done[i]) r = true;
        if (r === true) { done[i] = true; n++; }
        else if (!s.sticky) done[i] = false;
        items[i].classList.toggle('ok', r === true); items[i].classList.toggle('warn', r === 'warn');
      });
      const cur = done.indexOf(false);
      if (cur !== firstOpen) { items.forEach((it, i) => it.classList.toggle('cur', i === cur)); if (cur >= 0 && opts.autoOpen !== false) { items.forEach(it => it.classList.remove('open')); items[cur].classList.add('open'); } firstOpen = cur; }
      const pct = Math.round(100 * n / steps.length);
      score.textContent = n + '/' + steps.length + ' bước';
      score.classList.toggle('full', n === steps.length);
      UT.setProgress(modId, pct);
    }
    const iv = setInterval(tick, 350); tick();
    return { root, tick, dispose() { clearInterval(iv); } };
  };
})(UT);
