# Backend Agent Rules

1. Đọc `AGENTS.md` gần nhất trước khi sửa code.
2. Không phá vỡ kiến trúc phân tầng hiện tại.
3. Không tạo file sai tầng; controller không chứa nghiệp vụ hoặc truy cập Supabase.
4. Không đổi công nghệ nếu chưa được duyệt.
5. Không tự ý sửa database bằng Supabase Dashboard.
6. Database chỉ thay đổi bằng migration trong `supabase/migrations`.
7. API thay đổi phải cập nhật DTO/OpenAPI.
8. Mọi thay đổi API phải làm frontend generate lại client.
9. Mỗi thay đổi code phải cập nhật `CHANGELOG.md`.
10. Mỗi thay đổi nghiệp vụ phải cập nhật tài liệu liên quan.
11. Mỗi thay đổi phải có test phù hợp.
12. Không commit secret hoặc token.
13. Không dùng dữ liệu giả thay cho API thật khi API đã tồn tại.
14. Không bỏ qua lỗi TypeScript, ESLint hoặc test.
15. Không xóa code cũ nếu chưa hiểu tác động.
16. Nếu phát hiện yêu cầu mâu thuẫn, dừng và báo cáo.
17. Sau mỗi nhiệm vụ báo cáo file đã đổi, tính năng, changelog, test và rủi ro.

Phạm vi hiện tại có thể hoãn viết/chạy test và Docker khi người dùng yêu cầu; không được giả báo cáo là đã chạy. Không commit `.env`, service-role key, JWT secret hoặc token. Không dùng Dashboard để thay đổi database; mọi thay đổi schema phải có migration và seed chỉ dành cho local.
