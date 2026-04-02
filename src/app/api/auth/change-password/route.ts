import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual, createHash } from "crypto";

export async function POST(request: NextRequest) {
  const adminPassword = process.env.FLEET_ADMIN_PASSWORD;
  if (!adminPassword) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  let body: { currentPassword?: string; newPassword?: string; confirmPassword?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { currentPassword, newPassword, confirmPassword } = body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "New password must be at least 8 characters" },
      { status: 400 }
    );
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: "New passwords do not match" }, { status: 400 });
  }

  const adminHash = createHash("sha256").update(adminPassword).digest();
  const inputHash = createHash("sha256").update(currentPassword).digest();
  if (!timingSafeEqual(adminHash, inputHash)) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    message: `To apply the new password, set FLEET_ADMIN_PASSWORD=${newPassword} in your .env.local file and restart the server.`,
  });
}
