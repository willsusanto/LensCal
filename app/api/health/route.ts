import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getBuildId() {
  return (
    process.env.LENSCAL_GIT_SHA ??
    process.env.GITHUB_SHA ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.RAILWAY_GIT_COMMIT_SHA ??
    "unknown"
  );
}

export function GET() {
  const response = NextResponse.json({
    ok: true,
    service: "lenscal",
    buildId: getBuildId(),
    nodeEnv: process.env.NODE_ENV ?? "unknown",
    nodeVersion: process.version,
    pid: process.pid,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });

  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("X-LensCal-Origin", "next-health");

  return response;
}
