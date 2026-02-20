import { Routes, Route } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import SignupPage from "../pages/SignupPage";
import DashboardPage from "../pages/DashboardPage";
import CreateInstitutionPage from "../pages/CreateInstitutionPage";

import ProtectedRoute from "../components/ProtectedRoute";
import DashboardLayout from "../layouts/DashboardLayout";

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Protected Routes */}
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
    </Routes>
  );
};

export default AppRoutes;