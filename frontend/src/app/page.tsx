"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useWallet } from "@/context/WalletContext";
import { api } from "@/lib/api";
import {
  Vote,
  Shield,
  Lock,
  Cpu,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Fingerprint,
  FileCheck2,
  Activity,
} from "lucide-react";

export default function LandingPage() {
  const { isConnected, connectWallet } = useWallet();
  const [election, setElection] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getCurrentElection();
        setElection(data);
      } catch (err) {
        console.warn("No active election found yet:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] py-16 px-4 md:px-8">
      <section className="max-w-3xl mx-auto text-center space-y-8">
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white font-mono">
          VoteSphere
        </h1>

        {/* Live Election Status */}
        {election ? (
          <div className="inline-flex items-center gap-3 p-3 px-5 rounded-lg bg-zinc-950 border border-zinc-800">
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
            <div className="text-left text-xs font-mono">
              <span className="text-zinc-500">Election:</span>{" "}
              <span className="font-bold text-white">{election.title}</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-700 font-bold uppercase">
              {election.status}
            </span>
          </div>
        ) : (
          <p className="text-xs text-zinc-500 font-mono">Decentralized Voting System</p>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/voter"
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-white text-black hover:bg-zinc-200 font-semibold text-xs sm:text-sm border border-white transition-all"
          >
            <Vote className="h-4 w-4 text-black" />
            Voter Portal
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>

          <Link
            href="/voter/election"
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-zinc-950 hover:bg-zinc-900 text-zinc-200 border border-zinc-800 text-xs sm:text-sm font-semibold transition-all font-mono"
          >
            <Activity className="h-4 w-4 text-white" />
            Active Election
          </Link>

          <Link
            href="/admin/login"
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 text-xs sm:text-sm font-semibold transition-all font-mono"
          >
            <Shield className="h-4 w-4 text-zinc-400" />
            Admin Portal
          </Link>
        </div>
      </section>
    </div>
  );
}
