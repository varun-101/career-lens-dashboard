import { Navigate } from "react-router-dom";
import { useAuth, AppRole } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: AppRole;
}

const roleRedirect: Record<string, string> = {
  hr: "/dashboard",
  applicant: "/applicant-dashboard",
  admin: "/admin-dashboard",
};

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, role, isVerified, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Unverified applicants cannot access any protected route
  if (role === "applicant" && isVerified === false) {
    return <Navigate to="/auth" replace />;
  }

  // If a specific role is required, check and redirect to correct dashboard
  if (requiredRole && role && role !== requiredRole) {
    const redirect = role in roleRedirect ? roleRedirect[role] : "/auth";
    return <Navigate to={redirect} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
