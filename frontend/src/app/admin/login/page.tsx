"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/context/WalletContext";
import { api } from "@/lib/api";
import { shortenAddress } from "@/lib/utils";
import {
  Shield,
  Wallet,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";

export default function AdminLoginPage() {
  const { address, isConnected, connectWallet, networkName } = useWallet();
  const router = useRouter();

  const [adminKey, setAdminKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address) {
      setError("Please connect your authorized admin wallet first.");
      return;
    }
    if (!adminKey.trim()) {
      setError("Admin security passcode is required.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.verifyAdminKey(adminKey.trim(), address);
      // Clear key from memory on transition; do not save key permanently in storage
      setAdminKey("");
      router.push("/admin/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid Admin Security Passcode.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-md mx-auto py-16 px-4 md:px-8 space-y-6 animate-in fade-in">
      <div className="text-center space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-mono">Admin Portal</h1>
      </div>

      <div className="glass-panel p-6 rounded-xl space-y-4">
        {/* Admin Wallet Status */}
        <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1 text-xs font-mono">
          <div className="text-zinc-500 text-[11px]">Admin Wallet:</div>
          {isConnected && address ? (
            <div className="space-y-0.5">
              <div className="text-white font-bold">{address}</div>
              <div className="text-[11px] text-zinc-400 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-white" />
                Connected ({networkName})
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => connectWallet(true)}
              className="w-full py-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors mt-1"
            >
              <Wallet className="h-3.5 w-3.5 text-white" />
              Connect Admin Wallet
            </button>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs flex items-center gap-2 font-mono">
            <AlertCircle className="h-4 w-4 shrink-0 text-white" />
            <span>{error}</span>
          </div>
        )}

        {/* Passcode Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-zinc-300 font-mono">
              Admin Passcode
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <input
                type={showKey ? "text" : "password"}
                required
                placeholder="Passcode"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                className="w-full pl-9 pr-9 py-2 rounded-lg bg-black border border-zinc-800 text-white text-xs sm:text-sm focus:border-white focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-white"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !isConnected}
            className="w-full py-2.5 rounded-lg bg-white hover:bg-zinc-200 text-black font-bold text-xs sm:text-sm border border-white transition-all flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4 text-black" />
            )}
            {loading ? "Verifying..." : "Enter Portal"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
