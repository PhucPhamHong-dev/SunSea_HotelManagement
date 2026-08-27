# Source Rules

- Giữ domain thuần TypeScript, không import NestJS hoặc Supabase vào domain.
- Controller chỉ nhận request, validate DTO và gọi application use case.
- Repository là nơi duy nhất truy cập dữ liệu.
- Thay đổi public API phải cập nhật Swagger decorators và frontend generated client.
- Khi phạm vi cho phép, thêm unit test cho domain/use case và integration test cho persistence; nếu người dùng hoãn test thì không tự chạy và phải ghi rõ trong báo cáo.
