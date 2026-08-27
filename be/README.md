# SUNSEA Backend

NestJS backend cho hệ thống quản lý khách sạn SUNSEA.

## Local setup

```bash
cp .env.example .env
pnpm install
pnpm build
pnpm start
```

Backend chạy tại `http://localhost:3001`, API prefix mặc định `/api/v1`, Swagger tại `/docs`, OpenAPI JSON tại `/openapi.json`, health tại `/api/v1/health`.

### Authentication

Màn hình đăng nhập chỉ gửi `username` và `password` tới Backend. Backend ánh xạ username sang email nội bộ Supabase theo `AUTH_USERNAME_DOMAIN` (mặc định `admin` → `admin@sunsea.local`), sau đó ghi access/refresh token vào HttpOnly cookie. Refresh cookie là persistent cookie với thời hạn cấu hình mặc định 3650 ngày; access token hết hạn sẽ được Backend tự refresh khi request tiếp theo cần xác thực. Session chỉ bị xóa khi gọi logout, refresh token bị thu hồi, Supabase từ chối refresh hoặc profile bị inactive.

Role hiện chỉ gồm `owner` và `staff`. Role được lấy từ `profiles`, trả về bởi `/api/v1/auth/me` và hiển thị trên dashboard; hai role chưa bị giới hạn nghiệp vụ ở phase này. Không có registration API.

Tài khoản seed mặc định: username `admin`, mật khẩu `123456`, role `owner`. Với Supabase hosted, user Auth/profile phải được provision trên đúng project; `seed.sql` có thể chạy lại an toàn với user `admin@sunsea.local` đã tồn tại.

Thông tin lưu trú hỗ trợ cập nhật trực tiếp qua `PATCH /api/v1/guests/:guestId` và `PATCH /api/v1/reservations/:reservationId`. Reservation update dùng `version` để optimistic locking, kiểm tra khoảng thời gian và chống ghi đè giữa nhiều máy. FE gửi thay đổi khi rời ô (`blur`); tổng tiền lưu trú được tính từ `GET /api/v1/reservations/:reservationId/checkout-preview`, không nhận giá trị nhập trực tiếp từ FE.

Khi chọn phòng trống trên dashboard, FE gọi `GET /api/v1/reservations/intake-policy?date=YYYY-MM-DD` để biết hành động được phép theo giờ `Asia/Ho_Chi_Minh`. Trước 12:00 của hôm nay có thể chọn `Nhận phòng ngay` hoặc `Đặt phòng trước`; từ 12:00 hôm nay chỉ nhận phòng ngay; ngày tương lai mặc định đặt phòng trước. `POST /api/v1/reservations/intake` bắt buộc `roomRatePerNight` (integer VND) và lưu nó thành snapshot bất biến của reservation. Với action `advance`, `depositAmount` là tùy chọn; nếu lớn hơn 0, cùng transaction sẽ tạo payment `deposit` đã hoàn tất. Cọc thực tế luôn lấy từ `payments` và tự trừ vào số còn phải thu; cột `deposit_expected` cũ không được dùng cho intake mới.

Turnover phòng dùng business date `Asia/Ho_Chi_Minh`. Một lượt 1 đêm giải phóng khoảng lưu trú tại checkout, nhưng `POST /reservations/intake` và check-in vẫn chỉ chấp nhận phòng `ready`. Quan trọng: `checked_in` là bằng chứng khách vẫn đang ở; `planned_check_out_at` chỉ là dự kiến và không bao giờ mở lại phòng khi chưa có `actual_check_out_at`. Vì vậy API status, API tìm phòng tương đương và mọi đường tạo reservation đều khóa phòng cho tới checkout thực tế. Khi lễ tân xác nhận bill trả phòng, Backend tính lại tiền phòng/dịch vụ/payment, ghi chính xác số dư dương thành payment `settlement` tiền mặt, checkout reservation và chuyển phòng sang `cleaning` trong **một transaction**. Số dư âm vẫn bắt buộc xử lý hoàn tiền trước. Staff/owner gọi `PATCH /api/v1/rooms/:roomId/housekeeping` với `{ "status": "ready" }` sau khi dọn xong. Dashboard phải lấy `GET /api/v1/rooms/status-by-date?floorId=&date=YYYY-MM-DD` thay vì tự suy ra trạng thái từ khoảng 00:00–24:00. API này là nguồn sự thật cho `canCreateStay`, `canCreateAdvance` và lý do chưa thể sử dụng phòng.

