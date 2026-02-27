import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Pencil, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useInstitution } from "@/contexts/InstitutionContext";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type TeacherProfile = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subjects?: string[];
  availabilityByDay?: Record<string, string[]>;
  timeSlotIds?: string[];
};

type SubjectOption = { id: string; name: string };
type TimeSlotOption = { id: string; startTime: string; endTime: string; isBreak?: boolean };
type WorkingDayOption = { id: string; dayName: string };

const TeacherDashboardPage = () => {
  const { user } = useAuth();
  const { campus } = useInstitution();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [subjectOptions, setSubjectOptions] = useState<SubjectOption[]>([]);
  const [timeSlotOptions, setTimeSlotOptions] = useState<TimeSlotOption[]>([]);
  const [workingDays, setWorkingDays] = useState<WorkingDayOption[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editAvailabilityByDay, setEditAvailabilityByDay] = useState<Record<string, string[]>>({});
  const [lastAvailabilitySavedAt, setLastAvailabilitySavedAt] = useState<Date | null>(null);

  useEffect(() => {
    const fetchTeacherDashboard = async () => {
      try {
        const params = campus ? `?campusId=${campus.id}` : "";
        const [teachersRes, subjectsRes, timeSlotsRes, workingDaysRes] = await Promise.all([
          api.get(`/teachers${params}`).catch(() => ({ data: [] })),
          api.get(`/subjects${params}`).catch(() => ({ data: [] })),
          api.get(`/timeslots${params}`).catch(() => ({ data: [] })),
          api.get(`/workingdays${params}`).catch(() => ({ data: [] })),
        ]);

        const teachers = Array.isArray(teachersRes.data) ? teachersRes.data : [];
        const matchedTeacher = teachers.find((teacher: any) =>
          String(teacher.email || "").toLowerCase() === String(user?.email || "").toLowerCase()
        ) || null;

        setTeacherProfile(matchedTeacher);
        setSubjectOptions((subjectsRes.data || []).map((item: any) => ({ id: item.id, name: item.name })));
        setTimeSlotOptions(timeSlotsRes.data || []);
        setWorkingDays(workingDaysRes.data || []);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherDashboard();
  }, [campus, user?.email]);

  const getSubjectName = (subjectId: string) => {
    const found = subjectOptions.find((subject) => subject.id === subjectId);
    return found?.name || subjectId;
  };

  const getTimeSlotLabel = (timeSlotId: string) => {
    const slot = timeSlotOptions.find((item) => item.id === timeSlotId);
    if (!slot) return timeSlotId;
    return `${slot.startTime} - ${slot.endTime}${slot.isBreak ? " (Break)" : ""}`;
  };

  const getWorkingDayName = (dayId: string) => {
    const day = workingDays.find((item) => item.id === dayId);
    return day?.dayName || dayId;
  };

  const teacherAvailabilityLabels = useMemo(() => {
    const availabilityByDay = teacherProfile?.availabilityByDay || {};
    const labels = Object.entries(availabilityByDay).flatMap(([dayId, slotIds]) => {
      const dayName = getWorkingDayName(dayId);
      return (slotIds || []).map((slotId) => `${dayName} • ${getTimeSlotLabel(slotId)}`);
    });

    if (labels.length > 0) return labels;

    const fallbackSlots = Array.from(new Set(teacherProfile?.timeSlotIds || []));
    return fallbackSlots.map((slotId) => getTimeSlotLabel(slotId));
  }, [teacherProfile, timeSlotOptions, workingDays]);

  const teacherSubjects = useMemo(
    () => (teacherProfile?.subjects || []).map((subjectId) => getSubjectName(subjectId)),
    [teacherProfile, subjectOptions]
  );

  const openEdit = () => {
    if (!teacherProfile) return;
    setEditAvailabilityByDay(teacherProfile.availabilityByDay || {});
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!teacherProfile) return;
    setSaving(true);
    try {
      await api.post(`/teacher-availability/self`, {
        availabilityByDay: editAvailabilityByDay,
      });

      setTeacherProfile({
        ...teacherProfile,
        availabilityByDay: editAvailabilityByDay,
      });
      setLastAvailabilitySavedAt(new Date());
      toast({ title: "Availability updated" });
      setEditOpen(false);
    } catch (err: any) {
      toast({
        title: "Update failed",
        description: err.response?.data?.message || "Failed",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <SkeletonLoader type="table" count={4} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teacher Dashboard"
        description="View your timetable and update your availability"
        action={<Button onClick={openEdit} disabled={!teacherProfile}><Pencil className="mr-2 h-4 w-4" />Edit Availability</Button>}
      />

      <Card>
        <CardHeader>
          <CardTitle>My Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground">Name</p>
            <p className="text-sm font-medium">{teacherProfile?.name || user?.name || "-"}</p>
          </div>

          <div>
            <p className="mb-2 text-xs text-muted-foreground">Assigned Subjects</p>
            <div className="flex flex-wrap gap-2">
              {teacherSubjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">No subjects assigned yet.</p>
              ) : (
                teacherSubjects.map((subject) => (
                  <Badge key={subject} variant="secondary" className="text-xs">{subject}</Badge>
                ))
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs text-muted-foreground">Available Time Slots</p>
            <div className="flex flex-wrap gap-2">
              {teacherAvailabilityLabels.length === 0 ? (
                <p className="text-sm text-muted-foreground">No time slots assigned yet.</p>
              ) : (
                teacherAvailabilityLabels.map((label) => (
                  <Badge key={label} variant="outline" className="text-xs">{label}</Badge>
                ))
              )}
            </div>
            {lastAvailabilitySavedAt && (
              <p className="mt-2 text-xs text-muted-foreground">
                Last availability update: {lastAvailabilitySavedAt.toLocaleString()}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] overflow-hidden">
          <DialogHeader><DialogTitle>Edit Availability</DialogTitle></DialogHeader>
          <div className="space-y-4 overflow-y-auto pr-1 max-h-[72vh]">
            <div className="space-y-2">
              <Label>Time Slots by Working Day</Label>
              <div className="rounded-md border border-input p-3 space-y-4">
                {workingDays.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No working days found.</p>
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
                              setEditAvailabilityByDay({
                                ...editAvailabilityByDay,
                                [day.id]: timeSlotOptions.map((slot) => slot.id),
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
                              setEditAvailabilityByDay({
                                ...editAvailabilityByDay,
                                [day.id]: [],
                              });
                            }}
                          >
                            Clear
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {timeSlotOptions.map((slot) => {
                          const selected = (editAvailabilityByDay?.[day.id] || []).includes(slot.id);
                          const label = `${slot.startTime} - ${slot.endTime}${slot.isBreak ? " (Break)" : ""}`;
                          return (
                            <Button
                              key={`${day.id}-${slot.id}`}
                              type="button"
                              variant={selected ? "default" : "outline"}
                              size="sm"
                              className={cn("h-8", !selected && "text-muted-foreground")}
                              onClick={() => {
                                const daySlots = editAvailabilityByDay?.[day.id] || [];
                                const nextDaySlots = daySlots.includes(slot.id)
                                  ? daySlots.filter((id) => id !== slot.id)
                                  : [...daySlots, slot.id];

                                setEditAvailabilityByDay({
                                  ...editAvailabilityByDay,
                                  [day.id]: nextDaySlots,
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
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherDashboardPage;
