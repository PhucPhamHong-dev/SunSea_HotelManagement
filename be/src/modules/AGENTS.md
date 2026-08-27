# Module Rules

- Mỗi module nghiệp vụ dùng domain/application/infrastructure/presentation.
- Module không truy cập repository nội bộ của module khác.
- Giao tiếp liên module qua application service hoặc port/interface.
- Business error phải có error code ổn định.
