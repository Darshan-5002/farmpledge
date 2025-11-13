import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { toast } from "sonner";

interface Web3State {
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  account: string | null;
  chainId: number | null;
  isConnected: boolean;
  isLoading: boolean;
  balance: string;
}

export const useWeb3 = () => {
  const [state, setState] = useState<Web3State>({
    provider: null,
    signer: null,
    account: null,
    chainId: null,
    isConnected: false,
    isLoading: false,
    balance: "0",
  });

  // Check if MetaMask is installed
  const isMetaMaskInstalled = () => {
    return typeof window !== "undefined" && typeof window.ethereum !== "undefined";
  };

  // Connect wallet
  const connectWallet = useCallback(async () => {
    if (!isMetaMaskInstalled()) {
      toast.error("MetaMask is not installed. Please install MetaMask to continue.");
      window.open("https://metamask.io/download/", "_blank");
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const account = await signer.getAddress();
      const network = await provider.getNetwork();
      const balance = await provider.getBalance(account);

      setState({
        provider,
        signer,
        account,
        chainId: Number(network.chainId),
        isConnected: true,
        isLoading: false,
        balance: ethers.formatEther(balance),
      });

      toast.success("Wallet connected successfully!");
    } catch (error: any) {
      console.error("Error connecting wallet:", error);
      toast.error(error.message || "Failed to connect wallet");
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setState({
      provider: null,
      signer: null,
      account: null,
      chainId: null,
      isConnected: false,
      isLoading: false,
      balance: "0",
    });
    toast.info("Wallet disconnected");
  }, []);

  // Send payment
  const sendPayment = useCallback(
    async (to: string, amount: string, currency: "ETH" | "MATIC" = "ETH") => {
      if (!state.signer || !state.isConnected) {
        toast.error("Please connect your wallet first");
        return { success: false, txHash: null };
      }

      try {
        setState((prev) => ({ ...prev, isLoading: true }));
        const tx = await state.signer.sendTransaction({
          to,
          value: ethers.parseEther(amount),
        });

        toast.info("Transaction pending...", {
          description: `Transaction hash: ${tx.hash}`,
        });

        const receipt = await tx.wait();

        setState((prev) => ({ ...prev, isLoading: false }));
        
        if (receipt) {
          toast.success("Payment successful!", {
            description: `Transaction confirmed: ${receipt.hash}`,
          });
          
          // Refresh balance
          if (state.provider && state.account) {
            const balance = await state.provider.getBalance(state.account);
            setState((prev) => ({
              ...prev,
              balance: ethers.formatEther(balance),
            }));
          }

          return { success: true, txHash: receipt.hash };
        }

        return { success: false, txHash: null };
      } catch (error: any) {
        console.error("Error sending payment:", error);
        setState((prev) => ({ ...prev, isLoading: false }));
        
        if (error.code === 4001) {
          toast.error("Transaction rejected by user");
        } else if (error.code === "INSUFFICIENT_FUNDS") {
          toast.error("Insufficient funds for this transaction");
        } else {
          toast.error(error.message || "Payment failed");
        }

        return { success: false, txHash: null };
      }
    },
    [state.signer, state.isConnected, state.provider, state.account]
  );

  // Check connection on mount and listen for changes
  useEffect(() => {
    if (!isMetaMaskInstalled()) return;

    const checkConnection = async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();

        if (accounts.length > 0) {
          const signer = await provider.getSigner();
          const account = await signer.getAddress();
          const network = await provider.getNetwork();
          const balance = await provider.getBalance(account);

          setState({
            provider,
            signer,
            account,
            chainId: Number(network.chainId),
            isConnected: true,
            isLoading: false,
            balance: ethers.formatEther(balance),
          });
        }
      } catch (error) {
        console.error("Error checking connection:", error);
      }
    };

    checkConnection();

    // Listen for account changes
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        checkConnection();
      }
    };

    // Listen for chain changes
    const handleChainChanged = () => {
      checkConnection();
    };

    window.ethereum?.on("accountsChanged", handleAccountsChanged);
    window.ethereum?.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener("chainChanged", handleChainChanged);
    };
  }, [disconnectWallet]);

  return {
    ...state,
    connectWallet,
    disconnectWallet,
    sendPayment,
    isMetaMaskInstalled: isMetaMaskInstalled(),
  };
};

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      send: (method: string, params?: any[]) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
    };
  }
}

