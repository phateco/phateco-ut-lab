/* ============ Specimen views: 2D cross-section and 3D ============ */
(function (UT) {
  const el = UT.el, D2R = UT.D2R;
  const FT = () => UT.SPEC.FLAW_TYPES;

  // local (u along face, w depth) -> global (x,z)
  UT.faceToGlobal = function (spec, faceId, u, w) {
    const f = spec.faces[faceId] || {};
    if (f.map === 'bottom') return [u, f.T - w];
    if (f.map === 'side') return [f.X - w, u];
    return [u, w];
  };

  function pip(pt, poly) {
    let c = false; const x = pt[0], y = pt[1];
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi + 1e-12) + xi)) c = !c;
    }
    return c;
  }
  // trace a beam ray in local face coords; returns [[u,w,yoff], ...]
  UT.traceRay = function (spec, faceId, u0, th, du, L, dy) {
    const face = spec.faces[faceId] || spec.faces[Object.keys(spec.faces)[0]];
    const T = face.T, maxLegs = face.legs || 1;
    const inside = (u, w) => {
      const g = UT.faceToGlobal(spec, faceId, u, w);
      if (!pip(g, spec.outline) && !(spec.weld && pip(g, spec.weld))) return false;
      for (const h of (spec.holes || [])) if ((g[0] - h.x) ** 2 + (g[1] - h.z) ** 2 < h.r * h.r) return false;
      return true;
    };
    const st = 0.5, su = du * Math.sin(th), sw = Math.cos(th), sy = (dy || 0) * Math.sin(th);
    let u = u0, w = 0.01, y = 0, dir = 1, leg = 1, s = 0;
    const pts = [[u0, 0, 0]];
    while (s < L) {
      let nu = u + su * st, nw = w + dir * sw * st, ny = y + sy * st;
      if (T && dir > 0 && nw >= T && leg < maxLegs && inside(u + su * (T - w) / sw, T - 0.01)) {
        const f = (T - w) / (sw * st); u += su * st * f; y += sy * st * f; w = T; pts.push([u, w, y]); dir = -1; leg++; s += st * f; continue;
      }
      if (T && dir < 0 && nw <= 0 && leg < maxLegs) {
        const f = w / (sw * st); u += su * st * f; y += sy * st * f; w = 0; pts.push([u, w, y]); dir = 1; leg++; s += st * f; continue;
      }
      if (!inside(nu, nw)) { pts.push([nu, nw, ny]); break; }
      u = nu; w = nw; y = ny; s += st;
    }
    if (pts.length === 1 || pts[pts.length - 1][0] !== u) pts.push([u, w, y]);
    return pts;
  };

  // ======================= 2D =======================
  UT.SpecView2D = function (container, o) {
    const V = { zoom: 1, cx: null, cz: null };
    const wrap = el('div', { class: 'sv2' });
    container.appendChild(wrap);
    const cv = UT.canvas(wrap, () => { if (V.cx === null) fit(); });
    let k = 1, ox = 0, oy = 0;
    function fit() {
      const b = o.spec().bounds;
      V.cx = (b.x0 + b.x1) / 2; V.cz = (b.z0 + b.z1) / 2; V.zoom = 1;
    }
    V.fit = fit;
    V.focusProbe = function (z) {
      const sp = o.spec(), pos = o.pos(); const pr = UT.PROBES[o.probeId()]; const face = sp.faces[pos.face] || {};
      if (sp.kind === 'weld' && pr.type === 'angle' && face.T) {
        const s = UT.SETUPS[o.probeId()]; const xi = pos.x - pos.fx * s.X;
        const g = UT.faceToGlobal(sp, pos.face, xi + pos.fx * face.T * Math.tan(s.angle * UT.D2R) * 0.55, face.T * 0.45);
        V.cx = g[0]; V.cz = g[1]; V.zoom = 2.3; return;
      }
      const g = UT.faceToGlobal(sp, pos.face, pos.x, 0);
      V.cx = g[0]; V.cz = g[1] + (face.map === 'bottom' ? -10 : 10); V.zoom = z || 4;
    };
    function xform() {
      const b = o.spec().bounds;
      const k0 = Math.min(cv.w / (b.x1 - b.x0), cv.h / (b.z1 - b.z0));
      k = k0 * V.zoom; ox = cv.w / 2 - V.cx * k; oy = cv.h / 2 - V.cz * k;
    }
    const SX = (x) => ox + x * k, SY = (z) => oy + z * k;
    V.toWorld = (px, py) => [(px - ox) / k, (py - oy) / k];

    function poly(ctx, pts) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(SX(p[0]), SY(p[1])) : ctx.moveTo(SX(p[0]), SY(p[1]))); ctx.closePath(); }

    function draw() {
      if (!cv.w) return;
      const ctx = cv.ctx, sp = o.spec(), pos = o.pos(), probe = UT.PROBES[o.probeId()];
      if (V.cx === null) fit();
      xform();
      ctx.clearRect(0, 0, cv.w, cv.h);
      // steel body
      const grd = ctx.createLinearGradient(0, SY(0), 0, SY(sp.T || 50));
      grd.addColorStop(0, '#5d6c79'); grd.addColorStop(1, '#45525e');
      ctx.fillStyle = grd; poly(ctx, sp.outline); ctx.fill();
      ctx.strokeStyle = '#a9bccb'; ctx.lineWidth = 1.2; ctx.stroke();
      if (sp.weld) {
        ctx.fillStyle = 'rgba(120,98,70,0.55)'; poly(ctx, sp.weld); ctx.fill();
        ctx.strokeStyle = 'rgba(230,200,150,0.55)'; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
        if (sp.joint !== 'T') { ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.moveTo(SX(0), SY(-8)); ctx.lineTo(SX(0), SY(sp.T + 8)); ctx.stroke(); }
      }
      for (const h of (sp.holes || [])) { ctx.fillStyle = '#0d151c'; ctx.beginPath(); ctx.arc(SX(h.x), SY(h.z), Math.max(1.6, h.r * k), 0, 7); ctx.fill(); ctx.strokeStyle = '#a9bccb'; ctx.stroke(); if (h.label && k > 1.2) { ctx.fillStyle = '#cfe0ec'; ctx.font = '10px "Be Vietnam Pro",system-ui'; ctx.textAlign = 'left'; ctx.fillText(h.label, SX(h.x) + Math.max(4, h.r * k) + 3, SY(h.z) + 3); } }
      for (const n of (sp.notches || [])) { ctx.fillStyle = '#0d151c'; ctx.fillRect(SX(n.x) - 1.5, SY(n.z0), 3, Math.max(2, (n.z1 - n.z0) * k)); }
      // marks
      ctx.font = '10px "Be Vietnam Pro",system-ui'; ctx.textBaseline = 'alphabetic';
      for (const m of (sp.marks || [])) {
        if (m.type === 'slot') { ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(SX(m.x), SY(-2)); ctx.lineTo(SX(m.x), SY(6)); ctx.stroke(); ctx.fillStyle = '#ffd166'; ctx.textAlign = 'center'; ctx.fillText(m.label, SX(m.x), SY(0) - 26); }
        if (m.type === 'tick') { ctx.fillStyle = '#9fb3c2'; ctx.textAlign = 'center'; ctx.fillText(m.label, SX(m.x), SY((sp.T || 25)) + 14); }
        if (m.type === 'point') {
          ctx.fillStyle = '#7ef0c0'; ctx.textAlign = 'center'; ctx.beginPath(); ctx.moveTo(SX(m.x), SY(0) - 4); ctx.lineTo(SX(m.x) - 5, SY(0) - 12); ctx.lineTo(SX(m.x) + 5, SY(0) - 12); ctx.fill();
          ctx.font = '600 11px "Be Vietnam Pro",system-ui'; ctx.fillText(m.label, SX(m.x), SY(0) - 16); ctx.font = '10px "Be Vietnam Pro",system-ui';
          if (m.zone) { ctx.strokeStyle = 'rgba(126,240,192,0.6)'; ctx.beginPath(); ctx.moveTo(SX(m.zone[0]), SY(0) - 6); ctx.lineTo(SX(m.zone[1]), SY(0) - 6); ctx.stroke(); }
        }
        if (m.type === 'angleScale') {
          ctx.strokeStyle = m.row2 ? '#5cc8f0' : '#ffd166'; ctx.fillStyle = ctx.strokeStyle; ctx.textAlign = 'center';
          const y0 = SY(0) + (m.row2 ? 26 : 0);
          for (let a = m.from; a <= m.to; a += 1) {
            const x = m.hole[0] - m.side * m.hole[1] * Math.tan(a * D2R);
            const big = a % m.step === 0;
            ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(SX(x), y0); ctx.lineTo(SX(x), y0 + (big ? 9 : 5)); ctx.stroke();
            if (big && (k > 1.6 || a % 10 === 0)) ctx.fillText(a + '°', SX(x), y0 + 19);
          }
          if (k > 1.6) { ctx.textAlign = 'left'; ctx.fillText(m.label, SX(m.hole[0] - m.side * m.hole[1] * Math.tan(m.to * D2R)) + 14, y0 + 19); }
        }
      }
      // flaws
      if (o.reveal && o.reveal() && sp.flaws) {
        for (const f of sp.features) {
          if (!f.type || f.type === 'geo') continue;
          if (o.yFilter && f.kind !== 'point' && (pos.y < f.y1 - 6 || pos.y > f.y2 + 6) && o.yFilter()) continue;
          if (o.yFilter && f.kind === 'point' && Math.abs(pos.y - f.y) > 6 && o.yFilter()) continue;
          const col = FT()[f.type].color; ctx.fillStyle = col; ctx.strokeStyle = col;
          if (f.kind === 'point') { ctx.beginPath(); ctx.arc(SX(f.x), SY(f.z), Math.max(1.5, f.d / 2 * k), 0, 7); ctx.fill(); }
          else if (f.kind === 'facet') { const tx = -Math.sin(f.nA), tz = Math.cos(f.nA); ctx.lineWidth = Math.max(1.5, 0.5 * k); ctx.beginPath(); ctx.moveTo(SX(f.x - tx * f.hh), SY(f.z - tz * f.hh)); ctx.lineTo(SX(f.x + tx * f.hh), SY(f.z + tz * f.hh)); ctx.stroke(); }
        }
      }
      // scale ruler for welds (distance from weld centerline)
      if (sp.kind === 'weld' && sp.joint !== 'T') {
        ctx.fillStyle = '#7f97a8'; ctx.strokeStyle = 'rgba(160,190,210,0.4)'; ctx.textAlign = 'center';
        for (let x = -140; x <= 140; x += 10) { ctx.beginPath(); ctx.moveTo(SX(x), SY(sp.T) + 2); ctx.lineTo(SX(x), SY(sp.T) + (x % 50 === 0 ? 10 : 6)); ctx.stroke(); if (x % 50 === 0) ctx.fillText(x, SX(x), SY(sp.T) + 22); }
      }

      // probe & beam in local frame of face
      const face = sp.faces[pos.face] || sp.faces[Object.keys(sp.faces)[0]];
      const tr = UT.TRUTH[o.probeId()], inst = UT.SETUPS[o.probeId()];
      ctx.save();
      // local->global affine, then global->screen
      let a = 1, b = 0, c = 0, d = 1, e = 0, f = 0; // x = a*u + c*w + e ; z = b*u + d*w + f
      if (face.map === 'bottom') { d = -1; f = face.T; }
      if (face.map === 'side') { a = 0; b = 1; c = -1; d = 0; e = face.X; f = 0; }
      ctx.transform(k * a, k * b, k * c, k * d, ox + k * e, oy + k * f);
      const px = 1 / k;
      const isA = probe.type === 'angle';
      const bm = UT.beam(probe, tr);
      const xi = isA ? pos.x - pos.fx * tr.X : pos.x;
      if (o.showRays && o.showRays()) {
        const T = face.T || 1e6; const L = inst.range * 1.02;
        const rays = isA ? [[bm.theta, 'rgba(255,230,120,0.9)', 1.6], [bm.theta - bm.g6, 'rgba(255,230,120,0.35)', 1], [bm.theta + bm.g6, 'rgba(255,230,120,0.35)', 1]] : [[0, 'rgba(255,230,120,0.9)', 1.6], [-bm.g6, 'rgba(255,230,120,0.3)', 1], [bm.g6, 'rgba(255,230,120,0.3)', 1]];
        for (const [th, col, lw] of rays) {
          ctx.strokeStyle = col; ctx.lineWidth = lw * px; ctx.beginPath();
          const tp = UT.traceRay(sp, pos.face, xi, Math.abs(th), (isA ? pos.fx : 1) * Math.sign(th || 1), L, 0);
          tp.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]));
          ctx.stroke();
        }
      }
      // probe body
      ctx.lineWidth = 1 * px;
      if (isA) {
        const fx = pos.fx, L = probe.len;
        // incidence angle in the wedge; crystal sits on the inclined face, facing down-forward to the index point
        const al = Math.asin(Math.min(0.99, Math.sin(bm.theta) * 2.73 / 3.24));
        const dC = 10, Cu = xi - fx * dC * Math.sin(al), Cw = -dC * Math.cos(al);
        const fw = (u) => Cw - Math.tan(al) * fx * (u - Cu);
        const ub = pos.x - fx * L, wb = Math.min(-2, fw(ub)), wf = fw(pos.x - fx * 1.5);
        ctx.fillStyle = 'rgba(216,194,122,0.55)'; ctx.strokeStyle = '#d8c27a';
        ctx.beginPath(); ctx.moveTo(pos.x, 0); ctx.lineTo(ub, 0); ctx.lineTo(ub, wb); ctx.lineTo(pos.x - fx * 1.5, wf); ctx.lineTo(pos.x, wf); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#2b3946'; ctx.strokeStyle = '#c8d6e2';
        ctx.beginPath(); ctx.moveTo(ub, wb); ctx.lineTo(pos.x - fx * 1.5, wf); ctx.lineTo(pos.x - fx * 1.5, wf - 7); ctx.lineTo(ub, wf - 7); ctx.closePath(); ctx.fill(); ctx.stroke();
        // crystal on the inclined face
        ctx.save(); ctx.translate(Cu, Cw); ctx.rotate(-fx * al); ctx.fillStyle = '#e0b84a'; ctx.fillRect(-probe.D / 2, -1.6, probe.D, 1.6); ctx.restore();
        // cable
        ctx.strokeStyle = '#777'; ctx.lineWidth = 2.2 * px; ctx.beginPath(); ctx.moveTo(ub, wf - 4); ctx.lineTo(ub - fx * 10, wf - 7); ctx.stroke();
        // ruler ticks from front edge
        ctx.strokeStyle = '#f0f4f8'; ctx.fillStyle = '#f0f4f8'; ctx.lineWidth = 0.6 * px;
        for (let m = 0; m <= L; m++) {
          const x = pos.x - fx * m; ctx.beginPath(); ctx.moveTo(x, -0.3); ctx.lineTo(x, -(m % 5 === 0 ? 2.6 : 1.4)); ctx.stroke();
          if (m % 5 === 0 && k > 3) { ctx.save(); ctx.translate(x, -3.4); if (face.map === 'bottom') ctx.scale(1, -1); ctx.scale(px, px); ctx.font = '9px "JetBrains Mono",monospace'; ctx.textAlign = 'center'; ctx.fillText(m, 0, 0); ctx.restore(); }
        }
        // instrument X-value marker
        const xe = pos.x - fx * inst.X;
        ctx.fillStyle = '#ff7a45'; ctx.beginPath(); ctx.moveTo(xe, -0.4); ctx.lineTo(xe - 1.3, -3.2); ctx.lineTo(xe + 1.3, -3.2); ctx.fill();
        // true index (learn reveal)
        if (o.reveal && o.reveal() && o.showIndex && o.showIndex()) { ctx.fillStyle = '#7ef0c0'; ctx.beginPath(); ctx.arc(xi, 0, 1.0, 0, 7); ctx.fill(); }
      } else {
        const hw = probe.D / 2 + 3;
        ctx.fillStyle = '#2b3946'; ctx.strokeStyle = '#c8d6e2';
        ctx.fillRect(pos.x - hw, -22, 2 * hw, 22); ctx.strokeRect(pos.x - hw, -22, 2 * hw, 22);
        ctx.fillStyle = '#e0b84a';
        if (probe.type === 'tr') { ctx.fillRect(pos.x - hw + 1.5, -5, hw - 2.5, 1.6); ctx.fillRect(pos.x + 1, -5, hw - 2.5, 1.6); ctx.strokeStyle = '#999'; ctx.beginPath(); ctx.moveTo(pos.x, -22); ctx.lineTo(pos.x, 0); ctx.stroke(); }
        else ctx.fillRect(pos.x - probe.D / 2, -3, probe.D, 1.6);
        ctx.strokeStyle = '#777'; ctx.lineWidth = 2.2 * px; ctx.beginPath(); ctx.moveTo(pos.x, -22); ctx.lineTo(pos.x, -32); ctx.stroke();
        ctx.strokeStyle = '#ff7a45'; ctx.lineWidth = 1 * px; ctx.beginPath(); ctx.moveTo(pos.x, -23); ctx.lineTo(pos.x, -19); ctx.stroke();
      }
      // gate plot (instrument values)
      const I = o.inst && o.inst();
      if (I && I.read && I.read.found && o.showPlot && o.showPlot()) {
        const g = UT.readouts(inst, I.read.pos, probe);
        const xe = isA ? pos.x - pos.fx * inst.X : pos.x;
        const u = isA ? xe + pos.fx * g.P : xe;
        const w = g.D;
        ctx.strokeStyle = '#ff5a5f'; ctx.lineWidth = 1.4 * px;
        const r = 2.4;
        ctx.beginPath(); ctx.moveTo(u - r, w); ctx.lineTo(u + r, w); ctx.moveTo(u, w - r); ctx.lineTo(u, w + r); ctx.stroke();
        ctx.beginPath(); ctx.arc(u, w, r * 0.6, 0, 7); ctx.stroke();
        V.lastPlot = { u, w, face: pos.face };
      } else V.lastPlot = null;
      ctx.restore();
      if (o.onDraw) o.onDraw(ctx, { SX, SY, k });
    }

    // interaction
    let drag = null;
    cv.c.style.touchAction = 'none';
    const pts = new Map();
    cv.c.addEventListener('pointerdown', (e) => {
      cv.c.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const r = cv.c.getBoundingClientRect(); const px = e.clientX - r.left, py = e.clientY - r.top;
      if (pts.size === 2) { const a = [...pts.values()]; drag = { mode: 'pinch', d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), z: V.zoom }; return; }
      const sp = o.spec(), pos = o.pos();
      const [wx, wz] = V.toWorld(px, py);
      // local coords of pointer
      const face = sp.faces[pos.face] || {};
      let u = wx, w = wz;
      if (face.map === 'bottom') { w = face.T - wz; }
      if (face.map === 'side') { u = wz; w = face.X - wx; }
      const probe = UT.PROBES[o.probeId()];
      const pc = probe.type === 'angle' ? pos.x - pos.fx * probe.len / 2 : pos.x;
      const near = Math.abs(u - pc) < Math.max(probe.len * 0.7, 18 / k) && w < 8 && w > -30;
      if (near && e.button === 0) { drag = { mode: 'probe', off: pc - u }; }
      else drag = { mode: 'pan', x: px, y: py, cx: V.cx, cz: V.cz };
    });
    cv.c.addEventListener('pointermove', (e) => {
      if (!drag) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const r = cv.c.getBoundingClientRect(); const px = e.clientX - r.left, py = e.clientY - r.top;
      if (drag.mode === 'pinch' && pts.size === 2) { const a = [...pts.values()]; V.zoom = UT.clamp(drag.z * Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) / drag.d, 0.5, 40); return; }
      if (drag.mode === 'probe') {
        const sp = o.spec(), pos = o.pos(); const face = sp.faces[pos.face] || {};
        const [wx, wz] = V.toWorld(px, py);
        let u = face.map === 'side' ? wz : wx;
        o.moveCenter(u + drag.off);
      } else if (drag.mode === 'pan') { V.cx = drag.cx - (px - drag.x) / k; V.cz = drag.cz - (py - drag.y) / k; }
    });
    const up = (e) => { pts.delete(e.pointerId); if (pts.size === 0) drag = null; };
    cv.c.addEventListener('pointerup', up); cv.c.addEventListener('pointercancel', up);
    cv.c.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = cv.c.getBoundingClientRect(); const px = e.clientX - r.left, py = e.clientY - r.top;
      const [wx, wz] = V.toWorld(px, py);
      V.zoom = UT.clamp(V.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15), 0.5, 40);
      xform(); const [wx2, wz2] = V.toWorld(px, py); V.cx += wx - wx2; V.cz += wz - wz2;
    }, { passive: false });

    let alive = true;
    (function loop() { if (!alive) return; draw(); requestAnimationFrame(loop); })();
    V.dispose = () => { alive = false; cv.dispose(); wrap.remove(); };
    V.root = wrap;
    return V;
  };

  // ======================= 3D =======================
  UT.SpecView3D = function (container, o) {
    const sp0 = o.spec();
    const b = sp0.bounds;
    const W = sp0.width || 30;
    const size = Math.max(b.x1 - b.x0, W, b.z1 - b.z0);
    const tgt0 = [(b.x0 + b.x1) / 2, -((sp0.T || 30) / 2), W / 2];
    let groups = {};
    let grab = null;
    const V3 = UT.Viewer3D(container, {
      dist: size * (sp0.kind === 'weld' ? 1.75 : 1.35), theta: 0.55, phi: 1.0, near: 1, far: 8000, minDist: 20, maxDist: size * 4,
      target: window.THREE ? new window.THREE.Vector3(...tgt0) : null,
      onPick(ray, e) {
        const hits = ray.intersectObjects([groups.probe, groups.body].filter(Boolean), true);
        if (!hits.length) return false;
        const onProbe = hits[0].object.userData.probe;
        const p = facePoint(ray); if (!p) return false;
        const pos = o.pos(), pr = UT.PROBES[o.probeId()];
        const c = pr.type === 'angle' ? pos.x - pos.fx * pr.len / 2 : pos.x;
        grab = onProbe ? { du: c - p.u, dy: pos.y - p.y } : { du: 0, dy: 0, jump: true };
        if (!onProbe) { if (!o.allowJump || !o.allowJump()) { grab = null; return false; } o.moveCenter(p.u, p.y); }
        return true;
      },
      onDrag(ray) { if (!grab) return; const p = facePoint(ray); if (p) o.moveCenter(p.u + grab.du, p.y + grab.dy); },
      onDragEnd() { grab = null; },
      onFrame() { return update(); }
    });
    if (!V3.ok) return { ok: false, dispose() { V3.dispose(); }, rebuild() { } };
    const THREE = V3.THREE, scene = V3.scene;

    function facePoint(ray) {
      const sp = o.spec(), pos = o.pos(); const face = sp.faces[pos.face] || {};
      let plane;
      if (face.map === 'bottom') plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), -face.T);
      else if (face.map === 'side') plane = new THREE.Plane(new THREE.Vector3(1, 0, 0), -face.X);
      else plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const pt = new THREE.Vector3();
      if (!ray.ray.intersectPlane(plane, pt)) return null;
      if (face.map === 'side') return { u: -pt.y, y: pt.z };
      return { u: pt.x, y: pt.z };
    }

    const steel = new THREE.MeshStandardMaterial({ color: 0x9aa8b5, metalness: 0.55, roughness: 0.42, transparent: true, opacity: 0.95, side: THREE.DoubleSide });
    const weldM = new THREE.MeshStandardMaterial({ color: 0x8a7458, metalness: 0.5, roughness: 0.6, transparent: true, opacity: 0.95, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });

    function shapeFrom(pts, holes) {
      const s = new THREE.Shape();
      pts.forEach((p, i) => i ? s.lineTo(p[0], -p[1]) : s.moveTo(p[0], -p[1]));
      s.closePath();
      for (const h of (holes || [])) { const hp = new THREE.Path(); hp.absarc(h.x, -h.z, Math.max(0.5, h.r), 0, Math.PI * 2, true); s.holes.push(hp); }
      return s;
    }
    function build() {
      for (const k in groups) if (groups[k]) { scene.remove(groups[k]); groups[k].traverse(x => { if (x.geometry) x.geometry.dispose(); }); }
      groups = {};
      const sp = o.spec(); const Wd = sp.width || 30;
      const body = new THREE.Group();
      const g = new THREE.ExtrudeGeometry(shapeFrom(sp.outline, sp.holes), { depth: Wd, bevelEnabled: false, curveSegments: 40 });
      const m = new THREE.Mesh(g, steel); body.add(m);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(g, 25), new THREE.LineBasicMaterial({ color: 0xcfe0ee, transparent: true, opacity: 0.35 }));
      body.add(edges);
      if (sp.weld) {
        const wg = new THREE.ExtrudeGeometry(shapeFrom(sp.weld), { depth: Wd, bevelEnabled: false });
        body.add(new THREE.Mesh(wg, weldM));
        // ripples on cap
        const lines = new THREE.Group();
        for (let y = 4; y < Wd; y += 4) {
          const pts = sp.weld.filter(p => p[1] <= 0.01).map(p => new THREE.Vector3(p[0], -p[1] + 0.05, y + Math.abs(p[0]) * 0.18));
          if (pts.length > 2) lines.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x5c4a36, transparent: true, opacity: 0.6 })));
        }
        body.add(lines);
      }
      for (const n of (sp.notches || [])) {
        const ng = new THREE.BoxGeometry(1.2, n.z1 - n.z0, Wd * 0.7);
        const nm = new THREE.Mesh(ng, new THREE.MeshBasicMaterial({ color: 0x111111 })); nm.position.set(n.x, -(n.z0 + n.z1) / 2, Wd / 2); body.add(nm);
      }
      // marks on top
      for (const mk of (sp.marks || [])) {
        if (mk.type === 'slot') { const l = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, Wd), new THREE.MeshBasicMaterial({ color: 0xffd166 })); l.position.set(mk.x, 0.16, Wd / 2); body.add(l); }
        if (mk.type === 'point') { const l = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 0.3, 20), new THREE.MeshBasicMaterial({ color: 0x7ef0c0 })); l.position.set(mk.x, 0.2, Wd / 2); body.add(l); const lb = UT.label3D(THREE, mk.label, { size: 6 }); lb.position.set(mk.x, 8, Wd / 2); body.add(lb); }
        if (mk.type === 'angleScale') {
          for (let a = mk.from; a <= mk.to; a += (mk.row2 ? 4 : 5)) {
            const x = mk.hole[0] - mk.side * mk.hole[1] * Math.tan(a * D2R);
            const col = mk.row2 ? 0x5cc8f0 : 0xffd166; const l = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4, 0.3), new THREE.MeshBasicMaterial({ color: col })); l.position.set(x, mk.row2 ? -10 : -2, Wd + 0.2); body.add(l);
            const lb = UT.label3D(THREE, a + '°', { size: 4, color: mk.row2 ? '#5cc8f0' : '#ffd166' }); lb.position.set(x, mk.row2 ? -16 : -7, Wd + 1); body.add(lb);
          }
        }
      }
      body.traverse(x => { if (x.isMesh) x.userData.body = true; });
      scene.add(body); groups.body = body;
      // flaws
      const fl = new THREE.Group();
      for (const f of (sp.features || [])) {
        if (!f.type || f.type === 'geo') continue;
        const col = new THREE.Color(FT()[f.type].color);
        const mat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.45, roughness: 0.5, transparent: true, opacity: 0.95, depthTest: true });
        if (f.kind === 'point') { const s = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.5, f.d / 2), 10, 8), mat); s.position.set(f.x, -f.z, f.y); fl.add(s); }
        else if (f.kind === 'facet') {
          const len = Math.max(0.5, f.y2 - f.y1);
          const bx = new THREE.Mesh(new THREE.BoxGeometry(0.35, f.hh * 2, len), mat);
          bx.position.set(f.x, -f.z, (f.y1 + f.y2) / 2);
          bx.rotation.z = -(f.nA); // normal angle in x-z; box thickness along x
          fl.add(bx);
        }
      }
      scene.add(fl); groups.flaws = fl;
      // labels for welds
      const lab = new THREE.Group();
      if (sp.kind === 'weld') {
        for (let y = 0; y <= Wd; y += 50) {
          const t = UT.label3D(THREE, 'y = ' + y, { size: 11, color: '#ffd166' });
          t.position.set(sp.joint === 'T' ? -150 : -150, 3, y); lab.add(t);
          const tk = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 0.6), new THREE.MeshBasicMaterial({ color: 0xffd166 })); tk.position.set(-146, 0.2, y); lab.add(tk);
        }
        for (const fid in sp.faces) {
          const f = sp.faces[fid]; const t = UT.label3D(THREE, fid.length === 1 ? 'Mặt ' + fid : f.name.split(' (')[0], { size: 12, color: '#7ef0c0' });
          if (f.map === 'side') t.position.set(f.X + 6, -(sp.T / 2), Wd + 8);
          else if (f.map === 'bottom') t.position.set(-90, -f.T - 10, Wd + 8);
          else t.position.set(-90, 10, Wd + 8);
          lab.add(t);
        }
      }
      scene.add(lab); groups.labels = lab;
      // probe
      groups.probe = makeProbe(); scene.add(groups.probe);
      // beam
      groups.beam = new THREE.Group(); scene.add(groups.beam);
      lastKey = '';
    }
    function makeProbe() {
      const probe = UT.PROBES[o.probeId()];
      const g = new THREE.Group();
      const hm = new THREE.MeshStandardMaterial({ color: 0x2c3a48, metalness: 0.3, roughness: 0.6 });
      const wm = new THREE.MeshStandardMaterial({ color: 0xd8c27a, metalness: 0.1, roughness: 0.3, transparent: true, opacity: 0.85 });
      if (probe.type === 'angle') {
        // wedge thin at the back, tall at the nose; crystal on the inclined face aims down-forward (+x)
        const L = probe.len, Wd = 20, al = Math.asin(Math.min(0.99, Math.sin(probe.nom * D2R) * 2.73 / 3.24));
        const xI = -12, dC = 10, Cx = xI - dC * Math.sin(al), Cy = dC * Math.cos(al);
        const fy = (x) => Cy + Math.tan(al) * (x - Cx);
        const yb = Math.max(2, fy(-L)), yf = fy(0);
        const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(-L, 0); shape.lineTo(-L, yb); shape.lineTo(0, yf); shape.closePath();
        const wedge = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: Wd, bevelEnabled: false }), wm); wedge.position.z = -Wd / 2; g.add(wedge);
        const hs = new THREE.Shape(); hs.moveTo(-L, yb); hs.lineTo(0, yf); hs.lineTo(0, yf + 8); hs.lineTo(-L, yf + 8); hs.closePath();
        const hous = new THREE.Mesh(new THREE.ExtrudeGeometry(hs, { depth: Wd, bevelEnabled: false }), hm); hous.position.z = -Wd / 2; g.add(hous);
        const cr = new THREE.Mesh(new THREE.BoxGeometry(probe.D, 1.4, Wd - 6), new THREE.MeshStandardMaterial({ color: 0xe0b84a, metalness: 0.3, roughness: 0.35 }));
        cr.position.set(Cx - Math.sin(al) * 0.8, Cy + Math.cos(al) * 0.8, 0); cr.rotation.z = al; g.add(cr);
        const con = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 8, 16), new THREE.MeshStandardMaterial({ color: 0xb0b8c0, metalness: 0.9, roughness: 0.25 }));
        con.rotation.z = Math.PI / 2; con.position.set(-L - 3, yf + 3, 0); g.add(con);
        // ruler marks on side
        for (let m = 0; m <= L; m += 5) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, m % 10 === 0 ? 3 : 2, 0.2), new THREE.MeshBasicMaterial({ color: 0xffffff })); t.position.set(-m, 1.5, Wd / 2 + 0.1); g.add(t); }
        const arrow = new THREE.Mesh(new THREE.ConeGeometry(1.8, 5, 12), new THREE.MeshBasicMaterial({ color: 0xff7a45 })); arrow.rotation.z = -Math.PI / 2; arrow.position.set(3.5, 3, 0); g.add(arrow);
      } else {
        const r = probe.D / 2 + 3;
        const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 22, 32), hm); c.position.y = 11; g.add(c);
        const top = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 8, 16), new THREE.MeshStandardMaterial({ color: 0xb0b8c0, metalness: 0.9, roughness: 0.25 })); top.position.y = 26; g.add(top);
        if (probe.type === 'tr') { const s = new THREE.Mesh(new THREE.BoxGeometry(0.6, 22.2, 2 * r + 0.2), new THREE.MeshBasicMaterial({ color: 0xff7a45 })); s.position.y = 11; g.add(s); }
      }
      g.traverse(x => { if (x.isMesh) x.userData.probe = true; });
      return g;
    }
    let lastKey = '';
    function update() {
      const sp = o.spec(), pos = o.pos(), pid = o.probeId(), probe = UT.PROBES[pid], tr = UT.TRUTH[pid], inst = UT.SETUPS[pid];
      const reveal = o.reveal ? o.reveal() : false, rays = o.showRays ? o.showRays() : true;
      const Iq = o.inst ? o.inst() : null; const rdk = (Iq && Iq.read && Iq.read.found && o.showPlot && o.showPlot()) ? Iq.read.pos.toFixed(1) : 'n';
      const key = [sp.id, sp.features.length, pid, pos.face, pos.x.toFixed(2), pos.y.toFixed(2), pos.fx, pos.skew, reveal, rays, inst.range, o.version ? o.version() : 0, rdk, inst.X, inst.angle].join('|');
      if (key === lastKey) return false;
      if (!lastKey || lastKey.split('|')[0] !== sp.id || lastKey.split('|')[2] !== pid || lastKey.split('|')[1] !== String(sp.features.length) || (o.version && lastKey.split('|')[11] !== String(o.version()))) build();
      lastKey = key;
      groups.flaws.visible = reveal;
      steel.opacity = reveal ? 0.28 : 0.95; weldM.opacity = reveal ? 0.3 : 0.95;
      steel.depthWrite = !reveal; weldM.depthWrite = !reveal;
      // probe placement
      const face = sp.faces[pos.face] || sp.faces[Object.keys(sp.faces)[0]];
      const P = groups.probe; P.rotation.set(0, 0, 0); P.position.set(0, 0, 0);
      const isA = probe.type === 'angle';
      // local frame: u along face, w depth (into material), y along extrusion
      const toW = (u, w, y) => { const g = UT.faceToGlobal(sp, pos.face, u, w); return new THREE.Vector3(g[0], -g[1], y); };
      if (face.map === 'side') { P.rotation.z = -Math.PI / 2; P.position.copy(toW(pos.x, 0, pos.y)); }
      else if (face.map === 'bottom') { P.rotation.x = Math.PI; P.position.copy(toW(pos.x, 0, pos.y)); }
      else P.position.copy(toW(pos.x, 0, pos.y));
      if (isA) {
        const yaw = (pos.fx > 0 ? 0 : Math.PI) + (pos.skew || 0) * D2R * (pos.fx > 0 ? 1 : 1);
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), pos.fx > 0 ? -(pos.skew || 0) * D2R : Math.PI - (pos.skew || 0) * D2R);
        if (face.map === 'bottom') { const q2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI); P.quaternion.copy(q2.multiply(q)); }
        else P.quaternion.copy(q);
      }
      // beam
      const B = groups.beam; while (B.children.length) { const c = B.children.pop(); c.geometry && c.geometry.dispose(); }
      if (rays) {
        const bm = UT.beam(probe, tr);
        const xi = isA ? pos.x - pos.fx * tr.X : pos.x;
        const sk = (pos.skew || 0) * D2R;
        const L = inst.range;
        const tp = UT.traceRay(sp, pos.face, xi, isA ? bm.theta : 0, isA ? pos.fx * Math.cos(sk) : 1, L, isA ? pos.fx * Math.sin(sk) : 0);
        const pts = tp.map(q => toW(q[0], q[1], pos.y + q[2]));
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xffe066, depthTest: false, transparent: true }));
        line.renderOrder = 5;
        B.add(line);
        // translucent cone on first leg
        if (pts.length >= 2) {
          const a = pts[0], bb = pts[1]; const len = a.distanceTo(bb);
          const rad = len * Math.tan(bm.g6) + probe.D * 0.25;
          const cg = new THREE.ConeGeometry(rad, len, 24, 1, true); cg.translate(0, -len / 2, 0);
          const cm = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false, depthTest: false }));
          cm.position.copy(a); cm.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), bb.clone().sub(a).normalize());
          B.add(cm);
        }
      }
      // gate-A plot (instrument values): where the technician would plot the reflector
      if (rdk !== 'n') {
        const g = UT.readouts(inst, Iq.read.pos, probe);
        const xe = isA ? pos.x - pos.fx * inst.X : pos.x;
        const sk = (pos.skew || 0) * D2R;
        const u = isA ? xe + pos.fx * Math.cos(sk) * g.P : xe;
        const yy = pos.y + (isA ? pos.fx * Math.sin(sk) * g.P : 0);
        const P0 = toW(u, g.D, yy);
        const mm = new THREE.MeshBasicMaterial({ color: 0xff3b47, depthTest: false, transparent: true });
        const sph = new THREE.Mesh(new THREE.SphereGeometry(1.6, 14, 10), mm); sph.position.copy(P0); sph.renderOrder = 6; B.add(sph);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(4, 0.45, 8, 32), mm); ring.position.copy(P0); ring.renderOrder = 6; ring.lookAt(V3.camera.position); B.add(ring);
        const lb = UT.label3D(THREE, 'Chỉ thị: sâu ' + UT.fmt(g.D) + ' mm', { size: 6, color: '#ffb3b8' }); lb.position.copy(P0).add(new THREE.Vector3(0, 9, 0)); B.add(lb);
      }
      return true;
    }
    build();
    return {
      ok: true, v: V3, rebuild() { build(); lastKey = ''; },
      reset() { V3.setView(0.55, 1.0, size * (sp0.kind === 'weld' ? 1.75 : 1.35), new THREE.Vector3(...tgt0)); },
      focus() { const pos = o.pos(); const g = UT.faceToGlobal(o.spec(), pos.face, pos.x, 0); V3.setView(V3.sph.th, V3.sph.ph, 160, new THREE.Vector3(g[0], -g[1] - 8, pos.y)); },
      dispose() { V3.dispose(); }
    };
  };
})(UT);
