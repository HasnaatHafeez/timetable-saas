import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedBackendRoles: string[];
  redirectTo?: string;
}

const RoleProtectedRoute = ({
  children,
  allowedBackendRoles,
  redirectTo = "/dashboard",
}: RoleProtectedRouteProps) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user || !allowedBackendRoles.includes(user.backendRole || "")) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

export default RoleProtectedRoute;
