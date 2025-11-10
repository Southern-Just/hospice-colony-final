import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database/db";
import { beds } from "@/lib/database/schema";
import { eq } from "drizzle-orm";

export async function GET(_req: NextRequest, { params }: { params: { hospitalId: string } }) {
  const list = await db.select().from(beds).where(eq(beds.hospitalId, params.hospitalId));
  return NextResponse.json(list);
}

export async function POST(request: NextRequest, { params }: { params: { hospitalId: string } }) {
  const data = await request.json();

  const inserted = await db.insert(beds).values({
    hospitalId: params.hospitalId,
    wardId: data.wardId ?? null,
    status: data.status ?? "available",
    bedNumber: data.bedNumber,
    priority: data.priority ?? "normal",
    position: data.position ?? { x: 0, y: 0 },
  }).returning();

  return NextResponse.json(inserted[0]);
}
