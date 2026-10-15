"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useWallet } from "@/context/WalletContext";
import { ethers } from "ethers";
import {
  Calendar,
  Layers,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  PlusCircle,
  Square,
  Play,
  Trash2,
  Users,
  AlertTriangle,
  Loader2,
} from "lucide-react";

export default function AdminElectionPage() {
  const { isConnected, connectWallet, getSigner } = useWallet();
  const router = useRouter();

  const [currentElection, setCurrentElection] = useState<any>(null);
  const [blockchainElectionId, setBlockchainElectionId] = useState(2);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [endTime, setEndTime] = useState(
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modals
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const loadElection = async () => {
    try {
      const el = await api.getCurrentElection().catch(() => null);
      setCurrentElection(el);
      if (el?.blockchainElectionId) {
        setBlockchainElectionId(el.blockchainElectionId + 1);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  useEffect(() => {
    loadElection();
  }, []);

  const handleOpenElection = async () => {
    if (!currentElection?.id) return;
    setActionLoading(true);
    setError(null);
    try {
      await api.openElection(currentElection.id);

      try {
        const signer = await getSigner();
        const deployments = await fetch("/contracts/deployments.json")
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);

        if (signer && deployments?.votingSystemAddress) {
          const votingAbi = [
            "function openElection(uint256 electionId) external",
            "function createElection(uint256 electionId, string title, string metadataURI, uint256 startTime, uint256 endTime) external",
          ];
          const contract = new ethers.Contract(deployments.votingSystemAddress, votingAbi, signer);
          try {
            const tx = await contract.openElection(currentElection.blockchainElectionId);
            await tx.wait(1);
          } catch {
            // If not created yet on-chain, create and open
            try {
              const txCreate = await contract.createElection(
                currentElection.blockchainElectionId,
                currentElection.title,
                "",
                Math.floor(Date.now() / 1000) - 60,
                Math.floor(Date.now() / 1000) + 3 * 24 * 60 * 60
              );
              await txCreate.wait(1);
            } catch {}
          }
        }
      } catch (e) {
        console.warn(e);
      }

      setSuccess(`Election "${currentElection.title}" is now OPEN for active voting!`);
      await loadElection();
    } catch (err: any) {
      setError(err.message || "Failed to open election.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseElection = async () => {
    if (!currentElection?.id) return;
    setActionLoading(true);
    setError(null);
    try {
      await api.closeElection(currentElection.id);

      try {
        const signer = await getSigner();
        const deployments = await fetch("/contracts/deployments.json")
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);

        if (signer && deployments?.votingSystemAddress) {
          const votingAbi = ["function closeElection(uint256 electionId) external"];
          const contract = new ethers.Contract(deployments.votingSystemAddress, votingAbi, signer);
          const tx = await contract.closeElection(currentElection.blockchainElectionId);
          await tx.wait(1);
        }
      } catch (e) {
        console.warn(e);
      }

      setSuccess(`Election "${currentElection.title}" has been closed.`);
      setShowCloseModal(false);
      await loadElection();
    } catch (err: any) {
      setError(err.message || "Failed to close election.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteElection = async () => {
    if (!currentElection?.id) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await api.deleteElection(currentElection.id);
      setSuccess(res.message || "Election deleted successfully.");
      setShowDeleteModal(false);
      setCurrentElection(null);
      await loadElection();
    } catch (err: any) {
      setError(err.message || "Failed to delete election.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Election title is required.");
      return;
    }
    if (new Date(startTime) >= new Date(endTime)) {
      setError("Start time must be before end time.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("http://localhost:5001/api/election", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blockchainElectionId: Number(blockchainElectionId),
          title: title.trim(),
          description: description.trim(),
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create election.");

      setSuccess("Election configured successfully! Redirecting to add candidates...");
      setTimeout(() => {
        router.push("/admin/candidates");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to configure election.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-3xl mx-auto py-10 px-4 md:px-8 space-y-6 animate-in fade-in">
      <Link
        href="/admin/dashboard"
        className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors font-mono"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Dashboard
      </Link>

      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-white font-mono">Election Management</h1>
        <p className="text-xs text-zinc-400">
          Configure new elections, manage lifecycle states, or close and delete existing elections.
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

      {/* Active Election Management Card if one exists */}
      {currentElection && (
        <div className="glass-panel p-5 sm:p-6 rounded-xl space-y-4 border-zinc-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-zinc-500 uppercase">Current Election</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    currentElection.status === "OPEN"
                      ? "bg-emerald-950/60 border border-emerald-800 text-emerald-400"
                      : currentElection.status === "CLOSED"
                      ? "bg-amber-950/60 border border-amber-800 text-amber-400"
                      : currentElection.status === "RESULTS_PUBLISHED"
                      ? "bg-cyan-950/60 border border-cyan-800 text-cyan-400"
                      : "bg-zinc-900 border border-zinc-800 text-zinc-400"
                  }`}
                >
                  {currentElection.status}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white font-mono">{currentElection.title}</h3>
              <p className="text-xs text-zinc-400 max-w-xl line-clamp-2">{currentElection.description}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Link
                href="/admin/candidates"
                className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-mono text-zinc-300 hover:text-white flex items-center gap-1 transition-colors"
              >
                <Users className="h-3.5 w-3.5" />
                Candidates ({currentElection.candidates?.length || 0})
              </Link>

              {currentElection.status !== "OPEN" && currentElection.status !== "RESULTS_PUBLISHED" && (
                <button
                  onClick={handleOpenElection}
                  disabled={actionLoading}
                  className="px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600 text-xs font-mono text-emerald-300 font-semibold flex items-center gap-1 transition-colors"
                >
                  <Play className="h-3.5 w-3.5 fill-emerald-300 text-emerald-300" />
                  {actionLoading ? "Opening..." : "Open for Voting"}
                </button>
              )}

              {currentElection.status === "OPEN" && (
                <button
                  onClick={() => setShowCloseModal(true)}
                  disabled={actionLoading}
                  className="px-3 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900 border border-amber-700 text-xs font-mono text-amber-300 font-semibold flex items-center gap-1 transition-colors"
                >
                  <Square className="h-3.5 w-3.5" />
                  Close
                </button>
              )}

              <button
                onClick={() => setShowDeleteModal(true)}
                disabled={actionLoading}
                className="px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-800 text-xs font-mono text-red-300 font-semibold flex items-center gap-1 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configure New Election Form */}
      <div className="glass-panel p-6 sm:p-7 rounded-xl space-y-5">
        <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
          <PlusCircle className="h-4 w-4 text-white" />
          {currentElection ? "Create Another Election" : "Configure Election"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-300 font-mono">
              Blockchain Election ID (Unique uint256)
            </label>
            <input
              type="number"
              required
              min={1}
              value={blockchainElectionId}
              onChange={(e) => setBlockchainElectionId(parseInt(e.target.value, 10))}
              className="w-full px-3.5 py-2.5 rounded-lg bg-black border border-zinc-800 text-white text-xs sm:text-sm focus:border-white focus:outline-none font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-300">Election Title</label>
            <input
              type="text"
              required
              placeholder="e.g. 2026 Protocol Council Election"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-black border border-zinc-800 text-white text-xs sm:text-sm focus:border-white focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-300">Election Description</label>
            <textarea
              required
              rows={3}
              placeholder="Provide context on candidate qualifications, election goals, and rules."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-black border border-zinc-800 text-white text-xs sm:text-sm focus:border-white focus:outline-none font-sans"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300 font-mono">Start Timestamp</label>
              <input
                type="datetime-local"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-black border border-zinc-800 text-white text-xs sm:text-sm focus:border-white focus:outline-none font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300 font-mono">End Timestamp</label>
              <input
                type="datetime-local"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-black border border-zinc-800 text-white text-xs sm:text-sm focus:border-white focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-white hover:bg-zinc-200 text-black font-semibold text-xs sm:text-sm border border-white transition-all flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <PlusCircle className="h-4 w-4" />
              {loading ? "Creating Election..." : "Save & Proceed to Candidates"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Close Election Modal */}
      {showCloseModal && currentElection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-zinc-950 border border-amber-700/80 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-950/60 border border-amber-700 flex items-center justify-center text-amber-400 shrink-0">
                <Square className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-mono">Close Election?</h3>
                <p className="text-xs text-zinc-400">{currentElection.title}</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed bg-amber-950/20 p-3 rounded-lg border border-amber-900/40 font-mono">
              Voting will be stopped immediately. No further votes can be cast.
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
      {showDeleteModal && currentElection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-zinc-950 border border-red-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-950/60 border border-red-700 flex items-center justify-center text-red-400 shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-mono">Delete Election?</h3>
                <p className="text-xs text-zinc-400">{currentElection.title}</p>
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

