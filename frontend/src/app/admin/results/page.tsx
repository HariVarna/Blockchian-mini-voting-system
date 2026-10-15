"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ethers } from "ethers";
import { api } from "@/lib/api";
import { useWallet } from "@/context/WalletContext";
import {
  FileCheck2,
  Trophy,
  AlertTriangle,
  AlertCircle,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Lock,
  ExternalLink,
  Users,
  Vote,
  Scale,
} from "lucide-react";

export default function AdminResultsPage() {
  const { address, isConnected, getSigner, networkName } = useWallet();
  const [election, setElection] = useState<any>(null);
  const [tallyData, setTallyData] = useState<any>(null);
  const [existingResults, setExistingResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tallying, setTallying] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const el = await api.getCurrentElection();
      setElection(el);
      if (el?.id) {
        const res = await api.getResults(el.id).catch(() => null);
        setExistingResults(res);
      }
    } catch (err) {
      console.warn("Results load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Tally Ballots off-chain
  const handleTally = async () => {
    if (!election?.id) return;
    setTallying(true);
    setError(null);
    try {
      const data = await api.tallyResults(election.id);
      setTallyData(data);
      setSuccess("Ballots decrypted and tallied successfully! Ready to commit on-chain.");
    } catch (err: any) {
      setError(err.message || "Failed to tally ballots.");
    } finally {
      setTallying(false);
    }
  };

  // Publish to Blockchain
  const handlePublishOnChain = async () => {
    if (!election?.id || !tallyData) return;
    setPublishing(true);
    setError(null);

    try {
      const signer = await getSigner();
      if (!signer) throw new Error("Wallet signer required.");

      // Load contract info
      const deploymentsRes = await fetch("/contracts/deployments.json").catch(() => null);
      let votingContractAddress = process.env.NEXT_PUBLIC_VOTING_CONTRACT_ADDRESS;

      if (deploymentsRes && deploymentsRes.ok) {
        const depJson = await deploymentsRes.json();
        votingContractAddress = votingContractAddress || depJson.votingSystemAddress;
      }

      if (!votingContractAddress) {
        votingContractAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
      }

      const votingAbi = [
        "function publishResults(uint256 electionId, bytes32 resultHash, uint256 winnerCandidateId, bool isTie, uint256 totalVotes) external",
        "function closeElection(uint256 electionId) external",
        "function getElectionState(uint256 electionId) external view returns (uint8)",
      ];

      const votingContract = new ethers.Contract(votingContractAddress, votingAbi, signer);

      // Close election on-chain if not already closed
      try {
        const state = await votingContract.getElectionState(election.blockchainElectionId);
        if (Number(state) === 2) { // OPEN
          const closeTx = await votingContract.closeElection(election.blockchainElectionId);
          await closeTx.wait(1);
        }
      } catch (closeErr) {
        console.warn("Close check:", closeErr);
      }

      const tx = await votingContract.publishResults(
        election.blockchainElectionId,
        tallyData.resultHash,
        tallyData.winnerCandidateId || 0,
        tallyData.isTie,
        tallyData.totalVotes
      );

      const receipt = await tx.wait(1);

      // Save to backend database
      await api.publishResults({
        electionId: election.id,
        resultHash: tallyData.resultHash,
        winnerCandidateId: tallyData.winnerCandidateId || 0,
        isTie: tallyData.isTie,
        totalVotes: tallyData.totalVotes,
        candidateCounts: tallyData.candidateCounts,
        txHash: tx.hash,
      });

      setSuccess(`Results permanently published on-chain! Tx: ${tx.hash}`);
      loadData();
    } catch (err: any) {
      console.error("Publishing results error:", err);
      setError(err.message || "Failed to publish results on-chain.");
    } finally {
      setPublishing(false);
    }
  };

  const currentDisplay = existingResults || tallyData;

  return (
    <div className="container max-w-5xl mx-auto py-10 px-4 md:px-8 space-y-8 animate-in fade-in">
      <Link
        href="/admin/dashboard"
        className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors font-mono"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Dashboard
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-700 text-xs font-mono font-bold">
              Results & Audit
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 font-mono">Election Tally & Results</h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleTally}
            disabled={tallying}
            className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-40"
          >
            {tallying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scale className="h-4 w-4" />}
            {existingResults ? "Re-Tally Ballots" : "Initiate Ballot Tally"}
          </button>

          {tallyData && !existingResults?.publishedOnChain && (
            <button
              onClick={handlePublishOnChain}
              disabled={publishing}
              className="px-5 py-2 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-bold flex items-center gap-2 border border-white transition-all disabled:opacity-40"
            >
              {publishing ? <Loader2 className="h-4 w-4 animate-spin text-black" /> : <FileCheck2 className="h-4 w-4 text-black" />}
              Publish On-Chain
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs flex items-center gap-2 font-mono">
          <AlertCircle className="h-4 w-4 shrink-0 text-white" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-xs flex items-center gap-2 font-mono">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-white" />
          <span>{success}</span>
        </div>
      )}

      {/* Winner / Tie Banner */}
      {currentDisplay && (
        <div className="glass-panel p-6 sm:p-7 rounded-xl space-y-6">
          {currentDisplay.isTie ? (
            <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 text-white">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-white font-mono">Election Result: DETERMINISTIC TIE</h3>
                <p className="text-xs text-zinc-400">
                  Multiple candidates received the same top vote count. A run-off or designated admin resolution is required per governance policy.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 text-white">
                <Trophy className="h-5 w-5 text-white" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-white font-mono">
                  Election Winner: Candidate #{currentDisplay.winnerCandidateId}
                </h3>
                <p className="text-xs text-zinc-400">
                  Candidate #{currentDisplay.winnerCandidateId} received the highest verified democratic vote count.
                </p>
              </div>
            </div>
          )}

          {/* On-Chain Result Hash */}
          <div className="p-4 rounded-lg bg-black border border-zinc-800 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="font-sans font-semibold">Cryptographic Result Hash (Keccak-256):</span>
              {currentDisplay.publishedOnChain && (
                <span className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-200 border border-zinc-700 font-bold uppercase text-[10px]">
                  Published On-Chain
                </span>
              )}
            </div>
            <div className="text-white font-bold break-all">
              {currentDisplay.resultHash}
            </div>
            {currentDisplay.txHash && (
              <div className="text-zinc-500 pt-1">
                Tx: <span className="text-zinc-300">{currentDisplay.txHash}</span>
              </div>
            )}
          </div>

          {/* Candidate Breakdown & Progress Bars */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono">Candidate Vote Breakdown</h3>

            <div className="space-y-3">
              {currentDisplay.candidates?.map((c: any) => {
                const isWinner = !currentDisplay.isTie && c.candidateId === currentDisplay.winnerCandidateId;

                return (
                  <div key={c.candidateId} className="p-4 rounded-lg bg-black border border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={c.imageUrl}
                          alt={c.name}
                          className="h-10 w-10 rounded-lg object-cover grayscale border border-zinc-800"
                        />
                        <div>
                          <div className="font-bold text-white text-sm flex items-center gap-2 font-mono">
                            {c.name}
                            {isWinner && (
                              <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-white border border-zinc-700 text-[10px] uppercase font-bold">
                                Winner
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-zinc-500">{c.party}</div>
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <div className="text-sm font-bold text-white">{c.votes} votes</div>
                        <div className="text-xs text-zinc-500">{c.percentage}%</div>
                      </div>
                    </div>

                    {/* Visual bar */}
                    <div className="w-full h-2 rounded-full bg-zinc-950 overflow-hidden border border-zinc-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isWinner ? "bg-white" : "bg-zinc-600"
                        }`}
                        style={{ width: `${Math.max(c.percentage, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
