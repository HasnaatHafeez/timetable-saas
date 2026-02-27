import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useInstitution } from "@/contexts/InstitutionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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

interface Class {
  id: string;
  name: string;
  semester: string;
  section: string;
  subjects: string[];
  academicLevelId?: string;
}

type SubjectOption = { id: string; name: string };
type AcademicLevelOption = { id: string; name: string };
type SectionOption = { section: string; academicLevelId?: string };

const defaultForm = { name: "", academicLevelId: "", section: "", subjects: [] as string[] };

const ClassesPage = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [subjectOptions, setSubjectOptions] = useState<SubjectOption[]>([]);
  const [academicLevelOptions, setAcademicLevelOptions] = useState<AcademicLevelOption[]>([]);
  const [sectionOptions, setSectionOptions] = useState<SectionOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  const { campus, academicLevel } = useInstitution();

  const fetchClasses = async () => {
    try { 
      const params = new URLSearchParams();
      if (campus) params.append("campusId", campus.id);
      if (academicLevel) params.append("academicLevelId", academicLevel.id);
      const res = await api.get(`/classes${params.toString() ? "?" + params.toString() : ""}`);
      const fetched = res.data || [];
      setClasses(fetched);
    }
    catch {
      setClasses([]);
    } finally { setLoading(false); }
  };

  const fetchOptions = async () => {
    if (!campus) {
      setSubjectOptions([]);
      setAcademicLevelOptions([]);
      setSectionOptions([]);
      return;
    }

    try {
      const [subjectsRes, levelsRes, sectionsRes] = await Promise.all([
        api.get(`/subjects?campusId=${campus.id}`),
        api.get(`/academic-levels?campusId=${campus.id}`),
        api.get(`/classes?campusId=${campus.id}`),
      ]);

      setSubjectOptions((subjectsRes.data || []).map((subject: any) => ({ id: subject.id, name: subject.name })));
      setAcademicLevelOptions((levelsRes.data || []).map((level: any) => ({ id: level.id, name: level.name })));
      const uniqueSections = Array.from(
        new Map(
          (sectionsRes.data || [])
            .filter((item: Class) => item.section)
            .map((item: Class) => [`${item.academicLevelId || ""}__${item.section}`, { section: item.section, academicLevelId: item.academicLevelId }])
        ).values()
      );
      setSectionOptions(uniqueSections);
    } catch {
      setSubjectOptions([]);
      setAcademicLevelOptions([]);
      setSectionOptions([]);
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchOptions();
  }, [campus, academicLevel]);

  const getSubjectName = (subjectId: string) => {
    const found = subjectOptions.find((subject) => subject.id === subjectId);
    return found?.name || subjectId;
  };

  const getAcademicLevelName = (classItem: Class) => {
    if (classItem.semester) return classItem.semester;
    const found = academicLevelOptions.find((level) => level.id === classItem.academicLevelId);
    return found?.name || "—";
  };

  const filtered = classes.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  const filteredSectionOptions = sectionOptions
    .filter((item) => !!item.section)
    .filter((item) => !form.academicLevelId || item.academicLevelId === form.academicLevelId)
    .map((item) => item.section);

  const openAdd = () => { setEditingId(null); setForm(defaultForm); setModalOpen(true); };
  const openEdit = (c: Class) => {
    const resolvedSubjectIds = (c.subjects || []).map((value) => {
      const byId = subjectOptions.find((subject) => subject.id === value);
      if (byId) return byId.id;
      const byName = subjectOptions.find((subject) => subject.name === value);
      return byName?.id || value;
    });

    setEditingId(c.id);
    setForm({
      name: c.name,
      academicLevelId: c.academicLevelId || academicLevelOptions.find((level) => level.name === c.semester)?.id || "",
      section: c.section || "",
      subjects: resolvedSubjectIds,
    });
    setModalOpen(true);
  };

  const syncSubjectsAcrossSiblingSections = async ({
    className,
    academicLevelId,
    subjects,
    excludeId,
  }: {
    className: string;
    academicLevelId: string;
    subjects: string[];
    excludeId?: string;
  }) => {
    const normalizedName = (className || "").trim().toLowerCase();
    if (!normalizedName || !academicLevelId) return 0;

    const siblingSections = classes.filter((item) => {
      const sameName = (item.name || "").trim().toLowerCase() === normalizedName;
      const sameLevel = (item.academicLevelId || "") === academicLevelId;
      const notExcluded = !excludeId || item.id !== excludeId;
      return sameName && sameLevel && notExcluded;
    });

    if (siblingSections.length === 0) return 0;

    await Promise.all(
      siblingSections.map((item) =>
        api.put(`/classes/${item.id}`, {
          name: item.name,
          section: item.section,
          subjects,
          academicLevelId: item.academicLevelId,
          ...(campus ? { campusId: campus.id } : {}),
        })
      )
    );

    return siblingSections.length;
  };

  const handleSave = async () => {
    if (!academicLevel && !campus) {
      toast({ title: "Error", description: "Please select a campus first", variant: "destructive" });
      return;
    }

    if (!form.academicLevelId) {
      toast({ title: "Error", description: "Please select a semester (academic level)", variant: "destructive" });
      return;
    }

    if (!form.section) {
      toast({ title: "Error", description: "Please select a section", variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload = {
      name: form.name,
      section: form.section,
      subjects: form.subjects,
      academicLevelId: form.academicLevelId,
      ...(campus ? { campusId: campus.id } : {}),
    };
    try {
      if (editingId) {
        const response = await api.put(`/classes/${editingId}`, payload);
        const backendSynced = Number(response?.data?.syncedSectionsCount || 0);
        const frontendSynced = await syncSubjectsAcrossSiblingSections({
          className: form.name,
          academicLevelId: form.academicLevelId,
          subjects: form.subjects,
          excludeId: editingId,
        });
        const synced = Math.max(backendSynced, frontendSynced);
        toast({
          title: "Class updated",
          description: synced > 0 ? `Auto-synced subjects to ${synced} sibling section(s)` : undefined,
        });
      }
      else {
        const response = await api.post("/classes", payload);
        const backendSynced = Number(response?.data?.syncedSectionsCount || 0);
        const createdId = response?.data?.id || response?.data?._id;
        const frontendSynced = await syncSubjectsAcrossSiblingSections({
          className: form.name,
          academicLevelId: form.academicLevelId,
          subjects: form.subjects,
          excludeId: createdId,
        });
        const synced = Math.max(backendSynced, frontendSynced);
        toast({
          title: "Class added",
          description: synced > 0 ? `Auto-synced subjects to ${synced} sibling section(s)` : undefined,
        });
      }
      setModalOpen(false); fetchClasses();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.message || "Failed", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try { await api.delete(`/classes/${deleteId}`); toast({ title: "Class deleted" }); fetchClasses(); }
    catch { toast({ title: "Delete failed", variant: "destructive" }); }
    finally { setDeleting(false); setDeleteId(null); }
  };

  if (loading) return <SkeletonLoader type="table" count={5} />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <PageHeader title="Classes" description="Manage class sections" badge={`${classes.length}`}
        action={<Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add Class</Button>} />
      <SearchBar value={search} onChange={setSearch} placeholder="Search classes..." />

      {filtered.length === 0 ? (
        <EmptyState title="No classes found" description="Add your first class." action={<Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add Class</Button>} />
      ) : (
        <div className="rounded-lg border border-border bg-card card-shadow">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Name</TableHead><TableHead>Semester</TableHead><TableHead>Section</TableHead><TableHead>Subjects</TableHead><TableHead className="w-24">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{getAcademicLevelName(c)}</Badge>
                  </TableCell>
                  <TableCell>
                    {c.section ? <Badge variant="secondary" className="text-xs">Section {c.section}</Badge> : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(c.subjects || []).map((s) => <Badge key={s} variant="secondary" className="text-xs">{getSubjectName(s)}</Badge>)}
                      {(!c.subjects || c.subjects.length === 0) && "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
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
          <DialogHeader><DialogTitle>{editingId ? "Edit Class" : "Add Class"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Class Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Semester (Academic Level)</Label>
              <Select value={form.academicLevelId || undefined} onValueChange={(value) => setForm({ ...form, academicLevelId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  {academicLevelOptions.map((level) => (
                    <SelectItem key={level.id} value={level.id}>{level.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Section</Label>
              <Select value={form.section || undefined} onValueChange={(value) => setForm({ ...form, section: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {filteredSectionOptions.map((section) => (
                    <SelectItem key={section} value={section}>{section}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filteredSectionOptions.length === 0 && <p className="text-xs text-muted-foreground">No sections available in database. Add from Sections dashboard first.</p>}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Subjects</Label>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, subjects: subjectOptions.map((subject) => subject.id) })}>Select all</Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, subjects: [] })}>Clear</Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 rounded-md border border-border p-2 min-h-[44px]">
                {subjectOptions.map((subject) => {
                  const selected = form.subjects.includes(subject.id);
                  return (
                    <button
                      key={subject.id}
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({
                          ...prev,
                          subjects: prev.subjects.includes(subject.id)
                            ? prev.subjects.filter((item) => item !== subject.id)
                            : [...prev.subjects, subject.id],
                        }));
                      }}
                      className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:bg-accent"
                      }`}
                    >
                      {subject.name}
                    </button>
                  );
                })}
                {subjectOptions.length === 0 && <span className="text-sm text-muted-foreground">No subjects available for this campus.</span>}
              </div>
              <p className="text-xs text-muted-foreground">Subjects auto-sync to all sections with the same class name and semester.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingId ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} loading={deleting} title="Delete Class?" />
    </motion.div>
  );
};

export default ClassesPage;
