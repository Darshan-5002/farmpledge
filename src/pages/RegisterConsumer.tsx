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
import { Leaf, ShieldCheck, ArrowLeft, ArrowRight, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

const RegisterConsumer = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!form.fullName || !form.email || !form.password) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (!form.agreeTerms) {
      toast.error("You must agree to the terms and conditions");
      return;
    }

    try {
      setIsSubmitting(true);
      const credential = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await updateProfile(credential.user, { displayName: form.fullName });
      await setDoc(doc(db, "users", credential.user.uid), {
        role: "consumer",
        fullName: form.fullName,
        email: form.email,
        createdAt: new Date().toISOString(),
      });
      toast.success("Account created successfully");
      navigate("/dashboard", { replace: true });
    } catch (error: any) {
      console.error("Registration failed", error);
      toast.error(error.message || "Failed to create account");
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
              <h1 className="text-2xl font-bold">Create consumer account</h1>
            </div>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" /> Join as a consumer
            </CardTitle>
            <CardDescription>
              Access farm-fresh dairy products with blockchain-backed transparency.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5">
              <div className="grid gap-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  placeholder="Priya Sharma"
                  value={form.fullName}
                  onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  required
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
              <div className="flex items-center gap-2 text-sm">
                <Checkbox
                  id="terms"
                  checked={form.agreeTerms}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, agreeTerms: Boolean(checked) }))
                  }
                />
                <Label htmlFor="terms" className="text-muted-foreground">
                  I agree to the terms of service and privacy policy
                </Label>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button className="w-full" size="lg" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating account..." : "Create consumer account"}
              </Button>
              <div className="rounded-lg border border-border/60 bg-muted/50 p-4 text-sm text-muted-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Your purchases are verified on blockchain for authenticity.
              </div>
              <div className="text-sm text-center text-muted-foreground">
                Already have an account?{" "}
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

export default RegisterConsumer;
