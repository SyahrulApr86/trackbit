import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { productBacklogLists } from '@/lib/schema';
import { getCurrentUser } from '@/lib/session';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const backlog = await db
      .select()
      .from(productBacklogLists)
      .where(
        and(
          eq(productBacklogLists.id, id),
          eq(productBacklogLists.userId, user.id)
        )
      )
      .limit(1);

    if (backlog.length === 0) {
      return NextResponse.json({ error: 'Backlog not found' }, { status: 404 });
    }

    return NextResponse.json(backlog[0]);
  } catch (error) {
    console.error('Get backlog error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
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

    const updatedBacklog = await db
      .update(productBacklogLists)
      .set({
        title,
        description,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(productBacklogLists.id, id),
          eq(productBacklogLists.userId, user.id)
        )
      )
      .returning();

    if (updatedBacklog.length === 0) {
      return NextResponse.json({ error: 'Backlog not found' }, { status: 404 });
    }

    return NextResponse.json(updatedBacklog[0]);
  } catch (error) {
    console.error('Update backlog error:', error);
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

    const deletedBacklog = await db
      .delete(productBacklogLists)
      .where(
        and(
          eq(productBacklogLists.id, id),
          eq(productBacklogLists.userId, user.id)
        )
      )
      .returning();

    if (deletedBacklog.length === 0) {
      return NextResponse.json({ error: 'Backlog not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Backlog deleted successfully' });
  } catch (error) {
    console.error('Delete backlog error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
