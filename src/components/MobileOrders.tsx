"use client";

import { useState } from "react";

type OrderItem = {
  id: string;
  customerName: string;
  phone: string;
  itemName: string;
  quantity: number;
  date: string;
  status: string;
  cod: number;
  address: string;
  ward: string;
  province: string;
  ghnOrderCode: string | null;
  note: string;
};

export default function MobileOrders({ orders }: { orders: OrderItem[] }) {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const q = query.trim().toLocaleLowerCase("vi-VN");
  const filtered = orders.filter(o =>
    [o.customerName, o.phone, o.itemName, o.ghnOrderCode || "", o.status]
      .some(x => x.toLocaleLowerCase("vi-VN").includes(q))
  );
  const visible = showAll || q ? filtered : filtered.slice(0, 3);

  return (
    <div className="aura-mobile-order-list">
      <input
        className="aura-order-search"
        type="search"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Tìm tên, SĐT, mã GHN, sản phẩm..."
        aria-label="Tìm đơn hàng"
      />

      <div className="aura-order-count">
        {q ? `${filtered.length} kết quả` : `Hiển thị ${visible.length}/${orders.length} đơn`}
      </div>

      {visible.map(o => (
        <details className="aura-mobile-order" key={o.id}>
          <summary>
            <span className="aura-order-main">
              <strong>{o.customerName}</strong>
              <small>{o.itemName} × {o.quantity} · {o.date}</small>
              <span className="aura-order-status">{o.status}</span>
            </span>
            <span className="aura-order-expand">Xem thêm ▾</span>
          </summary>
          <div className="aura-order-extra">
            <div><span>SĐT</span><strong>{o.phone}</strong></div>
            <div><span>Địa chỉ</span><strong>{o.address}</strong></div>
            <div><span>Phường/Xã</span><strong>{o.ward}</strong></div>
            <div><span>Tỉnh/TP</span><strong>{o.province}</strong></div>
            <div>
              <span>COD</span>
              <strong>{o.cod.toLocaleString("vi-VN")}đ</strong>
            </div>
            <div>
              <span>Mã GHN</span>
              <strong>{o.ghnOrderCode || "Chưa có"}</strong>
            </div>
            <div><span>Ghi chú</span><strong>{o.note || "Không có"}</strong></div>
            <section style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "flex-start",
                flexWrap: "wrap",
                gap: 8,
                width: "100%",
                paddingTop: 12,
                borderTop: "1px solid #eee"
              }}>
                <form method="post" action={`/api/orders/${o.id}/ghn`}
                  style={{display:"block",width:"auto",flex:"0 0 auto",margin:0}}
                  onSubmit={e => {
                    if (!window.confirm("Xác nhận tạo vận đơn GHN thật?"))
                      e.preventDefault();
                  }}>
                  <button type="submit"
                    disabled={Boolean(o.ghnOrderCode) || o.status === "GHN_REVIEW"}
                    style={{
                      display:"inline-block",width:"auto",minWidth:0,
                      minHeight:34,padding:"7px 11px",margin:0,
                      fontSize:12,borderRadius:8,
                      background:"#242124",color:"#fff",
                      opacity:o.ghnOrderCode || o.status === "GHN_REVIEW" ? .5 : 1
                    }}>
                    {o.ghnOrderCode ? "✓ Đã có GHN" : "Tạo GHN"}
                  </button>
                </form>
                <form method="post" action={`/api/orders/${o.id}/sheet`}
                  style={{display:"block",width:"auto",flex:"0 0 auto",margin:0}}>
                  <button type="submit"
                    style={{
                      display:"inline-block",width:"auto",minWidth:0,
                      minHeight:34,padding:"7px 11px",margin:0,
                      fontSize:12,borderRadius:8,
                      background:"#f2e6dc",color:"#805534"
                    }}>
                    Đẩy Sheet
                  </button>
                </form>
                {o.status === "GHN_REVIEW" && !o.ghnOrderCode && (
                  <small style={{width:"100%",fontSize:11,color:"#925c18"}}>
                    Cần đối soát GHN trước khi tạo lại
                  </small>
                )}
              </section>
          </div>
        </details>
      ))}

      {filtered.length === 0 && (
        <p className="muted">Không tìm thấy đơn hàng.</p>
      )}

      {!q && orders.length > 3 && (
        <button
          type="button"
          className="aura-show-more-orders"
          onClick={() => setShowAll(v => !v)}
        >
          {showAll ? "Thu gọn danh sách ↑" : `Xem thêm ${orders.length - 3} đơn ↓`}
        </button>
      )}

      <details className="aura-mobile-all-actions">
        <summary>Xem bảng đầy đủ · Tạo GHN / Đẩy Sheet ▾</summary>
      </details>
    </div>
  );
}
