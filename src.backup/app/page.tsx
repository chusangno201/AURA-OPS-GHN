import { redirect } from "next/navigation";
import { authenticated } from "@/lib/auth";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
const money = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + " đ";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    pageId?: string;
    senderId?: string;
    error?: string;
    sent?: string;

  
    created?: string;
  }>;
}) {
  const query = await searchParams;
  if (!(await authenticated())) redirect("/login");
  const [orders, messages] = await Promise.all([
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    db.message.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  const delivered = orders.filter((x) => x.status === "DELIVERED");
  return (
    <main className="shell">
      <header>
        <div>
          <div className="eyebrow">SHOP AURA L’AMOUR · NỘI BỘ</div>
          <h1>Aura Ops</h1>
          <p>Quản lý đơn Messenger · GHN · Google Sheets</p>
        </div>
        <form method="post" action="/api/auth/logout">
          <button className="secondary">Đăng xuất</button>
        </form>
      </header>
      <div className="cards">
        <div className="metric">
          <span>Tổng đơn gần nhất</span>
          <b>{orders.length}</b>
        </div>
        <div className="metric">
          <span>Đang xử lý / GHN</span>
          <b>
            {
              orders.filter((x) => x.ghnOrderCode && x.status !== "DELIVERED")
                .length
            }
          </b>
        </div>
        <div className="metric">
          <span>Đã giao</span>
          <b>{delivered.length}</b>
        </div>
        <div className="metric">
          <span>COD đơn đã giao</span>
          <b>{money(delivered.reduce((a, x) => a + x.cod, 0))}</b>
        </div>
      </div>
      <section className="panel" id="create-order">
        <div className="sectionTitle">
          <h2>Tạo đơn sau khi chốt Messenger</h2>
          <span>Chỉ gửi GHN sau khi nhân viên xác nhận</span>
        </div>
        {query.error && (
          <p style={{ color: "#bd3434" }}>
            Lỗi khi gửi GHN. Kiểm tra cấu hình token, ShopId và nội dung đơn.
            Đơn nháp vẫn được lưu.
          </p>
        )}
        <form method="post" action="/api/orders" className="orderform">
          <label>
            Họ tên khách
            <input name="customerName" required placeholder="Nguyễn Văn A" />
          </label>
          <label>
            Điện thoại
            <input name="phone" required placeholder="09..." />
          </label>
          <label className="wide">
            Địa chỉ đầy đủ
            <input
              name="address"
              required
              placeholder="Số nhà, đường, phường, tỉnh..."
            />
          </label>
          <label>
            Phường/Xã (danh mục mới GHN)
            <input name="ward" required placeholder="Phường Sài Gòn" />
          </label>
          <label>
            Tỉnh/Thành (danh mục mới GHN)
            <input name="province" required placeholder="Hồ Chí Minh" />
          </label>
          <label>
            Sản phẩm
            <input name="itemName" required placeholder="Túi Aura màu kem" />
          </label>
          <label>
            Số lượng
            <input
              name="quantity"
              type="number"
              defaultValue={1}
              min={1}
              required
            />
          </label>
          <label>
            Giá 1 sản phẩm (VND)
            <input
              name="unitPrice"
              type="number"
              defaultValue={450000}
              min={0}
            />
          </label>
          <label>
            COD cần thu (VND)
            <input
              name="cod"
              type="number"
              defaultValue={450000}
              min={0}
              required
            />
          </label>
          <label>
            Khối lượng (gram)
            <input name="weight" type="number" defaultValue={500} min={1} />
          </label>
          <label>
            Bên trả phí vận chuyển
            <select name="shippingPayer" defaultValue="1">
              <option value="1">Shop trả</option>
              <option value="2">Khách trả</option>
            </select>
          </label>
          <label>
            Dài (cm)
            <input name="length" type="number" defaultValue={25} />
          </label>
          <label>
            Rộng (cm)
            <input name="width" type="number" defaultValue={20} />
          </label>
          <label>
            Cao (cm)
            <input name="height" type="number" defaultValue={10} />
          </label>
          <label>
            Fanpage ID (tùy chọn)
            <input name="pageId" defaultValue={query.pageId || ""} />
          </label>
          <label>
            Messenger sender ID (tùy chọn)
            <input name="senderId" defaultValue={query.senderId || ""} />
          </label>
          <label className="wide">
            Ghi chú
            <input name="note" placeholder="Gọi trước khi giao" />
          </label>
          <div className="wide">
            <button type="submit" name="action" value="draft">
              + Lưu đơn nháp
            </button>{" "}
            <button
              type="submit"
              name="action"
              value="confirm"
              style={{ background: "#986b47", marginLeft: 8 }}
            >
              Xác nhận & tạo vận đơn GHN
            </button>
            <p style={{ fontSize: 12, marginTop: 8 }}>
              Chỉ bấm xác nhận khi khách đã đồng ý và thông tin đầy đủ. Nút GHN
              sẽ tạo đơn thật nếu đang dùng production.
            </p>
          </div>
        </form>
      </section>
      <section className="panel">
        <div className="sectionTitle">
          <h2>Đơn hàng</h2>
          <span>{orders.length} đơn gần nhất</span>
        </div>
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Khách</th>
                <th>Sản phẩm</th>
                <th>COD</th>
                <th>GHN</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{new Date(o.createdAt).toLocaleDateString("vi-VN")}</td>
                  <td>
                    <b>{o.customerName}</b>
                    <div className="muted">{o.phone}</div>
                  </td>
                  <td>
                    {o.itemName} × {o.quantity}
                  </td>
                  <td>{money(o.cod)}</td>
                  <td>
                    {o.ghnOrderCode || "—"}
                    <div className="muted">{o.ghnStatus || ""}</div>
                  </td>
                  <td>
                    <span className="pill">{o.status}</span>
                  </td>
                  <td>
                    <div className="actions">
                      {!o.ghnOrderCode && (
                        <form method="post" action={`/api/orders/${o.id}/ghn`}>
                          <button className="small">Tạo GHN</button>
                        </form>
                      )}
                      <form method="post" action={`/api/orders/${o.id}/sync`}>
                        <button className="small secondary">Đẩy Sheet</button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {orders.length === 0 && <p className="muted">Chưa có đơn hàng.</p>}
      </section>
      <section className="panel">
        <div className="sectionTitle">
          <h2>Tin nhắn Messenger nhận được</h2>
          <span>Chỉ xem; chưa tự suy luận chốt đơn</span>
        </div>
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Page</th>
                <th>Người gửi (PSID)</th>
                <th>Nội dung</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((m) => (
                <tr key={m.id}>
                  <td>{m.createdAt.toLocaleString("vi-VN")}</td>
                  <td>{m.pageId}</td>
                  <td>{m.senderId}</td>
                  <td>{m.text}</td>
                  <td>
                    <a
                      href={`/?pageId=${encodeURIComponent(m.pageId)}&senderId=${encodeURIComponent(m.senderId)}#create-order`}
                    >
                      Tạo đơn từ tin nhắn
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!messages.length && (
          <p className="muted">
            Chưa nhận webhook Meta. Có thể tạo đơn thủ công ngay.
          </p>
        )}
      </section>
      <footer>
        Chế độ riêng biệt — không thay đổi website bán hàng auralamour.vn.
      </footer>
    </main>
  );
}
