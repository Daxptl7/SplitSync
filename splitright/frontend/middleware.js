import { NextResponse } from "next/server";

// Simple in-memory rate limiter for edge (per-request, resets on cold start)
const rateMap = new Map();
const RATE_LIMIT = 100; // requests per minute per IP
const WINDOW_MS = 60_000;

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Only apply to API routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  // ── CORS headers ──
  response.headers.set(
    "Access-Control-Allow-Origin",
    process.env.NEXT_PUBLIC_FRONTEND_URL || "*",
  );
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type,Authorization",
  );

  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: response.headers });
  }

  // ── Rate limiting (simple IP-based) ──
  const ip = request.ip || request.headers.get("x-forwarded-for") || "unknown";
  const now = Date.now();
  const entry = rateMap.get(ip);

  if (entry && now - entry.start < WINDOW_MS) {
    if (entry.count >= RATE_LIMIT) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again later." },
        { status: 429 },
      );
    }
    entry.count++;
  } else {
    rateMap.set(ip, { start: now, count: 1 });
  }

  // ── JWT presence check (validation happens in Django) ──
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    // Allow unauthenticated requests to pass — Django will reject if needed
  }

  // ── Request validation ──
  if (["POST", "PUT", "PATCH"].includes(request.method)) {
    const contentType = request.headers.get("Content-Type");
    if (
      contentType &&
      !contentType.includes("application/json") &&
      !contentType.includes("multipart/form-data")
    ) {
      return NextResponse.json(
        { error: "Unsupported Content-Type" },
        { status: 415 },
      );
    }
  }

  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
