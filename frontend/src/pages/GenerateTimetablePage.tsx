import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Wand2, Loader2, CheckCircle } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useInstitution } from "@/contexts/InstitutionContext";

type AcademicLevelOption = { id: string; name: string };
type ClassOption = { id: string; name: string; section?: string; semester?: string; academicLevelId?: string };

const GenerateTimetablePage = () => {
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [academicLevels, setAcademicLevels] = useState<AcademicLevelOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassName, setSelectedClassName] = useState("");
  const [selectedAcademicLevelId, setSelectedAcademicLevelId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();
  const { campus, academicLevel } = useInstitution();

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
        const [levelsRes, classesRes] = await Promise.all([
          api.get(`/academic-levels?campusId=${campus.id}`),
          api.get(`/classes?campusId=${campus.id}`),
        ]);

        const fetchedLevels = levelsRes.data || [];
        const fetchedClasses = classesRes.data || [];

        setAcademicLevels(fetchedLevels);
        setClasses(fetchedClasses);
        setSelectedClassName((prev) => prev || fetchedClasses[0]?.name || "");
        setSelectedAcademicLevelId((prev) => prev || academicLevel?.id || "");
      } catch {
        setAcademicLevels([]);
        setClasses([]);
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchOptions();
  }, [campus, academicLevel]);

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

    if (!selectedAcademicLevelId) {
      toast({ title: "Error", description: "Please select a semester", variant: "destructive" });
      return;
    }

    if (!selectedSectionId) {
      toast({ title: "Error", description: "Please select a section", variant: "destructive" });
      return;
    }

    setGenerating(true);
    setDone(false);
    try {
      await api.post("/timetable/generate", {
        campusId: campus.id,
        academicLevelId: selectedAcademicLevelId,
        sectionId: selectedSectionId,
      });
      setDone(true);
      toast({ title: "Timetable generated!", description: "Your conflict-free schedule is ready." });
    } catch (err: any) {
      toast({
        title: "Generation failed",
        description: err.response?.data?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Generate Timetable" description="Run the scheduling algorithm to create a conflict-free timetable" />

      <div className="mx-auto max-w-lg">
        <div className="rounded-lg border border-border bg-card p-8 text-center card-shadow">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            {done ? (
              <CheckCircle className="h-10 w-10 text-success" />
            ) : (
              <Wand2 className="h-10 w-10 text-primary" />
            )}
          </div>

          <h3 className="mb-2 text-xl font-semibold text-foreground">
            {done ? "Timetable Generated!" : "Smart Schedule Generator"}
          </h3>
          <p className="mb-6 text-sm text-muted-foreground">
            {done
              ? "Your conflict-free timetable has been created. View it now."
              : "Our algorithm will analyze all teachers, subjects, rooms, and classes to generate an optimal, conflict-free timetable."}
          </p>

          <div className="mb-6 space-y-3 text-left">
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={selectedClassName || undefined} onValueChange={(value) => { setSelectedClassName(value); setSelectedAcademicLevelId(""); setSelectedSectionId(""); }} disabled={loadingOptions || classNameOptions.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
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
                <SelectTrigger>
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
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
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {sectionOptions.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.section || item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {done ? (
            <div className="flex justify-center gap-3">
              <Button onClick={() => navigate("/timetable")}>View Timetable</Button>
              <Button variant="outline" onClick={() => { setDone(false); handleGenerate(); }}>
                Regenerate
              </Button>
            </div>
          ) : (
            <Button size="lg" onClick={handleGenerate} disabled={generating || loadingOptions || !selectedClassName || !selectedAcademicLevelId || !selectedSectionId}>
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-5 w-5" />
                  Generate Timetable
                </>
              )}
            </Button>
          )}

          {generating && (
            <div className="mt-6">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full animate-pulse rounded-full bg-primary" style={{ width: "60%" }} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Processing constraints and generating schedule...</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default GenerateTimetablePage;
