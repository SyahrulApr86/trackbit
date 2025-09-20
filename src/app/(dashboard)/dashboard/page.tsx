import { getCurrentUser } from '@/lib/session';
import { db } from '@/lib/db';
import { productBacklogLists, epics, pbis } from '@/lib/schema';
import { eq, count } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) return null;

  const [backlogStats, epicStats, pbiStats] = await Promise.all([
    db
      .select({ count: count() })
      .from(productBacklogLists)
      .where(eq(productBacklogLists.userId, user.id)),
    db
      .select({ count: count() })
      .from(epics)
      .innerJoin(productBacklogLists, eq(epics.productBacklogListId, productBacklogLists.id))
      .where(eq(productBacklogLists.userId, user.id)),
    db
      .select({ count: count() })
      .from(pbis)
      .innerJoin(productBacklogLists, eq(pbis.productBacklogListId, productBacklogLists.id))
      .where(eq(productBacklogLists.userId, user.id)),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user.name}!</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Product Backlogs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{backlogStats[0]?.count || 0}</div>
            <p className="text-xs text-muted-foreground">Total backlogs created</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Epics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{epicStats[0]?.count || 0}</div>
            <p className="text-xs text-muted-foreground">Total epics defined</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PBIs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pbiStats[0]?.count || 0}</div>
            <p className="text-xs text-muted-foreground">Total backlog items</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest product backlog updates</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No recent activity to display.</p>
        </CardContent>
      </Card>
    </div>
  );
}