import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Navigation from "@/components/Navigation";
import { Leaf, ShoppingBag, Wallet, Truck, CheckCircle2, Loader2, Package, ExternalLink, AlertCircle } from "lucide-react";
import { databases, appwriteDatabaseId, Query } from "@/lib/appwrite";
import { escrowService } from "@/hooks/useEscrow";
import { toast } from "sonner";

interface Order {
  id: string;
  orderId: string;
  productName: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: string;
  paymentStatus: string;
  deliveryStatus: string;
  txHash?: string;
  orderHash?: string;
  createdAt: any;
  farmerName?: string;
}

const ConsumerDashboard = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);

  // Fetch orders from Appwrite
  useEffect(() => {
    if (!databases || !user) {
      console.log("Cannot fetch orders - databases:", !!databases, "user:", !!user);
      setIsLoading(false);
      return;
    }

    console.log("Fetching orders for user:", user.uid, "email:", user.email);

    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        
        // Fetch all orders for debugging
        const allOrders = await databases.listDocuments(
          appwriteDatabaseId,
          "orders"
        );
        console.log("=== DEBUG: Total orders in Appwrite:", allOrders.documents.length);
        allOrders.documents.forEach((doc) => {
          console.log("Order in Appwrite:", {
            id: doc.$id,
            orderId: doc.orderId,
            customerId: doc.customerId,
            farmerId: doc.farmerId,
            productName: doc.productName,
          });
        });

        // Fetch orders for this customer
        const customerOrders = await databases.listDocuments(
          appwriteDatabaseId,
          "orders",
          [Query.equal("customerId", user.uid)]
        );

        console.log("Customer orders received, count:", customerOrders.documents.length);
        
        const ordersData: Order[] = customerOrders.documents.map((doc) => {
          console.log("Order data:", doc.$id, doc);
          return {
            id: doc.$id,
            orderId: doc.orderId,
            productName: doc.productName,
            amount: typeof doc.amount === "string" ? parseFloat(doc.amount) : doc.amount,
            currency: doc.currency,
            paymentMethod: doc.paymentMethod,
            status: doc.status,
            paymentStatus: doc.paymentStatus,
            deliveryStatus: doc.deliveryStatus,
            txHash: doc.txHash,
            orderHash: doc.orderHash,
            createdAt: doc.$createdAt ? new Date(doc.$createdAt) : null,
            farmerName: doc.farmerName,
          };
        });
        
        // Sort by creation date (newest first)
        ordersData.sort((a, b) => {
          const aTime = a.createdAt ? a.createdAt.getTime() : 0;
          const bTime = b.createdAt ? b.createdAt.getTime() : 0;
          return bTime - aTime;
        });
        
        setOrders(ordersData);
        setIsLoading(false);
        console.log("Orders set:", ordersData.length);
      } catch (error: any) {
        console.error("Error fetching orders from Appwrite:", error);
        setIsLoading(false);
      }
    };

    fetchOrders();
    
    // Poll for updates every 5 seconds (Appwrite doesn't have real-time subscriptions in the same way)
    const interval = setInterval(fetchOrders, 5000);
    
    return () => clearInterval(interval);
  }, [user]);

  const handleConfirmDelivery = async (order: Order) => {
    if (!order.orderHash) {
      toast.error("Order hash not found. Cannot confirm delivery.");
      return;
    }

    setConfirmingOrderId(order.id);
    try {
      const result = await escrowService.confirmDeliveryAndRelease(order.orderHash);
      
      if (result.success) {
        // Update order in Appwrite
        if (databases) {
          try {
            await databases.updateDocument(
              appwriteDatabaseId,
              "orders",
              order.id,
              {
                deliveryStatus: "confirmed",
                paymentStatus: "released",
                status: "completed",
              }
            );
          } catch (error) {
            console.error("Failed to update order in Appwrite:", error);
          }
        }
        
        toast.success("Delivery confirmed! Payment has been released to the farmer.");
      } else {
        toast.error(result.error || "Failed to confirm delivery");
      }
    } catch (error: any) {
      console.error("Error confirming delivery:", error);
      toast.error(error.message || "Failed to confirm delivery");
    } finally {
      setConfirmingOrderId(null);
    }
  };

  const getStatusBadge = (order: Order) => {
    if (order.deliveryStatus === "confirmed" || order.status === "completed") {
      return <Badge className="bg-green-500">Completed</Badge>;
    }
    if (order.deliveryStatus === "pending" && order.paymentStatus === "locked") {
      return <Badge className="bg-yellow-500">Pending Delivery</Badge>;
    }
    if (order.paymentStatus === "pending") {
      return <Badge variant="outline">Payment Pending</Badge>;
    }
    return <Badge variant="secondary">{order.status}</Badge>;
  };

  const activeOrders = orders.filter(
    (order) => order.deliveryStatus !== "confirmed" && order.status !== "completed" && order.status !== "cancelled"
  );

  const completedOrders = orders.filter(
    (order) => order.deliveryStatus === "confirmed" || order.status === "completed"
  );

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
              <div className="text-2xl font-bold">{activeOrders.length}</div>
              <p className="text-xs text-muted-foreground">
                {activeOrders.length === 0 ? "You have no active orders right now" : `${activeOrders.length} order(s) pending`}
              </p>
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
              <div className="text-2xl font-bold">{completedOrders.length}</div>
              <p className="text-xs text-muted-foreground">Schedule repeat deliveries to save time</p>
            </CardContent>
          </Card>
        </div>

        {/* Active Orders Section */}
        {isLoading ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">Loading orders...</p>
            </CardContent>
          </Card>
        ) : activeOrders.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Active Orders
              </CardTitle>
              <CardDescription>Orders waiting for delivery confirmation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeOrders.map((order) => (
                <div key={order.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{order.productName}</h3>
                        {getStatusBadge(order)}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Order ID: <code className="text-xs">{order.orderId}</code></p>
                        <p>Amount: {order.currency === "ETH" ? `${order.amount} ETH` : `₹${order.amount.toFixed(2)}`}</p>
                        {order.farmerName && <p>Farmer: {order.farmerName}</p>}
                        {order.txHash && (
                          <div className="flex items-center gap-2">
                            <span>Transaction:</span>
                            <code className="text-xs">{order.txHash.slice(0, 10)}...{order.txHash.slice(-8)}</code>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 px-2"
                              onClick={() => window.open(`https://sepolia.etherscan.io/tx/${order.txHash}`, "_blank")}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {order.paymentMethod === "blockchain" && 
                   order.paymentStatus === "locked" && 
                   order.deliveryStatus === "pending" && 
                   order.orderHash && (
                    <div className="pt-2 border-t">
                      <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                        <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <AlertDescription className="text-blue-900 dark:text-blue-100">
                          <p className="mb-3">
                            Funds are locked in escrow. Once you receive and verify your order, confirm delivery to release payment to the farmer.
                          </p>
                          <Button
                            onClick={() => handleConfirmDelivery(order)}
                            disabled={confirmingOrderId === order.id}
                            className="w-full sm:w-auto"
                          >
                            {confirmingOrderId === order.id ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Confirming...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Confirm Delivery & Release Payment
                              </>
                            )}
                          </Button>
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}
                  
                  {order.paymentMethod !== "blockchain" && order.deliveryStatus === "pending" && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground">
                        Payment method: {order.paymentMethod === "gpay" ? "Google Pay" : order.paymentMethod === "phonepe" ? "PhonePe" : order.paymentMethod}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">You have no active orders</p>
              <Button onClick={() => window.location.assign("/products")} className="mt-4">
                Browse Products
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Completed Orders Section */}
        {completedOrders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Completed Orders
              </CardTitle>
              <CardDescription>Your completed and delivered orders</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {completedOrders.map((order) => (
                <div key={order.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{order.productName}</h3>
                        {getStatusBadge(order)}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Order ID: <code className="text-xs">{order.orderId}</code></p>
                        <p>Amount: {order.currency === "ETH" ? `${order.amount} ETH` : `₹${order.amount.toFixed(2)}`}</p>
                        {order.farmerName && <p>Farmer: {order.farmerName}</p>}
                        {order.txHash && (
                          <div className="flex items-center gap-2">
                            <span>Transaction:</span>
                            <code className="text-xs">{order.txHash.slice(0, 10)}...{order.txHash.slice(-8)}</code>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 px-2"
                              onClick={() => window.open(`https://sepolia.etherscan.io/tx/${order.txHash}`, "_blank")}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

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
