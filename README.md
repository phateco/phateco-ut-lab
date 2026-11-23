<p align="center"><img src="assets/logo.svg" width="96" alt="PHATECO UT Lab"></p>

# PHATECO UT Lab

Phòng thí nghiệm siêu âm ảo dùng trong đào tạo kiểm tra siêu âm (UT) mối hàn và vật liệu: từ cấu tạo đầu dò, sóng âm, hiệu chuẩn máy trên mẫu V1/V2 và mẫu DAC, đến kiểm tra mối hàn và đánh giá khuyết tật theo ASME.

**Phiên bản:** 1.0.0-beta (23/11/2026). Đây là bản thử nghiệm ban đầu để minh hoạ và thu thập phản hồi người dùng.

## Chạy thử

- Mở trực tiếp file `index.html` bằng trình duyệt (Chrome, Edge, Safari, Firefox bản mới). Lần đầu cần có mạng để tải thư viện 3D (three.js r128 từ cdnjs) và phông chữ.
- Dùng được trên máy tính (chuột, bàn phím) và điện thoại/máy tính bảng (cảm ứng).
- Có thể bật GitHub Pages (Settings → Pages → Deploy from branch `main`, thư mục `/root`) để chia sẻ đường link cho người dùng thử.

## Nội dung bài học

| Phần | Bài | Nội dung |
|---|---|---|
| A · Hiểu bản chất | 1 | Cấu tạo đầu dò thẳng, đầu dò góc, đầu dò kép TR (3D, cắt bổ, tách rời); vật liệu và hiện tượng áp điện; vùng gần, góc mở chùm tia theo tần số và kích thước |
| | 2 | Các dạng sóng âm 3D: dọc, ngang, bề mặt, Lamb |
| | 3 | Định luật Snell, góc tới hạn, hướng dao động của từng dạng sóng; chân 1, chân 2, bước nhảy |
| B · Hiệu chuẩn | 4 | Chuẩn đầu dò thẳng trên V1: velocity, probe delay, range, độ nhạy 80% FSH, độ phân giải |
| | 5 | Chuẩn đầu dò góc trên V2/V1: điểm ra tia, zero, range, góc khúc xạ thực |
| | 6 | Dựng DAC trên mẫu chuẩn ASME T-434.2, bù truyền âm, độ nhạy quét +6 dB |
| C · Thực hành | 7 | Đo chiều dày bằng đầu dò TR (ASTM E797) |
| | 8 | Kiểm tra mối hàn V đơn, V kép, chữ T trong 3D; nhận dạng nứt, không ngấu vách, không thấu, ngậm xỉ, rỗ khí; đánh giá theo ASME VIII-1 App.12; chế độ thi có chấm điểm |
| Ôn tập | | 18 câu trắc nghiệm |

Cơ sở kỹ thuật: ASME BPVC Section V Article 4 (2025), ASME BPVC Section VIII Div.1 Appendix 12 (2025), ASTM E797, quy trình PTC.NSRP.UT.01.

## Hạn chế đã biết (bản 1.0.0-beta)

- Mẫu V1 (ISO 2400) và V2 (ISO 7963) đơn giản hoá hình dạng; mẫu hàn S1–S3 do phần mềm thiết kế, chưa phải bản vẽ mẫu thi thực tế.
- Giao diện máy siêu âm dạng chung, chưa mô phỏng menu của một máy cụ thể.
- Chưa có DAC chia đoạn (split DAC) và TCG.
- Mô hình biên độ là gần đúng có kiểm soát, chỉ dùng cho mục đích đào tạo.
- Tiến độ và thông số hiệu chuẩn chỉ lưu trên trình duyệt của từng người dùng.

## Góp ý và báo lỗi

- Tạo Issue tại https://github.com/nguyenducdungvn/phateco-ut-lab/issues, ghi rõ bài học, thiết bị/trình duyệt và ảnh chụp màn hình nếu có.
- Hoặc gửi email: nddung@phateco.com

## Cấu trúc mã nguồn

```
index.html        Bản dựng hoàn chỉnh (một file) – mở trực tiếp để chạy
build.py          Ghép src/ thành index.html:  python3 build.py
assets/logo.svg   Logo ứng dụng
src/
  template.html   Khung HTML + CSS
  engine.js       Mô hình âm học: đầu dò, chùm tia, tiếng vọng, tổng hợp A-scan, cổng đo, App.12
  specimens.js    Mẫu V1, V2, mẫu DAC ASME, mẫu bậc, tấm ăn mòn, mối hàn S1–S3, thư viện khuyết tật
  core.js         Tiện ích giao diện, lưu trữ, khung xem 3D, bảng nhiệm vụ
  instrument.js   Máy siêu âm ảo (A-scan, điều khiển, DAC, hiệu chuẩn tự động)
  specview.js     Mặt cắt 2D và 3D của mẫu, dò tia
  lab.js          Bố cục phòng thí nghiệm (mẫu + máy + nhiệm vụ)
  mod_m1.js       Bài 1
  mod_theory.js   Bài 2–3
  mod_cal.js      Bài 4–6
  mod_prac.js     Bài 7–8
  app.js          Trang chủ, trắc nghiệm, giới thiệu, điều hướng
```

## Bản quyền

© 2026 PHATECO – Công ty Cổ phần Dịch vụ Kỹ thuật PHATECO. Bảo lưu mọi quyền. Xem [LICENSE](LICENSE).
