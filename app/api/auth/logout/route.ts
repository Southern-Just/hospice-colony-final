import { db } from '@/lib/database/db';
import { sessions } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';

export async function POST() {
  const token = (await cookies()).get('session_token')?.value;

  if (!token) return Response.json({ message: 'No active session' }, { status: 400 });

  await db.delete(sessions).where(eq(sessions.token, token));
  (await cookies()).delete('session_token');

  return Response.json({ message: 'Logged out successfully' });
}
