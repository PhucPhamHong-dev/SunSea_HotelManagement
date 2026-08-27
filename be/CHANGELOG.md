# Changelog

Mọi thay đổi đáng kể phải được ghi tại mục Unreleased.

## [Unreleased]

### Added

- **2026-08-26 | BE/Database/API:** Thêm và áp dụng `0016_room_type_inventory_and_future_availability.sql`: bảng `room_types`, `rooms.room_type_id`, reservation có `room_type_id`/`preferred_room_id`, có thể chưa gán `room_id` trước check-in và draft hold tự hết hạn sau 30 phút. `POST /reservations/intake` nhận `assignmentMode=exact|room_type`; booking theo loại phòng chỉ match chính xác số giường và thuộc tính cửa sổ.
- **2026-08-26 | BE/Database:** Thêm và áp dụng `0017_room_type_capacity_guard.sql` để mọi booking, kể cả booking chọn số phòng cụ thể, đều bị chặn khi hết tồn kho loại phòng trong khoảng thời gian yêu cầu.
- **2026-08-26 | BE/Database:** Thêm và áp dụng `0018_expected_checkout_physical_guard.sql`; khách đang ở có ngày dự kiến trả rõ ràng không còn khóa số phòng ở các ngày sau mốc đó, còn stay mở vẫn khóa vô hạn. Nếu khách ở quá dự kiến, check-in booking sau bị chặn để staff quyết định, không tự chuyển phòng.

- **2026-08-26 | BE/Database/Operations:** Thêm và áp dụng migration `0015_automatic_no_show.sql` cùng worker Backend chạy mỗi phút. Reservation `confirmed` quá 12:00 ngày sau ngày nhận theo `Asia/Ho_Chi_Minh` được chuyển `no_show` transactionally, tăng version, ghi audit nguồn hệ thống và phát realtime room-status; payment/cọc không bị thay đổi.

- **2026-08-26 | BE/Database:** Thêm migration `0014_live_pricing_until_actual_checkout.sql`, đồng bộ transaction checkout với live pricing của stay đang có khách.

- **2026-08-26 | BE/Database:** Thêm migration `0012_checked_in_stays_block_until_checkout.sql` và `0013_revoke_occupied_room_guard_rpc.sql`. Intake và legacy draft-create bị database guard chặn khi phòng còn reservation `checked_in`; trigger guard không được expose thành RPC.

- **2026-08-24 | BE/API/Database:** Thêm migration `0011_edit_reservation_service.sql` và `PATCH /api/v1/reservation-services/:serviceId`. RPC chỉ cho sửa dịch vụ của reservation `checked_in`, tính lại `total`, ghi `service.updated` audit và không cho cập nhật sau checkout.

- **2026-08-24 | BE/API/Database:** Thêm migration `0010_checkout_bill_settlement.sql` và RPC atomic checkout bill. Xác nhận trả phòng sẽ tính lại số dư ở Backend, ghi payment `settlement` tiền mặt đúng số tiền còn lại, audit payment/checkout và chuyển phòng sang `cleaning` trong cùng transaction.

- **2026-08-24 | BE/API/Database:** Thêm migration `0009_open_stays_and_equivalent_rooms.sql`: `rooms.has_window`, checkout dự kiến nullable, exclusion range `NULL → infinity`, RPC intake open stay và RPC gia hạn stay tự chuyển đặt trước bị ảnh hưởng sang phòng tương đương trong cùng transaction/audit/realtime.
- **2026-08-24 | BE/API:** Thêm `GET /api/v1/rooms/:roomId/equivalents?checkInAt=&checkOutAt?`. API chỉ trả phòng cùng chính xác `bedCount` và `hasWindow`, ưu tiên cùng tầng rồi tăng dần số phòng.

