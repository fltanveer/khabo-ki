import { NextResponse, type NextRequest } from "next/server";
import { getProfile } from "@/lib/auth";
import { fetchHistory, readFilters, toCsv } from "@/lib/history";

export async function GET(request: NextRequest) {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin" || profile.status !== "active") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const rows = await fetchHistory(readFilters(params), 20_000);
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(toCsv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="khaboki-orders-${stamp}.csv"`,
    },
  });
}
