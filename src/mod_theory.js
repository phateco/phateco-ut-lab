/* ============ Modules 1–3: probe construction, wave modes, propagation ============ */
(function (UT) {
  const el = UT.el, D2R = UT.D2R, R2D = UT.R2D;
  UT.MODS = UT.MODS || {};

  // ------------------------------------------------------------------ M2
  UT.MODS.m2 = function (root) {
    const st = { type: 'L', f: 2, amp: 1, slow: 1, t: 0 };
    const view = el('div', { class: 'view3d tall' });
    const desc = el('div', { class: 'partinfo' });
    const types = [{ v: 'L', t: 'Sóng dọc' }, { v: 'S', t: 'Sóng ngang' }, { v: 'R', t: 'Sóng bề mặt (Rayleigh)' }, { v: 'LS', t: 'Lamb đối xứng' }, { v: 'LA', t: 'Lamb phản đối xứng' }];
    const seg = UT.seg(types, st.type, v => { st.type = v; build(); info(); });
    const ampR = el('input', { type: 'range', min: 0.2, max: 2, step: 0.05, value: 1, class: 'rng', id: 'm2-amp' });
    ampR.addEventListener('input', () => st.amp = +ampR.value);
    const spR = el('input', { type: 'range', min: 0.1, max: 2, step: 0.05, value: 1, class: 'rng', id: 'm2-sp' });
    spR.addEventListener('input', () => st.slow = +spR.value);
    const fCtl = UT.NumCtl({ label: 'Tần số (để tính λ)', unit: 'MHz', get: () => st.f, set: v => { st.f = v; info(); }, steps: [0.5, 1, 0.25], min: 0.5, max: 15 });
    const table = el('div', { class: 'tbl-wrap', html: `<table class="tbl"><thead><tr><th>Vật liệu</th><th>V<sub>L</sub> (m/s)</th><th>V<sub>S</sub> (m/s)</th></tr></thead><tbody>
      <tr><td>Thép carbon</td><td>5920</td><td>3240</td></tr><tr><td>Thép không gỉ austenit</td><td>5740</td><td>3130</td></tr><tr><td>Nhôm</td><td>6320</td><td>3130</td></tr><tr><td>Đồng</td><td>4660</td><td>2260</td></tr><tr><td>Perspex (nêm)</td><td>2730</td><td>1430</td></tr><tr><td>Nước</td><td>1480</td><td>–</td></tr><tr><td>Không khí</td><td>330</td><td>–</td></tr></tbody></table>` });
    root.append(el('div', { class: 'two' },
      el('section', { class: 'card' }, el('header', { class: 'card-h' }, seg), view,
        el('div', { class: 'row pad' }, el('label', { class: 'rl', for: 'm2-amp' }, 'Biên độ (phóng đại)', ampR), el('label', { class: 'rl', for: 'm2-sp' }, 'Tốc độ hoạt hình', spR))),
      el('div', { class: 'stack' }, el('section', { class: 'card info' }, el('h4', null, 'Đặc điểm dạng sóng'), desc, fCtl), el('section', { class: 'card info' }, el('h4', null, 'Vận tốc âm tham khảo'), table))));

    const V = UT.Viewer3D(view, { dist: 170, theta: 0.5, phi: 1.2, target: window.THREE ? new window.THREE.Vector3(0, -12, 0) : null, onFrame: frame });
    if (!V.ok) return () => V.dispose();
    const THREE = V.THREE;
    let pts = null, base = null, trail = null, tracer = null, nx, ny, nz, dxs, h;
    const arrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(-70, 14, 0), 30, 0xffd166, 6, 4); V.scene.add(arrow);
    const lab = UT.label3D(THREE, 'Hướng truyền sóng', { size: 5, color: '#ffd166' }); lab.position.set(-40, 22, 0); V.scene.add(lab);
    function build() {
      if (pts) { V.scene.remove(pts); pts.geometry.dispose(); }
      if (tracer) { V.scene.remove(tracer); }
      const thin = st.type === 'LS' || st.type === 'LA';
      nx = 56; ny = thin ? 5 : 16; nz = 6; dxs = 2.6; h = thin ? 8 : 40;
      const n = nx * ny * nz; base = new Float32Array(n * 3);
      let i = 0;
      for (let a = 0; a < nx; a++) for (let b = 0; b < ny; b++) for (let c = 0; c < nz; c++) {
        base[i++] = (a - nx / 2) * dxs; base[i++] = -b * (h / (ny - 1)) + (thin ? -10 : 0); base[i++] = (c - nz / 2) * 4;
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(base.slice(), 3));
      g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 2.2, vertexColors: true }));
      V.scene.add(pts);
      tracer = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 10), new THREE.MeshBasicMaterial({ color: 0xff4d6d }));
      V.scene.add(tracer);
    }
    function disp(x, y, t) {
      const k = 2 * Math.PI / 40, w = 2 * Math.PI * 0.6;
      const ph = k * x - w * t, A = 2.2 * st.amp;
      const thin = st.type === 'LS' || st.type === 'LA';
      const yr = thin ? (y + 10 + h / 2) / (h / 2) : 0; // -1..1 across plate
      switch (st.type) {
        case 'L': return [A * Math.sin(ph), 0];
        case 'S': return [0, A * Math.sin(ph)];
        case 'R': { const d = -y; const e = Math.exp(-d * k * 0.9); return [0.65 * A * e * Math.sin(ph), A * e * Math.cos(ph)]; }
        case 'LS': return [A * Math.cos(ph) * 0.8, -A * 0.6 * yr * Math.sin(ph)];
        case 'LA': return [-A * 0.5 * yr * Math.cos(ph), A * Math.sin(ph)];
      }
      return [0, 0];
    }
    function frame(time) {
      if (!pts) return false;
      st.t += 0.016 * st.slow;
      const P = pts.geometry.attributes.position.array, C = pts.geometry.attributes.color.array;
      for (let i = 0; i < P.length; i += 3) {
        const [ux, uy] = disp(base[i], base[i + 1], st.t);
        P[i] = base[i] + ux; P[i + 1] = base[i + 1] + uy; P[i + 2] = base[i + 2];
        const m = UT.clamp((ux + uy) / (4.4 * st.amp) + 0.5, 0, 1);
        C[i] = 0.35 + 0.65 * m; C[i + 1] = 0.55 + 0.25 * (1 - Math.abs(m - 0.5) * 2); C[i + 2] = 1 - 0.7 * m;
      }
      pts.geometry.attributes.position.needsUpdate = true; pts.geometry.attributes.color.needsUpdate = true;
      const tx = 0, ty = (st.type === 'LS' || st.type === 'LA') ? -10 : 0;
      const [ux, uy] = disp(tx, ty, st.t); tracer.position.set(tx + ux, ty + uy, 13);
      return true;
    }
    function info() {
      const vL = 5920, vS = 3240;
      const D = {
        L: ['Sóng dọc (Longitudinal / nén)', 'Hạt dao động cùng phương truyền sóng: các lớp nén rồi giãn nối tiếp nhau. Truyền được trong rắn, lỏng, khí.', vL, 'Đầu dò thẳng 0°, đo chiều dày, kiểm tra tách lớp vật liệu cơ bản.'],
        S: ['Sóng ngang (Shear / cắt)', 'Hạt dao động vuông góc với phương truyền. Chỉ truyền trong chất rắn. Vận tốc ≈ 0,55 lần sóng dọc nên bước sóng ngắn hơn, nhạy hơn với khuyết tật nhỏ.', vS, 'Đầu dò góc 45°/60°/70° kiểm tra mối hàn.'],
        R: ['Sóng bề mặt (Rayleigh)', 'Hạt chuyển động theo quỹ đạo elip, biên độ giảm nhanh theo chiều sâu (chỉ còn đáng kể trong khoảng 1 bước sóng). Vận tốc ≈ 0,9 lần sóng ngang.', vS * 0.92, 'Phát hiện nứt bề mặt. Sinh ra khi góc tới vượt góc tới hạn thứ hai.'],
        LS: ['Sóng Lamb đối xứng', 'Sóng dẫn trong tấm mỏng (chiều dày cỡ bước sóng): hai mặt tấm dao động đối xứng, tấm "phồng – thắt" theo chiều dày. Vận tốc phụ thuộc tần số × chiều dày.', null, 'Kiểm tra tấm mỏng, ống (guided wave).'],
        LA: ['Sóng Lamb phản đối xứng (uốn)', 'Toàn bộ chiều dày tấm uốn lên xuống như sóng trên dây. Vận tốc thay đổi mạnh theo tần số × chiều dày (tán sắc).', null, 'Kiểm tra tấm mỏng, ống, vật liệu composite.'],
      }[st.type];
      const lam = d => d ? UT.fmt(d / (st.f * 1000), 2) + ' mm' : 'phụ thuộc f·d';
      desc.innerHTML = `<h5>${D[0]}</h5><p>${D[1]}</p><div class="kv"><span>Vận tốc trong thép</span><b>${D[2] ? Math.round(D[2]) + ' m/s' : 'thay đổi (tán sắc)'}</b></div><div class="kv"><span>Bước sóng λ = v/f tại ${UT.fmt(st.f)} MHz</span><b>${lam(D[2])}</b></div><p class="mini"><b>Ứng dụng:</b> ${D[3]}</p><p class="mini">Chấm đỏ là một hạt vật liệu: quan sát quỹ đạo của nó để thấy phương dao động.</p>`;
    }
    build(); info();
    return () => V.dispose();
  };

  // ------------------------------------------------------------------ M3
  UT.MODS.m3 = function (root) {
    const mats = { steel: { n: 'Thép', vL: 5920, vS: 3240 }, ss: { n: 'Thép không gỉ', vL: 5740, vS: 3130 }, al: { n: 'Nhôm', vL: 6320, vS: 3130 } };
    const st = { a: 37, m: 'steel', T: 20, th: 60, refl: { x: 40, z: 14 }, t: 0, play: true };
    const box1 = el('div', { class: 'cvbox' }), box2 = el('div', { class: 'cvbox' });
    const out1 = el('div', { class: 'calc' }), out2 = el('div', { class: 'calc' });
    const aR = el('input', { type: 'range', min: 0, max: 80, step: 0.5, value: st.a, class: 'rng', id: 'm3-a' });
    aR.addEventListener('input', () => { st.a = +aR.value; });
    const mSeg = UT.seg(Object.keys(mats).map(k => ({ v: k, t: mats[k].n })), st.m, v => st.m = v);
    const thCtl = UT.NumCtl({ label: 'Góc khúc xạ θ', unit: '°', get: () => st.th, set: v => st.th = v, steps: [5, 1], min: 35, max: 75, dec: 0 });
    const tCtl = UT.NumCtl({ label: 'Chiều dày tấm T', unit: 'mm', get: () => st.T, set: v => st.T = v, steps: [1, 5], min: 6, max: 60, dec: 0 });
    root.append(
      el('section', { class: 'card' }, el('header', { class: 'card-h' }, el('h3', null, 'Khúc xạ tại mặt nêm Perspex / vật liệu (định luật Snell)'), mSeg),
        el('div', { class: 'two tight' }, box1, el('div', { class: 'stack pad' }, el('label', { class: 'rl', for: 'm3-a' }, 'Góc tới trong nêm α', aR), out1,
          el('p', { class: 'mini' }, 'Chấm tròn là các hạt vật liệu, mũi tên hai đầu là phương dao động. Sóng dọc: hạt dao động dọc theo tia (cùng phương truyền). Sóng ngang: hạt dao động vuông góc với tia. Sóng bề mặt: hạt chuyển động theo quỹ đạo elip sát bề mặt. Sóng ngang có bước sóng ngắn hơn sóng dọc vì vận tốc nhỏ hơn.'), el('p', { class: 'mini' }, 'sin α / V₁ = sin β / V₂. Góc tới hạn thứ nhất: sóng dọc khúc xạ đạt 90°. Góc tới hạn thứ hai: sóng ngang đạt 90°. Đầu dò góc thương mại làm việc giữa hai góc tới hạn nên trong thép chỉ còn sóng ngang, không bị lẫn hai dạng sóng.')))),
      el('section', { class: 'card' }, el('header', { class: 'card-h' }, el('h3', null, 'Đường đi chùm tia trong tấm: chân 1, chân 2, bước nhảy (skip)')),
        el('div', { class: 'two tight' }, box2, el('div', { class: 'stack pad' }, el('div', { class: 'grid-ctl' }, thCtl, tCtl), out2,
          el('p', { class: 'mini' }, 'Kéo chấm tròn (phản xạ) trong tấm. Hệ thống tính đường âm S, vị trí bề mặt P và độ sâu D. Khi phản xạ nằm ở chân 2, độ sâu thực = 2T − S·cosθ.')))));

    const c1 = UT.canvas(box1), c2 = UT.canvas(box2);
    let alive = true;
    function draw1() {
      const ctx = c1.ctx, w = c1.w, h = c1.h; if (!w) return;
      const M = mats[st.m], v1 = 2730;
      ctx.clearRect(0, 0, w, h);
      const y0 = h * 0.45, cx = w / 2;
      ctx.fillStyle = '#4a3f2a'; ctx.fillRect(0, 0, w, y0); ctx.fillStyle = '#4b5966'; ctx.fillRect(0, y0, w, h - y0);
      ctx.fillStyle = '#d8c27a'; ctx.font = '12px "Be Vietnam Pro",system-ui'; ctx.fillText('Nêm Perspex · V_L = 2730 m/s', 10, 18);
      ctx.fillStyle = '#cfe0ec'; ctx.fillText(M.n + ' · V_L = ' + M.vL + ' · V_S = ' + M.vS + ' m/s', 10, y0 + 18);
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(cx, 10); ctx.lineTo(cx, h - 10); ctx.stroke(); ctx.setLineDash([]);
      const a = st.a * D2R, R = Math.min(w, h) * 0.5;
      const sL = Math.sin(a) * M.vL / v1, sS = Math.sin(a) * M.vS / v1;
      const a1 = Math.asin(v1 / M.vL) * R2D, a2 = Math.asin(v1 / M.vS) * R2D;
      const rays = [
        { ang: Math.PI + a, col: '#ffd166', w: 3, lab: 'Tới α=' + UT.fmt(st.a) + '° (dọc)', inc: true, mode: 'L', v: 2730 },
        { ang: -a, col: 'rgba(255,209,102,0.55)', w: 1.5, lab: 'Phản xạ (dọc)', up: true, mode: 'L', v: 2730 },
      ];
      if (sL < 1) rays.push({ ang: Math.asin(sL), col: '#4cc9f0', w: 2.5, lab: 'Dọc ' + UT.fmt(Math.asin(sL) * R2D) + '°', down: true, mode: 'L', v: M.vL });
      if (sS < 1) rays.push({ ang: Math.asin(sS), col: '#ff7a45', w: 2.5, lab: 'Ngang ' + UT.fmt(Math.asin(sS) * R2D) + '°', down: true, mode: 'S', v: M.vS });
      if (sS >= 1) {
        ctx.strokeStyle = 'rgba(128,237,153,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, y0 + 2); ctx.lineTo(w - 10, y0 + 2); ctx.stroke();
        for (let k = 0; k < 14; k++) { const x = cx + 14 + k * (w - cx - 30) / 13; const s = x - cx; const ph = 2 * Math.PI * (s / 30 - st.t * 1.2); const dep = 1;
          ctx.strokeStyle = 'rgba(128,237,153,0.35)'; ctx.beginPath(); ctx.ellipse(x, y0 + 7, 3.5, 5.5, 0, 0, 7); ctx.stroke();
          ctx.fillStyle = '#80ed99'; ctx.beginPath(); ctx.arc(x + 3.5 * Math.sin(ph), y0 + 7 + 5.5 * Math.cos(ph), 3, 0, 7); ctx.fill(); }
        ctx.fillStyle = '#80ed99'; ctx.font = '600 12px "Be Vietnam Pro",system-ui'; ctx.fillText('Sóng bề mặt: hạt chuyển động elip', Math.max(cx + 10, w - 230), y0 + 34);
      }
      for (const r of rays) {
        let ex, ey;
        if (r.inc) { ex = cx - Math.sin(a) * R; ey = y0 - Math.cos(a) * R; }
        else if (r.up) { ex = cx + Math.sin(a) * R; ey = y0 - Math.cos(a) * R; }
        else { ex = cx + Math.sin(r.ang) * R; ey = y0 + Math.cos(r.ang) * R; }
        ctx.strokeStyle = r.col; ctx.lineWidth = r.w; ctx.beginPath(); ctx.moveTo(cx, y0); ctx.lineTo(ex, ey); ctx.stroke();
        // particles oscillating along the ray: L = along the ray, S = across the ray
        {
          const len = Math.hypot(ex - cx, ey - y0); let dx = (ex - cx) / len, dy = (ey - y0) / len;
          if (r.inc) { dx = -dx; dy = -dy; }               // propagation direction
          const lamv = Math.max(14, 46 * r.v / 5920), A = r.mode === 'L' ? 5 : 4.5;
          const ox = r.mode === 'L' ? dx : -dy, oy = r.mode === 'L' ? dy : dx;
          for (let k = 0; k < 13; k++) {
            const tt = 0.1 + 0.85 * k / 12;
            const bx = cx + (ex - cx) * tt, by = y0 + (ey - y0) * tt;
            const sdist = r.inc ? (1 - tt) * len : tt * len;
            const ph = 2 * Math.PI * (sdist / lamv - st.t * 1.4);
            const u = A * Math.sin(ph);
            ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx - ox * A, by - oy * A); ctx.lineTo(bx + ox * A, by + oy * A); ctx.stroke();
            ctx.fillStyle = r.col; ctx.beginPath(); ctx.arc(bx + ox * u, by + oy * u, 3, 0, 7); ctx.fill();
          }
          // oscillation glyph (double arrow) + propagation arrow near the end of the ray
          const gx = cx + (ex - cx) * 0.62 + (-dy) * 16 * (r.inc ? -1 : 1), gy = y0 + (ey - y0) * 0.62 + dx * 16 * (r.inc ? -1 : 1);
          const arrow = (x1, y1, x2, y2, both) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); const hd = (ax, ay, bx2, by2) => { const a2 = Math.atan2(by2 - ay, bx2 - ax); ctx.beginPath(); ctx.moveTo(bx2, by2); ctx.lineTo(bx2 - 6 * Math.cos(a2 - 0.5), by2 - 6 * Math.sin(a2 - 0.5)); ctx.lineTo(bx2 - 6 * Math.cos(a2 + 0.5), by2 - 6 * Math.sin(a2 + 0.5)); ctx.closePath(); ctx.fill(); }; hd(x1, y1, x2, y2); if (both) hd(x2, y2, x1, y1); };
          ctx.strokeStyle = r.col; ctx.fillStyle = r.col; ctx.lineWidth = 1.6;
          arrow(gx - ox * 8, gy - oy * 8, gx + ox * 8, gy + oy * 8, true);
        }
        ctx.fillStyle = r.col; ctx.font = '600 12px "Be Vietnam Pro",system-ui';
        if (r.inc) ctx.fillText(r.lab, cx - Math.sin(a) * R * 0.55 + 12, y0 - Math.cos(a) * R * 0.55); else ctx.fillText(r.lab, ex + 6, ey + (r.down ? 14 : 16));
      }
      let zone = st.a < a1 ? 'Vùng I: có cả sóng dọc và sóng ngang trong vật liệu, hai chùm khó phân biệt' : (st.a < a2 ? 'Vùng II: chỉ còn sóng ngang, đây là vùng làm việc của đầu dò góc' : 'Vùng III: vượt góc tới hạn thứ hai, sinh sóng bề mặt');
      out1.innerHTML = `<div class="kv"><span>Góc tới hạn thứ nhất</span><b>${UT.fmt(a1)}°</b></div><div class="kv"><span>Góc tới hạn thứ hai</span><b>${UT.fmt(a2)}°</b></div><div class="kv"><span>Góc khúc xạ sóng dọc</span><b>${sL < 1 ? UT.fmt(Math.asin(sL) * R2D) + '°' : 'phản xạ toàn phần'}</b></div><div class="kv"><span>Góc khúc xạ sóng ngang</span><b>${sS < 1 ? UT.fmt(Math.asin(sS) * R2D) + '°' : 'phản xạ toàn phần'}</b></div><p class="zone">${zone}</p><p class="mini">Góc tới cần cho đầu dò 45°: ${UT.fmt(Math.asin(Math.sin(45 * D2R) * 2730 / M.vS) * R2D)}° · 60°: ${UT.fmt(Math.asin(Math.sin(60 * D2R) * 2730 / M.vS) * R2D)}° · 70°: ${UT.fmt(Math.asin(Math.sin(70 * D2R) * 2730 / M.vS) * R2D)}°</p>`;
    }
    // plate view
    let drag = false;
    function geom2() {
      const w = c2.w, h = c2.h;
      const span = Math.max(2.3 * 2 * st.T * Math.tan(st.th * D2R), 60);
      const k = Math.min((w - 30) / span, (h * 0.55) / st.T);
      const x0 = 20, y0 = 26;
      return { k, x0, y0, X: x => x0 + x * k, Y: z => y0 + z * k, span };
    }
    function draw2() {
      const ctx = c2.ctx, w = c2.w, h = c2.h; if (!w) return;
      ctx.clearRect(0, 0, w, h);
      const g = geom2(), th = st.th * D2R, T = st.T;
      ctx.fillStyle = '#4b5966'; ctx.fillRect(g.X(-5), g.Y(0), g.span * g.k + 10, T * g.k);
      ctx.strokeStyle = '#a9bccb'; ctx.strokeRect(g.X(-5), g.Y(0), g.span * g.k + 10, T * g.k);
      // probe
      ctx.fillStyle = '#2b3946'; ctx.fillRect(g.X(-14), g.Y(0) - 14, 14 * g.k * 0.6 + 6, 14);
      // zigzag
      const skip = 2 * T * Math.tan(th);
      ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(g.X(0), g.Y(0));
      let x = 0, z = 0, dir = 1;
      for (let i = 0; i < 4; i++) { x += T * Math.tan(th); z = dir > 0 ? T : 0; dir = -dir; ctx.lineTo(g.X(x), g.Y(z)); }
      ctx.stroke();
      ctx.fillStyle = '#ffd166'; ctx.font = '11px "Be Vietnam Pro",system-ui'; ctx.textAlign = 'center';
      ctx.fillText('½ skip', g.X(skip / 2), g.Y(T) + 14); ctx.fillText('1 skip', g.X(skip), g.Y(0) - 6); ctx.fillText('Chân 1', g.X(skip / 4) - 18, g.Y(T / 2)); ctx.fillText('Chân 2', g.X(skip * 0.75) + 18, g.Y(T / 2));
      // reflector
      const r = st.refl;
      ctx.fillStyle = '#ff4d6d'; ctx.beginPath(); ctx.arc(g.X(r.x), g.Y(r.z), 6, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
      // which leg hits it? unfold
      const res = [];
      for (let leg = 1; leg <= 3; leg++) {
        const zu = leg === 1 ? r.z : leg === 2 ? 2 * T - r.z : 2 * T + r.z;
        const S = Math.hypot(r.x, zu), phi = Math.atan2(r.x, zu);
        const d = Math.abs(phi - th) * R2D;
        res.push({ leg, S, d });
      }
      res.sort((a, b) => a.d - b.d);
      const best = res[0];
      const hit = best.d < 4;
      // animated pulse along path
      const total = 2.2 * T / Math.cos(th);
      const tt = (st.t * 0.6 % 1) * total;
      let rem = tt; x = 0; z = 0; dir = 1; let px = 0, pz = 0;
      for (let i = 0; i < 4; i++) { const segL = T / Math.cos(th); if (rem <= segL) { px = x + rem * Math.sin(th); pz = dir > 0 ? z + rem * Math.cos(th) : z - rem * Math.cos(th); break; } rem -= segL; x += T * Math.tan(th); z = dir > 0 ? T : 0; dir = -dir; }
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(g.X(px), g.Y(pz), 3.2, 0, 7); ctx.fill();
      // mini A-scan
      const ax = 20, ay = g.Y(T) + 30, aw = w - 40, ah = h - ay - 18;
      if (ah > 30) {
        ctx.fillStyle = '#081016'; ctx.fillRect(ax, ay, aw, ah); ctx.strokeStyle = 'rgba(120,170,200,0.35)'; ctx.strokeRect(ax, ay, aw, ah);
        const rng = total;
        ctx.strokeStyle = '#8af5be'; ctx.lineWidth = 1.4; ctx.beginPath();
        for (let i = 0; i <= 300; i++) {
          const s = rng * i / 300;
          let a = 0.02 + 0.015 * UT.hash(i, Math.floor(st.t * 20));
          if (hit) a += 0.85 * Math.exp(-Math.pow((s - best.S) / 1.0, 2)) * UT.lossG(best.d / 3);
          const X = ax + aw * i / 300, Y = ay + ah - a * ah * 0.9; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
        }
        ctx.stroke();
        const cx = ax + aw * (tt / rng); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.moveTo(cx, ay); ctx.lineTo(cx, ay + ah); ctx.stroke();
        ctx.fillStyle = '#7f97a8'; ctx.textAlign = 'left'; ctx.fillText('A-scan (đường âm 0 → ' + UT.fmt(rng, 0) + ' mm)', ax + 4, ay + 12);
      }
      out2.innerHTML = `<div class="kv"><span>Bước nhảy (skip) = 2T·tanθ</span><b>${UT.fmt(skip)} mm</b></div><div class="kv"><span>Đường âm 1 chân = T/cosθ</span><b>${UT.fmt(T / Math.cos(th))} mm</b></div>` +
        (hit ? `<div class="kv hi"><span>Phản xạ trúng chân ${best.leg}</span><b>S = ${UT.fmt(best.S)} mm</b></div><div class="kv"><span>P = S·sinθ</span><b>${UT.fmt(best.S * Math.sin(th))} mm</b></div><div class="kv"><span>D (đã quy đổi chân)</span><b>${UT.fmt(r.z)} mm</b></div>` : `<p class="zone">Chùm tia trung tâm chưa đi qua phản xạ (lệch ${UT.fmt(best.d)}°). Kéo phản xạ vào đường tia vàng.</p>`);
    }
    c2.c.addEventListener('pointerdown', (e) => { drag = true; c2.c.setPointerCapture(e.pointerId); mv(e); });
    c2.c.addEventListener('pointermove', (e) => { if (drag) mv(e); });
    c2.c.addEventListener('pointerup', () => drag = false);
    c2.c.style.touchAction = 'none';
    function mv(e) { const r = c2.c.getBoundingClientRect(); const g = geom2(); st.refl.x = UT.clamp((e.clientX - r.left - g.x0) / g.k, 2, g.span); st.refl.z = UT.clamp((e.clientY - r.top - g.y0) / g.k, 0.5, st.T - 0.5); }
    (function loop() { if (!alive) return; st.t += 0.012; draw1(); draw2(); requestAnimationFrame(loop); })();
    return () => { alive = false; c1.dispose(); c2.dispose(); };
  };
})(UT);
