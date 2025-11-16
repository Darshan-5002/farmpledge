import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle2, 
  Package, 
  ShoppingBag, 
  ExternalLink,
  Home,
  ArrowLeft
} from "lucide-react";
import Navigation from "@/components/Navigation";

const OrderConfirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get order details from location state
  const orderData = location.state as {
    orderId?: string;
    paymentId?: string;
    txHash?: string;
    productName?: string;
    amount?: number;
    quantity?: number;
    paymentMethod?: string;
  } | null;

  const orderId = orderData?.orderId || "N/A";
  const paymentId = orderData?.paymentId || "N/A";
  const txHash = orderData?.txHash;
  const productName = orderData?.productName || "Product";
  const amount = orderData?.amount || 0;
  const quantity = orderData?.quantity || 1;
  const paymentMethod = orderData?.paymentMethod || "blockchain";

  const getPaymentMethodName = (method: string) => {
    switch (method) {
      case "gpay":
        return "Google Pay";
      case "phonepe":
        return "PhonePe";
      case "blockchain":
        return "Blockchain (ETH)";
      default:
        return method;
    }
  };

  const getExplorerUrl = (hash: string) => {
    // Check if it's Sepolia testnet (chainId 11155111) or mainnet
    // For now, defaulting to Sepolia
    return `https://sepolia.etherscan.io/tx/${hash}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <Navigation />
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/products")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Products
          </Button>
        </div>

        <Card className="border-green-500 shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-24 h-24 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-3xl font-bold mb-2">Order Confirmed!</CardTitle>
            <CardDescription className="text-lg">
              Your order has been placed successfully
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Order Summary */}
            <div className="bg-muted/50 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Order Summary</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{productName}</p>
                    <p className="text-sm text-muted-foreground">Quantity: {quantity}</p>
                  </div>
                  <p className="font-semibold">₹{amount.toFixed(2)}</p>
                </div>
                
                <Separator />
                
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Amount</span>
                  <span>₹{amount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Order Details */}
            <div className="bg-muted/50 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingBag className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Order Details</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Order ID:</span>
                  <code className="text-sm font-mono bg-background px-2 py-1 rounded">
                    {orderId}
                  </code>
                </div>
                
                {paymentId && paymentId !== "N/A" && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Payment ID:</span>
                    <code className="text-sm font-mono bg-background px-2 py-1 rounded">
                      {paymentId}
                    </code>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Payment Method:</span>
                  <Badge variant="secondary">{getPaymentMethodName(paymentMethod)}</Badge>
                </div>
                
                {txHash && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Transaction Hash:</span>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono bg-background px-2 py-1 rounded">
                        {txHash.slice(0, 10)}...{txHash.slice(-8)}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(getExplorerUrl(txHash), "_blank")}
                        className="h-6 px-2"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Escrow Notice */}
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Payment held in escrow:</strong> Your payment will be released to the farmer once delivery is confirmed. You can track your order status in your dashboard.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button 
                onClick={() => navigate("/dashboard")}
                className="flex-1"
                size="lg"
              >
                View My Orders
              </Button>
              <Button 
                onClick={() => navigate("/products")}
                variant="outline"
                className="flex-1"
                size="lg"
              >
                Continue Shopping
              </Button>
              <Button 
                onClick={() => navigate("/")}
                variant="ghost"
                className="flex-1"
                size="lg"
              >
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrderConfirmation;




