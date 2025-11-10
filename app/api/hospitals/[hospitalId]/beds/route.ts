import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database/db";
import { beds } from "@/lib/database/schema";
import { eq } from "drizzle-orm";

export async function GET(_req: NextRequest, { params }: { params: { hospitalId: string } }) {
  try {
    const { hospitalId } = params; 
    const list = await db.select().from(beds).where(eq(beds.hospitalId, hospitalId));
    return NextResponse.json({ beds: list }); 
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch beds" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { hospitalId: string } }) {
  try {
    const { hospitalId } = params;
    const data = await request.json();

    const inserted = await db.insert(beds).values({
      hospitalId,
      wardId: data.wardId ?? null,
      status: data.status ?? "available",
      bedNumber: data.bedNumber,
      priority: data.priority ?? "normal",
      position: data.position ?? { x: 0, y: 0 },
    }).returning();

    return NextResponse.json(inserted[0]);
  } catch (err) {
    return NextResponse.json({ error: "Failed to create bed" }, { status: 400 });
  }
}