- **2026-08-24 | BE/API/Database:** Thêm `GET /api/v1/rooms/status-by-date?floorId=&date=YYYY-MM-DD` và `PATCH /api/v1/rooms/:roomId/housekeeping`. API trạng thái theo ngày trả quyền tạo lượt lưu trú do Backend quyết định; thao tác housekeeping `ready` có audit log.
- **2026-08-24 | BE/Database:** Thêm migration `0008_housekeeping_ready_transition.sql` để chỉ cho phép xác nhận `ready` sau khi checkout đã đưa phòng vào `cleaning`; direct API call không thể bypass turnover.

- **2026-08-24 | BE/API/Database:** Intake v2 nhận `roomRatePerNight` integer VND và `depositAmount` cho đặt trước. Migration `0006_intake_room_rate_and_deposit_payment.sql` tạo payment cọc completed cùng transaction reservation, dùng `payments` làm nguồn sự thật và ghi audit log riêng.

- **2026-08-24 | BE/API/Database:** Thêm `GET /api/v1/reservations/intake-policy` và `POST /api/v1/reservations/intake` cho luồng click phòng trống; tạo guest và reservation atomic qua migration `0005_create_stay_operation.sql`, hỗ trợ `check_in` hoặc `advance`, kiểm tra mốc 12:00 `Asia/Ho_Chi_Minh` và ghi audit log.

- **2026-08-24 | BE/DevOps:** Bổ sung `.dockerignore` bảo vệ `.env` khỏi Docker build context và hoàn thiện Compose chạy Backend cùng Frontend.

- **2026-08-23 | BE/API:** Thêm `GET /api/v1/reservations/advance` và `GET /api/v1/reservations/:reservationId/advance-detail`; Backend tổng hợp phòng/tầng/khách, tiền cọc ròng, tổng đã trả, số tiền còn lại và khả năng nhận phòng từ dữ liệu thật.
- **2026-08-23 | BE/API:** Bổ sung operation nhận phòng/hủy đặt phòng với optimistic locking; hủy bắt buộc lý do và cả hai operation transactionally ghi `audit_logs` qua migration `0004_advance_reservation_operations.sql`.
- **2026-08-23 | BE/API:** Room response có `reservationId`/`updatedAt`, lọc trạng thái theo khoảng ngày và realtime có thêm `payment.updated`; seed local thêm guest/reservation/payment vận hành để kiểm tra dashboard qua API.

- **2026-08-23 | BE/API:** Thêm `PATCH /api/v1/reservations/:reservationId` và mở rộng `PATCH /api/v1/guests/:guestId` cho autosave từng ô thông tin lưu trú; reservation dùng optimistic locking theo `version`.

- **2026-08-23 | BE/API:** Thêm đăng nhập bằng username, schema response auth trong OpenAPI, persistent HttpOnly session cookies, auto-refresh access token và role boundary `owner/staff`; không thêm registration API.

- **2026-08-22 | BE/Database/API:** Khởi tạo scaffold NestJS, Supabase schema/RLS/seed, API foundation và realtime skeleton; test implementation được để phase sau.
- **2026-08-23 | BE/API:** Thêm modules guests, reservations, pricing, services, payments, audit và housekeeping skeleton; thêm reservation lifecycle, pricing preview, service/payment manual APIs và `/api/v1` OpenAPI routes.

### Changed

- **2026-08-26 | BE/Operations/API:** Trạng thái `cleaning` chỉ chặn nhận phòng tức thời. `GET /rooms/status-by-date` không mang trạng thái dọn hiện tại sang business date tương lai; availability tương lai được xét theo tồn kho loại phòng. Check-in reservation chưa gán phòng sẽ chọn phòng `ready` đúng room type, ưu tiên phòng mong muốn rồi mới theo số phòng.
- **2026-08-26 | BE/Operations:** Gia hạn stay không còn tự động chuyển booking của khách khác. Nếu thiếu tồn kho room type, Backend từ chối transaction với conflict để staff quyết định rõ ràng.

- **2026-08-26 | BE/API:** Bỏ public operation `PATCH /api/v1/reservations/:reservationId/no-show`; no-show chỉ được xử lý tự động bằng service-role worker, còn khách đến muộn phải tạo lượt mới.

