import { useAuth } from "@/contexts/AuthContext";
import DashboardPage from "@/pages/DashboardPage";
import AdminDashboardPage from "@/pages/AdminDashboardPage";
import StaffAdminDashboardPage from "@/pages/StaffAdminDashboardPage";
import TeacherDashboardPage from "@/pages/TeacherDashboardPage";

const RoleDashboardPage = () => {
  const { user } = useAuth();
  const role = user?.backendRole;

  if (role === "SYSTEM_ADMIN") {
    return <AdminDashboardPage />;
  }

  if (role === "STAFF_ADMIN") {
    return <StaffAdminDashboardPage />;
  }

  if (role === "TEACHER" || user?.role === "teacher") {
    return <TeacherDashboardPage />;
  }

  return <DashboardPage />;
};

export default RoleDashboardPage;
