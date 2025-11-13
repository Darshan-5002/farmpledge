import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { firebaseAuth, firebaseDb } from "@/lib/firebase";
import { toast } from "sonner";

type UserRole = "consumer" | "farmer" | "admin";

interface AuthUserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
}

interface AuthContextValue {
  user: AuthUserProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role: Exclude<UserRole, "admin">, name?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const USERS_COLLECTION = "users";

const mapFirebaseUser = async (firebaseUser: User | null): Promise<AuthUserProfile | null> => {
  if (!firebaseUser) return null;

  try {
    const profileRef = doc(firebaseDb, USERS_COLLECTION, firebaseUser.uid);
    const profileSnap = await getDoc(profileRef);

    if (profileSnap.exists()) {
      const data = profileSnap.data();
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        role: (data.role as UserRole) || "consumer",
      };
    }

    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      role: "consumer",
    };
  } catch (error) {
    console.error("Failed to fetch user profile", error);
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      role: "consumer",
    };
  }
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      const mappedUser = await mapFirebaseUser(firebaseUser);
      setUser(mappedUser);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      toast.success("Logged in successfully");
    } catch (error: any) {
      console.error("Login error", error);
      toast.error(error?.message || "Failed to login");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    role: Exclude<UserRole, "admin">,
    name?: string,
  ) => {
    setIsLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      if (name) {
        await updateProfile(credential.user, { displayName: name });
      }

      const profileRef = doc(firebaseDb, USERS_COLLECTION, credential.user.uid);
      await setDoc(profileRef, {
        uid: credential.user.uid,
        email,
        displayName: name || credential.user.displayName || null,
        role,
        createdAt: new Date().toISOString(),
      });

      toast.success("Account created successfully");
    } catch (error: any) {
      console.error("Registration error", error);
      toast.error(error?.message || "Failed to create account");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await signOut(firebaseAuth);
      toast.success("Logged out successfully");
    } catch (error: any) {
      console.error("Logout error", error);
      toast.error(error?.message || "Failed to logout");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value = useMemo(
    () => ({
      user,
      isLoading,
      login,
      register,
      logout,
    }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
