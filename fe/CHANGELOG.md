# Changelog

Mọi thay đổi đáng kể phải được ghi tại mục Unreleased.

## [Unreleased]

### Added

- **2026-08-31 | FE/UI/API:** Click phòng trống mà Backend cho phép nhận khách mở modal HeroUI `Nhận khách` trực tiếp. Modal nhập `Tiền phòng / đêm` bắt buộc theo integer VND, ngày dự kiến trả tùy chọn, ghi chú và nhiều khách CCCD/hộ chiếu; không có số điện thoại, tìm khách cũ, autofill hay OCR giả. Xác nhận gọi API Backend thật và chuyển selection sang stay đang ở.

- **2026-08-29 | FE/UI/API:** Thêm layout Tầng 4 dùng rooms API thật: 4A/4B là card vận hành, còn `Sân phơi`/`Kho` là khu vực tĩnh không thể click, chọn hoặc tạo booking. Điều hướng overlay tự khóa nút tầng sau ở tầng cuối.

- **2026-08-29 | FE/UI/API:** Lịch phòng Dashboard hỗ trợ chọn ngày nhận–trả dạng dải booking. Khi chọn đủ khoảng, FE query availability thật từ Backend và form nhận phòng/đặt trước tự điền ngày nhận, dự kiến trả; không tự tạo reservation.

- **2026-08-29 | FE/UI/API:** Hiển thị ghi chú reservation từ Backend trực tiếp trên card phòng đúng ngày đang xem. Ghi chú dài giữ layout sơ đồ bằng ellipsis/tooltip, không tạo dữ liệu ghi chú riêng ở FE.

- **2026-08-27 | FE/DevOps/CI:** Thêm root GitHub Actions CI/CD cho quality gate Backend/Frontend và deploy VPS sau push `main`. Frontend production vẫn build với public origin duy nhất, không nhận Supabase/database secret; health check/rollback do script deploy thực hiện trên VPS.

- **2026-08-27 | FE/DevOps:** Bổ sung deployment production một domain qua Nginx VPS. Frontend, REST API và Socket.IO dùng cùng origin `https://sunsea.phucpink.io.vn`; không có Supabase config trong bundle.

- **2026-08-26 | FE/UI/API:** Dashboard hiển thị room type từ API thật trong intake, danh sách/chi tiết đặt trước và modal phòng tương đương. Với advance booking khi số phòng ưu tiên bận nhưng Backend còn tồn kho cùng loại, lễ tân có thể xác nhận `Giữ loại phòng, xếp phòng sau`; Frontend gửi `assignmentMode=room_type`, không mock hay tự gán phòng.

- **2026-08-26 | FE/Realtime:** Dashboard lắng nghe `reservation.no_show` từ Backend để invalidate reservation, danh sách đặt trước, detail/payment và map phòng; không dùng trạng thái local hoặc mock để giải phóng phòng.

- **2026-08-24 | FE/UI/API:** Thêm sửa trực tiếp từng dịch vụ phát sinh. Click dòng dịch vụ mở HeroUI fields tên/đơn giá/số lượng/ghi chú; click/tab rời nhóm ô gọi generated API thật, cập nhật cache và bill checkout.

- **2026-08-24 | FE/UI/API:** Thêm modal `Bill trả phòng` lấy tiền phòng, từng dịch vụ, payment/cọc và số còn lại từ Backend thật. Xác nhận bill gọi checkout API atomic; không có mock, payment giả hoặc phép tính tiền ở component.

- **2026-08-24 | FE/UI/API:** Thêm preflight phòng tương đương qua API Backend trước intake. Khi phòng ưu tiên không dùng được, UI yêu cầu lễ tân xác nhận một phòng cùng số giường/cùng thuộc tính cửa sổ trước khi tạo.
- **2026-08-24 | FE/UI:** Thêm nút `Đặt phòng mới` cho panel phòng đã chọn, cho phép chọn phòng hiện tại làm ưu tiên kể cả khi phòng đang bận/dọn.

- **2026-08-24 | FE/UI/API:** Dashboard dùng typed API `GET /rooms/status-by-date` thay cho khoảng 00:00–24:00; thêm panel `Đã dọn xong` cho phòng `cleaning`, gọi Backend rồi invalidate room/reservation query mà không reload trang.

