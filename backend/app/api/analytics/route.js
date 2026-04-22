import { NextResponse } from "next/server";
import db from "@/lib/db";

/**
 * GET /api/analytics
 * Returns platform analytics and derived stats.
 */
export async function GET() {
  try {
    const rows = db.prepare("SELECT key, value FROM analytics").all();
    const analytics = Object.fromEntries(rows.map((r) => [r.key, r.value]));

    const patternCount = db.prepare("SELECT COUNT(*) as c FROM patterns").get().c;
    const aiPatterns = db.prepare("SELECT COUNT(*) as c FROM patterns WHERE isAIGenerated = 1").get().c;
    const templateCount = db.prepare("SELECT COUNT(*) as c FROM templates").get().c;
    const progressRecords = db.prepare("SELECT COUNT(*) as c FROM progress").get().c;
    const avgCompletion = db.prepare("SELECT AVG(progressPercentage) as avg FROM progress").get().avg || 0;

    return NextResponse.json(
      {
        ...analytics,
        totalPatterns: patternCount,
        aiPatterns,
        totalTemplates: templateCount,
        progressRecords,
        avgCompletion: Math.round(avgCompletion * 10) / 10,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch analytics.", details: error.message },
      { status: 500 }
    );
  }
}
