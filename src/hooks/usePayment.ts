import { useState } from "react";
import { toast } from "sonner";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

interface PaymentMethod {
  type: "gpay" | "phonepe" | "blockchain";
  name: string;
  icon: string;
}

interface PaymentResult {
  success: boolean;
  paymentId?: string;
  orderId?: string;
  txHash?: string;
  error?: string;
}

// Get admin wallet address from environment variable
// If not set, use zero address as fallback (will show error if used)
const getAdminWalletAddress = (): string => {
  const envValue = import.meta.env.VITE_ADMIN_WALLET_ADDRESS;
  
  // Debug logging
  console.log("VITE_ADMIN_WALLET_ADDRESS from env:", envValue);
  
  // If not set, return zero address
  if (!envValue) {
    console.warn("VITE_ADMIN_WALLET_ADDRESS is not set in environment variables");
    return "0x0000000000000000000000000000000000000000";
  }
  
  // Trim whitespace
  const trimmedValue = envValue.trim();
  
  // Check if it's a placeholder value
  if (
    trimmedValue.includes("YourAdmin") || 
    trimmedValue.includes("YourWallet") ||
    trimmedValue.includes("placeholder") ||
    trimmedValue === "0xYourAdminWallet" ||
    trimmedValue === "0x0000000000000000000000000000000000000000"
  ) {
    console.warn("VITE_ADMIN_WALLET_ADDRESS contains placeholder or zero address. Please set a real wallet address in .env.local");
    return "0x0000000000000000000000000000000000000000";
  }
  
  // Validate format
  if (!trimmedValue.startsWith("0x")) {
    console.error("VITE_ADMIN_WALLET_ADDRESS must start with 0x. Current value:", trimmedValue);
    return "0x0000000000000000000000000000000000000000";
  }
  
  if (!/^0x[a-fA-F0-9]{40}$/.test(trimmedValue)) {
    console.error("VITE_ADMIN_WALLET_ADDRESS has invalid format. Must be 42 characters (0x + 40 hex chars). Current value:", trimmedValue, "Length:", trimmedValue.length);
    return "0x0000000000000000000000000000000000000000";
  }
  
  return trimmedValue;
};

const ADMIN_WALLET_ADDRESS = getAdminWalletAddress();
const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID;

