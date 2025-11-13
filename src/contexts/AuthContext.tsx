import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { onAuthStateChanged, signOut, type User as FirebaseUser } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export type UserRole = "consumer" | "farmer" | "admin" | null;
export type VerificationStatus = "not_submitted" | "pending" | "approved" | "rejected" | null;

interface AuthContextValue {
  user: FirebaseUser | null;
  role: UserRole;
  verificationStatus: VerificationStatus;
  loading: boolean;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Immediately set loading to false if Firebase isn't configured
    if (!auth || !db) {
      console.warn("Firebase not configured - skipping auth check");
      setLoading(false);
      setUser(null);
      setRole(null);
      setVerificationStatus(null);
      return;
    }

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn("Auth state check timed out - allowing access");
      setLoading(false);
    }, 2000);

    let isMounted = true;

    let userDocUnsubscribe: (() => void) | null = null;

    try {
      const unsubscribe = onAuthStateChanged(
        auth,
        async (currentUser) => {
          if (!isMounted) return;
          
          clearTimeout(timeoutId);
          setUser(currentUser);
          
          if (currentUser) {
            try {
              const userDocRef = doc(db, "users", currentUser.uid);
              userDocUnsubscribe?.();
              userDocUnsubscribe = onSnapshot(
                userDocRef,
                (snapshot) => {
                  if (!isMounted) return;
                  if (snapshot.exists()) {
                    const data = snapshot.data();
                    const userRole = (data.role as UserRole) ?? null;
                    const status = (data.verificationStatus as VerificationStatus) ?? null;
                    setRole(userRole);
                    setVerificationStatus(status);
                    setLoading(false);
                    console.log(
                      "Auth state resolved - user:",
                      currentUser.email,
                      "role:",
                      userRole,
                      "verification:",
                      status,
                    );
                  } else {
                    setRole(null);
                    setVerificationStatus(null);
                    setLoading(false);
                    console.log(
                      "Auth state resolved - user:",
                      currentUser.email,
                      "role: null (not in Firestore)",
                    );
                  }
                },
                (error) => {
                  console.error("Failed to subscribe to user document", error);
                  if (!isMounted) return;
                  setRole(null);
                  setVerificationStatus(null);
                  setLoading(false);
                },
              );
            } catch (error) {
              console.error("Failed to fetch user role", error);
              if (isMounted) {
                // On error, still set loading to false so user can proceed
                setRole(null);
                setVerificationStatus(null);
                setLoading(false);
                console.log("Auth state resolved - user:", currentUser.email, "role: null (error fetching)");
              }
            }
          } else {
            userDocUnsubscribe?.();
            userDocUnsubscribe = null;
            if (isMounted) {
              setRole(null);
              setVerificationStatus(null);
              setLoading(false);
              console.log("Auth state resolved - no user");
            }
          }
        },
        (error) => {
          if (!isMounted) return;
          clearTimeout(timeoutId);
          console.error("Auth state error:", error);
          setLoading(false);
        }
      );

      return () => {
        isMounted = false;
        clearTimeout(timeoutId);
        unsubscribe();
        userDocUnsubscribe?.();
      };
    } catch (error) {
      console.error("Failed to set up auth listener:", error);
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, []);

  const signOutUser = async () => {
    if (auth) {
      await signOut(auth);
    }
    setUser(null);
    setRole(null);
    setVerificationStatus(null);
  };

  const value = useMemo(
    () => ({
      user,
      role,
      verificationStatus,
      loading,
      signOutUser,
    }),
    [user, role, verificationStatus, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