`planned_check_out_at` có thể để trống để tạo stay mở. Dù có hay không có ngày dự kiến trả, từ lúc reservation `checked_in` thì bill luôn tính live từ `actual_check_in_at` đến hiện tại (hoặc `actual_check_out_at`): đêm đầu tính ngay khi nhận, mỗi ngày tiếp theo tăng một đêm sau 17:00 theo `Asia/Ho_Chi_Minh`. Ngày dự kiến trả chỉ phục vụ vận hành, không được phép chốt tiền khi khách chưa checkout. Giá luôn dùng `room_rate_snapshot` và bill chỉ được chốt trong transaction checkout.

Từ migration `0016`, hệ thống bán theo **loại phòng** (số giường + có/không cửa sổ), rồi gán số phòng vật lý khi phù hợp. 102/202/302 là phòng 1 giường có cửa sổ; các room type khác không cửa sổ. Advance booking có thể dùng `assignmentMode: "room_type"`: vẫn giữ tồn kho đúng loại nhưng để `room_id` trống, lưu số phòng đang chọn ở `preferred_room_id`, và chỉ phân phòng `ready` tại check-in. Đây là cách booking tương lai không bị trạng thái `cleaning` hiện tại chặn vô lý. Immediate check-in luôn cần số phòng cụ thể ở trạng thái `ready`. `GET /api/v1/rooms/:roomId/equivalents?checkInAt=&checkOutAt?` trả room type, số chỗ còn lại và các candidate cùng số giường/cửa sổ. Gia hạn không tự động chuyển khách khác; nếu đụng tồn kho, transaction bị từ chối để staff xử lý rõ ràng.

Đặt trước `confirmed` được giữ đến **12:00 ngày hôm sau ngày nhận** theo `Asia/Ho_Chi_Minh`. Worker Backend chạy mỗi phút qua service-role RPC, tự chuyển các booking quá hạn sang `no_show`, tăng version và ghi audit log với nguồn hệ thống. `no_show` không làm thay đổi payment/cọc, không đưa phòng vào `cleaning` và không còn giữ phòng; phòng chỉ trở lại khả dụng khi housekeeping vốn đã `ready`. Không có API HTTP để nhân viên đánh dấu no-show thủ công. Khách đến muộn tạo reservation mới; việc hoàn, giữ hay điều chỉnh cọc của booking cũ nằm trong lịch sử thanh toán.

Supabase local được quản lý bằng Supabase CLI; `scripts/supabase-cli.sh` tự dùng CLI cài sẵn hoặc Docker fallback. Khi cần khởi tạo database local, chạy `bash scripts/reset-db.sh`; seed tạo master data 3 tầng/15 phòng để sơ đồ hoạt động và chỉ tạo tài khoản `admin / 123456`, không tạo khách, đặt phòng, dịch vụ hoặc thanh toán.

## Commands

```bash
pnpm lint
pnpm typecheck
pnpm build
bash scripts/supabase-cli.sh start
bash scripts/reset-db.sh
pnpm openapi:export
```

Test configuration được giữ sẵn cho phase sau; thay đổi intake v2 không thêm test suite mới. Docker Compose có thể chạy Backend và Frontend theo hướng dẫn bên dưới; Supabase local chỉ cần khi muốn reset môi trường local.

## Production một domain

