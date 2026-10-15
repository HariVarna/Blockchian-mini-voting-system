"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ethers } from "ethers";
import { api } from "@/lib/api";
import { useWallet } from "@/context/WalletContext";
import { shortenAddress } from "@/lib/utils";
import {
  Shield,
  CheckCircle2,
  AlertCircle,
  Play,
  Square,
  Pause,
  ArrowLeft,
  Loader2,
  Users,
  KeyRound,
  FileCheck2,
  Clock,
  PlusCircle,
} from "lucide-react";

export default function AdminApprovalsPage() {
  const { address, isConnected, getSigner, networkName } = useWallet();
  const [election, setElection] = useState<any>(null);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Proposal modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string>("OPEN_ELECTION");

  const loadData = async () => {
    try {
      const [el, apprs] = await Promise.all([
        api.getCurrentElection().catch(() => null),
        api.getApprovals().catch(() => []),
      ]);
      setElection(el);
      setApprovals(apprs);
    } catch (err) {
      console.warn("Approvals load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Create a new 2-of-3 Multisig Proposal
  const handleCreateProposal = async () => {
    if (!address || !election) return;
    setActionLoading("PROPOSING");
    setError(null);

    try {
      const nextProposalId = approvals.length + 1;
      const descMap: Record<string, string> = {
        OPEN_ELECTION: `Open voting for Election #${election.blockchainElectionId}: ${election.title}`,
        CLOSE_ELECTION: `Close voting for Election #${election.blockchainElectionId}: ${election.title}`,
        EMERGENCY_PAUSE: `Emergency pause voting for Election #${election.blockchainElectionId}`,
        RESUME: `Resume voting for Election #${election.blockchainElectionId}`,
      };

      await api.proposeApproval({
        proposalId: nextProposalId,
        actionType: selectedAction,
        targetElectionId: election.blockchainElectionId,
        proposalHash: ethers.keccak256(ethers.toUtf8Bytes(`${selectedAction}:${election.blockchainElectionId}:${Date.now()}`)),
        calldata: "0x",
        description: descMap[selectedAction] || `Execute ${selectedAction}`,
        proposerAddress: address,
      });

      setSuccess(`Proposal #${nextProposalId} created! Signed by ${shortenAddress(address)} (1/2 Approvals).`);
      setShowCreateModal(false);
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to create proposal.");
    } finally {
      setActionLoading(null);
    }
  };

  // Sign Proposal as Admin 2
  const handleSignProposal = async (proposalId: number) => {
    if (!address) return;
    setActionLoading(`SIGNING_${proposalId}`);
    setError(null);

    try {
      const res = await api.signApproval(proposalId, address);
      setSuccess(`Proposal #${proposalId} signed by ${shortenAddress(address)}! Approvals: ${res.approvals.length}/2.`);
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to sign proposal.");
    } finally {
      setActionLoading(null);
    }
  };

  // Execute Proposal when 2-of-3 reached
  const handleExecuteProposal = async (proposal: any) => {
    if (!address || !election) return;
    setActionLoading(`EXECUTING_${proposal.proposalId}`);
    setError(null);

    try {
      // Map action to status
      let newStatus = election.status;
      if (proposal.actionType === "OPEN_ELECTION") newStatus = "OPEN";
      if (proposal.actionType === "CLOSE_ELECTION") newStatus = "CLOSED";
      if (proposal.actionType === "EMERGENCY_PAUSE") newStatus = "PAUSED";
      if (proposal.actionType === "RESUME") newStatus = "OPEN";

      // Update election status
      await fetch(`http://localhost:5001/api/election/${election.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      // Mark proposal as executed
      await fetch(`http://localhost:5001/api/admin/approvals/${proposal.proposalId}/execute`, {
        method: "POST",
      });

      setSuccess(`Proposal #${proposal.proposalId} successfully executed! Election state updated to ${newStatus}.`);
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to execute proposal.");
    } finally {
      setActionLoading(null);
    }
  };

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
              2-of-3 Multi-Sig Governance
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 font-mono">Admin Approvals Queue</h1>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 rounded-lg bg-white hover:bg-zinc-200 text-black font-semibold text-xs flex items-center gap-2 border border-white transition-all self-start sm:self-auto"
        >
          <PlusCircle className="h-4 w-4" />
          Propose Critical Action
        </button>
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

      {/* Approvals List */}
      <div className="space-y-4">
        {approvals.length === 0 ? (
          <div className="glass-panel p-12 rounded-xl text-center space-y-3">
            <Shield className="h-8 w-8 text-zinc-600 mx-auto" />
            <h3 className="text-base font-bold text-white font-mono">No Proposals in Queue</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Critical operations (Open Election, Close Election, Emergency Pause) will appear here for multi-signature sign-off.
            </p>
          </div>
        ) : (
          approvals.map((p) => {
            const hasSigned = address && p.approvals?.includes(address.toLowerCase());
            const canExecute = (p.approvals?.length || 0) >= p.requiredApprovals && !p.executed;

            return (
              <div key={p.proposalId} className="glass-panel p-5 rounded-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-700 font-bold">
                        Proposal #{p.proposalId}
                      </span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-black text-white border border-zinc-800">
                        {p.actionType}
                      </span>
                      {p.executed ? (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 uppercase">
                          Executed
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black text-zinc-400 border border-zinc-800 uppercase">
                          Pending ({p.approvals?.length || 0}/2 Approvals)
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-white text-sm mt-1">{p.description}</h3>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {!p.executed && !hasSigned && (
                      <button
                        onClick={() => handleSignProposal(p.proposalId)}
                        disabled={actionLoading === `SIGNING_${p.proposalId}`}
                        className="px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-700 text-white text-xs font-semibold transition-all flex items-center gap-1.5"
                      >
                        {actionLoading === `SIGNING_${p.proposalId}` ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                        )}
                        Sign (Admin)
                      </button>
                    )}

                    {!p.executed && canExecute && (
                      <button
                        onClick={() => handleExecuteProposal(p)}
                        disabled={actionLoading === `EXECUTING_${p.proposalId}`}
                        className="px-4 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-bold border border-white transition-all flex items-center gap-1.5"
                      >
                        {actionLoading === `EXECUTING_${p.proposalId}` ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Play className="h-3.5 w-3.5 fill-current text-black" />
                        )}
                        Execute Action
                      </button>
                    )}
                  </div>
                </div>

                {/* Signers breakdown */}
                <div className="p-3 rounded-lg bg-black border border-zinc-800 text-xs space-y-1 font-mono">
                  <div className="text-zinc-500 font-medium text-[11px]">Approved Admin Signatures:</div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {p.approvals?.map((adminAddr: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-700 text-zinc-300 font-mono text-[11px] flex items-center gap-1"
                      >
                        <CheckCircle2 className="h-3 w-3 text-white" />
                        Admin {idx + 1}: {shortenAddress(adminAddr)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Propose Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 animate-in fade-in">
          <div className="max-w-md w-full p-6 sm:p-7 rounded-xl bg-zinc-950 border border-zinc-800 space-y-5">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white font-mono">Create Multi-Sig Proposal</h3>
              <p className="text-xs text-zinc-400">
                Submit a governance proposal for Election #{election?.blockchainElectionId}. Requires 2 admin signatures.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-300">Select Action Type</label>
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-black border border-zinc-800 text-white text-xs sm:text-sm focus:border-white focus:outline-none"
              >
                <option value="OPEN_ELECTION">Open Election Voting</option>
                <option value="CLOSE_ELECTION">Close Election Voting</option>
                <option value="EMERGENCY_PAUSE">Emergency Pause</option>
                <option value="RESUME">Resume Voting</option>
              </select>
            </div>

            <div className="p-3 rounded-lg bg-black border border-zinc-800 text-xs text-zinc-400 space-y-1 font-mono">
              <div>Proposer: <span className="text-white">{shortenAddress(address || "")}</span></div>
              <div>Required Approvals: <span className="font-bold text-white">2 of 3</span></div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateProposal}
                disabled={actionLoading === "PROPOSING"}
                className="px-5 py-2 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-bold border border-white transition-all"
              >
                {actionLoading === "PROPOSING" ? "Submitting..." : "Submit Proposal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
