import { NextRequest, NextResponse } from "next/server";
import { loginRateLimiter } from "@/lib/rateLimiter";

const HARDCODED_EMAIL = "admin@fleet.dev";
const HARDCODED_PASSWORD = "fleet-admin-2024";
const AUTH_TOKEN = "fleet-session-token-v1";

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  if (loginRateLimiter.isRateLimited(ip)) {
    const retryAfter = loginRateLimiter.getRetryAfterSeconds(ip);
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      }
    );
  }

  let body: { email?: string; password?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  if (email !== HARDCODED_EMAIL || password !== HARDCODED_PASSWORD) {
    loginRateLimiter.recordFailedAttempt(ip);
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  loginRateLimiter.reset(ip);

  const response = NextResponse.json({ success: true });
  response.cookies.set("fleet-auth", AUTH_TOKEN, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return response;
}
