import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Printer, Download, Calendar } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { motion } from "framer-motion";
import { useInstitution } from "@/contexts/InstitutionContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";

interface TimetableEntry {
  day: string;
  time: string;
  subject: string;
  teacher: string;
  room: string;
  class: string;
  className?: string;
  semester?: string;
  section?: string;
}

const TimetablePage = () => {
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewBy, setViewBy] = useState("class");
  const [filterValue, setFilterValue] = useState("");
  const [selectedClassName, setSelectedClassName] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [exportNote, setExportNote] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");
  const [teachers, setTeachers] = useState<string[]>([]);
  const [rooms, setRooms] = useState<string[]>([]);
  const { toast } = useToast();
  const { institution } = useInstitution();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tt, te, ro] = await Promise.all([
          api.get("/timetable").catch(() => ({ data: [] })),
          api.get("/teachers").catch(() => ({ data: [] })),
          api.get("/rooms").catch(() => ({ data: [] })),
        ]);
        setTimetable(tt.data);
        setTeachers(te.data.map((t: any) => t.name));
        setRooms(ro.data.map((r: any) => r.name));
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredEntries = timetable.filter((entry) => {
    if (viewBy === "class") {
      if (selectedClassName && (entry.className || "") !== selectedClassName) return false;
      if (selectedSemester && (entry.semester || "") !== selectedSemester) return false;
      if (selectedSection && (entry.section || "") !== selectedSection) return false;
      return true;
    }

    if (!filterValue) return true;
    if (viewBy === "class") return entry.class === filterValue;
    if (viewBy === "teacher") return entry.teacher === filterValue;
    if (viewBy === "room") return entry.room === filterValue;
    return true;
  });

  const dayOptions = Array.from(new Set(filteredEntries.map((entry) => entry.day).filter(Boolean)));
  const timeSlotOptions = Array.from(new Set(filteredEntries.map((entry) => entry.time).filter(Boolean)));

  const getEntry = (day: string, time: string) =>
    filteredEntries.find((e) => e.day === day && e.time === time);

  const classOptions = Array.from(new Set((timetable || []).map((item) => item.className || "").filter(Boolean)));
  const semesterOptions = Array.from(
    new Set(
      (timetable || [])
        .filter((item) => !selectedClassName || item.className === selectedClassName)
        .map((item) => item.semester || "")
        .filter(Boolean)
    )
  );
  const sectionOptions = Array.from(
    new Set(
      (timetable || [])
        .filter((item) => !selectedClassName || item.className === selectedClassName)
        .filter((item) => !selectedSemester || item.semester === selectedSemester)
        .map((item) => item.section || "")
        .filter(Boolean)
    )
  );

  const filterOptions = viewBy === "teacher" ? teachers : rooms;

  const handlePrint = () => window.print();
  const handleExportPDF = async () => {
    if (filteredEntries.length === 0) {
      toast({ title: "No data", description: "No timetable entries available for export", variant: "destructive" });
      return;
    }

    const el = document.getElementById("timetable-print-area");
    if (!el) {
      toast({ title: "Error", description: "Unable to locate timetable for export", variant: "destructive" });
      return;
    }

    try {
      // render element to canvas
      const canvas = await html2canvas(el, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      // header
      const institutionName = institution?.name || "Institution";
      pdf.setFontSize(14);
      pdf.text(`${institutionName} - Timetable`, 40, 30);

      // add image below header
      pdf.addImage(imgData, "PNG", 0, 40, pdfWidth, pdfHeight);
      pdf.save("timetable.pdf");
    } catch (err) {
      console.error(err);
      toast({ title: "Export failed", description: "Could not export timetable to PDF", variant: "destructive" });
    }
  };

  if (loading) return <SkeletonLoader type="table" count={8} />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <PageHeader
        title="Timetable"
        description="View the generated schedule"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint}><Printer className="mr-2 h-4 w-4" />Print</Button>
            <Button variant="outline" onClick={handleExportPDF}><Download className="mr-2 h-4 w-4" />Export PDF</Button>
          </div>
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Tabs value={viewBy} onValueChange={setViewBy} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="class">By Class</TabsTrigger>
            <TabsTrigger value="teacher">By Teacher</TabsTrigger>
            <TabsTrigger value="room">By Room</TabsTrigger>
          </TabsList>
        </Tabs>

        {viewBy === "class" ? (
          <>
            <Select
              value={selectedClassName || "all"}
              onValueChange={(value) => {
                const next = value === "all" ? "" : value;
                setSelectedClassName(next);
                setSelectedSemester("");
                setSelectedSection("");
              }}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedSemester || "all"}
              onValueChange={(value) => {
                const next = value === "all" ? "" : value;
                setSelectedSemester(next);
                setSelectedSection("");
              }}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Select semester" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Semesters</SelectItem>
                {semesterOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedSection || "all"}
              onValueChange={(value) => setSelectedSection(value === "all" ? "" : value)}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {sectionOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        ) : (
          <Select value={filterValue || "all"} onValueChange={(value) => setFilterValue(value === "all" ? "" : value)}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder={`Select ${viewBy}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {filterOptions.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-card p-3 md:grid-cols-3">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">From Date</p>
          <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">To Date</p>
          <Input type="date" value={effectiveTo} onChange={(e) => setEffectiveTo(e.target.value)} />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Note</p>
          <Input value={exportNote} onChange={(e) => setExportNote(e.target.value)} placeholder="e.g., Effective for Midterm period" />
        </div>
      </div>

      {timetable.length === 0 ? (
        <EmptyState
          title="No timetable generated yet"
          description="Go to the Generate page to create a new timetable."
          icon={<Calendar className="h-8 w-8 text-muted-foreground" />}
        />
      ) : filteredEntries.length === 0 ? (
        <EmptyState
          title="No timetable entries for this filter"
          description="Try a different class, semester, section, teacher, or room filter."
          icon={<Calendar className="h-8 w-8 text-muted-foreground" />}
        />
      ) : (
        <div id="timetable-print-area" className="rounded-lg border border-border bg-card card-shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Time</th>
                {dayOptions.map((d) => (
                  <th key={d} className="px-4 py-3 text-left font-medium text-muted-foreground">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlotOptions.map((time) => (
                <tr key={time} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{time}</td>
                  {dayOptions.map((day) => {
                    const entry = getEntry(day, time);
                    return (
                      <td key={day} className="px-4 py-3">
                        {entry ? (
                          <div className="rounded-md bg-primary/10 p-2">
                            <p className="text-xs font-semibold text-primary">{entry.subject}</p>
                            <p className="text-xs text-muted-foreground">{entry.teacher}</p>
                            <Badge variant="secondary" className="mt-1 text-xs">{entry.room}</Badge>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
};

export default TimetablePage;
