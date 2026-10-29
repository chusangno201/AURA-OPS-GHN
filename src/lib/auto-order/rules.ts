export type ConfirmedOrder = {
  orderId: string;
  pageId: string;
  senderId: string;
  customerName: string;
  phone: string;
  address: string;
  ward: string;
  province: string;
  product: string;
  quantity: number;
  cod: number;
  weight: number;
  length: number;
  width: number;
  height: number;
  shippingPayer: "SHOP" | "CUSTOMER";
  confirmationMessageId: string;
  customerConfirmed: boolean;
  hasChangesAfterConfirmation: boolean;
  existingGhnOrderCode?: string | null;
};

export function checkAutoOrder(o: ConfirmedOrder) {
  const errors: string[] = [];

  if (!o.orderId || !o.pageId || !o.senderId)
    errors.push("Thieu dinh danh don hoac Messenger");

  if (!o.customerName.trim())
    errors.push("Thieu ten khach");

  if (!/^0\d{9}$/.test(o.phone.replace(/\s/g, "")))
    errors.push("So dien thoai khong hop le");

  if (!o.address.trim() || !o.ward.trim() || !o.province.trim())
    errors.push("Thieu dia chi GHN");

  if (!o.product.trim() || !Number.isInteger(o.quantity) || o.quantity < 1)
    errors.push("San pham hoac so luong khong hop le");

  if (!Number.isInteger(o.cod) || o.cod < 0)
    errors.push("COD khong hop le");

  if (![o.weight, o.length, o.width, o.height]
      .every(n => Number.isInteger(n) && n > 0))
    errors.push("Kich thuoc hoac trong luong khong hop le");

  if (o.weight > 50000 || [o.length, o.width, o.height].some(n => n > 200))
    errors.push("Vuot gioi han kich thuoc GHN");

  if (!o.confirmationMessageId || !o.customerConfirmed)
    errors.push("Chua co xac nhan ro rang tu khach");

  if (o.hasChangesAfterConfirmation)
    errors.push("Thong tin don da thay doi");

  if (o.existingGhnOrderCode)
    errors.push("Don da co ma van don GHN");

  if (!["SHOP", "CUSTOMER"].includes(o.shippingPayer))
    errors.push("Chua xac dinh ben tra phi");

  return {
    eligible: errors.length === 0,
    errors
  };
}
