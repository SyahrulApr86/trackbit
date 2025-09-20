'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Epic, ProductBacklogList } from '@/lib/schema';

type EpicWithBacklog = Epic & { backlogTitle: string };

export default function EpicsPage() {
  const [epics, setEpics] = useState<EpicWithBacklog[]>([]);
  const [backlogs, setBacklogs] = useState<ProductBacklogList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEpic, setEditingEpic] = useState<EpicWithBacklog | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    productBacklogListId: '',
  });

  useEffect(() => {
    fetchEpics();
    fetchBacklogs();
  }, []);

  const fetchEpics = async () => {
    try {
      const response = await fetch('/api/epics');
      if (response.ok) {
        const data = await response.json();
        setEpics(data);
      }
    } catch (error) {
      console.error('Error fetching epics:', error);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingEpic ? `/api/epics/${editingEpic.id}` : '/api/epics';
      const method = editingEpic ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchEpics();
        setIsDialogOpen(false);
        setEditingEpic(null);
        setFormData({ title: '', description: '', productBacklogListId: '' });
      }
    } catch (error) {
      console.error('Error saving epic:', error);
    }
  };

  const handleEdit = (epic: EpicWithBacklog) => {
    setEditingEpic(epic);
    setFormData({
      title: epic.title,
      description: epic.description || '',
      productBacklogListId: epic.productBacklogListId,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this epic?')) return;

    try {
      const response = await fetch(`/api/epics/${id}`, { method: 'DELETE' });
      if (response.ok) {
        await fetchEpics();
      }
    } catch (error) {
      console.error('Error deleting epic:', error);
    }
  };

  const openCreateDialog = () => {
    setEditingEpic(null);
    setFormData({ title: '', description: '', productBacklogListId: '' });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Epics</h1>
          <p className="text-muted-foreground">Manage your product epics</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} disabled={backlogs.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              New Epic
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingEpic ? 'Edit Epic' : 'Create New Epic'}
              </DialogTitle>
              <DialogDescription>
                {editingEpic
                  ? 'Update the epic details below.'
                  : 'Add a new epic to organize your backlog items.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                {!editingEpic && (
                  <div className="grid gap-2">
                    <Label htmlFor="backlog">Product Backlog</Label>
                    <Select
                      value={formData.productBacklogListId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, productBacklogListId: value })
                      }
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
                )}
              </div>
              <DialogFooter>
                <Button type="submit">
                  {editingEpic ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {epics.map((epic) => (
          <Card key={epic.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{epic.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {epic.backlogTitle}
                  </p>
                  {epic.description && (
                    <CardDescription className="mt-2">{epic.description}</CardDescription>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(epic)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(epic.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Created: {new Date(epic.createdAt).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {epics.length === 0 && backlogs.length > 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No epics created yet.</p>
            <Button className="mt-4" onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Create your first epic
            </Button>
          </CardContent>
        </Card>
      )}

      {backlogs.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              You need to create a product backlog first before adding epics.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}