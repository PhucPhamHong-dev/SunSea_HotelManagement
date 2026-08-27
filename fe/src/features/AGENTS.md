# Feature Rules

- Mỗi feature tự quản lý hook, service, state và component nghiệp vụ liên quan.
- Shared UI đặt trong `src/components`; không đưa nghiệp vụ vào shared component.
- Feature chỉ gọi backend qua generated API client.
- Realtime chỉ invalidate/cập nhật query liên quan và phải xử lý disconnected state.