- **2026-08-24 | FE/UI/API:** Form phòng trống cho chọn thao tác trước; nhận phòng chỉ có `Tiền phòng / đêm`, đặt trước có thêm `Tiền cọc`. Form dùng generated intake v2 contract và không có payment/mock client riêng.

- **2026-08-24 | FE/UI:** Thêm HeroUI v3 và Tailwind CSS v4 cho form phòng trống; dùng `TextField`, `Input`, `TextArea` và `Button` với label nằm trong ô theo thiết kế nhập liệu mới.

- **2026-08-24 | FE/API:** Thêm `CreateStayPanel` cho phòng trống, nhập thông tin khách trực tiếp và hai action `Nhận phòng ngay`/`Đặt phòng trước` theo policy Backend; tạo guest/reservation qua generated `POST /reservations/intake`, không mock.

- **2026-08-24 | FE/DevOps:** Bổ sung `.dockerignore` để loại `.env` và secret khỏi Docker build context khi Compose build Frontend.

- **2026-08-23 | FE/API:** Kết nối danh sách đặt trước với `GET /reservations/advance`, hiển thị badge cọc từ Backend và thêm trạng thái `advanceReservation` trong dashboard UI store.
- **2026-08-23 | FE/API:** Thêm panel chi tiết đặt trước, lịch sử thanh toán từ API, modal hủy kèm lý do và modal nhận phòng; sau check-in chuyển sang `activeStay` không reload trang.

- **2026-08-23 | FE/API:** Thêm autosave trực tiếp cho thông tin lưu trú khi blur, reservation version queue, checkout preview total và editable fields theo generated API client.

- **2026-08-23 | FE/API:** Thêm màn login username/password, auth session gate qua `/auth/me`/`/auth/refresh`, persistent-cookie UX, dashboard username/role badge và logout.

- **2026-08-22 | FE/API:** Khởi tạo Next.js App Router, typed API generation workflow, dashboard floor map và Socket.IO connection state; test implementation được để phase sau.
- **2026-08-23 | FE/API:** Sinh lại Orval client từ OpenAPI backend `/api/v1`, cập nhật room model mới và thêm generated operations cho guests/reservations/services/payments/audit.
- **2026-08-23 | FE/API:** Dựng dashboard theo mockup với calendar tháng, danh sách đặt trước, stay information, dịch vụ phát sinh, lịch sử thanh toán, thao tác xác nhận/trả phòng và realtime query invalidation.

### Changed

- **2026-08-31 | FE/Tooling/API:** Bổ sung Prettier vào dev dependency mà Orval đã cấu hình sẵn, để `pnpm api:generate` format toàn bộ client sinh tự động nhất quán và `git diff --check` sạch; không chỉnh thủ công các file generated.

- **2026-08-29 | FE/UI/API:** Danh sách `Phòng đặt trước` gọi Backend từ đầu ngày hiện tại theo `Asia/Ho_Chi_Minh` đến toàn bộ tương lai, không còn giới hạn hôm nay/ngày mai. Dashboard được bố trí trong một viewport: panel thông tin lưu trú và danh sách đặt trước cuộn nội bộ, còn sơ đồ phòng vẫn ở màn hình đầu. Bỏ heading `Sơ đồ phòng · Tầng …`; ô thang máy hiển thị trực tiếp `Tầng …` để tiết kiệm không gian.

- **2026-08-27 | FE/DevOps:** Dockerfile nhận `NEXT_PUBLIC_API_BASE_URL` và `NEXT_PUBLIC_WS_URL` ở build-time để Next.js nhúng đúng public origin production; Compose local cũng truyền hai build argument này.

- **2026-08-26 | FE/UI/API:** Room map lấy availability theo business date mới từ Backend: trạng thái dọn phòng hôm nay không làm phòng bị khóa ở ngày tương lai. Reservation chưa được gán phòng hiển thị loại phòng và số phòng ưu tiên thay vì dữ liệu giả; khi check-in Backend mới quyết định phòng ready thực tế.

