import { NextResponse } from 'next/server';
import { db } from '@/lib/database/db';
import { sessions } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('session_token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'No active session' }, { status: 400 });
    }

    // Delete session from DB
    await db.delete(sessions).where(eq(sessions.token, token));

    // Remove session cookie
    cookieStore.delete('session_token');


    return NextResponse.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
