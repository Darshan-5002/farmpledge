import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth, type UserRole } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  redirectTo?: string;
}

const ProtectedRoute = ({ children, allowedRoles, redirectTo = "/login" }: ProtectedRouteProps) => {
  const { user, role, loading } = useAuth();

  // Show loading only for a short time, then allow access if Firebase isn't configured
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 mx-auto animate-spin rounded-full border-b-2 border-primary" />
          <p className="text-muted-foreground text-sm">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // If no user and Firebase is configured, redirect to login
  // If Firebase isn't configured, allow access for development
  if (!user) {
    // Check if Firebase is configured by trying to import auth
    const isFirebaseConfigured = import.meta.env.VITE_FIREBASE_API_KEY && 
                                 import.meta.env.VITE_FIREBASE_PROJECT_ID;
    
    if (isFirebaseConfigured) {
      return <Navigate to={redirectTo} replace />;
    } else {
      // Allow access for development when Firebase isn't configured
      console.warn("Firebase not configured - allowing access for development");
      return <>{children}</>;
    }
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
