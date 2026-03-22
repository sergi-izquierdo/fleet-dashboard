import { NextResponse } from "next/server";
import { mockDashboardData } from "@/data/mockData";

export async function GET() {
  return NextResponse.json(mockDashboardData);
}
