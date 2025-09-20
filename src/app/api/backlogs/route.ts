import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { productBacklogLists } from '@/lib/schema';
import { getCurrentUser } from '@/lib/session';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const backlogs = await db
      .select()
      .from(productBacklogLists)
      .where(eq(productBacklogLists.userId, user.id))
      .orderBy(productBacklogLists.updatedAt);

    return NextResponse.json(backlogs);
  } catch (error) {
    console.error('Get backlogs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, description } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const newBacklog = await db
      .insert(productBacklogLists)
      .values({
        title,
        description,
        userId: user.id,
      })
      .returning();

    return NextResponse.json(newBacklog[0], { status: 201 });
  } catch (error) {
    console.error('Create backlog error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}