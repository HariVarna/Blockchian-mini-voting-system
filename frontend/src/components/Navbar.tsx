"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useWallet } from "@/context/WalletContext";
import { shortenAddress } from "@/lib/utils";
import { Vote, Shield, Wallet, CheckCircle2, LogOut, ArrowLeftRight } from "lucide-react";

export const Navbar: React.FC = () => {
  const { address, isConnected, isConnecting, connectWallet, switchAccount, disconnectWallet, networkName, chainId } = useWallet();
  const pathname = usePathname();
  const router = useRouter();

  const isHardhat = chainId === 31337;

  const handleLogout = () => {
    disconnectWallet();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-black">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-700 p-0.5 group-hover:border-zinc-500 transition-colors">
            <Vote className="h-4 w-4 text-white" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5 font-mono">
              VoteSphere <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-300 border border-zinc-700">dApp</span>
            </span>
            <p className="text-[10px] text-zinc-500 font-mono">Decentralized Voting</p>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            href="/voter"
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              pathname.startsWith("/voter")
                ? "bg-zinc-900 text-white border border-zinc-700"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
            }`}
          >
            Voter Portal
          </Link>
          <Link
            href="/voter/election"
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              pathname === "/voter/election"
                ? "bg-zinc-900 text-white border border-zinc-700"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
            }`}
          >
            Active Election
          </Link>
          <Link
            href="/admin/login"
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
              pathname.startsWith("/admin")
                ? "bg-zinc-900 text-white border border-zinc-700"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
            }`}
          >
            <Shield className="h-3.5 w-3.5 text-zinc-300" />
            Admin Portal
          </Link>
        </nav>

        {/* Network & Wallet Controls */}
        <div className="flex items-center gap-2.5">
          {isConnected && (
            chainId === 11155111 ? (
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-300 font-mono">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Sepolia Testnet</span>
              </div>
            ) : chainId === 31337 ? (
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-300 font-mono">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                <span>Hardhat Localhost</span>
              </div>
            ) : (
              <button
                onClick={() => switchOrAddNetwork(11155111)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-600 text-amber-300 text-xs font-mono font-bold transition-colors"
                title="Click to Switch to Sepolia Testnet in MetaMask"
              >
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                <span>Switch to Sepolia</span>
              </button>
            )
          )}

          {isConnected && address ? (
            <div className="flex items-center gap-2">
              <div
                onClick={() => switchAccount()}
                title="Click to Switch Wallet Account in MetaMask"
                className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-600 text-xs font-mono text-white cursor-pointer transition-colors"
              >
                <div className="h-5 w-5 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[9px] font-bold text-zinc-300">
                  0x
                </div>
                <span>{shortenAddress(address)}</span>
                <CheckCircle2 className="h-3 w-3 text-white ml-0.5" />
              </div>

              <button
                onClick={() => switchAccount()}
                title="Switch MetaMask Account"
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-white transition-colors"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={handleLogout}
                title="Disconnect Wallet & Logout"
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-white transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => connectWallet(true)}
              disabled={isConnecting}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-semibold border border-white transition-all disabled:opacity-50"
            >
              <Wallet className="h-3.5 w-3.5" />
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
