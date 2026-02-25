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

type Teacher = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subjects?: string[];
  timeSlotIds?: string[];
  availabilityByDay?: Record<string, string[]>;
  availability?: string;
  campusId?: string;
};

type SubjectOption = { id: string; name: string };
type TimeSlotOption = { id: string; startTime: string; endTime: string; isBreak?: boolean };
type WorkingDayOption = { id: string; dayName: string };

type Staff = {
  id: string;
  userId: string;
  name: string;
  email: string;
  campusId?: string | null;
};

const defaultTeacherForm = { name: "", email: "", phone: "", subjects: [] as string[], availabilityByDay: {} as Record<string, string[]>, campusId: "" };
const defaultStaffForm = { name: "", email: "", password: "", campusId: "" };

const UsersPage = () => {
  const [tab, setTab] = useState<"teachers" | "staff">("teachers");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Teacher modal
  const [tModalOpen, setTModalOpen] = useState(false);
  const [tEditingId, setTEditingId] = useState<string | null>(null);
  const [tForm, setTForm] = useState(defaultTeacherForm);
  const [subjectOptions, setSubjectOptions] = useState<SubjectOption[]>([]);
  const [timeSlotOptions, setTimeSlotOptions] = useState<TimeSlotOption[]>([]);
  const [workingDays, setWorkingDays] = useState<WorkingDayOption[]>([]);
  const [tSaving, setTSaving] = useState(false);
  const [tDeleteId, setTDeleteId] = useState<string | null>(null);
  const [tDeleting, setTDeleting] = useState(false);

  // Staff modal
  const [sModalOpen, setSModalOpen] = useState(false);
  const [sEditingId, setSEditingId] = useState<string | null>(null);
  const [sForm, setSForm] = useState(defaultStaffForm);
  const [sSaving, setSSaving] = useState(false);
  const [sDeleteId, setSDeleteId] = useState<string | null>(null);
  const [sDeleting, setSDeleting] = useState(false);

  const { toast } = useToast();
  const { campus, institution } = useInstitution();

  const fetchTeachers = async () => {
    try {
      const params = campus ? `?campusId=${campus.id}` : "";
      const res = await api.get(`/teachers${params}`);
      setTeachers(res.data || []);
    } catch (err) {
      setTeachers([]);
    }
  };

  const fetchStaff = async () => {
    if (!institution) return setStaff([]);
    try {
      const res = await api.get(`/staff?institutionId=${institution.id}`);
      setStaff(res.data || []);
    } catch (err) {
      setStaff([]);
    }
  };

  const fetchTeacherOptions = async (campusId?: string) => {
    if (!campusId) {
      setSubjectOptions([]);
      setTimeSlotOptions([]);
      setWorkingDays([]);
      return;
    }

    try {
      const [subjectsRes, timeSlotsRes, workingDaysRes] = await Promise.all([
        api.get(`/subjects?campusId=${campusId}`),
        api.get(`/timeslots?campusId=${campusId}`),
        api.get(`/workingdays?campusId=${campusId}`),
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
    setLoading(true);
    Promise.allSettled([fetchTeachers(), fetchStaff()]).then(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campus, institution]);

  useEffect(() => {
    fetchTeacherOptions(campus?.id);
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

  const filteredTeachers = teachers.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()) || t.email.toLowerCase().includes(search.toLowerCase()));
  const filteredStaff = staff.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()));

  // Teacher handlers
  const openAddTeacher = () => { 
    setTEditingId(null); 
    setTForm(defaultTeacherForm); 
    fetchTeacherOptions(campus?.id);
    setTModalOpen(true); 
    setTab("teachers"); 
  };
  const openEditTeacher = (t: Teacher) => { 
    setTEditingId(t.id); 
    const resolvedCampusId = t.campusId || campus?.id;
    setTForm({ 
      name: t.name, 
      email: t.email, 
      phone: t.phone || "", 
      subjects: t.subjects || [], 
      availabilityByDay: t.availabilityByDay || {},
      campusId: t.campusId || "" 
    }); 
    fetchTeacherOptions(resolvedCampusId);
    setTModalOpen(true); 
    setTab("teachers"); 
  };

  const handleSaveTeacher = async () => {
    const resolvedCampusId = campus?.id || tForm.campusId;
    if (!resolvedCampusId) {
      toast({ title: "Error", description: "Select a campus first or provide Campus ID", variant: "destructive" });
      return;
    }

    setTSaving(true);
    const payload = {
      ...tForm,
      timeSlotIds: Array.from(new Set(Object.values(tForm.availabilityByDay || {}).flat())),
      campusId: resolvedCampusId,
      maxPerDay: 6,
      maxPerWeek: 30,
    };
    try {
      if (tEditingId) {
        await api.put(`/teachers/${tEditingId}`, payload);
        toast({ title: "Teacher updated" });
      } else {
        await api.post(`/teachers`, payload);
        toast({ title: "Teacher created" });
      }
      setTModalOpen(false);
      fetchTeachers();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.message || "Failed", variant: "destructive" });
    } finally { setTSaving(false); }
  };

  const handleDeleteTeacher = async () => {
    if (!tDeleteId) return;
    setTDeleting(true);
    try {
      await api.delete(`/teachers/${tDeleteId}`);
      toast({ title: "Teacher deleted" });
      fetchTeachers();
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    } finally { setTDeleting(false); setTDeleteId(null); }
  };

  // Staff handlers
  const openAddStaff = () => { setSEditingId(null); setSForm(defaultStaffForm); setSModalOpen(true); setTab("staff"); };
  const openEditStaff = (s: Staff) => { setSEditingId(s.id); setSForm({ name: s.name, email: s.email, password: "", campusId: s.campusId || "" }); setSModalOpen(true); setTab("staff"); };

  const handleSaveStaff = async () => {
    if (!institution) { toast({ title: "Error", description: "Select an institution first", variant: "destructive" }); return; }
    setSSaving(true);
    try {
      if (sEditingId) {
        await api.put(`/staff/${sEditingId}`, { name: sForm.name, email: sForm.email, campusId: sForm.campusId || null });
        toast({ title: "Staff updated" });
      } else {
        await api.post(`/staff/create-with-user`, { name: sForm.name, email: sForm.email, password: sForm.password || undefined, institutionId: institution.id, campusId: sForm.campusId || undefined });
        toast({ title: "Staff created" });
      }
      setSModalOpen(false);
      fetchStaff();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.message || "Failed", variant: "destructive" });
    } finally { setSSaving(false); }
  };

  const handleDeleteStaff = async () => {
    if (!sDeleteId) return;
    setSDeleting(true);
    try {
      await api.delete(`/staff/${sDeleteId}`);
      toast({ title: "Staff deleted" });
      fetchStaff();
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    } finally { setSDeleting(false); setSDeleteId(null); }
  };

  if (loading) return <SkeletonLoader type="table" count={5} />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <PageHeader title="Users" description="Manage teachers and staff for your institution" badge={`${teachers.length + staff.length}`} action={tab === "teachers" ? <Button onClick={openAddTeacher}><Plus className="mr-2 h-4 w-4"/>Add Teacher</Button> : <Button onClick={openAddStaff}><Plus className="mr-2 h-4 w-4"/>Add Staff</Button>} />

      <div className="flex gap-2">
        <Button variant={tab === "teachers" ? "default" : "ghost"} onClick={() => setTab("teachers")}>Teachers</Button>
        <Button variant={tab === "staff" ? "default" : "ghost"} onClick={() => setTab("staff")}>Staff Admins</Button>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder={`Search ${tab === "teachers" ? "teachers" : "staff"}...`} />

      {tab === "teachers" ? (
        filteredTeachers.length === 0 ? (
          <EmptyState title="No teachers found" description="Add your first teacher to get started." action={<Button onClick={openAddTeacher}><Plus className="mr-2 h-4 w-4" />Add Teacher</Button>} />
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
                {filteredTeachers.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>{t.email}</TableCell>
                    <TableCell>{t.phone || "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">{(t.subjects||[]).map(s => <Badge key={s} variant="secondary" className="text-xs">{getSubjectName(s)}</Badge>)}{(!t.subjects || t.subjects.length===0) && "—"}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">{getTeacherDayTimeLabels(t).map(label => <Badge key={`${t.id}-${label}`} variant="outline" className="text-xs">{label}</Badge>)}{getTeacherDayTimeLabels(t).length===0 && "—"}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditTeacher(t)}><Pencil className="h-4 w-4"/></Button>
                        <Button variant="ghost" size="icon" onClick={() => setTDeleteId(t.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4"/></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      ) : (
        filteredStaff.length === 0 ? (
          <EmptyState title="No staff found" description="Add a staff admin to manage institution resources." action={<Button onClick={openAddStaff}><Plus className="mr-2 h-4 w-4"/>Add Staff</Button>} />
        ) : (
          <div className="rounded-lg border border-border bg-card card-shadow">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Campus</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.email}</TableCell>
                    <TableCell>{s.campusId || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditStaff(s)}><Pencil className="h-4 w-4"/></Button>
                        <Button variant="ghost" size="icon" onClick={() => setSDeleteId(s.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4"/></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      )}

      {/* Teacher Modal */}
      <Dialog open={tModalOpen} onOpenChange={setTModalOpen}>
        <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] overflow-hidden">
          <DialogHeader><DialogTitle>{tEditingId ? "Edit Teacher" : "Add Teacher"}</DialogTitle></DialogHeader>
          <div className="space-y-4 overflow-y-auto pr-1 max-h-[72vh]">
            <div className="space-y-2"><Label>Name</Label><Input value={tForm.name} onChange={(e)=>setTForm({...tForm,name:e.target.value})} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={tForm.email} onChange={(e)=>setTForm({...tForm,email:e.target.value})} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={tForm.phone} onChange={(e)=>setTForm({...tForm,phone:e.target.value})} /></div>
            {!campus && <div className="space-y-2"><Label>Campus ID</Label><Input value={tForm.campusId} onChange={(e)=>setTForm({...tForm,campusId:e.target.value})} placeholder="paste campus id" /></div>}
            <div className="space-y-2">
              <Label>Subjects</Label>
              <div className="rounded-md border border-input p-3 space-y-3">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setTForm({ ...tForm, subjects: subjectOptions.map((subject) => subject.id) })}
                  >
                    Select all
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setTForm({ ...tForm, subjects: [] })}
                  >
                    Clear
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {subjectOptions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No subjects found. Add subjects first.</p>
                  ) : (
                    subjectOptions.map((subject) => {
                      const selected = tForm.subjects.includes(subject.id);
                      return (
                        <Button
                          key={subject.id}
                          type="button"
                          variant={selected ? "default" : "outline"}
                          size="sm"
                          className={cn("h-8", !selected && "text-muted-foreground")}
                          onClick={() => {
                            const nextSubjects = selected
                              ? tForm.subjects.filter((id) => id !== subject.id)
                              : [...tForm.subjects, subject.id];
                            setTForm({ ...tForm, subjects: nextSubjects });
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
                              setTForm({
                                ...tForm,
                                availabilityByDay: {
                                  ...tForm.availabilityByDay,
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
                              setTForm({
                                ...tForm,
                                availabilityByDay: {
                                  ...tForm.availabilityByDay,
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
                          const selected = (tForm.availabilityByDay?.[day.id] || []).includes(slot.id);
                          const label = `${slot.startTime} - ${slot.endTime}${slot.isBreak ? " (Break)" : ""}`;
                          return (
                            <Button
                              key={`${day.id}-${slot.id}`}
                              type="button"
                              variant={selected ? "default" : "outline"}
                              size="sm"
                              className={cn("h-8", !selected && "text-muted-foreground")}
                              onClick={() => {
                                const daySlots = tForm.availabilityByDay?.[day.id] || [];
                                const nextDaySlots = daySlots.includes(slot.id)
                                  ? daySlots.filter((id) => id !== slot.id)
                                  : [...daySlots, slot.id];

                                setTForm({
                                  ...tForm,
                                  availabilityByDay: {
                                    ...tForm.availabilityByDay,
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
            <Button variant="outline" onClick={()=>setTModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTeacher} disabled={tSaving}>{tSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}{tEditingId?"Update":"Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!tDeleteId} onClose={()=>setTDeleteId(null)} onConfirm={handleDeleteTeacher} loading={tDeleting} title="Delete Teacher?" description="This will permanently remove this teacher." />

      {/* Staff Modal */}
      <Dialog open={sModalOpen} onOpenChange={setSModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{sEditingId ? "Edit Staff" : "Add Staff"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={sForm.name} onChange={(e)=>setSForm({...sForm,name:e.target.value})} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={sForm.email} onChange={(e)=>setSForm({...sForm,email:e.target.value})} /></div>
            {!sEditingId && <div className="space-y-2"><Label>Password</Label><Input type="password" value={sForm.password} onChange={(e)=>setSForm({...sForm,password:e.target.value})} /></div>}
            <div className="space-y-2"><Label>Campus ID (optional)</Label><Input value={sForm.campusId} onChange={(e)=>setSForm({...sForm,campusId:e.target.value})} placeholder="paste campus id or leave empty"/></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setSModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveStaff} disabled={sSaving}>{sSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}{sEditingId?"Update":"Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!sDeleteId} onClose={()=>setSDeleteId(null)} onConfirm={handleDeleteStaff} loading={sDeleting} title="Delete Staff?" description="This will remove the staff user and revoke access." />

    </motion.div>
  );
};

export default UsersPage;