Production không expose trực tiếp cổng `3000` hoặc `3001`. Docker Compose ở root repository chỉ bind Frontend/Backend vào `127.0.0.1:13000/13001`; Nginx trên VPS phục vụ `https://sunsea.phucpink.io.vn` tại `/` và proxy `/api/*`, `/socket.io/*`, `/docs*`, `/openapi.json` vào Backend. Do API và Frontend cùng origin, cookie HttpOnly có `Secure`/`SameSite=Lax` hoạt động ổn định và CORS production chỉ cần chính origin này.

Trên VPS, `.env` thật nằm ở `/opt/sunsea/.env`, dựa trên `deploy/production.env.example`; file này không được commit. Phải đặt `NODE_ENV=production`, `FRONTEND_URL`, `CORS_ORIGINS`, `NEXT_PUBLIC_API_BASE_URL` và `NEXT_PUBLIC_WS_URL` bằng `https://sunsea.phucpink.io.vn`, đồng thời giữ các credential Supabase hosted thuộc cùng project. Chạy compose production từ root repository, không dùng `be/docker-compose.yml` local.

Mỗi push vào branch `main` chạy quality gate Backend trước khi runner production triển khai. Workflow root chỉ deploy sau khi lint, typecheck, unit test hiện có và build thành công; môi trường runtime vẫn đọc credential từ `/opt/sunsea/.env`, không nhận secret từ GitHub Actions.

## Chạy Backend và Frontend bằng một Docker Compose

Từ thư mục Backend, chạy một lệnh:

```bash
cd be
docker compose up --build
```

Frontend chạy tại `http://localhost:3000`, Backend tại `http://localhost:3001`. Compose dùng Supabase hosted được cấu hình trong `be/.env`; không chạy Supabase local và không đưa `.env` vào Docker image. Dừng môi trường bằng `docker compose down`.

## Environment

Xem `.env.example`. Không commit `.env`, access token hoặc service-role key.

