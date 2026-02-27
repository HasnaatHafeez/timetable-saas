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
  campusId?: string;
};

type CampusOption = { id: string; name: string; location?: string; institutionId?: string };

type Staff = {
  id: string;
  userId: string;
  name: string;
  email: string;
  campusId?: string | null;
  campusIds?: string[];
  campuses?: { id: string; name: string; location?: string }[];
};

const defaultTeacherForm = { name: "", email: "", password: "", phone: "", campusId: "" };
const defaultStaffForm = { name: "", email: "", password: "", campusIds: [] as string[] };

const UsersPage = () => {
  const [tab, setTab] = useState<"teachers" | "staff">("teachers");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [campusOptions, setCampusOptions] = useState<CampusOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Teacher modal
  const [tModalOpen, setTModalOpen] = useState(false);
  const [tEditingId, setTEditingId] = useState<string | null>(null);
  const [tForm, setTForm] = useState(defaultTeacherForm);
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

  const fetchCampuses = async () => {
    if (!institution) {
      setCampusOptions([]);
      return;
    }

    try {
      const res = await api.get(`/campuses?institutionId=${institution.id}`);
      setCampusOptions(res.data || []);
    } catch {
      setCampusOptions([]);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([fetchTeachers(), fetchStaff(), fetchCampuses()]).then(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campus, institution]);

  const filteredTeachers = teachers.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()) || t.email.toLowerCase().includes(search.toLowerCase()));
  const filteredStaff = staff.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()));
  const getCampusNames = (staffItem: Staff) => {
    const ids = (staffItem.campusIds && staffItem.campusIds.length > 0)
      ? staffItem.campusIds
      : (staffItem.campusId ? [staffItem.campusId] : []);

    if (ids.length === 0) return ["—"];

    return ids.map((campusId) => {
      const found = campusOptions.find((item) => item.id === campusId);
      return found ? `${found.name}${found.location ? ` (${found.location})` : ""}` : campusId;
    });
  };

  // Teacher handlers
  const openAddTeacher = () => { 
    setTEditingId(null); 
    setTForm(defaultTeacherForm); 
    setTModalOpen(true); 
    setTab("teachers"); 
  };
  const openEditTeacher = (t: Teacher) => { 
    setTEditingId(t.id); 
    setTForm({ 
      name: t.name, 
      email: t.email, 
      password: "",
      phone: t.phone || "", 
      campusId: t.campusId || "" 
    }); 
    setTModalOpen(true); 
    setTab("teachers"); 
  };

  const handleSaveTeacher = async () => {
    const resolvedCampusId = campus?.id || tForm.campusId;
    if (!resolvedCampusId) {
      toast({ title: "Error", description: "Select a campus first or provide Campus ID", variant: "destructive" });
      return;
    }

    if (!tEditingId) {
      const rawPassword = String(tForm.password || "");
      if (!rawPassword || rawPassword.length < 6) {
        toast({ title: "Error", description: "Password is required and must be at least 6 characters", variant: "destructive" });
        return;
      }
    } else if (tForm.password && String(tForm.password).length < 6) {
      toast({ title: "Error", description: "Reset password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setTSaving(true);
    const payload = {
      name: tForm.name,
      email: tForm.email,
      ...(tForm.password ? { password: tForm.password } : {}),
      phone: tForm.phone,
      campusId: resolvedCampusId,
    };
    try {
      if (tEditingId) {
        await api.put(`/teachers/${tEditingId}`, payload);
        toast({ title: tForm.password ? "Teacher updated and password reset" : "Teacher updated" });
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
  const openAddStaff = () => { setSEditingId(null); setSForm({ ...defaultStaffForm, campusIds: [] }); setSModalOpen(true); setTab("staff"); };
  const openEditStaff = (s: Staff) => {
    setSEditingId(s.id);
    setSForm({
      name: s.name,
      email: s.email,
      password: "",
      campusIds: (s.campusIds && s.campusIds.length > 0) ? s.campusIds : (s.campusId ? [s.campusId] : []),
    });
    setSModalOpen(true);
    setTab("staff");
  };

  const toggleStaffCampus = (campusId: string) => {
    const selected = sForm.campusIds.includes(campusId);
    setSForm({
      ...sForm,
      campusIds: selected
        ? sForm.campusIds.filter((id) => id !== campusId)
        : [...sForm.campusIds, campusId],
    });
  };

  const handleSaveStaff = async () => {
    if (!institution) { toast({ title: "Error", description: "Select an institution first", variant: "destructive" }); return; }

    if (!sEditingId) {
      const rawPassword = String(sForm.password || "");
      if (!rawPassword || rawPassword.length < 6) {
        toast({ title: "Error", description: "Password is required and must be at least 6 characters", variant: "destructive" });
        return;
      }
    }

    setSSaving(true);
    try {
      if (sEditingId) {
        await api.put(`/staff/${sEditingId}`, {
          name: sForm.name,
          email: sForm.email,
          campusIds: sForm.campusIds,
        });
        toast({ title: "Staff updated" });
      } else {
        await api.post(`/staff/create-with-user`, {
          name: sForm.name,
          email: sForm.email,
          password: sForm.password,
          institutionId: institution.id,
          campusIds: sForm.campusIds,
        });
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
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {getCampusNames(s).map((name, index) => (
                          <Badge key={`${s.id}-${index}-${name}`} variant="secondary" className="text-xs">{name}</Badge>
                        ))}
                      </div>
                    </TableCell>
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
        <DialogContent>
          <DialogHeader><DialogTitle>{tEditingId ? "Edit Teacher" : "Add Teacher"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={tForm.name} onChange={(e)=>setTForm({...tForm,name:e.target.value})} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={tForm.email} onChange={(e)=>setTForm({...tForm,email:e.target.value})} /></div>
            {!tEditingId && <div className="space-y-2"><Label>Password</Label><Input type="password" value={tForm.password} onChange={(e)=>setTForm({...tForm,password:e.target.value})} /><p className="text-xs text-muted-foreground">Minimum 6 characters.</p></div>}
            {tEditingId && <div className="space-y-2"><Label>Reset Password (optional)</Label><Input type="password" value={tForm.password} onChange={(e)=>setTForm({...tForm,password:e.target.value})} placeholder="Leave blank to keep current password" /><p className="text-xs text-muted-foreground">Minimum 6 characters if provided.</p></div>}
            <div className="space-y-2"><Label>Phone</Label><Input value={tForm.phone} onChange={(e)=>setTForm({...tForm,phone:e.target.value})} /></div>
            {!campus && <div className="space-y-2"><Label>Campus ID</Label><Input value={tForm.campusId} onChange={(e)=>setTForm({...tForm,campusId:e.target.value})} placeholder="paste campus id" /></div>}
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
            <div className="space-y-2">
              <Label>Campuses (optional)</Label>
              <div className="rounded-md border border-input p-3 space-y-3">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setSForm({ ...sForm, campusIds: campusOptions.map((item) => item.id) })}
                    disabled={campusOptions.length === 0}
                  >
                    Select all
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setSForm({ ...sForm, campusIds: [] })}
                  >
                    Clear
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {campusOptions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No campuses found for this institution.</p>
                  ) : (
                    campusOptions.map((item) => {
                      const selected = sForm.campusIds.includes(item.id);
                      return (
                        <Button
                          key={item.id}
                          type="button"
                          variant={selected ? "default" : "outline"}
                          size="sm"
                          className={cn("h-8", !selected && "text-muted-foreground")}
                          onClick={() => toggleStaffCampus(item.id)}
                        >
                          {item.name}{item.location ? ` (${item.location})` : ""}
                        </Button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
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