- **2026-08-24 | BE/API:** `POST /api/v1/reservations/:reservationId/check-out` không còn yêu cầu FE tự thanh toán trước. API xác nhận bill phía server; nếu bill đã đổi trả `OPTIMISTIC_LOCK_CONFLICT`, còn overpayment vẫn trả `CHECKOUT_REFUND_REQUIRED`.

- **2026-08-24 | BE/Operations:** `POST /reservations/intake`, create/update reservation chấp nhận checkout rỗng. Stay mở khóa phòng đến checkout và Backend tính live đêm đầu tại check-in, sau đó thêm một đêm mỗi 17:00 theo `Asia/Ho_Chi_Minh`; tổng được chốt theo checkout thực tế.
- **2026-08-24 | BE/API:** Detail advance/checkout preview trả `isOpenEnded`, `chargedNights`, `amountAsOf` và cho phép amount dự kiến/remainder là `null` khi đặt trước chưa có ngày trả.
- **2026-08-24 | BE/API:** Custom service yêu cầu tên, đơn giá VND integer và số lượng integer; service catalog không còn là yêu cầu cho thao tác nhập tay.

- **2026-08-24 | BE/Database:** Migration `0007_room_turnover_and_financial_locking.sql` đưa `draft` vào exclusion constraint, check-in chỉ cho phép từ đúng ngày nhận dự kiến khi phòng `ready`, checkout chuyển phòng sang `cleaning` trong cùng transaction và `Asia/Ho_Chi_Minh` là chuẩn ngày nghiệp vụ.
- **2026-08-24 | BE/Finance:** Chỉ refund `completed` mới làm giảm tổng đã trả/cọc; payment và reservation service làm thay đổi số dư sẽ tăng `reservations.version` để checkout phát hiện optimistic-lock conflict.

- **2026-08-24 | BE/API:** `POST /api/v1/reservations/intake` không còn nhận `depositExpected`; giá/đêm do lễ tân nhập được lưu vào `room_rate_snapshot`, cọc chỉ hợp lệ cho `advance` và được trừ qua payment summary/checkout preview.

- **2026-08-24 | BE/Database:** Thu gọn `supabase/seed.sql` còn tài khoản `admin / 123456`, master data 3 tầng/15 phòng; guests, reservations, services, payments và pricing không còn được seed mặc định.

- **2026-08-24 | BE/Config:** Chuyển `.env` runtime sang Supabase hosted project; cập nhật Supabase URL/API keys, bật Realtime và trỏ `SUPABASE_DB_URL` tới session pooler. Không thay đổi migration.

- **2026-08-24 | BE/Database:** Cấu hình `.env` Backend sử dụng Supabase shared pooler transaction mode cho `DATABASE_URL` và session mode cho `DIRECT_URL`; không thay đổi migration.

- **2026-08-23 | BE:** Payment summary chỉ tính payment `completed`, loại trừ khoản `voided`/`refunded` và trừ refund khỏi tổng; không dùng `deposit_expected` làm tiền cọc đã thu.

- **2026-08-23 | BE:** Reservation details update kiểm tra lifecycle, thời gian nhận/trả, exclusion conflict và cập nhật audit fields; tổng tiền vẫn được tính server-side qua checkout preview.

- **2026-08-23 | BE:** Auth profile dùng `profiles.username`; username được ánh xạ sang email nội bộ theo `AUTH_USERNAME_DOMAIN`, dashboard nhận role từ Backend và logout xóa cả access/refresh cookie.

- **2026-08-23 | BE:** Đồng bộ repository/DTO room với `bed_count`, `default_nightly_rate`, `layout_key`, housekeeping status và derived display status; cookie session dùng HttpOnly names `hotel_session`/`hotel_refresh_session`.
- **2026-08-23 | BE:** Bổ sung `/api/v1/rooms/availability`, `/api/v1/floors/:floorId`, `/api/v1/health/supabase`, checkout preview/balance guard, hard-delete protection và tài liệu kiến trúc.

