import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tractor, PackageCheck, IndianRupee, BarChart3 } from "lucide-react";

const FarmerDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Hello, {user?.displayName ?? "Farmer"}</h1>
            <p className="text-muted-foreground">Manage your listings, fulfill orders, and track blockchain payments in real time.</p>
          </div>
          <Button onClick={() => window.location.assign("/products")}>View marketplace</Button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active listings</CardTitle>
              <Tractor className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Publish fresh products to reach consumers directly</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Orders to fulfill</CardTitle>
              <PackageCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">All caught up! New orders will appear here.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Weekly revenue</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹0</div>
              <p className="text-xs text-muted-foreground">Connect your bank to enable settlements</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" /> Blockchain payment ledger
            </CardTitle>
            <CardDescription>Track every consumer payment from fiat to on-chain settlement.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-4">
            <p>
              We are building a live ledger of all settlements routed through Google Pay and PhonePe. Each transaction will be mirrored on-chain for auditability, letting you reconcile payouts instantly.
            </p>
            <Separator />
            <p className="italic">Coming soon: automated inventory sync, cold-chain tracking, and farmer analytics.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FarmerDashboard;




