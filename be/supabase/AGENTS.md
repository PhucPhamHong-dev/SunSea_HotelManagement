# Supabase Rules

- Chỉ thay đổi schema bằng migration.
- Seed chỉ chứa dữ liệu local tái lập được, không chứa secret production.
- Bật RLS cho mọi bảng public.
- Service role chỉ dùng cho seed, migration và worker nội bộ; không đưa vào frontend.
- Sau migration phải chạy reset và kiểm tra RLS/exclusion constraint.
