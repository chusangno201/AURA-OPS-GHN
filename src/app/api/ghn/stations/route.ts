import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { getGhnStations } from "@/lib/ghn-stations";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await authenticated())) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const data = await getGhnStations();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[GHN STATIONS]", error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "Không tải được bưu cục GHN",
      },
      { status: 502 }
    );
  }
}