### Fixed

- **2026-08-26 | BE/Finance:** Sửa lỗi ngày dự kiến trả đã qua làm đóng băng tiền phòng. Khi status là `checked_in`, preview/detail và checkout dùng `actual_check_in_at` đến thời điểm hiện tại/trả thực tế; bill tăng thêm đêm sau 17:00 `Asia/Ho_Chi_Minh` dù `planned_check_out_at` vẫn tồn tại.

- **2026-08-26 | BE/Operations:** Sửa lỗi khách đã quá ngày dự kiến trả nhưng chưa checkout bị xem là trống. `checked_in` giờ giữ phòng cho API status theo ngày và equivalent-room lookup đến khi checkout thực tế hoàn tất; không thể tạo booking mới trên chính phòng đó.

- **2026-08-24 | BE/Operations:** Sửa lỗi một đêm bị hiển thị là khóa cả ngày checkout: trạng thái phòng được truy vấn theo business date, còn lượt mới chỉ mở sau khi checkout và staff xác nhận dọn xong.

- **2026-08-24 | BE/DevOps:** Cấu hình `pnpm-workspace.yaml` cho phép các dependency build cần thiết trong Docker, sửa lỗi Docker install `ERR_PNPM_IGNORED_BUILDS`.
- **2026-08-24 | BE/Auth:** Hạ validation password login xuống tối thiểu 6 ký tự để tài khoản seed `admin / 123456` đăng nhập được; seed đồng bộ password và hỗ trợ user Auth đã tồn tại trên Supabase hosted.
- **2026-08-24 | BE/Config:** Cho phép CORS cho cả `localhost:3000` và `127.0.0.1:3000` để session login hoạt động với cả hai địa chỉ local.
- **2026-08-24 | BE/Database:** Sửa UUID seed của floors sang UUID version 4 hợp lệ để `GET /rooms?floorId=...` không bị validation Backend từ chối.

- **2026-08-23 | BE:** Guest autosave từ chối tên khách rỗng sau khi trim và chuẩn hóa các giá trị trống thành `NULL` khi cập nhật.

### Database

- **2026-08-26 | Database:** Đã áp dụng `0016_room_type_inventory_and_future_availability.sql`, `0017_room_type_capacity_guard.sql` và `0018_expected_checkout_physical_guard.sql` trên Supabase hosted; backfill thành công 4 room type từ 15 phòng, RLS `room_types_active_user` được bật, và reservations hiện hữu giữ phòng ưu tiên/loại phòng tương ứng.

- **2026-08-26 | Database:** Đã áp dụng `0015_automatic_no_show.sql` lên Supabase hosted. RPC no-show dùng `FOR UPDATE SKIP LOCKED`, chỉ cấp quyền `service_role`, và không ghi payment/refund hoặc chuyển phòng sang cleaning.

- **2026-08-26 | Database:** Đã áp dụng `0014_live_pricing_until_actual_checkout.sql` lên Supabase hosted và xác nhận `checkout_and_settle_reservation` vẫn chỉ cấp quyền execute cho `authenticated`.

- **2026-08-26 | Database:** Đã áp dụng `0012_checked_in_stays_block_until_checkout.sql` và `0013_revoke_occupied_room_guard_rpc.sql` lên Supabase hosted. Xác nhận trigger `reservations_prevent_occupied_room` được bật và role `authenticated` không thể gọi trực tiếp guard function.

- **2026-08-24 | Database:** Đã áp dụng `0010_checkout_bill_settlement.sql` lên Supabase hosted và xác nhận function `public.checkout_and_settle_reservation(uuid, integer, numeric, uuid)` tồn tại. RPC checkout cũ bị revoke quyền `authenticated` để không bypass settlement.

- **2026-08-24 | Database:** Đã áp dụng `0009_open_stays_and_equivalent_rooms.sql` lên Supabase hosted. Xác nhận 102/202/302 có cửa sổ, các phòng khác không; constraint overlap dùng `coalesce(planned_check_out_at, 'infinity')`.

