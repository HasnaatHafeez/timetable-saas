import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useInstitution } from "@/contexts/InstitutionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { cn } from "@/lib/utils";

interface Teacher {
  id: string;
  name: string;
  email: string;
  phone: string;
  subjects: string[];
  timeSlotIds?: string[];
  availabilityByDay?: Record<string, string[]>;
  availability: string;
}

type SubjectOption = { id: string; name: string };
type TimeSlotOption = { id: string; startTime: string; endTime: string; isBreak?: boolean };
type WorkingDayOption = { id: string; dayName: string };

const defaultForm = { name: "", email: "", phone: "", subjects: [] as string[], availabilityByDay: {} as Record<string, string[]> };

const TeachersPage = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [subjectOptions, setSubjectOptions] = useState<SubjectOption[]>([]);
  const [timeSlotOptions, setTimeSlotOptions] = useState<TimeSlotOption[]>([]);
  const [workingDays, setWorkingDays] = useState<WorkingDayOption[]>([]);
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

  const fetchOptions = async () => {
    if (!campus) {
      setSubjectOptions([]);
      setTimeSlotOptions([]);
      setWorkingDays([]);
      return;
    }

    try {
      const [subjectsRes, timeSlotsRes, workingDaysRes] = await Promise.all([
        api.get(`/subjects?campusId=${campus.id}`),
        api.get(`/timeslots?campusId=${campus.id}`),
        api.get(`/workingdays?campusId=${campus.id}`),
      ]);

      setSubjectOptions((subjectsRes.data || []).map((subject: any) => ({ id: subject.id, name: subject.name })));
      setTimeSlotOptions(timeSlotsRes.data || []);
      setWorkingDays(workingDaysRes.data || []);
    } catch {
      setSubjectOptions([]);
      setTimeSlotOptions([]);
      setWorkingDays([]);
    }
  };

  useEffect(() => { 
    fetchTeachers(); 
    fetchOptions();
  }, [campus]);

  const getSubjectName = (subjectId: string) => {
    const found = subjectOptions.find((subject) => subject.id === subjectId);
    return found?.name || subjectId;
  };

  const getTimeSlotLabel = (timeSlotId: string) => {
    const slot = timeSlotOptions.find((item) => item.id === timeSlotId);
    if (!slot) return timeSlotId;
    return `${slot.startTime} - ${slot.endTime}${slot.isBreak ? " (Break)" : ""}`;
  };

  const getTeacherTimeSlotIds = (teacher: Teacher) => {
    const fromAvailabilityByDay = Object.values(teacher.availabilityByDay || {}).flat();
    const fromFlatIds = teacher.timeSlotIds || [];
    return Array.from(new Set([...fromAvailabilityByDay, ...fromFlatIds]));
  };

  const getWorkingDayName = (dayId: string) => {
    const day = workingDays.find((item) => item.id === dayId);
    return day?.dayName || dayId;
  };

  const getTeacherDayTimeLabels = (teacher: Teacher) => {
    const availabilityByDay = teacher.availabilityByDay || {};
    const labels = Object.entries(availabilityByDay).flatMap(([dayId, slotIds]) => {
      const dayName = getWorkingDayName(dayId);
      return (slotIds || []).map((slotId) => `${dayName} • ${getTimeSlotLabel(slotId)}`);
    });

    if (labels.length > 0) return labels;
    return getTeacherTimeSlotIds(teacher).map((slotId) => getTimeSlotLabel(slotId));
  };

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
      phone: t.phone || "",
      subjects: t.subjects || [],
      availabilityByDay: t.availabilityByDay || {},
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!campus) {
      toast({ title: "Error", description: "Please select a campus first", variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload = {
      ...form,
      timeSlotIds: Array.from(new Set(Object.values(form.availabilityByDay || {}).flat())),
      campusId: campus.id,
      maxPerDay: 6,
      maxPerWeek: 30,
    };
    try {
      if (editingId) {
        await api.put(`/teachers/${editingId}`, payload);
        toast({ title: "Teacher updated" });
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
                <TableHead>Subjects</TableHead>
                <TableHead>Time Slots</TableHead>
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
                    <div className="flex flex-wrap gap-1">
                      {(t.subjects || []).map((s) => (
                        <Badge key={s} variant="secondary" className="text-xs">{getSubjectName(s)}</Badge>
                      ))}
                      {(!t.subjects || t.subjects.length === 0) && "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {getTeacherDayTimeLabels(t).map((label) => (
                        <Badge key={`${t.id}-${label}`} variant="outline" className="text-xs">{label}</Badge>
                      ))}
                      {getTeacherDayTimeLabels(t).length === 0 && "—"}
                    </div>
                  </TableCell>
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
        <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Teacher" : "Add Teacher"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto pr-1 max-h-[72vh]">
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Subjects</Label>
              <div className="rounded-md border border-input p-3 space-y-3">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setForm({ ...form, subjects: subjectOptions.map((subject) => subject.id) })}
                  >
                    Select all
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setForm({ ...form, subjects: [] })}
                  >
                    Clear
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {subjectOptions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No subjects found. Add subjects first.</p>
                  ) : (
                    subjectOptions.map((subject) => {
                      const selected = form.subjects.includes(subject.id);
                      return (
                        <Button
                          key={subject.id}
                          type="button"
                          variant={selected ? "default" : "outline"}
                          size="sm"
                          className={cn("h-8", !selected && "text-muted-foreground")}
                          onClick={() => {
                            const nextSubjects = selected
                              ? form.subjects.filter((id) => id !== subject.id)
                              : [...form.subjects, subject.id];
                            setForm({ ...form, subjects: nextSubjects });
                          }}
                        >
                          {subject.name}
                        </Button>
                      );
                    })
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Click subjects to add/remove them for this teacher.</p>
            </div>
            <div className="space-y-2">
              <Label>Time Slots by Working Day</Label>
              <div className="rounded-md border border-input p-3 space-y-4">
                {workingDays.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No working days found. Add working days first.</p>
                ) : (
                  workingDays.map((day) => (
                    <div key={day.id} className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{day.dayName}</p>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => {
                              setForm({
                                ...form,
                                availabilityByDay: {
                                  ...form.availabilityByDay,
                                  [day.id]: timeSlotOptions.map((slot) => slot.id),
                                },
                              });
                            }}
                          >
                            Select all
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => {
                              setForm({
                                ...form,
                                availabilityByDay: {
                                  ...form.availabilityByDay,
                                  [day.id]: [],
                                },
                              });
                            }}
                          >
                            Clear
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {timeSlotOptions.map((slot) => {
                          const selected = (form.availabilityByDay?.[day.id] || []).includes(slot.id);
                          const label = `${slot.startTime} - ${slot.endTime}${slot.isBreak ? " (Break)" : ""}`;
                          return (
                            <Button
                              key={`${day.id}-${slot.id}`}
                              type="button"
                              variant={selected ? "default" : "outline"}
                              size="sm"
                              className={cn("h-8", !selected && "text-muted-foreground")}
                              onClick={() => {
                                const daySlots = form.availabilityByDay?.[day.id] || [];
                                const nextDaySlots = daySlots.includes(slot.id)
                                  ? daySlots.filter((id) => id !== slot.id)
                                  : [...daySlots, slot.id];

                                setForm({
                                  ...form,
                                  availabilityByDay: {
                                    ...form.availabilityByDay,
                                    [day.id]: nextDaySlots,
                                  },
                                });
                              }}
                            >
                              {label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs text-muted-foreground">Select day and time together for teacher availability.</p>
            </div>
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
