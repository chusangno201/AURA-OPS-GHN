import { NextRequest, NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { db } from "@/lib/db";
import { createShipment } from "@/lib/ghn";
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await authenticated()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const o = await db.order.findUnique({ where: { id } });
  if (!o)
    return NextResponse.json({ error: "Không tìm thấy đơn" }, { status: 404 });
  if (o.ghnOrderCode)
    return NextResponse.redirect(new URL("/?error=already", req.url), 303);
  try {
    // GHN client_order_code is unique and makes retry safe if GHN responded but DB update failed.
    const shipment = await createShipment(o);
    await db.order.update({
      where: { id },
      data: {
        ghnOrderCode: shipment.code,
        ghnFee: shipment.fee,
        ghnStatus: "ready_to_pick",
        status: "SUBMITTED",
      },
    });
    return NextResponse.redirect(new URL("/?sent=" + id, req.url), 303);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "GHN error" },
      { status: 502 },
    );
  }
}