- **2026-08-26 | FE/UI/API:** Khi khách còn `checked_in`, `checkout-preview` tự refetch mỗi phút để hiển thị số tiền phòng live do Backend tính; ngày dự kiến trả không được FE dùng làm mốc chốt tiền.

- **2026-08-25 | FE/API/UI:** Danh sách `Phòng đặt trước` chỉ gọi API Backend trong khoảng check-in hôm nay và ngày mai theo `Asia/Ho_Chi_Minh` (`from` 00:00 hôm nay, `to` 00:00 ngày kia); không còn hiển thị toàn bộ booking tương lai.

- **2026-08-24 | FE/API:** Generate lại client cho `PATCH /reservation-services/:serviceId` và chuẩn hóa generated `ReservationService.note` thành `string | null`; không dùng DTO/response tự định nghĩa.

- **2026-08-24 | FE/UI/API:** Chuẩn hóa autosave cho mọi ô chỉnh sửa của thông tin khách/lưu trú: click hoặc tab rời ô đều gửi PATCH thật, guest/reservation queue tuần tự theo entity và không cần Enter hay nút Lưu. Form tạo lượt mới vẫn dùng action rõ ràng để không tự tạo reservation khi đang nhập dở.

- **2026-08-24 | FE/API:** Bỏ client-side guard chặn trả phòng khi còn số dư. Sau xác nhận, Backend là nơi tính lại bill, ghi settlement và checkout; FE invalidate reservation, room, payment, dịch vụ và checkout preview.

- **2026-08-24 | FE/UI/API:** Form dịch vụ tự lưu khi lễ tân rời nhóm ô sau khi nhập đủ tên/đơn giá/số lượng; bỏ nút submit, cache list nhận service mới ngay từ response Backend và không hiển thị thông báo thành công.
- **2026-08-24 | FE/UI:** Thu gọn header, weekday, ô ngày và khoảng đệm của lịch phòng; tăng vùng cuộn `Phòng đặt trước` để ưu tiên hiển thị nhiều booking hơn trong cột trái.
- **2026-08-24 | FE/UI:** `Dự kiến trả` trong intake mặc định để trống; field vẫn nhận cả ngày và giờ, giữ nguyên giá trị khi đổi thao tác và gửi `null` để tạo stay mở.
- **2026-08-24 | FE/UI:** Form intake cho phép bỏ trống `Dự kiến trả` để tạo stay mở; detail hiển thị `Chưa xác định` khi Backend trả open-ended, còn lịch sử checkout dùng thời điểm thực tế.
- **2026-08-24 | FE/UI:** Dịch vụ phát sinh chuyển sang HeroUI fields nhập tay `Tên dịch vụ`, `Đơn giá`, `Số lượng`, `Ghi chú`; tiền VND hiển thị dấu phẩy nghìn và gửi API thật.
- **2026-08-24 | FE/UI:** Bỏ thanh chuyển tầng dưới sơ đồ; đặt nút overlay `<`/`>` ở hai mép sơ đồ, giữ disable ở tầng đầu/cuối và responsive.

- **2026-08-24 | FE/Operations:** Form intake chỉ hiện khi Backend trả phòng `available`; quyền nhận khách/đặt trước và lý do không khả dụng lấy từ `canCreateStay`, `canCreateAdvance`, `unavailableReason` thay vì suy luận UI.
- **2026-08-24 | FE/Timezone:** Chuẩn hóa key reservation, khoảng ngày và formatter lịch về `Asia/Ho_Chi_Minh`, tránh browser timezone làm booking một đêm bị hiển thị sai ngày checkout.

- **2026-08-24 | FE/UI:** Chuẩn hóa form tạo lưu trú, `Thông tin lưu trú` và `Khách đặt trước` qua shared HeroUI `HotelField`: label nằm trong ô, bo góc/border/focus nhất quán; field read-only vẫn dùng đúng visual form, còn autosave khi blur và generated API contract được giữ nguyên. Không đổi API.

- **2026-08-24 | FE/UI:** Bỏ badge chọn `Đặt phòng trước` ở đầu intake, chuyển lựa chọn/submit sang hai nút hành động cuối form; bỏ legend dài trên sơ đồ phòng và đổi typography toàn ứng dụng sang Be Vietnam Pro.

