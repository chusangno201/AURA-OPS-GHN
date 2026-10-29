import MobileOrders from "@/components/MobileOrders";
import { parseCheckout } from "@/lib/checkout-text";
import { redirect } from "next/navigation";
import { authenticated } from "@/lib/auth";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
const money = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + " đ";

function formatMessengerText(text: string) {
  return text.replace(
    /\s+(?=(?:Họ\s*tên|SĐT|Địa\s*chỉ|Phường\s*\/\s*Xã|Tỉnh\s*\/\s*TP|Sản\s*phẩm|Số\s*lượng|Đơn\s*giá|Phí\s*ship|Ghi\s*chú\s*khách|Ghi\s*chú)\s*[:：])/gi,
    "\n"
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    pageId?: string;
    messageId?: string;
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
  const selected = query.messageId
    ? await db.message.findUnique({
        where: { id: query.messageId },
      })
    : messages.find(m =>
        m.isEcho &&
        m.pageId === query.pageId &&
        m.senderId === query.senderId &&
        Boolean(parseCheckout(m.text))
      );

  const prefill = selected
    ? parseCheckout(selected.text)
    : null;

  const createdMessageIds = new Set<string>();

  for (const order of orders) {
    const message = messages.find(m => {
      if (createdMessageIds.has(m.id) || !m.isEcho) return false;
      if (m.pageId !== order.pageId || m.senderId !== order.senderId) return false;
      if (order.createdAt < m.createdAt) return false;

      const data = parseCheckout(m.text);
      return Boolean(
        data &&
        data.customerName === order.customerName &&
        data.phone === order.phone &&
        data.itemName === order.itemName &&
        data.quantity === order.quantity &&
        data.unitPrice === order.unitPrice
      );
    });
    if (message) createdMessageIds.add(message.id);
  }

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
        {query.messageId && !prefill && (
          <p style={{ color: "#bd3434" }}>
            Không tự điền được: tin nhắn chưa tìm thấy hoặc
            thiếu thông tin chốt đơn đúng định dạng.
            Kiểm tra nội dung tin Messenger trước khi lưu.
          </p>
        )}
        <form key={query.messageId ?? "new"} method="post" action="/api/orders" className="orderform">
          <label>
            Họ tên khách
            <input name="customerName" defaultValue={prefill?.customerName ?? ""} required placeholder="Nguyễn Văn A" />
          </label>
          <label>
            Điện thoại
            <input name="phone" defaultValue={prefill?.phone ?? ""} required placeholder="09..." />
          </label>
          <label className="wide">
            Địa chỉ đầy đủ
            <input
              name="address" defaultValue={prefill?.address ?? ""}
              required
              placeholder="Số nhà, đường, phường, tỉnh..."
            />
          </label>
          <label>
            Phường/Xã (danh mục mới GHN)
            <input
              name="ward"
              defaultValue={prefill?.ward ?? ""}
              required
              placeholder="Nhập phường/xã chính xác trước khi tạo GHN"
            />
          </label>
          <label>
            Tỉnh/Thành (danh mục mới GHN)
            <input name="province" defaultValue={prefill?.province ?? ""} required placeholder="Hồ Chí Minh" />
          </label>
          <label>
            Sản phẩm
            <input name="itemName" defaultValue={prefill?.itemName ?? ""} required placeholder="Túi Aura màu kem" />
          </label>
          <label>
            Số lượng
            <input
              name="quantity"
              type="number"
              defaultValue={prefill?.quantity ?? 1}
              min={1}
              required
            />
          </label>
          <label>
            Giá 1 sản phẩm (VND)
            <input
              name="unitPrice"
              type="number"
              defaultValue={prefill?.unitPrice ?? ""}
              min={0}
            />
          </label>
          <input type="hidden" name="cod" value="0" />
          <input type="hidden" name="weight" value="500" />
          <label>
            Bên trả phí vận chuyển
            <select name="shippingPayer" defaultValue={prefill?.shippingPayer ?? "1"}>
              <option value="1">Shop trả</option>
              <option value="2">Khách trả</option>
            </select>
          </label>
          
          <input type="hidden" name="length" value="25" />
          <input type="hidden" name="width" value="20" />
          <input type="hidden" name="height" value="10" />
          <input type="hidden" name="pageId" value={query.pageId ?? selected?.pageId ?? ""} />
          <input type="hidden" name="senderId" value={query.senderId ?? selected?.senderId ?? ""} />
          <label className="wide">
            Ghi chú
            <input name="note" defaultValue={prefill?.note ?? ""} placeholder="Gọi trước khi giao" />
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
      <section className="panel aura-orders-section">
        <div className="sectionTitle">
          <h2>Đơn hàng</h2>
          <span>{orders.length} đơn gần nhất</span>
        </div>
        
        <MobileOrders orders={orders.map(o => ({
          id: o.id,
          customerName: o.customerName,
          phone: o.phone,
          itemName: o.itemName,
          quantity: o.quantity,
          date: o.createdAt.toLocaleDateString("vi-VN"),
          status: o.status,
          cod: o.cod,
          address: o.address,
          ward: o.ward,
          province: o.province,
          ghnOrderCode: o.ghnOrderCode,
          note: o.note
        }))} />
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
      <section className="panel messages-section">
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
                  <td className="msg-text-col">
                    <details className="msg-details">
                      <summary>
                        {formatMessengerText(m.text)
                          .split("\n")
                          .filter(Boolean)
                          .slice(0, 2)
                          .join(" · ") || "Xem nội dung"}
                      </summary>
                      <div className="msg-full-text">
                        {formatMessengerText(m.text)}
                      </div>
                    </details>
                  </td>
                  <td>
                    <a
                      href={`/?messageId=${encodeURIComponent(m.id)}&pageId=${encodeURIComponent(m.pageId)}&senderId=${encodeURIComponent(m.senderId)}#create-order`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        padding: "11px 17px",
                        borderRadius: 12,
                        fontWeight: 700,
                        fontSize: 13,
                        textDecoration: "none",
                        whiteSpace: "nowrap",
                        background: createdMessageIds.has(m.id) ? "#e0f3e9" : "#f2e4d6",
                        color: createdMessageIds.has(m.id) ? "#176a43" : "#86552e",
                        border: createdMessageIds.has(m.id)
                          ? "1px solid #a7dcc0"
                          : "1px solid #e7ccb5",
                      }}
                    >
                      {createdMessageIds.has(m.id) ? "✓ Đã tạo đơn" : "+ Tạo đơn"}
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
    
      <style>{`
        .aura-mobile-order-list { display: none; }
        @media (max-width: 768px) {
          .aura-orders-section .scroll { display: none; }
          .aura-orders-section:has(.aura-mobile-all-actions[open]) .scroll {
            display: block;
            overflow-x: auto;
          }
          .aura-mobile-order-list {
            display: grid;
            gap: 10px;
            margin-top: 15px;
          }
          .aura-mobile-order {
            background: #fff;
            border: 1px solid #e8e0d9;
            border-radius: 14px;
            overflow: hidden;
          }
          .aura-mobile-order summary {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
            padding: 14px;
            cursor: pointer;
            list-style: none;
          }
          .aura-mobile-order summary::-webkit-details-marker {
            display: none;
          }
          .aura-order-main { display: grid; gap: 5px; min-width: 0; }
          .aura-order-main strong { font-size: 15px; }
          .aura-order-main small {
            color: #777;
            font-size: 12px;
            overflow-wrap: anywhere;
          }
          .aura-order-status {
            width: fit-content;
            font-size: 11px;
            background: #f2eee9;
            color: #795a43;
            padding: 4px 8px;
            border-radius: 20px;
          }
          .aura-order-expand {
            color: #926b4e;
            font-size: 12px;
            white-space: nowrap;
          }
          .aura-mobile-order[open] .aura-order-expand {
            font-size: 0;
          }
          .aura-mobile-order[open] .aura-order-expand::after {
            content: "Thu gọn ▲";
            font-size: 12px;
          }
          .aura-order-extra {
            border-top: 1px solid #eee;
            padding: 12px 14px;
            display: grid;
            gap: 12px;
          }
          .aura-order-extra > div {
            display: flex;
            justify-content: space-between;
            gap: 15px;
            font-size: 13px;
          }
          .aura-order-extra span { color: #888; flex-shrink: 0; }
          .aura-order-extra strong {
            text-align: right;
            font-weight: 600;
            overflow-wrap: anywhere;
          }
          .aura-mobile-all-actions {
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 12px;
            font-size: 13px;
          }
          .aura-mobile-all-actions summary {
            cursor: pointer;
            color: #795a43;
            font-weight: 600;
          }
          .aura-orders-section:has(.aura-mobile-all-actions[open]) .scroll table {
            min-width: 850px;
          }
        }
      `}</style>

      <style>{`
        .messages-section .msg-text-col {
          min-width: 360px;
        }

        .messages-section .msg-details {
          max-width: 420px;
        }

        .messages-section .msg-details summary {
          cursor: pointer;
          list-style: none;
          font-weight: 600;
          color: #8b5e3c;
          background: #f8efe7;
          border: 1px solid #ead7c7;
          border-radius: 12px;
          padding: 10px 12px;
          line-height: 1.5;
        }

        .messages-section .msg-details summary::-webkit-details-marker {
          display: none;
        }

        .messages-section .msg-details summary::after {
          content: "  ·  Xem nội dung";
          font-weight: 500;
          color: #a47148;
        }

        .messages-section .msg-details[open] summary::after {
          content: "  ·  Thu gọn";
        }

        .messages-section .msg-full-text {
          margin-top: 10px;
          white-space: pre-line;
          line-height: 1.75;
          overflow-wrap: anywhere;
          background: #fff;
          border: 1px solid #eee2d7;
          border-radius: 12px;
          padding: 12px;
        }

        .messages-section td:last-child a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 12px 20px;
          border-radius: 16px;
          background: #f2dfcf;
          color: #8f5b30;
          border: 1px solid #e1c4ac;
          font-weight: 700;
          text-decoration: none;
          min-width: 132px;
        }

        .messages-section td:last-child span,
        .messages-section td:last-child .done,
        .messages-section td:last-child .created {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 12px 20px;
          border-radius: 16px;
          background: #dff3e7;
          color: #1f7a4d;
          border: 1px solid #a6dbbb;
          font-weight: 700;
          min-width: 132px;
        }

        @media (max-width: 768px) {
          .messages-section .scroll {
            overflow-x: visible;
          }

          .messages-section table,
          .messages-section tbody,
          .messages-section tr,
          .messages-section td {
            display: block;
            width: 100%;
          }

          .messages-section thead {
            display: none;
          }

          .messages-section tr {
            padding: 14px 0;
            border-top: 1px solid #eee;
          }

          .messages-section td {
            padding: 6px 0;
            border: 0;
          }

          .messages-section td:nth-child(2),
          .messages-section td:nth-child(3) {
            display: none;
          }

          .messages-section .msg-text-col {
            min-width: 0;
          }

          .messages-section .msg-details,
          .messages-section .msg-full-text {
            max-width: 100%;
          }

          .messages-section td:last-child a,
          .messages-section td:last-child span,
          .messages-section td:last-child .done,
          .messages-section td:last-child .created {
            width: 100%;
            min-width: 0;
            margin-top: 8px;
          }
        }
      `}</style>

      <style>{`
        /* AURA MOBILE OVERFLOW FIX */ @media (max-width: 768px) {
          .messages-section,
          .messages-section .scroll,
          .messages-section table,
          .messages-section tbody,
          .messages-section tr,
          .messages-section td {
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }

          .messages-section {
            overflow: hidden !important;
          }

          .messages-section .scroll {
            overflow-x: hidden !important;
          }

          .messages-section table,
          .messages-section tbody,
          .messages-section tr,
          .messages-section td {
            display: block !important;
          }

          .messages-section thead,
          .messages-section td:nth-child(2),
          .messages-section td:nth-child(3) {
            display: none !important;
          }

          .messages-section .msg-text-col,
          .messages-section .msg-details,
          .messages-section .msg-details summary,
          .messages-section .msg-full-text,
          .messages-section td:last-child a {
            min-width: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            overflow-wrap: anywhere !important;
          }

          .messages-section td:last-child a {
            padding: 12px !important;
          }
        }
      `}</style>
</main>
  );
}
