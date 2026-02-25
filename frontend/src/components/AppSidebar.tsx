import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Building,
  DoorOpen,
  Clock3,
  CalendarDays,
  School,
  Calendar,
  Wand2,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const baseMenuItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
];

const institutionAdminItems = [
  ...baseMenuItems,
  { label: "Teachers", icon: Users, path: "/teachers" },
  { label: "Users", icon: Users, path: "/users" },
  { label: "Subjects", icon: BookOpen, path: "/subjects" },
  { label: "Departments", icon: Building, path: "/departments" },
  { label: "Rooms", icon: DoorOpen, path: "/rooms" },
  { label: "Working Days", icon: CalendarDays, path: "/working-days" },
  { label: "Time Slots", icon: Clock3, path: "/timeslots" },
  { label: "Academic Levels", icon: School, path: "/academic-levels" },
  { label: "Classes", icon: School, path: "/classes" },
  { label: "Sections", icon: School, path: "/sections" },
  { label: "Timetable", icon: Calendar, path: "/timetable" },
  { label: "Generate", icon: Wand2, path: "/generate" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

const staffAdminItems = [
  ...baseMenuItems,
  { label: "Users", icon: Users, path: "/users" },
  { label: "Teachers", icon: Users, path: "/teachers" },
  { label: "Subjects", icon: BookOpen, path: "/subjects" },
  { label: "Departments", icon: Building, path: "/departments" },
  { label: "Rooms", icon: DoorOpen, path: "/rooms" },
  { label: "Working Days", icon: CalendarDays, path: "/working-days" },
  { label: "Time Slots", icon: Clock3, path: "/timeslots" },
  { label: "Academic Levels", icon: School, path: "/academic-levels" },
  { label: "Classes", icon: School, path: "/classes" },
  { label: "Sections", icon: School, path: "/sections" },
  { label: "Timetable", icon: Calendar, path: "/timetable" },
  { label: "Generate", icon: Wand2, path: "/generate" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

const teacherItems = [
  ...baseMenuItems,
  { label: "Timetable", icon: Calendar, path: "/timetable" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

const systemAdminItems = [
  ...baseMenuItems,
  { label: "Admin", icon: Users, path: "/admin" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

const AppSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const role = user?.backendRole;

  const menuItems = role === "SYSTEM_ADMIN"
    ? systemAdminItems
    : role === "STAFF_ADMIN"
      ? staffAdminItems
      : role === "TEACHER" || user?.role === "teacher"
        ? teacherItems
        : institutionAdminItems;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-4">
        <GraduationCap className="h-7 w-7 flex-shrink-0 text-primary" />
        {!collapsed && (
          <span className="text-lg font-bold text-foreground">Leverage Timetrix</span>
        )}
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const active = location.pathname === item.path;
            const content = (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="h-4.5 w-4.5 flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.path} delayDuration={0}>
                  <TooltipTrigger asChild>{content}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            }
            return content;
          })}
        </ul>
      </nav>

      {/* Bottom */}
      <div className="border-t border-sidebar-border px-2 py-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4.5 w-4.5 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex h-10 items-center justify-center border-t border-sidebar-border text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  );
};

export default AppSidebar;