- **2026-08-24 | FE/UI:** Chuẩn hóa mọi tiền VND thành `300,000đ`; ô `Tiền phòng / đêm` và `Tiền cọc` tự thêm dấu phẩy khi nhập nhưng gửi integer VND không có dấu phân tách về Backend. Rule được ghi trong AGENTS và architecture docs.

- **2026-08-24 | FE/UI:** Bỏ dòng ngày/giờ hệ thống trong intake và bỏ selection summary `Phòng … / giường / available` dưới sơ đồ. Thông tin lưu trú đổi `Số tiền` thành `Còn phải thu` từ checkout preview balance để đã trừ cọc.

- **2026-08-24 | FE/UI:** Bỏ khối tóm tắt bốn cột phòng/trạng thái/số giường/giá phòng ở panel phòng trống; title giữ số phòng và toàn bộ field chuyển sang border/bo góc như mockup input.

- **2026-08-24 | FE/API:** Dashboard gọi `GET /reservations/intake-policy` để hiển thị nút theo ngày chọn và mốc 12:00 `Asia/Ho_Chi_Minh`; sau tạo thành công chuyển selection sang `activeStay` hoặc `advanceReservation` và invalidate dữ liệu room/reservation/guest.

- **2026-08-24 | FE/Data:** Bỏ các placeholder phòng không có trong API; floor map render 3 tầng/15 phòng từ Backend và dashboard hiển thị trạng thái rỗng cho dữ liệu vận hành chưa có.

- **2026-08-24 | FE/Config:** Tạo `.env` runtime với `NEXT_PUBLIC_API_BASE_URL` và `NEXT_PUBLIC_WS_URL` trỏ tới Backend local; không chứa Supabase key, database URL hoặc secret.

- **2026-08-23 | FE:** Floor map gọi room status theo `selectedDate`/`floorId`, giữ layout elevator và hiển thị đồng thời nền vàng, viền đỏ kép, `ĐANG CHỌN`/`ĐẶT TRƯỚC` cho reservation được chọn.
- **2026-08-23 | FE:** Realtime invalidates đúng query advance reservation, payment summary, checkout preview, reservations và rooms; không dùng mock, fixture, MSW hoặc dữ liệu hard-code trong component.

- **2026-08-23 | FE:** Bỏ nút lưu form; draft hiển thị `Xác nhận đặt phòng`, còn giá phòng/số tiền là read-only và số tiền lấy từ Backend.

- **2026-08-23 | FE:** Regenerate typed client từ OpenAPI auth contract mới; dashboard chỉ bật query nghiệp vụ sau khi xác thực và không lưu token ở phía trình duyệt.

- **2026-08-23 | FE:** Floor map hiển thị `bedCount`, trạng thái `out_of_service` và token màu theo status mới; README/architecture cập nhật API prefix và boundary.
- **2026-08-23 | FE:** Generated client được sinh lại sau khi backend bổ sung availability/health và các API nghiệp vụ; realtime floor map invalidate thêm housekeeping/no-show events.
- **2026-08-23 | FE:** Login scaffold trỏ tới email local seed `admin@sunsea.local` nhưng không nhúng mật khẩu mặc định.
- **2026-08-23 | FE:** Sơ đồ phòng chuyển sang layout CSS/data thật: phòng 105 dạng dọc, phòng 104/103/102 hàng trên, thang máy bên trái phòng 101, phòng 101 dạng ngang và design token trạng thái theo mockup.

### Fixed

- **2026-08-29 | FE/Auth:** Sửa login thành công nhưng Dashboard tự quay lại `/login` khi TanStack Query đang giữ cache `/auth/me = null`. Login giờ dùng user do Backend trả về để cập nhật cache session trước khi điều hướng; không lưu token ở Frontend và không thay đổi API.

- **2026-08-27 | FE/DevOps/CI:** Sửa pipeline production để runner non-root chỉ trust và chạy Compose từ worktree `/opt/sunsea` trước khi pull/build Frontend; deploy không cần quyền root hoặc secret GitHub.

