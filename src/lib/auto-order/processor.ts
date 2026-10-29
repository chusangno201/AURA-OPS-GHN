import {db} from "@/lib/db";
import {parseStaffCheckout,isCustomerConfirmation,isCustomerChangeOrCancellation, type CheckoutData} from "./parser";
import {submitOrderToGhn} from "@/lib/submit-ghn";

export async function processMessengerMessage(input: {
  mid: string; pageId: string; senderId: string; isEcho: boolean; text: string;
}) {
  const {mid,pageId,senderId,isEcho,text}=input;
  if (isEcho) {
    const parsed=parseStaffCheckout(text);
    if (!parsed) return;
    await db.checkoutCandidate.upsert({
      where:{pageId_senderId:{pageId,senderId}},
      create:{pageId,senderId,draftMid:mid,payload:JSON.stringify(parsed),state:"WAITING"},
      update:{draftMid:mid,payload:JSON.stringify(parsed),state:"WAITING",confirmationMid:null,orderId:null}
    });
    console.log("[AURA] Checkout proposal received",pageId,mid);
    return;
  }
  const c=await db.checkoutCandidate.findUnique({where:{pageId_senderId:{pageId,senderId}}});
  if (!c || c.state!=="WAITING") return;
  if (isCustomerChangeOrCancellation(text)) {
    await db.checkoutCandidate.updateMany({where:{id:c.id,state:"WAITING"},data:{state:"REVIEW"}});
    return;
  }
  if (!isCustomerConfirmation(text)) return;
  const claim=await db.checkoutCandidate.updateMany({
    where:{id:c.id,state:"WAITING",confirmationMid:null},
    data:{state:"PROCESSING",confirmationMid:mid}
  });
  if (claim.count!==1) return;
  try {
    const payload=JSON.parse(c.payload) as CheckoutData;
    // Never create live shipments until production was deliberately enabled.
    const live=(process.env.GHN_BASE_URL || "").includes("online-gateway.ghn.vn") && !(process.env.GHN_BASE_URL || "").includes("dev-online");
    const enabled=process.env.AUTO_GHN_ENABLED === "true";
    if (!enabled || (live && process.env.AUTO_GHN_ALLOW_PRODUCTION !== "true")) {
      await db.checkoutCandidate.update({where:{id:c.id},data:{state:"REVIEW"}});
      console.log("[AURA] Confirmation captured; auto-GHN disabled",c.id);
      return;
    }
    // Reuse order on replay; previous ambiguous GHN result must never auto-retry.
    const o=await db.order.create({data:{...payload,pageId,senderId,status:"DRAFT"}});
    await db.checkoutCandidate.update({where:{id:c.id},data:{orderId:o.id}});
    const result=await submitOrderToGhn(o.id);
    await db.checkoutCandidate.update({where:{id:c.id},data:{state:result.status === "SENT" ? "SENT" : "REVIEW"}});
    console.log("[AURA] Auto GHN result",result.status,o.id);
  } catch(e) {
    console.error("[AURA] Auto order error",e instanceof Error?e.message:"Unknown");
    await db.checkoutCandidate.updateMany({where:{id:c.id,state:"PROCESSING"},data:{state:"REVIEW"}});
    throw e;
  }
}
