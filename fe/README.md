# SUNSEA Frontend

Next.js App Router frontend cho SUNSEA.

## Local setup

```bash
cp .env.example .env.local
pnpm install
pnpm api:generate
pnpm dev
```

Mở `http://localhost:3000`. Backend phải chạy tại `NEXT_PUBLIC_API_BASE_URL`. FE chỉ giữ origin API/WS; các path `/api/v1` được sinh từ OpenAPI của backend. User local do seed Supabase cung cấp.

Màn `/login` chỉ có `Tên đăng nhập`, `Mật khẩu` và nút đăng nhập. Dùng username `admin` và password `123456` trong seed hiện tại. Sau khi đăng nhập thành công, Backend trả session bằng HttpOnly cookie và FE chuyển tới `/dashboard`; username và role `OWNER`/`STAFF` được lấy từ `/api/v1/auth/me`. Không có registration, quên mật khẩu hoặc chọn role trên FE.

Dashboard không chứa dữ liệu vận hành mẫu. Floors và rooms master được lấy từ Backend API để dựng sơ đồ; guests, reservations, services và payments đều bắt đầu rỗng và phải được tạo qua Backend API. Khi một API trả danh sách rỗng, FE hiển thị trạng thái rỗng thay vì dựng dữ liệu giả.

Session được giữ qua reload và đóng/mở lại trình duyệt khi refresh cookie còn hợp lệ. FE không lưu token trong localStorage, sessionStorage hoặc Zustand. Logout gọi Backend để xóa cookie, clear query cache và chuyển về `/login`.

Trong khối `Thông tin lưu trú`, các ô tên khách, CCCD, ngày sinh, ngày cấp CCCD, ngày nhận, ngày trả, địa chỉ và ghi chú là editable. FE tự gửi PATCH khi rời ô, không cần nút lưu. Reservation patch gửi `version` và được xếp hàng tuần tự; conflict giữa nhiều máy sẽ refetch dữ liệu mới. `Giá phòng` là read-only snapshot; `Còn phải thu` lấy từ `checkout-preview.balance` của Backend nên đã tự trừ payment cọc. Trong khi khách `checked_in`, query này tự refetch mỗi phút để nhận tiền phòng live từ Backend sau mốc tính đêm 17:00, không có phép tính tiền phía client. Nút `Xác nhận đặt phòng` chỉ còn dùng để chuyển draft sang confirmed. Nút `Trả phòng` mở bill từ `checkout-preview` và các dịch vụ/payment thật; xác nhận gọi một API Backend atomic để ghi nhận số còn lại, checkout và chuyển phòng sang dọn. FE không tự cộng/trừ hay tự tạo payment.

Thứ tự local đầy đủ: khởi động Supabase và backend theo README của `be/`, chạy `pnpm openapi:export` trong `be/`, sau đó chạy `pnpm api:generate` tại đây. FE không gọi Supabase Auth/Database/Realtime trực tiếp.

## Commands

```bash
pnpm lint
pnpm typecheck
pnpm api:generate
pnpm api:check
pnpm build
```

Test configuration được giữ sẵn cho phase sau; thay đổi intake v2 không thêm test suite mới. Frontend chạy cùng Backend qua Docker Compose của repository `be/` khi cần.

## Production một domain

Production dùng `https://sunsea.phucpink.io.vn` cho cả UI, REST API và Socket.IO. Nginx trên VPS reverse-proxy `/api/*` và `/socket.io/*` vào NestJS, còn các route khác vào Next.js. `NEXT_PUBLIC_API_BASE_URL` và `NEXT_PUBLIC_WS_URL` vì vậy cùng là origin này; chúng được truyền vào **lúc Docker build**, vì Next.js public environment được nhúng vào client bundle.

Không tạo `.env` trong Frontend. File environment production duy nhất nằm trên VPS (`/opt/sunsea/.env`), bị Git ignore và chứa public origin cùng backend/Supabase secrets cần thiết cho Compose.

Mỗi push vào `main` phải qua quality gate Frontend (lint, typecheck, unit test hiện có và build) trước khi runner production triển khai. CI/CD không truyền Supabase hay database secret vào Frontend; production luôn dùng environment file chỉ có trên VPS.

## Boundary

Frontend chỉ gọi REST API và Socket.IO từ backend. Không cài hoặc import `@supabase/supabase-js`, không chứa database URL/service-role key.

## Environment

Chỉ khai báo:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

`src/lib/api/generated` là generated-only; không sửa DTO thủ công. Dashboard hiện gọi floors, rooms theo ngày, reservations/advance detail, guests, service catalog, reservation services và payments qua API backend thật; thao tác thêm/sửa dịch vụ, xác nhận draft, hủy đặt phòng, nhận phòng và trả phòng đi qua feature hooks dùng generated client. Click một dịch vụ đang có để sửa tên, đơn giá, số lượng hoặc ghi chú; rời nhóm ô sẽ tự lưu qua Backend, rồi cập nhật tổng tiền/bill thật.

Giao diện dashboard đã được đối chiếu trực quan ở viewport 1536×1024 theo mockup: lịch tháng 7 cột, danh sách phòng đặt trước, thông tin lưu trú, khu dịch vụ/thanh toán, sơ đồ phòng với thang máy bên trái phòng 101, màu trạng thái và viền đỏ kép khi chọn. Khi Supabase/session chưa sẵn sàng, UI hiển thị trạng thái API và giữ cấu trúc layout thay vì thay bằng dữ liệu giả.

