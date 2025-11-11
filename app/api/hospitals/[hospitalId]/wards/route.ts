import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database/db";
import { wards } from "@/lib/database/schema";
import { eq } from "drizzle-orm";

export async function GET(_req: NextRequest, context: { params: Promise<{ hospitalId: string }> }) {
  const { hospitalId } = await context.params;
  try {
    const list = await db.select().from(wards).where(eq(wards.hospitalId, hospitalId));
    return NextResponse.json({ wards: list });
  } catch {
    return NextResponse.json({ error: "Failed to fetch wards" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ hospitalId: string }> }) {
  const { hospitalId } = await context.params;
  try {
    const data = await req.json();
    const inserted = await db.insert(wards).values({
      hospitalId,
      name: data.name ?? "New Ward",
      specialty: data.specialty ?? "",
    }).returning();
    return NextResponse.json(inserted[0]);
  } catch {
    return NextResponse.json({ error: "Failed to create ward" }, { status: 400 });
  }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ hospitalId: string }> }) {
  await context.params;
  try {
    const data = await req.json();
    if (!data.id) return NextResponse.json({ error: "Missing ward ID" }, { status: 400 });
    const [updated] = await db.update(wards).set({
      name: data.name,
      specialty: data.specialty,
    }).where(eq(wards.id, data.id)).returning();
    if (!updated) return NextResponse.json({ error: "Ward not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update ward" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ hospitalId: string }> }) {
  await context.params;
  try {
    const { wardId } = await req.json();
    if (!wardId) return NextResponse.json({ error: "Missing ward ID" }, { status: 400 });
    const deleted = await db.delete(wards).where(eq(wards.id, wardId)).returning();
    if (!deleted.length) return NextResponse.json({ error: "Ward not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete ward" }, { status: 500 });
  }
}