- **2026-08-24 | Database:** Đã áp dụng migration `0007_room_turnover_and_financial_locking.sql` và `0008_housekeeping_ready_transition.sql` lên Supabase hosted: turnover transaction, guarded ready transition/audit, exclusion `draft|confirmed|checked_in` và financial-version triggers.

- **2026-08-24 | Database:** Đã áp dụng migration `0006_intake_room_rate_and_deposit_payment.sql` lên Supabase hosted; cột legacy `reservations.deposit_expected` được giữ tương thích nhưng intake mới luôn ghi `0`.

- **2026-08-24 | Database:** Thêm `0005_create_stay_operation.sql`; function `public.create_stay` rollback guest nếu reservation xung đột, giữ `deposit_expected` là tiền cọc dự kiến và không tạo payment giả.

- **2026-08-24 | Database:** Xóa dữ liệu vận hành seed trên Supabase hosted; giữ lại Auth user/profile `admin` owner và master data floors/rooms cho sơ đồ. Guests, reservations, services và payments đã về rỗng.

- **2026-08-23 | Database:** Thêm migration `0004_advance_reservation_operations.sql` cho check-in/hủy có lock hàng, version check và audit log trong cùng transaction; cập nhật `seed.sql` với dữ liệu local phục vụ dashboard.

- **2026-08-23 | Database:** Không thêm migration; autosave sử dụng các cột hiện có trong `guests` và `reservations`.

- **2026-08-23 | Database:** Thêm migration `0003_username_owner_staff.sql` để chuyển enum role sang `staff/owner`, thêm username bắt buộc và unique case-insensitive, cập nhật trigger profile mặc định và seed `admin` owner.

- **2026-08-22 | Database:** Chuẩn bị migration cho profiles, floors, rooms, guests, reservations, service_catalog, reservation_services và payments; migration liên quan: `0001_initial_schema.sql`, `0002_rls_realtime.sql`.
- **2026-08-23 | Database:** Thay migration foundation bằng đầy đủ bảng pricing policies/rules, snapshots, charges, hotel settings và audit logs; thêm enum roles V1, exclusion constraint `[)`, RLS, realtime publication và seed 3 tầng/15 phòng không gán giá phòng giả.

### API

- **2026-08-26 | API:** OpenAPI đã bổ sung `Room.roomTypeId`/`roomTypeName`, `CreateStayDto.assignmentMode`, availability room type trong endpoint equivalents và nullable physical-room fields cho reservation/list/detail; Frontend Orval client đã regenerate từ contract này.

- **2026-08-26 | API:** Đã export OpenAPI không còn operation no-show thủ công; Frontend Orval client đã regenerate từ contract này.

- **2026-08-24 | API:** Swagger/OpenAPI thêm contract `UpdateReservationServiceDto`; sửa schema `ReservationServiceResponseDto.note` thành `string | null` để FE generated client không nhận kiểu object sai.

- **2026-08-24 | API:** Export lại Swagger/OpenAPI cho mô tả checkout bill; FE generated client đã regenerate từ `be/openapi.json`.

- **2026-08-24 | API:** Swagger/OpenAPI đã export lại cho room equivalence, `hasWindow`, checkout nullable và financial metadata open stay; Frontend generated client cần regenerate.

- **2026-08-24 | API:** Swagger/OpenAPI thêm room status-by-date, metadata `canCreateStay`/`canCreateAdvance`/`unavailableReason` và response typed cho housekeeping update; Frontend generated client cần regenerate.

- **2026-08-24 | API:** Export lại OpenAPI với contract intake v2 để Frontend generate typed client; `roomRatePerNight` là bắt buộc, `depositAmount` là optional cho action advance.

- **2026-08-24 | API:** Cập nhật Swagger/OpenAPI cho intake policy, nested guest form và response tạo lưu trú; FE generated client đã được regenerate.

