import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { pbis, productBacklogLists, epics } from '@/lib/schema';
import { getCurrentUser } from '@/lib/session';
import { eq, and } from 'drizzle-orm';

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
    const {
      pic,
      title,
      priority,
      storyPoint,
      businessValue,
      userStory,
      acceptanceCriteria,
      notes,
      epicId,
    } = await request.json();

    if (!pic || !title || !priority || storyPoint === undefined || businessValue === undefined || !userStory || !acceptanceCriteria) {
      return NextResponse.json({ error: 'Required fields are missing' }, { status: 400 });
    }

    const existingPbi = await db
      .select()
      .from(pbis)
      .where(eq(pbis.id, id))
      .limit(1);

    if (existingPbi.length === 0) {
      return NextResponse.json({ error: 'PBI not found' }, { status: 404 });
    }

    const backlog = await db
      .select()
      .from(productBacklogLists)
      .where(eq(productBacklogLists.id, existingPbi[0].productBacklogListId))
      .limit(1);

    if (backlog.length === 0 || backlog[0].userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (epicId) {
      const epic = await db
        .select()
        .from(epics)
        .where(and(eq(epics.id, epicId), eq(epics.productBacklogListId, existingPbi[0].productBacklogListId)))
        .limit(1);

      if (epic.length === 0) {
        return NextResponse.json({ error: 'Epic not found in the specified backlog' }, { status: 404 });
      }
    }

    const updatedPbi = await db
      .update(pbis)
      .set({
        pic,
        title,
        priority,
        storyPoint: parseInt(storyPoint),
        businessValue: parseInt(businessValue),
        userStory,
        acceptanceCriteria,
        notes,
        epicId: epicId || null,
        updatedAt: new Date(),
      })
      .where(eq(pbis.id, id))
      .returning();

    return NextResponse.json(updatedPbi[0]);
  } catch (error) {
    console.error('Update PBI error:', error);
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

    const pbi = await db
      .select()
      .from(pbis)
      .where(eq(pbis.id, id))
      .limit(1);

    if (pbi.length === 0) {
      return NextResponse.json({ error: 'PBI not found' }, { status: 404 });
    }

    const backlog = await db
      .select()
      .from(productBacklogLists)
      .where(eq(productBacklogLists.id, pbi[0].productBacklogListId))
      .limit(1);

    if (backlog.length === 0 || backlog[0].userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await db.delete(pbis).where(eq(pbis.id, id));

    return NextResponse.json({ message: 'PBI deleted successfully' });
  } catch (error) {
    console.error('Delete PBI error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}