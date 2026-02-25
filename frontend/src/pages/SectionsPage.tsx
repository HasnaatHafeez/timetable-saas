import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useInstitution } from "@/contexts/InstitutionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import SearchBar from "@/components/SearchBar";
import EmptyState from "@/components/EmptyState";
import ConfirmDialog from "@/components/ConfirmDialog";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { motion } from "framer-motion";

type Section = {
  id: string;
  name: string;
  section: string;
  semester: string;
  academicLevelId: string;
};

type AcademicLevel = {
  id: string;
  name: string;
};

const defaultForm = {
  name: "",
  section: "",
  academicLevelId: "",
};

const SectionsPage = () => {
  const [sections, setSections] = useState<Section[]>([]);
  const [academicLevels, setAcademicLevels] = useState<AcademicLevel[]>([]);
  const [classOptions, setClassOptions] = useState<string[]>([]);
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

  const fetchData = async () => {
    try {
      if (!campus) {
        setSections([]);
        setAcademicLevels([]);
        return;
      }

      const [sectionsRes, levelsRes] = await Promise.all([
        api.get(`/classes?campusId=${campus.id}`),
        api.get(`/academic-levels?campusId=${campus.id}`),
      ]);

      const fetchedSections = sectionsRes.data || [];
      setSections(fetchedSections);
      setAcademicLevels(levelsRes.data || []);
      setClassOptions(Array.from(new Set(fetchedSections.map((item: Section) => item.name).filter(Boolean))));
    } catch {
      setSections([]);
      setAcademicLevels([]);
      setClassOptions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [campus]);

  const getAcademicLevelName = (academicLevelId: string, semester?: string) => {
    if (semester) return semester;
    const found = academicLevels.find((item) => item.id === academicLevelId);
    return found?.name || "—";
  };

  const filtered = sections.filter((item) => {
    const q = search.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.section.toLowerCase().includes(q) ||
      getAcademicLevelName(item.academicLevelId, item.semester).toLowerCase().includes(q)
    );
  });

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...defaultForm, name: classOptions[0] || "" });
    setModalOpen(true);
  };

  const openEdit = (item: Section) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      section: item.section,
      academicLevelId: item.academicLevelId,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!campus) {
      toast({ title: "Error", description: "Please select a campus first", variant: "destructive" });
      return;
    }

    if (!form.name) {
      toast({ title: "Error", description: "Please select a class", variant: "destructive" });
      return;
    }

    if (!form.section.trim()) {
      toast({ title: "Error", description: "Section is required", variant: "destructive" });
      return;
    }

    if (!form.academicLevelId) {
      toast({ title: "Error", description: "Please select an academic level", variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload = {
      campusId: campus.id,
      name: form.name,
      section: form.section.trim(),
      academicLevelId: form.academicLevelId,
    };

    try {
      if (editingId) {
        await api.put(`/classes/${editingId}`, payload);
        toast({ title: "Section updated" });
      } else {
        await api.post("/classes", payload);
        toast({ title: "Section added" });
      }
      setModalOpen(false);
      fetchData();
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
      await api.delete(`/classes/${deleteId}`);
      toast({ title: "Section deleted" });
      fetchData();
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
        title="Sections"
        description="Manage sections by class and academic level"
        badge={`${sections.length}`}
        action={<Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add Section</Button>}
      />

      <SearchBar value={search} onChange={setSearch} placeholder="Search sections..." />

      {filtered.length === 0 ? (
        <EmptyState
          title="No sections found"
          description="Add your first section for a class."
          action={<Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add Section</Button>}
        />
      ) : (
        <div className="rounded-lg border border-border bg-card card-shadow">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Academic Level</TableHead>
                <TableHead>Section</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{getAcademicLevelName(item.academicLevelId, item.semester)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">{item.section}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(item.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
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
          <DialogHeader><DialogTitle>{editingId ? "Edit Section" : "Add Section"}</DialogTitle></DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={form.name || undefined} onValueChange={(value) => setForm({ ...form, name: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classOptions.map((className) => (
                    <SelectItem key={className} value={className}>{className}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {classOptions.length === 0 && <p className="text-xs text-muted-foreground">No classes found. Add a class first from the Classes page.</p>}
            </div>

            <div className="space-y-2">
              <Label>Academic Level</Label>
              <Select value={form.academicLevelId || undefined} onValueChange={(value) => setForm({ ...form, academicLevelId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select academic level" />
                </SelectTrigger>
                <SelectContent>
                  {academicLevels.map((level) => (
                    <SelectItem key={level.id} value={level.id}>{level.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Section</Label>
              <Input
                value={form.section}
                onChange={(e) => setForm({ ...form, section: e.target.value })}
                placeholder="e.g., A"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingId ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Section?"
        description="This will permanently remove the selected section."
      />
    </motion.div>
  );
};

export default SectionsPage;