// Load Razorpay script dynamically
const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const usePayment = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();

  const processPayment = async (
    amount: number,
    paymentMethod: "gpay" | "phonepe" | "blockchain",
    productId: string,
    productName: string,
    farmerId?: string,
    farmerName?: string,
  ): Promise<PaymentResult> => {
    setIsProcessing(true);

    try {
      if (paymentMethod === "blockchain") {
        return await processBlockchainPayment(amount, productId, productName, farmerId, farmerName);
      } else {
        return await processGPayPayment(amount, paymentMethod, productId, productName, farmerId, farmerName);
      }
    } catch (error: any) {
      console.error("Payment processing error:", error);
      return {
        success: false,
        error: error.message || "Payment processing failed",
      };
    } finally {
      setIsProcessing(false);
    }
  };

  const processGPayPayment = async (
    amount: number,
    method: "gpay" | "phonepe",
    productId: string,
    productName: string,
    farmerId?: string,
    farmerName?: string,
  ): Promise<PaymentResult> => {
    try {
      // Load Razorpay script
      const razorpayLoaded = await loadRazorpayScript();
      if (!razorpayLoaded) {
        return {
          success: false,
          error: "Payment gateway failed to load. Please try again.",
        };
      }

      // If Razorpay key is not configured, use mock payment for development
      if (!RAZORPAY_KEY) {
        console.warn("Razorpay key not configured. Using mock payment.");
        return await processMockGPayPayment(amount, method, productId, productName, farmerId, farmerName);
      }

      // Create order in Firestore first (escrow status)
      const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      if (db && user) {
        await setDoc(doc(db, "orders", orderId), {
          orderId,
          productId,
          productName,
          customerId: user.uid,
          customerEmail: user.email,
          farmerId: farmerId || "unknown",
          farmerName: farmerName || "Unknown Farmer",
          amount,
          currency: "INR",
          paymentMethod: method,
          status: "pending", // Payment held in escrow
          paymentStatus: "pending",
          deliveryStatus: "pending",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // Initialize Razorpay
      const options = {
        key: RAZORPAY_KEY,
        amount: amount * 100, // Convert to paise
        currency: "INR",
        name: "FreshPledge",
        description: `Payment for ${productName}`,
        method: method === "gpay" ? "gpay" : "wallet",
        handler: async function (response: any) {
          // Payment successful - update order status
          if (db) {
            await setDoc(
              doc(db, "orders", orderId),
              {
                paymentId: response.razorpay_payment_id,
                paymentStatus: "completed",
                status: "paid", // Payment received, held in escrow
                razorpayOrderId: response.razorpay_order_id,
                razorpaySignature: response.razorpay_signature,
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            );
          }

          toast.success("Payment successful! Order placed. Payment held in escrow until delivery.");
        },
        prefill: {
          email: user?.email || "",
          name: user?.displayName || "",
        },
        theme: {
          color: "#16a34a",
        },
        modal: {
          ondismiss: function() {
            toast.error("Payment cancelled");
          },
        },
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();

      // Return order ID immediately (payment will be confirmed via handler)
      return {
        success: true,
        orderId,
        paymentId: `pending_${orderId}`,
      };
    } catch (error: any) {
      console.error("GPay payment error:", error);
      return {
        success: false,
        error: error.message || "Payment failed. Please try again.",
      };
    }
  };

  const processMockGPayPayment = async (
    amount: number,
    method: "gpay" | "phonepe",
    productId: string,
    productName: string,
    farmerId?: string,
    farmerName?: string,
  ): Promise<PaymentResult> => {
    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const paymentId = `PAY_${method.toUpperCase()}_${Date.now()}`;

    // Create order in Firestore with escrow status
    if (db && user) {
      try {
        await setDoc(doc(db, "orders", orderId), {
          orderId,
          productId,
          productName,
          customerId: user.uid,
          customerEmail: user.email,
          farmerId: farmerId || "unknown",
          farmerName: farmerName || "Unknown Farmer",
          amount,
          currency: "INR",
          paymentMethod: method,
          paymentId,
          status: "paid", // Payment received, held in escrow
          paymentStatus: "completed",
          deliveryStatus: "pending",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        toast.success("Payment successful! Order placed. Payment held in escrow until delivery.");
        return {
          success: true,
          orderId,
          paymentId,
        };
      } catch (error) {
        console.error("Failed to create order:", error);
        return {
          success: false,
          error: "Failed to create order. Please try again.",
        };
      }
    }

    return {
      success: false,
      error: "User not authenticated",
    };
  };

  const processBlockchainPayment = async (
    amount: number,
    productId: string,
    productName: string,
    farmerId?: string,
    farmerName?: string,
  ): Promise<PaymentResult> => {
    try {
      // Import escrow service
      const { escrowService } = await import("./useEscrow");

      // Convert INR to ETH (approximate rate)
      const ETH_PER_INR = 0.000016;
      const ethAmount = (amount * ETH_PER_INR).toFixed(6);

      const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Get farmer's wallet address (in production, fetch from Firestore user profile)
      // For now, use admin wallet as placeholder - farmer should set their wallet in profile
      const farmerWalletAddress = farmerId 
        ? await getFarmerWalletAddress(farmerId) 
        : ADMIN_WALLET_ADDRESS;

      // Debug logging
      console.log("Farmer wallet address resolved:", farmerWalletAddress);
      console.log("ADMIN_WALLET_ADDRESS:", ADMIN_WALLET_ADDRESS);

      // Validate wallet addresses
      if (farmerWalletAddress === "0x0000000000000000000000000000000000000000" || !farmerWalletAddress) {
        // User-friendly error message for customers
        console.error("Farmer wallet address not configured. ADMIN_WALLET_ADDRESS:", ADMIN_WALLET_ADDRESS);
        return {
          success: false,
          error: "Blockchain payment is currently unavailable. Please try Google Pay or PhonePe, or contact support for assistance.",
        };
      }
      
      // Validate address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(farmerWalletAddress)) {
        console.error("Invalid wallet address format:", farmerWalletAddress);
        return {
          success: false,
          error: "Blockchain payment is currently unavailable. Please try another payment method or contact support.",
        };
      }

      // Create order in smart contract (funds locked in escrow)
      const result = await escrowService.createOrder(
        orderId,
        farmerWalletAddress,
        productId,
        ethAmount,
        7 // 7 days delivery deadline
      );

      if (!result.success) {
        return result;
      }

      // Save order to Firestore for tracking
      if (db && user) {
        await setDoc(doc(db, "orders", orderId), {
          orderId,
          productId,
          productName,
          customerId: user.uid,
          customerEmail: user.email,
          farmerId: farmerId || "unknown",
          farmerName: farmerName || "Unknown Farmer",
          farmerWalletAddress,
          amount,
          currency: "ETH",
          paymentMethod: "blockchain",
          txHash: result.txHash,
          orderHash: result.orderHash,
          status: "created", // Created in escrow, not yet released
          paymentStatus: "locked", // Funds locked in escrow
          deliveryStatus: "pending",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      toast.success("Payment successful! Funds locked in escrow until delivery.");
      return {
        success: true,
        orderId,
        txHash: result.txHash,
      };
    } catch (error: any) {
      console.error("Blockchain payment error:", error);
      
      // Provide user-friendly error messages (hide technical details from customers)
      let errorMessage = "Blockchain payment is currently unavailable. Please try Google Pay or PhonePe.";
      
      if (error.message?.includes("MetaMask not installed") || error.message?.includes("not installed")) {
        errorMessage = "MetaMask is not installed. Please install MetaMask to use blockchain payments, or choose another payment method.";
      } else if (error.message?.includes("User rejected") || error.code === 4001) {
        errorMessage = "Transaction was cancelled. You can try again or choose another payment method.";
      } else if (error.message?.includes("insufficient funds") || error.message?.includes("INSUFFICIENT_FUNDS")) {
        errorMessage = "Insufficient funds in your wallet. Please add more ETH or choose another payment method.";
      } else if (error.message?.includes("Blockchain payment is currently unavailable")) {
        // Use the user-friendly message from validation
        errorMessage = error.message;
      } else if (error.message?.includes("contract address not configured") || error.message?.includes("wallet address not configured") || error.message?.includes("Farmer wallet address")) {
        // Hide technical details - show user-friendly message
        errorMessage = "Blockchain payment is currently unavailable. Please try Google Pay or PhonePe, or contact support.";
      } else if (error.message) {
        // For any other errors, show generic user-friendly message
        errorMessage = "Blockchain payment is currently unavailable. Please try another payment method or contact support.";
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  };

  // Helper to get farmer's wallet address from Firestore
  const getFarmerWalletAddress = async (farmerId: string): Promise<string> => {
    if (!db) return ADMIN_WALLET_ADDRESS;
    
    try {
      const farmerDoc = await getDoc(doc(db, "users", farmerId));
      if (farmerDoc.exists()) {
        const data = farmerDoc.data();
        return data.walletAddress || ADMIN_WALLET_ADDRESS;
      }
    } catch (error) {
      console.error("Failed to fetch farmer wallet:", error);
    }
    
    return ADMIN_WALLET_ADDRESS;
  };

  const paymentMethods: PaymentMethod[] = [
    {
      type: "gpay",
      name: "Google Pay",
      icon: "https://www.gstatic.com/instantbuy/svg/gpay.svg",
    },
    {
      type: "phonepe",
      name: "PhonePe",
      icon: "https://logos-world.net/wp-content/uploads/2023/01/PhonePe-Logo.png",
    },
    {
      type: "blockchain",
      name: "Blockchain (ETH)",
      icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23627EEA' d='M12 2L2 7v10l10 5 10-5V7L12 2z'/%3E%3C/svg%3E",
    },
  ];

  return {
    processPayment,
    isProcessing,
    paymentMethods,
  };
};

