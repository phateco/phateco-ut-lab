/* ============ App shell, home, quiz, router ============ */
(function (UT) {
  const el = UT.el;
  const META = [
    { id: 'm1', part: 'A', n: 1, t: 'Cấu tạo đầu dò', d: 'Mô hình 3D cắt bổ đầu dò thẳng, đầu dò góc và đầu dò kép TR. Vùng gần, góc mở chùm tia.', refs: ['Giáo trình ch.6–7'] },
    { id: 'm2', part: 'A', n: 2, t: 'Các dạng sóng âm', d: 'Mạng hạt 3D dao động: sóng dọc, sóng ngang, sóng bề mặt, sóng Lamb. Bước sóng và vận tốc.', refs: ['Giáo trình ch.4'] },
    { id: 'm3', part: 'A', n: 3, t: 'Lan truyền và khúc xạ', d: 'Định luật Snell, góc tới hạn, chuyển đổi dạng sóng; đường đi chân 1, chân 2, bước nhảy.', refs: ['Giáo trình ch.4–5'] },
    { id: 'm4', part: 'B', n: 4, t: 'Chuẩn đầu dò thẳng (V1)', d: 'Velocity, probe delay, range, độ nhạy 80% FSH, độ phân giải 85/91/100.', refs: ['ASME V T-462', 'Quy trình 7.2.1'] },
    { id: 'm5', part: 'B', n: 5, t: 'Chuẩn đầu dò góc (V2, V1)', d: 'Điểm ra tia (X-value), zero và range trên R25/R50/R100, góc khúc xạ thực.', refs: ['ASME V T-462', 'Quy trình 7.2.2'] },
    { id: 'm6', part: 'B', n: 6, t: 'Dựng DAC và độ nhạy quét', d: 'Mẫu chuẩn ASME T-434.2, DAC 3 điểm 100/50/20%, bù truyền âm, quét +6 dB.', refs: ['ASME V T-434.2, T-464', 'Quy trình 7.4–7.5'] },
    { id: 'm7', part: 'C', n: 7, t: 'Đo chiều dày', d: 'Đầu dò TR, hiệu chuẩn 2 điểm trên mẫu bậc, đo tấm ăn mòn và tìm chiều dày nhỏ nhất.', refs: ['ASTM E797', 'ASME V Art.23'] },
    { id: 'm8', part: 'C', n: 8, t: 'Kiểm tra mối hàn và đánh giá', d: 'Mối hàn V đơn, V kép, chữ T trong 3D. Nhận dạng nứt, không ngấu, không thấu, xỉ, rỗ. Đánh giá theo App.12 và chấm điểm.', refs: ['ASME V Art.4', 'ASME VIII-1 App.12'] },
    { id: 'quiz', part: 'Ôn', n: 9, t: 'Trắc nghiệm ôn tập', d: '18 câu hỏi về lý thuyết, hiệu chuẩn và tiêu chí chấp nhận theo ASME.', refs: ['Tổng hợp'] },
  ];
  UT.VERSION = '1.0.0-beta'; UT.BUILD = '23/11/2026'; UT.LOGO = '__LOGO_SVG__';
  const PARTS = { A: 'Phần A · Hiểu bản chất', B: 'Phần B · Máy siêu âm ảo và hiệu chuẩn', C: 'Phần C · Thực hành kiểm tra', 'Ôn': 'Ôn tập' };

  // ---------------- quiz ----------------
  const QUIZ = [
    ['Sóng ngang (shear) truyền được trong môi trường nào?', ['Rắn, lỏng và khí', 'Chỉ chất rắn', 'Chỉ chất lỏng', 'Chỉ không khí'], 1, 'Chất lỏng và khí không chịu được ứng suất cắt nên không truyền sóng ngang.'],
    ['Đầu dò 4 MHz, Ø10 mm, sóng dọc trong thép (5920 m/s). Vùng gần N xấp xỉ:', ['4,2 mm', '16,9 mm', '42 mm', '67 mm'], 1, 'N = D²f/(4v) = 100 × 4 / (4 × 5,92) ≈ 16,9 mm.'],
    ['Đầu dò góc thương mại làm việc trong vùng góc tới nào?', ['Nhỏ hơn góc tới hạn thứ nhất', 'Giữa góc tới hạn thứ nhất và thứ hai', 'Lớn hơn góc tới hạn thứ hai', 'Đúng bằng 0°'], 1, 'Giữa hai góc tới hạn chỉ còn sóng ngang trong thép, tránh lẫn hai dạng sóng.'],
    ['Tăng tần số đầu dò (cùng đường kính) thì:', ['Góc mở chùm tia tăng', 'Vùng gần ngắn lại', 'Góc mở giảm, vùng gần dài ra', 'Bước sóng dài ra'], 2, 'λ giảm nên sinγ = 0,51λ/D giảm và N = D²/(4λ) tăng.'],
    ['Bước nhảy (skip) của đầu dò 60° trên tấm 20 mm là:', ['20 mm', '34,6 mm', '69,3 mm', '40 mm'], 2, 'Skip = 2T·tanθ = 2 × 20 × 1,732 ≈ 69,3 mm.'],
    ['Khi chuẩn đầu dò thẳng trên V1 (25 mm), các xung đáy cách đều nhưng tất cả lệch 1,5 mm sang phải. Cần chỉnh:', ['Velocity', 'Probe delay (zero)', 'Gain', 'Reject'], 1, 'Delay dịch đồng đều mọi xung; velocity làm thay đổi khoảng cách giữa các xung.'],
    ['Theo quy trình PTC.NSRP.UT.01, mức tham chiếu được đặt ở:', ['50% FSH', '80% ± 5% FSH', '100% FSH', '20% FSH'], 1, 'Mục 7.2: biên độ tham chiếu 80% ± 5% FSH (76–84%).'],
    ['Mẫu V2 với đầu dò hướng về cung R25 cho các xung tại:', ['25 – 50 – 75 mm', '25 – 100 – 175 mm', '50 – 125 – 200 mm', '25 – 75 – 125 mm'], 1, 'Hướng R25: 25, 100, 175 mm. Hướng R50: 50, 125, 200 mm.'],
    ['Mối hàn dày 20 mm theo ASME V Hình T-434.2.1 dùng mẫu chuẩn cơ bản:', ['Dày 19 mm (hoặc t), lỗ Ø2,4 mm', 'Dày 38 mm, lỗ Ø3,2 mm', 'Dày 75 mm, lỗ Ø4,8 mm', 'Mẫu V1'], 0, 't ≤ 25 mm: mẫu 3/4 in (19 mm) hoặc t, lỗ 3/32 in (2,4 mm).'],
    ['Các đường trên màn hình khi dựng DAC theo quy trình gồm:', ['100%, 50%, 20% đường chuẩn', 'Chỉ 100%', '80% và 40%', '100% và 10%'], 0, 'Quy trình 7.2.2(4): dựng các đường 100%, 50% (−6 dB) và 20% (−14 dB).'],
    ['Độ nhạy quét tối thiểu là:', ['Bằng mức chuẩn', 'Mức chuẩn + 6 dB', 'Mức chuẩn − 6 dB', 'Mức chuẩn + 20 dB'], 1, 'Quy trình 5.3 / 8.0: quét ở gain ít nhất gấp 2 lần (+6 dB) mức chuẩn.'],
    ['Kiểm tra lại hiệu chuẩn thấy độ nhạy giảm 3 dB. Phải làm gì?', ['Bỏ qua vì < 4 dB', 'Hiệu chỉnh, huỷ các dữ liệu từ lần kiểm tra hợp lệ trước và kiểm tra lại vùng đó', 'Chỉ tăng gain 3 dB rồi tiếp tục', 'Ghi chú vào báo cáo'], 1, 'T-466/quy trình 7.3.3(b): thay đổi > 20% hoặc 2 dB. Nếu độ nhạy giảm thì các trang dữ liệu bị huỷ và phải kiểm tra lại.'],
    ['Điểm khoảng cách dịch quá bao nhiêu thì phải chuẩn lại range?', ['1% số đọc', '10% số đọc hoặc 5% toàn thang, lấy giá trị lớn hơn', '20% toàn thang', '2 mm'], 1, 'Quy trình 7.3.3(a).'],
    ['Tốc độ di chuyển đầu dò tối đa khi quét:', ['50 mm/s', '100 mm/s', '150 mm/s', '300 mm/s'], 2, 'Quy trình 5.2: không quá 6 in/s (150 mm/s).'],
    ['Độ chồng lấn tối thiểu giữa các đường quét:', ['5%', '10% kích thước biến tử', '25%', '50%'], 1, 'Quy trình 5.1: ≥ 10% kích thước biến tử theo phương vuông góc hướng quét.'],
    ['Theo ASME VIII-1 App.12, chỉ thị được xác định là không ngấu, biên độ 40% DAC, dài 4 mm (t = 20 mm):', ['Chấp nhận vì < 100% DAC', 'Chấp nhận vì ngắn', 'Loại bỏ bất kể chiều dài', 'Phải kiểm tra RT'], 2, 'Nứt, không ngấu, không thấu (vượt mức đánh giá 20%) luôn loại bỏ.'],
    ['Xỉ vượt 100% DAC trong mối hàn t = 30 mm. Chiều dài tối đa cho phép:', ['6 mm', '10 mm', '19 mm', '30 mm'], 1, '19 < t ≤ 57 mm: giới hạn t/3 = 10 mm.'],
    ['Đo chiều dài chỉ thị theo quy trình dùng phương pháp:', ['Hạ 20 dB', 'Hạ 6 dB (50%) tại vị trí tâm đầu dò', 'Hạ 12 dB', 'Đo theo vạch DAC 20%'], 1, 'Quy trình 8.4: đo giữa các vị trí tâm đầu dò nơi biên độ giảm 50% (6 dB).'],
  ];
  UT.MODS.quiz = function (root) {
    const ans = UT.store.get('quiz', {});
    const box = el('div', { class: 'quiz' });
    const sc = el('div', { class: 'score big' });
    root.append(el('section', { class: 'card info' }, el('div', { class: 'row' }, el('h3', null, 'Trắc nghiệm ôn tập'), sc, (() => { const b = el('button', { type: 'button', class: 'btn' }, 'Làm lại'); b.addEventListener('click', () => { for (const k in ans) delete ans[k]; UT.store.set('quiz', ans); render(); }); return b; })())), box);
    function render() {
      box.innerHTML = '';
      let ok = 0, n = 0;
      QUIZ.forEach((q, i) => {
        const a = ans[i];
        if (a !== undefined) { n++; if (a === q[2]) ok++; }
        const opts = q[1].map((o, j) => {
          const b = el('button', { type: 'button', class: 'qopt' + (a !== undefined ? (j === q[2] ? ' right' : (j === a ? ' wrong' : '')) : '') }, String.fromCharCode(65 + j) + '. ' + o);
          b.disabled = a !== undefined;
          b.addEventListener('click', () => { ans[i] = j; UT.store.set('quiz', ans); render(); });
          return b;
        });
        box.appendChild(el('section', { class: 'card q' }, el('p', { class: 'qq' }, el('b', null, (i + 1) + '. '), q[0]), el('div', { class: 'qopts' }, opts), a !== undefined ? el('p', { class: 'mini expl' }, q[3]) : null));
      });
      sc.textContent = ok + '/' + QUIZ.length + ' đúng';
      UT.setProgress('quiz', Math.round(100 * ok / QUIZ.length));
    }
    render();
    return () => { };
  };

  // ---------------- home ----------------
  function home(root) {
    const groups = {};
    META.forEach(m => { (groups[m.part] = groups[m.part] || []).push(m); });
    const map = el('div', { class: 'map' });
    for (const p in groups) {
      map.appendChild(el('h3', { class: 'part' }, PARTS[p]));
      const row = el('div', { class: 'cards' });
      groups[p].forEach(m => {
        const pr = UT.progress[m.id] || 0;
        row.appendChild(el('a', { class: 'mcard', href: '#' + m.id },
          el('div', { class: 'mc-top' }, el('span', { class: 'mc-n' }, m.id === 'quiz' ? '?' : String(m.n)), el('span', { class: 'mc-refs' }, m.refs.join(' · '))),
          el('h4', null, m.t), el('p', null, m.d),
          el('div', { class: 'bar' }, el('i', { style: { width: pr + '%' } })), el('small', null, pr ? 'Hoàn thành ' + pr + '%' : 'Chưa bắt đầu')));
      });
      map.appendChild(row);
    }
    const resetB = el('button', { type: 'button', class: 'btn' }, 'Nhận bộ đầu dò mới (làm lại hiệu chuẩn)');
    resetB.addEventListener('click', () => { UT.newProbes(); UT.toast('Đã phát bộ đầu dò mới với thông số thực khác, hãy hiệu chuẩn lại.', 'good'); });
    const clrB = el('button', { type: 'button', class: 'btn' }, 'Xoá tiến độ');
    clrB.addEventListener('click', () => { UT.progress = {}; UT.store.set('progress', {}); go(); });
    root.append(
      el('section', { class: 'hero' },
        el('div', null,
          el('p', { class: 'eyebrow' }, 'Phòng thí nghiệm siêu âm ảo · Đào tạo UT Level I–II · v' + UT.VERSION),
          el('h1', null, el('span', { class: 'bn' }, 'PHATECO'), ' UT Lab'),
          el('p', { class: 'lead' }, 'Đi từ cấu tạo đầu dò và sóng âm, qua hiệu chuẩn máy trên mẫu V1, V2 và mẫu DAC, đến kiểm tra mối hàn V đơn, V kép, chữ T và đánh giá khuyết tật. Bài học dựa trên ASME V Article 4, ASME VIII Div.1 Appendix 12 và quy trình PTC.NSRP.UT.01.'),
          el('div', { class: 'btnrow' }, el('a', { class: 'btn pri', href: '#m1' }, 'Bắt đầu từ Bài 1'), el('a', { class: 'btn', href: '#m4' }, 'Vào máy siêu âm ảo'), el('a', { class: 'btn', href: '#m8' }, 'Thực hành mối hàn'))),
        el('div', { class: 'hero-art' }, heroArt())),
      map,
      el('section', { class: 'card info notes' }, el('h4', null, 'Cách dùng và giả định của mô phỏng'), el('div', { class: 'info-b', html: `
        <ul>
          <li>Dùng được bằng chuột hoặc màn hình cảm ứng. Kéo đầu dò trên hình mặt cắt hoặc 3D, nút « ‹ › » để dịch tinh, phím mũi tên trên máy tính (Shift = 0,2 mm). Chạm vào số trên bảng điều khiển để gõ trực tiếp, cuộn chuột trên một ô để tăng giảm.</li>
          <li>Mỗi học viên nhận một bộ đầu dò ảo với delay, điểm ra tia và góc thực hơi khác danh định, giống đầu dò thật đã mòn. Muốn đo đúng thì phải tự hiệu chuẩn. Thông số hiệu chuẩn được lưu trên trình duyệt này và dùng xuyên suốt các bài.</li>
          <li>Mẫu V1 (ISO 2400), V2 (ISO 7963) được đơn giản hoá về hình dạng. Mẫu chuẩn cơ bản theo ASME V Hình T-434.2.1 (19 mm lỗ Ø2,4; 38 mm lỗ Ø3,2). Bộ mẫu hàn S1–S3 do phần mềm thiết kế, chưa phải bản vẽ mẫu thi thực tế của công ty.</li>
          <li>Mô hình âm học là gần đúng có kiểm soát (quy luật khoảng cách, góc mở, phản xạ gương, hiệu ứng góc, suy giảm, nhiễu hạt) để dạy đúng xu hướng. Không dùng số liệu biên độ của mô phỏng thay cho hiệu chuẩn thực tế.</li>
        </ul>` }), el('div', { class: 'btnrow' }, resetB, clrB)));
  }
  function heroArt() {
    const c = el('canvas', { class: 'heroc', width: 520, height: 300, 'aria-hidden': 'true' });
    const ctx = c.getContext('2d');
    let t = 0, alive = true;
    function draw() {
      if (!alive || !document.body.contains(c)) { if (t > 1) return; }
      t += 0.012;
      ctx.clearRect(0, 0, 520, 300);
      ctx.fillStyle = '#081016'; ctx.fillRect(10, 10, 500, 280);
      ctx.strokeStyle = 'rgba(120,170,200,0.15)';
      for (let i = 0; i <= 10; i++) { ctx.beginPath(); ctx.moveTo(10 + i * 50, 10); ctx.lineTo(10 + i * 50, 290); ctx.stroke(); ctx.beginPath(); ctx.moveTo(10, 10 + i * 28); ctx.lineTo(510, 10 + i * 28); ctx.stroke(); }
      ctx.beginPath();
      for (let i = 0; i <= 500; i++) {
        const x = i / 500;
        let a = 0.02 + 0.03 * Math.pow(UT.hash(i, Math.floor(t * 30)), 4);
        a += 1.2 * Math.exp(-Math.pow((x - 0.03) / 0.012, 2));
        a += 0.78 * Math.exp(-Math.pow((x - 0.36 - 0.02 * Math.sin(t)) / 0.008, 2));
        a += 0.42 * Math.exp(-Math.pow((x - 0.62) / 0.01, 2));
        a += 0.25 * Math.exp(-Math.pow((x - 0.66) / 0.008, 2));
        const y = 290 - Math.min(1.05, a) * 250; i ? ctx.lineTo(10 + i, y) : ctx.moveTo(10 + i, y);
      }
      ctx.strokeStyle = '#8af5be'; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.strokeStyle = '#ff5a5f'; ctx.lineWidth = 1.4; ctx.beginPath();
      for (let i = 60; i <= 500; i++) { const y = 290 - 250 * 0.95 * Math.exp(-(i - 60) / 420); i > 60 ? ctx.lineTo(10 + i, y) : ctx.moveTo(10 + i, y); }
      ctx.stroke();
      ctx.strokeStyle = '#ff7a45'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(160, 150); ctx.lineTo(240, 150); ctx.stroke();
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
    return c;
  }

  // ---------------- about ----------------
  function about(root) {
    const lg = el('span', { class: 'logo', html: UT.LOGO });
    root.append(
      el('section', { class: 'hero about-hero' }, lg, el('div', null,
        el('p', { class: 'eyebrow' }, 'Giới thiệu phần mềm'),
        el('h1', null, el('span', { class: 'bn' }, 'PHATECO'), ' UT Lab'),
        el('p', { class: 'lead' }, 'Phòng thí nghiệm siêu âm ảo dùng trong đào tạo kiểm tra siêu âm (UT) mối hàn và vật liệu, từ lý thuyết sóng âm đến hiệu chuẩn máy và đánh giá khuyết tật.'),
        el('p', null, el('span', { class: 'vtag' }, 'Phiên bản ' + UT.VERSION), ' ', el('span', { class: 'vtag' }, 'Bản dựng ' + UT.BUILD)))),
      el('div', { class: 'two', style: { marginTop: '18px' } },
        el('section', { class: 'card info' }, el('h4', null, 'Thông tin phiên bản'), el('div', { class: 'info-b', html: `
          <p><b>1.0.0-beta</b> (23/11/2026): bản thử nghiệm đầu tiên để minh hoạ và thu thập phản hồi người dùng.</p>
          <ul>
            <li>Phần A: cấu tạo đầu dò 3D (thẳng, góc, kép TR), vật liệu và hiện tượng áp điện, trường âm, các dạng sóng 3D, khúc xạ và hướng dao động.</li>
            <li>Phần B: máy siêu âm ảo, chuẩn đầu dò thẳng và đầu dò góc trên V1/V2, dựng DAC trên mẫu ASME T-434.2, bù truyền âm.</li>
            <li>Phần C: đo chiều dày bằng đầu dò TR, kiểm tra mối hàn V đơn, V kép, chữ T trong 3D, chế độ thi và đánh giá theo ASME VIII-1 App.12.</li>
          </ul>
          <p>Cơ sở: ASME BPVC Section V Article 4 (2025), ASME BPVC Section VIII Div.1 Appendix 12 (2025), ASTM E797, quy trình PTC.NSRP.UT.01.</p>
          <p>Hạn chế đã biết: mẫu V1/V2 đơn giản hoá; mẫu hàn S1–S3 do phần mềm thiết kế; chưa có split DAC; mô hình biên độ là gần đúng, chỉ dùng cho mục đích đào tạo.</p>` })),
        el('section', { class: 'card info' }, el('h4', null, 'Bản quyền và liên hệ'), el('div', { class: 'info-b', html: `
          <p>© 2026 <b>PHATECO</b> – Công ty Cổ phần Dịch vụ Kỹ thuật PHATECO. Bảo lưu mọi quyền.</p>
          <p>Phần mềm và nội dung bài học thuộc quyền sở hữu của PHATECO. Không sao chép, phân phối hoặc sử dụng cho mục đích thương mại khi chưa có sự đồng ý bằng văn bản.</p>
          <p>Liên hệ, góp ý: <a href="mailto:nddung@phateco.com">nddung@phateco.com</a> (nddung@phateco.com)</p>
          <p>Báo lỗi và đề xuất tính năng: <a href="https://github.com/nguyenducdungvn/phateco-ut-lab/issues">github.com/nguyenducdungvn/phateco-ut-lab/issues</a></p>
          <p>Khi góp ý, vui lòng ghi rõ bài học, thiết bị (điện thoại/máy tính, trình duyệt) và mô tả hoặc ảnh chụp màn hình.</p>` }))));
  }

  // ---------------- router ----------------
  let cleanup = null;
  const main = () => UT.$('#main');
  function go() {
    const id = (location.hash || '#home').slice(1);
    if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
    const m = main(); m.innerHTML = ''; window.scrollTo(0, 0);
    document.querySelectorAll('.nav a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + id));
    document.body.classList.remove('navopen');
    const meta = META.find(x => x.id === id);
    if (id === 'about') { about(m); document.title = 'Giới thiệu · PHATECO UT Lab'; return; }
    if (!meta || !UT.MODS[id]) { home(m); document.title = 'PHATECO UT Lab'; return; }
    document.title = meta.t + ' · PHATECO UT Lab';
    const idx = META.indexOf(meta);
    const prev = META[idx - 1], next = META[idx + 1];
    m.appendChild(el('div', { class: 'modhead' },
      el('div', null, el('p', { class: 'eyebrow' }, PARTS[meta.part] + (meta.id !== 'quiz' ? ' · Bài ' + meta.n : '')), el('h2', null, meta.t), el('p', { class: 'lead sm' }, meta.d)),
      el('div', { class: 'modnav' }, prev ? el('a', { class: 'btn', href: '#' + prev.id }, '‹ ' + prev.t) : null, next ? el('a', { class: 'btn', href: '#' + next.id }, next.t + ' ›') : null)));
    const body = el('div', { class: 'modbody' }); m.appendChild(body);
    try { cleanup = UT.MODS[id](body); } catch (e) { console.error(e); body.appendChild(el('p', { class: 'bad' }, 'Lỗi tải bài: ' + e.message)); }
  }
  UT.start = function () {
    const nav = UT.$('#nav');
    nav.appendChild(el('a', { href: '#home' }, el('span', { class: 'nn' }, '⌂'), 'Tổng quan'));
    META.forEach(m => nav.appendChild(el('a', { href: '#' + m.id }, el('span', { class: 'nn' }, m.id === 'quiz' ? '?' : String(m.n)), m.t)));
    nav.appendChild(el('div', { class: 'navsep' }));
    nav.appendChild(el('a', { href: '#about' }, el('span', { class: 'nn' }, 'i'), 'Giới thiệu & phiên bản'));
    UT.$('#menuB').addEventListener('click', () => document.body.classList.toggle('navopen'));
    window.addEventListener('hashchange', go);
    go();
  };
})(UT);
