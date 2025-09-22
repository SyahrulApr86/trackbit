'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Trash2, Plus, Eye, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PBI, ProductBacklogList } from '@/lib/schema';

type PBIWithDetails = PBI & { epicTitle?: string; backlogTitle?: string };
type PBIResponse = Omit<PBIWithDetails, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
};
type ProductBacklogResponse = Omit<ProductBacklogList, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
};

const priorityColors: Record<PBI['priority'], string> = {
  High: 'bg-red-100 text-red-800 border-red-200',
  Medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Low: 'bg-green-100 text-green-800 border-green-200',
};

const priorityOrder: Record<PBI['priority'], number> = {
  High: 0,
  Medium: 1,
  Low: 2,
};

const formatDate = (value: Date | string) =>
  (value instanceof Date ? value : new Date(value)).toLocaleDateString();

const formatDateTime = (value: Date | string) =>
  (value instanceof Date ? value : new Date(value)).toLocaleString();

export default function BacklogPBIsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const backlogId = params?.id;

  const [backlog, setBacklog] = useState<ProductBacklogList | null>(null);
  const [pbis, setPbis] = useState<PBIWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof PBI>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const fetchBacklog = useCallback(
    async (id: string): Promise<ProductBacklogList> => {
      const response = await fetch(`/api/backlogs/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Backlog not found or you do not have access to it.');
        }

        throw new Error('Unable to load backlog details. Please try again.');
      }

      const data: ProductBacklogResponse = await response.json();
      return {
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      } as ProductBacklogList;
    },
    []
  );

  const fetchPbis = useCallback(async (id: string): Promise<PBIWithDetails[]> => {
    const response = await fetch(`/api/pbis?backlogId=${id}`);
    if (!response.ok) {
      throw new Error('Unable to load PBIs for this backlog.');
    }

    const data: PBIResponse[] = await response.json();

    return data.map((item) => ({
      ...item,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    })) as PBIWithDetails[];
  }, []);

  useEffect(() => {
    if (!backlogId) {
      setLoadError('Missing backlog identifier.');
      setIsLoading(false);
      return;
    }

    let isActive = true;

    const loadData = async () => {
      setIsLoading(true);
      setLoadError(null);
      setActionError(null);

      try {
        const [backlogData, pbisData] = await Promise.all([
          fetchBacklog(backlogId),
          fetchPbis(backlogId),
        ]);

        if (!isActive) return;

        setBacklog(backlogData);
        setPbis(pbisData);
      } catch (err) {
        if (!isActive) return;

        setBacklog(null);
        setPbis([]);
        setLoadError(err instanceof Error ? err.message : 'Failed to load backlog details.');
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isActive = false;
    };
  }, [backlogId, fetchBacklog, fetchPbis]);

  const handleSort = (field: keyof PBI) => {
    if (sortField === field) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const refreshPbis = useCallback(
    async (id: string) => {
      try {
        const refreshed = await fetchPbis(id);
        setPbis(refreshed);
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : 'Failed to refresh the PBI list.'
        );
      }
    },
    [fetchPbis]
  );

  const handleDelete = async (pbiId: string) => {
    if (!backlogId) return;
    if (!confirm('Are you sure you want to delete this PBI?')) return;

    try {
      setActionError(null);

      const response = await fetch(`/api/pbis/${pbiId}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Failed to delete the PBI. Please try again.');
      }

      await refreshPbis(backlogId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete the PBI.');
    }
  };

  const sortedPbis = useMemo(() => {
    const items = [...pbis];

    return items.sort((a, b) => {
      if (sortField === 'priority') {
        return sortDirection === 'asc'
          ? priorityOrder[a.priority] - priorityOrder[b.priority]
          : priorityOrder[b.priority] - priorityOrder[a.priority];
      }

      const aValue = a[sortField];
      const bValue = b[sortField];

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      if (aValue instanceof Date && bValue instanceof Date) {
        return sortDirection === 'asc'
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return sortDirection === 'asc'
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });
  }, [pbis, sortField, sortDirection]);

  const truncateText = (value: string | null | undefined, maxLength = 60) => {
    if (!value) return 'N/A';
    return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`;
  };

  const renderSortIndicator = (field: keyof PBI) => {
    if (sortField !== field) return null;

    return (
      <span className="ml-1 text-xs text-muted-foreground">
        {sortDirection === 'asc' ? '^' : 'v'}
      </span>
    );
  };

  const buildPbiQuery = (pbiId?: string) => {
    if (!backlogId) return '';
    const params = new URLSearchParams({ backlogId });
    if (pbiId) params.set('pbiId', pbiId);
    return params.toString();
  };

  const openPbisWorkspace = (pbiId?: string) => {
    const query = buildPbiQuery(pbiId);
    if (!query) return;
    router.push(`/pbis?${query}`);
  };

  const exportToExcel = () => {
    if (!backlog || sortedPbis.length === 0) return;

    // Prepare data for Excel export
    const exportData = sortedPbis.map((pbi, index) => ({
      'No.': index + 1,
      'Title': pbi.title,
      'Priority': pbi.priority,
      'Story Points': pbi.storyPoint,
      'PIC': pbi.pic,
      'Epic': pbi.epicTitle || 'No Epic',
      'Business Value': pbi.businessValue,
      'User Story': pbi.userStory,
      'Acceptance Criteria': pbi.acceptanceCriteria,
      'Notes': pbi.notes || '',
      'Created Date': formatDate(pbi.createdAt),
      'Updated Date': formatDate(pbi.updatedAt)
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    const colWidths = [
      { wch: 5 },   // No.
      { wch: 30 },  // Title
      { wch: 10 },  // Priority
      { wch: 12 },  // Story Points
      { wch: 15 },  // PIC
      { wch: 20 },  // Epic
      { wch: 40 },  // Business Value
      { wch: 50 },  // User Story
      { wch: 50 },  // Acceptance Criteria
      { wch: 30 },  // Notes
      { wch: 12 },  // Created Date
      { wch: 12 }   // Updated Date
    ];
    ws['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Product Backlog Items');

    // Generate filename with backlog title and current date
    const fileName = `${backlog.title.replace(/[^a-zA-Z0-9]/g, '_')}_PBIs_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Save file
    XLSX.writeFile(wb, fileName);
  };

  const goBack = () => {
    router.push('/backlogs');
  };

  const header = (
    <div className="flex items-center gap-4">
      <Button variant="ghost" onClick={goBack}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      <div className="flex-1">
        <h1 className="text-3xl font-bold">{backlog?.title ?? 'Product Backlog'}</h1>
        <p className="text-muted-foreground">
          {backlog?.description || 'Review the PBIs assigned to this backlog.'}
        </p>
        {backlog?.updatedAt && (
          <p className="text-xs text-muted-foreground">
            Last updated {formatDateTime(backlog.updatedAt)}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={exportToExcel}
          disabled={!backlog || sortedPbis.length === 0 || !!loadError}
        >
          <Download className="mr-2 h-4 w-4" />
          Export to Excel
        </Button>
        <Button onClick={() => openPbisWorkspace()} disabled={!backlogId || !!loadError}>
          <Plus className="mr-2 h-4 w-4" />
          New PBI
        </Button>
      </div>
    </div>
  );

  if (!backlogId) {
    return (
      <div className="space-y-6">
        {header}
        <Card>
          <CardContent className="flex min-h-[220px] flex-col items-center justify-center text-sm text-muted-foreground">
            Missing backlog identifier in the URL.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {header}
        <Card>
          <CardContent className="flex min-h-[320px] flex-col items-center justify-center text-sm text-muted-foreground">
            Loading backlog items...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        {header}
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <p className="text-sm text-red-600">{loadError}</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={goBack}>
                Back to backlogs
              </Button>
              <Button onClick={() => router.refresh()}>Try again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Product Backlog Items
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {actionError && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {actionError}
            </div>
          )}

          {sortedPbis.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center text-sm text-muted-foreground">
              <p>No PBIs found for this backlog yet.</p>
              <Button onClick={() => openPbisWorkspace()}>
                <Plus className="mr-2 h-4 w-4" />
                Create the first PBI
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => handleSort('title')}
                  >
                    <span className="flex items-center">
                      Title
                      {renderSortIndicator('title')}
                    </span>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => handleSort('priority')}
                  >
                    <span className="flex items-center">
                      Priority
                      {renderSortIndicator('priority')}
                    </span>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none text-center hover:bg-muted/50"
                    onClick={() => handleSort('storyPoint')}
                  >
                    <span className="flex items-center justify-center">
                      Story Points
                      {renderSortIndicator('storyPoint')}
                    </span>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => handleSort('pic')}
                  >
                    <span className="flex items-center">
                      PIC
                      {renderSortIndicator('pic')}
                    </span>
                  </TableHead>
                  <TableHead>Epic</TableHead>
                  <TableHead>Business Value</TableHead>
                  <TableHead>User Story</TableHead>
                  <TableHead
                    className="cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => handleSort('createdAt')}
                  >
                    <span className="flex items-center">
                      Created
                      {renderSortIndicator('createdAt')}
                    </span>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPbis.map((pbi) => (
                  <TableRow key={pbi.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <div className="max-w-xs">
                        <div className="font-semibold">{pbi.title}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={priorityColors[pbi.priority]}>
                        {pbi.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700">
                        {pbi.storyPoint}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-xs font-medium text-white">
                          {pbi.pic.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm">{pbi.pic}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {pbi.epicTitle ? (
                        <Badge variant="outline" className="border-purple-200 text-purple-700">
                          {pbi.epicTitle}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">No epic</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="text-sm text-muted-foreground">
                        {truncateText(pbi.businessValue)}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="text-sm text-muted-foreground">
                        {truncateText(pbi.userStory)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(pbi.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openPbisWorkspace(pbi.id)}
                          className="h-8 w-8 p-0"
                          title="View in PBIs workspace"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openPbisWorkspace(pbi.id)}
                          className="h-8 w-8 p-0"
                          title="Edit in PBIs workspace"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(pbi.id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          title="Delete PBI"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