- **2026-08-26 | FE/UI/API:** Sửa selection đặt trước bị `setSelectedDate` xóa sau khi click card, khiến reservation `draft`/`confirmed` hiển thị nhầm panel lưu trú và mất nút `Hủy đặt phòng`. Dashboard giờ lấy `reservation.status` từ Backend làm nguồn quyết định panel; click map cũng mở đúng panel đặt trước.

- **2026-08-26 | FE/UI:** Bỏ hướng dẫn thừa dưới field `Dự kiến trả (tùy chọn)` và thu gọn `Ghi chú` của intake thành HeroUI single-line field, tránh kéo dài form đặt phòng/nhận phòng.

- **2026-08-26 | FE/UI/API:** Sửa lỗi phòng có khách `checked_in` nhưng đã quá ngày dự kiến trả bị hiển thị là trống. Khi chọn ngày sau ngày dự kiến trả, dashboard vẫn chọn đúng stay đang hoạt động, nhận trạng thái `occupied` từ Backend và chỉ có thể đề xuất phòng tương đương cho booking mới.

- **2026-08-24 | FE/UI:** Loại bỏ dấu required trùng do HeroUI và label cùng render `*`; không còn hiển thị “Chưa có dịch vụ” khi form dịch vụ đang có dữ liệu chưa rời ô.
- **2026-08-24 | FE/UI:** Ẩn hoàn toàn khu `Dịch vụ phát sinh` và ngừng query dịch vụ khi khách chưa nhận phòng; sửa CSS grid form dịch vụ để không override cấu trúc HeroUI field hay làm vỡ chiều cao ô.
- **2026-08-24 | FE/UI:** Xóa action message cũ khi đổi selection để không còn hiển thị “Đã nhận phòng thành công” cạnh form đặt trước; mode và nút `Đặt phòng trước` chuyển sang nền vàng reserved.

- **2026-08-24 | FE/DevOps:** Cấu hình pnpm build permissions cho `esbuild`, `sharp` và `unrs-resolver` để Docker build Next.js không bị chặn bởi `ERR_PNPM_IGNORED_BUILDS`.
- **2026-08-24 | FE/DevOps:** Không copy `next.config.ts` vào production runtime image để `next start` không tự cài development dependencies khi container khởi động.

- **2026-08-23 | FE:** Chuẩn hóa hiển thị và chuyển đổi datetime-local theo timezone `Asia/Ho_Chi_Minh` trước khi gửi reservation autosave.

### Database

- **2026-08-23 | Database:** Không chứa database code; FE dùng migration/seed thuộc BE, trong đó `0004_advance_reservation_operations.sql` là migration liên quan.

- **2026-08-22 | Database:** Không chứa database code; schema thuộc backend.

### API

- **2026-08-31 | FE/API:** Regenerate Orval client từ OpenAPI Backend cho `POST /api/v1/reservations/check-in`, các generated DTO `CheckInRoomDto`/guest/document và response đa khách; không chỉnh file generated thủ công.

- **2026-08-26 | FE/API:** Đã regenerate Orval client từ OpenAPI Backend cho `assignmentMode`, `roomTypeId`/`roomTypeName`, capacity room type và nullable physical room assignment. Không sửa file generated thủ công.

- **2026-08-26 | FE/API:** Đã regenerate Orval client từ Swagger Backend sau khi bỏ operation no-show thủ công; Frontend không gọi endpoint này.

- **2026-08-24 | FE/API:** Regenerate Orval client từ OpenAPI Backend cho `GET /rooms/:roomId/equivalents`, `hasWindow`, checkout nullable và metadata open stay. Không chỉnh generated client thủ công.

- **2026-08-24 | FE/API:** Regenerate Orval client từ Swagger Backend cho `GET /api/v1/rooms/status-by-date`, fields operational availability và `PATCH /api/v1/rooms/:roomId/housekeeping`; không chỉnh file generated thủ công.

- **2026-08-24 | FE/API:** Regenerate Orval client từ OpenAPI intake v2 với `roomRatePerNight` và `depositAmount`; không chỉnh generated model thủ công.

- **2026-08-24 | FE/API:** Regenerate Orval client cho `CreateStayDto`, nested guest payload, intake policy và create-stay response từ OpenAPI Backend; cập nhật `orval.config.ts` hỗ trợ `OPENAPI_URL` khi generate từ backend khác port.

