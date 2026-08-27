# Frontend Agent Rules

1. Đọc `AGENTS.md` gần nhất trước khi sửa code.
2. Không phá vỡ kiến trúc hiện tại.
3. Không tạo file sai tầng.
4. Không đổi công nghệ nếu chưa được duyệt.
5. Không tự ý sửa database bằng Dashboard.
6. Database thay đổi bằng migration ở backend.
7. API backend thay đổi phải cập nhật OpenAPI và chạy `pnpm api:generate`.
8. Mỗi thay đổi code phải cập nhật `CHANGELOG.md`.
9. Mỗi thay đổi nghiệp vụ phải cập nhật tài liệu liên quan.
10. Mỗi thay đổi phải có test phù hợp.
11. Không commit secret.
12. Không dùng dữ liệu giả thay cho API thật khi API đã có.
13. Không import `@supabase/supabase-js` hoặc gọi Supabase trực tiếp.
14. Không bỏ qua lỗi TypeScript, ESLint hoặc test.
15. Không xóa code cũ nếu chưa hiểu tác động.
16. Nếu phát hiện yêu cầu mâu thuẫn, dừng và báo cáo.
17. Sau mỗi nhiệm vụ báo cáo file đã đổi, tính năng, changelog, test và rủi ro.
18. Mọi số tiền VND hiển thị phải dùng dấu phẩy ngăn cách hàng nghìn, ví dụ `300,000đ`; ô nhập tiền chỉ nhận integer VND và phải loại dấu phân tách trước khi gọi API.

Frontend chỉ giữ `NEXT_PUBLIC_API_BASE_URL` và `NEXT_PUBLIC_WS_URL`. Không thêm biến Supabase, `DATABASE_URL`, schema database hoặc secret. Nếu người dùng hoãn test/Docker, ghi rõ trạng thái đó trong CHANGELOG và báo cáo, không giả định đã chạy.
