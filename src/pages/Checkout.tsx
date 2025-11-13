import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { usePayment } from "@/hooks/usePayment";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import { 
  ArrowLeft, 
  CreditCard, 
  Loader2, 
  CheckCircle2,
  ShoppingBag,
  Wallet
} from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { processPayment, isProcessing, paymentMethods } = usePayment();
  
  // Get product from location state or use demo product
  const product: Product = location.state?.product || {
    id: "demo-1",
    name: "Fresh Organic Milk (1L)",
    price: 50,
    quantity: 1,
  };

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"gpay" | "phonepe" | "blockchain" | null>(null);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{ paymentId?: string; orderId?: string; txHash?: string } | null>(null);

  const totalAmount = product.price * product.quantity;

  const handlePayment = async () => {
    if (!selectedPaymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

    // Get farmer info from product if available
    const farmerId = (product as any).ownerId;
    const farmerName = (product as any).ownerName || (product as any).farmer;

    const result = await processPayment(
      totalAmount,
      selectedPaymentMethod,
      product.id,
      product.name,
      farmerId,
      farmerName
    );

    if (result.success) {
      setPaymentCompleted(true);
      setPaymentResult({
        paymentId: result.paymentId,
        orderId: result.orderId,
        txHash: result.txHash,
      });
      
      // For GPay/PhonePe, payment is handled by Razorpay modal
      // Success message is shown in the payment hook
      if (selectedPaymentMethod === "blockchain") {
        toast.success("Payment processed successfully!");
      }
    } else {
      toast.error(result.error || "Payment failed");
    }
  };

  if (paymentCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 py-12">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card className="border-green-500">
            <CardContent className="pt-12 pb-12">
              <div className="text-center space-y-6">
                <div className="mx-auto w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
                  <p className="text-muted-foreground">
                    Your payment has been processed and transferred to the blockchain.
                  </p>
                </div>
                {paymentResult && (
                  <div className="space-y-3 text-left bg-muted p-4 rounded-lg">
                    {paymentResult.orderId && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Order ID:</span>
                        <code className="text-sm">{paymentResult.orderId}</code>
                      </div>
                    )}
                    {paymentResult.paymentId && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Payment ID:</span>
                        <code className="text-sm">{paymentResult.paymentId}</code>
                      </div>
                    )}
                    {paymentResult.txHash && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Blockchain TX:</span>
                        <code className="text-xs">{paymentResult.txHash.slice(0, 10)}...{paymentResult.txHash.slice(-8)}</code>
                      </div>
                    )}
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-900 dark:text-blue-100">
                        <strong>Payment held in escrow:</strong> Your payment will be released to the farmer once delivery is confirmed.
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex gap-4 justify-center">
                  <Button onClick={() => navigate("/products")}>
                    Continue Shopping
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/")}>
                    Go Home
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <Navigation />
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-muted-foreground">Quantity: {product.quantity}</p>
                </div>
                <p className="font-semibold">₹{product.price.toFixed(2)}</p>
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₹{totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Processing Fee</span>
                  <span>₹0.00</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>₹{totalAmount.toFixed(2)}</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Funds will be automatically transferred to blockchain wallet after payment
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Select Payment Method
              </CardTitle>
              <CardDescription>
                Choose your preferred payment method
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {paymentMethods.map((method) => (
                <button
                  key={method.type}
                  onClick={() => setSelectedPaymentMethod(method.type)}
                  className={`w-full p-4 border-2 rounded-lg transition-all ${
                    selectedPaymentMethod === method.type
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-background rounded flex items-center justify-center">
                        <img
                          src={method.icon}
                          alt={method.name}
                          className="w-8 h-8 object-contain"
                          onError={(e) => {
                            // Fallback if image doesn't load
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                      <span className="font-medium">{method.name}</span>
                    </div>
                    {selectedPaymentMethod === method.type && (
                      <Badge variant="default">Selected</Badge>
                    )}
                  </div>
                </button>
              ))}

              <Separator />

              <Button
                onClick={handlePayment}
                disabled={!selectedPaymentMethod || isProcessing}
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Payment...
                  </>
                ) : (
                  <>
                    Pay ₹{totalAmount.toFixed(2)}
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                By continuing, you agree to our Terms of Service and Privacy Policy
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Checkout;

