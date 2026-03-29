import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useInstitution } from "@/contexts/InstitutionContext";

type AcademicLevelOption = { id: string; name: string };
type ClassOption = { id: string; name: string; section?: string; semester?: string; academicLevelId?: string; subjects?: string[] };
type SubjectOption = { id: string; name: string; weeklyHours?: number; creditHours?: number };
type UsageData = { used: number; limit: number; remaining: number; plan: string; feature: string };

const getUsageStorageKey = (campusId: string) => `timetable_usage:${campusId}`;

const GenerateTimetablePage = () => {
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [lastSettingsSavedAt, setLastSettingsSavedAt] = useState<string>("");
  const [academicLevels, setAcademicLevels] = useState<AcademicLevelOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [subjectWeeklyLectures, setSubjectWeeklyLectures] = useState<Record<string, number>>({});
  const [generationScope, setGenerationScope] = useState<"CLASS" | "INSTITUTE">("CLASS");
  const [changeRoomEveryLecture, setChangeRoomEveryLecture] = useState(false);
  const [selectedClassName, setSelectedClassName] = useState("");
  const [selectedAcademicLevelId, setSelectedAcademicLevelId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [limitExceeded, setLimitExceeded] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { institution, campus, academicLevel } = useInstitution();

  useEffect(() => {
    if (!campus?.id) {
      setUsage(null);
      setLimitExceeded(false);
      return;
    }

    try {
      const rawUsage = window.localStorage.getItem(getUsageStorageKey(campus.id));
      if (!rawUsage) return;

      const parsedUsage = JSON.parse(rawUsage) as UsageData;
      if (
        typeof parsedUsage?.used === "number" &&
        typeof parsedUsage?.limit === "number" &&
        typeof parsedUsage?.remaining === "number"
      ) {
        setUsage(parsedUsage);
        setLimitExceeded(parsedUsage.limit !== -1 && parsedUsage.remaining <= 0);
      }
    } catch {
      // Ignore invalid cached usage data
    }
  }, [campus?.id]);

  useEffect(() => {
    const fetchOptions = async () => {
      if (!campus) {
        setAcademicLevels([]);
        setClasses([]);
        setLoadingOptions(false);
        return;
      }

      setLoadingOptions(true);
      try {
        const [levelsRes, classesRes, subjectsRes] = await Promise.all([
          api.get(`/academic-levels?campusId=${campus.id}`),
          api.get(`/classes?campusId=${campus.id}`),
          api.get(`/subjects?campusId=${campus.id}`),
        ]);

        const fetchedLevels = levelsRes.data || [];
        const fetchedClasses = classesRes.data || [];
        const fetchedSubjects = subjectsRes.data || [];

        setAcademicLevels(fetchedLevels);
        setClasses(fetchedClasses);
        setSubjects(fetchedSubjects);
        setSubjectWeeklyLectures(
          (fetchedSubjects || []).reduce((acc: Record<string, number>, item: any) => {
            const defaultHours = Number(item.weeklyHours ?? item.creditHours ?? 0);
            acc[item.id] = Number.isFinite(defaultHours) ? Math.max(0, Math.floor(defaultHours)) : 0;
            return acc;
          }, {})
        );
        setSelectedClassName((prev) => prev || fetchedClasses[0]?.name || "");
        setSelectedAcademicLevelId((prev) => prev || academicLevel?.id || "");
      } catch {
        setAcademicLevels([]);
        setClasses([]);
        setSubjects([]);
        setSubjectWeeklyLectures({});
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchOptions();
  }, [campus, academicLevel]);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!campus) return;

      setLoadingSettings(true);
      try {
        const response = await api.get(`/timetable/settings?campusId=${campus.id}`);
        const data = response?.data || {};

        setGenerationScope(data.generationScope === "INSTITUTE" ? "INSTITUTE" : "CLASS");
        setChangeRoomEveryLecture(!!data.changeRoomEveryLecture);
        setSelectedClassName(data.selectedClassName || "");
        setSelectedAcademicLevelId(data.selectedAcademicLevelId || "");
        setSelectedSectionId(data.selectedSectionId || "");
        setSubjectWeeklyLectures((prev) => ({
          ...prev,
          ...(typeof data.subjectWeeklyLectures === "object" && data.subjectWeeklyLectures
            ? data.subjectWeeklyLectures
            : {}),
        }));
        setLastSettingsSavedAt(data.updatedAt ? new Date(data.updatedAt).toLocaleString() : "");
      } catch {
        // Keep defaults when settings are unavailable
      } finally {
        setLoadingSettings(false);
      }
    };

    fetchSettings();
  }, [campus]);

  const classNameOptions = useMemo(
    () => Array.from(new Set(classes.map((item) => item.name).filter(Boolean))),
    [classes]
  );

  const semesterOptions = useMemo(() => {
    const filteredByClass = classes.filter((item) => !selectedClassName || item.name === selectedClassName);
    return Array.from(
      new Map(
        filteredByClass
          .filter((item) => item.academicLevelId)
          .map((item) => [
            item.academicLevelId as string,
            {
              id: item.academicLevelId as string,
              name: item.semester || academicLevels.find((level) => level.id === item.academicLevelId)?.name || "",
            },
          ])
      ).values()
    );
  }, [classes, selectedClassName, academicLevels]);

  const sectionOptions = useMemo(
    () => classes.filter((item) => (!selectedClassName || item.name === selectedClassName) && (!selectedAcademicLevelId || item.academicLevelId === selectedAcademicLevelId)),
    [classes, selectedClassName, selectedAcademicLevelId]
  );

  const selectedSemesterName = academicLevels.find((item) => item.id === selectedAcademicLevelId)?.name || "";
  const selectedSectionLabel = sectionOptions.find((item) => item.id === selectedSectionId)?.section || "";

  const visibleSubjects = useMemo(() => {
    if (generationScope === "INSTITUTE") return subjects;

    if (selectedSectionId) {
      const section = classes.find((item) => item.id === selectedSectionId);
      const ids = new Set(section?.subjects || []);
      return subjects.filter((subject) => ids.has(subject.id));
    }

    const ids = new Set(sectionOptions.flatMap((item) => item.subjects || []));
    return subjects.filter((subject) => ids.has(subject.id));
  }, [generationScope, subjects, selectedSectionId, classes, sectionOptions]);

  useEffect(() => {
    if (!selectedClassName && classNameOptions.length > 0) {
      setSelectedClassName(classNameOptions[0]);
    }
  }, [classNameOptions, selectedClassName]);

  useEffect(() => {
    if (selectedAcademicLevelId && !semesterOptions.some((item) => item.id === selectedAcademicLevelId)) {
      setSelectedAcademicLevelId("");
    }
  }, [selectedAcademicLevelId, semesterOptions]);

  useEffect(() => {
    if (selectedSectionId && !sectionOptions.some((item) => item.id === selectedSectionId)) {
      setSelectedSectionId("");
    }
  }, [selectedSectionId, sectionOptions]);

  const handleGenerate = async () => {
    if (!campus) {
      toast({ title: "Error", description: "Please select a campus first", variant: "destructive" });
      return;
    }

    if (generationScope === "CLASS" && !selectedAcademicLevelId) {
      toast({ title: "Error", description: "Please select a semester", variant: "destructive" });
      return;
    }

    if (generationScope === "CLASS" && !selectedSectionId) {
      toast({ title: "Error", description: "Please select a section", variant: "destructive" });
      return;
    }

    setGenerating(true);
    setDone(false);

    const settingsPayload = {
      campusId: campus.id,
      generationScope,
      changeRoomEveryLecture,
      selectedClassName,
      selectedAcademicLevelId: generationScope === "CLASS" ? selectedAcademicLevelId : undefined,
      selectedSectionId: generationScope === "CLASS" ? selectedSectionId : undefined,
      subjectWeeklyLectures,
    };

    try {
      const savedSettingsResponse = await api.post("/timetable/settings", settingsPayload);
      setLastSettingsSavedAt(
        savedSettingsResponse?.data?.updatedAt
          ? new Date(savedSettingsResponse.data.updatedAt).toLocaleString()
          : new Date().toLocaleString()
      );

      const generateResponse = await api.post("/timetable/generate", {
        campusId: campus.id,
        generationScope,
        academicLevelId: generationScope === "CLASS" ? selectedAcademicLevelId : undefined,
        sectionId: generationScope === "CLASS" ? selectedSectionId : undefined,
        changeRoomEveryLecture,
        subjectWeeklyLectures: (generationScope === "INSTITUTE"
          ? subjectWeeklyLectures
          : visibleSubjects.reduce((acc: Record<string, number>, subject) => {
              acc[subject.id] = subjectWeeklyLectures[subject.id] ?? 0;
              return acc;
            }, {})),
      });

      // Capture usage data from response
      if (generateResponse?.data?.usage) {
        setUsage(generateResponse.data.usage);
        window.localStorage.setItem(
          getUsageStorageKey(campus.id),
          JSON.stringify(generateResponse.data.usage)
        );
      }

      setDone(true);
      setLimitExceeded(false);
      toast({
        title: "Timetable generated!",
        description: `Your conflict-free schedule is ready for ${institution?.type || "the selected institution type"}${campus?.name ? ` (${campus.name})` : ""}.`,
      });
    } catch (err: any) {
      const errorStatus = err.response?.status;
      const errorData = err.response?.data;

      // Handle usage limit exceeded
      if (errorStatus === 403 && errorData?.usage) {
        setUsage(errorData.usage);
        setLimitExceeded(true);
        window.localStorage.setItem(
          getUsageStorageKey(campus.id),
          JSON.stringify(errorData.usage)
        );
        toast({
          title: "Usage limit reached",
          description: "Please upgrade your plan to generate more timetables.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Generation failed",
          description: errorData?.message || "Something went wrong",
          variant: "destructive",
        });
      }
    } finally {
      setGenerating(false);
    }
  };

  const isUsageBlocked = limitExceeded || usage?.remaining === 0;

  const getUpgradeText = (plan: string) => {
    switch (plan) {
      case "FREE":
        return "Upgrade to PRO — Get 50 Timetables/month";
      case "PRO":
        return "Upgrade to ENTERPRISE — Unlimited Timetables";
      default:
        return "Upgrade Your Plan";
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Generate Timetable" description="Run the scheduling algorithm to create a conflict-free timetable" />

      <Card className="card-shadow">
        <CardContent className="flex items-center gap-4 p-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            {done ? <CheckCircle className="h-7 w-7 text-success" /> : <Wand2 className="h-7 w-7 text-primary" />}
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">{done ? "Timetable Generated!" : "Smart Schedule Generator"}</p>
            <p className="text-sm text-muted-foreground">
              {done
                ? "Your conflict-free timetable has been created."
                : "Configure scope, class target, and subject lecture plan before generation."}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="card-shadow">
          <CardHeader><CardTitle className="text-base">Generation Options</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Generate For</Label>
              <Select value={generationScope} onValueChange={(value: "CLASS" | "INSTITUTE") => setGenerationScope(value)}>
                <SelectTrigger><SelectValue placeholder="Select scope" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLASS">One Specific Class</SelectItem>
                  <SelectItem value="INSTITUTE">Whole Institute</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium text-foreground">Change room after every lecture</p>
                <p className="text-xs text-muted-foreground">Optional room rotation</p>
              </div>
              <Switch checked={changeRoomEveryLecture} onCheckedChange={setChangeRoomEveryLecture} />
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader><CardTitle className="text-base">Class Target</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {generationScope === "CLASS" ? (
              <>
                <div className="space-y-2">
                  <Label>Class</Label>
                  <Select value={selectedClassName || undefined} onValueChange={(value) => { setSelectedClassName(value); setSelectedAcademicLevelId(""); setSelectedSectionId(""); }} disabled={loadingOptions || classNameOptions.length === 0}>
                    <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>
                      {classNameOptions.map((className) => (
                        <SelectItem key={className} value={className}>{className}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Semester (Academic Level)</Label>
                  <Select value={selectedAcademicLevelId || undefined} onValueChange={(value) => { setSelectedAcademicLevelId(value); setSelectedSectionId(""); }} disabled={loadingOptions || !campus || semesterOptions.length === 0}>
                    <SelectTrigger><SelectValue placeholder="Select semester" /></SelectTrigger>
                    <SelectContent>
                      {semesterOptions.map((level) => (
                        <SelectItem key={level.id} value={level.id}>{level.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Section</Label>
                  <Select value={selectedSectionId || undefined} onValueChange={setSelectedSectionId} disabled={loadingOptions || sectionOptions.length === 0}>
                    <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                    <SelectContent>
                      {sectionOptions.map((item) => (
                        <SelectItem key={item.id} value={item.id}>{item.section || item.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Whole institute generation selected. All eligible classes will be included.</p>
            )}
          </CardContent>
        </Card>

        <Card className="card-shadow lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Lectures per Subject per Week</CardTitle></CardHeader>
          <CardContent>
            <div className="max-h-72 space-y-2 overflow-y-auto rounded-md border border-border p-3">
              {visibleSubjects.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {generationScope === "CLASS"
                    ? "No subjects assigned for the selected class/section."
                    : "No subjects available for this campus."}
                </p>
              ) : (
                visibleSubjects.map((subject) => (
                  <div key={subject.id} className="grid grid-cols-[1fr_110px] items-center gap-2">
                    <div className="text-sm text-foreground">
                      {subject.name}
                      <p className="text-xs text-muted-foreground">Credit Hours: {subject.creditHours ?? subject.weeklyHours ?? 0} (1 credit = 1 lecture hour)</p>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={subjectWeeklyLectures[subject.id] ?? 0}
                      onChange={(e) => {
                        const nextValue = Number(e.target.value);
                        setSubjectWeeklyLectures((prev) => ({
                          ...prev,
                          [subject.id]: Number.isFinite(nextValue) ? Math.max(0, Math.floor(nextValue)) : 0,
                        }));
                      }}
                    />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              Summary & Action
              {(institution?.type || campus?.name) && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {institution?.type || ""}
                  {institution?.type && campus?.name ? " • " : ""}
                  {campus?.name || ""}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Institution Type:</span>{" "}
                <span className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground">
                  {institution?.type || "—"}
                </span>
              </p>
              <p><span className="font-medium text-foreground">Scope:</span> {generationScope === "INSTITUTE" ? "Whole Institute" : "One Specific Class"}</p>
              {generationScope === "CLASS" && (
                <p>
                  <span className="font-medium text-foreground">Target:</span>{" "}
                  {selectedClassName || "—"}
                  {selectedSemesterName ? ` • ${selectedSemesterName}` : ""}
                  {selectedSectionLabel ? ` • ${selectedSectionLabel}` : ""}
                </p>
              )}
              <p><span className="font-medium text-foreground">Room Rotation:</span> {changeRoomEveryLecture ? "Enabled" : "Disabled"}</p>
              <p><span className="font-medium text-foreground">Lecture Plan:</span> {visibleSubjects.length} subject(s) configured</p>
              <p>
                <span className="font-medium text-foreground">Settings:</span>{" "}
                {lastSettingsSavedAt
                  ? `Saved (${lastSettingsSavedAt})`
                  : "Not saved yet for this institution type"}
              </p>
            </div>

            <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-3">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-medium text-blue-900">
                  <TrendingUp className="h-4 w-4" />
                  Monthly Usage
                </p>
                {usage?.plan ? (
                  <span className="rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                    {usage.plan}
                  </span>
                ) : null}
              </div>
              {usage ? (
                <div className="mt-2 space-y-2 text-sm">
                  <p className="text-foreground">Timetables used: {usage.used} / {usage.limit === -1 ? "Unlimited" : usage.limit}</p>
                  {usage.limit === -1 ? (
                    <p className="text-green-700 font-medium">Unlimited usage (Enterprise plan)</p>
                  ) : (
                    <>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-blue-200">
                        <div
                          className="h-full bg-blue-600 transition-all"
                          style={{ width: `${Math.min((usage.used / usage.limit) * 100, 100)}%` }}
                        />
                      </div>
                      {usage.remaining === 1 ? (
                        <p className="text-orange-600 font-medium">⚠ Last generation remaining this month</p>
                      ) : (
                        <p className={limitExceeded ? "text-destructive" : "text-blue-800"}>
                          Remaining: {usage.remaining} generation(s) remaining this month
                        </p>
                      )}
                    </>
                  )}
                  {limitExceeded ? (
                    <div className="space-y-2 pt-2">
                      <p className="text-xs text-muted-foreground">You're currently on {usage.plan} plan</p>
                      <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700">
                        {getUpgradeText(usage.plan)}
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">No usage history yet for this campus. Generate once to start tracking.</p>
              )}
            </div>

            {done ? (
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => navigate("/timetable")}>View Timetable</Button>
                <Button variant="outline" onClick={() => { setDone(false); handleGenerate(); }}>Regenerate</Button>
              </div>
            ) : (
              <Button
                size="lg"
                onClick={handleGenerate}
                className={isUsageBlocked ? "bg-amber-600 text-white hover:bg-amber-600" : undefined}
                disabled={
                  isUsageBlocked ||
                  generating ||
                  loadingOptions ||
                  loadingSettings ||
                  (generationScope === "CLASS" && (!selectedClassName || !selectedAcademicLevelId || !selectedSectionId))
                }
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : isUsageBlocked ? (
                  <>Upgrade to Continue</>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-5 w-5" />
                    Generate Timetable
                  </>
                )}
              </Button>
            )}

            {generating && (
              <div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full animate-pulse rounded-full bg-primary" style={{ width: "60%" }} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Processing constraints and generating schedule...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

export default GenerateTimetablePage;
