import { useState, useEffect, Fragment } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Printer, Download, Calendar } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { motion } from "framer-motion";
import { useInstitution } from "@/contexts/InstitutionContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface TimetableEntry {
  id: string;
  generationBatchId?: string;
  day: string;
  time: string;
  subject: string;
  teacher: string;
  room: string;
  class: string;
  className?: string;
  semester?: string;
  section?: string;
  teacherId?: string;
  roomId?: string;
  dayId?: string;
  timeSlotId?: string;
  createdAt?: string;
  status?: string;
}

type TeacherOption = { id: string; name: string };
type RoomOption = { id: string; name: string };
type DayOption = { id: string; dayName: string };
type TimeSlotOption = { id: string; startTime: string; endTime: string; isBreak?: boolean };
type HistoryBatchGroup = { batchId: string; createdAt?: string; entries: TimetableEntry[] };

const TimetablePage = () => {
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [historyEntries, setHistoryEntries] = useState<TimetableEntry[]>([]);
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
  const [teacherOptions, setTeacherOptions] = useState<TeacherOption[]>([]);
  const [roomOptions, setRoomOptions] = useState<RoomOption[]>([]);
  const [dayOptionsData, setDayOptionsData] = useState<DayOption[]>([]);
  const [timeSlotOptionsData, setTimeSlotOptionsData] = useState<TimeSlotOption[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<TimetableEntry | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [showAllHistorySelection, setShowAllHistorySelection] = useState(false);
  const [expandedBatchIds, setExpandedBatchIds] = useState<Record<string, boolean>>({});
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<string[]>([]);
  const [editForm, setEditForm] = useState({ teacherId: "", roomId: "", dayId: "", timeSlotId: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  const { toast } = useToast();
  const { institution, campus } = useInstitution();
  const historyExpandStateKey = `timetable-history-expanded:${campus?.id || "all"}`;

  const fetchData = async () => {
    try {
      const params = campus ? `?campusId=${campus.id}` : "";
      const [tt, history, te, ro, wd, ts] = await Promise.all([
        api.get(`/timetable${params}`).catch(() => ({ data: [] })),
        api.get(`/timetable/history${params}`).catch(() => ({ data: [] })),
        api.get(`/teachers${params}`).catch(() => ({ data: [] })),
        api.get(`/rooms${params}`).catch(() => ({ data: [] })),
        api.get(`/workingdays${params}`).catch(() => ({ data: [] })),
        api.get(`/timeslots${params}`).catch(() => ({ data: [] })),
      ]);

      setTimetable(tt.data || []);
      setHistoryEntries(history.data || []);
      setTeachers((te.data || []).map((t: any) => t.name));
      setRooms((ro.data || []).map((r: any) => r.name));
      setTeacherOptions((te.data || []).map((t: any) => ({ id: t.id, name: t.name })));
      setRoomOptions((ro.data || []).map((r: any) => ({ id: r.id, name: r.name })));
      setDayOptionsData(wd.data || []);
      setTimeSlotOptionsData(ts.data || []);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [campus]);

  useEffect(() => {
    if (showAllHistorySelection) return;
    if (selectedBatchId) {
      const batchExists = historyEntries.some((item) => item.generationBatchId === selectedBatchId);
      if (!batchExists) {
        setSelectedBatchId("");
        setSelectedHistoryEntry(null);
      }
      return;
    }
    if (!selectedHistoryEntry) return;
    const refreshed = historyEntries.find((item) => item.id === selectedHistoryEntry.id);
    setSelectedHistoryEntry(refreshed || null);
  }, [historyEntries, selectedHistoryEntry, selectedBatchId, showAllHistorySelection]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(historyExpandStateKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        setExpandedBatchIds(parsed);
      }
    } catch {
      setExpandedBatchIds({});
    }
  }, [historyExpandStateKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(historyExpandStateKey, JSON.stringify(expandedBatchIds));
    } catch {
      // ignore localStorage write issues
    }
  }, [expandedBatchIds, historyExpandStateKey]);

  const selectedBatchEntries = selectedBatchId
    ? historyEntries.filter((item) => item.generationBatchId === selectedBatchId)
    : [];

  const sourceEntries = showAllHistorySelection
    ? historyEntries
    : selectedBatchEntries.length > 0
      ? selectedBatchEntries
      : selectedHistoryEntry
        ? [selectedHistoryEntry]
        : timetable;

  const filteredEntries = sourceEntries.filter((entry) => {
    if (viewBy === "class") {
      if (selectedClassName && (entry.className || "") !== selectedClassName) return false;
      if (selectedSemester && (entry.semester || "") !== selectedSemester) return false;
      if (selectedSection && (entry.section || "") !== selectedSection) return false;
      return true;
    }

    if (!filterValue) return true;
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

  const groupedHistoryBatches = historyEntries.reduce<HistoryBatchGroup[]>((acc, entry) => {
    const batchId = entry.generationBatchId || `single:${entry.id}`;
    const found = acc.find((group) => group.batchId === batchId);
    if (found) {
      found.entries.push(entry);
      return acc;
    }
    acc.push({ batchId, createdAt: entry.createdAt, entries: [entry] });
    return acc;
  }, []);

  const selectedHistoryEntries = historyEntries.filter((entry) => selectedHistoryIds.includes(entry.id));
  const allHistorySelected = historyEntries.length > 0 && selectedHistoryIds.length === historyEntries.length;
  const someHistorySelected = selectedHistoryIds.length > 0 && !allHistorySelected;

  const handlePrint = () => window.print();
  const handleExportPDF = () => {
    if (filteredEntries.length === 0) {
      toast({ title: "No data", description: "No timetable entries available for export", variant: "destructive" });
      return;
    }

    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const institutionName = institution?.name || "Institution";
    const dateRangeLabel = effectiveFrom && effectiveTo ? `${effectiveFrom} to ${effectiveTo}` : "Not specified";
    const noteLabel = exportNote.trim() || "N/A";
    const filterSummary = viewBy === "class"
      ? `Class: ${selectedClassName || "All"} | Semester: ${selectedSemester || "All"} | Section: ${selectedSection || "All"}`
      : `${viewBy === "teacher" ? "Teacher" : "Room"}: ${filterValue || "All"}`;

    doc.setFontSize(16);
    doc.text(`${institutionName} - Timetable`, 40, 40);
    doc.setFontSize(10);
    doc.text(`Date Range: ${dateRangeLabel}`, 40, 60);
    doc.text(`Note: ${noteLabel}`, 40, 76);
    doc.text(`Filters: ${filterSummary}`, 40, 92);

    const rows = filteredEntries.map((entry) => [
      entry.class || "—",
      entry.day || "—",
      entry.time || "—",
      entry.subject || "—",
      entry.teacher || "—",
      entry.room || "—",
    ]);

    autoTable(doc, {
      startY: 108,
      head: [["Class", "Day", "Time", "Subject", "Teacher", "Room"]],
      body: rows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 128, 185] },
    });

    doc.save("timetable.pdf");
  };

  const openEdit = (entry: TimetableEntry) => {
    setEditingEntry(entry);
    setEditForm({
      teacherId: entry.teacherId || "",
      roomId: entry.roomId || "",
      dayId: entry.dayId || "",
      timeSlotId: entry.timeSlotId || "",
    });
    setEditOpen(true);
  };

  const handleSelectHistoryEntry = (entry: TimetableEntry) => {
    const nextBatchId = entry.generationBatchId || "";
    setShowAllHistorySelection(false);
    setSelectedBatchId(nextBatchId);
    setSelectedHistoryEntry(entry);
    setViewBy("class");
    setFilterValue("");
    setSelectedClassName(entry.className || "");
    setSelectedSemester(entry.semester || "");
    setSelectedSection(entry.section || "");
    if (nextBatchId) {
      const batchCount = historyEntries.filter((item) => item.generationBatchId === nextBatchId).length;
      toast({ title: "History batch selected", description: `Showing ${batchCount} entries from this generation` });
    } else {
      toast({ title: "History entry selected", description: "Showing selected timetable entry above" });
    }
  };

  const handleSelectAllHistory = () => {
    setShowAllHistorySelection(true);
    setSelectedBatchId("");
    setSelectedHistoryEntry(null);
    setViewBy("class");
    setFilterValue("");
    setSelectedClassName("");
    setSelectedSemester("");
    setSelectedSection("");
    toast({ title: "All history selected", description: `Showing ${historyEntries.length} history entries above` });
  };

  const clearHistorySelection = () => {
    setShowAllHistorySelection(false);
    setSelectedBatchId("");
    setSelectedHistoryEntry(null);
  };

  const toggleBatchExpanded = (batchId: string) => {
    setExpandedBatchIds((prev) => ({ ...prev, [batchId]: !prev[batchId] }));
  };

  const handleExpandAllBatches = () => {
    const next: Record<string, boolean> = {};
    groupedHistoryBatches.forEach((group) => {
      next[group.batchId] = true;
    });
    setExpandedBatchIds(next);
  };

  const handleCollapseAllBatches = () => {
    const next: Record<string, boolean> = {};
    groupedHistoryBatches.forEach((group) => {
      next[group.batchId] = false;
    });
    setExpandedBatchIds(next);
  };

  const handleResetHistoryView = () => {
    try {
      window.localStorage.removeItem(historyExpandStateKey);
    } catch {
      // ignore localStorage write issues
    }
    setExpandedBatchIds({});
    toast({ title: "History view reset", description: "Batch expand/collapse preferences cleared" });
  };

  const toggleSelectAllHistoryRows = (checked: boolean) => {
    if (checked) {
      setSelectedHistoryIds(historyEntries.map((entry) => entry.id));
      return;
    }
    setSelectedHistoryIds([]);
  };

  const toggleHistoryRowSelection = (entryId: string, checked: boolean) => {
    setSelectedHistoryIds((prev) => {
      if (checked) {
        if (prev.includes(entryId)) return prev;
        return [...prev, entryId];
      }
      return prev.filter((id) => id !== entryId);
    });
  };

  const toggleBatchRowSelection = (group: HistoryBatchGroup, checked: boolean) => {
    const batchIds = group.entries.map((entry) => entry.id);
    setSelectedHistoryIds((prev) => {
      if (checked) {
        return Array.from(new Set([...prev, ...batchIds]));
      }
      return prev.filter((id) => !batchIds.includes(id));
    });
  };

  const handleExportSelectedHistory = () => {
    if (selectedHistoryEntries.length === 0) {
      toast({ title: "No selection", description: "Select one or more history entries to export", variant: "destructive" });
      return;
    }

    const selectedSet = new Set(selectedHistoryIds);
    const orderedSelectedEntries = groupedHistoryBatches
      .flatMap((group) => group.entries)
      .filter((entry) => selectedSet.has(entry.id));

    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const institutionName = institution?.name || "Institution";

    doc.setFontSize(16);
    doc.text(`${institutionName} - Selected Timetable History`, 40, 40);
    doc.setFontSize(10);
    doc.text(`Selected Entries: ${orderedSelectedEntries.length}`, 40, 60);

    const rows = orderedSelectedEntries.map((entry) => [
      entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "—",
      entry.class || "—",
      entry.day || "—",
      entry.time || "—",
      entry.subject || "—",
      entry.teacher || "—",
      entry.room || "—",
      entry.status || "DRAFT",
    ]);

    autoTable(doc, {
      startY: 76,
      head: [["Created", "Class", "Day", "Time", "Subject", "Teacher", "Room", "Status"]],
      body: rows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 128, 185] },
    });

    doc.save("selected-timetable-history.pdf");
  };

  const handleDeleteSelectedHistory = async () => {
    if (selectedHistoryIds.length === 0) {
      toast({ title: "No selection", description: "Select one or more history entries to delete", variant: "destructive" });
      return;
    }

    const ok = window.confirm(`Delete ${selectedHistoryIds.length} selected timetable entries?`);
    if (!ok) return;

    const selectedSet = new Set(selectedHistoryIds);
    try {
      const results = await Promise.allSettled(selectedHistoryIds.map((id) => api.delete(`/timetable/${id}`)));
      const successCount = results.filter((item) => item.status === "fulfilled").length;
      const failedCount = results.length - successCount;

      if (selectedHistoryEntry?.id && selectedSet.has(selectedHistoryEntry.id)) {
        setSelectedHistoryEntry(null);
      }
      if (selectedBatchId) {
        const selectedInCurrentBatch = historyEntries.filter(
          (entry) => entry.generationBatchId === selectedBatchId && selectedSet.has(entry.id)
        );
        const totalInCurrentBatch = historyEntries.filter((entry) => entry.generationBatchId === selectedBatchId).length;
        if (selectedInCurrentBatch.length >= totalInCurrentBatch) {
          setSelectedBatchId("");
        }
      }

      setSelectedHistoryIds([]);
      await fetchData();

      if (failedCount > 0) {
        toast({
          title: "Partial delete completed",
          description: `${successCount} deleted, ${failedCount} failed`,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Selected entries deleted", description: `${successCount} entries removed` });
    } catch (err: any) {
      toast({ title: "Bulk delete failed", description: err.response?.data?.message || "Failed", variant: "destructive" });
    }
  };

  const handleDeleteEntry = async (entry: TimetableEntry) => {
    const ok = window.confirm("Delete this timetable entry from history?");
    if (!ok) return;

    try {
      await api.delete(`/timetable/${entry.id}`);
      if (selectedHistoryEntry?.id === entry.id) {
        setSelectedHistoryEntry(null);
      }
      if (selectedBatchId && entry.generationBatchId === selectedBatchId) {
        const remainingInBatch = historyEntries.filter(
          (item) => item.generationBatchId === selectedBatchId && item.id !== entry.id
        );
        if (remainingInBatch.length === 0) {
          setSelectedBatchId("");
        }
      }
      toast({ title: "Timetable deleted" });
      fetchData();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.response?.data?.message || "Failed", variant: "destructive" });
    }
  };

  const handleSaveEdit = async () => {
    if (!editingEntry) return;
    if (!editForm.teacherId || !editForm.roomId || !editForm.dayId || !editForm.timeSlotId) {
      toast({ title: "Error", description: "Please select teacher, room, day and timeslot", variant: "destructive" });
      return;
    }

    setSavingEdit(true);
    try {
      await api.put(`/timetable/${editingEntry.id}`, editForm);
      toast({ title: "Timetable updated" });
      setEditOpen(false);
      fetchData();
    } catch (err: any) {
      toast({ title: "Update failed", description: err.response?.data?.message || "Failed", variant: "destructive" });
    } finally {
      setSavingEdit(false);
    }
  };

  const getBatchLabel = (entry: TimetableEntry) => {
    if (!entry.generationBatchId) return "—";
    const createdPart = entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "Unknown";
    return `Batch ${createdPart}`;
  };

  if (loading) return <SkeletonLoader type="table" count={8} />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <PageHeader
        title="Timetable"
        description="View generated timetable, history, and edit entries"
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
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classOptions.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
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
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Select semester" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Semesters</SelectItem>
                {semesterOptions.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={selectedSection || "all"} onValueChange={(value) => setSelectedSection(value === "all" ? "" : value)}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Select section" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {sectionOptions.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        ) : (
          <Select value={filterValue || "all"} onValueChange={(value) => setFilterValue(value === "all" ? "" : value)}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder={`Select ${viewBy}`} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {filterOptions.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
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

      {(showAllHistorySelection || selectedBatchId || selectedHistoryEntry) && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
          <p className="text-sm text-foreground">
            {showAllHistorySelection
              ? `Selected from history: All entries (${historyEntries.length})`
              : selectedBatchId
                ? `Selected from history: Batch entries (${selectedBatchEntries.length})`
                : `Selected from history: ${selectedHistoryEntry?.class || "—"} · ${selectedHistoryEntry?.day || "—"} · ${selectedHistoryEntry?.time || "—"}`}
          </p>
          <Button variant="outline" size="sm" onClick={clearHistorySelection}>Clear Selection</Button>
        </div>
      )}

      {timetable.length === 0 ? (
        <EmptyState title="No timetable generated yet" description="Go to the Generate page to create a new timetable." icon={<Calendar className="h-8 w-8 text-muted-foreground" />} />
      ) : filteredEntries.length === 0 ? (
        <EmptyState title="No timetable entries for this filter" description="Try a different class, semester, section, teacher, or room filter." icon={<Calendar className="h-8 w-8 text-muted-foreground" />} />
      ) : (
        <div className="rounded-lg border border-border bg-card card-shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Time</th>
                {dayOptions.map((day) => <th key={day} className="px-4 py-3 text-left font-medium text-muted-foreground">{day}</th>)}
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

      <div className="rounded-lg border border-border bg-card card-shadow p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Generated Timetable History</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{historyEntries.length} entries</span>
            <Button variant="outline" size="sm" onClick={handleExportSelectedHistory} disabled={selectedHistoryIds.length === 0}>
              Export Selected ({selectedHistoryIds.length})
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteSelectedHistory} disabled={selectedHistoryIds.length === 0}>
              Delete Selected ({selectedHistoryIds.length})
            </Button>
            <Button variant="outline" size="sm" onClick={handleSelectAllHistory} disabled={historyEntries.length === 0}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={handleExpandAllBatches} disabled={historyEntries.length === 0}>
              Expand All
            </Button>
            <Button variant="outline" size="sm" onClick={handleCollapseAllBatches} disabled={historyEntries.length === 0}>
              Collapse All
            </Button>
            <Button variant="outline" size="sm" onClick={handleResetHistoryView} disabled={historyEntries.length === 0}>
              Reset View
            </Button>
          </div>
        </div>
        {historyEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No history available yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allHistorySelected ? true : someHistorySelected ? "indeterminate" : false}
                      onCheckedChange={(checked) => toggleSelectAllHistoryRows(checked === true)}
                      aria-label="Select all history entries"
                    />
                  </TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Day</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-64">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedHistoryBatches.map((group) => {
                  const isExpanded = expandedBatchIds[group.batchId] ?? true;
                  const representative = group.entries[0];
                  const isSelectedBatch = !!selectedBatchId && representative?.generationBatchId === selectedBatchId;

                  return (
                    <Fragment key={`batch-wrap-${group.batchId}`}>
                      <TableRow>
                        <TableCell>
                          <Checkbox
                            checked={
                              group.entries.every((entry) => selectedHistoryIds.includes(entry.id))
                                ? true
                                : group.entries.some((entry) => selectedHistoryIds.includes(entry.id))
                                  ? "indeterminate"
                                  : false
                            }
                            onCheckedChange={(checked) => toggleBatchRowSelection(group, checked === true)}
                            aria-label="Select batch entries"
                          />
                        </TableCell>
                        <TableCell>{group.createdAt ? new Date(group.createdAt).toLocaleString() : "—"}</TableCell>
                        <TableCell>
                          <Badge variant={isSelectedBatch ? "default" : "secondary"} className="text-xs">
                            {getBatchLabel(representative)}
                          </Badge>
                        </TableCell>
                        <TableCell colSpan={6} className="text-sm text-muted-foreground">
                          {group.entries.length} entries in this batch
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">BATCH</Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => toggleBatchExpanded(group.batchId)}>
                            {isExpanded ? "Collapse" : "Expand"}
                          </Button>
                        </TableCell>
                      </TableRow>

                      {isExpanded && group.entries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedHistoryIds.includes(entry.id)}
                              onCheckedChange={(checked) => toggleHistoryRowSelection(entry.id, checked === true)}
                              aria-label="Select history entry"
                            />
                          </TableCell>
                          <TableCell>{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "—"}</TableCell>
                          <TableCell>
                            <Badge variant={selectedBatchId && selectedBatchId === entry.generationBatchId ? "default" : "secondary"} className="text-xs">
                              {getBatchLabel(entry)}
                            </Badge>
                          </TableCell>
                          <TableCell>{entry.class || "—"}</TableCell>
                          <TableCell>{entry.day || "—"}</TableCell>
                          <TableCell>{entry.time || "—"}</TableCell>
                          <TableCell>{entry.subject || "—"}</TableCell>
                          <TableCell>{entry.teacher || "—"}</TableCell>
                          <TableCell>{entry.room || "—"}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{entry.status || "DRAFT"}</Badge></TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleSelectHistoryEntry(entry)}>Select</Button>
                              <Button variant="outline" size="sm" onClick={() => openEdit(entry)}>Edit</Button>
                              <Button variant="destructive" size="sm" onClick={() => handleDeleteEntry(entry)}>Delete</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Timetable Entry</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Teacher</Label>
              <Select value={editForm.teacherId || undefined} onValueChange={(value) => setEditForm({ ...editForm, teacherId: value })}>
                <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                <SelectContent>
                  {teacherOptions.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Day</Label>
              <Select value={editForm.dayId || undefined} onValueChange={(value) => setEditForm({ ...editForm, dayId: value })}>
                <SelectTrigger><SelectValue placeholder="Select day" /></SelectTrigger>
                <SelectContent>
                  {dayOptionsData.map((item) => <SelectItem key={item.id} value={item.id}>{item.dayName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Time Slot</Label>
              <Select value={editForm.timeSlotId || undefined} onValueChange={(value) => setEditForm({ ...editForm, timeSlotId: value })}>
                <SelectTrigger><SelectValue placeholder="Select timeslot" /></SelectTrigger>
                <SelectContent>
                  {timeSlotOptionsData.map((item) => <SelectItem key={item.id} value={item.id}>{item.startTime} - {item.endTime}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Room</Label>
              <Select value={editForm.roomId || undefined} onValueChange={(value) => setEditForm({ ...editForm, roomId: value })}>
                <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                <SelectContent>
                  {roomOptions.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit}>{savingEdit ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default TimetablePage;
