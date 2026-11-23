/* ============ Modules 4–6: calibration ============ */
(function (UT) {
  const el = UT.el, D2R = UT.D2R;

  function peaksAt(data, range, pos, win) { // max value near display position
    const N = data.length, dx = range / N; const i0 = Math.max(0, Math.floor((pos - win) / dx)), i1 = Math.min(N - 1, Math.ceil((pos + win) / dx));
    let m = 0; for (let i = i0; i <= i1; i++) m = Math.max(m, data[i]); return m;
  }
  function minBetween(data, range, a, b) { const N = data.length, dx = range / N; let m = 1e9; for (let i = Math.floor(a / dx); i <= Math.ceil(b / dx) && i < N; i++) m = Math.min(m, data[i]); return m; }

  UT.calStatus = function (pid) {
    const p = UT.PROBES[pid], t = UT.TRUTH[pid], s = UT.SETUPS[pid];
    const e25 = UT.dispPos(p, t, s, 25) - 25, e100 = UT.dispPos(p, t, s, 100) - 100;
    const r = { range: Math.abs(e25) <= 0.35 && Math.abs(e100) <= 0.7 };
    if (p.type === 'angle') { r.X = Math.abs(s.X - t.X) <= 1.0; r.angle = Math.abs(s.angle - t.angle) <= 1.0; r.angleWarn = Math.abs(s.angle - t.angle) <= 2.0; r.vel = Math.abs(s.vel - 3240) <= 40; }
    else { r.X = true; r.angle = true; r.angleWarn = true; r.vel = Math.abs(s.vel - 5920) <= 60; }
    r.ok = r.range && r.X && r.angle && r.vel;
    return r;
  };

  // ------------------------------------------------------------------ M4
  UT.MODS.m4 = function (root) {
    const P = 'P0';
    const lab = UT.Lab(root, {
      id: 'm4', specs: ['V1s', 'V1', 'V1r'], probes: ['P0'], tabs: ['base', 'gate', 'auto', 'probe'],
      defaultPos: (sp) => ({ x: sp.id === 'V1r' ? 31 : 150, fx: 1 }),
    });
    const s = () => UT.SETUPS[P], t = UT.TRUTH[P], pr = UT.PROBES[P];
    const disp = (S) => UT.dispPos(pr, t, s(), S);
    const I = lab.inst;
    UT.TaskPanel(lab.side, 'm4', 'Bài 4 · Chuẩn đầu dò thẳng trên mẫu V1', [
      { t: 'Đặt đầu dò thẳng lên mặt bên dày 25 mm của V1, bôi tiếp âm', h: 'Chọn mẫu "V1 – đặt đầu dò trên mặt bên (dày 25 mm)". Kéo đầu dò lên mặt mẫu. Mất tiếp âm khi đầu dò ra ngoài mép.', check: () => lab.spec().id === 'V1s' && I.coupled, sticky: true },
      { t: 'Đặt vận tốc sóng dọc của thép: 5920 m/s', h: 'Tab <b>Cơ bản → Velocity</b>. Có thể chạm vào số để gõ trực tiếp.', check: () => Math.abs(s().vel - 5920) <= 10 },
      { t: 'Chọn Range 100 mm để thấy 4 xung đáy (25 – 50 – 75 – 100)', h: 'Quy trình PTC.NSRP.UT.01 mục 7.2.1(a): dải quét hiển thị tối thiểu 2 lần chiều dày. Với chuẩn trên V1 dùng 4 xung đáy để kiểm tra tuyến tính ngang.', check: () => s().range >= 100 && s().range <= 125 },
      { t: 'Chỉnh Probe delay (zero) để xung đáy 1 nằm đúng 25,0 mm và xung 4 đúng 100 mm', h: 'Delay dịch toàn bộ các xung sang trái/phải. Velocity co giãn khoảng cách giữa các xung. Đặt cổng A lên xung 1 để đọc S chính xác (sai số ≤ 0,2 mm), hoặc dùng tab <b>Tự động</b> với S-Ref1 = 25, S-Ref2 = 100.', check: () => Math.abs(disp(25) - 25) <= 0.2 && Math.abs(disp(100) - 100) <= 0.5 },
      { t: 'Đặt cổng A lên xung đáy 1, chỉnh Gain cho xung đạt 80% FSH (±5%)', h: 'Quy trình 7.2.1(b): mức chuẩn đặt xung đáy thứ nhất 80% ± 5% FSH (76–84%).', check: () => lab.spec().id === 'V1s' && I.read.found && I.read.amp >= 75 && I.read.amp <= 85 && Math.abs(I.read.pos - 25) < 2, sticky: true },
      { t: 'Kiểm tra trên mặt 100 mm: xung đáy hiện đúng 100 mm', h: 'Chọn mẫu "V1 – mặt trên" và đặt đầu dò ở vùng x < 190 mm (tránh cung R100 và lỗ Ø50). Đổi Range ≥ 110 mm, dời cổng A lên xung đáy.', check: () => lab.spec().id === 'V1' && I.read.found && Math.abs(I.read.pos - 100) <= 0.8 && Math.abs(disp(100) - 100) <= 0.5, sticky: true },
      { t: 'Kiểm tra độ phân giải: tách rõ 3 xung 85 – 91 – 100 mm', h: 'Chọn "V1 – vị trí kiểm tra độ phân giải". Đặt đầu dò sao cho chùm phủ cả 3 mặt phản xạ. Ba xung phải tách nhau, chân giữa các xung thấp hơn một nửa xung nhỏ nhất. Vì mỗi mặt chỉ nhận một phần chùm tia, cần tăng gain thêm khoảng 6–12 dB so với mức chuẩn.', check: () => {
          if (lab.spec().id !== 'V1r' || !I.data) return false; const r = s().range; if (r < 102) return false;
          const a = peaksAt(I.data, r, disp(85), 0.8), b = peaksAt(I.data, r, disp(91), 0.8), c = peaksAt(I.data, r, disp(100), 0.8);
          const mn = Math.min(a, b, c); if (mn < 15) return false;
          return minBetween(I.data, r, disp(86.5), disp(89.5)) < mn * 0.5 && minBetween(I.data, r, disp(93), disp(98)) < mn * 0.5;
        }, sticky: true
      },
    ]);
    lab.side.appendChild(UT.infoBox('Ghi nhớ', `<p><b>Velocity</b> (vận tốc) đúng thì khoảng cách giữa các xung đáy liên tiếp bằng nhau và đúng 25 mm.</p><p><b>Probe delay</b> bù thời gian xung đi qua lớp bảo vệ/tiếp âm. Delay sai thì mọi xung bị lệch cùng một lượng.</p><p>Đầu dò ảo của mỗi học viên có delay thực khác nhau (giống ngoài đời), nên phải tự chuẩn chứ không dùng số của người khác.</p>`));
    return () => lab.dispose();
  };

  // ------------------------------------------------------------------ M5
  UT.MODS.m5 = function (root) {
    let probeId = 'A60';
    const lab = UT.Lab(root, {
      id: 'm5', specs: ['V2', 'V1'], probes: ['A45', 'A60', 'A70'], probeId, tabs: ['probe', 'base', 'gate', 'auto'],
      defaultPos: (sp, pr) => sp.id === 'V2' ? { x: 12, fx: 1 } : { x: 186, fx: 1 },
      onProbe: (id) => { probeId = id; },
    });
    const I = lab.inst;
    const s = () => UT.SETUPS[I.probeId], t = () => UT.TRUTH[I.probeId], pr = () => UT.PROBES[I.probeId];
    const disp = (S) => UT.dispPos(pr(), t(), s(), S);
    const status = el('div', { class: 'calchips' });
    const saveB = el('button', { type: 'button', class: 'btn pri' }, 'Lưu thẻ hiệu chuẩn đầu dò này');
    saveB.addEventListener('click', () => {
      const c = UT.calStatus(I.probeId);
      if (!c.ok) return UT.toast('Chưa đạt: kiểm tra lại các bước còn đỏ', 'bad');
      s().cal = { done: true, date: new Date().toISOString() }; UT.saveSetups(); UT.toast('Đã lưu hiệu chuẩn ' + pr().short, 'good');
    });
    UT.TaskPanel(lab.side, 'm5', 'Bài 5 · Chuẩn đầu dò góc (V2, V1)', [
      { t: 'Đặt vận tốc sóng ngang của thép: 3240 m/s', h: 'Tab <b>Cơ bản → Velocity</b>. Đầu dò góc tạo sóng ngang trong thép.', check: () => Math.abs(s().vel - 3240) <= 40 },
      { t: 'Tìm điểm ra tia (index) trên V2 và nhập X-value', h: 'Đặt đầu dò trên V2, hướng → về cung R25. Dịch tới lui từng 0,2 mm đến khi xung R25 <b>cao nhất</b> (bật <i>Giữ đỉnh</i> để dễ thấy). Lúc đó điểm ra tia trùng vạch tâm (vạch vàng). Bấm <b>Phóng quanh đầu dò</b>, đọc số trên thước của đầu dò tại vạch vàng (mm tính từ mép trước), rồi nhập vào <b>Đầu dò → X-value</b>. Cho phép sai ±1 mm.', check: () => Math.abs(s().X - t().X) <= 1.0 },
      { t: 'Chuẩn khoảng cách: xung R25 tại 25 mm và xung lặp tại 100 mm', h: 'Trên V2 hướng R25, các xung xuất hiện ở 25 – 100 – 175 mm. Chọn Range 125 hoặc 200 mm. Chỉnh Probe delay (≈ thời gian qua nêm, vài µs) để xung đầu ở 25 mm, chỉnh velocity để xung sau ở 100 mm. Hoặc dùng tab <b>Tự động</b>: S-Ref1 = 25, S-Ref2 = 100.', check: () => s().range >= 100 && Math.abs(disp(25) - 25) <= 0.35 && Math.abs(disp(100) - 100) <= 0.7 },
      { t: 'Kiểm tra góc khúc xạ thực trên V1 và nhập vào máy', h: 'Đổi sang mẫu V1, bấm <b>Quay đầu dò</b> để hướng ← về các lỗ. Đầu dò 45° và 60° dùng lỗ Ø1,5 mm (thang vàng, xung ở S ≈ 85/cosθ). Đầu dò 70° dùng lỗ Ø50 mm (thang xanh, hàng dưới) vì lỗ Ø1,5 quá xa. Dò cực đại xung từ lỗ (lỗ Ø1,5 nhỏ và xa nên cần tăng gain), đọc góc trên thang tại vạch X-value màu cam của đầu dò, rồi nhập vào <b>Đầu dò → Góc</b>. Đạt khi sai ≤ 1°, cảnh báo khi sai ≤ 2°.', check: () => { const d = Math.abs(s().angle - t().angle); return d <= 1 ? true : (d <= 2 ? 'warn' : false); } },
      { t: 'Kiểm tra lại khoảng cách trên cung R100 của V1', h: 'Hướng đầu dò → về cung R100, điểm ra tia trên vạch tâm R100. Xung phải ở 100 mm (±1 mm). Đặt cổng A lên xung để đọc.', check: () => lab.spec().id === 'V1' && lab.pos.fx > 0 && I.read.found && Math.abs(I.read.pos - 100) <= 1, sticky: true },
      { t: 'Lưu thẻ hiệu chuẩn (velocity, delay, X-value, góc)', h: 'Thông số được lưu riêng cho từng đầu dò và dùng tiếp ở Bài 6 (DAC) và Bài 8 (mối hàn). Nên chuẩn cả 3 đầu dò 45°, 60°, 70°.', check: () => !!(s().cal && s().cal.done && !s().cal.ref && UT.calStatus(I.probeId).ok), sticky: false },
    ]);
    lab.side.appendChild(el('section', { class: 'card info' }, el('h4', null, 'Trạng thái 3 đầu dò góc'), status, saveB));
    const iv = setInterval(() => {
      status.innerHTML = ['A45', 'A60', 'A70'].map(id => { const c = UT.calStatus(id); const sv = UT.SETUPS[id].cal && UT.SETUPS[id].cal.done; return `<div class="cc ${c.ok ? 'ok' : ''}"><b>${UT.PROBES[id].short}</b><span>${c.vel ? '✓' : '✗'} v</span><span>${c.X ? '✓' : '✗'} X</span><span>${c.range ? '✓' : '✗'} zero</span><span>${c.angle ? '✓' : (c.angleWarn ? '!' : '✗')} góc</span><em>${sv ? 'đã lưu' : ''}</em></div>`; }).join('');
    }, 400);
    lab.side.appendChild(UT.infoBox('Vì sao phải chuẩn lại?', `<p>Nêm mòn làm điểm ra tia dịch về phía sau và góc thực thay đổi. Sai 2° ở đầu dò 70° khiến vị trí khuyết tật lệch hàng mm. Vì vậy cần kiểm tra index và góc mỗi ca làm việc.</p><p>ASME V T-466 / quy trình 7.3: kiểm tra lại hiệu chuẩn ít nhất mỗi 4 giờ, khi đổi bộ phận hệ thống và khi kết thúc. Điểm khoảng cách dịch quá 10% số đọc hoặc 5% toàn thang thì phải chuẩn lại và kiểm tra lại các chỉ thị đã ghi.</p>`));
    return () => { clearInterval(iv); lab.dispose(); };
  };

  // ------------------------------------------------------------------ M6
  UT.MODS.m6 = function (root) {
    const S1 = UT.SPEC.makeS1();
    const tc = { mode: null, g: {} }; // transfer measurement
    const lab = UT.Lab(root, {
      id: 'm6', specs: ['DAC19', 'DAC38'], probes: ['A45', 'A60', 'A70'], probeId: 'A60', tabs: ['dac', 'base', 'gate', 'probe'],
      defaultPos: (sp, pr) => ({ x: 200, fx: -1 }),
      echoHook: (r) => {
        if (!tc.mode) return;
        const pid = lab.inst.probeId, p = UT.PROBES[pid], t = UT.TRUTH[pid], bm = UT.beam(p, t);
        const T = tc.mode === 'block' ? lab.spec().T : S1.T;
        const Sv = 2 * T / Math.cos(bm.theta);
        const loss = tc.mode === 'block' ? 0 : S1.transferLoss;
        r.coupled = true;
        r.echoes = [{ S: Sv, p: UT.BW(bm, Sv) * UT.attn(bm, Sv) * 0.35 * UT.fromdB(-loss), src: 'V-path' }];
      }
    });
    const I = lab.inst;
    const s = () => UT.SETUPS[I.probeId], t = () => UT.TRUTH[I.probeId];
    const blk = () => lab.spec();
    const fullSkipPath = () => 2 * blk().T / Math.cos(s().angle * D2R);
    const refB = el('button', { type: 'button', class: 'btn' }, 'Nạp hiệu chuẩn mẫu (bỏ qua Bài 5)');
    refB.addEventListener('click', () => { UT.loadReferenceCal(I.probeId); I.refresh(); UT.toast('Đã nạp thông số chuẩn mẫu cho ' + UT.PROBES[I.probeId].short); });
    UT.TaskPanel(lab.side, 'm6', 'Bài 6 · Dựng DAC trên mẫu chuẩn ASME', [
      { t: 'Đầu dò đã hiệu chuẩn (velocity, zero, X-value, góc)', h: 'Hoàn thành Bài 5 cho đầu dò đang chọn, hoặc bấm nút nạp hiệu chuẩn mẫu bên dưới để luyện riêng phần DAC.', check: () => UT.calStatus(I.probeId).ok },
      { t: 'Chọn mẫu phù hợp chiều dày mối hàn và nhập chiều dày T vào máy', h: 'ASME V Hình T-434.2.1: mối hàn t ≤ 25 mm dùng mẫu 19 mm (hoặc t), lỗ Ø2,4 mm. Mối hàn 25 < t ≤ 50 mm dùng mẫu 38 mm (hoặc t), lỗ Ø3,2 mm. Nhập <b>Đầu dò → Chiều dày T</b> bằng chiều dày mẫu để máy quy đổi độ sâu theo chân sóng.', check: () => Math.abs(s().thk - blk().T) < 0.3 },
      { t: 'Đặt Range bao trùm ít nhất một bước nhảy đầy đủ', h: 'Quy trình 7.2.2(1): dải quét tối thiểu bằng đường âm của 1 bước nhảy đầy đủ với góc lớn nhất sử dụng: S = 2T/cosθ.', check: () => s().range >= fullSkipPath() },
      { t: 'Cực đại hoá lỗ ¼T, đưa xung cao nhất lên 80% FSH và ghi điểm DAC đầu tiên', h: 'Đầu dò hướng ← về các lỗ. Dịch đầu dò để xung lỗ ¼T đạt đỉnh, đặt cổng A lên xung, chỉnh Gain cho xung đạt 80% ±5% rồi bấm <b>DAC → Ghi điểm DAC</b>. <b>Giữ nguyên Gain</b> cho tất cả các điểm tiếp theo.', check: () => { const d = s().dac; if (!d.pts.length) return false; const mx = Math.max(...d.pts.map(p => p.amp)); return mx >= 75 && mx <= 85 && d.pts.every(p => Math.abs(p.gain - d.refGain) < 0.05); } },
      { t: 'Ghi tiếp, tối thiểu 3 điểm, ít nhất tới lỗ ¾T ở chân 1', h: 'Thứ tự gợi ý: ¼T, ½T, ¾T (chân 1) rồi ¾T, ½T (chân 2, xung sau khi phản xạ đáy). Nếu xung vẫn ≥ 20% FSH thì ghi luôn các điểm chân 2 để DAC phủ tới 1 bước nhảy. Ngoài thực tế, DAC phải bao trùm toàn bộ dải đường âm dùng khi quét; phần kéo dài nét đứt trên màn hình chỉ để tham khảo.', check: () => { const d = s().dac; return d.pts.length >= 3 && Math.max(...d.pts.map(p => p.s)) >= 0.7 * blk().T / Math.cos(s().angle * D2R); } },
      { t: 'Không điểm nào trên DAC thấp hơn 20% FSH', h: 'Quy trình 7.4: nếu một phần đường DAC rơi dưới 20% FSH thì phải dùng DAC chia đoạn (split DAC): đoạn hai bắt đầu lại ở 80% FSH với gain cao hơn. Máy ảo này chưa có split DAC, nên nếu có điểm dưới 20% hãy bấm <b>Xoá điểm cuối</b>. Đầu dò 70° và mẫu 38 mm suy giảm nhanh, thường chỉ giữ được 3 điểm.', check: () => { const d = s().dac; return d.pts.length >= 3 && Math.min(...d.pts.map(p => p.amp)) >= 20; } },
      { t: 'Đo bù truyền âm giữa mẫu chuẩn và vật kiểm, nhập vào DAC → Bù truyền âm', h: 'Dùng khung "Đo bù truyền âm" bên dưới: hai đầu dò cùng loại đặt đối nhau một bước nhảy (truyền qua chữ V). Chỉnh tín hiệu lên 80% trên mẫu chuẩn rồi trên tấm S1, ghi gain từng lần. Hiệu hai mức gain là lượng bù (dB).', check: () => tc.g.block !== undefined && tc.g.plate !== undefined && Math.abs(s().transfer - (tc.g.plate - tc.g.block)) <= 0.6 },
      { t: 'Đặt độ nhạy quét = mức chuẩn + 6 dB', h: 'Quy trình 5.3 / 8.0: quét ở gain cao hơn mức chuẩn tối thiểu 6 dB. Đánh giá mọi chỉ thị vượt 20% DAC (đường −14 dB).', check: () => s().dac.refGain !== null && s().gain >= s().dac.refGain + 6 && s().gain <= s().dac.refGain + 14 && !tc.mode },
    ]);
    lab.side.appendChild(el('section', { class: 'card info' }, el('h4', null, 'Hỗ trợ'), refB));

    // transfer correction card
    const gTxt = el('div', { class: 'calc' });
    const bBlk = el('button', { type: 'button', class: 'btn' }, 'Cặp đầu dò trên mẫu chuẩn');
    const bPl = el('button', { type: 'button', class: 'btn' }, 'Cặp đầu dò trên tấm S1');
    const bOff = el('button', { type: 'button', class: 'btn' }, 'Kết thúc, quay lại mẫu');
    const bRec = el('button', { type: 'button', class: 'btn pri' }, 'Ghi gain tại 80%');
    function setMode(m) { tc.mode = m; [bBlk, bPl].forEach(b => b.classList.remove('on')); if (m === 'block') bBlk.classList.add('on'); if (m === 'plate') bPl.classList.add('on'); upd(); }
    bBlk.addEventListener('click', () => setMode('block')); bPl.addEventListener('click', () => setMode('plate')); bOff.addEventListener('click', () => setMode(null));
    bRec.addEventListener('click', () => {
      if (!tc.mode) return UT.toast('Chọn vị trí đặt cặp đầu dò trước', 'bad');
      if (!I.read.found || I.read.amp < 75 || I.read.amp > 85) return UT.toast('Đưa tín hiệu trong cổng A về 80% ±5% FSH rồi ghi', 'bad');
      const g = I.setup().gain + (I.setup().transfer || 0) + UT.dB(80 / I.read.amp);
      tc.g[tc.mode] = +g.toFixed(1); upd(); UT.toast('Đã ghi', 'good');
    });
    function upd() { gTxt.innerHTML = `<div class="kv"><span>Gain trên mẫu chuẩn</span><b>${tc.g.block !== undefined ? UT.fmt(tc.g.block) + ' dB' : '–'}</b></div><div class="kv"><span>Gain trên tấm S1</span><b>${tc.g.plate !== undefined ? UT.fmt(tc.g.plate) + ' dB' : '–'}</b></div><p class="mini">${tc.mode ? 'Đang đo truyền qua (chữ V) ' + (tc.mode === 'block' ? 'trên mẫu chuẩn' : 'trên tấm S1') + '. Màn hình chỉ có xung truyền qua. Dời cổng A lên xung này.' : 'Chưa đo.'}</p>`; }
    upd();
    lab.extra.appendChild(el('section', { class: 'card info' }, el('h4', null, 'Đo bù truyền âm (ASME V T-434.1.3 / quy trình 7.5)'),
      el('div', { class: 'two tight' }, el('div', { html: `<svg viewBox="0 0 260 90" class="svgill"><rect x="5" y="30" width="250" height="40" fill="#4b5966" stroke="#a9bccb"/><polygon points="40,30 70,30 70,16 46,16" fill="#2b3946" stroke="#c8d6e2"/><polygon points="220,30 190,30 190,16 214,16" fill="#2b3946" stroke="#c8d6e2"/><polyline points="62,30 130,70 198,30" fill="none" stroke="#ffd166" stroke-width="2"/><text x="130" y="86" fill="#9fb3c2" font-size="10" text-anchor="middle">Phát → phản xạ đáy → Thu (khoảng cách = 1 bước nhảy)</text></svg>` }),
        el('div', { class: 'stack' }, el('div', { class: 'btnrow' }, bBlk, bPl, bOff), bRec, gTxt))));
    return () => lab.dispose();
  };
})(UT);
