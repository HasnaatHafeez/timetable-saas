import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useInstitution } from "@/contexts/InstitutionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface Subject {
  id: string;
  name: string;
  code: string;
  creditHours: number;
  departmentId: string;
  assignedTeacher: string;
  assignedTeacherId: string;
}

type DepartmentOption = { id: string; name: string };
type TeacherOption = { id: string; name: string };

const defaultForm = {
  name: "",
  code: "",
  creditHours: "",
  departmentId: "",
  assignedTeacherId: "",
};

const SubjectsPage = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [departmentOptions, setDepartmentOptions] = useState<DepartmentOption[]>([]);
  const [teacherOptions, setTeacherOptions] = useState<TeacherOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  const { campus } = useInstitution();

  const fetchSubjects = async () => {
    try {
      const params = campus ? `?campusId=${campus.id}` : "";
      const res = await api.get(`/subjects${params}`);
      setSubjects(res.data);
    } catch { setSubjects([]); } finally { setLoading(false); }
  };

  const fetchOptions = async () => {
    if (!campus) {
      setDepartmentOptions([]);
      setTeacherOptions([]);
      return;
    }

    try {
      const [departmentsRes, teachersRes] = await Promise.all([
        api.get(`/departments?campusId=${campus.id}`),
        api.get(`/teachers?campusId=${campus.id}`),
      ]);

      setDepartmentOptions((departmentsRes.data || []).map((department: any) => ({ id: department.id, name: department.name })));
      setTeacherOptions((teachersRes.data || []).map((teacher: any) => ({ id: teacher.id, name: teacher.name })));
    } catch {
      setDepartmentOptions([]);
      setTeacherOptions([]);
    }
  };

  useEffect(() => {
    fetchSubjects();
    fetchOptions();
  }, [campus]);

  const filtered = subjects.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setEditingId(null); setForm(defaultForm); setModalOpen(true); };
  const openEdit = (s: Subject) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      code: s.code,
      creditHours: String(s.creditHours || ""),
      departmentId: s.departmentId || "",
      assignedTeacherId: s.assignedTeacherId || "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!campus) {
      toast({ title: "Error", description: "Please select a campus first", variant: "destructive" });
      return;
    }

    if (!form.departmentId) {
      toast({ title: "Error", description: "Please select a department", variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload = {
      name: form.name,
      code: form.code,
      departmentId: form.departmentId,
      teacherId: form.assignedTeacherId || undefined,
      campusId: campus.id,
      type: "THEORY",
      weeklyHours: Number(form.creditHours) || 0,
      creditHours: Number(form.creditHours) || 0,
    };
    try {
      if (editingId) { await api.put(`/subjects/${editingId}`, payload); toast({ title: "Subject updated" }); }
      else { await api.post("/subjects", payload); toast({ title: "Subject added" }); }
      setModalOpen(false);
      fetchSubjects();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.message || "Failed", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try { await api.delete(`/subjects/${deleteId}`); toast({ title: "Subject deleted" }); fetchSubjects(); }
    catch { toast({ title: "Delete failed", variant: "destructive" }); }
    finally { setDeleting(false); setDeleteId(null); }
  };

  if (loading) return <SkeletonLoader type="table" count={5} />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <PageHeader title="Subjects" description="Manage course subjects" badge={`${subjects.length}`}
        action={<Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add Subject</Button>} />
      <SearchBar value={search} onChange={setSearch} placeholder="Search subjects..." />

      {filtered.length === 0 ? (
        <EmptyState title="No subjects found" description="Add your first subject." action={<Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add Subject</Button>} />
      ) : (
        <div className="rounded-lg border border-border bg-card card-shadow">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Credits</TableHead><TableHead>Teacher</TableHead><TableHead className="w-24">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.code}</TableCell>
                  <TableCell>{s.creditHours}</TableCell>
                  <TableCell>{s.assignedTeacher || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(s.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
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
          <DialogHeader><DialogTitle>{editingId ? "Edit Subject" : "Add Subject"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Subject Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g., CS101" /></div>
            <div className="space-y-2"><Label>Credit Hours</Label><Input type="number" value={form.creditHours} onChange={(e) => setForm({ ...form, creditHours: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={form.departmentId || undefined} onValueChange={(value) => setForm({ ...form, departmentId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departmentOptions.map((department) => (
                    <SelectItem key={department.id} value={department.id}>{department.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assign Teacher</Label>
              <Select value={form.assignedTeacherId || "none"} onValueChange={(value) => setForm({ ...form, assignedTeacherId: value === "none" ? "" : value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select teacher (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No teacher assigned</SelectItem>
                  {teacherOptions.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>{teacher.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingId ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} loading={deleting} title="Delete Subject?" />
    </motion.div>
  );
};

export default SubjectsPage;
