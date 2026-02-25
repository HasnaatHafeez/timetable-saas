import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useInstitution } from "@/contexts/InstitutionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type TimeSlot = {
  id: string;
  campusId: string;
  startTime: string;
  endTime: string;
  isBreak: boolean;
};

const defaultForm = {
  startTime: "",
  endTime: "",
  isBreak: "false",
};

const TimeSlotsPage = () => {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
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

  const fetchTimeSlots = async () => {
    try {
      if (!campus) {
        setTimeSlots([]);
        return;
      }
      const res = await api.get(`/timeslots?campusId=${campus.id}`);
      setTimeSlots(res.data || []);
    } catch {
      setTimeSlots([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchTimeSlots();
  }, [campus]);

  const filtered = timeSlots.filter((slot) => {
    const text = `${slot.startTime} ${slot.endTime} ${slot.isBreak ? "break" : "class"}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const openAdd = () => {
    setEditingId(null);
    setForm(defaultForm);
    setModalOpen(true);
  };

  const openEdit = (slot: TimeSlot) => {
    setEditingId(slot.id);
    setForm({
      startTime: slot.startTime,
      endTime: slot.endTime,
      isBreak: String(slot.isBreak),
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!campus) {
      toast({ title: "Error", description: "Please select a campus first", variant: "destructive" });
      return;
    }

    if (!form.startTime || !form.endTime) {
      toast({ title: "Error", description: "Start time and end time are required", variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload = {
      campusId: campus.id,
      startTime: form.startTime,
      endTime: form.endTime,
      isBreak: form.isBreak === "true",
    };

    try {
      if (editingId) {
        await api.put(`/timeslots/${editingId}`, payload);
        toast({ title: "Time slot updated" });
      } else {
        await api.post("/timeslots", payload);
        toast({ title: "Time slot added" });
      }
      setModalOpen(false);
      fetchTimeSlots();
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
      await api.delete(`/timeslots/${deleteId}`);
      toast({ title: "Time slot deleted" });
      fetchTimeSlots();
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
        title="Time Slots"
        description="Manage class and break time slots"
        badge={`${timeSlots.length}`}
        action={<Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add Time Slot</Button>}
      />

      <SearchBar value={search} onChange={setSearch} placeholder="Search time slots..." />

      {filtered.length === 0 ? (
        <EmptyState
          title="No time slots found"
          description="Add your first time slot to start timetable setup."
          action={<Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add Time Slot</Button>}
        />
      ) : (
        <div className="rounded-lg border border-border bg-card card-shadow">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Start Time</TableHead>
                <TableHead>End Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((slot) => (
                <TableRow key={slot.id}>
                  <TableCell className="font-medium">{slot.startTime}</TableCell>
                  <TableCell>{slot.endTime}</TableCell>
                  <TableCell>
                    <Badge variant={slot.isBreak ? "secondary" : "default"}>
                      {slot.isBreak ? "Break" : "Class"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(slot)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(slot.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Time Slot" : "Add Time Slot"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Slot Type</Label>
              <select
                value={form.isBreak}
                onChange={(e) => setForm({ ...form, isBreak: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="false">Class</option>
                <option value="true">Break</option>
              </select>
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

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Time Slot?"
        description="This will permanently remove the selected time slot."
      />
    </motion.div>
  );
};

export default TimeSlotsPage;
