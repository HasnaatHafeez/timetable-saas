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

type WorkingDay = {
  id: string;
  campusId: string;
  dayName: string;
};

const defaultForm = { dayName: "" };

const WorkingDaysPage = () => {
  const [workingDays, setWorkingDays] = useState<WorkingDay[]>([]);
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

  const fetchWorkingDays = async () => {
    try {
      if (!campus) {
        setWorkingDays([]);
        return;
      }
      const res = await api.get(`/workingdays?campusId=${campus.id}`);
      setWorkingDays(res.data || []);
    } catch {
      setWorkingDays([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchWorkingDays();
  }, [campus]);

  const filtered = workingDays.filter((day) => day.dayName.toLowerCase().includes(search.toLowerCase()));

  const openAdd = () => {
    setEditingId(null);
    setForm(defaultForm);
    setModalOpen(true);
  };

  const openEdit = (day: WorkingDay) => {
    setEditingId(day.id);
    setForm({ dayName: day.dayName });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!campus) {
      toast({ title: "Error", description: "Please select a campus first", variant: "destructive" });
      return;
    }

    if (!form.dayName.trim()) {
      toast({ title: "Error", description: "Day name is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload = { campusId: campus.id, dayName: form.dayName.trim() };

    try {
      if (editingId) {
        await api.put(`/workingdays/${editingId}`, payload);
        toast({ title: "Working day updated" });
      } else {
        await api.post("/workingdays", payload);
        toast({ title: "Working day added" });
      }
      setModalOpen(false);
      fetchWorkingDays();
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
      await api.delete(`/workingdays/${deleteId}`);
      toast({ title: "Working day deleted" });
      fetchWorkingDays();
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
        title="Working Days"
        description="Manage campus working days"
        badge={`${workingDays.length}`}
        action={<Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add Working Day</Button>}
      />

      <SearchBar value={search} onChange={setSearch} placeholder="Search working days..." />

      {filtered.length === 0 ? (
        <EmptyState
          title="No working days found"
          description="Add your first working day to configure scheduling."
          action={<Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add Working Day</Button>}
        />
      ) : (
        <div className="rounded-lg border border-border bg-card card-shadow">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day Name</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((day) => (
                <TableRow key={day.id}>
                  <TableCell className="font-medium">{day.dayName}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(day)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(day.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
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
          <DialogHeader><DialogTitle>{editingId ? "Edit Working Day" : "Add Working Day"}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Day Name</Label>
            <Input value={form.dayName} onChange={(e) => setForm({ dayName: e.target.value })} placeholder="e.g., Monday" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingId ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} loading={deleting} title="Delete Working Day?" description="This will permanently remove the selected working day." />
    </motion.div>
  );
};

export default WorkingDaysPage;
