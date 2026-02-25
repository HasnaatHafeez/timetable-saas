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

interface Room {
  id: string;
  name: string;
  capacity: number;
  type: string;
}

const defaultForm = { name: "", capacity: "", type: "Lecture" };

const RoomsPage = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
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

  const fetchRooms = async () => {
    try { 
      const params = campus ? `?campusId=${campus.id}` : "";
      const res = await api.get(`/rooms${params}`); 
      setRooms(res.data); 
    }
    catch { setRooms([]); } finally { setLoading(false); }
  };

  useEffect(() => { fetchRooms(); }, [campus]);

  const filtered = rooms.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));

  const openAdd = () => { setEditingId(null); setForm(defaultForm); setModalOpen(true); };
  const openEdit = (r: Room) => {
    setEditingId(r.id);
    setForm({ name: r.name, capacity: String(r.capacity || ""), type: r.type || "Lecture" });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!campus) {
      toast({ title: "Error", description: "Please select a campus first", variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload = { ...form, capacity: Number(form.capacity) || 0, campusId: campus.id };
    try {
      if (editingId) { await api.put(`/rooms/${editingId}`, payload); toast({ title: "Room updated" }); }
      else { await api.post("/rooms", payload); toast({ title: "Room added" }); }
      setModalOpen(false); fetchRooms();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.message || "Failed", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try { await api.delete(`/rooms/${deleteId}`); toast({ title: "Room deleted" }); fetchRooms(); }
    catch { toast({ title: "Delete failed", variant: "destructive" }); }
    finally { setDeleting(false); setDeleteId(null); }
  };

  if (loading) return <SkeletonLoader type="table" count={5} />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <PageHeader title="Rooms" description="Manage classrooms and labs" badge={`${rooms.length}`}
        action={<Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add Room</Button>} />
      <SearchBar value={search} onChange={setSearch} placeholder="Search rooms..." />

      {filtered.length === 0 ? (
        <EmptyState title="No rooms found" description="Add your first room." action={<Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add Room</Button>} />
      ) : (
        <div className="rounded-lg border border-border bg-card card-shadow">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Name</TableHead><TableHead>Capacity</TableHead><TableHead>Type</TableHead><TableHead className="w-24">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.capacity}</TableCell>
                  <TableCell><Badge variant={r.type === "Lab" ? "default" : "secondary"}>{r.type}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(r.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
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
          <DialogHeader><DialogTitle>{editingId ? "Edit Room" : "Add Room"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Room Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Capacity</Label><Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Lecture">Lecture</SelectItem>
                  <SelectItem value="Lab">Lab</SelectItem>
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

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} loading={deleting} title="Delete Room?" />
    </motion.div>
  );
};

export default RoomsPage;
