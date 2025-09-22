'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Trash2, Plus, Eye, Download, X, Save } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { PBI, ProductBacklogList, Epic } from '@/lib/schema';

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
  const [epics, setEpics] = useState<Epic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof PBI>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Side panel state
  const [selectedPbi, setSelectedPbi] = useState<PBIWithDetails | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    pic: '',
    title: '',
    priority: 'Medium' as 'Low' | 'Medium' | 'High',
    storyPoint: '',
    businessValue: '',
    userStory: '',
    acceptanceCriteria: '',
    notes: '',
    epicId: '',
  });

  // Epic creation state
  const [isEpicDialogOpen, setIsEpicDialogOpen] = useState(false);
  const [epicFormData, setEpicFormData] = useState({
    title: '',
    description: '',
  });

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

  const fetchEpics = useCallback(async (id: string): Promise<Epic[]> => {
    const response = await fetch(`/api/epics?backlogId=${id}`);
    if (!response.ok) {
      throw new Error('Unable to load epics for this backlog.');
    }

    const data = await response.json();
    return data;
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
        const [backlogData, pbisData, epicsData] = await Promise.all([
          fetchBacklog(backlogId),
          fetchPbis(backlogId),
          fetchEpics(backlogId),
        ]);

        if (!isActive) return;

        setBacklog(backlogData);
        setPbis(pbisData);
        setEpics(epicsData);
      } catch (err) {
        if (!isActive) return;

        setBacklog(null);
        setPbis([]);
        setEpics([]);
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
  }, [backlogId, fetchBacklog, fetchPbis, fetchEpics]);

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

  // Side panel functions
  const handleViewPbi = (pbi: PBIWithDetails) => {
    setSelectedPbi(pbi);
    setIsEditing(false);
  };

  const handleEditPbi = (pbi: PBIWithDetails) => {
    setSelectedPbi(pbi);
    setIsEditing(true);
    setFormData({
      pic: pbi.pic,
      title: pbi.title,
      priority: pbi.priority,
      storyPoint: pbi.storyPoint.toString(),
      businessValue: pbi.businessValue,
      userStory: pbi.userStory,
      acceptanceCriteria: pbi.acceptanceCriteria,
      notes: pbi.notes || '',
      epicId: pbi.epicId || '',
    });
  };

  const handleCreateNewPbi = () => {
    setSelectedPbi(null);
    setIsEditing(true);
    setFormData({
      pic: '',
      title: '',
      priority: 'Medium',
      storyPoint: '',
      businessValue: '',
      userStory: '',
      acceptanceCriteria: '',
      notes: '',
      epicId: '',
    });
  };

  const handleCloseSidePanel = () => {
    setSelectedPbi(null);
    setIsEditing(false);
    setFormData({
      pic: '',
      title: '',
      priority: 'Medium',
      storyPoint: '',
      businessValue: '',
      userStory: '',
      acceptanceCriteria: '',
      notes: '',
      epicId: '',
    });
  };

  const handleSavePbi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backlogId) return;

    try {
      const url = selectedPbi ? `/api/pbis/${selectedPbi.id}` : '/api/pbis';
      const method = selectedPbi ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          storyPoint: parseInt(formData.storyPoint),
          productBacklogListId: backlogId,
          epicId: formData.epicId || null,
        }),
      });

      if (response.ok) {
        const actionText = selectedPbi ? 'updated' : 'created';
        toast.success(`PBI ${actionText} successfully`);
        await refreshPbis(backlogId);

        if (selectedPbi) {
          // Update mode - refresh selected PBI data
          setIsEditing(false);
          const updatedPbis = await fetchPbis(backlogId);
          const updatedPbi = updatedPbis.find(p => p.id === selectedPbi.id);
          if (updatedPbi) setSelectedPbi(updatedPbi);
        } else {
          // Create mode - close side panel
          handleCloseSidePanel();
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || `Failed to ${selectedPbi ? 'update' : 'create'} PBI`);
      }
    } catch (error) {
      console.error('Error saving PBI:', error);
      toast.error(`Failed to ${selectedPbi ? 'update' : 'create'} PBI. Please try again.`);
    }
  };

  // Epic creation functions
  const handleCreateEpic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backlogId) return;

    try {
      const response = await fetch('/api/epics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...epicFormData,
          productBacklogListId: backlogId,
        }),
      });

      if (response.ok) {
        toast.success('Epic created successfully');
        setIsEpicDialogOpen(false);
        setEpicFormData({ title: '', description: '' });
        // Refresh epics list
        const updatedEpics = await fetchEpics(backlogId);
        setEpics(updatedEpics);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to create epic');
      }
    } catch (error) {
      console.error('Error creating epic:', error);
      toast.error('Failed to create epic. Please try again.');
    }
  };

  const openEpicDialog = () => {
    setEpicFormData({ title: '', description: '' });
    setIsEpicDialogOpen(true);
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
        <Button variant="outline" onClick={openEpicDialog} disabled={!backlogId || !!loadError}>
          <Plus className="mr-2 h-4 w-4" />
          New Epic
        </Button>
        <Button onClick={handleCreateNewPbi} disabled={!backlogId || !!loadError}>
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
    <div className="flex h-screen">
      {/* Main Content */}
      <div className={`${selectedPbi || isEditing ? 'w-2/3' : 'w-full'} space-y-6 p-6 transition-all duration-300 overflow-hidden`}>
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
              <Button onClick={handleCreateNewPbi}>
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
                          onClick={() => handleViewPbi(pbi)}
                          className="h-8 w-8 p-0"
                          title="View PBI details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditPbi(pbi)}
                          className="h-8 w-8 p-0"
                          title="Edit PBI"
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

      {/* Side Panel */}
      {(selectedPbi || isEditing) && (
        <div className="w-1/3 border-l bg-background p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">
              {selectedPbi ? (isEditing ? 'Edit PBI' : 'PBI Details') : 'Create New PBI'}
            </h2>
            <Button variant="ghost" size="sm" onClick={handleCloseSidePanel}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {isEditing ? (
            <form onSubmit={handleSavePbi} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pic">Person in Charge</Label>
                  <Input
                    id="pic"
                    value={formData.pic}
                    onChange={(e) => setFormData({ ...formData, pic: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value: 'Low' | 'Medium' | 'High') =>
                      setFormData({ ...formData, priority: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="storyPoint">Story Points</Label>
                <Input
                  id="storyPoint"
                  type="number"
                  value={formData.storyPoint}
                  onChange={(e) => setFormData({ ...formData, storyPoint: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="epic">Epic (Optional)</Label>
                <Select
                  value={formData.epicId || "none"}
                  onValueChange={(value) => setFormData({ ...formData, epicId: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an epic (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Epic</SelectItem>
                    {epics.map((epic) => (
                      <SelectItem key={epic.id} value={epic.id}>
                        {epic.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessValue">Business Value</Label>
                <Textarea
                  id="businessValue"
                  value={formData.businessValue}
                  onChange={(e) => setFormData({ ...formData, businessValue: e.target.value })}
                  placeholder="Describe the business value and impact"
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="userStory">User Story</Label>
                <Textarea
                  id="userStory"
                  value={formData.userStory}
                  onChange={(e) => setFormData({ ...formData, userStory: e.target.value })}
                  placeholder="As [role], I want to [action], so that [benefit]"
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="acceptanceCriteria">Acceptance Criteria</Label>
                <Textarea
                  id="acceptanceCriteria"
                  value={formData.acceptanceCriteria}
                  onChange={(e) => setFormData({ ...formData, acceptanceCriteria: e.target.value })}
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  <Save className="mr-2 h-4 w-4" />
                  {selectedPbi ? 'Update PBI' : 'Create PBI'}
                </Button>
                <Button type="button" variant="outline" onClick={() => selectedPbi ? setIsEditing(false) : handleCloseSidePanel()}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold">{selectedPbi.title}</h3>
                  <Badge className={priorityColors[selectedPbi.priority]}>
                    {selectedPbi.priority}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Story Points</Label>
                    <div className="flex items-center gap-1 mt-1">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                          {selectedPbi.storyPoint}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Person in Charge</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-white">
                          {selectedPbi.pic.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm">{selectedPbi.pic}</span>
                    </div>
                  </div>
                </div>

                {selectedPbi.epicTitle && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Epic</Label>
                    <div className="mt-1">
                      <Badge variant="outline" className="border-purple-200 text-purple-700">
                        {selectedPbi.epicTitle}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Business Value</Label>
                  <p className="text-sm mt-1 leading-relaxed">{selectedPbi.businessValue}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-600">User Story</Label>
                  <p className="text-sm mt-1 leading-relaxed">{selectedPbi.userStory}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-600">Acceptance Criteria</Label>
                  <p className="text-sm mt-1 leading-relaxed whitespace-pre-wrap">
                    {selectedPbi.acceptanceCriteria}
                  </p>
                </div>

                {selectedPbi.notes && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Notes</Label>
                    <p className="text-sm mt-1 leading-relaxed whitespace-pre-wrap text-muted-foreground">
                      {selectedPbi.notes}
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <div className="text-xs text-muted-foreground">
                    <div>Created: {formatDate(selectedPbi.createdAt)}</div>
                    {selectedPbi.updatedAt !== selectedPbi.createdAt && (
                      <div>Updated: {formatDate(selectedPbi.updatedAt)}</div>
                    )}
                  </div>
                </div>
              </div>

              <Button onClick={() => setIsEditing(true)} className="w-full">
                <Edit className="mr-2 h-4 w-4" />
                Edit PBI
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Epic Creation Dialog */}
      <Dialog open={isEpicDialogOpen} onOpenChange={setIsEpicDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Epic</DialogTitle>
            <DialogDescription>
              Add a new epic to organize your backlog items in {backlog?.title || 'this backlog'}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateEpic}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="epic-title">Title</Label>
                <Input
                  id="epic-title"
                  value={epicFormData.title}
                  onChange={(e) => setEpicFormData({ ...epicFormData, title: e.target.value })}
                  placeholder="Enter epic title"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="epic-description">Description</Label>
                <Textarea
                  id="epic-description"
                  value={epicFormData.description}
                  onChange={(e) => setEpicFormData({ ...epicFormData, description: e.target.value })}
                  placeholder="Describe the epic (optional)"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEpicDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Create Epic
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