- **2026-08-24 | FE/API:** Regenerate Orval client after Backend login contract changed to accept the seed password length (`minLength: 6`).

- **2026-08-23 | FE/API:** Regenerate Orval client từ OpenAPI với advance list/detail, check-in/cancel và room `reservationId`/`updatedAt`; không chỉnh DTO generated thủ công.

- **2026-08-23 | FE/API:** Regenerate client cho `PATCH /guests/:guestId`, `PATCH /reservations/:reservationId` và dùng `GET /reservations/:reservationId/checkout-preview` cho tổng tiền.

- **2026-08-23 | FE/API:** Cập nhật generated auth DTO/client cho username login và response user `id/username/role/active`; logout/refresh sử dụng credentials cookie.

- **2026-08-22 | API:** FE lấy contract từ backend `/openapi.json` thông qua `pnpm api:generate`.
- **2026-08-23 | API:** API client generated gọi các route `/api/v1` và chỉ dùng `NEXT_PUBLIC_API_BASE_URL` origin; request vẫn đi qua `apiFetch` với HttpOnly cookie credentials.
- **2026-08-23 | FE/API:** Generated model được sinh lại sau lần chuẩn hóa OpenAPI room-rate metadata.
- **2026-08-23 | FE/API:** Regenerate client sau khi backend bổ sung list reservation services và checkout-preview schema riêng.

### Tests

- **2026-08-31 | Tests/FE/UI/API/Docker:** Đã chạy `pnpm api:generate`, `pnpm lint`, `pnpm typecheck` và `pnpm build` thành công. Docker local rebuild; Backend healthy, `/login` HTTP 200. Kiểm tra browser local với Backend thật: login `admin`, click phòng trống mở modal `Nhận khách` cùng giá/đêm, CCCD/hộ chiếu và đa khách; passport hiển thị `Quốc tịch` thay `Ngày cấp`; không xác nhận nên không tạo dữ liệu vận hành. Không thêm/chạy test suite mới theo phạm vi.

- **2026-08-29 | Tests/FE/UI/Docker:** Đã chạy `pnpm lint`, `pnpm typecheck` và `pnpm build` thành công. Docker Compose local rebuild thành công; `/login` trả HTTP `200`. Không thêm test suite mới.

- **2026-08-29 | Tests/FE/UI/API/Docker:** Đã chạy `OPENAPI_URL=../be/openapi.json pnpm api:generate`, `pnpm lint`, `pnpm typecheck` và `pnpm build` thành công cho chọn dải ngày Dashboard; Docker Compose local rebuild thành công, `/login` phản hồi HTTP `200`. Không thêm hoặc thay đổi test suite; không push, CI/CD hoặc deploy VPS.

- **2026-08-29 | Tests/FE/UI/Docker:** Đã chạy `pnpm lint`, `pnpm typecheck`, `pnpm build` thành công và rebuild local Docker Compose. Không push hoặc deploy VPS theo yêu cầu; không thêm hoặc thay đổi test suite.

- **2026-08-29 | Tests/FE/UI/API:** Đã chạy `pnpm lint`, `pnpm typecheck` và `pnpm build` thành công. Không thêm hoặc thay đổi test suite theo phạm vi.

- **2026-08-26 | Tests/FE/API/UI/DevOps:** Đã chạy `pnpm api:generate`, `pnpm lint`, `pnpm typecheck`, `pnpm build` thành công. Docker Compose rebuild và Frontend `/login` phản hồi HTTP `200`; kiểm tra runtime không có session chuyển `/dashboard` về `/login`. Không thêm hoặc thay đổi test suite theo phạm vi.

- **2026-08-26 | Tests/FE/UI/DevOps:** Đã chạy `pnpm lint`, `pnpm typecheck`, `pnpm build` thành công. Docker Compose đã rebuild Frontend; Backend healthy và Frontend `http://localhost:3000/login` phản hồi HTTP `200`. Không tạo hoặc sửa test suite.

