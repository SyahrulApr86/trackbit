import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { epics, productBacklogLists } from '@/lib/schema';
import { getCurrentUser } from '@/lib/session';
import { eq } from 'drizzle-orm';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { title, description } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const updatedEpic = await db
      .update(epics)
      .set({
        title,
        description,
        updatedAt: new Date(),
      })
      .where(eq(epics.id, id))
      .returning();

    if (updatedEpic.length === 0) {
      return NextResponse.json({ error: 'Epic not found' }, { status: 404 });
    }

    const backlog = await db
      .select()
      .from(productBacklogLists)
      .where(eq(productBacklogLists.id, updatedEpic[0].productBacklogListId))
      .limit(1);

    if (backlog.length === 0 || backlog[0].userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json(updatedEpic[0]);
  } catch (error) {
    console.error('Update epic error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const epic = await db
      .select()
      .from(epics)
      .where(eq(epics.id, id))
      .limit(1);

    if (epic.length === 0) {
      return NextResponse.json({ error: 'Epic not found' }, { status: 404 });
    }

    const backlog = await db
      .select()
      .from(productBacklogLists)
      .where(eq(productBacklogLists.id, epic[0].productBacklogListId))
      .limit(1);

    if (backlog.length === 0 || backlog[0].userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await db.delete(epics).where(eq(epics.id, id));

    return NextResponse.json({ message: 'Epic deleted successfully' });
  } catch (error) {
    console.error('Delete epic error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}