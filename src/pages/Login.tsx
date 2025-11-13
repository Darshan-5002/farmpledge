import { FormEvent, useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Leaf, Lock, ShoppingBag, Tractor, ShieldCheck, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();
  const { role, user, loading, verificationStatus } = useAuth();
  const [activeRole, setActiveRole] = useState<"consumer" | "farmer">("consumer");
  const [rememberMe, setRememberMe] = useState(false);
  const [formState, setFormState] = useState({ email: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasRedirected = useRef(false);

  // Redirect effect - watches for user and role changes
  useEffect(() => {
    // Only redirect if we haven't already redirected and we have a user with a role
    if (!hasRedirected.current && !loading && user && role) {
      hasRedirected.current = true;
      console.log("Redirecting after login - role:", role, "user:", user.email);
      if (role === "admin") {
        navigate("/admin", { replace: true });
      } else if (role === "farmer") {
        if (verificationStatus === "approved") {
          navigate("/admin", { replace: true });
        } else {
          navigate("/farmer/verification", { replace: true });
        }
      } else if (role === "consumer") {
        navigate("/dashboard", { replace: true });
      }
    }
    
    // Reset redirect flag if user logs out
    if (!user) {
      hasRedirected.current = false;
    }
  }, [loading, user, role, navigate]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!formState.email || !formState.password) {
      toast.error("Please enter your email and password");
      return;
    }

    if (!auth) {
      toast.error("Firebase is not configured. Please set up your Firebase credentials.");
      return;
    }

    setIsSubmitting(true);
    hasRedirected.current = false; // Reset redirect flag before login

    try {
      // Sign in the user
      const userCredential = await signInWithEmailAndPassword(auth, formState.email, formState.password);
      const currentUser = userCredential.user;
      
      toast.success("Logged in successfully");
      
      // Always reset submitting state first (in case Firestore query hangs)
      setIsSubmitting(false);
      
      // Helper function to fetch role with timeout
      const fetchRoleWithTimeout = async (uid: string): Promise<"consumer" | "farmer" | "admin" | null> => {
        if (!db) return null;
        
        try {
          const result = await Promise.race([
            getDoc(doc(db, "users", uid)).then((userDoc) => {
              if (userDoc.exists()) {
                const data = userDoc.data();
                return (data.role as "consumer" | "farmer" | "admin") || null;
              }
              return null;
            }),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)), // 2 second timeout
          ]);
          return result;
        } catch (error) {
          console.error("Error in fetchRoleWithTimeout:", error);
          return null;
        }
      };
      
      // Immediately fetch the role from Firestore with timeout
      let userRole: "consumer" | "farmer" | "admin" | null = null;
      let userVerificationStatus: "not_submitted" | "pending" | "approved" | "rejected" | null = null;
      
      if (currentUser && db) {
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            userRole = (data.role as "consumer" | "farmer" | "admin") || null;
            userVerificationStatus = (data.verificationStatus as typeof userVerificationStatus) ?? null;
          } else {
            userRole = await fetchRoleWithTimeout(currentUser.uid);
          }
          console.log(
            "Login - fetched role:",
            userRole,
            "verification:",
            userVerificationStatus,
            "for user:",
            currentUser.email,
          );
        } catch (error) {
          console.error("Failed to fetch user role after login:", error);
          // Continue with null role
        }
      }
      
      // If role is still null, try to use the role from AuthContext (might be available from previous session)
      if (!userRole && role) {
        userRole = role as "consumer" | "farmer" | "admin" | null;
        console.log("Login - using role from AuthContext:", userRole);
      }
      
      // Small delay to ensure state updates are processed
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Redirect based on role
      if (userRole === "admin") {
        hasRedirected.current = true;
        navigate("/admin", { replace: true });
      } else if (userRole === "farmer") {
        hasRedirected.current = true;
        if (userVerificationStatus === "approved") {
          navigate("/admin", { replace: true });
        } else {
          navigate("/farmer/verification", { replace: true });
        }
      } else if (userRole === "consumer") {
        hasRedirected.current = true;
        navigate("/dashboard", { replace: true });
      } else {
        // No role found or timeout, let useEffect handle redirect when role is loaded
        console.log("Login - no role found, waiting for AuthContext to load role");
        // Don't redirect here - let the useEffect handle it when role is available
      }
    } catch (error: any) {
      console.error("Login failed", error);
      setIsSubmitting(false);
      toast.error(error.message || "Failed to login");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30">
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center gap-6 text-center mb-10">
          <div className="flex items-center gap-3">
            <Leaf className="h-10 w-10 text-primary" />
            <div className="text-left">
              <p className="text-sm uppercase tracking-widest text-muted-foreground">FreshPledge</p>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">Welcome back</h1>
            </div>
          </div>
          <p className="text-muted-foreground max-w-xl">
            Access your account to manage products, track orders, and experience blockchain-powered transparency.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-[2fr,1fr] max-w-5xl mx-auto">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Login</CardTitle>
              <CardDescription>Choose your role and enter your credentials to continue.</CardDescription>
            </CardHeader>
            <CardContent>
              {!auth && (
                <Alert className="mb-4 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
                  <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
                    Firebase is not configured. Please set VITE_FIREBASE_* environment variables to enable authentication.
                  </AlertDescription>
                </Alert>
              )}
              <Tabs
                defaultValue="consumer"
                className="space-y-6"
                onValueChange={(value) => setActiveRole(value as "consumer" | "farmer")}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="consumer" className="flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4" /> Consumer
                  </TabsTrigger>
                  <TabsTrigger value="farmer" className="flex items-center gap-2">
                    <Tractor className="h-4 w-4" /> Farmer
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="consumer" className="space-y-6">
                  <form className="grid gap-4" onSubmit={handleSubmit}>
                    <div className="grid gap-2 text-left">
                      <Label htmlFor="consumer-email">Email</Label>
                      <Input
                        id="consumer-email"
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        value={formState.email}
                        onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2 text-left">
                      <Label htmlFor="consumer-password">Password</Label>
                      <Input
                        id="consumer-password"
                        type="password"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        value={formState.password}
                        onChange={(event) => setFormState((prev) => ({ ...prev, password: event.target.value }))}
                      />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <label className="flex items-center gap-2">
                        <Checkbox
                          id="remember-consumer"
                          checked={rememberMe}
                          onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
                        />
                        <span>Remember me</span>
                      </label>
                      <button className="text-sm text-primary hover:underline" type="button">
                        Forgot password?
                      </button>
                    </div>
                    <Button className="w-full" size="lg" type="submit" disabled={isSubmitting}>
                      <Lock className="mr-2 h-4 w-4" />
                      {isSubmitting ? "Signing in..." : "Login as Consumer"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="farmer" className="space-y-6">
                  <form className="grid gap-4" onSubmit={handleSubmit}>
                    <div className="grid gap-2 text-left">
                      <Label htmlFor="farmer-email">Email</Label>
                      <Input
                        id="farmer-email"
                        type="email"
                        placeholder="farmer@example.com"
                        autoComplete="email"
                        value={formState.email}
                        onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2 text-left">
                      <Label htmlFor="farmer-password">Password</Label>
                      <Input
                        id="farmer-password"
                        type="password"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        value={formState.password}
                        onChange={(event) => setFormState((prev) => ({ ...prev, password: event.target.value }))}
                      />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <label className="flex items-center gap-2">
                        <Checkbox
                          id="remember-farmer"
                          checked={rememberMe}
                          onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
                        />
                        <span>Remember me</span>
                      </label>
                      <button className="text-sm text-primary hover:underline" type="button">
                        Forgot password?
                      </button>
                    </div>
                    <Button className="w-full" size="lg" variant="secondary" type="submit" disabled={isSubmitting}>
                      <Lock className="mr-2 h-4 w-4" />
                      {isSubmitting ? "Signing in..." : "Login as Farmer"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <div className="w-full rounded-lg border border-border/60 bg-muted/50 p-4 text-left">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Secured with blockchain verification
                </div>
              </div>
              <div className="flex flex-col gap-4 w-full">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>New to FreshPledge?</span>
                  <Link
                    to="/register/consumer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Register as Consumer <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Are you a farmer?</span>
                  <Link
                    to="/register/farmer"
                    className="inline-flex items-center gap-1 text-primary hover:underline cursor-pointer"
                  >
                    Join as Farmer <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </CardFooter>
          </Card>

          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" /> Why join FreshPledge?
              </CardTitle>
              <CardDescription>Blockchain-powered transparency for both consumers and farmers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-left">
              <div className="rounded-lg border border-primary/20 bg-background p-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-primary" /> For Consumers
                </h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>Source-certified dairy products</li>
                  <li>Real-time delivery tracking</li>
                  <li>Rewards for sustainable choices</li>
                </ul>
              </div>
              <div className="rounded-lg border border-primary/20 bg-background p-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Tractor className="h-4 w-4 text-primary" /> For Farmers
                </h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>Direct marketplace access</li>
                  <li>Automated payments & settlements</li>
                  <li>Blockchain-backed authenticity</li>
                </ul>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="ghost" className="w-full" onClick={() => navigate("/")}>
                Back to Home
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;
