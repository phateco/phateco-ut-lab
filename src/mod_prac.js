/* ============ Modules 7–8: thickness, weld inspection ============ */
(function (UT) {
  const el = UT.el, D2R = UT.D2R;
  const FT = () => UT.SPEC.FLAW_TYPES;

  // simulate a gate reading at a given position (for checks)
  function simRead(spec, pid, pos) {
    const p = UT.PROBES[pid], t = UT.TRUTH[pid], s = UT.SETUPS[pid];
    const r = UT.computeEchoes(spec, p, t, pos);
    const d = UT.ascan({ probe: p, truth: t, inst: s, echoes: r.echoes, N: 900, coupled: r.coupled, extraGain: s.transfer || 0, grain: 0 });
    return UT.gate(d, s, { start: Math.max(0.8, s.gA.start), width: s.gA.width, thr: s.gA.thr }, s.gateMode);
  }

  // ------------------------------------------------------------------ M7
  UT.MODS.m7 = function (root) {
    const C = UT.SPEC.CORR;
    const rec = UT.store.get('m7rec', {});
    const lab = UT.Lab(root, {
      id: 'm7', specs: ['STEP', 'CORR'], probes: ['TR', 'P0'], probeId: 'TR', tabs: ['base', 'gate', 'auto', 'probe'],
      defaultPos: (sp) => ({ x: sp.id === 'STEP' ? 70 : 25, fx: 1 }), revealToggle: true, plotToggle: false,
    });
    const I = lab.inst;
    const s = () => I.setup();
    const truthAt = (pt) => {
      if (pt.zone) { let m = 99; for (let x = pt.zone[0]; x <= pt.zone[1]; x += 0.25) m = Math.min(m, C.thkAt(x)); return m; }
      let m = 99; for (let x = pt.x - 2.5; x <= pt.x + 2.5; x += 0.25) m = Math.min(m, C.thkAt(x)); return m;
    };
    const tol = (pt) => pt.zone ? 0.25 : 0.1;
    const recBtn = el('button', { type: 'button', class: 'btn pri' }, 'Ghi số đo tại điểm');
    const tbl = el('div', { class: 'tbl-wrap' });
    function nearPt() { if (lab.spec().id !== 'CORR') return null; const x = lab.pos.x; return C.points.find(p => p.zone ? (x >= p.zone[0] && x <= p.zone[1]) : Math.abs(x - p.x) <= 1.5); }
    recBtn.addEventListener('click', () => {
      const p = nearPt(); if (!p) return UT.toast('Đặt tâm đầu dò lên một điểm đo A–E (hoặc trong vùng C)', 'bad');
      if (!I.read.found) return UT.toast('Cổng A chưa bắt được xung đáy', 'bad');
      const v = +I.read.pos.toFixed(2);
      if (p.zone && rec[p.id] !== undefined) rec[p.id] = Math.min(rec[p.id], v); else rec[p.id] = v;
      UT.store.set('m7rec', rec); render(); UT.toast('Điểm ' + p.id + ': ' + UT.fmt(v, 2) + ' mm', 'good');
    });
    const clrBtn = el('button', { type: 'button', class: 'btn' }, 'Xoá kết quả');
    clrBtn.addEventListener('click', () => { for (const k in rec) delete rec[k]; UT.store.set('m7rec', rec); render(); });
    const showAns = el('button', { type: 'button', class: 'btn' }, 'Hiện đáp án');
    let ans = false; showAns.addEventListener('click', () => { ans = !ans; render(); });
    function render() {
      tbl.innerHTML = `<table class="tbl"><thead><tr><th>Điểm</th><th>x (mm)</th><th>Số đo</th>${ans ? '<th>Đúng</th>' : ''}<th></th></tr></thead><tbody>` + C.points.map(p => {
        const v = rec[p.id], tv = truthAt(p); const ok = v !== undefined && Math.abs(v - tv) <= tol(p);
        return `<tr><td><b>${p.id}</b>${p.zone ? ' (min vùng)' : ''}</td><td>${p.zone ? p.zone[0] + '–' + p.zone[1] : p.x}</td><td>${v === undefined ? '–' : UT.fmt(v, 2)}</td>${ans ? `<td>${UT.fmt(tv, 2)}</td>` : ''}<td>${v === undefined ? '' : (ok ? '<span class="ok">✓</span>' : '<span class="bad">✗</span>')}</td></tr>`;
      }).join('') + '</tbody></table>';
    }
    render();
    const stepOK = (th) => { const r = simRead(UT.SPEC.STEP, I.probeId, { face: 'top', x: th * 4 - 10, y: 15, fx: 1 }); return r.found && Math.abs(r.pos - th) <= 0.05; };
    const ptOK = (id) => { const p = C.points.find(q => q.id === id); return rec[id] !== undefined && Math.abs(rec[id] - truthAt(p)) <= tol(p); };
    UT.TaskPanel(lab.side, 'm7', 'Bài 7 · Đo chiều dày (ASTM E797 / ASME V Art.23)', [
      { t: 'Dùng đầu dò kép TR và cổng đo theo sườn (flank)', h: 'Tab <b>Cổng A → Chế độ đo: Sườn</b>. Đo chiều dày dùng điểm xung cắt ngưỡng đầu tiên (giống máy đo chiều dày), không dùng đỉnh xung.', check: () => I.probeId === 'TR' && s().gateMode === 'flank' },
      { t: 'Hiệu chuẩn 2 điểm trên mẫu bậc: bậc 5 mm đọc 5,00 và bậc 20 mm đọc 20,00 (±0,05)', h: 'E797: hiệu chuẩn bằng hai chiều dày bao dải đo, một mỏng một dày. Đặt đầu dò lên bậc 5 mm, cổng A bắt xung đáy, chỉnh Probe delay. Sang bậc 20 mm, chỉnh Velocity. Lặp lại vài lần đến khi cả hai đúng. Hoặc dùng tab <b>Tự động</b> (S-Ref1 = 5, S-Ref2 = 20). Đầu dò TR có sai số đường chữ V ở vật mỏng nên hiệu chuẩn 2 điểm cho kết quả tốt nhất.', check: () => stepOK(5) && stepOK(20) },
      { t: 'Đo điểm A (vùng không ăn mòn)', h: 'Chọn "Tấm ăn mòn". Đặt tâm đầu dò đúng điểm A (tam giác xanh), cổng A bao xung đáy rồi bấm <b>Ghi số đo tại điểm</b>. Sai số cho phép ±0,1 mm.', check: () => ptOK('A') },
      { t: 'Đo điểm B (lõm ăn mòn nhẹ)', h: 'Chú ý xung đáy có thể bị tách đôi khi chùm tia phủ cả vùng lõm và vùng nguyên.', check: () => ptOK('B') },
      { t: 'Quét vùng C và ghi chiều dày nhỏ nhất (rỗ sâu)', h: 'Vùng C có rỗ ăn mòn sâu, hẹp. Quét từng 0,2 mm trong vùng, mỗi khi thấy số nhỏ hơn thì bấm Ghi: bảng giữ giá trị nhỏ nhất. Đáy rỗ nhỏ hơn chùm tia nên xung yếu, đầu dò TR thường đọc dày hơn thực tế vài phần mười mm (sai số cho phép ±0,25 mm). Tăng gain giúp bắt đáy rỗ, nhưng khi đổi gain phải hiệu chuẩn lại trên mẫu bậc vì điểm cắt sườn thay đổi theo gain.', check: () => ptOK('C') },
      { t: 'Đo điểm D và E', h: 'E nằm trong vùng ăn mòn đều trên diện rộng.', check: () => ptOK('D') && ptOK('E') },
    ]);
    lab.side.appendChild(el('section', { class: 'card info' }, el('h4', null, 'Bảng số đo'), el('div', { class: 'btnrow' }, recBtn, clrBtn, showAns), tbl));
    lab.side.appendChild(UT.infoBox('Lưu ý khi đo chiều dày', '<p>Sai velocity 1% thì số đo 12 mm sai 0,12 mm. Luôn chuẩn trên vật liệu cùng loại.</p><p>Xung đáy thứ hai có thể bị nhầm thành chiều dày gấp đôi khi gain quá cao hoặc đặt cổng sai. Ở vùng rỗ hẹp, máy có thể bỏ sót đáy rỗ nếu chùm tia lớn hơn rỗ.</p>'));
    return () => lab.dispose();
  };

  // ------------------------------------------------------------------ M8
  UT.MODS.m8 = function (root) {
    const specs = [UT.SPEC.makeS1(), UT.SPEC.makeS2(), UT.SPEC.makeS3()];
    const presets = { S1: UT.SPEC.presetS1, S2: UT.SPEC.presetS2, S3: UT.SPEC.presetS3 };
    specs.forEach(sp => sp.setFlaws(presets[sp.id](sp)));
    const st = { mode: 'learn', log: [], rows: [], graded: null, examSeed: 0 };
    const hist = [];
    let lab, ecv = null;
    lab = UT.Lab(root, {
      id: 'm8', specs, probes: ['A45', 'A60', 'A70', 'P0'], probeId: 'A70', tabs: ['base', 'dac', 'gate', 'probe'], view: '3d', wide: true,
      reveal: false,
      defaultPos: (sp, pr, face) => {
        if (sp.joint === 'T') { if (face === 'D') return { x: 8, fx: 1 }; return { x: -40, fx: 1 }; }
        return pr.type === 'angle' ? { x: 45, fx: -1 } : { x: 30, fx: 1 };
      },
      onSpec: () => { if (st.busy) return; st.log = []; renderLog(); renderInfo(); if (st.mode === 'exam') newExam(); },
      onFace: (f) => { const sp = lab.spec(); if (sp.joint === 'T') { const want = f === 'D' ? 'P0' : (UT.PROBES[lab.inst.probeId].type === 'angle' ? lab.inst.probeId : 'A70'); if (want !== lab.inst.probeId) setTimeout(() => lab.inst.setProbe(want), 0); } },
      onFrame: (I) => { const a = I.read.found ? (I.read.pct !== null ? I.read.pct : I.read.amp) : 0; hist.push(a); if (hist.length > 240) hist.shift(); drawEcho(); },
    });
    const I = lab.inst;

    // --- side: mode + info ---
    const modeSeg = UT.seg([{ v: 'learn', t: 'Chế độ học' }, { v: 'exam', t: 'Chế độ thi' }], 'learn', v => { st.mode = v; if (v === 'exam') newExam(); else learnMode(); });
    const infoBox = el('div', { class: 'info-b' });
    const flawList = el('div', { class: 'flawlist' });
    const autoB = el('button', { type: 'button', class: 'btn' }, 'Dựng nhanh DAC + hiệu chuẩn mẫu');
    autoB.addEventListener('click', () => autoDAC());
    lab.side.append(el('section', { class: 'card info' }, el('h4', null, 'Bài 8 · Kiểm tra mối hàn theo ASME V Art.4, đánh giá theo ASME VIII-1 App.12'), modeSeg, infoBox, el('div', { class: 'btnrow' }, autoB)));
    const learnCard = el('section', { class: 'card info' }, el('h4', null, 'Khuyết tật trong mẫu học (bấm để tới vị trí)'), flawList);
    lab.side.appendChild(learnCard);

    // echodynamic
    const echoBox = el('div', { class: 'echodyn' });
    const echoCard = el('section', { class: 'card info' }, el('h4', null, 'Đường động học xung (biên độ trong cổng A theo thời gian khi quét)'), echoBox,
      el('p', { class: 'mini' }, 'Vạch đỏ = 100% DAC, vạch vàng = 20% DAC (khi có DAC). Quét ngang và xoay đầu dò để thấy dạng động học: nứt cho nhiều đỉnh lởm chởm, rỗ khí và xỉ cho đỉnh thấp và thay đổi nhanh, không ngấu vách cho đỉnh cao, gọn khi chùm vuông góc vách vát.'));
    lab.extra.appendChild(echoCard);
    ecv = UT.canvas(echoBox);
    function drawEcho() {
      if (!ecv) return;
      const ctx = ecv.ctx, w = ecv.w, h = ecv.h; if (!w) return;
      ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#081016'; ctx.fillRect(0, 0, w, h);
      const hasDAC = I.read.pct !== null && I.read.pct !== undefined;
      const max = hasDAC ? 300 : 110;
      const Y = v => h - 4 - Math.min(v, max) / max * (h - 8);
      if (hasDAC) { ctx.strokeStyle = 'rgba(255,90,95,0.7)'; ctx.beginPath(); ctx.moveTo(0, Y(100)); ctx.lineTo(w, Y(100)); ctx.stroke(); ctx.strokeStyle = 'rgba(255,224,138,0.6)'; ctx.beginPath(); ctx.moveTo(0, Y(20)); ctx.lineTo(w, Y(20)); ctx.stroke(); }
      ctx.strokeStyle = '#8af5be'; ctx.lineWidth = 1.5; ctx.beginPath();
      hist.forEach((v, i) => { const x = i / 239 * w; i ? ctx.lineTo(x, Y(v)) : ctx.moveTo(x, Y(v)); }); ctx.stroke();
      ctx.fillStyle = '#7f97a8'; ctx.font = '10px "Be Vietnam Pro",system-ui'; ctx.fillText(hasDAC ? '% DAC (thang 0–300)' : '% FSH', 6, 12);
    }

    // --- log + report ---
    const logBox = el('div', { class: 'tbl-wrap' });
    const recB = el('button', { type: 'button', class: 'btn pri' }, 'Ghi điểm (vị trí + biên độ)');
    const clrB = el('button', { type: 'button', class: 'btn' }, 'Xoá nhật ký');
    recB.addEventListener('click', () => logPoint());
    clrB.addEventListener('click', () => { st.log = []; renderLog(); });
    const logCard = el('section', { class: 'card info' }, el('h4', null, 'Nhật ký điểm đo'), el('div', { class: 'btnrow' }, recB, clrB), logBox,
      el('p', { class: 'mini' }, 'Vị trí x tính bằng thông số máy (X-value, góc) so với tâm mối hàn (với mối hàn chữ T: so với mặt bản cánh). Đo chiều dài bằng phương pháp hạ 6 dB: dời đầu dò dọc mối hàn đến khi biên độ còn 50% đỉnh ở mỗi đầu, ghi y hai đầu.'));
    lab.extra.appendChild(logCard);

    const repBox = el('div', { class: 'tbl-wrap' });
    const addRow = el('button', { type: 'button', class: 'btn' }, '+ Thêm chỉ thị');
    const gradeB = el('button', { type: 'button', class: 'btn pri' }, 'Nộp bài và chấm điểm');
    const gradeBox = el('div', { class: 'grade' });
    addRow.addEventListener('click', () => { st.rows.push({ y1: '', y2: '', x: '', d: '', amp: '', type: 'slag', verdict: 'acc' }); renderRep(); });
    gradeB.addEventListener('click', () => grade());
    const repCard = el('section', { class: 'card info' }, el('h4', null, 'Báo cáo chỉ thị (theo Phụ lục 1, PTC.NSRP.UT.01)'), repBox, el('div', { class: 'btnrow' }, addRow, gradeB), gradeBox);
    lab.extra.appendChild(repCard);

    function curT() { const sp = lab.spec(); return sp.joint === 'T' ? sp.T : sp.T; }
    function logPoint() {
      if (!I.read.found) return UT.toast('Cổng A chưa bắt được xung', 'bad');
      const s = I.setup(), p = I.probe(), pos = lab.pos;
      const g = UT.readouts(Object.assign({}, s, { thk: lab.spec().faces[pos.face].T || 0 }), I.read.pos, p);
      let x;
      const face = lab.spec().faces[pos.face];
      if (p.type === 'angle') { const xe = pos.x - pos.fx * s.X; x = xe + pos.fx * g.P; }
      else x = pos.x;
      let depth = g.D;
      if (face.map === 'bottom') depth = face.T - g.D;
      st.log.unshift({ y: pos.y, x: +x.toFixed(1), d: +depth.toFixed(1), S: +g.S.toFixed(1), amp: +I.read.amp.toFixed(0), pct: I.read.pct !== null ? +I.read.pct.toFixed(0) : null, probe: p.short, face: pos.face, side: face.map === 'side' });
      st.log = st.log.slice(0, 40); renderLog();
    }
    function renderLog() {
      if (!st.log.length) { logBox.innerHTML = '<p class="mini">Chưa có điểm nào.</p>'; return; }
      logBox.innerHTML = `<table class="tbl sm"><thead><tr><th>y</th><th>x</th><th>Sâu</th><th>S</th><th>%FSH</th><th>%DAC</th><th>Đầu dò</th><th></th></tr></thead><tbody>` + st.log.map((r, i) => `<tr><td>${UT.fmt(r.y)}</td><td>${r.side ? 'z ' + UT.fmt(r.x) : UT.fmt(r.x)}</td><td>${UT.fmt(r.d)}</td><td>${UT.fmt(r.S)}</td><td>${r.amp}</td><td>${r.pct === null ? '–' : r.pct}</td><td>${r.probe} · ${r.face}</td><td><button class="lnk" data-i="${i}">→ báo cáo</button></td></tr>`).join('') + '</tbody></table>';
      logBox.querySelectorAll('button.lnk').forEach(b => b.addEventListener('click', () => {
        const r = st.log[+b.dataset.i];
        st.rows.push({ y1: r.y, y2: r.y, x: r.x, d: r.d, amp: r.pct === null ? '' : r.pct, type: 'slag', verdict: 'acc' }); renderRep();
      }));
    }
    function renderRep() {
      const t = curT(), lim = UT.app12Limit(t);
      repBox.innerHTML = '';
      const tb = el('table', { class: 'tbl sm rep' });
      tb.appendChild(el('thead', null, el('tr', null, ...['#', 'y đầu', 'y cuối', 'Dài', 'x', 'Sâu', 'Max %DAC', 'Loại', 'Kết luận', ''].map(h => el('th', null, h)))));
      const tbody = el('tbody'); tb.appendChild(tbody);
      st.rows.forEach((r, i) => {
        const inp = (k, w) => { const e = el('input', { type: 'number', step: '0.5', value: r[k], class: 'ti', style: { width: (w || 56) + 'px' }, id: 'r' + i + k }); e.addEventListener('input', () => { r[k] = e.value === '' ? '' : +e.value; lenC.textContent = len(r); }); return e; };
        const len = (r) => (r.y1 !== '' && r.y2 !== '') ? UT.fmt(Math.abs(r.y2 - r.y1)) : '–';
        const lenC = el('td', null, len(r));
        const ty = el('select', { class: 'ti', id: 'rt' + i }, Object.keys(FT()).map(k => el('option', { value: k }, FT()[k].name))); ty.value = r.type; ty.addEventListener('change', () => r.type = ty.value);
        const vd = el('select', { class: 'ti', id: 'rv' + i }, el('option', { value: 'acc' }, 'Chấp nhận'), el('option', { value: 'rej' }, 'Loại bỏ')); vd.value = r.verdict; vd.addEventListener('change', () => r.verdict = vd.value);
        const del = el('button', { type: 'button', class: 'lnk' }, 'xoá'); del.addEventListener('click', () => { st.rows.splice(i, 1); renderRep(); });
        tbody.appendChild(el('tr', null, el('td', null, String(i + 1)), el('td', null, inp('y1')), el('td', null, inp('y2')), lenC, el('td', null, inp('x', 50)), el('td', null, inp('d', 50)), el('td', null, inp('amp', 56)), el('td', null, ty), el('td', null, vd), el('td', null, del)));
      });
      if (!st.rows.length) repBox.appendChild(el('p', { class: 'mini' }, 'Chưa có chỉ thị. Thêm từ nhật ký (→ báo cáo) hoặc bấm "+ Thêm chỉ thị".'));
      else repBox.appendChild(tb);
      repBox.appendChild(el('p', { class: 'mini' }, `t = ${t} mm. Giới hạn chiều dài App.12 cho chỉ thị không phải nứt / không ngấu / không thấu (vượt 100% DAC): ${UT.fmt(lim)} mm. Nứt, không ngấu, không thấu vượt 20% DAC luôn loại bỏ.`));
    }

    function renderInfo() {
      const sp = lab.spec(), t = sp.T;
      const tech = sp.joint === 'T' ? 'Kỹ thuật UT2 (mối hàn chữ T): đầu dò 70° từ mặt A và/hoặc B; đầu dò thẳng từ mặt D (mặt ngoài bản cánh) để phát hiện không ngấu ở mặt bản cánh.' : (t < 25 ? 'Kỹ thuật UT1: t = ' + t + ' mm, đầu dò 70° từ một phía (A hoặc B), bổ sung góc vuông góc vách vát ±8° (vát 30° → đầu dò 60°).' : 'Kỹ thuật UT1: t = ' + t + ' mm, đầu dò 70° và đầu dò có góc vuông góc vách vát (60°). Quét từ cả mặt A và mặt B do mối hàn vát kép.');
      const blk = t <= 25 ? 'mẫu 19 mm, lỗ Ø2,4' : 'mẫu 38 mm, lỗ Ø3,2';
      const s = I.setup();
      const dacOK = s.dac.pts.length >= 2;
      infoBox.innerHTML = `<p><b>${sp.name}</b></p><p>${tech}</p><p>Mẫu DAC phù hợp (T-434.2.1): <b>${blk}</b>. Quét ở mức chuẩn +6 dB, đánh giá mọi chỉ thị > 20% DAC.</p><p>DAC của ${I.probe().short}: ${dacOK ? '<span class="ok">đã có (' + s.dac.pts.length + ' điểm, mẫu ' + (s.dac.block || '?') + ')</span>' : '<span class="bad">chưa có. Làm Bài 6 hoặc bấm "Dựng nhanh DAC".</span>'} · Bù truyền âm: ${UT.fmt(s.transfer)} dB</p>`;
      flawList.innerHTML = '';
      if (st.mode === 'learn') sp.flaws.forEach(f => {
        const b = el('button', { type: 'button', class: 'flaw' }, el('i', { style: { background: FT()[f.type].color } }), el('b', null, FT()[f.type].name), el('span', null, 'y ' + Math.round(f.y1) + '–' + Math.round(f.y2) + ' mm'));
        b.addEventListener('click', () => goTo(f)); flawList.appendChild(b);
      });
    }
    const infoIv = setInterval(() => { if (document.body.contains(infoBox)) renderInfo(); }, 3000);

    function goTo(f) {
      const sp = lab.spec(), pid = I.probeId, p = UT.PROBES[pid], t = UT.TRUTH[pid];
      const ym = (f.y1 + f.y2) / 2; let best = null;
      const faces = Object.keys(sp.faces).filter(k => { const fc = sp.faces[k]; return p.type === 'angle' ? !fc.straightOnly : !fc.angleOnly; });
      for (const face of faces) for (const fx of [-1, 1]) {
        const fc = sp.faces[face];
        for (const r of fc.surf) for (let x = r[0]; x <= r[1]; x += 0.5) {
          const res = UT.computeEchoes(sp, p, t, { face, x, y: ym, fx, skew: 0 });
          if (!res.coupled) continue;
          for (const e of res.echoes) if (e.src === f.id && (!best || e.p > best.p)) best = { p: e.p, x, fx, face };
        }
      }
      if (!best) return UT.toast('Đầu dò ' + p.short + ' khó tiếp cận khuyết tật này. Thử đầu dò khác.', 'bad');
      if (best.face !== lab.pos.face) lab.setFace(best.face);
      lab.pos.fx = best.fx; lab.move(best.x, ym); UT.toast('Đã đặt đầu dò gần vị trí cực đại. Tinh chỉnh thêm để đạt đỉnh.');
    }

    function autoDAC() {
      const sp = lab.spec(); const pid = I.probeId;
      const p = UT.PROBES[pid], t = UT.TRUTH[pid];
      if (!UT.calStatus(pid).ok) UT.loadReferenceCal(pid);
      const s = UT.SETUPS[pid];
      const tref = sp.joint === 'T' && p.type !== 'angle' ? sp.geo.F : sp.T;
      const blk = tref <= 25 ? UT.SPEC.DAC19 : UT.SPEC.DAC38;
      const targets = p.type === 'angle' ? [['Lỗ ¼T', 1], ['Lỗ ½T', 1], ['Lỗ ¾T', 1], ['Lỗ ¾T', 2], ['Lỗ ½T', 2]] : [['Lỗ ¼T', 1], ['Lỗ ½T', 1], ['Lỗ ¾T', 1]];
      const pts = [];
      for (const [id, leg] of targets) {
        let b = null;
        for (let x = 100; x <= 300; x += 0.5) { const r = UT.computeEchoes(blk, p, t, { face: 'top', x, y: 30, fx: -1 }); for (const e of r.echoes) if (e.src === id && e.leg === leg && (!b || e.p > b.p)) b = e; }
        if (b) pts.push({ s: UT.dispPos(p, t, s, b.S), ref: UT.dB(b.p * UT.KCAL) });
      }
      const mx = Math.max(...pts.map(q => q.ref));
      const refGain = +(UT.dB(80) - mx).toFixed(1);
      s.dac = { pts: pts.map(q => ({ s: q.s, ref: q.ref, gain: refGain, amp: UT.fromdB(q.ref + refGain) })).sort((a, b) => a.s - b.s), on: true, refGain, block: blk.short + ' (tự động)' };
      s.thk = p.type === 'angle' ? sp.T : 0; s.gain = refGain + 6; s.transfer = sp.transferLoss; s.range = p.type === 'angle' ? Math.ceil(2.4 * sp.T / Math.cos(s.angle * D2R) / 10) * 10 : 50;
      s.gA = p.type === 'angle' ? { start: 5, width: s.range - 8, thr: 15 } : { start: 3, width: 40, thr: 15 };
      UT.saveSetups(); I.refresh(); renderInfo();
      UT.toast('Đã dựng DAC từ ' + blk.short + ', gain quét = chuẩn + 6 dB, bù ' + sp.transferLoss + ' dB', 'good');
    }

    function learnMode() {
      st.graded = null; gradeBox.innerHTML = '';
      specs.forEach(sp => sp.setFlaws(presets[sp.id](sp)));
      st.busy = true; lab.setSpec(lab.spec()); st.busy = false; learnCard.style.display = '';
      renderInfo();
    }
    function newExam() {
      st.examSeed = Math.floor(Math.random() * 1e9); st.rows = []; st.graded = null; gradeBox.innerHTML = '';
      const sp = lab.spec(); sp.setFlaws(UT.SPEC.randomFlaws(sp, st.examSeed));
      if (lab.revealed()) lab.setReveal(false);
      st.busy = true; lab.setSpec(sp); st.busy = false; learnCard.style.display = 'none';
      renderRep(); renderInfo();
      UT.toast('Đề thi mới: ' + sp.short + '. Khuyết tật đã được ẩn.');
    }

    function grade() {
      const sp = lab.spec(), t = sp.T;
      const truth = sp.flaws.map(f => Object.assign({ f }, UT.SPEC.flawBox(f)));
      const used = new Set();
      let total = 0; const lines = [];
      for (const tr of truth) {
        let bi = -1, bs = -1;
        st.rows.forEach((r, i) => {
          if (used.has(i) || r.y1 === '' || r.y2 === '') return;
          const a = Math.min(r.y1, r.y2), b = Math.max(r.y1, r.y2);
          const ov = Math.min(b, tr.y2) - Math.max(a, tr.y1);
          const sc = ov > -6 ? ov + 10 : -1;
          if (sc > bs) { bs = sc; bi = i; }
        });
        const L = tr.y2 - tr.y1;
        const line = { type: tr.f.type, y: Math.round(tr.y1) + '–' + Math.round(tr.y2), L, z: UT.fmt(tr.z0) + '–' + UT.fmt(tr.z1), pts: 0, notes: [] };
        if (bi < 0) { line.notes.push('Bỏ sót'); lines.push(line); continue; }
        used.add(bi); const r = st.rows[bi];
        let p = 40; line.notes.push('Phát hiện');
        const rl = Math.abs(r.y2 - r.y1);
        if (Math.abs(rl - L) <= Math.max(5, 0.25 * L)) { p += 15; line.notes.push('chiều dài đạt'); } else line.notes.push('chiều dài lệch (' + UT.fmt(rl) + ' / ' + UT.fmt(L) + ')');
        if (r.d !== '' && r.d >= tr.z0 - 3 && r.d <= tr.z1 + 3) { p += 15; line.notes.push('độ sâu đạt'); } else line.notes.push('độ sâu lệch');
        if (r.type === tr.f.type) { p += 15; line.notes.push('đúng loại'); } else line.notes.push('sai loại (ghi: ' + FT()[r.type].name + ')');
        const v = UT.app12(tr.f.type, r.amp === '' ? 0 : +r.amp, L, t);
        if ((r.verdict === 'rej') === v.reject) { p += 15; line.notes.push('kết luận đúng'); } else line.notes.push('kết luận sai: ' + v.why);
        line.pts = p; lines.push(line);
      }
      const falseCalls = st.rows.length - used.size;
      const raw = lines.reduce((a, l) => a + l.pts, 0) / Math.max(1, truth.length);
      const score = Math.max(0, Math.round(raw - falseCalls * 8));
      st.graded = score; UT.setProgress('m8', score);
      gradeBox.innerHTML = `<div class="big ${score >= 80 ? 'ok' : (score >= 60 ? 'warn' : 'bad')}">${score} điểm</div><p class="mini">Thang 100: phát hiện 40 · chiều dài 15 · độ sâu 15 · loại 15 · kết luận 15 cho mỗi khuyết tật. Trừ 8 điểm cho mỗi chỉ thị báo thừa (${falseCalls}).</p>` +
        `<table class="tbl sm"><thead><tr><th>Khuyết tật thật</th><th>y</th><th>Sâu</th><th>Điểm</th><th>Nhận xét</th></tr></thead><tbody>` + lines.map(l => `<tr><td><i class="dot" style="background:${FT()[l.type].color}"></i>${FT()[l.type].name}</td><td>${l.y}</td><td>${l.z}</td><td>${l.pts}</td><td>${l.notes.join(', ')}</td></tr>`).join('') + '</tbody></table>';
      lab.setReveal(true);
    }

    renderLog(); renderRep(); renderInfo();
    lab.side.appendChild(UT.infoBox('Nhận dạng khuyết tật trên A-scan', `<ul class="sig">
      <li><b style="color:${FT().crack.color}">Nứt:</b> xung nhiều đỉnh, chân rộng, lởm chởm. Biên độ đổi mạnh khi xoay đầu dò. Thường nằm ở tâm mối hàn hoặc chân mối hàn.</li>
      <li><b style="color:${FT().lof.color}">Không ngấu vách:</b> xung sắc, một đỉnh, rất cao khi chùm vuông góc vách vát (60° với vát 30°). Từ phía đối diện thì biên độ thấp. Vị trí nằm trên đường vát.</li>
      <li><b style="color:${FT().lop.color}">Không thấu chân:</b> xung cao ở độ sâu ≈ T (hiệu ứng góc), thấy được từ cả hai phía. Lệch nhẹ khỏi tâm theo phía mép chân chưa chảy. Cần phân biệt với gờ chân mối hàn (hình học).</li>
      <li><b style="color:${FT().slag.color}">Ngậm xỉ:</b> xung biên độ vừa, có thể vài đỉnh. Biên độ ít phụ thuộc hướng, nằm giữa các lớp hàn.</li>
      <li><b style="color:${FT().pore.color}">Rỗ khí:</b> chùm xung nhỏ, thấp, nhấp nháy khi dời đầu dò. Thấy được từ mọi hướng.</li>
      <li><b>Chỉ thị hình học:</b> gờ chân, mép mũ mối hàn. Vẽ vị trí: nằm đúng ở mặt đáy/mặt trên và ngoài thể tích mối hàn.</li></ul>`));
    return () => { clearInterval(infoIv); lab.dispose(); };
  };
})(UT);