- **2026-08-26 | Tests/FE/API/DevOps:** Đã chạy `pnpm api:generate`, `pnpm lint`, `pnpm typecheck`, `pnpm build`; Docker Frontend rebuild thành công và `/login` phản hồi `200`. Không thêm/chạy test suite mới theo phạm vi.

- **2026-08-26 | Tests/FE/API/DevOps:** Đã chạy `pnpm lint`, `pnpm typecheck`, `pnpm build`; Docker Frontend rebuild thành công và `/login` phản hồi HTTP `200`. REST smoke Backend thật xác nhận checkout preview room 105 trả 2 đêm và số dư `830,000đ`; UI nhận giá trị này qua query cache, không tự cộng tiền. Không tạo/chạy test mới.

- **2026-08-26 | Tests/FE/UI:** Đã chạy `pnpm lint`, `pnpm typecheck` và `pnpm build` thành công sau khi thu gọn form intake. Không tạo/chạy test mới.

- **2026-08-26 | Tests/FE/UI/API/DevOps:** Đã chạy `pnpm lint`, `pnpm typecheck`, `pnpm build`; Docker Frontend rebuild thành công và `/login` phản hồi HTTP `200`. REST smoke qua Backend thật xác nhận source trạng thái của room 105 là `occupied`; browser không có session hiện hữu nên dừng ở login, không tự nhập thông tin xác thực. Không tạo/chạy test mới.

- **2026-08-25 | Tests/FE/API:** Đã chạy `pnpm lint`, `pnpm typecheck` và `pnpm build` sau khi giới hạn hàng đợi đặt trước theo hai ngày vận hành. Không tạo/chạy test mới theo phạm vi.

- **2026-08-24 | Tests/FE/API/DevOps:** Đã chạy `pnpm api:generate`, `pnpm lint`, `pnpm typecheck` và `pnpm build` sau luồng sửa dịch vụ qua API thật; Docker Frontend rebuild và `/login` phản hồi HTTP `200`. Không tạo/chạy test mới theo phạm vi.

- **2026-08-24 | Tests/FE/UI/API/DevOps:** Đã chạy `pnpm lint`, `pnpm typecheck` và `pnpm build` sau khi chuẩn hóa autosave toàn bộ field đã tồn tại; Frontend Docker image rebuild và `/login` phản hồi HTTP `200`. Không tạo/chạy test mới theo phạm vi.

- **2026-08-24 | Tests/FE/API/DevOps:** Đã chạy `pnpm api:generate`, `pnpm lint`, `pnpm typecheck` và `pnpm build` thành công cho checkout bill. Docker Compose rebuild và Frontend `/login` phản hồi HTTP `200`. Không tạo/chạy test mới theo phạm vi.

- **2026-08-24 | Tests/FE/UI/API:** Đã chạy `pnpm lint`, `pnpm typecheck` và `pnpm build` thành công sau khi tự lưu dịch vụ qua API/cache và sửa required indicator. Không tạo test mới.
- **2026-08-24 | Tests/FE/UI:** Đã chạy `pnpm lint`, `pnpm typecheck` và `pnpm build` thành công sau khi thu gọn lịch phòng và mở rộng vùng danh sách đặt trước. Không tạo test mới.
- **2026-08-24 | Tests/FE/UI:** Đã chạy `pnpm lint`, `pnpm typecheck` và `pnpm build` thành công sau khi ẩn dịch vụ cho đặt trước và sửa layout HeroUI service form. Không tạo test mới.
- **2026-08-24 | Tests/FE/UI:** Đã chạy lại tuần tự `pnpm lint`, `pnpm build`, rồi `pnpm typecheck` sau khi để mặc định trường `Dự kiến trả` rỗng; tất cả thành công. Không tạo test mới.
- **2026-08-24 | FE:** Đã chạy `pnpm api:generate`, `pnpm lint`, `pnpm typecheck` và `pnpm build` thành công sau luồng stay mở, tìm phòng tương đương, dịch vụ nhập tay và điều hướng tầng overlay. Không thêm test mới theo phạm vi.

- **2026-08-24 | Tests/FE/UI:** Đã chạy `pnpm api:generate`, `pnpm lint`, `pnpm typecheck`, `pnpm build`; Docker Compose rebuild image production và Frontend `/login` phản hồi HTTP 200 cùng Backend healthy. Không thêm/chạy unit, integration hoặc E2E test mới.

