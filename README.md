# Aura Ops v2 — Facebook Messenger → nhân viên xác nhận → GHN → Google Sheets

**Đây là project độc lập, không thay đổi website auralamour.vn.**

## Chạy local bằng VS Code

```bash
npm install
cp .env.example .env.local # nếu chưa có; giữ lại file .env.local cũ khi nâng cấp
npx prisma format
npx prisma generate
npx prisma db push
npm run dev
```

`.env.local`: `DATABASE_URL="file:./dev.db"`. Nếu đã cấu hình SQLite ở bản v1, GIỮ NGUYÊN file `prisma/dev.db` cũ. Khi cập nhật, chỉ copy đè `src/`, `prisma/schema.prisma`, `README.md`, không copy lại .env.local hoặc database.

## Quy trình

1. Meta Developer App → Messenger → cấu hình Callback URL dạng `https://YOUR-OPS-DOMAIN/api/webhooks/meta` và Verify Token từ `.env.local`. Localhost không nhận trực tiếp webhook: cần HTTPS public URL (deploy hoặc tunnel). Thực hiện App Review/Advanced Access nếu Meta yêu cầu.
2. Khách nhắn Page → Meta gửi webhook `messages` → lưu `Message` có `pageId`, `senderId` (không thu thập số điện thoại/địa chỉ từ tin nhắn tự động).
3. Trong Aura Ops, nhân viên nhấn **Tạo đơn từ tin nhắn** → form có Page ID và Sender ID của khách. Nhân viên điền địa chỉ, hàng, COD.
4. **Lưu đơn nháp** chỉ ghi SQLite. **Xác nhận & tạo vận đơn GHN** chỉ nên bấm khi nhân viên đã đối chiếu thông tin; hệ thống ghi đơn rồi gọi GHN API, lưu `ghnOrderCode`. Nếu GHN lỗi, đơn nháp vẫn được giữ để tạo GHN sau.
5. GHN production dùng `GHN_BASE_URL=https://online-gateway.ghn.vn`; staging dùng `https://dev-online-gateway.ghn.vn`. Token/ShopId giữa hai môi trường phải phù hợp. GHN response có `data.order_code`.
6. GHN cập nhật trạng thái qua webhook và Google Sheets đồng bộ qua endpoint cron/nhấn nút thủ công như bản v1.

## An toàn

- Chỉ dùng `https://online-gateway.ghn.vn` khi đã kiểm thử staging, vì thao tác xác nhận sẽ tạo vận đơn thật.
- Không nhập token thật vào trình duyệt hay gửi token trong chat. Không commit `.env.local`/`prisma/dev.db`.
- Đây là bản MVP. Trước khi production nhiều nhân viên cần thêm xác thực phân vai, outbox/locking chống double submit, retry và idempotency chắc chắn với GHN, audit log và worker bất đồng bộ, cùng lựa chọn DB lưu bền vững trên hosting.
- SQLite trên máy Mac dùng để phát triển. Không deploy file `.db` cục bộ lên Vercel.

## Meta và GHN

- Meta Webhook callback: `/api/webhooks/meta`
- GHN Order API: `POST /shiip/public-api/v2/shipping-order/create`
- GHN callback: `/api/webhooks/ghn` (cần cấu hình custom header `x-aura-webhook-token` nếu nhà cung cấp hỗ trợ; nếu không, cần triển khai phương thức xác thực callback phù hợp trước khi bật production)

# Aura Ops — hệ thống riêng Fanpage → GHN → Google Sheets

Project độc lập, **KHÔNG** chạm mã nguồn hoặc cấu hình của `www.auralamour.vn`.

## Chức năng bản MVP
- Admin đăng nhập bằng password cấu hình; cookie HTTP-only có chữ ký HMAC.
- Nhận/sao lưu tin nhắn Messenger từ Meta webhook (`messages`); bỏ qua echo và chống trùng bằng `mid`.
- Nhân viên tự xác nhận rồi tạo đơn NHÁP qua dashboard (không tự tạo vận đơn từ mọi tin nhắn).
- Một nút `Tạo GHN` gọi Shipping Order API; dùng `client_order_code` để chống trùng khi retry.
- GHN callback cập nhật tình trạng và COD (mã hóa token custom header).
- Nút `Đẩy Sheet` và cron đồng bộ Google Sheets (upsert theo `order.id`).
- PostgreSQL lưu dữ liệu gốc; chỉ cần deploy riêng lên Vercel + Postgres bên ngoài.

## 1. Khởi tạo trên VS Code
```bash
unzip aura-ops.zip
cd aura-ops
npm install
cp .env.example .env.local
```
Sửa `.env.local`, tối thiểu cho local: `DATABASE_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET`.

```bash
npx prisma db push
npm run dev
```
Mở http://localhost:3000, nhập ADMIN_PASSWORD.

