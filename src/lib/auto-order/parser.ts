export type CheckoutData = {
  customerName: string; phone: string; address: string;
  ward: string; province: string; itemName: string;
  quantity: number; unitPrice: number; cod: number;
  weight: number; length: number; width: number; height: number;
  shippingPayer: number; note: string;
};

const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().trim();
const digits = (s: string) => s.replace(/[^0-9]/g, "");
function money(raw: string): number {
  const text = normalize(raw).replace(/\s/g, "");
  const m = text.match(/^([0-9][0-9.,]*)(k|tr|trieu|vnd|d)?$/);
  if (!m) return NaN;
  const base = Number(m[1].replace(/[.,]/g, ""));
  return base * (m[2] === "k" ? 1000 : ["tr", "trieu"].includes(m[2] || "") ? 1000000 : 1);
}
function whole(raw: string) { return Number(digits(raw)); }

// Deliberately strict: never invent GHN address or financial fields.
export function parseStaffCheckout(text: string): CheckoutData | null {
  const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const fields = new Map<string,string>();
  for (const line of lines) {
    const match = line.match(/^([^:：]+)[:：]\s*(.+)$/);
    if (match) fields.set(normalize(match[1]).replace(/\s+/g, " "), match[2].trim());
  }
  const pick = (...keys: string[]) => keys.map(k => fields.get(k)).find(Boolean) || "";
  const customerName = pick("ho ten", "ten khach");
  const phone = digits(pick("sdt", "so dien thoai", "dien thoai"));
  const address = pick("dia chi");
  const ward = pick("phuong/xa", "phuong", "xa");
  const province = pick("tinh/tp", "tinh/thanh", "tinh/thanh pho", "tinh", "thanh pho");
  const itemName = pick("san pham");
  const quantity = whole(pick("so luong"));
  const unitPrice = money(pick("don gia"));
  const cod = money(pick("cod", "thu ho"));
  const weight = whole(pick("khoi luong"));
  const length = whole(pick("dai"));
  const width = whole(pick("rong"));
  const height = whole(pick("cao"));
  const fee = normalize(pick("phi ship", "ben tra phi"));
  const shippingPayer = /^(shop|shop tra|mien ship|free ship)$/.test(fee) ? 1 : /^(khach|khach tra)$/.test(fee) ? 2 : 0;
  if (!customerName || !/^0\d{9}$/.test(phone) || address.length < 8 || !ward || !province || !itemName) return null;
  if (![quantity,unitPrice,cod,weight,length,width,height].every(Number.isInteger)) return null;
  if (quantity < 1 || quantity > 100 || unitPrice < 0 || cod < 0 || cod > 50000000 || weight < 1 || weight > 50000) return null;
  if ([length,width,height].some(n => n < 1 || n > 200) || !shippingPayer) return null;
  return { customerName,phone,address,ward,province,itemName,quantity,unitPrice,cod,weight,length,width,height,shippingPayer,note:pick("ghi chu") };
}

export function isCustomerConfirmation(text: string): boolean {
  const s=normalize(text).replace(/[.!?]+/g, " ").replace(/\s+/g, " ").trim();
  return /^(ok|oke|da|dong y|xac nhan|chot don|v ang|vang|duoc|okie)( ship( cho (minh|em|chi|anh|toi))? (nhe|nha)?)?$/.test(s) || /^(ship cho (minh|em|chi|anh|toi) (nhe|nha))$/.test(s);
}
export function isCustomerChangeOrCancellation(text:string):boolean {
 const s=normalize(text);
 return /\b(huy|doi|sua|khong lay|khong mua|cho xem lai|nham|sai dia chi|doi dia chi|thay doi)\b/.test(s);
}
