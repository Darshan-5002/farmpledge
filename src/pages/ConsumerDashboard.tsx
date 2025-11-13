import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Navigation from "@/components/Navigation";
import { Leaf, ShoppingBag, Wallet, Truck } from "lucide-react";

const ConsumerDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <Navigation />
      <div className="container mx-auto px-4 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Welcome back, {user?.displayName ?? "Consumer"}</h1>
            <p className="text-muted-foreground">Track your orders, manage subscriptions, and discover blockchain-verified dairy.</p>
          </div>
          <Button onClick={() => window.location.assign("/products")}>Browse products</Button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active orders</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">You have no active orders right now</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Loyalty balance</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0 Pledge Points</div>
              <p className="text-xs text-muted-foreground">Earn points for sustainable purchases</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Deliveries this month</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Schedule repeat deliveries to save time</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Leaf className="h-5 w-5 text-primary" /> Blockchain authenticity tracker
            </CardTitle>
            <CardDescription>Every purchase you make is backed by an immutable blockchain record.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-4">
            <p>We are building a unified timeline of all your farm-to-table transactions. Soon, you’ll be able to inspect provenance, temperature logs, and farmer credentials for every product in one place.</p>
            <Separator />
            <p className="italic">Coming soon: sustainability badges, carbon offsets, and farm impact metrics.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConsumerDashboard;