- **2026-08-23 | API:** Swagger/OpenAPI đã cập nhật DTO query/list/detail advance reservation, cancel reason, room status metadata và generated client đã được regenerate ở FE.

- **2026-08-23 | API:** OpenAPI bổ sung schema cho reservation details update và guest partial update; FE client được regenerate sau thay đổi contract.

- **2026-08-23 | API:** Cập nhật `POST /api/v1/auth/login` nhận `username`, bổ sung typed response cho login/logout/me/refresh và regenerate OpenAPI JSON cho FE client.

- **2026-08-22 | API:** Thêm health, auth skeleton, floors và rooms endpoints; OpenAPI tại `/openapi.json`.
- **2026-08-23 | API:** OpenAPI sinh lại với prefix `/api/v1`, health Supabase, rooms rate/housekeeping, guests, reservations/actions/checkout-preview, service catalog/reservation services, payments và audit logs.
- **2026-08-23 | BE/API:** Payment flow đi qua `ManualPaymentAdapter` application port trước khi persistence ghi payment manual.
- **2026-08-23 | BE/API:** Room rate Swagger metadata được chuẩn hóa thành numeric field và ghi rõ trạng thái chưa cấu hình; migration vẫn lưu `NULL`.
- **2026-08-23 | BE/API:** Bổ sung `GET /api/v1/reservations/:reservationId/services`, response schema reservation services, và schema checkout preview riêng để FE dùng typed contract chính xác.

### Tests

- **2026-08-26 | Tests/BE/Database/API/DevOps:** Đã chạy `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm openapi:export`; Docker Compose Backend/Frontend rebuild thành công, health `200`, `/login` `200`. Smoke với session Backend thật xác nhận 4 nhóm room type đúng (102/202/302 là 1 giường có cửa sổ), phòng 105 `cleaning` hôm nay nhưng `available/canCreateAdvance=true` ngày mai, và equivalent API của 105 chỉ trả 205/305 cùng type. Không thêm/chạy test suite mới theo phạm vi.

- **2026-08-26 | Tests/BE/Database/API/DevOps:** Đã chạy `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm openapi:export`; kiểm tra transaction rollback trên Supabase hosted xác nhận transition `confirmed → no_show`, version/audit hệ thống và không tạo payment. Xác nhận RPC chỉ `service_role` có execute, route manual trả `404`, Docker Backend/Frontend rebuild thành công, health `200` và `/login` `200`. Không thêm/chạy test suite mới theo phạm vi.

- **2026-08-26 | Tests/BE/API/Database/DevOps:** Đã chạy `pnpm lint`, `pnpm typecheck`, `pnpm build`; Docker Compose rebuild thành công và Backend healthy. REST smoke với reservation 105 đang `checked_in` xác nhận `chargedNights=2`, `roomAmount=700000`, `serviceAmount=130000` và `balance=830000` từ `checkout-preview`. Không tạo/chạy unit, integration hoặc E2E test mới.

- **2026-08-26 | Tests/BE/API/Database/DevOps:** Đã chạy `pnpm lint`, `pnpm typecheck`, `pnpm build`; Compose rebuild thành công và Backend healthy. REST smoke bằng session Backend thật xác nhận phòng 105 có guest `checked_in` quá ngày dự kiến trả vẫn là `occupied`, `canCreateStay=false`, `canCreateAdvance=false`; API equivalent từ 105 chỉ trả 205/305. Không tạo/chạy unit, integration hoặc E2E test mới.

- **2026-08-24 | Tests/BE/Database/DevOps:** Đã chạy `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm openapi:export`; áp dụng migration `0011`, xác nhận RPC update service tồn tại, Docker Backend health `200` và OpenAPI runtime có endpoint update service. Không tạo/chạy test hoặc mutation dịch vụ trên dữ liệu vận hành hiện có.