Backend cần `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `SUPABASE_DB_URL`, `DATABASE_URL`, `DIRECT_URL`, `COOKIE_SECRET`, `FRONTEND_URL` và `API_PREFIX`. `DATABASE_URL` dùng shared transaction-mode pooler cho request/query thông thường; `DIRECT_URL` dùng session-mode pooler cho migration. Service role chỉ dành cho worker realtime/seed/migration nội bộ.

Khi dùng Supabase hosted, `SUPABASE_URL` và ba key Supabase phải cùng thuộc một project; `DATABASE_URL`/`DIRECT_URL` chỉ là kết nối Postgres pooler và không thay thế được Auth, REST hoặc Realtime API key.

## Scope

Scaffold này có auth skeleton, health, floors, rooms, guests, reservation lifecycle, pricing preview, service catalog, reservation-services read/add, payments, database schema, RLS và realtime gateway. Calendar UI và các màn hình nghiệp vụ chi tiết sẽ được triển khai ở phase tiếp theo.

## Database

- `0001_foundation_schema.sql`: extensions, enum, bảng nghiệp vụ, audit columns, exclusion constraint, pricing và hard-delete guard.
- `0002_rls_realtime.sql`: RLS cho toàn bộ bảng public và publication realtime cho rooms/reservations/reservation_services/payments.
- `0003_username_owner_staff.sql`: đổi role enum thành `staff/owner`, thêm `profiles.username` với unique index không phân biệt hoa thường, cập nhật trigger tạo profile và seed identity `admin`.
- `0004_advance_reservation_operations.sql`: transaction check-in/hủy đặt phòng, optimistic lock và audit log.
- `0005_create_stay_operation.sql`: operation atomic tạo khách và lưu trú từ phòng trống, kiểm tra mốc 12:00 theo `Asia/Ho_Chi_Minh`, exclusion conflict và audit log.
- `0006_intake_room_rate_and_deposit_payment.sql`: cập nhật intake nhận giá/đêm từ lễ tân, lưu `room_rate_snapshot`, đồng thời tạo payment cọc và audit log trong transaction khi đặt trước.
- `0007_room_turnover_and_financial_locking.sql`: draft giữ phòng trong exclusion constraint; check-in/checkout là transaction có lock và audit, checkout chuyển room sang `cleaning`, staff xác nhận `ready`; payment/service làm tăng reservation version cho financial conflict.
- `0008_housekeeping_ready_transition.sql`: guard database chỉ cho phép chuyển `cleaning → ready`; API direct không thể đánh dấu đã dọn trong lúc còn khách.
- `0009_open_stays_and_equivalent_rooms.sql`: thêm `rooms.has_window`, cho phép checkout dự kiến `NULL`, exclusion range vô hạn cho stay mở và dữ liệu seed cửa sổ 102/202/302. Hành vi gia hạn tự chuyển booking lịch sử đã được thay thế bằng quyết định staff ở migration `0016`.
- `0010_checkout_bill_settlement.sql`: thay checkout RPC bằng transaction bill; tính lại tổng do Backend sở hữu, ghi payment `settlement` tiền mặt đúng số dư, audit payment/checkout và chuyển phòng sang `cleaning` một lần.
- `0011_edit_reservation_service.sql`: thêm RPC sửa dịch vụ trong stay đang ở; Backend kiểm tra trạng thái `checked_in`, tính lại `total`, audit `service.updated` và để financial-version trigger làm mới checkout bill.
- `0012_checked_in_stays_block_until_checkout.sql`: bảo đảm khách `checked_in` giữ phòng đến checkout thực tế, dù ngày dự kiến trả đã qua; intake và legacy draft-create đều bị database guard chặn trên phòng đó.
- `0013_revoke_occupied_room_guard_rpc.sql`: thu hồi quyền gọi trực tiếp trigger guard, giữ nó chỉ là cơ chế bảo vệ database nội bộ.
- `0014_live_pricing_until_actual_checkout.sql`: checkout bill tính mọi stay `checked_in` từ actual check-in tới thời điểm trả thực tế, không để ngày dự kiến trả cũ làm đóng băng tiền phòng.
- `0015_automatic_no_show.sql`: service-role-only RPC tự đánh dấu `confirmed` quá 12:00 ngày hôm sau là `no_show`, ghi audit hệ thống và không đụng đến payment/cọc.
- `0016_room_type_inventory_and_future_availability.sql`: thêm room type inventory, preferred/deferred physical assignment, draft hold 30 phút, check-in phân phòng cùng loại và availability theo business date.
- `0017_room_type_capacity_guard.sql`: trigger DB chặn overbooking cho toàn bộ reservation đang giữ tồn kho loại phòng.
- `0018_expected_checkout_physical_guard.sql`: physical room có ngày dự kiến trả được bán cho ngày sau mốc đó; stay mở vẫn khóa vô hạn và conflict thực tế lúc check-in cần staff quyết định.
- Autosave thông tin lưu trú không cần migration mới vì dùng các cột `guests` và `reservations` hiện có.
- `seed.sql`: tạo/cập nhật user `admin@sunsea.local`, profile owner, master data 3 tầng/15 phòng. Không còn dữ liệu vận hành mẫu; guests, reservations, services, payments và pricing phải được tạo qua Backend API.

Advance reservation dashboard dùng `GET /api/v1/reservations/advance` và `GET /api/v1/reservations/:reservationId/advance-detail`. Backend tổng hợp tiền cọc từ `payments` thực tế (chỉ payment/refund `completed` mới thay đổi tổng), trả `totalPaidAmount`, `remainingAmount`, `canCheckIn` và `checkInBlockedReason`. `PATCH /api/v1/reservations/:reservationId/check-in` và `/cancel` dùng version; cancel bắt buộc reason, ghi audit log trong transaction và phát thay đổi qua Realtime. No-show chỉ được worker nội bộ xử lý, nên không expose `PATCH /api/v1/reservations/:reservationId/no-show`. `GET /api/v1/rooms/status-by-date?floorId=...&date=YYYY-MM-DD` trả trạng thái phòng theo ngày và quyền intake do Backend quyết định.
