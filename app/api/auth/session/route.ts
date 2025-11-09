import { db } from '@/lib/database/db';
import { sessions, users } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';

export async function GET() {
  const token = (await cookies()).get('session_token')?.value;
  if (!token) return Response.json({ user: null }, { status: 401 });

  const [session] = await db.select().from(sessions).where(eq(sessions.token, token)).limit(1);
  if (!session) return Response.json({ user: null }, { status: 401 });

  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);

  return Response.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      hospitalId: user.hospitalId,
    }
  });
}
