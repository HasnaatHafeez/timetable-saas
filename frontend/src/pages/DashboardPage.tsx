import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useInstitution } from "@/contexts/InstitutionContext";
import { useNavigate } from "react-router-dom";
import { Users, BookOpen, DoorOpen, School, Calendar, Activity, Building2, MapPin, Settings } from "lucide-react";
import { motion } from "framer-motion";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Stats {
  teachers: number;
  subjects: number;
  rooms: number;
  classes: number;
}

const statCards = [
  { key: "teachers" as const, label: "Teachers", icon: Users, color: "text-primary" },
  { key: "subjects" as const, label: "Subjects", icon: BookOpen, color: "text-accent" },
  { key: "rooms" as const, label: "Rooms", icon: DoorOpen, color: "text-warning" },
  { key: "classes" as const, label: "Classes", icon: School, color: "text-success" },
];

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const timeSlots = ["8:00", "9:00", "10:00", "11:00", "12:00", "1:00", "2:00", "3:00"];

const DashboardPage = () => {
  const [stats, setStats] = useState<Stats>({ teachers: 0, subjects: 0, rooms: 0, classes: 0 });
  const [loading, setLoading] = useState(true);
  const { institution, campus, academicLevel } = useInstitution();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const params = campus ? `?campusId=${campus.id}` : "";
        const [t, s, r, c] = await Promise.all([
          api.get(`/teachers${params}`).catch(() => ({ data: [] })),
          api.get(`/subjects${params}`).catch(() => ({ data: [] })),
          api.get(`/rooms${params}`).catch(() => ({ data: [] })),
          api.get(`/classes${params}`).catch(() => ({ data: [] })),
        ]);
        setStats({
          teachers: t.data.length || 0,
          subjects: s.data.length || 0,
          rooms: r.data.length || 0,
          classes: c.data.length || 0,
        });
      } catch {
        // Use 0s as fallback
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [campus]);

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader type="stat" count={4} />
        <SkeletonLoader type="table" count={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Dashboard" description="Overview of your university timetable system" />
        <Button variant="outline" size="sm" onClick={() => navigate("/setup")} className="gap-2">
          <Settings className="h-4 w-4" />
          Change Institution
        </Button>
      </div>

      {/* Institution & Campus Info */}
      {institution && campus && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-border bg-card p-6 card-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Institution</p>
                  <p className="text-lg font-semibold text-foreground">{institution.name}</p>
                  <Badge className="mt-1 bg-primary/10 text-primary">{institution.type}</Badge>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-accent" />
                <div>
                  <p className="text-sm text-muted-foreground">Campus</p>
                  <p className="text-lg font-semibold text-foreground">{campus.name}</p>
                  <p className="text-xs text-muted-foreground">{campus.location}</p>
                </div>
              </div>
              {academicLevel && (
                <div>
                  <p className="text-sm text-muted-foreground">Academic Level</p>
                  <p className="text-base font-semibold text-foreground">{academicLevel.name}</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="rounded-lg border border-border bg-card p-6 card-shadow transition-shadow hover:card-shadow-hover"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                <p className="mt-1 text-3xl font-bold text-foreground">{stats[card.key]}</p>
              </div>
              <div className={`rounded-lg bg-muted p-3 ${card.color}`}>
                <card.icon className="h-5 w-5" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Weekly Timetable Overview */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-lg border border-border bg-card card-shadow"
      >
        <div className="flex items-center gap-2 border-b border-border px-6 py-4">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Weekly Timetable Overview</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Time</th>
                {days.map((d) => (
                  <th key={d} className="px-4 py-3 text-left font-medium text-muted-foreground">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((time) => (
                <tr key={time} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">{time}</td>
                  {days.map((d) => (
                    <td key={d} className="px-4 py-3 text-muted-foreground">—</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-lg border border-border bg-card card-shadow"
      >
        <div className="flex items-center gap-2 border-b border-border px-6 py-4">
          <Activity className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Recent Activity</h3>
        </div>
        <div className="px-6 py-8 text-center text-sm text-muted-foreground">
          No recent activity to display. Start by adding teachers, subjects, and rooms.
        </div>
      </motion.div>
    </div>
  );
};

export default DashboardPage;
