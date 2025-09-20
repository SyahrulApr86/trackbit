import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { pbis, productBacklogLists, epics } from '@/lib/schema';
import { getCurrentUser } from '@/lib/session';
import { eq, and, isNull } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const backlogId = searchParams.get('backlogId');
    const epicId = searchParams.get('epicId');

    const filters = [eq(productBacklogLists.userId, user.id)];

    if (backlogId) {
      filters.push(eq(pbis.productBacklogListId, backlogId));
    }

    if (epicId) {
      if (epicId === 'null') {
        filters.push(isNull(pbis.epicId));
      } else {
        filters.push(eq(pbis.epicId, epicId));
      }
    }

    const result = await db
      .select({
        id: pbis.id,
        pic: pbis.pic,
        title: pbis.title,
        priority: pbis.priority,
        storyPoint: pbis.storyPoint,
        businessValue: pbis.businessValue,
        userStory: pbis.userStory,
        acceptanceCriteria: pbis.acceptanceCriteria,
        notes: pbis.notes,
        epicId: pbis.epicId,
        productBacklogListId: pbis.productBacklogListId,
        createdAt: pbis.createdAt,
        updatedAt: pbis.updatedAt,
        backlogTitle: productBacklogLists.title,
        epicTitle: epics.title,
      })
      .from(pbis)
      .innerJoin(productBacklogLists, eq(pbis.productBacklogListId, productBacklogLists.id))
      .leftJoin(epics, eq(pbis.epicId, epics.id))
      .where(filters.length === 1 ? filters[0] : and(...filters))
      .orderBy(pbis.updatedAt);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get PBIs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      productBacklogListId,
    } = await request.json();

    if (!pic || !title || !priority || storyPoint === undefined || !businessValue || !userStory || !acceptanceCriteria || !productBacklogListId) {
      return NextResponse.json({ error: 'Required fields are missing' }, { status: 400 });
    }

    const backlog = await db
      .select()
      .from(productBacklogLists)
      .where(eq(productBacklogLists.id, productBacklogListId))
      .limit(1);

    if (backlog.length === 0 || backlog[0].userId !== user.id) {
      return NextResponse.json({ error: 'Backlog not found' }, { status: 404 });
    }

    if (epicId) {
      const epic = await db
        .select()
        .from(epics)
        .where(and(eq(epics.id, epicId), eq(epics.productBacklogListId, productBacklogListId)))
        .limit(1);

      if (epic.length === 0) {
        return NextResponse.json({ error: 'Epic not found in the specified backlog' }, { status: 404 });
      }
    }

    const newPbi = await db
      .insert(pbis)
      .values({
        pic,
        title,
        priority,
        storyPoint: parseInt(storyPoint),
        businessValue,
        userStory,
        acceptanceCriteria,
        notes,
        epicId: epicId || null,
        productBacklogListId,
      })
      .returning();

    return NextResponse.json(newPbi[0], { status: 201 });
  } catch (error) {
    console.error('Create PBI error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
