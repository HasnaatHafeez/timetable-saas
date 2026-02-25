import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { useInstitution } from "@/contexts/InstitutionContext";
import { motion } from "framer-motion";
import PageHeader from "@/components/PageHeader";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, DoorOpen, School, Users } from "lucide-react";

interface Stats {
  teachers: number;
  subjects: number;
  rooms: number;
  classes: number;
}

const staffCards = [
  { key: "teachers" as const, label: "Teachers", icon: Users },
  { key: "subjects" as const, label: "Subjects", icon: BookOpen },
  { key: "rooms" as const, label: "Rooms", icon: DoorOpen },
  { key: "classes" as const, label: "Classes", icon: School },
];

const StaffAdminDashboardPage = () => {
  const [stats, setStats] = useState<Stats>({ teachers: 0, subjects: 0, rooms: 0, classes: 0 });
  const [loading, setLoading] = useState(true);
  const { campus } = useInstitution();

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
          teachers: t.data?.length || 0,
          subjects: s.data?.length || 0,
          rooms: r.data?.length || 0,
          classes: c.data?.length || 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [campus]);

  if (loading) {
    return <SkeletonLoader type="stat" count={4} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff Admin Dashboard"
        description="Manage academic resources and day-to-day institution operations"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {staffCards.map((card, index) => (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-2xl font-bold">{stats[card.key]}</p>
                </div>
                <card.icon className="h-5 w-5 text-primary" />
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild variant="outline"><Link to="/users">Manage Staff & Teachers</Link></Button>
          <Button asChild variant="outline"><Link to="/subjects">Manage Subjects</Link></Button>
          <Button asChild variant="outline"><Link to="/rooms">Manage Rooms</Link></Button>
          <Button asChild><Link to="/generate">Generate Timetable</Link></Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffAdminDashboardPage;
