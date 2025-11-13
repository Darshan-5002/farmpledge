import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { toast } from "@/components/ui/use-toast";

declare global {
  interface Window {
    ethereum?: any;
  }
}

interface PaymentResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export const useBlockchainPayment = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [balance, setBalance] = useState<string>("0");

  // Check if MetaMask is installed
  const isMetaMaskInstalled = () => {
    return typeof window.ethereum !== "undefined";
  };

  // Connect to MetaMask
  const connectWallet = async () => {
    if (!isMetaMaskInstalled()) {
      toast({
        title: "MetaMask Not Found",
        description: "Please install MetaMask extension to proceed.",
        variant: "destructive",
      });
      return false;
    }

    setIsConnecting(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const balance = await provider.getBalance(address);

      setProvider(provider);
      setSigner(signer);
      setAccount(address);
      setBalance(ethers.formatEther(balance));
      setIsConnected(true);

      toast({
        title: "Wallet Connected",
        description: `Connected to ${address.slice(0, 6)}...${address.slice(-4)}`,
      });

      return true;
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect wallet",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsConnecting(false);
    }
  };

  // Send payment
  const sendPayment = async (
    recipientAddress: string,
    amount: string
  ): Promise<PaymentResult> => {
    if (!signer || !account) {
      return {
        success: false,
        error: "Wallet not connected. Please connect your wallet first.",
      };
    }

    try {
      // Validate recipient address
      if (!ethers.isAddress(recipientAddress)) {
        return {
          success: false,
          error: "Invalid recipient address",
        };
      }

      // Convert amount to Wei
      const amountWei = ethers.parseEther(amount);

      // Check balance
      const balanceWei = await provider!.getBalance(account);
      if (balanceWei < amountWei) {
        return {
          success: false,
          error: "Insufficient balance",
        };
      }

      // Send transaction
      const tx = await signer.sendTransaction({
        to: recipientAddress,
        value: amountWei,
      });

      toast({
        title: "Transaction Pending",
        description: `Transaction sent: ${tx.hash.slice(0, 10)}...`,
      });

      // Wait for confirmation
      await tx.wait();

      // Update balance
      const newBalance = await provider!.getBalance(account);
      setBalance(ethers.formatEther(newBalance));

      toast({
        title: "Payment Successful",
        description: `Transaction confirmed: ${tx.hash}`,
      });

      return {
        success: true,
        txHash: tx.hash,
      };
    } catch (error: any) {
      const errorMessage =
        error.reason || error.message || "Transaction failed";
      toast({
        title: "Payment Failed",
        description: errorMessage,
        variant: "destructive",
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  };

  // Check connection status on mount
  useEffect(() => {
    if (isMetaMaskInstalled() && window.ethereum.selectedAddress) {
      connectWallet();
    }

    // Listen for account changes
    if (isMetaMaskInstalled()) {
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length === 0) {
          setIsConnected(false);
          setAccount(null);
          setProvider(null);
          setSigner(null);
        } else {
          connectWallet();
        }
      });
    }

    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener("accountsChanged", () => {});
      }
    };
  }, []);

  return {
    isConnected,
    isConnecting,
    account,
    balance,
    connectWallet,
    sendPayment,
    isMetaMaskInstalled,
  };
};