## 2. GHN
Tạo tài khoản staging tại https://developer.ghn.dev, lấy `GHN_TOKEN`, `GHN_SHOP_ID` ở cùng môi trường. Đặt `GHN_BASE_URL=https://dev-online-gateway.ghn.vn`. Bản API 2026 hỗ trợ địa chỉ 2 cấp; nhập tên phường, tỉnh theo danh mục GHN mới (đang nhập text, chưa tự chọn từ danh mục). Test thật kỹ COD/phí trả bởi shop/khách, kích thước, cân nặng. Khi go-live: chuyển production endpoint + production credentials. Không sử dụng staging token trên production.

Đăng ký GHN webhook URL `https://TEN-MIEN-RIENG/api/webhooks/ghn`, thêm Custom Header: `x-aura-webhook-token: <GHN_WEBHOOK_SECRET>` trong GHN Developer Portal. Bật event `switch_status`, `cod`, `update_fee`. Staging và prod cần cấu hình webhook riêng.

## 3. Meta Messenger
- https://developers.facebook.com/apps/: tạo Business app/use case Messenger, kết nối Facebook Page, xin các quyền cần thiết như `pages_messaging`, `pages_manage_metadata`. Điều kiện quyền thực tế tùy loại ứng dụng và Meta App Review.
- Callback URL: `https://TEN-MIEN-RIENG/api/webhooks/meta`
- Verify Token = `META_VERIFY_TOKEN`; Meta app secret = `META_APP_SECRET`.
- Subscribe page events `messages`; đảm bảo page được cấp quyền và subscription. Webhook GET xác minh challenge, POST xác minh `X-Hub-Signature-256`.
- Dashboard mới chỉ liệt kê tin nhắn; chưa có inbox trả lời, chưa tự trích xuất tên/địa chỉ từ chat. Khi tạo đơn có thể điền tùy chọn pageId và senderId. Tin nhắn của Page phải được Meta cho phép gửi/nhận theo chính sách hiện hành.

## 4. Google Sheets
- Google Cloud: enable Google Sheets API; tạo Service Account và khóa JSON.
- Tạo Google Sheet trong Google Drive, **share quyền Editor** cho email Service Account.
- Điền `GOOGLE_SHEET_ID` lấy từ URL, `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY` giữ nguyên dấu xuống dòng dưới dạng `\n`.
- Dashboard `Đẩy Sheet` để kiểm tra trước. Tab `DonHang` tự sinh; dữ liệu upsert theo ID.
- Cron `GET /api/cron/sync-sheets` dùng `Authorization: Bearer $CRON_SECRET`. Trên Vercel cài `CRON_SECRET`; lịch trong `vercel.json` chạy mỗi giờ (giới hạn/cadence phụ thuộc gói). Cron chỉ lấy tối đa 40 đơn/lần; shop có nhiều đơn cần worker/queue + pagination thực sự.

## 5. Deploy tách biệt website bán hàng
- GitHub repo mới **aura-ops**; không push vào repo website hiện có.
- Tạo Vercel Project **mới**, import repo mới.
- Set toàn bộ Environment Variables ở Vercel (Database URL phải truy cập từ Vercel).
- Chạy `npx prisma db push` với production `DATABASE_URL` trước khi phát hành; production nghiêm túc nên dùng Prisma Migrate.
- Deploy lên `aura-ops.vercel.app` hoặc subdomain **ops.auralamour.vn** (DNS tách biệt; không chỉnh DNS record `www` của site bán hàng).
- Meta/GHN webhook cần HTTPS công khai, không dùng localhost trực tiếp.

## 6. Checklist bảo mật trước khi dùng thật
- Không commit `.env.local`, không public token, không log dữ liệu cá nhân.
- Chọn ADMIN_PASSWORD và SESSION_SECRET mạnh, bật bảo mật ở Vercel/GitHub; bản MVP chỉ có **một tài khoản** quản trị, chưa có phân quyền nhiều nhân viên/CSRF nâng cao/audit log.
- Database phải backup; thông tin người mua là dữ liệu cá nhân, giới hạn truy cập và áp dụng chính sách lưu giữ/xóa phù hợp.
- Tăng độ tin cậy: queue và transaction cho webhook Meta/GHN, reconcile đơn nếu GHN tạo thành công nhưng DB lỗi, rate limit, RBAC, CSRF protection, monitoring, dead-letter queue.
- Mã nguồn minh họa làm MVP chạy thử; **chưa được kiểm thử live với GHN, Meta, hay Sheets vì chưa có credentials**.

## Tài liệu chính thức
- GHN create: https://developer.ghn.dev/vi/docs/order/create
- GHN webhook: https://developer.ghn.dev/en/docs/webhook/callback-order-status
- Meta: https://developers.facebook.com/docs/messenger-platform/webhooks
- Sheets: https://developers.google.com/workspace/sheets/api/guides/values
