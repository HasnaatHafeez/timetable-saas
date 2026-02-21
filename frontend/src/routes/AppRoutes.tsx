import { Routes, Route } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import SignupPage from "../pages/SignupPage";
import DashboardPage from "../pages/DashboardPage";
import CreateInstitutionPage from "../pages/CreateInstitutionPage";
import SubjectsPage from "../pages/SubjectsPage";
import CreateSubjectPage from "../pages/CreateSubjectPage";
import TeachersPage from "../pages/TeachersPage";
import CreateTeacherPage from "../pages/CreateTeacherPage";
import AssignTeacherSubjectPage from "../pages/AssignTeacherSubjectPage";

import ProtectedRoute from "../components/ProtectedRoute";
import DashboardLayout from "../layouts/DashboardLayout";

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <DashboardPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Institution */}
      <Route
        path="/institution/create"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <CreateInstitutionPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Subjects */}
      <Route
        path="/subjects"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <SubjectsPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/subjects/create"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <CreateSubjectPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Teachers */}
      <Route
        path="/teachers"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <TeachersPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/teachers/create"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <CreateTeacherPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/assign"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <AssignTeacherSubjectPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default AppRoutes;