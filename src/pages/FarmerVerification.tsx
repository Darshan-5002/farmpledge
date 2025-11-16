import { FormEvent, useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { CheckCircle2, Clock, ShieldCheck, Upload, ArrowLeft } from "lucide-react";

type ApplicationStatus = "not_submitted" | "pending" | "approved" | "rejected";

interface FarmerApplicationForm {
  farmName: string;
  yearsOfExperience: string;
  farmAddress: string;
  farmSize: string;
  governmentId: string;
  certificationLinks: string;
  additionalNotes: string;
}

interface FarmerApplication extends FarmerApplicationForm {
  status: ApplicationStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewerId?: string;
}

const defaultForm: FarmerApplicationForm = {
  farmName: "",
  yearsOfExperience: "",
  farmAddress: "",
  farmSize: "",
  governmentId: "",
  certificationLinks: "",
  additionalNotes: "",
};

const FarmerVerification = () => {
  const navigate = useNavigate();
  const { user, verificationStatus } = useAuth();
  const [form, setForm] = useState<FarmerApplicationForm>(defaultForm);
  const [status, setStatus] = useState<ApplicationStatus>("not_submitted");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const previousStatusRef = useRef<ApplicationStatus>("not_submitted");

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    if (!db) {
      toast.error("Firebase is not configured. Unable to load verification data.");
      setIsLoading(false);
      return;
    }

    // Prevent redirects when user is intentionally viewing the page
    let redirectTimeout: NodeJS.Timeout | null = null;
    let hasRedirected = false;

    // Set up real-time listener for application status changes
    const applicationRef = doc(db, "farmerApplications", user.uid);
    
    const unsubscribe = onSnapshot(
      applicationRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as FarmerApplication;
          setForm({
            farmName: data.farmName ?? "",
            yearsOfExperience: data.yearsOfExperience ?? "",
            farmAddress: data.farmAddress ?? "",
            farmSize: data.farmSize ?? "",
            governmentId: data.governmentId ?? "",
            certificationLinks: data.certificationLinks ?? "",
            additionalNotes: data.additionalNotes ?? "",
          });
          const applicationStatus = data.status ?? "pending";
          const previousStatus = previousStatusRef.current;
          previousStatusRef.current = applicationStatus;
          setStatus(applicationStatus);
          
          // If status is approved, redirect to dashboard
          if (applicationStatus === "approved" && !hasRedirected) {
            // Clear any existing timeout
            if (redirectTimeout) {
              clearTimeout(redirectTimeout);
            }
            
            // Only redirect if we're on the verification page
            if (window.location.pathname === "/farmer/verification") {
              hasRedirected = true;
              
              // If status just changed to approved, show success message
              if (previousStatus !== "approved") {
                toast.success("Your verification has been approved! Redirecting to dashboard...");
              }
              
              redirectTimeout = setTimeout(() => {
                navigate("/admin", { replace: true });
              }, previousStatus !== "approved" ? 3000 : 1000); // Longer delay if just approved, shorter if already approved
            }
          }
          
          // If status is pending or rejected, ensure we don't redirect
          if (applicationStatus === "pending" || applicationStatus === "rejected") {
            if (redirectTimeout) {
              clearTimeout(redirectTimeout);
              redirectTimeout = null;
            }
            hasRedirected = false; // Reset so they can be redirected if approved later
          }
        } else {
          const currentStatus = (verificationStatus as ApplicationStatus) ?? "not_submitted";
          const previousStatus = previousStatusRef.current;
          previousStatusRef.current = currentStatus;
          setStatus(currentStatus);
          
          // If status is approved from AuthContext, redirect (fallback case if Firestore doc doesn't exist)
          if (currentStatus === "approved" && !hasRedirected) {
            if (redirectTimeout) {
              clearTimeout(redirectTimeout);
            }
            
            if (window.location.pathname === "/farmer/verification") {
              hasRedirected = true;
              
              if (previousStatus !== "approved") {
                toast.success("Your verification has been approved! Redirecting to dashboard...");
              }
              
              redirectTimeout = setTimeout(() => {
                navigate("/admin", { replace: true });
              }, previousStatus !== "approved" ? 3000 : 1000);
            }
          }
          
          // If status is pending or rejected, ensure we don't redirect
          if (currentStatus === "pending" || currentStatus === "rejected") {
            if (redirectTimeout) {
              clearTimeout(redirectTimeout);
              redirectTimeout = null;
            }
            hasRedirected = false;
          }
        }
        setIsLoading(false);
      },
      (error) => {
        console.error("Failed to load farmer application", error);
        toast.error("Failed to load application details. Please try again.");
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
      if (redirectTimeout) {
        clearTimeout(redirectTimeout);
      }
    };
  }, [user, verificationStatus, navigate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user || !db) {
      toast.error("Unable to submit application. Please try again later.");
      return;
    }

    if (!form.farmName || !form.farmAddress || !form.governmentId) {
      toast.error("Please complete all required fields marked with *");
      return;
    }

    try {
      setIsSubmitting(true);
      const applicationRef = doc(db, "farmerApplications", user.uid);
      await setDoc(applicationRef, {
        ...form,
        status: "pending",
        submittedAt: serverTimestamp(),
        farmerId: user.uid,
        farmerEmail: user.email,
      });

      await updateDoc(doc(db, "users", user.uid), {
        verificationStatus: "pending",
      });

      // Best-effort: also forward application to an external database via webhook/API
      // Configure endpoint in .env as VITE_EXTERNAL_APPLICATION_WEBHOOK
      try {
        const externalUrl = import.meta.env.VITE_EXTERNAL_APPLICATION_WEBHOOK as string | undefined;
        if (externalUrl && typeof externalUrl === "string") {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          await fetch(externalUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              type: "farmer_application",
              farmerId: user.uid,
              farmerEmail: user.email,
              payload: {
                ...form,
                status: "pending",
                submittedAt: new Date().toISOString(),
              },
            }),
            signal: controller.signal,
          }).catch((err) => {
            console.warn("External DB webhook failed (continuing):", err);
          }).finally(() => clearTimeout(timeout));
        } else {
          // Only log in development mode - this is expected behavior when webhook is not configured
          if (import.meta.env.DEV) {
            console.info("VITE_EXTERNAL_APPLICATION_WEBHOOK not set - skipping external DB sync (this is optional)");
          }
        }
      } catch (webhookError) {
        console.warn("External DB sync error (ignored):", webhookError);
      }

      setStatus("pending");
      toast.success("Application submitted successfully. Our team will verify your details soon.");
      navigate("/dashboard/farmer", { replace: true });
    } catch (error) {
      console.error("Failed to submit farmer application", error);
      toast.error("Failed to submit application. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Badge variant="secondary" className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Secure Verification
          </Badge>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Farmer Verification</CardTitle>
            <CardDescription>
              Submit detailed information about your farm. Our onboarding team will review and approve access to the
              farmer dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!db && (
              <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
                <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
                  Firebase is not configured. Please set VITE_FIREBASE_* environment variables to enable verification.
                </AlertDescription>
              </Alert>
            )}

            <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4">
              <p className="text-sm text-muted-foreground mb-2">Current Status</p>
              <div className="flex items-center gap-3">
                {status === "approved" ? (
                  <Badge variant="default" className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> Approved
                  </Badge>
                ) : status === "pending" ? (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Clock className="h-4 w-4" /> Application in Progress
                  </Badge>
                ) : status === "rejected" ? (
                  <Badge variant="destructive">Needs Review</Badge>
                ) : (
                  <Badge variant="outline">Not Submitted</Badge>
                )}
                <span className="text-sm text-muted-foreground">
                  {status === "approved"
                    ? "Your farm is verified. You can access the farmer dashboard."
                    : status === "pending"
                      ? "We are reviewing your application. You will be notified once it's approved."
                      : status === "rejected"
                        ? "Your application needs additional review. Please update the details and resubmit."
                        : "Complete the form below to submit your verification details."}
                </span>
              </div>
            </div>

            {status === "approved" ? (
              <div className="text-center py-10 space-y-4">
                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
                <h3 className="text-xl font-semibold">Verification Approved!</h3>
                <p className="text-muted-foreground">
                  Your farm has been verified. You can now access the farmer dashboard.
                </p>
                <Button onClick={() => navigate("/admin", { replace: true })} size="lg">
                  Go to Dashboard
                </Button>
              </div>
            ) : isLoading ? (
              <div className="text-center py-10 text-muted-foreground">Loading verification details...</div>
            ) : status === "pending" ? (
              <div className="space-y-5">
                <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Your application has been submitted and is under review. You can view your submitted details below, but cannot make changes until the review is complete.
                  </p>
                </div>
                <div className="space-y-5">
                  <div className="grid gap-2">
                    <Label htmlFor="farmName">Farm name</Label>
                    <Input
                      id="farmName"
                      value={form.farmName}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="farmAddress">Farm address</Label>
                    <textarea
                      id="farmAddress"
                      rows={3}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-muted px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                      value={form.farmAddress}
                      disabled
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="farmSize">Farm size / herd count</Label>
                    <Input
                      id="farmSize"
                      value={form.farmSize || "—"}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="yearsOfExperience">Years of dairy experience</Label>
                    <Input
                      id="yearsOfExperience"
                      value={form.yearsOfExperience || "—"}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="governmentId">Government-issued ID number</Label>
                    <Input
                      id="governmentId"
                      value={form.governmentId}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="certificationLinks">Proof of certification / document links</Label>
                    <Input
                      id="certificationLinks"
                      value={form.certificationLinks || "—"}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="additionalNotes">Additional notes</Label>
                    <textarea
                      id="additionalNotes"
                      rows={4}
                      className="flex min-h-[100px] w-full rounded-md border border-input bg-muted px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                      value={form.additionalNotes || "—"}
                      disabled
                    />
                  </div>
                </div>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="grid gap-2">
                  <Label htmlFor="farmName">
                    Farm name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="farmName"
                    placeholder="Green Valley Dairy"
                    value={form.farmName}
                    onChange={(event) => setForm((prev) => ({ ...prev, farmName: event.target.value }))}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="farmAddress">
                    Farm address <span className="text-destructive">*</span>
                  </Label>
                  <textarea
                    id="farmAddress"
                    rows={3}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Village, District, State"
                    value={form.farmAddress}
                    onChange={(event) => setForm((prev) => ({ ...prev, farmAddress: event.target.value }))}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="farmSize">Farm size / herd count</Label>
                  <Input
                    id="farmSize"
                    placeholder="e.g., 120 cattle / 50 acres"
                    value={form.farmSize}
                    onChange={(event) => setForm((prev) => ({ ...prev, farmSize: event.target.value }))}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="yearsOfExperience">Years of dairy experience</Label>
                  <Input
                    id="yearsOfExperience"
                    type="number"
                    min={0}
                    placeholder="10"
                    value={form.yearsOfExperience}
                    onChange={(event) => setForm((prev) => ({ ...prev, yearsOfExperience: event.target.value }))}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="governmentId">
                    Government-issued ID number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="governmentId"
                    placeholder="PAN / Aadhaar / GSTIN"
                    value={form.governmentId}
                    onChange={(event) => setForm((prev) => ({ ...prev, governmentId: event.target.value }))}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="certificationLinks">Proof of certification / document links</Label>
                  <Input
                    id="certificationLinks"
                    placeholder="Share Google Drive links or certificate IDs"
                    value={form.certificationLinks}
                    onChange={(event) => setForm((prev) => ({ ...prev, certificationLinks: event.target.value }))}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="additionalNotes">Additional notes</Label>
                  <textarea
                    id="additionalNotes"
                    rows={4}
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Tell us more about your farm operations, certifications, or quality checks."
                    value={form.additionalNotes}
                    onChange={(event) => setForm((prev) => ({ ...prev, additionalNotes: event.target.value }))}
                  />
                </div>

                <div className="rounded-lg border border-border/60 bg-muted/40 p-4 text-sm text-muted-foreground flex items-start gap-3">
                  <Upload className="h-4 w-4 text-primary mt-1" />
                  <div>
                    Upload supporting documents through secure links. Our team uses this information to validate your
                    farm before enabling blockchain payment settlements.
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button type="submit" className="flex-1" size="lg" disabled={isSubmitting || !db}>
                    {isSubmitting ? "Submitting..." : "Submit for Verification"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => navigate("/dashboard/farmer")}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FarmerVerification;


