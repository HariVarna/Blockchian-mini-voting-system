"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/context/WalletContext";
import { api } from "@/lib/api";
import { OtpModal } from "@/components/OtpModal";
import {
  ShieldCheck,
  User,
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Wallet,
  Lock,
} from "lucide-react";

export default function VoterVerifyPage() {
  const { address, isConnected, connectWallet } = useWallet();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isOtpOpen, setIsOtpOpen] = useState(false);
  const [devOtpPreview, setDevOtpPreview] = useState<string | null>(null);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address) {
      setError("Please connect your wallet first.");
      return;
    }
    if (!name.trim() || name.trim().length < 2) {
      setError("Legal name must be at least 2 characters.");
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.requestOtp(email);
      if (res.devOtpPreview) {
        setDevOtpPreview(res.devOtpPreview);
      }
      setIsOtpOpen(true);
    } catch (err: any) {
      setError(err.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (otp: string) => {
    if (!address) return;
    try {
      await api.registerVoter(address, name.trim(), email.trim(), otp);
      const verifiedData = {
        verified: true,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        walletAddress: address.toLowerCase(),
      };
      localStorage.setItem(`voter_verified_${address.toLowerCase()}`, JSON.stringify(verifiedData));
      setSuccess(true);
      setError(null);
      setTimeout(() => {
        router.push("/voter");
      }, 500);
    } catch (err: any) {
      throw err;
    }
  };

  const handleResendOtp = async () => {
    const res = await api.requestOtp(email);
    if (res.devOtpPreview) {
      setDevOtpPreview(res.devOtpPreview);
    }
  };

  return (
    <div className="container max-w-lg mx-auto py-12 px-4 sm:px-6 space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-mono">Verify Identity</h1>
      </div>

      <div className="glass-panel p-6 rounded-xl space-y-4">
        {/* Connected Wallet Header */}
        <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-zinc-400">
            <Wallet className="h-4 w-4 text-white" />
            <span>Wallet:</span>
          </div>
          {isConnected && address ? (
            <span className="text-white font-bold">{address.substring(0, 6)}...{address.substring(address.length - 4)}</span>
          ) : (
            <button onClick={() => connectWallet(true)} className="text-white underline font-semibold">
              Connect Wallet
            </button>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs flex items-center gap-2 font-mono">
            <AlertCircle className="h-4 w-4 shrink-0 text-white" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-xs flex items-center gap-2 font-mono">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-white" />
            <span>Identity verified. Redirecting...</span>
          </div>
        )}

        {devOtpPreview && (
          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs flex items-center justify-between font-mono">
            <span>Dev OTP:</span>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-black border border-zinc-700 text-white font-bold">
              {devOtpPreview}
            </span>
          </div>
        )}

        <form onSubmit={handleRequestOtp} className="space-y-3.5">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-zinc-300">Full Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                required
                placeholder="Full legal name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-black border border-zinc-800 text-white text-xs sm:text-sm focus:border-white focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-zinc-300">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-black border border-zinc-800 text-white text-xs sm:text-sm focus:border-white focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !isConnected}
              className="w-full py-2.5 rounded-lg bg-white hover:bg-zinc-200 text-black font-semibold text-xs sm:text-sm border border-white transition-all flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <Lock className="h-4 w-4" />
              {loading ? "Sending OTP..." : "Send Verification Code"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>

      <OtpModal
        email={email}
        isOpen={isOtpOpen}
        onClose={() => setIsOtpOpen(false)}
        onVerify={handleVerifyOtp}
        onResend={handleResendOtp}
        devOtpPreview={devOtpPreview}
        title="Verify Voter Email OTP"
        subtitle="Enter the 6-digit OTP code sent to your email to verify your voting eligibility."
      />
    </div>
  );
}
