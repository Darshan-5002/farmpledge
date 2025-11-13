import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Leaf, Tractor, ShieldCheck, ArrowLeft, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

const RegisterFarmer = () => {
  const navigate = useNavigate();
  const { user, role, verificationStatus } = useAuth();
  const [form, setForm] = useState({
    farmName: "",
    ownerName: "",
    email: "",
    password: "",
    confirmPassword: "",
    location: "",
    agreeTerms: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Only redirect if user exists AND has farmer role
    // Don't redirect immediately on mount if user is null
    // Add a small delay to prevent immediate redirect on page load
    if (user && role === "farmer") {
      const timer = setTimeout(() => {
        if (verificationStatus === "approved") {
          navigate("/admin", { replace: true });
        } else {
          navigate("/farmer/verification", { replace: true });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user, role, verificationStatus, navigate]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!form.farmName || !form.ownerName || !form.email || !form.password) {
      toast.error("Please complete all required fields");
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (!form.agreeTerms) {
      toast.error("You must agree to the partnership terms");
      return;
    }

    if (!auth || !db) {
      toast.error("Firebase is not configured. Please set up your Firebase credentials.");
      return;
    }

    try {
      setIsSubmitting(true);
      const credential = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await updateProfile(credential.user, { displayName: form.ownerName });
      try {
        await setDoc(doc(db, "users", credential.user.uid), {
          role: "farmer",
          farmName: form.farmName,
          ownerName: form.ownerName,
          email: form.email,
          location: form.location,
          verificationStatus: "not_submitted",
          createdAt: new Date().toISOString(),
        });
        toast.success("Farmer account created successfully");
      } catch (writeError: any) {
        console.error("Failed to write user profile to Firestore", writeError);
        toast.warning("Account created, but profile save is pending. You can complete verification now.");
      }
      // Always take the user to verification so they can continue
      navigate("/farmer/verification", { replace: true });
    } catch (error: any) {
      console.error("Farmer registration failed", error);
      let errorMessage = "Failed to create farmer account";
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "This email is already registered. Please login instead.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password is too weak. Please use at least 6 characters.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email address. Please check and try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="flex items-center gap-4 mb-8">
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <Leaf className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm uppercase tracking-widest text-muted-foreground">FreshPledge</p>
              <h1 className="text-2xl font-bold">Join as a farmer partner</h1>
            </div>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Tractor className="h-5 w-5" /> Farmer partnership application
            </CardTitle>
            <CardDescription>
              Access direct-to-consumer sales, transparent payments, and blockchain-backed authenticity.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5">
              {(!auth || !db) && (
                <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
                  <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
                    Firebase is not configured. Please set VITE_FIREBASE_* environment variables to enable registration.
                  </AlertDescription>
                </Alert>
              )}
              <div className="grid gap-2">
                <Label htmlFor="farmName">Farm name</Label>
                <Input
                  id="farmName"
                  placeholder="Green Valley Dairy"
                  value={form.farmName}
                  onChange={(event) => setForm((prev) => ({ ...prev, farmName: event.target.value }))}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ownerName">Owner / primary contact</Label>
                <Input
                  id="ownerName"
                  placeholder="Ravi Kumar"
                  value={form.ownerName}
                  onChange={(event) => setForm((prev) => ({ ...prev, ownerName: event.target.value }))}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Business email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="farm@example.com"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location">Farm location</Label>
                <Input
                  id="location"
                  placeholder="Pune, Maharashtra"
                  value={form.location}
                  onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                  required
                />
              </div>
              <div className="flex items-start gap-3 text-sm">
                <Checkbox
                  id="terms"
                  checked={form.agreeTerms}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, agreeTerms: Boolean(checked) }))
                  }
                />
                <Label htmlFor="terms" className="text-muted-foreground">
                  I agree to provide accurate product and inventory data and comply with FreshPledge quality standards.
                </Label>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button className="w-full" size="lg" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting application..." : "Create farmer account"}
              </Button>
              <div className="rounded-lg border border-border/60 bg-muted/50 p-4 text-sm text-muted-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Trusted blockchain verification for your dairy supply chain.
              </div>
              <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4 text-sm text-muted-foreground flex items-start gap-3">
                <ClipboardList className="h-4 w-4 text-primary" />
                After registration, our onboarding team will verify your farm details before publishing listings.
              </div>
              <div className="text-sm text-center text-muted-foreground">
                Already partnered with FreshPledge?{" "}
                <button type="button" className="text-primary hover:underline" onClick={() => navigate("/login")}>
                  Login here
                </button>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default RegisterFarmer;
