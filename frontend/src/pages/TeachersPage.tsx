import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useInstitution } from "@/contexts/InstitutionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import SearchBar from "@/components/SearchBar";
import EmptyState from "@/components/EmptyState";
import ConfirmDialog from "@/components/ConfirmDialog";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { motion } from "framer-motion";

interface Teacher {
  id: string;
  name: string;
  email: string;
  phone: string;
  campusId?: string;
}

const defaultForm = { name: "", email: "", password: "", phone: "", campusId: "" };

const TeachersPage = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  const { campus } = useInstitution();

  const fetchTeachers = async () => {
    try {
      const params = campus ? `?campusId=${campus.id}` : "";
      const res = await api.get(`/teachers${params}`);
      setTeachers(res.data);
    } catch {
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchTeachers(); 
  }, [campus]);

  const filtered = teachers.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditingId(null);
    setForm(defaultForm);
    setModalOpen(true);
  };

  const openEdit = (t: Teacher) => {
    setEditingId(t.id);
    setForm({
      name: t.name,
      email: t.email,
      password: "",
      phone: t.phone || "",
      campusId: t.campusId || "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const resolvedCampusId = campus?.id || form.campusId;
    if (!resolvedCampusId) {
      toast({ title: "Error", description: "Please select a campus first", variant: "destructive" });
      return;
    }

    if (!editingId) {
      const rawPassword = String(form.password || "");
      if (!rawPassword || rawPassword.length < 6) {
        toast({ title: "Error", description: "Password is required and must be at least 6 characters", variant: "destructive" });
        return;
      }
    } else if (form.password && String(form.password).length < 6) {
      toast({ title: "Error", description: "Reset password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload = {
      name: form.name,
      email: form.email,
      ...(form.password ? { password: form.password } : {}),
      phone: form.phone,
      campusId: resolvedCampusId,
    };
    try {
      if (editingId) {
        await api.put(`/teachers/${editingId}`, payload);
        toast({ title: form.password ? "Teacher updated and password reset" : "Teacher updated" });
      } else {
        await api.post("/teachers", payload);
        toast({ title: "Teacher added" });
      }
      setModalOpen(false);
      fetchTeachers();
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
      await api.delete(`/teachers/${deleteId}`);
      toast({ title: "Teacher deleted" });
      fetchTeachers();
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
        title="Teachers"
        description="Manage your teaching staff"
        badge={`${teachers.length}`}
        action={<Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add Teacher</Button>}
      />

      <SearchBar value={search} onChange={setSearch} placeholder="Search teachers..." />

      {filtered.length === 0 ? (
        <EmptyState title="No teachers found" description="Add your first teacher to get started." action={<Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add Teacher</Button>} />
      ) : (
        <div className="rounded-lg border border-border bg-card card-shadow">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>{t.email}</TableCell>
                  <TableCell>{t.phone || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(t.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Teacher" : "Add Teacher"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            {!editingId && <div className="space-y-2"><Label>Password</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /><p className="text-xs text-muted-foreground">Minimum 6 characters.</p></div>}
            {editingId && <div className="space-y-2"><Label>Reset Password (optional)</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Leave blank to keep current password" /><p className="text-xs text-muted-foreground">Minimum 6 characters if provided.</p></div>}
            <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            {!campus && <div className="space-y-2"><Label>Campus ID</Label><Input value={form.campusId} onChange={(e) => setForm({ ...form, campusId: e.target.value })} placeholder="paste campus id" /></div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} loading={deleting} title="Delete Teacher?" description="This will permanently remove this teacher." />
    </motion.div>
  );
};

export default TeachersPage;
