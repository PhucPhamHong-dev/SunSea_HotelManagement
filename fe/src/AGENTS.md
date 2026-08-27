# Source Rules

- App Router page/layout chịu trách nhiệm composition; feature hook/service chịu trách nhiệm nghiệp vụ client.
- Component UI không gọi fetch trực tiếp.
- API contract lấy từ `src/lib/api/generated` bằng `pnpm api:generate`.
- Không định nghĩa lại DTO đã có trong OpenAPI.
- Không chứa Supabase client, database schema hoặc secret.
- Tiền VND hiển thị/nhập dùng dấu phẩy ngăn cách hàng nghìn (`300,000đ`); API chỉ nhận integer VND đã bỏ dấu phân tách.
