import { ethers } from "ethers";
import { toast } from "sonner";

// Contract ABI (minimal interface)
const ESCROW_ABI = [
  "function createOrder(string memory orderId, address farmer, string memory productId, uint64 deadline) payable",
  "function confirmDelivery(bytes32 orderHash)",
  "function confirmDeliveryAndRelease(bytes32 orderHash)",
  "function releaseOrder(bytes32 orderHash)",
  "function cancelOrder(bytes32 orderHash)",
  "function getOrder(bytes32 orderHash) view returns (tuple(address customer, address farmer, uint256 amount, uint8 status, uint64 createdAt, uint64 deadline, string productId, string orderId))",
  "function calculateOrderHash(string memory orderId, address customer, uint256 timestamp) pure returns (bytes32)",
  "function getEscrowBalance() view returns (uint256)",
  "event OrderCreated(bytes32 indexed orderHash, string indexed orderId, address customer, address farmer, uint256 amount, string productId)",
  "event OrderDelivered(bytes32 indexed orderHash, string indexed orderId)",
  "event OrderReleased(bytes32 indexed orderHash, string indexed orderId, address farmer, uint256 amountAfterFee, uint256 platformFee)",
];

// Get escrow contract address from environment variable
const getEscrowContractAddress = (): string => {
  const envValue = import.meta.env.VITE_ESCROW_CONTRACT_ADDRESS;
  
  // Check if it's a placeholder value
  if (envValue && (
    envValue.includes("YourDeployed") || 
    envValue.includes("YourContract") ||
    envValue.includes("placeholder") ||
    envValue === "0xYourDeployedContractAddress"
  )) {
    console.warn("VITE_ESCROW_CONTRACT_ADDRESS contains placeholder value. Please set a real contract address in .env.local");
    return "";
  }
  
  return envValue || "";
};

const ESCROW_CONTRACT_ADDRESS = getEscrowContractAddress();

// Helper functions
const isMetaMaskInstalled = () => {
  return typeof window !== "undefined" && 
         typeof window.ethereum !== "undefined" &&
         (window.ethereum.isMetaMask || window.ethereum.providers?.some((p: any) => p.isMetaMask));
};

const getProvider = async () => {
  // Check if MetaMask is installed
  if (!isMetaMaskInstalled()) {
    toast.error("MetaMask is not installed. Please install MetaMask to continue.");
    window.open("https://metamask.io/download/", "_blank");
    throw new Error("MetaMask not installed");
  }

  try {
    // Request account access
    await window.ethereum.request({ method: "eth_requestAccounts" });
    
    // Get the provider (handle multiple providers if present)
    const ethereum = window.ethereum.providers?.find((p: any) => p.isMetaMask) || window.ethereum;
    
    return new ethers.BrowserProvider(ethereum);
  } catch (error: any) {
    if (error.code === 4001) {
      toast.error("Please connect your MetaMask wallet to continue.");
      throw new Error("User rejected connection");
    }
    console.error("Error connecting to MetaMask:", error);
    toast.error("Failed to connect to MetaMask. Please try again.");
    throw error;
  }
};

const getContract = async () => {
  if (!ESCROW_CONTRACT_ADDRESS) {
    // Log technical details for developers, but throw user-friendly error
    console.error("Escrow contract address not configured. Please set VITE_ESCROW_CONTRACT_ADDRESS in .env.local file. See DEPLOYMENT.md for instructions.");
    throw new Error("Blockchain payment is currently unavailable. Please try another payment method.");
  }
  
  // Validate contract address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(ESCROW_CONTRACT_ADDRESS)) {
    // Log technical details for developers, but throw user-friendly error
    console.error("Invalid contract address format. Please check VITE_ESCROW_CONTRACT_ADDRESS in .env.local");
    throw new Error("Blockchain payment is currently unavailable. Please try another payment method.");
  }
  
  const provider = await getProvider();
  const signer = await provider.getSigner();
  return new ethers.Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, signer);
};

