import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database/db";
import { beds } from "@/lib/database/schema";
import { eq } from "drizzle-orm";

export async function GET(_req: NextRequest, context: { params: Promise<{ hospitalId: string }> }) {
  const { hospitalId } = await context.params;
  try {
    const list = await db.select().from(beds).where(eq(beds.hospitalId, hospitalId));
    return NextResponse.json({ beds: list });
  } catch {
    return NextResponse.json({ error: "Failed to fetch beds" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ hospitalId: string }> }) {
  const { hospitalId } = await context.params;
  try {
    const data = await req.json();
    const inserted = await db.insert(beds).values({
      hospitalId,
      wardId: data.wardId ?? null,
      bedNumber: data.bedNumber,
      status: data.status ?? "available",
      priority: data.priority ?? "normal",
      position: data.position ?? { x: 0, y: 0 },
    }).returning();
    return NextResponse.json(inserted[0]);
  } catch {
    return NextResponse.json({ error: "Failed to create bed" }, { status: 400 });
  }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ hospitalId: string }> }) {
  await context.params;
  try {
    const data = await req.json();
    if (!data.id) return NextResponse.json({ error: "Missing bed ID" }, { status: 400 });
    const [updated] = await db.update(beds).set({
      wardId: data.wardId,
      status: data.status,
      priority: data.priority,
      bedNumber: data.bedNumber,
      position: data.position,
    }).where(eq(beds.id, data.id)).returning();
    if (!updated) return NextResponse.json({ error: "Bed not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update bed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ hospitalId: string }> }) {
  await context.params;
  try {
    const { bedId } = await req.json();
    if (!bedId) return NextResponse.json({ error: "Missing bed ID" }, { status: 400 });
    const deleted = await db.delete(beds).where(eq(beds.id, bedId)).returning();
    if (!deleted.length) return NextResponse.json({ error: "Bed not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete bed" }, { status: 500 });
  }
}
