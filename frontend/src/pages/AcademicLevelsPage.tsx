import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useInstitution } from "@/contexts/InstitutionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import SearchBar from "@/components/SearchBar";
import EmptyState from "@/components/EmptyState";
import ConfirmDialog from "@/components/ConfirmDialog";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { motion } from "framer-motion";

type AcademicLevel = {
  id: string;
  campusId: string;
  name: string;
};

const defaultForm = { name: "" };

const AcademicLevelsPage = () => {
  const [levels, setLevels] = useState<AcademicLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { campus } = useInstitution();
  const { toast } = useToast();

  const fetchLevels = async () => {
    try {
      if (!campus) {
        setLevels([]);
        return;
      }
      const res = await api.get(`/academic-levels?campusId=${campus.id}`);
      setLevels(res.data || []);
    } catch {
      setLevels([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchLevels();
  }, [campus]);

  const filtered = levels.filter((level) => level.name.toLowerCase().includes(search.toLowerCase()));

  const openAdd = () => {
    setEditingId(null);
    setForm(defaultForm);
    setModalOpen(true);
  };

  const openEdit = (level: AcademicLevel) => {
    setEditingId(level.id);
    setForm({ name: level.name });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!campus) {
      toast({ title: "Error", description: "Please select a campus first", variant: "destructive" });
      return;
    }

    if (!form.name.trim()) {
      toast({ title: "Error", description: "Academic level name is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload = { campusId: campus.id, name: form.name.trim() };

    try {
      if (editingId) {
        await api.put(`/academic-levels/${editingId}`, payload);
        toast({ title: "Academic level updated" });
      } else {
        await api.post("/academic-levels", payload);
        toast({ title: "Academic level added" });
      }
      setModalOpen(false);
      fetchLevels();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.message || "Failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/academic-levels/${deleteId}`);
      toast({ title: "Academic level deleted" });
      fetchLevels();
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  if (loading) return <SkeletonLoader type="table" count={5} />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <PageHeader
        title="Academic Levels"
        description="Manage campus academic levels"
        badge={`${levels.length}`}
        action={<Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add Academic Level</Button>}
      />

      <SearchBar value={search} onChange={setSearch} placeholder="Search academic levels..." />

      {filtered.length === 0 ? (
        <EmptyState
          title="No academic levels found"
          description="Add your first academic level to organize classes."
          action={<Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add Academic Level</Button>}
        />
      ) : (
        <div className="rounded-lg border border-border bg-card card-shadow">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((level) => (
                <TableRow key={level.id}>
                  <TableCell className="font-medium">{level.name}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(level)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(level.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Edit Academic Level" : "Add Academic Level"}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ name: e.target.value })} placeholder="e.g., Grade 10 / Semester 1" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingId ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} loading={deleting} title="Delete Academic Level?" description="This will permanently remove the selected academic level." />
    </motion.div>
  );
};

export default AcademicLevelsPage;
