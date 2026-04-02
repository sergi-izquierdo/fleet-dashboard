import { NextRequest, NextResponse } from "next/server";

const ADMIN_PASSWORD = process.env.FLEET_ADMIN_PASSWORD ?? "fleet-admin-2024";

export async function POST(request: NextRequest) {
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

  if (currentPassword !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    message: `To apply the new password, set FLEET_ADMIN_PASSWORD=${newPassword} in your .env.local file and restart the server.`,
    envLine: `FLEET_ADMIN_PASSWORD=${newPassword}`,
  });
}
