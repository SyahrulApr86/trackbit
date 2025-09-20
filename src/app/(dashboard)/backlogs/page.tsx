'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
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
import { ProductBacklogList } from '@/lib/schema';

export default function BacklogsPage() {
  const router = useRouter();
  const [backlogs, setBacklogs] = useState<ProductBacklogList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBacklog, setEditingBacklog] = useState<ProductBacklogList | null>(null);
  const [formData, setFormData] = useState({ title: '', description: '' });

  useEffect(() => {
    fetchBacklogs();
  }, []);

  const fetchBacklogs = async () => {
    try {
      const response = await fetch('/api/backlogs');
      if (response.ok) {
        const data = await response.json();
        setBacklogs(data);
      }
    } catch (error) {
      console.error('Error fetching backlogs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingBacklog ? `/api/backlogs/${editingBacklog.id}` : '/api/backlogs';
      const method = editingBacklog ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchBacklogs();
        setIsDialogOpen(false);
        setEditingBacklog(null);
        setFormData({ title: '', description: '' });
      }
    } catch (error) {
      console.error('Error saving backlog:', error);
    }
  };

  const handleEdit = (backlog: ProductBacklogList) => {
    setEditingBacklog(backlog);
    setFormData({ title: backlog.title, description: backlog.description || '' });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this backlog?')) return;

    try {
      const response = await fetch(`/api/backlogs/${id}`, { method: 'DELETE' });
      if (response.ok) {
        await fetchBacklogs();
      }
    } catch (error) {
      console.error('Error deleting backlog:', error);
    }
  };

  const openCreateDialog = () => {
    setEditingBacklog(null);
    setFormData({ title: '', description: '' });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Product Backlogs</h1>
          <p className="text-muted-foreground">Manage your product backlog lists</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              New Backlog
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingBacklog ? 'Edit Backlog' : 'Create New Backlog'}
              </DialogTitle>
              <DialogDescription>
                {editingBacklog
                  ? 'Update the backlog details below.'
                  : 'Add a new product backlog list to organize your work.'}
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
              </div>
              <DialogFooter>
                <Button type="submit">
                  {editingBacklog ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {backlogs.map((backlog) => (
          <Card key={backlog.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{backlog.title}</CardTitle>
                  {backlog.description && (
                    <CardDescription className="mt-2">{backlog.description}</CardDescription>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/backlogs/${backlog.id}`)}
                    title="View PBIs"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(backlog)}
                    title="Edit backlog"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(backlog.id)}
                    title="Delete backlog"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Created: {new Date(backlog.createdAt).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {backlogs.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No product backlogs created yet.</p>
            <Button className="mt-4" onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Create your first backlog
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}