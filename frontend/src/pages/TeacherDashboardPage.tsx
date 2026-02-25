import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { motion } from "framer-motion";
import PageHeader from "@/components/PageHeader";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock3 } from "lucide-react";

type TimetableRow = {
  id: string;
  day?: string;
  time?: string;
  subject?: string;
  room?: string;
};

const TeacherDashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<TimetableRow[]>([]);

  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        const response = await api.get("/timetable").catch(() => ({ data: [] }));
        const data = Array.isArray(response.data) ? response.data : [];
        setEntries(data.map((item: any) => ({
          id: item.id,
          day: item.day || item.dayName || "-",
          time: item.timeSlot || item.time || "-",
          subject: item.subject || item.subjectName || "-",
          room: item.room || item.roomName || "-",
        })));
      } finally {
        setLoading(false);
      }
    };

    fetchTimetable();
  }, []);

  const totalLectures = entries.length;
  const daysCount = useMemo(() => new Set(entries.map((entry) => entry.day)).size, [entries]);

  if (loading) {
    return <SkeletonLoader type="table" count={4} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teacher Dashboard"
        description="View timetable and lecture workload"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Total Lectures</p>
              <p className="text-2xl font-bold">{totalLectures}</p>
            </div>
            <Clock3 className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Teaching Days</p>
              <p className="text-2xl font-bold">{daysCount}</p>
            </div>
            <Calendar className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Timetable Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No timetable entries available yet.</p>
          ) : (
            entries.slice(0, 20).map((entry, index) => (
              <motion.div
                key={entry.id || index}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className="flex items-center justify-between rounded-md border border-border p-3"
              >
                <div>
                  <p className="font-medium">{entry.subject}</p>
                  <p className="text-xs text-muted-foreground">{entry.day} • {entry.time}</p>
                </div>
                <Badge variant="secondary">{entry.room}</Badge>
              </motion.div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherDashboardPage;
