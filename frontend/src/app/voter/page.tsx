"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "@/context/WalletContext";
import { api } from "@/lib/api";
import { OtpModal } from "@/components/OtpModal";
import {
  Wallet,
  ShieldCheck,
  Vote,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Mail,
  User,
  UserCheck,
  Clock,
  LogOut,
  Calendar,
  Layers,
  Users,
  AlertCircle,
} from "lucide-react";

export default function VoterHubPage() {
  const { address, isConnected, connectWallet, switchAccount, disconnectWallet, networkName } = useWallet();
  const router = useRouter();

  const [voterStatus, setVoterStatus] = useState<any>(null);
  const [ballotStatus, setBallotStatus] = useState<any>(null);
  const [election, setElection] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Verification Form State
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [isOtpOpen, setIsOtpOpen] = useState(false);
  const [devOtpPreview, setDevOtpPreview] = useState<string | null>(null);

  async function checkState() {
    if (!address) {
      setVoterStatus(null);
      setBallotStatus(null);
      return;
    }

    // Check localStorage cache first for instant UI response
    try {
      const cached = localStorage.getItem(`voter_verified_${address.toLowerCase()}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.verified) {
          setVoterStatus(parsed);
        }
      }
    } catch {}

    setLoading(true);
    try {
      const [vStatus, bStatus, el] = await Promise.all([
        api.getVoterStatus(address),
        api.getBallotStatus(address),
        api.getCurrentElection(),
      ]);

      if (vStatus?.verified) {
        localStorage.setItem(`voter_verified_${address.toLowerCase()}`, JSON.stringify(vStatus));
        setVoterStatus(vStatus);
      } else {
        // Check if previously verified in localStorage
        const cached = localStorage.getItem(`voter_verified_${address.toLowerCase()}`);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed?.verified) setVoterStatus(parsed);
            else setVoterStatus(vStatus);
          } catch {
            setVoterStatus(vStatus);
          }
        } else {
          setVoterStatus(vStatus);
        }
      }

      setBallotStatus(bStatus);
      setElection(el);
    } catch (err) {
      console.warn("Status check error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkState();
  }, [address]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address) {
      setVerifyError("Please connect your wallet first.");
      return;
    }
    if (!name.trim() || name.trim().length < 2) {
      setVerifyError("Legal name must be at least 2 characters.");
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setVerifyError("Please enter a valid email address.");
      return;
    }

    setVerifyLoading(true);
    setVerifyError(null);
    try {
      const res = await api.requestOtp(email);
      if (res.devOtpPreview) {
        setDevOtpPreview(res.devOtpPreview);
      }
      setIsOtpOpen(true);
    } catch (err: any) {
      setVerifyError(err.message || "Failed to send OTP.");
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleVerifyOtp = async (otp: string) => {
    if (!address) return;
    try {
      const res = await api.registerVoter(address, name.trim(), email.trim(), otp);
      const verifiedData = {
        verified: true,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        walletAddress: address.toLowerCase(),
      };
      // Immediately save in localStorage & state
      localStorage.setItem(`voter_verified_${address.toLowerCase()}`, JSON.stringify(verifiedData));
      setVoterStatus(verifiedData);
      setIsOtpOpen(false);
      setShowVerifyModal(false);
      // Refresh blockchain & ballot state in background
      checkState();
    } catch (err: any) {
      throw err;
    }
  };

  const isVerified = voterStatus?.verified === true;

  return (
    <div className="container max-w-4xl mx-auto py-12 px-4 md:px-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-mono">Voter Portal</h1>
        <p className="text-xs text-zinc-400 font-mono">
          Connect your Web3 wallet, verify your identity via OTP, and access active elections.
        </p>
      </div>

      {/* Step 1: Wallet Connection Card */}
      <div className="glass-panel p-6 rounded-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
              <Wallet className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-bold text-white text-sm font-mono">1. Wallet Connection</h2>
            </div>
          </div>

          <div>
            {isConnected ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-zinc-900 text-zinc-200 border border-zinc-700 text-xs font-mono">
                <CheckCircle2 className="h-3 w-3 text-white" />
                Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-zinc-950 text-zinc-500 border border-zinc-800 text-xs font-mono">
                Not Connected
              </span>
            )}
          </div>
        </div>

        {isConnected && address ? (
          <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-mono">
            <div className="space-y-0.5">
              <div className="text-zinc-500 text-[11px]">Address:</div>
              <div className="text-white font-bold">{address}</div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className="text-zinc-400 sm:text-right text-[11px] mr-2">
                <span className="text-zinc-500">Network: </span>
                <span className="text-white font-bold">{networkName}</span>
              </div>
              <button
                onClick={() => switchAccount()}
                className="px-3 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs transition-colors"
              >
                Switch Wallet
              </button>
              <button
                onClick={disconnectWallet}
                className="px-3 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white text-xs flex items-center gap-1.5 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => connectWallet(true)}
            className="w-full py-2.5 rounded-lg bg-white hover:bg-zinc-200 text-black font-semibold text-xs sm:text-sm border border-white transition-all flex items-center justify-center gap-2"
          >
            <Wallet className="h-4 w-4" />
            Connect Wallet
          </button>
        )}
      </div>

      {/* Step 2: Voter Identity Verification Card */}
      {isConnected && (
        <div className="glass-panel p-6 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-bold text-white text-sm font-mono">2. Identity Verification</h2>
              </div>
            </div>

            <div>
              {isVerified ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-zinc-900 text-zinc-200 border border-zinc-700 text-xs font-mono">
                  <CheckCircle2 className="h-3 w-3 text-white" />
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-zinc-950 text-zinc-400 border border-zinc-800 text-xs font-mono">
                  Pending Verification
                </span>
              )}
            </div>
          </div>

          {isVerified ? (
            <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
              <div className="space-y-0.5">
                <div className="text-zinc-500 text-[11px]">Verified Legal Name:</div>
                <div className="text-white font-bold text-sm flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                  {voterStatus.name}
                </div>
              </div>
              <div className="space-y-0.5 sm:text-right">
                <div className="text-zinc-500 text-[11px]">Registered Email:</div>
                <div className="text-zinc-300">{voterStatus.email}</div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-zinc-400 font-mono">
                Verify your legal name and email with a one-time OTP to be marked as verified and unlock active elections.
              </p>

              {!showVerifyModal ? (
                <button
                  type="button"
                  onClick={() => setShowVerifyModal(true)}
                  className="w-full py-2.5 rounded-lg bg-white hover:bg-zinc-200 text-black font-semibold text-xs sm:text-sm border border-white transition-all flex items-center justify-center gap-2"
                >
                  <Lock className="h-4 w-4" />
                  Verify Identity with OTP
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <form onSubmit={handleRequestOtp} className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-3">
                  {verifyError && (
                    <div className="p-2.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs flex items-center gap-2 font-mono">
                      <AlertCircle className="h-4 w-4 text-white shrink-0" />
                      <span>{verifyError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-zinc-300">Full Legal Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                        <input
                          type="text"
                          required
                          placeholder="e.g. Alice Voter"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 rounded-lg bg-black border border-zinc-800 text-white text-xs focus:border-white focus:outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-zinc-300">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                        <input
                          type="email"
                          required
                          placeholder="alice@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 rounded-lg bg-black border border-zinc-800 text-white text-xs focus:border-white focus:outline-none font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowVerifyModal(false)}
                      className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={verifyLoading}
                      className="px-4 py-2 rounded-lg bg-white hover:bg-zinc-200 text-black font-semibold text-xs border border-white flex items-center gap-1.5 disabled:opacity-40"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      {verifyLoading ? "Sending OTP..." : "Send Verification Code"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Active Elections Card (Unlocked Only After Identity Verification) */}
      {isConnected && (
        <div className={`glass-panel p-6 rounded-xl space-y-4 transition-all ${!isVerified ? "opacity-60" : ""}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
                <Vote className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-bold text-white text-sm font-mono">3. Active Elections</h2>
              </div>
            </div>

            <div>
              {!isVerified ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-zinc-950 text-zinc-500 border border-zinc-800 text-xs font-mono">
                  <Lock className="h-3 w-3" />
                  Locked
                </span>
              ) : ballotStatus?.hasVoted ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-zinc-900 text-zinc-200 border border-zinc-700 text-xs font-mono">
                  <CheckCircle2 className="h-3 w-3 text-white" />
                  Vote Recorded
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-zinc-900 text-white border border-zinc-700 text-xs font-mono">
                  Eligible to Vote
                </span>
              )}
            </div>
          </div>

          {!isVerified ? (
            <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 text-center space-y-2 text-xs font-mono text-zinc-400">
              <Lock className="h-5 w-5 text-zinc-500 mx-auto" />
              <div>Complete Step 2 (Identity Verification) above to unlock active elections and cast your vote.</div>
            </div>
          ) : ballotStatus?.hasVoted ? (
            <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-3 text-xs font-mono">
              <div className="flex items-center justify-between">
                <div className="text-white font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                  Your Vote is Confirmed On-Chain
                </div>
                <span className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-700 text-[11px] font-bold">
                  {election?.title || "Active Election"}
                </span>
              </div>
              <div className="text-zinc-400 truncate">
                Tx Hash: <span className="text-white">{ballotStatus.ballot?.txHash || "Mined & Confirmed"}</span>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <Link
                  href="/voter/success"
                  className="inline-flex items-center gap-1.5 text-zinc-300 hover:text-white underline"
                >
                  View Voting Receipt
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <span className="text-zinc-600">•</span>
                <Link
                  href="/voter/election"
                  className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white underline"
                >
                  View Election Candidates
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {election ? (
                <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-3 text-xs font-mono">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="text-zinc-500 text-[11px]">Election:</div>
                      <div className="text-white font-bold text-sm mt-0.5">{election.title}</div>
                    </div>
                    <span className="self-start sm:self-auto px-2 py-0.5 rounded bg-zinc-900 text-zinc-200 border border-zinc-700 font-bold uppercase text-[11px]">
                      {election.status}
                    </span>
                  </div>

                  <p className="text-zinc-400 font-sans text-xs line-clamp-2">
                    {election.description}
                  </p>

                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                    <Link
                      href="/voter/election"
                      className="w-full sm:w-1/2 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white font-semibold text-xs border border-zinc-700 transition-all flex items-center justify-center gap-2"
                    >
                      <Users className="h-3.5 w-3.5" />
                      View Active Election
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>

                    <Link
                      href="/voter/vote"
                      className="w-full sm:w-1/2 py-2.5 rounded-lg bg-white hover:bg-zinc-200 text-black font-semibold text-xs border border-white transition-all flex items-center justify-center gap-2"
                    >
                      <Vote className="h-3.5 w-3.5 text-black" />
                      Proceed to Voting Booth
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 text-xs font-mono text-center">
                  No active election currently found.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Verification OTP Modal */}
      <OtpModal
        email={email}
        isOpen={isOtpOpen}
        onClose={() => setIsOtpOpen(false)}
        onVerify={handleVerifyOtp}
        onResend={async () => {
          const res = await api.requestOtp(email);
          if (res.devOtpPreview) setDevOtpPreview(res.devOtpPreview);
        }}
        devOtpPreview={devOtpPreview}
        title="Verify Voter Email OTP"
        subtitle="Enter the 6-digit verification code sent to your email to verify your voting eligibility."
      />
    </div>
  );
}
