import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { InstitutionProvider } from "@/contexts/InstitutionContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleProtectedRoute from "@/components/RoleProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import InstitutionSetupPage from "@/pages/InstitutionSetupPage";
import RoleDashboardPage from "@/pages/RoleDashboardPage";
import TeachersPage from "@/pages/TeachersPage";
import UsersPage from "@/pages/UsersPage";
import SubjectsPage from "@/pages/SubjectsPage";
import DepartmentsPage from "@/pages/DepartmentsPage";
import RoomsPage from "@/pages/RoomsPage";
import TimeSlotsPage from "@/pages/TimeSlotsPage";
import WorkingDaysPage from "@/pages/WorkingDaysPage";
import AcademicLevelsPage from "@/pages/AcademicLevelsPage";
import ClassesPage from "@/pages/ClassesPage";
import SectionsPage from "@/pages/SectionsPage";
import TimetablePage from "@/pages/TimetablePage";
import GenerateTimetablePage from "@/pages/GenerateTimetablePage";
import SettingsPage from "@/pages/SettingsPage";
import LandingPage from "@/pages/LandingPage";
import NotFound from "@/pages/NotFound";
import AdminDashboardPage from "@/pages/AdminDashboardPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <InstitutionProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />

                {/* Protected dashboard routes */}
                <Route
                  element={
                    <ProtectedRoute>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                <Route path="/dashboard" element={<RoleDashboardPage />} />
                <Route path="/setup" element={<InstitutionSetupPage />} />
                <Route path="/teachers" element={<TeachersPage />} />
                <Route
                  path="/users"
                  element={
                    <RoleProtectedRoute allowedBackendRoles={["INSTITUTION_OWNER"]}>
                      <UsersPage />
                    </RoleProtectedRoute>
                  }
                />
                <Route path="/subjects" element={<SubjectsPage />} />
                <Route path="/departments" element={<DepartmentsPage />} />
                <Route path="/rooms" element={<RoomsPage />} />
                <Route path="/timeslots" element={<TimeSlotsPage />} />
                <Route path="/working-days" element={<WorkingDaysPage />} />
                <Route path="/academic-levels" element={<AcademicLevelsPage />} />
                <Route path="/classes" element={<ClassesPage />} />
                <Route path="/sections" element={<SectionsPage />} />
                <Route path="/timetable" element={<TimetablePage />} />
                <Route path="/generate" element={<GenerateTimetablePage />} />
                <Route
                  path="/admin"
                  element={
                    <RoleProtectedRoute allowedBackendRoles={["SYSTEM_ADMIN"]}>
                      <AdminDashboardPage />
                    </RoleProtectedRoute>
                  }
                />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
        </InstitutionProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
