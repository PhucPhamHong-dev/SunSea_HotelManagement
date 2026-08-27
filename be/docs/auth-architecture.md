# Authentication architecture

## Boundary

Frontend chỉ gửi username/password tới Backend. Backend là nơi duy nhất biết Supabase Auth và ánh xạ username sang email nội bộ:

```text
admin + AUTH_USERNAME_DOMAIN=sunsea.local
  -> admin@sunsea.local
  -> Supabase Auth signInWithPassword
```

Không có registration API trong phase này. Response auth chỉ chứa `id`, `username`, `role` và `active`; token không được trả về JSON.

## Persistent session

- `hotel_session`: access token, HttpOnly, max-age ngắn.
- `hotel_refresh_session`: refresh token, HttpOnly, persistent, mặc định 3650 ngày.
- Cả hai cookie dùng `path=/`, `sameSite=lax`, và `secure` ở production.
- Guard kiểm tra access cookie trước. Nếu access token hết hạn, guard dùng refresh cookie, ghi cookie mới và tiếp tục request hiện tại.
- Logout xóa cả hai cookie.

Session vẫn có thể bị vô hiệu hóa bởi Supabase, refresh token bị thu hồi hoặc `profiles.active=false`.

## Roles

`profiles.role` chỉ có `owner` và `staff`. Hai role hiện có cùng quyền vận hành; `Roles()` decorator và `RolesGuard` được giữ làm boundary cho policy owner-only sau này.
