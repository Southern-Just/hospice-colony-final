import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database/db";
import { wards } from "@/lib/database/schema";
import { eq } from "drizzle-orm";

export async function GET(_req: NextRequest, { params }: { params: { hospitalId: string } }) {
  const list = await db.select().from(wards).where(eq(wards.hospitalId, params.hospitalId));
  return NextResponse.json(list);
}

export async function POST(request: NextRequest, { params }: { params: { hospitalId: string } }) {
  const data = await request.json();
  const inserted = await db.insert(wards).values({
    hospitalId: params.hospitalId,
    name: data.name,
    specialty: data.specialty,
  }).returning();

  return NextResponse.json(inserted[0]);
}
