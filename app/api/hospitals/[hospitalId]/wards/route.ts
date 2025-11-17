import { NextResponse } from "next/server";
import { db } from "@/lib/database/db";
import { wards } from "@/lib/database/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: Request,
  context: { params: Promise<{ hospitalId: string }> }
) {
  const { hospitalId } = await context.params;

  const rows = await db
    .select()
    .from(wards)
    .where(eq(wards.hospitalId, hospitalId));

  return NextResponse.json({
    wards: rows.map(w => ({
      id: w.id || crypto.randomUUID(),
      hospitalId: w.hospitalId,
      name: w.name,
      specialty: w.specialty ?? w.name,
      notes: w.notes ?? ""
    }))
  });
}

export async function POST(
  req: Request,
  context: { params: Promise<{ hospitalId: string }> }
) {
  const { hospitalId } = await context.params;
  const body = await req.json();

  const [created] = await db
    .insert(wards)
    .values({
      id: crypto.randomUUID(),
      hospitalId,
      name: body.name,
      specialty: body.specialty ?? body.name,
      notes: body.notes ?? ""
    })
    .returning();

  return NextResponse.json({
    ward: {
      id: created.id,
      hospitalId: created.hospitalId,
      name: created.name,
      specialty: created.specialty ?? created.name,
      notes: created.notes ?? ""
    }
  });
}

export async function PUT(req: Request) {
  const body = await req.json();

  const [updated] = await db
    .update(wards)
    .set({
      name: body.name,
      specialty: body.specialty ?? body.name,
      notes: body.notes ?? ""
    })
    .where(eq(wards.id, body.id))
    .returning();

  return NextResponse.json({
    ward: {
      id: updated.id,
      hospitalId: updated.hospitalId,
      name: updated.name,
      specialty: updated.specialty ?? updated.name,
      notes: updated.notes ?? ""
    }
  });
}

export async function DELETE(req: Request) {
  const { wardId } = await req.json();

  await db.delete(wards).where(eq(wards.id, wardId));

  return NextResponse.json({ success: true });
}
