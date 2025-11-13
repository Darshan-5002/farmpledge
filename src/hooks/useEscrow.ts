import { ethers } from "ethers";
import { toast } from "sonner";

// Contract ABI (minimal interface)
const ESCROW_ABI = [
  "function createOrder(string memory orderId, address farmer, string memory productId, uint64 deadline) payable",
  "function confirmDelivery(bytes32 orderHash)",
  "function releaseOrder(bytes32 orderHash)",
  "function cancelOrder(bytes32 orderHash)",
  "function getOrder(bytes32 orderHash) view returns (tuple(address customer, address farmer, uint256 amount, uint8 status, uint64 createdAt, uint64 deadline, string productId, string orderId))",
  "function calculateOrderHash(string memory orderId, address customer, uint256 timestamp) pure returns (bytes32)",
  "event OrderCreated(bytes32 indexed orderHash, string indexed orderId, address customer, address farmer, uint256 amount, string productId)",
  "event OrderDelivered(bytes32 indexed orderHash, string indexed orderId)",
  "event OrderReleased(bytes32 indexed orderHash, string indexed orderId, address farmer, uint256 amountAfterFee, uint256 platformFee)",
];

const ESCROW_CONTRACT_ADDRESS = import.meta.env.VITE_ESCROW_CONTRACT_ADDRESS || "";

// Helper functions
const getProvider = async () => {
  if (typeof window.ethereum !== "undefined") {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    return new ethers.BrowserProvider(window.ethereum);
  }
  throw new Error("MetaMask not installed");
};

const getContract = async () => {
  if (!ESCROW_CONTRACT_ADDRESS) {
    throw new Error("Escrow contract address not configured");
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
      toast.error(error.reason || error.message || "Failed to create order");
      return {
        success: false,
        error: error.reason || error.message || "Failed to create order",
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
};