- **2026-08-24 | Tests/UI:** Đã chạy `pnpm lint`, `pnpm typecheck`, `pnpm build`; Docker Compose rebuild thành công, Backend healthy và Frontend phản hồi HTTP `200` tại `/login`. Không tạo test mới.

- **2026-08-24 | Tests/UI:** Đã chạy `pnpm lint`, `pnpm typecheck`, `pnpm build`; Docker Compose rebuild thành công với Be Vietnam Pro, Backend healthy và Frontend phản hồi HTTP `200` tại `/login`. Không tạo test mới.

- **2026-08-24 | Tests/UI:** Đã chạy `pnpm lint`, `pnpm typecheck`, `pnpm build`; Docker Compose rebuild thành công, Backend healthy và Frontend phản hồi HTTP `200` tại `/login` sau khi sửa action message/nút đặt trước. Không tạo test mới.

- **2026-08-24 | Tests/UI:** Đã chạy `pnpm lint`, `pnpm typecheck`, `pnpm build`; Docker Compose rebuild thành công và Frontend phản hồi HTTP `200` tại `/login`. Không tạo test mới.

- **2026-08-24 | Tests/UI/API:** Đã chạy `pnpm api:generate` từ OpenAPI Backend runtime, `pnpm lint`, `pnpm typecheck`, `pnpm build`; Docker Frontend phản hồi `200` tại `/login`. Không tạo/chạy unit, integration hoặc E2E test mới.

- **2026-08-24 | Tests/UI:** Đã chạy `pnpm lint`, `pnpm typecheck`, `pnpm build` sau khi cấu hình HeroUI/Tailwind; Docker Compose đã rebuild và chạy Backend healthy (`:3001`) cùng Frontend HTTP 200 (`:3000/login`). Không tạo test mới.

- **2026-08-24 | Tests/API:** Đã chạy `pnpm api:generate`, `pnpm typecheck`, `pnpm lint`, `pnpm build`; backend smoke test policy hôm nay/ngày tương lai thành công. Không viết unit/integration/e2e mới và không chạy Docker theo phạm vi hiện tại.

- **2026-08-24 | Tests/DevOps:** Đã chạy `pnpm lint`, `pnpm typecheck`, `pnpm build`; Docker Compose FE khởi động thành công và dashboard build với empty state từ API thật.

- **2026-08-23 | Tests:** Không viết/chạy test mới hoặc Docker; đã chạy `pnpm api:generate`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, health/OpenAPI smoke và browser runtime screenshot 1536×1024 tại `docs/login-runtime-1536x1024.jpg`. Chưa kiểm tra authenticated dashboard flow vì Supabase local chưa chạy.

- **2026-08-23 | Tests:** Không chạy Docker hoặc test suite theo phạm vi; đã chạy lint/typecheck và sẽ chạy build/smoke checks sau khi hoàn tất autosave.

- **2026-08-23 | Tests:** Theo phạm vi đã thống nhất không chạy Docker hoặc test suite; đã chạy lint/typecheck FE và sẽ kiểm tra build sau khi hoàn tất thay đổi tài liệu/auth.

- **2026-08-22 | Tests:** Chưa ghi hoặc chạy unit/e2e test theo phạm vi hiện tại; chỉ giữ test configuration và scripts cho phase sau.
- **2026-08-23 | Tests:** Không viết hoặc chạy test theo yêu cầu hiện tại; đã chạy `pnpm lint`, `pnpm typecheck` và `pnpm build`.
- **2026-08-23 | Tests:** Không viết/chạy unit, integration, e2e hoặc Docker; đã chạy FE lint/typecheck/build và kiểm tra browser local viewport 1536×1024, click ngày lịch, chuyển tháng và ảnh dashboard.

### Notes

- **2026-08-22 | FE:** Generated client đã được sinh từ backend `/openapi.json`; frontend không chứa Supabase client hoặc database credentials.
- **2026-08-22 | FE:** Test files được hoãn theo phạm vi mới; Vitest/Playwright configuration vẫn giữ cho phase sau.
