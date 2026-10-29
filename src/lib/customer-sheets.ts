import { google } from "googleapis";
import type { Order } from "@prisma/client";

const TAB = "Danh sách khách hàng";
const quote = (s: string) => `'${s.replace(/'/g, "''")}'`;

function client() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
    GOOGLE_REFRESH_TOKEN, GOOGLE_SHEET_ID } = process.env;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET ||
      !GOOGLE_REFRESH_TOKEN || !GOOGLE_SHEET_ID) {
    throw new Error("Thiếu Google Sheets OAuth");
  }

  const auth = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });

  return {
    sheets: google.sheets({ version: "v4", auth }),
    id: GOOGLE_SHEET_ID,
  };
}

export async function syncCustomerOrder(order: Order) {
  if (!order.ghnOrderCode) {
    throw new Error("Đơn chưa tạo GHN thành công");
  }

  const { sheets, id } = client();
  const tab = quote(TAB);

  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: id,
    range: `${tab}!C8:X34`,
  });

  const rows = existing.data.values || [];

  // Cot X: ID Aura Ops - tranh ghi trung khi dong bo lai.
  const existingIndex = rows.findIndex(
    r => String(r[21] || "") === order.id
  );

  let row: number;

  if (existingIndex >= 0) {
    row = existingIndex + 8;
  } else {
    const slot = Array.from({ length: 27 }, (_, i) => i)
      .find(i => {
        const r = rows[i] || [];
        // Khong ghi de dong co thong tin khach,
        // so luong hoac trang thai don.
        return !r[0] && !r[1] && !r[2] &&
          !r[6] && !r[12] && !r[21] &&
          (!r[14] || r[14] === "khác");
      });

    if (slot === undefined) {
      throw new Error(
        "Không còn hàng trống an toàn trong vùng 8:34. " +
        "Cần mở rộng công thức trước khi ghi tiếp."
      );
    }

    row = slot + 8;
  }

  // Khong sua cac cot cong thuc: A,L,R,U,V.
  const values: Array<[string, string | number]> = [
    ["C", order.customerName],
    ["D", "'" + order.phone],
    ["E", `${order.address}, ${order.ward}, ${order.province}`],
    ["F", order.itemName],
    ["I", order.quantity],
    ["J", order.unitPrice],
    ["N", "COD"],
    ["O", "Đã đặt"],
    ["P", order.note || ""],
    ["Q", order.itemName],
    ["X", order.id],
  ];

  if (existingIndex < 0) {
    values.unshift(["B", order.createdAt.toISOString().slice(0, 10)]);
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: id,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data: values.map(([col, value]) => ({
        range: `${tab}!${col}${row}`,
        values: [[value]],
      })),
    },
  });

  return row;
}
