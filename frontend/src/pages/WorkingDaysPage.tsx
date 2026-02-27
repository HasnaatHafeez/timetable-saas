import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useInstitution } from "@/contexts/InstitutionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2, CalendarDays } from "lucide-react";
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

type Holiday = {
  id: string;
  campusId: string;
  date: string;
  name: string;
};

const defaultForm = { dayName: "" };
const defaultHolidayForm = { date: "", name: "" };
const DAY_OPTIONS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const getDayOrder = (dayName: string) => {
  const index = DAY_OPTIONS.findIndex((item) => item.toLowerCase() === String(dayName || "").toLowerCase());
  return index === -1 ? 999 : index;
};

const WorkingDaysPage = () => {
  const [workingDays, setWorkingDays] = useState<WorkingDay[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
  const [editingHolidayId, setEditingHolidayId] = useState<string | null>(null);
  const [holidayForm, setHolidayForm] = useState(defaultHolidayForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteHolidayId, setDeleteHolidayId] = useState<string | null>(null);
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
      const sorted = (res.data || []).sort((a: WorkingDay, b: WorkingDay) => getDayOrder(a.dayName) - getDayOrder(b.dayName));
      setWorkingDays(sorted);
    } catch {
      setWorkingDays([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchHolidays = async () => {
    try {
      if (!campus) {
        setHolidays([]);
        return;
      }
      const res = await api.get(`/workingdays/holidays?campusId=${campus.id}`);
      setHolidays((res.data || []).sort((a: Holiday, b: Holiday) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    } catch {
      setHolidays([]);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchWorkingDays(), fetchHolidays()]).finally(() => setLoading(false));
  }, [campus]);

  const filtered = workingDays.filter((day) => day.dayName.toLowerCase().includes(search.toLowerCase()));

  const openAdd = () => {
    setEditingId(null);
    setForm({ dayName: "Monday" });
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

  const openAddHoliday = () => {
    setEditingHolidayId(null);
    setHolidayForm(defaultHolidayForm);
    setHolidayModalOpen(true);
  };

  const openEditHoliday = (holiday: Holiday) => {
    setEditingHolidayId(holiday.id);
    setHolidayForm({
      date: holiday.date ? new Date(holiday.date).toISOString().slice(0, 10) : "",
      name: holiday.name || "",
    });
    setHolidayModalOpen(true);
  };

  const handleSaveHoliday = async () => {
    if (!campus) {
      toast({ title: "Error", description: "Please select a campus first", variant: "destructive" });
      return;
    }
    if (!holidayForm.date || !holidayForm.name.trim()) {
      toast({ title: "Error", description: "Holiday date and name are required", variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload = { campusId: campus.id, date: holidayForm.date, name: holidayForm.name.trim() };
    try {
      if (editingHolidayId) {
        await api.put(`/workingdays/holidays/${editingHolidayId}`, payload);
        toast({ title: "Holiday updated" });
      } else {
        await api.post("/workingdays/holidays", payload);
        toast({ title: "Holiday added" });
      }
      setHolidayModalOpen(false);
      fetchHolidays();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.message || "Failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHoliday = async () => {
    if (!deleteHolidayId) return;
    setDeleting(true);
    try {
      await api.delete(`/workingdays/holidays/${deleteHolidayId}`);
      toast({ title: "Holiday deleted" });
      fetchHolidays();
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteHolidayId(null);
    }
  };

  if (loading) return <SkeletonLoader type="table" count={5} />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <PageHeader
        title="Working Days"
        description="Manage campus working days and date-based holidays"
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
            <Select value={form.dayName || undefined} onValueChange={(value) => setForm({ dayName: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                {DAY_OPTIONS.map((day) => (
                  <SelectItem key={day} value={day}>{day}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingId ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="rounded-lg border border-border bg-card card-shadow p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Holidays</h3>
            <p className="text-sm text-muted-foreground">Add specific holiday dates for this campus.</p>
          </div>
          <Button onClick={openAddHoliday}><CalendarDays className="mr-2 h-4 w-4" />Add Holiday</Button>
        </div>

        {holidays.length === 0 ? (
          <p className="text-sm text-muted-foreground">No holidays configured yet.</p>
        ) : (
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Holiday</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.map((holiday) => (
                  <TableRow key={holiday.id}>
                    <TableCell className="font-medium">{new Date(holiday.date).toLocaleDateString()}</TableCell>
                    <TableCell>{holiday.name}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditHoliday(holiday)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteHolidayId(holiday.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={holidayModalOpen} onOpenChange={setHolidayModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingHolidayId ? "Edit Holiday" : "Add Holiday"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={holidayForm.date} onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Holiday Name</Label>
              <Input value={holidayForm.name} onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })} placeholder="e.g., Eid Holiday" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHolidayModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveHoliday} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingHolidayId ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} loading={deleting} title="Delete Working Day?" description="This will permanently remove the selected working day." />
      <ConfirmDialog open={!!deleteHolidayId} onClose={() => setDeleteHolidayId(null)} onConfirm={handleDeleteHoliday} loading={deleting} title="Delete Holiday?" description="This will permanently remove the selected holiday date." />
    </motion.div>
  );
};

export default WorkingDaysPage;