// Escrow service (not a hook, just utility functions)
export const escrowService = {

  /**
   * Create order and lock funds in escrow
   */
  async createOrder(
    orderId: string,
    farmerAddress: string,
    productId: string,
    amountInETH: string,
    deadlineDays: number = 7
  ) {
    try {
      const contract = await getContract();
      const deadline = Math.floor(Date.now() / 1000) + deadlineDays * 24 * 60 * 60;
      
      const tx = await contract.createOrder(
        orderId,
        farmerAddress,
        productId,
        deadline,
        { value: ethers.parseEther(amountInETH) }
      );

      toast.info("Transaction submitted. Waiting for confirmation...");
      const receipt = await tx.wait();
      
      // Get order hash from event
      const orderCreatedEvent = receipt.logs.find(
        (log: any) => log.topics[0] === ethers.id("OrderCreated(bytes32,string,address,address,uint256,string)")
      );
      
      let orderHash: string | null = null;
      if (orderCreatedEvent) {
        orderHash = ethers.hexlify(orderCreatedEvent.topics[1]);
      }

      toast.success("Order created! Funds locked in escrow.");
      return {
        success: true,
        txHash: receipt.hash,
        orderHash,
      };
    } catch (error: any) {
      console.error("Create order error:", error);
      
      // Show user-friendly error messages
      let errorMessage = "Blockchain payment is currently unavailable. Please try another payment method.";
      
      if (error.message?.includes("Blockchain payment is currently unavailable")) {
        errorMessage = error.message;
      } else if (error.reason?.includes("user rejected") || error.code === 4001) {
        errorMessage = "Transaction was cancelled. You can try again or choose another payment method.";
      } else if (error.reason?.includes("insufficient funds")) {
        errorMessage = "Insufficient funds in your wallet. Please add more ETH or choose another payment method.";
      }
      
      toast.error(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  /**
   * Customer confirms delivery
   */
  async confirmDelivery(orderHash: string) {
    try {
      const contract = await getContract();
      const tx = await contract.confirmDelivery(orderHash);
      toast.info("Confirming delivery...");
      await tx.wait();
      toast.success("Delivery confirmed! Farmer can now release payment.");
      return { success: true, txHash: tx.hash };
    } catch (error: any) {
      console.error("Confirm delivery error:", error);
      toast.error(error.reason || error.message || "Failed to confirm delivery");
      return {
        success: false,
        error: error.reason || error.message || "Failed to confirm delivery",
      };
    }
  },

  /**
   * Customer confirms delivery and automatically releases payment to farmer (one transaction)
   */
  async confirmDeliveryAndRelease(orderHash: string) {
    try {
      const contract = await getContract();
      const tx = await contract.confirmDeliveryAndRelease(orderHash);
      toast.info("Confirming delivery and releasing payment...");
      const receipt = await tx.wait();
      toast.success("Delivery confirmed and payment released to farmer!");
      return { success: true, txHash: receipt.hash };
    } catch (error: any) {
      console.error("Confirm delivery and release error:", error);
      toast.error(error.reason || error.message || "Failed to confirm delivery and release");
      return {
        success: false,
        error: error.reason || error.message || "Failed to confirm delivery and release",
      };
    }
  },

  /**
   * Release payment to farmer (after delivery confirmed)
   */
  async releaseOrder(orderHash: string) {
    try {
      const contract = await getContract();
      const tx = await contract.releaseOrder(orderHash);
      toast.info("Releasing payment to farmer...");
      const receipt = await tx.wait();
      toast.success("Payment released to farmer!");
      return { success: true, txHash: receipt.hash };
    } catch (error: any) {
      console.error("Release order error:", error);
      toast.error(error.reason || error.message || "Failed to release payment");
      return {
        success: false,
        error: error.reason || error.message || "Failed to release payment",
      };
    }
  },

  /**
   * Cancel order and refund customer
   */
  async cancelOrder(orderHash: string) {
    try {
      const contract = await getContract();
      const tx = await contract.cancelOrder(orderHash);
      toast.info("Cancelling order...");
      await tx.wait();
      toast.success("Order cancelled. Refund processed.");
      return { success: true, txHash: tx.hash };
    } catch (error: any) {
      console.error("Cancel order error:", error);
      toast.error(error.reason || error.message || "Failed to cancel order");
      return {
        success: false,
        error: error.reason || error.message || "Failed to cancel order",
      };
    }
  },

  /**
   * Get order details
   */
  async getOrder(orderHash: string) {
    try {
      const contract = await getContract();
      const order = await contract.getOrder(orderHash);
      return {
        customer: order.customer,
        farmer: order.farmer,
        amount: ethers.formatEther(order.amount),
        status: order.status,
        createdAt: new Date(Number(order.createdAt) * 1000),
        deadline: order.deadline > 0 ? new Date(Number(order.deadline) * 1000) : null,
        productId: order.productId,
        orderId: order.orderId,
      };
    } catch (error: any) {
      console.error("Get order error:", error);
      return null;
    }
  },

  /**
   * Get total escrow balance
   */
  async getEscrowBalance() {
    try {
      const contract = await getContract();
      const balance = await contract.getEscrowBalance();
      return ethers.formatEther(balance);
    } catch (error: any) {
      console.error("Get escrow balance error:", error);
      return "0";
    }
  },
};

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
      send: (method: string, params?: any[]) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
    };
  }
}

