"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  Users,
  Plus,
  ArrowLeft,
  Edit2,
  Trash2,
  Check,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  X,
  FileText,
  Loader2,
} from "lucide-react";

export default function AdminCandidatesPage() {
  const [election, setElection] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Add Form State
  const [candidateId, setCandidateId] = useState(1);
  const [name, setName] = useState("");
  const [party, setParty] = useState("");
  const [imageUrl, setImageUrl] = useState("https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400");
  const [slogan, setSlogan] = useState("");
  const [policyStatement, setPolicyStatement] = useState("");
  const [manifestoUrl, setManifestoUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Edit Candidate Modal State
  const [editingCandidate, setEditingCandidate] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editParty, setEditParty] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editSlogan, setEditSlogan] = useState("");
  const [editPolicyStatement, setEditPolicyStatement] = useState("");
  const [editManifestoUrl, setEditManifestoUrl] = useState("");
  const [updating, setUpdating] = useState(false);

  // Delete Candidate State
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [candidateToDelete, setCandidateToDelete] = useState<any | null>(null);

  const loadData = async () => {
    try {
      const el = await api.getCurrentElection();
      setElection(el);
      const cList = await api.getCandidates(el?.id);
      setCandidates(cList || []);
      
      // Auto-compute next ID
      if (cList && cList.length > 0) {
        const maxId = Math.max(...cList.map((c: any) => Number(c.blockchainCandidateId) || 0));
        setCandidateId(maxId + 1);
      } else {
        setCandidateId(1);
      }
    } catch (err) {
      console.warn("Candidates load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Candidate name is required.");
      return;
    }
    if (!party.trim()) {
      setError("Party affiliation is required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      let activeEl = election;
      if (!activeEl?.id) {
        activeEl = await api.getCurrentElection();
        setElection(activeEl);
      }

      await api.addCandidate({
        electionId: activeEl?.id,
        blockchainCandidateId: Number(candidateId) || 1,
        name: name.trim(),
        party: party.trim(),
        imageUrl: imageUrl.trim() || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400",
        slogan: slogan.trim() || "Dedicated to Transparent Governance & Service",
        policyStatement: policyStatement.trim() || "Advancing open governance, integrity, and verified outcomes.",
        manifestoUrl: manifestoUrl.trim() || undefined,
      });

      setSuccess(`Candidate #${candidateId} (${name}) registered successfully!`);
      // Reset form
      setName("");
      setParty("");
      setSlogan("");
      setPolicyStatement("");
      setManifestoUrl("");
      setShowAddForm(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to register candidate.");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (c: any) => {
    setEditingCandidate(c);
    setEditName(c.name || "");
    setEditParty(c.party || "");
    setEditImageUrl(c.imageUrl || "");
    setEditSlogan(c.slogan || "");
    setEditPolicyStatement(c.policyStatement || "");
    setEditManifestoUrl(c.manifestoUrl || "");
    setError(null);
  };

  const handleUpdateCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCandidate) return;
    if (editSlogan.length > 100) {
      setError("Campaign slogan cannot exceed 100 characters.");
      return;
    }
    if (editPolicyStatement.length > 500) {
      setError("Platform policy statement cannot exceed 500 characters.");
      return;
    }

    setUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      await api.updateCandidate(editingCandidate.id, {
        name: editName.trim(),
        party: editParty.trim(),
        imageUrl: editImageUrl.trim(),
        slogan: editSlogan.trim(),
        policyStatement: editPolicyStatement.trim(),
        manifestoUrl: editManifestoUrl.trim() || undefined,
      });

      setSuccess(`Candidate #${editingCandidate.blockchainCandidateId} (${editName}) updated successfully!`);
      setEditingCandidate(null);
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to update candidate.");
    } finally {
      setUpdating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!candidateToDelete) return;
    const { id, name, blockchainCandidateId } = candidateToDelete;
    setDeletingId(id);
    setError(null);
    setSuccess(null);

    try {
      await api.deleteCandidate(id);
      setSuccess(`Candidate #${blockchainCandidateId} (${name}) has been deleted successfully.`);
      setCandidateToDelete(null);
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to delete candidate.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="container max-w-5xl mx-auto py-10 px-4 md:px-8 space-y-8 animate-in fade-in">
      <Link
        href="/admin/dashboard"
        className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors font-mono"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Admin Dashboard
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-mono">Candidate Management</h1>
          <p className="text-xs text-zinc-400">
            Configure candidate platform profiles, edit campaign materials, and manage manifesto URLs.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-semibold flex items-center gap-2 border border-white transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          {showAddForm ? "Cancel Registration" : "Add New Candidate"}
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

      {/* Add Candidate Form Drawer */}
      {showAddForm && (
        <div className="glass-panel p-6 sm:p-7 rounded-xl space-y-5 animate-in slide-in-from-top-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2 font-mono">
            <Users className="h-5 w-5 text-white" />
            Register Candidate for {election?.title || "Active Election"}
          </h2>

          <form onSubmit={handleAddCandidate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-300 font-mono">
                  Candidate ID
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={candidateId || ""}
                  onChange={(e) => setCandidateId(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-black border border-zinc-800 text-white text-xs sm:text-sm focus:border-white focus:outline-none font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-300">Full Legal Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Elena Rostova"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-black border border-zinc-800 text-white text-xs sm:text-sm focus:border-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-300">Party Affiliation</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Decentralized Coalition"
                  value={party}
                  onChange={(e) => setParty(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-black border border-zinc-800 text-white text-xs sm:text-sm focus:border-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-300">
                  Photo / Avatar URL
                </label>
                <input
                  type="url"
                  required
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-black border border-zinc-800 text-white text-xs sm:text-sm focus:border-white focus:outline-none font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-300">
                  Manifesto URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={manifestoUrl}
                  onChange={(e) => setManifestoUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-black border border-zinc-800 text-white text-xs sm:text-sm focus:border-white focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <label className="font-semibold text-zinc-300">Campaign Slogan</label>
                <span className="text-zinc-500 font-mono">
                  {slogan.length} / 100 max
                </span>
              </div>
              <input
                type="text"
                required
                maxLength={100}
                placeholder="e.g. Transparent Governance Through Zero-Knowledge & Open Infrastructure"
                value={slogan}
                onChange={(e) => setSlogan(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-black border border-zinc-800 text-white text-xs sm:text-sm focus:border-white focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <label className="font-semibold text-zinc-300">Policy Platform Statement</label>
                <span className="text-zinc-500 font-mono">
                  {policyStatement.length} / 500 max
                </span>
              </div>
              <textarea
                required
                maxLength={500}
                rows={3}
                placeholder="Key platform priorities, governance policy, and research commitments."
                value={policyStatement}
                onChange={(e) => setPolicyStatement(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-black border border-zinc-800 text-white text-xs sm:text-sm focus:border-white focus:outline-none font-sans"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-lg bg-white hover:bg-zinc-200 text-black font-semibold text-xs sm:text-sm border border-white transition-all disabled:opacity-40"
              >
                {submitting ? "Saving Candidate..." : "Add Candidate to Ballot"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Candidate List Cards */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-white font-mono">Current Candidates ({candidates.length})</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {candidates.map((c) => (
            <div key={c.blockchainCandidateId} className="glass-panel p-5 rounded-xl flex flex-col justify-between space-y-3">
              <div className="flex items-start gap-4">
                <img
                  src={c.imageUrl}
                  alt={c.name}
                  className="h-16 w-16 rounded-lg object-cover grayscale border border-zinc-800 shrink-0"
                  onError={(e) => {
                    (e.target as HTMLElement).setAttribute("src", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400");
                  }}
                />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold">
                      #{c.blockchainCandidateId}
                    </span>
                    <span className="text-[11px] text-zinc-500 font-medium">{c.party}</span>
                  </div>
                  <h3 className="font-bold text-white text-base truncate font-mono">{c.name}</h3>
                  <p className="text-xs text-zinc-300 italic line-clamp-1">"{c.slogan}"</p>
                  <p className="text-[11px] text-zinc-400 line-clamp-2">{c.policyStatement}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-zinc-800 text-xs">
                {c.manifestoUrl ? (
                  <a
                    href={c.manifestoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-300 hover:text-white hover:underline flex items-center gap-1 font-medium text-[11px]"
                  >
                    <FileText className="h-3 w-3 text-zinc-400" />
                    Manifesto
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                ) : (
                  <span className="text-zinc-600 text-[11px] font-mono">No manifesto</span>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(c)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-medium text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Edit2 className="h-3.5 w-3.5 text-zinc-400" />
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => setCandidateToDelete(c)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white font-medium text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {candidateToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 animate-in fade-in">
          <div className="max-w-md w-full p-6 sm:p-7 rounded-xl bg-zinc-950 border border-zinc-800 space-y-6">
            <div className="h-11 w-11 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white mx-auto">
              <Trash2 className="h-5 w-5 text-white" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-white font-mono">Delete Candidate #{candidateToDelete.blockchainCandidateId}?</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Are you sure you want to remove <strong className="text-white font-bold">{candidateToDelete.name}</strong> ({candidateToDelete.party}) from the election ballot? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setCandidateToDelete(null)}
                className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deletingId === candidateToDelete.id}
                className="px-5 py-2 rounded-lg bg-white hover:bg-zinc-200 text-black font-bold text-xs border border-white transition-all flex items-center gap-1.5"
              >
                {deletingId === candidateToDelete.id ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-black" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5 text-black" />
                    Confirm Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Candidate Modal */}
      {editingCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 animate-in fade-in">
          <div className="max-w-xl w-full p-6 sm:p-7 rounded-xl bg-zinc-950 border border-zinc-800 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-700 text-xs font-mono font-bold">
                  Candidate #{editingCandidate.blockchainCandidateId}
                </span>
                <h3 className="text-base font-bold text-white font-mono">Edit Candidate Profile</h3>
              </div>
              <button
                onClick={() => setEditingCandidate(null)}
                className="p-1 rounded-lg text-zinc-400 hover:bg-zinc-900 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCandidate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-300">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-black border border-zinc-800 text-white text-xs sm:text-sm focus:border-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-300">Party Affiliation</label>
                  <input
                    type="text"
                    required
                    value={editParty}
                    onChange={(e) => setEditParty(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-black border border-zinc-800 text-white text-xs sm:text-sm focus:border-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-300">Photo URL</label>
                  <input
                    type="url"
                    required
                    value={editImageUrl}
                    onChange={(e) => setEditImageUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-black border border-zinc-800 text-white text-xs sm:text-sm focus:border-white focus:outline-none font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-300">Manifesto URL</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={editManifestoUrl}
                    onChange={(e) => setEditManifestoUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-black border border-zinc-800 text-white text-xs sm:text-sm focus:border-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <label className="font-semibold text-zinc-300">Campaign Slogan</label>
                  <span className="text-zinc-500 font-mono">
                    {editSlogan.length} / 100 max
                  </span>
                </div>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={editSlogan}
                  onChange={(e) => setEditSlogan(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-black border border-zinc-800 text-white text-xs sm:text-sm focus:border-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <label className="font-semibold text-zinc-300">Policy Statement</label>
                  <span className="text-zinc-500 font-mono">
                    {editPolicyStatement.length} / 500 max
                  </span>
                </div>
                <textarea
                  required
                  maxLength={500}
                  rows={3}
                  value={editPolicyStatement}
                  onChange={(e) => setEditPolicyStatement(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-black border border-zinc-800 text-white text-xs sm:text-sm focus:border-white focus:outline-none font-sans"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingCandidate(null)}
                  className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2 rounded-lg bg-white hover:bg-zinc-200 text-black font-bold text-xs border border-white transition-all"
                >
                  {updating ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
