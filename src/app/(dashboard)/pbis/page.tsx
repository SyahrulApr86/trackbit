'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Badge } from '@/components/ui/badge';
import { PBI, ProductBacklogList, Epic } from '@/lib/schema';

type PBIWithDetails = PBI & { backlogTitle: string; epicTitle?: string };

const priorityColors = {
  High: 'bg-red-100 text-red-800 border-red-200',
  Medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Low: 'bg-green-100 text-green-800 border-green-200',
};

export default function PBIsPage() {
  const [pbis, setPbis] = useState<PBIWithDetails[]>([]);
  const [backlogs, setBacklogs] = useState<ProductBacklogList[]>([]);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPbi, setEditingPbi] = useState<PBIWithDetails | null>(null);
  const [selectedBacklog, setSelectedBacklog] = useState<string>('all');
  const [selectedEpic, setSelectedEpic] = useState<string>('all');
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
    productBacklogListId: '',
  });

  useEffect(() => {
    fetchPbis();
    fetchBacklogs();
    fetchEpics();
  }, []);

  useEffect(() => {
    if (selectedBacklog && selectedBacklog !== 'all') {
      fetchEpicsForBacklog(selectedBacklog);
    }
  }, [selectedBacklog]);

  const fetchPbis = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedBacklog && selectedBacklog !== 'all') params.append('backlogId', selectedBacklog);
      if (selectedEpic && selectedEpic !== 'all') {
        if (selectedEpic === 'none') {
          params.append('epicId', 'null');
        } else {
          params.append('epicId', selectedEpic);
        }
      }

      const response = await fetch(`/api/pbis?${params}`);
      if (response.ok) {
        const data = await response.json();
        setPbis(data);
      }
    } catch (error) {
      console.error('Error fetching PBIs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBacklogs = async () => {
    try {
      const response = await fetch('/api/backlogs');
      if (response.ok) {
        const data = await response.json();
        setBacklogs(data);
      }
    } catch (error) {
      console.error('Error fetching backlogs:', error);
    }
  };

  const fetchEpics = async () => {
    try {
      const response = await fetch('/api/epics');
      if (response.ok) {
        const data = await response.json();
        setEpics(data);
      }
    } catch (error) {
      console.error('Error fetching epics:', error);
    }
  };

  const fetchEpicsForBacklog = async (backlogId: string) => {
    try {
      const response = await fetch(`/api/epics?backlogId=${backlogId}`);
      if (response.ok) {
        const data = await response.json();
        setEpics(data);
      }
    } catch (error) {
      console.error('Error fetching epics for backlog:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingPbi ? `/api/pbis/${editingPbi.id}` : '/api/pbis';
      const method = editingPbi ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchPbis();
        setIsDialogOpen(false);
        setEditingPbi(null);
        resetForm();
      }
    } catch (error) {
      console.error('Error saving PBI:', error);
    }
  };

  const handleEdit = (pbi: PBIWithDetails) => {
    setEditingPbi(pbi);
    setFormData({
      pic: pbi.pic,
      title: pbi.title,
      priority: pbi.priority,
      storyPoint: pbi.storyPoint.toString(),
      businessValue: pbi.businessValue.toString(),
      userStory: pbi.userStory,
      acceptanceCriteria: pbi.acceptanceCriteria,
      notes: pbi.notes || '',
      epicId: pbi.epicId || '',
      productBacklogListId: pbi.productBacklogListId,
    });

    if (pbi.productBacklogListId !== selectedBacklog) {
      fetchEpicsForBacklog(pbi.productBacklogListId);
    }

    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this PBI?')) return;

    try {
      const response = await fetch(`/api/pbis/${id}`, { method: 'DELETE' });
      if (response.ok) {
        await fetchPbis();
      }
    } catch (error) {
      console.error('Error deleting PBI:', error);
    }
  };

  const resetForm = () => {
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
      productBacklogListId: '',
    });
  };

  const openCreateDialog = () => {
    setEditingPbi(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const filteredEpics = epics.filter(
    epic => formData.productBacklogListId ? epic.productBacklogListId === formData.productBacklogListId : true
  );

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Product Backlog Items</h1>
          <p className="text-muted-foreground">Manage your backlog items and user stories</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} disabled={backlogs.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              New PBI
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPbi ? 'Edit PBI' : 'Create New PBI'}
              </DialogTitle>
              <DialogDescription>
                {editingPbi
                  ? 'Update the PBI details below.'
                  : 'Add a new product backlog item with all the required details.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="pic">Person in Charge</Label>
                    <Input
                      id="pic"
                      value={formData.pic}
                      onChange={(e) => setFormData({ ...formData, pic: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value: 'Low' | 'Medium' | 'High') =>
                        setFormData({ ...formData, priority: value })
                      }
                      required
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

                <div className="grid gap-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="storyPoint">Story Points</Label>
                    <Input
                      id="storyPoint"
                      type="number"
                      value={formData.storyPoint}
                      onChange={(e) => setFormData({ ...formData, storyPoint: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="businessValue">Business Value</Label>
                    <Input
                      id="businessValue"
                      type="number"
                      value={formData.businessValue}
                      onChange={(e) => setFormData({ ...formData, businessValue: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="backlog">Product Backlog</Label>
                  <Select
                    value={formData.productBacklogListId}
                    onValueChange={(value) => {
                      setFormData({ ...formData, productBacklogListId: value, epicId: '' });
                      fetchEpicsForBacklog(value);
                    }}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a backlog" />
                    </SelectTrigger>
                    <SelectContent>
                      {backlogs.map((backlog) => (
                        <SelectItem key={backlog.id} value={backlog.id}>
                          {backlog.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="epic">Epic (Optional)</Label>
                  <Select
                    value={formData.epicId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, epicId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an epic (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Epic</SelectItem>
                      {filteredEpics.map((epic) => (
                        <SelectItem key={epic.id} value={epic.id}>
                          {epic.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
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

                <div className="grid gap-2">
                  <Label htmlFor="acceptanceCriteria">Acceptance Criteria</Label>
                  <Textarea
                    id="acceptanceCriteria"
                    value={formData.acceptanceCriteria}
                    onChange={(e) => setFormData({ ...formData, acceptanceCriteria: e.target.value })}
                    rows={4}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">
                  {editingPbi ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4 items-center">
        <div className="flex gap-2">
          <Select value={selectedBacklog} onValueChange={setSelectedBacklog}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by backlog" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Backlogs</SelectItem>
              {backlogs.map((backlog) => (
                <SelectItem key={backlog.id} value={backlog.id}>
                  {backlog.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedEpic} onValueChange={setSelectedEpic}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by epic" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Epics</SelectItem>
              <SelectItem value="none">No Epic</SelectItem>
              {epics
                .filter(epic => selectedBacklog === 'all' || epic.productBacklogListId === selectedBacklog)
                .map((epic) => (
                  <SelectItem key={epic.id} value={epic.id}>
                    {epic.title}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => {
              setSelectedBacklog('all');
              setSelectedEpic('all');
              fetchPbis();
            }}
          >
            Clear Filters
          </Button>
        </div>

        <Button variant="outline" onClick={fetchPbis}>
          <Filter className="mr-2 h-4 w-4" />
          Apply Filters
        </Button>
      </div>

      <div className="grid gap-4">
        {pbis.map((pbi) => (
          <Card key={pbi.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{pbi.title}</CardTitle>
                    <Badge className={priorityColors[pbi.priority]}>{pbi.priority}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Backlog: {pbi.backlogTitle}</p>
                    {pbi.epicTitle && <p>Epic: {pbi.epicTitle}</p>}
                    <p>PIC: {pbi.pic}</p>
                    <p>Story Points: {pbi.storyPoint} | Business Value: {pbi.businessValue}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(pbi)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(pbi.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-1">User Story</h4>
                <p className="text-sm text-muted-foreground">{pbi.userStory}</p>
              </div>
              <div>
                <h4 className="font-medium mb-1">Acceptance Criteria</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{pbi.acceptanceCriteria}</p>
              </div>
              {pbi.notes && (
                <div>
                  <h4 className="font-medium mb-1">Notes</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{pbi.notes}</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Created: {new Date(pbi.createdAt).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {pbis.length === 0 && backlogs.length > 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No PBIs found with the current filters.</p>
            <Button className="mt-4" onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Create your first PBI
            </Button>
          </CardContent>
        </Card>
      )}

      {backlogs.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              You need to create a product backlog first before adding PBIs.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}