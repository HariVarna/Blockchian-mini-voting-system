"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useWallet } from "@/context/WalletContext";
import { CountdownTimer } from "@/components/CountdownTimer";
import { CandidateCard } from "@/components/CandidateCard";
import { CandidateData } from "@/components/CandidateModal";
import {
  Vote,
  Calendar,
  Layers,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Users,
  Lock,
  Wallet,
} from "lucide-react";

export default function ElectionOverviewPage() {
  const { address, isConnected, connectWallet } = useWallet();
  const [election, setElection] = useState<any>(null);
  const [candidates, setCandidates] = useState<CandidateData[]>([]);
  const [voterStatus, setVoterStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    // 1. Instant check from localStorage
    if (address) {
      try {
        const cached = localStorage.getItem(`voter_verified_${address.toLowerCase()}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.verified) {
            setVoterStatus(parsed);
          }
        }
      } catch {}
    }

    // 2. Fetch fresh state
    async function load() {
      if (!address) {
        try {
          const el = await api.getCurrentElection();
          setElection(el);
          if (el?.candidates) setCandidates(el.candidates);
        } catch {}
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [el, vStatus] = await Promise.all([
          api.getCurrentElection(),
          api.getVoterStatus(address),
        ]);
        setElection(el);
        if (el?.candidates) {
          setCandidates(el.candidates);
        }

        if (vStatus?.verified) {
          localStorage.setItem(`voter_verified_${address.toLowerCase()}`, JSON.stringify(vStatus));
          setVoterStatus(vStatus);
        } else {
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
      } catch (err) {
        console.warn("Error loading election:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [address]);

  if (loading && !election) {
    return (
      <div className="container max-w-5xl mx-auto py-24 px-4 text-center text-zinc-400 font-mono text-xs">
        Loading active election details and candidates...
      </div>
    );
  }

  if (!election) {
    return (
      <div className="container max-w-md mx-auto py-24 px-4 text-center space-y-4">
        <AlertTriangle className="h-10 w-10 text-zinc-400 mx-auto" />
        <h2 className="text-lg font-bold text-white font-mono">No Active Election</h2>
        <p className="text-xs text-zinc-400 font-mono">There are currently no active elections configured in the voting system.</p>
        <Link href="/voter" className="inline-block px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:text-white font-mono">
          Back to Voter Portal
        </Link>
      </div>
    );
  }

  const isVerified = voterStatus?.verified === true;
  const isClosed = election.status === "CLOSED" || election.status === "RESULTS_PUBLISHED";
  const isOpen = election.status === "OPEN";

  return (
    <div className="container max-w-5xl mx-auto py-12 px-4 md:px-8 space-y-8">
      {/* Election Header Card */}
      <div className="glass-panel p-6 sm:p-7 rounded-xl space-y-5 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-700 text-xs font-mono font-bold">
                Election #{election.blockchainElectionId}
              </span>
              <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold uppercase bg-zinc-900 text-zinc-200 border border-zinc-700">
                {election.status}
              </span>
              {isVerified && (
                <span className="text-xs text-zinc-300 font-mono font-semibold flex items-center gap-1 ml-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                  Verified Voter: {voterStatus.name}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-mono">{election.title}</h1>
          </div>

          {/* Countdown Timer */}
          {isOpen && (
            <div className="p-2.5 rounded-lg bg-black border border-zinc-800 self-start sm:self-auto">
              <CountdownTimer endTime={election.endTime} />
            </div>
          )}
        </div>

        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed bg-black/60 p-4 rounded-lg border border-zinc-800 font-sans">
          {election.description}
        </p>

        {/* Election Metadata Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-zinc-800 text-xs font-mono">
          <div className="space-y-1">
            <span className="text-zinc-500 flex items-center gap-1 text-[11px]">
              <Calendar className="h-3.5 w-3.5 text-zinc-400" /> Start Date:
            </span>
            <span className="text-white font-bold">
              {new Date(election.startTime).toLocaleDateString()}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-zinc-500 flex items-center gap-1 text-[11px]">
              <Calendar className="h-3.5 w-3.5 text-zinc-400" /> End Date:
            </span>
            <span className="text-white font-bold">
              {new Date(election.endTime).toLocaleDateString()}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-zinc-500 flex items-center gap-1 text-[11px]">
              <Users className="h-3.5 w-3.5 text-zinc-400" /> Candidates:
            </span>
            <span className="text-white font-bold">{candidates.length} Registered</span>
          </div>

          <div className="space-y-1">
            <span className="text-zinc-500 flex items-center gap-1 text-[11px]">
              <Vote className="h-3.5 w-3.5 text-zinc-400" /> Total Votes:
            </span>
            <span className="text-white font-bold">{election.totalVotesCast || 0} Cast</span>
          </div>
        </div>
      </div>

      {/* Candidates Grid */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white font-mono">Registered Candidates</h2>
            <p className="text-xs text-zinc-400">Review candidates, slogans, and official policy manifestos.</p>
          </div>

          <Link
            href="/voter/vote"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white hover:bg-zinc-200 text-black font-semibold text-xs border border-white transition-all self-start sm:self-auto"
          >
            <Vote className="h-4 w-4 text-black" />
            Proceed to Voting Booth
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {candidates.map((c) => (
            <CandidateCard
              key={c.blockchainCandidateId}
              candidate={c}
              isSelected={selectedId === c.blockchainCandidateId}
              onSelect={(id) => setSelectedId(id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
