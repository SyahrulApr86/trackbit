import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { epics, productBacklogLists } from '@/lib/schema';
import { getCurrentUser } from '@/lib/session';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const backlogId = searchParams.get('backlogId');

    let whereClause = eq(productBacklogLists.userId, user.id);

    if (backlogId) {
      whereClause = and(whereClause, eq(epics.productBacklogListId, backlogId))!;
    }

    const result = await db
      .select({
        id: epics.id,
        title: epics.title,
        description: epics.description,
        productBacklogListId: epics.productBacklogListId,
        createdAt: epics.createdAt,
        updatedAt: epics.updatedAt,
        backlogTitle: productBacklogLists.title,
      })
      .from(epics)
      .innerJoin(productBacklogLists, eq(epics.productBacklogListId, productBacklogLists.id))
      .where(whereClause)
      .orderBy(epics.updatedAt);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get epics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, description, productBacklogListId } = await request.json();

    if (!title || !productBacklogListId) {
      return NextResponse.json({ error: 'Title and backlog list are required' }, { status: 400 });
    }

    const backlog = await db
      .select()
      .from(productBacklogLists)
      .where(eq(productBacklogLists.id, productBacklogListId))
      .limit(1);

    if (backlog.length === 0 || backlog[0].userId !== user.id) {
      return NextResponse.json({ error: 'Backlog not found' }, { status: 404 });
    }

    const newEpic = await db
      .insert(epics)
      .values({
        title,
        description,
        productBacklogListId,
      })
      .returning();

    return NextResponse.json(newEpic[0], { status: 201 });
  } catch (error) {
    console.error('Create epic error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}