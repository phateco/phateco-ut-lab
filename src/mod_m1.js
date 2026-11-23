/* ============ Module 1: probe construction, piezo materials, beam field ============ */
(function (UT) {
  const el = UT.el, D2R = UT.D2R, R2D = UT.R2D;

  const PIEZO = [
    { n: 'Thạch anh (SiO₂)', d: '2,3 (d₁₁)', k: '≈ 0,10', z: '15,2', tc: '573', note: 'Vật liệu áp điện tự nhiên đầu tiên. Rất ổn định, bền, nhưng hiệu suất phát thấp. Nay hầu như không dùng cho đầu dò NDT.' },
    { n: 'Bari titanat (BaTiO₃)', d: '≈ 190', k: '≈ 0,38', z: '≈ 30', tc: '≈ 120', note: 'Gốm áp điện đầu tiên. Nhạy hơn thạch anh nhưng nhiệt độ Curie thấp, dễ lão hoá.' },
    { n: 'Chì zirconat titanat (PZT-5A)', d: '≈ 374', k: '≈ 0,49', z: '≈ 34', tc: '≈ 365', note: 'Phổ biến nhất trong đầu dò NDT: hiệu suất phát/thu cao, giá hợp lý, dễ tạo hình.' },
    { n: 'Chì metaniobat (PbNb₂O₆)', d: '≈ 85', k: '≈ 0,32', z: '≈ 20', tc: '≈ 500', note: 'Hệ số Q thấp nên xung rất ngắn, dải tần rộng. Trở kháng thấp hơn PZT. Hợp cho đo chiều dày, độ phân giải cao, nhiệt độ cao.' },
    { n: 'Liti niobat (LiNbO₃)', d: '≈ 6 (d₃₃)', k: '≈ 0,2–0,5', z: '≈ 34', tc: '≈ 1150', note: 'Đơn tinh thể, chịu nhiệt rất cao. Dùng cho đầu dò nhiệt độ cao và tần số cao.' },
    { n: 'PVDF (màng polyme)', d: '≈ −30', k: '≈ 0,12', z: '≈ 4', tc: '≈ 100', note: 'Mềm dẻo, trở kháng gần nước, dải rộng nhưng phát yếu. Dùng cho đầu dò nhúng, thu sóng, y sinh.' },
    { n: 'Composite áp điện 1-3 (PZT/epoxy)', d: '≈ 300–400', k: '≈ 0,6–0,7', z: '10–25', tc: 'theo PZT', note: 'Thanh PZT cấy trong nền epoxy: hệ số ghép cao, trở kháng điều chỉnh được, nhiễu thấp. Dùng nhiều cho đầu dò mảng pha (PAUT) và đầu dò hiệu suất cao.' },
  ];

  UT.MODS.m1 = function (root) {
    const st = { type: 'straight', cut: true, explode: 0, f: 4, D: 10, mat: 'L', sel: null };
    const view = el('div', { class: 'view3d tall' });
    const info = el('div', { class: 'partinfo' });
    const calc = el('div', { class: 'calc' });
    const chartBox = el('div', { class: 'chart' });
    const typeSeg = UT.seg([{ v: 'straight', t: 'Đầu dò thẳng' }, { v: 'angle', t: 'Đầu dò góc' }, { v: 'tr', t: 'Đầu dò kép TR' }], st.type, v => { st.type = v; st.mat = v === 'angle' ? 'S' : 'L'; matSeg.set(st.mat); build(); recalc(); if (v === 'angle') V.setView(0.12, 1.3, 210, new THREE.Vector3(0, 0, 0)); else V.setView(0.8, 1.15, 150, new THREE.Vector3(0, 6, 0)); });
    const cutB = el('button', { type: 'button', class: 'chip on' }, 'Cắt bổ ½');
    cutB.addEventListener('click', () => { st.cut = !st.cut; cutB.classList.toggle('on', st.cut); applyCut(); });
    const expl = el('input', { type: 'range', min: 0, max: 1, step: 0.01, value: 0, id: 'm1-explode', class: 'rng' });
    expl.addEventListener('input', () => { st.explode = +expl.value; placeParts(); });
    const beamB = el('button', { type: 'button', class: 'chip on' }, 'Hiện chùm tia');
    let showBeam = true;
    beamB.addEventListener('click', () => { showBeam = !showBeam; beamB.classList.toggle('on', showBeam); buildBeam(); });

    // f and D: number controls + drag sliders
    const fR = el('input', { type: 'range', min: 0.5, max: 15, step: 0.25, value: st.f, class: 'rng wide', id: 'm1-f' });
    const dR = el('input', { type: 'range', min: 3, max: 30, step: 0.5, value: st.D, class: 'rng wide', id: 'm1-d' });
    const fCtl = UT.NumCtl({ label: 'Tần số f', unit: 'MHz', get: () => st.f, set: v => { st.f = v; fR.value = v; recalc(); }, steps: [0.5, 1, 0.25], min: 0.5, max: 15 });
    const dCtl = UT.NumCtl({ label: 'Đường kính biến tử D', unit: 'mm', get: () => st.D, set: v => { st.D = v; dR.value = v; rebuildSoon(); }, steps: [1, 0.5, 5], min: 3, max: 30 });
    fR.addEventListener('input', () => { st.f = +fR.value; fCtl.refresh(); recalc(); });
    dR.addEventListener('input', () => { st.D = +dR.value; dCtl.refresh(); rebuildSoon(); });
    const matSeg = UT.seg([{ v: 'L', t: 'Sóng dọc trong thép' }, { v: 'S', t: 'Sóng ngang trong thép' }], st.mat, v => { st.mat = v; recalc(); });

    root.append(el('div', { class: 'two' },
      el('section', { class: 'card' }, el('header', { class: 'card-h' }, typeSeg, el('div', { class: 'row' }, cutB, beamB, el('label', { class: 'rl', for: 'm1-explode' }, 'Tách rời', expl))), view,
        el('div', { class: 'sliders pad' },
          el('label', { class: 'rl', for: 'm1-f' }, el('span', null, 'Kéo tần số'), fR, el('b', { class: 'sv' })),
          el('label', { class: 'rl', for: 'm1-d' }, el('span', null, 'Kéo kích thước'), dR, el('b', { class: 'sv' }))),
        el('p', { class: 'mini pad' }, 'Kéo để xoay, cuộn/chụm 2 ngón để thu phóng, chuột phải hoặc Shift+kéo để dời. Kéo thanh "Tách rời" rồi chạm vào từng bộ phận để xem chức năng.')),
      el('div', { class: 'stack' },
        el('section', { class: 'card info' }, el('h4', null, 'Bộ phận đang chọn'), info),
        el('section', { class: 'card info' }, el('h4', null, 'Trường âm của biến tử'), el('div', { class: 'grid-ctl' }, fCtl, dCtl), matSeg, calc, chartBox,
          el('p', { class: 'mini' }, 'Vùng gần N = D²·f / (4v). Trong vùng gần, áp suất dao động mạnh nên đánh giá biên độ không tin cậy. Góc mở −6 dB: sin γ = 0,51·λ/D; −20 dB: sin γ = 0,87·λ/D. Tăng f hoặc D thì chùm hẹp lại và vùng gần dài ra.')))));
    const svs = root.querySelectorAll('.sv');

    const V = UT.Viewer3D(view, { dist: 150, theta: 0.8, phi: 1.15, clip: true, target: window.THREE ? new window.THREE.Vector3(0, 6, 0) : null, minDist: 30, maxDist: 600, onPick: pick, onHover: hover });
    if (!V.ok) return () => V.dispose();
    const THREE = V.THREE, scene = V.scene;
    const clip = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
    let parts = [], grp = new THREE.Group(), beamG = new THREE.Group();
    scene.add(grp, beamG);
    const block = new THREE.Mesh(new THREE.BoxGeometry(180, 80, 80), new THREE.MeshStandardMaterial({ color: 0x8b9aa8, metalness: 0.5, roughness: 0.5, transparent: true, opacity: 0.14, depthWrite: false }));
    block.position.y = -40; scene.add(block);
    const blockEdge = new THREE.LineSegments(new THREE.EdgesGeometry(block.geometry), new THREE.LineBasicMaterial({ color: 0x9fb3c2, transparent: true, opacity: 0.35 })); blockEdge.position.copy(block.position); scene.add(blockEdge);

    const DESC = {
      housing: ['Vỏ đầu dò', 'Vỏ kim loại hoặc nhựa bảo vệ các bộ phận bên trong, chống nhiễu điện từ và chịu va đập khi thao tác.'],
      conn: ['Đầu nối (BNC / Lemo)', 'Nối cáp đồng trục từ máy siêu âm. Xung điện kích thích đi vào và tín hiệu thu đi ra qua đầu nối này.'],
      backing: ['Khối giảm chấn (backing)', 'Vật liệu trở kháng cao (bột vonfram trong epoxy), hấp thụ dao động phía sau biến tử để xung ngắn lại. Giảm chấn mạnh: xung ngắn, phân giải tốt nhưng độ nhạy giảm. Giảm chấn nhẹ: nhạy nhưng xung dài.'],
      crystal: ['Biến tử áp điện', 'Trái tim của đầu dò. Chiều dày ≈ λ/2 trong vật liệu biến tử quyết định tần số cộng hưởng; đường kính quyết định vùng gần và độ mở chùm tia.'],
      electrode: ['Điện cực', 'Lớp kim loại mỏng (bạc, vàng) phủ hai mặt biến tử để đặt điện áp kích thích và lấy tín hiệu thu.'],
      wear: ['Lớp bảo vệ / phối hợp (λ/4)', 'Bảo vệ biến tử khỏi mài mòn và giúp truyền năng lượng vào vật liệu tốt hơn nhờ trở kháng trung gian, dày ≈ λ/4.'],
      coil: ['Cuộn phối hợp điện', 'Phối hợp trở kháng điện giữa biến tử và cáp/máy để tăng hiệu suất truyền tín hiệu.'],
      wire: ['Dây dẫn', 'Nối điện cực biến tử với đầu nối.'],
      wedge: ['Nêm (Perspex / Rexolite)', 'Tạo góc tới để sóng khúc xạ trong thép thành sóng ngang ở góc danh định (45°, 60°, 70°). Mặt nêm nghiêng lên về phía mũi đầu dò, biến tử gắn trên mặt nghiêng và phát chùm tia chéo xuống về phía trước. Thời gian sóng đi trong nêm là "probe delay" cần hiệu chuẩn.'],
      absorber: ['Khối hấp thụ trong nêm', 'Vật liệu tiêu âm ở đuôi nêm, dập các phản xạ nội bộ trong nêm để không gây xung nhiễu trên màn hình.'],
      index: ['Vạch điểm ra tia (index)', 'Điểm chùm tia trung tâm rời nêm đi vào vật liệu, khắc ở thành bên đầu dò. Vị trí thực phải xác định lại trên mẫu V1/V2 vì nêm mòn theo thời gian.'],
      barrier: ['Vách cách âm (nút bần)', 'Ngăn sóng truyền trực tiếp từ biến tử phát sang biến tử thu. Nhờ vậy đầu dò TR đo được vật mỏng và vùng sát bề mặt.'],
      delay: ['Đường trễ (delay line)', 'Khối nhựa trước mỗi biến tử, đẩy xung phát ra khỏi vùng đo. Hai đường trễ nghiêng một góc nhỏ (roof angle) để chùm phát và chùm thu hội tụ ở độ sâu cần đo.'],
      tx: ['Biến tử phát (T)', 'Chỉ phát sóng. Là một biến tử áp điện như đầu dò đơn.'], rx: ['Biến tử thu (R)', 'Chỉ thu sóng. Vì không phải chờ phát xong nên vùng chết bề mặt rất nhỏ.'],
    };
    function mat(c, o) { return new THREE.MeshStandardMaterial(Object.assign({ color: c, metalness: 0.4, roughness: 0.5, side: THREE.DoubleSide }, o || {})); }
    function add(key, geo, m, pos, ex, rot) {
      const mesh = new THREE.Mesh(geo, m); mesh.userData = { key, base: new THREE.Vector3(...pos), ex: new THREE.Vector3(...(ex || [0, 0, 0])) };
      if (rot) mesh.rotation.set(...rot);
      grp.add(mesh); parts.push(mesh); return mesh;
    }
    let model = { R: 10, beamX: 0, beamRot: 0, k: 1 };
    function build() {
      grp.clear(); parts.forEach(p => p.geometry.dispose()); parts = [];
      const R = 4 + st.D * 0.6; // model radius of crystal
      model = { R, beamX: 0, beamRot: 0, k: R / (st.D / 2) };
      if (st.type === 'straight') {
        const H = 40;
        add('housing', new THREE.CylinderGeometry(R + 2, R + 2, H, 48, 1, true), mat(0x7d8c9a, { metalness: 0.6, roughness: 0.35 }), [0, H / 2, 0]);
        add('conn', new THREE.CylinderGeometry(4, 4, 12, 24), mat(0xc0c8d0, { metalness: 0.95, roughness: 0.2 }), [0, H + 6, 0], [0, 30, 0]);
        add('coil', new THREE.TorusGeometry(Math.min(4, R * 0.5), 1.2, 10, 24), mat(0xb87333, { metalness: 0.9 }), [0, 34, 0], [0, 22, 0], [Math.PI / 2, 0, 0]);
        add('wire', new THREE.CylinderGeometry(0.5, 0.5, 26, 8), mat(0xd22), [Math.min(5, R * 0.6), 20, 0], [8, 12, 0]);
        add('backing', new THREE.CylinderGeometry(R, R, 20, 48), mat(0x2a2522, { roughness: 0.95, metalness: 0.05 }), [0, 14, 0], [0, 14, 0]);
        add('electrode', new THREE.CylinderGeometry(R, R, 0.4, 48), mat(0xe8e8f0, { metalness: 1, roughness: 0.15 }), [0, 3.7, 0], [0, 8, 0]);
        add('crystal', new THREE.CylinderGeometry(R, R, 2, 48), mat(0xe0b84a, { metalness: 0.3, roughness: 0.35 }), [0, 2.5, 0], [0, 5, 0]);
        add('wear', new THREE.CylinderGeometry(R + 2, R + 2, 1.2, 48), mat(0x5aa9c9, { transparent: true, opacity: 0.85 }), [0, 0.6, 0], [0, -4, 0]);
      } else if (st.type === 'angle') {
        // wedge: thin at the back (−x), tall at the nose (+x); beam leaves forward-down
        const L = 44, hb = 8, hf = 30;
        const shape = new THREE.Shape(); shape.moveTo(-L / 2, 0); shape.lineTo(L / 2, 0); shape.lineTo(L / 2, hf); shape.lineTo(-L / 2, hb); shape.closePath();
        const W = Math.max(24, 2 * R + 6);
        const wg = new THREE.ExtrudeGeometry(shape, { depth: W, bevelEnabled: false }); wg.translate(0, 0, -W / 2);
        add('wedge', wg, mat(0xd8c27a, { transparent: true, opacity: 0.55, roughness: 0.15, metalness: 0 }), [0, 0, 0], [0, -8, 0]);
        const ang = Math.atan2(hf - hb, L);              // slope of the face (rising toward nose)
        const t = 0.45, cx = -L / 2 + t * L, cy = hb + t * (hf - hb);
        const nx = -Math.sin(ang), ny = Math.cos(ang); // outward normal (up/back)
        const cw = Math.min(L * 0.7, 2 * R);
        add('crystal', new THREE.BoxGeometry(cw, 2, W - 8), mat(0xe0b84a), [cx + nx * 1, cy + ny * 1, 0], [nx * 8, ny * 8, 0], [0, 0, ang]);
        add('electrode', new THREE.BoxGeometry(cw, 0.4, W - 8), mat(0xe8e8f0, { metalness: 1, roughness: 0.15 }), [cx + nx * 2.2, cy + ny * 2.2, 0], [nx * 12, ny * 12, 0], [0, 0, ang]);
        add('backing', new THREE.BoxGeometry(cw, 10, W - 8), mat(0x2a2522, { roughness: 0.95 }), [cx + nx * 7.4, cy + ny * 7.4, 0], [nx * 20, ny * 20, 0], [0, 0, ang]);
        add('absorber', new THREE.BoxGeometry(8, hb + 14, W), mat(0x3d2f2a, { roughness: 1 }), [-L / 2 - 4, (hb + 14) / 2, 0], [-14, 0, 0]);
        add('housing', new THREE.BoxGeometry(L + 10, 22, W + 4), mat(0x7d8c9a, { metalness: 0.6, roughness: 0.35, transparent: true, opacity: 0.4 }), [-4, hf + 6, 0], [0, 18, 0]);
        add('conn', new THREE.CylinderGeometry(4, 4, 12, 24), mat(0xc0c8d0, { metalness: 0.95, roughness: 0.2 }), [-L / 2 - 14, hf + 6, 0], [-22, 18, 0], [0, 0, Math.PI / 2]);
        // beam exit (index): from crystal centre along inward normal to the bottom
        const ix = cx + Math.sin(ang) * cy / Math.cos(ang);
        add('index', new THREE.BoxGeometry(0.8, 8, 0.6), mat(0xff7a45, { emissive: 0xff7a45, emissiveIntensity: 0.6 }), [ix, 4, W / 2 + 0.4], [0, 0, 8]);
        model.beamX = ix; model.beamRot = 45 * D2R; model.cx = cx; model.cy = cy; model.ang = ang;
      } else {
        const r2 = R + 3;
        add('housing', new THREE.CylinderGeometry(r2, r2, 36, 48, 1, true), mat(0x7d8c9a, { metalness: 0.6, roughness: 0.35 }), [0, 18, 0]);
        add('barrier', new THREE.BoxGeometry(1.6, 32, 2 * r2 - 2), mat(0xb08b5b, { roughness: 1 }), [0, 16, 0], [0, 10, 0]);
        const w = r2 - 2;
        add('delay', new THREE.BoxGeometry(w, 9, 2 * r2 - 6), mat(0xd8c27a, { transparent: true, opacity: 0.6, roughness: 0.15 }), [-(w / 2 + 0.9), 4.5, 0], [-8, -6, 0], [0, 0, -0.05]);
        add('delay', new THREE.BoxGeometry(w, 9, 2 * r2 - 6), mat(0xd8c27a, { transparent: true, opacity: 0.6, roughness: 0.15 }), [(w / 2 + 0.9), 4.5, 0], [8, -6, 0], [0, 0, 0.05]);
        add('tx', new THREE.BoxGeometry(w - 1, 1.6, 2 * r2 - 10), mat(0xe0b84a), [-(w / 2 + 0.9), 9.9, 0], [-8, 4, 0], [0, 0, -0.05]);
        add('rx', new THREE.BoxGeometry(w - 1, 1.6, 2 * r2 - 10), mat(0x7ad1a8), [(w / 2 + 0.9), 9.9, 0], [8, 4, 0], [0, 0, 0.05]);
        add('backing', new THREE.BoxGeometry(w - 1, 10, 2 * r2 - 10), mat(0x2a2522, { roughness: 0.95 }), [-(w / 2 + 0.9), 15.8, 0], [-8, 12, 0]);
        add('backing', new THREE.BoxGeometry(w - 1, 10, 2 * r2 - 10), mat(0x2a2522, { roughness: 0.95 }), [(w / 2 + 0.9), 15.8, 0], [8, 12, 0]);
        add('conn', new THREE.CylinderGeometry(3, 3, 10, 20), mat(0xc0c8d0, { metalness: 0.95, roughness: 0.2 }), [-5, 41, 0], [-6, 26, 0]);
        add('conn', new THREE.CylinderGeometry(3, 3, 10, 20), mat(0xc0c8d0, { metalness: 0.95, roughness: 0.2 }), [5, 41, 0], [6, 26, 0]);
      }
      placeParts(); applyCut(); buildBeam(); select(st.sel && parts.find(p => p.userData.key === st.sel) || null);
    }
    let rbT = null;
    function rebuildSoon() { if (rbT) return; rbT = requestAnimationFrame(() => { rbT = null; build(); recalc(); }); }
    function placeParts() { parts.forEach(p => p.position.copy(p.userData.base).addScaledVector(p.userData.ex, st.explode)); V.render(); }
    function applyCut() { parts.forEach(p => { p.material.clippingPlanes = st.cut ? [clip] : []; p.material.needsUpdate = true; }); V.render(); }
    function calcVals() {
      const v = st.mat === 'L' ? 5920 : 3240;
      const lam = v / (st.f * 1000);
      const N = st.D * st.D * st.f * 1000 / (4 * v);
      const g6 = Math.asin(Math.min(1, 0.51 * lam / st.D));
      const g20 = Math.asin(Math.min(1, 0.87 * lam / st.D));
      return { v, lam, N, g6, g20 };
    }
    function buildBeam() {
      beamG.clear();
      if (!showBeam) { V.render(); return; }
      const c = calcVals(), k = model.k;
      const a = model.R, N = c.N * k;
      const Lmax = 78 / Math.cos(model.beamRot || 0) ;
      const mk = (g, col, op) => {
        const pts = [];
        for (let i = 0; i <= 80; i++) {
          const z = Lmax * i / 80; let r;
          if (z < N) r = a - a * 0.5 * (z / N);
          else r = a * 0.5 + (z - N) * Math.tan(g);
          pts.push(new THREE.Vector2(Math.max(0.3, Math.min(r, 120)), -z));
        }
        return new THREE.Mesh(new THREE.LatheGeometry(pts, 40), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, side: THREE.DoubleSide, depthWrite: false }));
      };
      const holder = new THREE.Group();
      holder.add(mk(c.g6, 0xffd166, 0.25), mk(c.g20, 0xff7a45, 0.08));
      if (N < Lmax) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(a * 0.5, 0.4, 8, 40), new THREE.MeshBasicMaterial({ color: 0xff7a45 }));
        ring.rotation.x = Math.PI / 2; ring.position.y = -N; holder.add(ring);
        const lb = UT.label3D(THREE, 'N = ' + UT.fmt(c.N) + ' mm', { size: 5, color: '#ffb38a' }); lb.position.set(a + 12, -N, 0); holder.add(lb);
      } else {
        const lb = UT.label3D(THREE, 'N = ' + UT.fmt(c.N) + ' mm (dài hơn khối)', { size: 5, color: '#ffb38a' }); lb.position.set(a + 18, -Lmax * 0.8, 0); holder.add(lb);
      }
      if (st.type === 'angle') { holder.position.set(model.beamX, 0, 0); holder.rotation.z = model.beamRot; }
      beamG.add(holder);
      V.render();
    }
    function recalc() {
      const c = calcVals();
      svs[0].textContent = UT.fmt(st.f, 2) + ' MHz'; svs[1].textContent = UT.fmt(st.D, 1) + ' mm';
      calc.innerHTML = `<div class="kv"><span>Bước sóng λ</span><b>${UT.fmt(c.lam, 2)} mm</b></div><div class="kv"><span>Vùng gần N</span><b>${UT.fmt(c.N, 1)} mm</b></div><div class="kv"><span>Nửa góc mở −6 dB</span><b>${UT.fmt(c.g6 * R2D, 1)}°</b></div><div class="kv"><span>Nửa góc mở −20 dB</span><b>${UT.fmt(c.g20 * R2D, 1)}°</b></div><div class="kv"><span>Bề rộng chùm −6 dB ở 50 mm</span><b>${UT.fmt(2 * 50 * Math.tan(c.g6), 1)} mm</b></div>`;
      drawChart(c); buildBeam();
    }
    const ch = UT.canvas(chartBox, () => drawChart(calcVals()));
    function drawChart(c) {
      const ctx = ch.ctx, w = ch.w, h = ch.h; if (!w) return;
      ctx.clearRect(0, 0, w, h);
      const L = 28, B = 22, T = 10, Rr = 8, pw = w - L - Rr, ph = h - T - B;
      const zmax = Math.max(3 * c.N, 20);
      const a = st.D / 2;
      ctx.strokeStyle = 'rgba(160,190,210,0.25)'; ctx.strokeRect(L, T, pw, ph);
      ctx.beginPath(); ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 1.6;
      for (let i = 0; i <= 400; i++) {
        const z = zmax * i / 400 + 0.01;
        const p = Math.abs(2 * Math.sin(Math.PI / c.lam * (Math.sqrt(z * z + a * a) - z)));
        const x = L + pw * i / 400, y = T + ph - p / 2.1 * ph;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
      const xn = L + pw * c.N / zmax;
      ctx.strokeStyle = '#ff7a45'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(xn, T); ctx.lineTo(xn, T + ph); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#9fb3c2'; ctx.font = '11px "Be Vietnam Pro",system-ui'; ctx.textAlign = 'center';
      ctx.fillText('N', xn, T + ph + 15); ctx.fillText(UT.fmt(zmax, 0) + ' mm', L + pw - 18, T + ph + 15); ctx.fillText('0', L, T + ph + 15);
      ctx.save(); ctx.translate(11, T + ph / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('Áp suất trên trục', 0, 0); ctx.restore();
    }
    function pickPart(ray) { const h = ray.intersectObjects(parts, false); return h.length ? h[0].object : null; }
    function pick(ray) { const p = pickPart(ray); if (p) { select(p); return true; } return false; }
    function hover(ray) { const p = pickPart(ray); view.style.cursor = p ? 'pointer' : 'grab'; }

    // ---- piezo panel ----
    let pz = null;
    function piezoPanel() {
      const rows = PIEZO.map((m, i) => `<tr data-i="${i}"><td>${m.n}</td><td>${m.d}</td><td>${m.k}</td><td>${m.z}</td><td>${m.tc}</td></tr>`).join('');
      const box = el('div', { class: 'stack' });
      const mode = { v: 'inv', t: 0 };
      const seg = UT.seg([{ v: 'inv', t: 'Hiệu ứng nghịch (phát)' }, { v: 'dir', t: 'Hiệu ứng thuận (thu)' }], 'inv', v => mode.v = v);
      const cvb = el('div', { class: 'piezo-cv' });
      const note = el('p', { class: 'mini' });
      const tbl = el('div', { class: 'tbl-wrap', html: `<table class="tbl sm pz"><thead><tr><th>Vật liệu</th><th>d₃₃ (pC/N)</th><th>k<sub>t</sub></th><th>Z (MRayl)</th><th>T<sub>Curie</sub> (°C)</th></tr></thead><tbody>${rows}</tbody></table>` });
      const mnote = el('p', { class: 'mini pznote' }, 'Chạm vào một dòng để xem đặc điểm vật liệu. Số liệu là giá trị điển hình để tham khảo.');
      tbl.addEventListener('click', (e) => { const tr = e.target.closest('tr[data-i]'); if (!tr) return; tbl.querySelectorAll('tr').forEach(r => r.classList.remove('on')); tr.classList.add('on'); const m = PIEZO[+tr.dataset.i]; mnote.innerHTML = `<b>${m.n}:</b> ${m.note}`; });
      box.append(el('h5', null, 'Biến tử áp điện'), el('p', null, DESC.crystal[1]),
        el('p', { class: 'mini' }, el('b', null, 'Hiện tượng áp điện: '), 'Một số tinh thể/gốm khi bị nén hoặc kéo sinh ra điện tích trên hai mặt (hiệu ứng thuận, dùng khi thu sóng). Ngược lại, khi đặt điện áp, vật liệu co giãn theo chiều dày (hiệu ứng nghịch, dùng khi phát sóng). Gốm như PZT phải được phân cực ở điện trường mạnh để các lưỡng cực xếp cùng hướng; nung quá nhiệt độ Curie sẽ mất tính áp điện.'),
        seg, cvb, note, el('h5', null, 'Các loại vật liệu áp điện'), tbl, mnote);
      const cv = UT.canvas(cvb);
      let alive = true;
      function draw() {
        if (!alive) return; requestAnimationFrame(draw);
        mode.t += 0.016;
        const ctx = cv.ctx, w = cv.w, h = cv.h; if (!w) return;
        ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#0f1820'; ctx.fillRect(0, 0, w, h);
        const cx = w * 0.42, bw = Math.min(170, w * 0.45), bh0 = 46, cy = h * 0.42;
        const ph = Math.sin(mode.t * 5);
        let bh, q, volt;
        if (mode.v === 'inv') { volt = ph; bh = bh0 * (1 + 0.16 * volt); q = volt; }
        else { const press = Math.max(0, Math.sin(mode.t * 2.2)); bh = bh0 * (1 - 0.18 * press); q = press; volt = press; }
        const x0 = cx - bw / 2, y0 = cy - bh / 2;
        // electrodes
        ctx.fillStyle = '#d9dde3'; ctx.fillRect(x0 - 4, y0 - 5, bw + 8, 5); ctx.fillRect(x0 - 4, y0 + bh, bw + 8, 5);
        // crystal body
        const g = ctx.createLinearGradient(0, y0, 0, y0 + bh); g.addColorStop(0, '#f0c95a'); g.addColorStop(1, '#c99a2e'); ctx.fillStyle = g; ctx.fillRect(x0, y0, bw, bh);
        // dipoles
        ctx.strokeStyle = 'rgba(60,40,10,0.8)'; ctx.fillStyle = 'rgba(60,40,10,0.8)'; ctx.lineWidth = 1.4;
        for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) {
          const x = x0 + bw * (i + 0.5) / 6, y = y0 + bh * (j + 0.5) / 2, l = bh * 0.32;
          ctx.beginPath(); ctx.moveTo(x, y + l / 2); ctx.lineTo(x, y - l / 2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x, y - l / 2 - 3); ctx.lineTo(x - 3, y - l / 2 + 2); ctx.lineTo(x + 3, y - l / 2 + 2); ctx.fill();
        }
        // charges
        const nq = Math.round(Math.abs(q) * 7);
        ctx.font = '600 13px "JetBrains Mono",monospace'; ctx.textAlign = 'center';
        for (let i = 0; i < nq; i++) {
          const x = x0 + bw * (i + 0.5) / 7;
          ctx.fillStyle = q >= 0 ? '#ff7a7a' : '#7ab8ff'; ctx.fillText(q >= 0 ? '+' : '−', x, y0 - 9);
          ctx.fillStyle = q >= 0 ? '#7ab8ff' : '#ff7a7a'; ctx.fillText(q >= 0 ? '−' : '+', x, y0 + bh + 19);
        }
        // wires + meter / source
        const mx = x0 + bw + 70, my = cy;
        ctx.strokeStyle = '#9fb3c2'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x0 + bw + 4, y0 - 3); ctx.lineTo(mx, y0 - 3); ctx.lineTo(mx, my - 20); ctx.moveTo(x0 + bw + 4, y0 + bh + 3); ctx.lineTo(mx, y0 + bh + 3); ctx.lineTo(mx, my + 20); ctx.stroke();
        ctx.beginPath(); ctx.arc(mx, my, 20, 0, 7); ctx.fillStyle = '#1a2632'; ctx.fill(); ctx.stroke();
        if (mode.v === 'inv') {
          ctx.strokeStyle = '#ffb347'; ctx.beginPath(); for (let i = -14; i <= 14; i++) { const yy = my - 8 * Math.sin((i / 14) * Math.PI * 2 + mode.t * 5); i === -14 ? ctx.moveTo(mx + i, yy) : ctx.lineTo(mx + i, yy); } ctx.stroke();
          ctx.fillStyle = '#9fb3c2'; ctx.font = '11px "Be Vietnam Pro",system-ui'; ctx.fillText('Xung điện từ máy', mx, my + 36);
          // emitted waves below
          for (let k = 0; k < 5; k++) {
            const r = ((mode.t * 40 + k * 22) % 110);
            ctx.strokeStyle = `rgba(255,224,102,${0.7 * (1 - r / 110)})`; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(x0 + 6, y0 + bh + 8 + r); ctx.lineTo(x0 + bw - 6, y0 + bh + 8 + r); ctx.stroke();
          }
          ctx.fillStyle = '#ffe066'; ctx.textAlign = 'left'; ctx.fillText('Sóng siêu âm phát ra ↓', x0, h - 8);
          note.textContent = 'Điện áp xoay chiều đặt lên hai điện cực làm biến tử dày lên rồi mỏng đi theo nhịp điện áp. Mặt biến tử dao động như một piston, đẩy sóng âm vào vật liệu.';
        } else {
          const ang = -Math.PI / 2 + (volt - 0.5) * 1.2;
          ctx.strokeStyle = '#8af5be'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx, my + 8); ctx.lineTo(mx + 16 * Math.cos(ang), my + 8 + 16 * Math.sin(ang)); ctx.stroke();
          ctx.fillStyle = '#9fb3c2'; ctx.font = '11px "Be Vietnam Pro",system-ui'; ctx.fillText('Điện áp sinh ra', mx, my + 36);
          // incoming wave pressing from below
          ctx.fillStyle = '#5cc8f0'; for (let i = 0; i < 5; i++) { const x = x0 + bw * (i + 0.5) / 5, l = 10 + 14 * q; ctx.beginPath(); ctx.moveTo(x, y0 + bh + 26 + l); ctx.lineTo(x, y0 + bh + 26); ctx.strokeStyle = '#5cc8f0'; ctx.lineWidth = 2; ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y0 + bh + 22); ctx.lineTo(x - 4, y0 + bh + 29); ctx.lineTo(x + 4, y0 + bh + 29); ctx.fill(); }
          ctx.fillStyle = '#5cc8f0'; ctx.textAlign = 'left'; ctx.fillText('Sóng phản xạ quay về nén biến tử ↑', x0, h - 8);
          note.textContent = 'Sóng phản xạ quay về ép lên biến tử, làm lệch các lưỡng cực và sinh điện tích trái dấu trên hai điện cực. Điện áp nhỏ này được máy khuếch đại và hiện thành xung trên màn hình A-scan.';
        }
      }
      requestAnimationFrame(draw);
      pz = () => { alive = false; cv.dispose(); };
      return box;
    }
    function select(p) {
      if (pz) { pz(); pz = null; }
      parts.forEach(q => { if (q.material.emissive && q.userData.key !== 'index') q.material.emissive.setHex(0x000000); });
      info.innerHTML = '';
      if (!p) { st.sel = null; info.innerHTML = '<p>Chạm vào một bộ phận trên mô hình 3D để xem tên và chức năng. Kéo "Tách rời" để dễ chọn các bộ phận bên trong.</p><ul class="legend">' + [...new Set(parts.map(q => q.userData.key))].map(k => `<li>${DESC[k][0]}</li>`).join('') + '</ul>'; V.render(); return; }
      st.sel = p.userData.key;
      parts.forEach(q => { if (q.userData.key === st.sel && q.material.emissive) q.material.emissive.setHex(0x553300); });
      const key = p.userData.key;
      if (key === 'crystal' || key === 'tx' || key === 'rx') info.appendChild(piezoPanel());
      else { const d = DESC[key]; info.innerHTML = `<h5>${d[0]}</h5><p>${d[1]}</p>`; }
      V.render();
    }
    build(); recalc();
    UT._m1sel = (k) => select(parts.find(p => p.userData.key === k) || null);
    return () => { if (pz) pz(); V.dispose(); ch.dispose(); };
  };
})(UT);
