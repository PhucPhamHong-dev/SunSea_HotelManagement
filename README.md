# SunSea Hotel Management

Hệ thống quản lý khách sạn SUNSEA gồm hai codebase độc lập:

- [`be/`](./be): NestJS API, Supabase integration và Socket.IO realtime.
- [`fe/`](./fe): Next.js dashboard cho vận hành khách sạn.

Mỗi ứng dụng có tài liệu và hướng dẫn chạy riêng:

- [Backend README](./be/README.md)
- [Frontend README](./fe/README.md)

Không commit file `.env` hoặc bất kỳ secret, token hay khóa kết nối nào.