Khi click phòng có trạng thái `Trống`, dashboard hiển thị form `Thông tin phòng` ngay tại panel bên phải. Lễ tân chọn thao tác trước: `Nhận phòng ngay` chỉ có `Tiền phòng / đêm`, còn `Đặt phòng trước` có thêm `Tiền cọc`. Giá/đêm được prefill từ phòng nếu có và luôn gửi về Backend để lưu snapshot reservation; cọc lớn hơn 0 được Backend ghi thành payment thật. FE lấy action policy từ Backend: trước 12:00 hôm nay có thể chuyển giữa hai thao tác, từ 12:00 hôm nay chỉ có `Nhận phòng ngay`, còn ngày tương lai mặc định `Đặt phòng trước`. Submit gọi `POST /api/v1/reservations/intake`; không gọi riêng guest API và không tạo dữ liệu mock. Sau thành công, `check_in` chuyển selection sang `activeStay`, còn `advance` chuyển sang `advanceReservation`.

Trạng thái sơ đồ được lấy bằng `GET /api/v1/rooms/status-by-date?floorId=&date=YYYY-MM-DD`, không còn được FE suy luận bằng khoảng 00:00–24:00 theo timezone của trình duyệt. Sau checkout, backend trả phòng `cleaning`; panel bên phải chỉ hiển thị HeroUI button `Đã dọn xong`. Nút này gọi `PATCH /api/v1/rooms/:roomId/housekeeping` với trạng thái `ready`, sau đó refetch dữ liệu thật để mở form phòng trống cùng ngày. Khả năng tạo lượt mới và lý do bị khóa luôn lấy từ `canCreateStay`, `canCreateAdvance`, `unavailableReason` của Backend.

Form phòng trống dùng HeroUI v3 (`TextField`, `Input`, `TextArea`, `Button`) và Tailwind CSS v4. Nhãn field hiển thị trong ô theo style input có border/bo góc; không còn khối tóm tắt bốn cột phòng/trạng thái/số giường/giá phòng.

Danh sách `Phòng đặt trước` dùng API Backend thật và chỉ nhận reservation còn hiệu lực. Khi chọn một dòng hoặc phòng trên sơ đồ, Zustand chỉ giữ selection UI (`room`, `advanceReservation`, `activeStay`), còn detail/payment/room status vẫn do TanStack Query lấy từ Backend. Dashboard luôn quyết định panel theo `reservation.status` trả về: `draft`/`confirmed` luôn hiển thị panel advance có `Hủy đặt phòng`, còn `checked_in` mới hiển thị panel lưu trú. Panel advance hiển thị deposit summary, remaining amount, payment history, cancel-with-reason và check-in; check-in thành công chuyển sang panel lưu trú, không reload toàn trang. FE không cộng payment, không suy đoán `canCheckIn`, không dùng mock/fixture/MSW.

Đặt trước `confirmed` được Backend tự chuyển sang `no_show` lúc 12:00 ngày hôm sau ngày nhận theo `Asia/Ho_Chi_Minh`. Khi nhận Socket.IO event, FE invalidate danh sách đặt trước, detail reservation và status phòng; booking biến khỏi hàng đợi hiện hành mà không reload. Tiền cọc không được FE tự hoàn/chuyển sang lượt mới. Khách đến muộn được tạo lượt mới, còn cọc của booking no-show được xử lý thủ công tại lịch sử thanh toán Backend.

Từ bất kỳ panel phòng đã chọn, nút `Đặt phòng mới` mở intake với phòng đó là ưu tiên, kể cả phòng đang có khách hoặc đang dọn. Trước submit, FE gọi API Backend tìm phòng cùng đúng số giường/cửa sổ. Nếu số phòng ưu tiên không dùng được nhưng Backend còn inventory loại phòng, đặt trước có lựa chọn **Giữ loại phòng, xếp phòng sau**; UI chỉ gửi `assignmentMode=room_type` và hiển thị loại phòng/số phòng ưu tiên, còn Backend gán phòng ready khi check-in. Nhận phòng ngay vẫn bắt buộc có số phòng ready thực tế. Vì vậy trạng thái dọn phòng hiện tại không khóa vô lý các booking ở ngày tương lai. `Dự kiến trả` mặc định để trống để tạo stay mở; lễ tân chỉ chọn ngày và giờ khi khách đã biết lịch trả. Khi khách vẫn `checked_in`, ngày này chỉ là kế hoạch và không làm dừng tiền phòng live. Stay mở hiển thị `Chưa xác định` cho ngày trả dự kiến; số đêm và tiền live do Backend trả. Khu dịch vụ phát sinh chỉ xuất hiện sau khi khách đã nhận phòng. Lễ tân nhập Tên dịch vụ, Đơn giá, Số lượng và Ghi chú; khi rời nhóm ô và đủ trường bắt buộc, FE gọi API thật để lưu ngay, cập nhật list cache tức thời và không hiển thị toast thành công. Nút chuyển tầng nằm overlay ở hai mép sơ đồ, không còn thanh điều hướng phía dưới.
