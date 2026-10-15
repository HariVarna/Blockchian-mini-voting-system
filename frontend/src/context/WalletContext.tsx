"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { getEthereumProvider, SUPPORTED_NETWORKS, switchOrAddNetwork } from "@/lib/wallet";

interface WalletContextType {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  networkName: string;
  error: string | null;
  connectWallet: (forcePrompt?: any) => Promise<void>;
  switchAccount: () => Promise<void>;
  disconnectWallet: () => void;
  switchNetwork: (targetChainId: number) => Promise<void>;
  getSigner: () => Promise<ethers.JsonRpcSigner | null>;
}

const WalletContext = createContext<WalletContextType>({
  address: null,
  chainId: null,
  isConnected: false,
  isConnecting: false,
  networkName: "Unknown Network",
  error: null,
  connectWallet: async () => {},
  switchAccount: async () => {},
  disconnectWallet: () => {},
  switchNetwork: async () => {},
  getSigner: async () => null,
});

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Session is not auto-restored on refresh; user explicitly connects
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Listen for MetaMask account and chain changes when connected
    if (typeof window !== "undefined" && (window as any).ethereum) {
      const ethereum = (window as any).ethereum;

      // Check for already authorized account on initial page load
      ethereum
        .request({ method: "eth_accounts" })
        .then((accounts: string[]) => {
          if (accounts && accounts.length > 0) {
            setAddress(accounts[0].toLowerCase());
            const provider = new ethers.BrowserProvider(ethereum);
            provider.getNetwork().then((network) => {
              setChainId(Number(network.chainId));
            }).catch(() => {});
          }
        })
        .catch(() => {});

      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setAddress(accounts[0].toLowerCase());
          const provider = new ethers.BrowserProvider(ethereum);
          provider.getNetwork().then((network) => {
            setChainId(Number(network.chainId));
          }).catch(() => {});
        } else {
          setAddress(null);
        }
      };

      const handleChainChanged = (_chainIdHex: string) => {
        window.location.reload();
      };

      ethereum.on("accountsChanged", handleAccountsChanged);
      ethereum.on("chainChanged", handleChainChanged);

      return () => {
        if (ethereum.removeListener) {
          ethereum.removeListener("accountsChanged", handleAccountsChanged);
          ethereum.removeListener("chainChanged", handleChainChanged);
        }
      };
    }
  }, []);

  const connectWallet = async (promptArg?: any) => {
    const forcePrompt = typeof promptArg === "boolean" ? promptArg : true;
    setError(null);
    setIsConnecting(true);
    try {
      if (typeof window === "undefined" || !(window as any).ethereum) {
        throw new Error("MetaMask not found! Please install the MetaMask extension to continue.");
      }

      const ethereum = (window as any).ethereum;
      let accounts: string[] = [];

      if (forcePrompt) {
        try {
          // Request wallet account permissions to force MetaMask account selection dialog
          await ethereum.request({
            method: "wallet_requestPermissions",
            params: [{ eth_accounts: {} }],
          });
          accounts = (await ethereum.request({ method: "eth_accounts" })) || [];
        } catch (permErr: any) {
          if (permErr.code === 4001) {
            throw permErr;
          }
          // Fallback to eth_requestAccounts if wallet_requestPermissions is not supported by provider
          accounts = (await ethereum.request({ method: "eth_requestAccounts" })) || [];
        }
      } else {
        accounts = (await ethereum.request({ method: "eth_requestAccounts" })) || [];
      }

      if (accounts.length > 0) {
        setAddress(accounts[0].toLowerCase());
        const provider = new ethers.BrowserProvider(ethereum);
        const network = await provider.getNetwork();
        const currentChain = Number(network.chainId);
        setChainId(currentChain);

        // If connected to Mainnet (1) or unknown, switch to Sepolia (11155111)
        if (currentChain !== 11155111 && currentChain !== 31337) {
          try {
            await switchOrAddNetwork(11155111);
            setChainId(11155111);
          } catch (netErr) {
            console.warn("Could not auto-switch to Sepolia:", netErr);
          }
        }
      }
    } catch (err: any) {
      console.error("Connect wallet error:", err);
      if (err.code === 4001) {
        setError("Connection request cancelled or rejected in MetaMask.");
      } else {
        setError(err.message || "Failed to connect wallet.");
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const switchAccount = async () => {
    await connectWallet(true);
  };

  const disconnectWallet = () => {
    setAddress(null);
    setChainId(null);
    setError(null);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("last_vote_receipt");
    }
  };

  const switchNetwork = async (targetChainId: number) => {
    try {
      await switchOrAddNetwork(targetChainId);
      setChainId(targetChainId);
    } catch (err: any) {
      setError(err.message || "Failed to switch network.");
    }
  };

  const getSigner = async (): Promise<ethers.JsonRpcSigner | null> => {
    const provider = await getEthereumProvider();
    if (!provider) return null;
    return await provider.getSigner();
  };

  const networkName = chainId && SUPPORTED_NETWORKS[chainId] ? SUPPORTED_NETWORKS[chainId].name : (chainId ? `Chain ID ${chainId}` : "Not Connected");

  return (
    <WalletContext.Provider
      value={{
        address,
        chainId,
        isConnected: Boolean(address),
        isConnecting,
        networkName,
        error,
        connectWallet,
        switchAccount,
        disconnectWallet,
        switchNetwork,
        getSigner,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
