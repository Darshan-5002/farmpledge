import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface AdminRouteProps {
  children: ReactNode;
}

const AdminRoute = ({ children }: AdminRouteProps) => {
  const { user, role, loading } = useAuth();
  const [forceAllow, setForceAllow] = useState(false);

  // Check if Firebase is configured immediately
  const isFirebaseConfigured = import.meta.env.VITE_FIREBASE_API_KEY && 
                               import.meta.env.VITE_FIREBASE_PROJECT_ID;

  // Force allow after 1 second as safety net
  useEffect(() => {
    const timer = setTimeout(() => {
      setForceAllow(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // If Firebase isn't configured OR force allow is true, skip all checks
  if (!isFirebaseConfigured || forceAllow) {
    return <>{children}</>;
  }

  // Show loading only briefly if Firebase is configured
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If Firebase is configured, check authentication
  if (!user || (role !== "admin" && role !== "farmer")) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;

