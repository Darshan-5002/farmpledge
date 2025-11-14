import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { usePayment } from "@/hooks/usePayment";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Navigation from "@/components/Navigation";
import { 
  ArrowLeft, 
  CreditCard, 
  Loader2, 
  CheckCircle2,
  ShoppingBag,
  Wallet,
  AlertCircle,
  Download,
  CheckCircle
} from "lucide-react";
import { toast } from "sonner";
import { ethers } from "ethers";

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
  const rawProduct = location.state?.product;
  const product: Product = rawProduct
    ? {
        id: rawProduct.id || "unknown",
        name: rawProduct.name || "Unknown Product",
        price: typeof rawProduct.price === "number" && !isNaN(rawProduct.price) && rawProduct.price > 0 
          ? rawProduct.price 
          : 0,
        quantity: typeof rawProduct.quantity === "number" && !isNaN(rawProduct.quantity) && rawProduct.quantity > 0
          ? rawProduct.quantity
          : 1,
        image: rawProduct.image,
      }
    : {
        id: "demo-1",
        name: "Fresh Organic Milk (1L)",
        price: 50,
        quantity: 1,
      };

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"gpay" | "phonepe" | "blockchain" | null>(null);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{ paymentId?: string; orderId?: string; txHash?: string } | null>(null);
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // Check if MetaMask is installed and if wallet is connected
  useEffect(() => {
    const checkMetaMask = async () => {
      const installed = typeof window !== "undefined" && 
                       typeof window.ethereum !== "undefined" &&
                       (window.ethereum.isMetaMask || window.ethereum.providers?.some((p: any) => p.isMetaMask));
      setIsMetaMaskInstalled(installed);
      
      // Check if already connected
      if (installed && window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await provider.listAccounts();
          if (accounts.length > 0) {
            setIsWalletConnected(true);
            setWalletAddress(accounts[0].address);
          }
        } catch (error) {
          // Not connected yet
          setIsWalletConnected(false);
          setWalletAddress(null);
        }
      }
    };
    
    checkMetaMask();
    
    // Check periodically in case MetaMask is installed after page load
    const interval = setInterval(checkMetaMask, 1000);
    
    // Listen for account changes
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setIsWalletConnected(true);
          setWalletAddress(accounts[0]);
        } else {
          setIsWalletConnected(false);
          setWalletAddress(null);
        }
      };
      
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      
      return () => {
        clearInterval(interval);
        window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
      };
    }
    
    return () => clearInterval(interval);
  }, []);
  
  // Connect wallet function
  const connectWallet = async () => {
    if (!isMetaMaskInstalled) {
      toast.error("MetaMask is not installed. Please install MetaMask to continue.");
      window.open("https://metamask.io/download/", "_blank");
      return;
    }
    
    setIsConnectingWallet(true);
    try {
      if (!window.ethereum) {
        throw new Error("MetaMask not found");
      }
      
      // Request account access
      await window.ethereum.request({ method: "eth_requestAccounts" });
      
      // Get the connected account
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      setIsWalletConnected(true);
      setWalletAddress(address);
      toast.success(`Wallet connected: ${address.slice(0, 6)}...${address.slice(-4)}`);
    } catch (error: any) {
      console.error("Error connecting wallet:", error);
      if (error.code === 4001) {
        toast.error("Please connect your MetaMask wallet to continue.");
      } else {
        toast.error("Failed to connect wallet. Please try again.");
      }
      setIsWalletConnected(false);
      setWalletAddress(null);
    } finally {
      setIsConnectingWallet(false);
    }
  };

  // Ensure totalAmount is always a valid number
  const totalAmount = (product.price || 0) * (product.quantity || 1);

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
                <p className="font-semibold">₹{(product.price || 0).toFixed(2)}</p>
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₹{(totalAmount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Processing Fee</span>
                  <span>₹0.00</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>₹{(totalAmount || 0).toFixed(2)}</span>
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

              {/* MetaMask Warning for Blockchain Payment */}
              {selectedPaymentMethod === "blockchain" && !isMetaMaskInstalled && (
                <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <AlertTitle className="text-amber-900 dark:text-amber-100">
                    MetaMask Required
                  </AlertTitle>
                  <AlertDescription className="text-amber-800 dark:text-amber-200">
                    <p className="mb-2">
                      To use blockchain payments, you need to install the MetaMask browser extension.
                    </p>
                    <Button
                      onClick={() => window.open("https://metamask.io/download/", "_blank")}
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      <Download className="mr-2 h-3 w-3" />
                      Install MetaMask
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Wallet Connection Status for Blockchain Payment */}
              {selectedPaymentMethod === "blockchain" && isMetaMaskInstalled && (
                <>
                  {!isWalletConnected ? (
                    <Alert className="border-blue-500/50 bg-blue-50 dark:bg-blue-950/20">
                      <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <AlertTitle className="text-blue-900 dark:text-blue-100">
                        Connect Your Wallet
                      </AlertTitle>
                      <AlertDescription className="text-blue-800 dark:text-blue-200">
                        <p className="mb-3">
                          Please connect your MetaMask wallet to proceed with blockchain payment.
                        </p>
                        <Button
                          onClick={connectWallet}
                          disabled={isConnectingWallet}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {isConnectingWallet ? (
                            <>
                              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                              Connecting...
                            </>
                          ) : (
                            <>
                              <Wallet className="mr-2 h-3 w-3" />
                              Connect Wallet
                            </>
                          )}
                        </Button>
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <AlertTitle className="text-green-900 dark:text-green-100">
                        Wallet Connected
                      </AlertTitle>
                      <AlertDescription className="text-green-800 dark:text-green-200">
                        <p className="text-sm">
                          {walletAddress && `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}
                        </p>
                        <p className="text-xs mt-1">
                          Make sure you're on the Sepolia test network for testing.
                        </p>
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}

              <Button
                onClick={handlePayment}
                disabled={
                  !selectedPaymentMethod || 
                  isProcessing || 
                  (selectedPaymentMethod === "blockchain" && (!isMetaMaskInstalled || !isWalletConnected))
                }
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
                    Pay ₹{(totalAmount || 0).toFixed(2)}
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

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      providers?: Array<{
        isMetaMask?: boolean;
        request: (args: { method: string; params?: any[] }) => Promise<any>;
      }>;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
      selectedAddress?: string;
    };
  }
}