- **2026-08-24 | Tests/BE/Database/DevOps:** Đã chạy `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm openapi:export` thành công; migration `0010` apply và schema function/ACL check thành công. Docker Compose rebuild, Backend health `200` và OpenAPI runtime có mô tả checkout bill. Không tạo/chạy test suite hoặc mutation checkout trên dữ liệu vận hành hiện có.

- **2026-08-24 | BE:** Đã chạy `pnpm lint`, `pnpm typecheck` và `pnpm build` thành công sau migration/API stay mở và equivalent room. Không thêm test mới theo phạm vi.

- **2026-08-24 | Tests/BE/Database:** Đã chạy `pnpm lint`, `pnpm typecheck`, `pnpm build`; kiểm tra Supabase hosted xác nhận exclusion constraint gồm `draft|confirmed|checked_in`, đủ RPC/trigger turnover-financial và guard `cleaning → ready`; smoke Backend thật xác nhận health, login/logout và room-status-by-date trả 15 phòng với availability fields. Không thêm/chạy test suite mới.

- **2026-08-24 | Tests/API/Database:** Đã chạy `pnpm lint`, `pnpm typecheck`, `pnpm build`, export OpenAPI và áp dụng migration `0006` trên Supabase hosted. Smoke xác nhận health `200`, login `201`, intake policy `200`, validation intake thiếu giá/đêm `400`; transaction rollback xác nhận room-rate snapshot, payment cọc và hai audit logs mà không để lại dữ liệu vận hành. Không tạo/chạy test suite mới.

- **2026-08-24 | Tests/API:** Đã chạy migration online, xác nhận login `201`, intake policy hôm nay/ngày tương lai `200`, function `create_stay` tồn tại; đã chạy `pnpm typecheck`, `pnpm build`; không chạy Docker/test suite theo phạm vi hiện tại.

- **2026-08-24 | Tests/API:** Smoke test login, `GET /floors`, `GET /rooms?floorId=...`, `GET /reservations` và `GET /guests`; xác nhận login `201`, floor/room API `200`, 3 floors/15 rooms và dữ liệu vận hành rỗng.

- **2026-08-24 | Tests/DevOps:** Đã chạy `pnpm lint`, `pnpm typecheck`, `pnpm build`; xác nhận login `admin`, `/auth/me`, floors/rooms/reservations rỗng và Docker Compose backend healthy.

- **2026-08-23 | Tests:** Không viết/chạy test mới, không chạy Docker; đã chạy `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm openapi:export`, health/OpenAPI smoke. Full authenticated flow chưa chạy được vì Supabase local `127.0.0.1:54321` chưa khởi động.

- **2026-08-23 | Tests:** Không chạy Docker hoặc test suite theo phạm vi; đã chạy lint/typecheck và sẽ chạy build/smoke checks sau khi hoàn tất tài liệu.

- **2026-08-23 | Tests:** Theo phạm vi đã thống nhất không chạy Docker hoặc test suite; đã chạy typecheck/build backend và kiểm tra OpenAPI generation.

- **2026-08-22 | Tests:** Chưa ghi hoặc chạy unit/integration/e2e test theo phạm vi hiện tại; chỉ giữ test configuration và scripts cho phase sau.
- **2026-08-23 | Tests:** Không viết hoặc chạy unit/integration/e2e theo yêu cầu hiện tại; đã kiểm tra tĩnh bằng `pnpm lint`, `pnpm typecheck`, `pnpm build` và smoke HTTP health/OpenAPI.
- **2026-08-23 | Tests:** Không chạy test hoặc Docker; đã chạy backend lint/typecheck/build và kiểm tra trực tiếp route health/OpenAPI trong backend process dùng cho FE integration.

### Notes

- **2026-08-22 | BE:** Giữ nguyên repository directory `be/`; Dockerfile/compose/scripts vẫn được tạo nhưng không runtime-test trong lượt này.
- **2026-08-22 | BE:** Unit/integration/e2e test files được hoãn theo phạm vi mới; test commands giữ `--passWithNoTests` để không chặn scaffold.
