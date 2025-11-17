import { NextResponse } from "next/server";
import { db } from "@/lib/database/db";
import { beds } from "@/lib/database/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: Request,
  context: { params: Promise<{ hospitalId: string }> }
) {
  const { hospitalId } = await context.params;

  const rows = await db
    .select()
    .from(beds)
    .where(eq(beds.hospitalId, hospitalId));

  return NextResponse.json({
    beds: rows.map(b => ({
      id: b.id || crypto.randomUUID(),
      hospitalId: b.hospitalId,
      wardId: b.wardId,
      bedNumber: b.bedNumber,
      status: b.status,
      priority: b.priority,
      position: b.position ?? {}
    }))
  });
}

export async function POST(
  req: Request,
  context: { params: Promise<{ hospitalId: string }> }
) {
  const { hospitalId } = await context.params;
  const body = await req.json();

  const items = Array.isArray(body) ? body : [body];

  const inserted = await db
    .insert(beds)
    .values(
      items.map(i => ({
        id: crypto.randomUUID(),
        hospitalId,
        wardId: i.wardId ?? null,
        bedNumber: i.bedNumber,
        status: i.status ?? "available",
        priority: i.priority ?? "normal",
        position: i.position ?? {}
      }))
    )
    .returning();

  return NextResponse.json({
    beds: inserted.map(b => ({
      id: b.id,
      hospitalId: b.hospitalId,
      wardId: b.wardId,
      bedNumber: b.bedNumber,
      status: b.status,
      priority: b.priority,
      position: b.position ?? {}
    }))
  });
}

export async function PUT(req: Request) {
  const body = await req.json();

  const [updated] = await db
    .update(beds)
    .set({
      wardId: body.wardId ?? null,
      status: body.status,
      priority: body.priority,
      position: body.position ?? {}
    })
    .where(eq(beds.id, body.id))
    .returning();

  return NextResponse.json({
    id: updated.id,
    hospitalId: updated.hospitalId,
    wardId: updated.wardId,
    bedNumber: updated.bedNumber,
    status: updated.status,
    priority: updated.priority,
    position: updated.position ?? {}
  });
}

export async function DELETE(req: Request) {
  const { bedId } = await req.json();

  await db.delete(beds).where(eq(beds.id, bedId));

  return NextResponse.json({ success: true });
}
