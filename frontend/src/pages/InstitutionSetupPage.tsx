import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Building2, MapPin, Loader2, Pencil, Trash2 } from "lucide-react";
import { useInstitution, type Institution, type Campus } from "@/contexts/InstitutionContext";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import PageHeader from "@/components/PageHeader";

const InstitutionSetupPage = () => {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [selectedCampus, setSelectedCampus] = useState<Campus | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCampusId, setEditingCampusId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteCampusConfirmId, setDeleteCampusConfirmId] = useState<string | null>(null);
  const [createMode, setCreateMode] = useState<"institution" | "campus">("institution");
  const [formData, setFormData] = useState({
    institutionName: "",
    institutionType: "SCHOOL" as "SCHOOL" | "COLLEGE" | "UNIVERSITY",
    campusName: "",
    location: "",
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { setInstitution, setCampus } = useInstitution();
  const navigate = useNavigate();

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const fetchInstitutions = async () => {
    try {
      const res = await api.get("/institutions");
      setInstitutions(res.data);
      if (res.data.length === 0) {
        toast({ title: "No institutions found", description: "Create your first institution to get started." });
      }
    } catch {
      setInstitutions([]);
      toast({ title: "Error", description: "Failed to fetch institutions", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInstitution = async () => {
    if (!formData.institutionName.trim()) {
      toast({ title: "Error", description: "Institution name is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const res = await api.post("/institutions", {
        name: formData.institutionName,
        type: formData.institutionType,
        campusName: formData.campusName,
        location: formData.location,
      });
      
      toast({ title: "Institution created!", description: `${res.data.name} has been created.` });
      setFormData({ institutionName: "", institutionType: "SCHOOL", campusName: "", location: "" });
      setModalOpen(false);
      setCreateMode("institution");
      fetchInstitutions();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to create institution",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCampus = async () => {
    if (!selectedInstitution) {
      toast({ title: "Error", description: "Select an institution first", variant: "destructive" });
      return;
    }
    if (!formData.campusName.trim()) {
      toast({ title: "Error", description: "Campus name is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const res = await api.post("/campuses", {
        institutionId: selectedInstitution.id,
        name: formData.campusName,
        location: formData.location,
      });

      toast({ title: "Campus created!", description: `${res.data.name} has been added.` });
      setFormData({ ...formData, campusName: "", location: "" });
      setModalOpen(false);
      setCreateMode("institution");
      fetchInstitutions();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to create campus",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleProceed = () => {
    if (!selectedInstitution || !selectedCampus) {
      toast({ title: "Error", description: "Please select both institution and campus", variant: "destructive" });
      return;
    }

    setInstitution(selectedInstitution);
    setCampus(selectedCampus);
    navigate("/dashboard");
  };

  const openEditInstitution = (inst: Institution) => {
    setEditingId(inst.id);
    setFormData({
      institutionName: inst.name,
      institutionType: inst.type,
      campusName: "",
      location: "",
    });
    setCreateMode("institution");
    setModalOpen(true);
  };

  const handleEditInstitution = async () => {
    if (!formData.institutionName.trim()) {
      toast({ title: "Error", description: "Institution name is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const res = await api.put(`/institutions/${editingId}`, {
        name: formData.institutionName,
        type: formData.institutionType,
      });
      
      toast({ title: "Institution updated!", description: `${res.data.name} has been updated.` });
      setFormData({ institutionName: "", institutionType: "SCHOOL", campusName: "", location: "" });
      setEditingId(null);
      setModalOpen(false);
      fetchInstitutions();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to update institution",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteInstitution = async (id: string) => {
    setSaving(true);
    try {
      await api.delete(`/institutions/${id}`);
      
      toast({ title: "Institution deleted!", description: "The institution has been removed." });
      setDeleteConfirmId(null);
      if (selectedInstitution?.id === id) {
        setSelectedInstitution(null);
        setSelectedCampus(null);
      }
      fetchInstitutions();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to delete institution",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const openEditCampus = (campus: Campus) => {
    setEditingCampusId(campus.id);
    setFormData({
      institutionName: "",
      institutionType: "SCHOOL",
      campusName: campus.name,
      location: campus.location,
    });
    setCreateMode("campus");
    setModalOpen(true);
  };

  const handleEditCampus = async () => {
    if (!formData.campusName.trim()) {
      toast({ title: "Error", description: "Campus name is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const res = await api.put(`/campuses/${editingCampusId}`, {
        name: formData.campusName,
        location: formData.location,
      });
      
      toast({ title: "Campus updated!", description: `${res.data.name} has been updated.` });
      setFormData({ institutionName: "", institutionType: "SCHOOL", campusName: "", location: "" });
      setEditingCampusId(null);
      setModalOpen(false);
      fetchInstitutions();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to update campus",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCampus = async (id: string) => {
    setSaving(true);
    try {
      await api.delete(`/campuses/${id}`);
      
      toast({ title: "Campus deleted!", description: "The campus has been removed." });
      setDeleteCampusConfirmId(null);
      if (selectedCampus?.id === id) {
        setSelectedCampus(null);
      }
      fetchInstitutions();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to delete campus",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="max-w-6xl">
        <PageHeader
          title="Institution"
          description="Select and manage your institution and campuses"
        />

        {institutions.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No institutions yet</h3>
              <p className="text-muted-foreground mb-6">Create your first institution to manage your timetable</p>
              <Button onClick={() => { setCreateMode("institution"); setModalOpen(true); }} size="lg">
                <Plus className="mr-2 h-4 w-4" /> Create Institution
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Institutions */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Institutions</CardTitle>
                    <CardDescription>{institutions.length} institution(s)</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => { setCreateMode("institution"); setModalOpen(true); }}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {institutions.map((inst) => (
                  <div
                    key={inst.id}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                      selectedInstitution?.id === inst.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <button
                      onClick={() => {
                        setSelectedInstitution(inst);
                        setSelectedCampus(null);
                      }}
                      className="flex-1 text-left"
                    >
                      <div className="font-medium text-foreground">{inst.name}</div>
                      <div className="text-sm text-muted-foreground">{inst.type}</div>
                    </button>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditInstitution(inst)}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteConfirmId(inst.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Campuses */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Campuses</CardTitle>
                    <CardDescription>
                      {selectedInstitution ? `${selectedInstitution.campuses.length} campus(es)` : "Select an institution"}
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => { setCreateMode("campus"); setModalOpen(true); }}
                    disabled={!selectedInstitution}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {selectedInstitution ? (
                  selectedInstitution.campuses.length > 0 ? (
                    selectedInstitution.campuses.map((campus) => (
                      <div
                        key={campus.id}
                        className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                          selectedCampus?.id === campus.id
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <button
                          onClick={() => setSelectedCampus(campus)}
                          className="flex-1 text-left"
                        >
                          <div className="font-medium text-foreground">{campus.name}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {campus.location}
                          </div>
                        </button>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditCampus(campus)}
                            className="h-8 w-8 p-0"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteCampusConfirmId(campus.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No campuses in this institution</p>
                      <p className="text-sm">Create one to get started</p>
                    </div>
                  )
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">Select an institution above</div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Action Buttons */}
        {institutions.length > 0 && (
          <div className="mt-8 flex justify-center gap-4">
            <Button
              size="lg"
              onClick={handleProceed}
              disabled={!selectedInstitution || !selectedCampus}
            >
              Proceed to Dashboard
            </Button>
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId 
                  ? "Edit Institution"
                  : editingCampusId
                    ? "Edit Campus"
                    : createMode === "institution" 
                      ? "Create Institution" 
                      : "Create Campus"}
              </DialogTitle>
              <DialogDescription>
                {editingId
                  ? "Update the institution details"
                  : editingCampusId
                    ? "Update the campus details"
                    : createMode === "institution" 
                      ? "Set up your institution details and optionally create the first campus"
                      : "Add a new campus to your institution"}
              </DialogDescription>
            </DialogHeader>

            {(createMode === "institution" || editingId) ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="inst-name">Institution Name</Label>
                  <Input
                    id="inst-name"
                    value={formData.institutionName}
                    onChange={(e) => setFormData({ ...formData, institutionName: e.target.value })}
                    placeholder="e.g., XYZ University"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inst-type">Institution Type</Label>
                  <Select value={formData.institutionType} onValueChange={(v) => setFormData({ ...formData, institutionType: v as any })}>
                    <SelectTrigger id="inst-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SCHOOL">School</SelectItem>
                      <SelectItem value="COLLEGE">College</SelectItem>
                      <SelectItem value="UNIVERSITY">University</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {!editingId && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="campus-name">First Campus Name (Optional)</Label>
                      <Input
                        id="campus-name"
                        value={formData.campusName}
                        onChange={(e) => setFormData({ ...formData, campusName: e.target.value })}
                        placeholder="e.g., Main Campus"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Location (Optional)</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="e.g., New York, NY"
                      />
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="c-name">Campus Name</Label>
                  <Input
                    id="c-name"
                    value={formData.campusName}
                    onChange={(e) => setFormData({ ...formData, campusName: e.target.value })}
                    placeholder="e.g., Downtown Campus"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-location">Location</Label>
                  <Input
                    id="c-location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., 123 Main St"
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => { setModalOpen(false); setEditingId(null); setEditingCampusId(null); }}>
                Cancel
              </Button>
              <Button
                onClick={
                  editingId 
                    ? handleEditInstitution
                    : editingCampusId
                      ? handleEditCampus
                      : createMode === "institution" 
                        ? handleCreateInstitution 
                        : handleCreateCampus
                }
                disabled={saving}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId || editingCampusId ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
          <AlertDialogContent>
            <AlertDialogTitle>Delete Institution?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All campuses and data associated with this institution will also be deleted.
            </AlertDialogDescription>
            <div className="flex gap-3 justify-end pt-4">
              <AlertDialogCancel onClick={() => setDeleteConfirmId(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteConfirmId && handleDeleteInstitution(deleteConfirmId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={saving}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Campus Confirmation Dialog */}
        <AlertDialog open={!!deleteCampusConfirmId} onOpenChange={(open) => !open && setDeleteCampusConfirmId(null)}>
          <AlertDialogContent>
            <AlertDialogTitle>Delete Campus?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All academic levels and data associated with this campus will also be deleted.
            </AlertDialogDescription>
            <div className="flex gap-3 justify-end pt-4">
              <AlertDialogCancel onClick={() => setDeleteCampusConfirmId(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteCampusConfirmId && handleDeleteCampus(deleteCampusConfirmId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={saving}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </motion.div>
  );
};

export default InstitutionSetupPage;
