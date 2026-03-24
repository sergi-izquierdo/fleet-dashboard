import { NextRequest, NextResponse } from "next/server";

const ADMIN_EMAIL = process.env.FLEET_ADMIN_EMAIL ?? "admin@fleet.dev";
const ADMIN_PASSWORD = process.env.FLEET_ADMIN_PASSWORD ?? "fleet-admin-2024";
const AUTH_TOKEN = process.env.FLEET_AUTH_SECRET ?? "fleet-session-token-v1";

export async function POST(request: NextRequest) {
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

  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

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
