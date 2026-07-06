import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/admin";
import { getAdminOverview } from "@/lib/models/adminModel";
import logger from "@/lib/logger";
import pkg from "../../../../package.json";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { user, response } = await requireAdminUser(request);
  if (response) return response;

  try {
    const overview = await getAdminOverview();
    const mem = process.memoryUsage();
    return NextResponse.json({
      ...overview,
      health: {
        version: pkg.version,
        node: process.version,
        driver: process.env.DATABASE_URL ? "postgres" : "sqlite",
        uptimeSec: Math.round(process.uptime()),
        rssMb: Math.round(mem.rss / 1048576),
        heapMb: Math.round(mem.heapUsed / 1048576),
        env: process.env.NODE_ENV || "development",
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("admin.overview failed", { error: error.message, admin: user.id });
    return NextResponse.json({ error: "Could not load the overview." }, { status: 500 });
  }
}
