import { ethers } from "ethers";

// Default Network Chain IDs
export const LOCAL_CHAIN_ID = 31337;
export const SEPOLIA_CHAIN_ID = 11155111;
export const POLYGON_AMOY_CHAIN_ID = 80002;

export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export const SUPPORTED_NETWORKS: Record<number, NetworkConfig> = {
  11155111: {
    chainId: 11155111,
    name: "Sepolia Testnet",
    rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
    explorerUrl: "https://sepolia.etherscan.io",
    nativeCurrency: {
      name: "SepoliaETH",
      symbol: "SepoliaETH",
      decimals: 18,
    },
  },
  31337: {
    chainId: 31337,
    name: "Hardhat Localhost",
    rpcUrl: "http://127.0.0.1:8545",
    explorerUrl: "http://localhost:8545",
    nativeCurrency: {
      name: "ETH",
      symbol: "ETH",
      decimals: 18,
    },
  },
  80002: {
    chainId: 80002,
    name: "Polygon Amoy",
    rpcUrl: "https://rpc-amoy.polygon.technology",
    explorerUrl: "https://amoy.polygonscan.com",
    nativeCurrency: {
      name: "MATIC",
      symbol: "MATIC",
      decimals: 18,
    },
  },
};

export async function getEthereumProvider(): Promise<ethers.BrowserProvider | null> {
  if (typeof window !== "undefined" && (window as any).ethereum) {
    return new ethers.BrowserProvider((window as any).ethereum);
  }
  return null;
}

export async function switchOrAddNetwork(targetChainId: number = 11155111): Promise<boolean> {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    throw new Error("MetaMask is not installed. Please install MetaMask to proceed.");
  }

  const ethereum = (window as any).ethereum;
  const hexChainId = "0x" + targetChainId.toString(16);
  const net = SUPPORTED_NETWORKS[targetChainId] || SUPPORTED_NETWORKS[11155111];

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hexChainId }],
    });
    return true;
  } catch (switchError: any) {
    // 4902 = Unrecognized chain, try adding it
    if (switchError.code === 4902 || switchError.code === -32603 || switchError.data?.originalError?.code === 4902) {
      try {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: hexChainId,
              chainName: net.name,
              rpcUrls: [net.rpcUrl],
              blockExplorerUrls: [net.explorerUrl],
              nativeCurrency: net.nativeCurrency,
            },
          ],
        });
        return true;
      } catch (addError: any) {
        if (addError.code === 4001) {
          throw new Error("Network addition rejected in MetaMask.");
        }
        throw new Error(`Failed to add ${net.name} to MetaMask.`);
      }
    }
    if (switchError.code === 4001) {
      throw new Error("Network switch cancelled in MetaMask.");
    }
    throw switchError;
  }
}
