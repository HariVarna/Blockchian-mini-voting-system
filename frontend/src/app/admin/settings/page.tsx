"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ethers } from "ethers";
import { useWallet } from "@/context/WalletContext";
import { api } from "@/lib/api";
import { SUPPORTED_NETWORKS } from "@/lib/wallet";
import {
  Settings,
  AlertTriangle,
  ArrowLeft,
  Pause,
  Play,
  Shield,
  Layers,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Cpu,
  Loader2,
  Square,
  Trash2,
} from "lucide-react";

export default function AdminSettingsPage() {
  const { chainId, switchNetwork, networkName, isConnected, getSigner } = useWallet();
  const [election, setElection] = useState<any>(null);
  const [deployments, setDeployments] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modals
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadSettingsData = async () => {
    const el = await api.getCurrentElection().catch(() => null);
    setElection(el);
    const dep = await fetch("/contracts/deployments.json")
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    setDeployments(dep);
  };

  useEffect(() => {
    loadSettingsData();
  }, []);

  const handleToggleEmergencyPause = async () => {
    if (!election?.id) return;
    setLoading(true);
    setError(null);

    const isCurrentlyPaused = election.status === "PAUSED";
    const nextStatus = isCurrentlyPaused ? "OPEN" : "PAUSED";

    try {
      // 1. Update in backend database
      await fetch(`http://localhost:5001/api/election/${election.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      // 2. Call contract pause/resume if signer available
      const signer = await getSigner();
      if (signer && deployments?.votingSystemAddress) {
        const votingAbi = [
          "function emergencyPause(uint256 electionId) external",
          "function resume(uint256 electionId) external",
        ];
        const contract = new ethers.Contract(deployments.votingSystemAddress, votingAbi, signer);
        if (isCurrentlyPaused) {
          const tx = await contract.resume(election.blockchainElectionId);
          await tx.wait(1);
        } else {
          const tx = await contract.emergencyPause(election.blockchainElectionId);
          await tx.wait(1);
        }
      }

      setSuccess(`Emergency state updated: Voting is now ${nextStatus}.`);
      const updated = await api.getCurrentElection();
      setElection(updated);
    } catch (err: any) {
      setError(err.message || "Failed to update pause state.");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseElection = async () => {
    if (!election?.id) return;
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await api.closeElection(election.id);

      try {
        const signer = await getSigner();
        if (signer && deployments?.votingSystemAddress) {
          const votingAbi = ["function closeElection(uint256 electionId) external"];
          const contract = new ethers.Contract(deployments.votingSystemAddress, votingAbi, signer);
          const tx = await contract.closeElection(election.blockchainElectionId);
          await tx.wait(1);
        }
      } catch (chainErr: any) {
        console.warn("Contract close notice:", chainErr.message || chainErr);
      }

      setSuccess(`Election "${election.title}" closed successfully.`);
      setShowCloseModal(false);
      await loadSettingsData();
    } catch (err: any) {
      setError(err.message || "Failed to close election.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteElection = async () => {
    if (!election?.id) return;
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await api.deleteElection(election.id);
      setSuccess(res.message || "Election deleted successfully.");
      setShowDeleteModal(false);
      setElection(null);
      await loadSettingsData();
    } catch (err: any) {
      setError(err.message || "Failed to delete election.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-10 px-4 md:px-8 space-y-8 animate-in fade-in">
      <Link
        href="/admin/dashboard"
        className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors font-mono"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Dashboard
      </Link>

      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-mono">Settings & Lifecycle</h1>
        <p className="text-xs text-zinc-400">
          Manage election state boundaries, emergency circuit breakers, network switching, and system data.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-red-950/50 border border-red-800 text-red-300 text-xs flex items-center gap-2 font-mono">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-xs flex items-center gap-2 font-mono">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-white" />
          <span>{success}</span>
        </div>
      )}

      {/* Emergency Circuit Breaker Card */}
      <div className="glass-panel p-6 rounded-xl space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white font-mono">Emergency Voting Freeze</h2>
            <p className="text-xs text-zinc-400">
              Temporarily halts all ballot casting transactions across the entire smart contract.
            </p>
          </div>

          <span
            className="px-2.5 py-0.5 rounded text-xs font-mono font-bold uppercase shrink-0 bg-zinc-900 text-zinc-200 border border-zinc-700"
          >
            {election?.status === "PAUSED" ? "Voting Paused" : "Active"}
          </span>
        </div>

        <div className="pt-2">
          <button
            onClick={handleToggleEmergencyPause}
            disabled={loading || !election}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all bg-white hover:bg-zinc-200 text-black border border-white disabled:opacity-40"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-black" />
            ) : election?.status === "PAUSED" ? (
              <Play className="h-4 w-4 fill-current text-black" />
            ) : (
              <Pause className="h-4 w-4 fill-current text-black" />
            )}
            {election?.status === "PAUSED" ? "Resume Election Voting" : "Trigger Emergency Pause"}
          </button>
        </div>
      </div>

      {/* Danger Zone: Election Lifecycle Management */}
      <div className="glass-panel p-6 sm:p-7 rounded-xl space-y-5 border-red-900/40">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <h2 className="text-base font-bold text-white font-mono">Danger Zone & Election Lifecycle</h2>
        </div>

        {election ? (
          <div className="space-y-4">
            {/* Close Election Item */}
            <div className="p-4 rounded-lg bg-black border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-white font-mono flex items-center gap-2">
                  <span>Close Current Election</span>
                  <span className="text-[10px] px-2 py-0.2 rounded bg-zinc-800 text-zinc-300 font-normal">
                    Target: {election.title}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Manually conclude the election and prevent any further vote submissions.
                </p>
              </div>

              {election.status !== "CLOSED" && election.status !== "RESULTS_PUBLISHED" ? (
                <button
                  onClick={() => setShowCloseModal(true)}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg bg-amber-950/60 hover:bg-amber-900 border border-amber-700 text-amber-300 text-xs font-mono font-semibold transition-all shrink-0"
                >
                  Close Election
                </button>
              ) : (
                <span className="px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-500 text-xs font-mono shrink-0">
                  Already Closed
                </span>
              )}
            </div>

            {/* Delete Election Item */}
            <div className="p-4 rounded-lg bg-black border border-red-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-red-400 font-mono">
                  Delete Election Permanently
                </div>
                <p className="text-[11px] text-zinc-400">
                  Removes this election, candidate profiles, and cast ballots from the database.
                </p>
              </div>

              <button
                onClick={() => setShowDeleteModal(true)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 text-xs font-mono font-semibold transition-all shrink-0 flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Election
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-zinc-500 font-mono">No active election is currently configured.</p>
        )}
      </div>

      {/* Network Switcher Card */}
      <div className="glass-panel p-6 sm:p-7 rounded-xl space-y-5">
        <h2 className="text-base font-bold text-white flex items-center gap-2 font-mono">
          <Layers className="h-4 w-4 text-white" />
          Configured Blockchain Networks
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Object.values(SUPPORTED_NETWORKS).map((net) => {
            const isCurrent = chainId === net.chainId;

            return (
              <div
                key={net.chainId}
                className={`p-4 rounded-lg border transition-all ${
                  isCurrent
                    ? "bg-zinc-900 border-zinc-600 shadow-md"
                    : "bg-black border-zinc-800"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white text-xs sm:text-sm font-mono">{net.name}</span>
                  {isCurrent && <CheckCircle2 className="h-4 w-4 text-white" />}
                </div>
                <div className="text-[11px] font-mono text-zinc-500 space-y-1">
                  <div>Chain ID: {net.chainId}</div>
                  <div className="truncate">RPC: {net.rpcUrl}</div>
                </div>

                {!isCurrent && (
                  <button
                    onClick={() => switchNetwork(net.chainId)}
                    className="mt-3 w-full py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-400 hover:text-white transition-colors"
                  >
                    Switch to {net.name.split(" ")[0]}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Contract Addresses Card */}
      <div className="glass-panel p-6 sm:p-7 rounded-xl space-y-4 text-xs font-mono">
        <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
          <Cpu className="h-4 w-4 text-white" />
          Smart Contract Addresses & Config
        </h2>

        <div className="space-y-3">
          <div className="p-3.5 rounded-lg bg-black border border-zinc-800 space-y-1">
            <div className="text-zinc-500">VotingSystem Contract Address:</div>
            <div className="text-white font-bold break-all">
              {deployments?.votingSystemAddress || process.env.NEXT_PUBLIC_VOTING_CONTRACT_ADDRESS || "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"}
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-black border border-zinc-800 space-y-1">
            <div className="text-zinc-500">AdminMultisig (2-of-3) Address:</div>
            <div className="text-zinc-300 font-bold break-all">
              {deployments?.adminMultisigAddress || process.env.NEXT_PUBLIC_MULTISIG_CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3"}
            </div>
          </div>
        </div>
      </div>

      {/* Close Election Modal */}
      {showCloseModal && election && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-zinc-950 border border-amber-700/80 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-950/60 border border-amber-700 flex items-center justify-center text-amber-400 shrink-0">
                <Square className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-mono">Close Election?</h3>
                <p className="text-xs text-zinc-400">Target: {election.title}</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed bg-amber-950/20 p-3 rounded-lg border border-amber-900/40 font-mono">
              Voting will be immediately stopped and no further ballots can be cast for this election.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-mono transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCloseElection}
                disabled={actionLoading}
                className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs font-mono flex items-center gap-1.5 transition-colors"
              >
                {actionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirm Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Election Modal */}
      {showDeleteModal && election && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-zinc-950 border border-red-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-950/60 border border-red-700 flex items-center justify-center text-red-400 shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-mono">Delete Election?</h3>
                <p className="text-xs text-zinc-400">Target: {election.title}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-red-950/30 border border-red-800/60 text-red-200 text-xs space-y-2 font-mono">
              <div className="flex items-center gap-1.5 font-bold text-red-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>WARNING: Irreversible Action</span>
              </div>
              <p className="text-[11px] leading-relaxed text-zinc-300">
                This will delete the election, candidate roster, and all ballot records from the database.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-mono transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteElection}
                disabled={actionLoading}
                className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs font-mono flex items-center gap-1.5 transition-colors"
              >
                {actionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

