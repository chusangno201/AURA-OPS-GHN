import { NextRequest, NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { createShipment } from "@/lib/ghn";
const schema = z.object({
  customerName: z.string().trim().min(1),
  phone: z.string().trim().min(9),
  address: z.string().trim().min(5),
  ward: z.string().trim().min(1),
  province: z.string().trim().min(1),
  itemName: z.string().trim().min(1),
  quantity: z.coerce.number().int().min(1),
  unitPrice: z.coerce.number().int().min(0),
  cod: z.coerce.number().int().min(0).max(50000000),
  weight: z.coerce.number().int().min(1).max(50000),
  length: z.coerce.number().int().min(1),
  width: z.coerce.number().int().min(1),
  height: z.coerce.number().int().min(1),
  shippingPayer: z.coerce.number().int().min(1).max(2),
  note: z.string().default(""),
  pageId: z.string().optional(),
  senderId: z.string().optional(),
});
export async function POST(req: NextRequest) {
  if (!(await authenticated()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const form = Object.fromEntries((await req.formData()).entries());
  const parsed = schema.safeParse(form);
  if (!parsed.success)
    return NextResponse.json(
      { error: z.prettifyError(parsed.error) },
      { status: 400 },
    );
  const order = await db.order.create({ data: parsed.data });
  if (form.action === "confirm") {
    // GHN client_order_code references our local order ID for reconciliation.
    try {
      const shipment = await createShipment(order);
      await db.order.update({
        where: { id: order.id },
        data: {
          ghnOrderCode: shipment.code,
          ghnFee: shipment.fee,
          status: "SUBMITTED",
          ghnStatus: "ready_to_pick",
        },
      });
      return NextResponse.redirect(new URL("/?sent=" + order.id, req.url), 303);
    } catch (e) {
      // Keep the draft; never silently lose customer data if GHN rejects it.
      console.error(
        "GHN create order failed",
        e instanceof Error ? e.message : "Unknown",
      );
      return NextResponse.redirect(new URL("/?error=ghn", req.url), 303);
    }
  }
  return NextResponse.redirect(new URL("/?created=" + order.id, req.url), 303);
}
