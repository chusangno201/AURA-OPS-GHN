import { db } from "@/lib/db";
import { submitOrderToGhn } from "@/lib/submit-ghn";

function parse(text: string) {
  if (!/^(?:Họ tên|Ho ten):/im.test(text.trim())) return null;

  const values = new Map<string,string>();

  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([^:]+):\s*(.*)$/);
    if (m) values.set(
      m[1].trim().normalize("NFD")
        .replace(/[\u0300-\u036f]/g,"")
        .toLowerCase(),
      m[2].trim()
    );
  }

  const get = (k:string) => values.get(k) || "";
  const num = (k:string) => Number(get(k));
  const phone = get("sdt").replace(/\s/g,"");

  const data = {
    customerName:get("ho ten"),
    phone,
    address:get("dia chi"),
    ward:get("phuong/xa"),
    province:get("tinh/tp"),
    itemName:get("san pham"),
    quantity:num("so luong"),
    unitPrice:num("don gia"),
    cod:num("cod") || num("don gia") * num("so luong"),
    weight:num("khoi luong") || 500,
    length:num("dai") || 25,
    width:num("rong") || 20,
    height:num("cao") || 10,
    shippingPayer:get("phi ship").toLowerCase()==="shop" ? 1 :
      get("phi ship").toLowerCase()==="khach" ? 2 : 0,
    note:get("ghi chu")
  };

  if (!data.customerName || !/^0\d{9}$/.test(phone) ||
      data.address.length < 8 || !data.ward || !data.province ||
      !data.itemName || !data.shippingPayer) return null;

  if (![data.quantity,data.unitPrice,data.cod,data.weight,
        data.length,data.width,data.height].every(Number.isInteger))
    return null;

  if (data.quantity < 1 || data.quantity > 100 ||
      data.unitPrice < 0 || data.cod < 0 || data.cod > 50000000 ||
      data.weight < 1 || data.weight > 50000 ||
      [data.length,data.width,data.height].some(n=>n<1||n>200))
    return null;

  return data;
}

export async function processStaffOrder(input:{
  mid:string; pageId:string; senderId:string;
  isEcho:boolean; text:string;
}) {
  if (!input.isEcho) return;

  const data=parse(input.text);
  if (!data) return;

  try {
    await db.checkoutCandidate.create({
      data:{
        pageId:input.pageId,
        senderId:input.senderId,
        draftMid:input.mid,
        payload:JSON.stringify(data),
        state:"REVIEW"
      }
    });
  } catch(e) {
    if ((e as {code?:string}).code==="P2002") return;
    throw e;
  }

  if (process.env.AUTO_GHN_ENABLED!=="true") {
    console.log("AURA: Da nhan ban chot don, chua bat tu dong GHN");
    return;
  }

  if (!process.env.GHN_BASE_URL?.includes("dev-online-gateway.ghn.vn")) {
    console.log("AURA: Khong tu gui GHN production");
    return;
  }

  const order=await db.order.create({
    data:{...data,pageId:input.pageId,senderId:input.senderId}
  });

  await db.checkoutCandidate.update({
    where:{draftMid:input.mid},
    data:{orderId:order.id,state:"PROCESSING"}
  });

  const result=await submitOrderToGhn(order.id);

  await db.checkoutCandidate.update({
    where:{draftMid:input.mid},
    data:{state:result.status==="SENT"?"SENT":"REVIEW"}
  });

  console.log("AURA AUTO GHN:",result.status);
}
