"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ethers } from "ethers";
import { useWallet } from "@/context/WalletContext";
import { api } from "@/lib/api";
import { shortenAddress } from "@/lib/utils";
import { CountdownTimer } from "@/components/CountdownTimer";
import {
  Shield,
  Vote,
  Users,
  Clock,
  AlertTriangle,
  Play,
  Square,
  Pause,
  FileCheck2,
  Settings,
  ArrowRight,
  RefreshCw,
  PlusCircle,
  LogOut,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  XCircle,
} from "lucide-react";

export default function AdminDashboardPage() {
  const { address, isConnected, connectWallet, disconnectWallet, networkName, getSigner } = useWallet();
  const [election, setElection] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal States
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const loadDashboardData = async () => {
    try {
      const [el, apprs] = await Promise.all([
        api.getCurrentElection().catch(() => null),
        api.getApprovals().catch(() => []),
      ]);
      setElection(el);
      if (el?.candidates) {
        setCandidates(el.candidates);
      } else {
        setCandidates([]);
      }
      setApprovals(apprs);
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  // Close Election Handler
  const handleCloseElection = async () => {
    if (!election?.id) return;
    setActionLoading(true);
    setActionMessage(null);

    try {
      // 1. Update status in backend database
      await api.closeElection(election.id);

      // 2. Attempt on-chain close if signer available
      try {
        const signer = await getSigner();
        const deployments = await fetch("/contracts/deployments.json")
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);

        if (signer && deployments?.votingSystemAddress) {
          const votingAbi = ["function closeElection(uint256 electionId) external"];
          const contract = new ethers.Contract(deployments.votingSystemAddress, votingAbi, signer);
          const tx = await contract.closeElection(election.blockchainElectionId);
          await tx.wait(1);
        }
      } catch (chainErr: any) {
        console.warn("On-chain close info:", chainErr.message || chainErr);
      }

      setActionMessage({
        type: "success",
        text: `Election "${election.title}" has been successfully CLOSED. Voting is now stopped.`,
      });
      setShowCloseModal(false);
      await loadDashboardData();
    } catch (err: any) {
      setActionMessage({
        type: "error",
        text: err.message || "Failed to close election.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Election Handler
  const handleDeleteElection = async () => {
    if (!election?.id) return;
    setActionLoading(true);
    setActionMessage(null);

    try {
      const res = await api.deleteElection(election.id);
      setActionMessage({
        type: "success",
        text: res.message || "Election and associated records deleted successfully.",
      });
      setShowDeleteModal(false);
      setElection(null);
      setCandidates([]);
      await loadDashboardData();
    } catch (err: any) {
      setActionMessage({
        type: "error",
        text: err.message || "Failed to delete election.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const pendingApprovalsCount = approvals.filter((a) => !a.executed && !a.cancelled).length;

  return (
    <div className="container max-w-6xl mx-auto py-10 px-4 md:px-8 space-y-8 animate-in fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-700 text-xs font-mono font-bold">
              Admin Console
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              Wallet: {address ? shortenAddress(address) : "Not connected"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 font-mono">Election Control Center</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <Link
            href="/admin/election"
            className="px-4 py-2 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-semibold flex items-center gap-1.5 border border-white transition-all"
          >
            <PlusCircle className="h-4 w-4" />
            Configure Election
          </Link>

          <button
            onClick={() => {
              disconnectWallet();
              window.location.href = "/";
            }}
            title="Disconnect & Exit Admin"
            className="px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </div>
      </div>

      {/* Action Notification Message */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl border flex items-start justify-between gap-3 text-xs font-mono animate-in fade-in ${
            actionMessage.type === "success"
              ? "bg-zinc-900 border-zinc-700 text-white"
              : "bg-red-950/40 border-red-800 text-red-300"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {actionMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            ×
          </button>
        </div>
      )}

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
            <span>Status</span>
            <span
              className={`h-2 w-2 rounded-full ${
                election?.status === "OPEN"
                  ? "bg-emerald-400 animate-pulse"
                  : election?.status === "CLOSED"
                  ? "bg-amber-400"
                  : election?.status === "RESULTS_PUBLISHED"
                  ? "bg-cyan-400"
                  : "bg-zinc-500"
              }`}
            />
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {election?.status || "NO ELECTION"}
          </div>
          <div className="text-[11px] text-zinc-500 truncate">
            {election?.title || "No active election configured"}
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
            <span>Candidates</span>
            <Users className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {candidates.length}
          </div>
          <Link href="/admin/candidates" className="text-[11px] text-zinc-400 hover:text-white underline">
            Manage candidates →
          </Link>
        </div>

        <div className="glass-panel p-5 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
            <span>Total Ballots</span>
            <Vote className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {election?.totalVotesCast || 0}
          </div>
          <div className="text-[11px] text-zinc-500">
            On-chain commitments
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
            <span>Multi-Sig Queue</span>
            <Shield className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {pendingApprovalsCount} Pending
          </div>
          <Link href="/admin/approvals" className="text-[11px] text-zinc-400 hover:text-white underline">
            Review approvals queue →
          </Link>
        </div>
      </div>

      {/* Main Control Panel */}
      {election ? (
        <div className="glass-panel p-6 sm:p-7 rounded-xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 font-mono">Active Target (ID: {election.blockchainElectionId}):</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    election.status === "OPEN"
                      ? "bg-emerald-950/60 border border-emerald-800 text-emerald-400"
                      : election.status === "CLOSED"
                      ? "bg-amber-950/60 border border-amber-800 text-amber-400"
                      : election.status === "RESULTS_PUBLISHED"
                      ? "bg-cyan-950/60 border border-cyan-800 text-cyan-400"
                      : "bg-zinc-900 border border-zinc-800 text-zinc-400"
                  }`}
                >
                  {election.status}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mt-1 font-mono">{election.title}</h2>
              <p className="text-xs text-zinc-400 mt-1 max-w-2xl">{election.description}</p>
            </div>

            {election.status === "OPEN" && (
              <div className="shrink-0">
                <CountdownTimer endTime={election.endTime} />
              </div>
            )}
          </div>

          {/* Quick Lifecycle Action Buttons (Close & Delete Election) */}
          <div className="p-4 rounded-xl bg-black/60 border border-zinc-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                <Square className="h-3.5 w-3.5 text-zinc-400" />
                Election Lifecycle Controls
              </span>
              <p className="text-[11px] text-zinc-400">
                Manage the election status or delete this election to start fresh.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              {/* Close Election Button */}
              {election.status !== "CLOSED" && election.status !== "RESULTS_PUBLISHED" ? (
                <button
                  onClick={() => setShowCloseModal(true)}
                  disabled={actionLoading}
                  className="px-3.5 py-2 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 border border-amber-700/80 text-amber-300 text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-all w-full sm:w-auto"
                >
                  <Square className="h-3.5 w-3.5" />
                  Close Election
                </button>
              ) : (
                <span className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 text-xs font-mono flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-zinc-600" />
                  Election is Closed
                </span>
              )}

              {/* Delete Election Button */}
              <button
                onClick={() => setShowDeleteModal(true)}
                disabled={actionLoading}
                className="px-3.5 py-2 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800 text-red-300 text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-all w-full sm:w-auto"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Election
              </button>
            </div>
          </div>

          {/* Secondary Nav Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <Link
              href="/admin/approvals"
              className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-500 transition-all flex items-center justify-between group"
            >
              <div className="text-xs font-bold text-white group-hover:text-zinc-200 font-mono">
                Approvals Queue
              </div>
              <ArrowRight className="h-4 w-4 text-zinc-500 group-hover:translate-x-1 group-hover:text-white transition-transform" />
            </Link>

            <Link
              href="/admin/results"
              className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-500 transition-all flex items-center justify-between group"
            >
              <div className="text-xs font-bold text-white group-hover:text-zinc-200 font-mono">
                Tally & Publish
              </div>
              <ArrowRight className="h-4 w-4 text-zinc-500 group-hover:translate-x-1 group-hover:text-white transition-transform" />
            </Link>

            <Link
              href="/admin/settings"
              className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-500 transition-all flex items-center justify-between group"
            >
              <div className="text-xs font-bold text-white group-hover:text-zinc-200 font-mono">
                Settings & Safety
              </div>
              <ArrowRight className="h-4 w-4 text-zinc-500 group-hover:translate-x-1 group-hover:text-white transition-transform" />
            </Link>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="glass-panel p-10 rounded-xl text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center mx-auto text-zinc-400">
            <Vote className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white font-mono">No Election Configured</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              Get started by creating a new election with title, description, time boundaries, and candidates.
            </p>
          </div>
          <Link
            href="/admin/election"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-bold font-mono transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            Create New Election
          </Link>
        </div>
      )}

      {/* Close Election Confirmation Modal */}
      {showCloseModal && election && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-zinc-950 border border-amber-700/80 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-950/60 border border-amber-700/80 flex items-center justify-center text-amber-400 shrink-0">
                <Square className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-mono">Close Election?</h3>
                <p className="text-xs text-zinc-400">Election: {election.title}</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed bg-amber-950/20 p-3 rounded-lg border border-amber-900/40">
              Closing this election will immediately stop all incoming votes and transition the election to <strong>CLOSED</strong> status. You can subsequently proceed to tally and publish final results.
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
                className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs font-mono flex items-center gap-1.5 transition-colors disabled:opacity-40"
              >
                {actionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirm & Close Election
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Election Confirmation Modal */}
      {showDeleteModal && election && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-zinc-950 border border-red-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-950/60 border border-red-700 flex items-center justify-center text-red-400 shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-mono">Delete Election?</h3>
                <p className="text-xs text-zinc-400">Election: {election.title}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-red-950/30 border border-red-800/60 text-red-200 text-xs space-y-2 font-mono">
              <div className="flex items-center gap-1.5 font-bold text-red-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>WARNING: Irreversible Action</span>
              </div>
              <p className="text-[11px] leading-relaxed text-zinc-300">
                Deleting this election will permanently remove all associated candidates, cast ballots, and recorded results from the database.
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
                className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs font-mono flex items-center gap-1.5 transition-colors disabled:opacity-40"
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

