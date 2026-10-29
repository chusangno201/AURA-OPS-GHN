import { NextRequest, NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { db } from "@/lib/db";
import { syncOrder } from "@/lib/sheets";
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await authenticated()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const o = await db.order.findUnique({ where: { id } });
  if (!o) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    await syncOrder(o);
    await db.order.update({
      where: { id },
      data: { sheetSyncedAt: new Date() },
    });
    return NextResponse.redirect(new URL("/?synced=" + id, req.url), 303);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sheets error" },
      { status: 502 },
    );
  }
}
