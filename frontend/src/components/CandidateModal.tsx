"use client";

import React from "react";
import { X, ExternalLink, ShieldCheck, FileText, Award } from "lucide-react";

export interface CandidateData {
  id?: string;
  blockchainCandidateId: number;
  name: string;
  party: string;
  imageUrl: string;
  slogan: string;
  policyStatement: string;
  manifestoUrl?: string | null;
}

interface CandidateModalProps {
  candidate: CandidateData | null;
  isOpen: boolean;
  onClose: () => void;
  onSelect?: () => void;
  isSelected?: boolean;
}

export const CandidateModal: React.FC<CandidateModalProps> = ({
  candidate,
  isOpen,
  onClose,
  onSelect,
  isSelected,
}) => {
  if (!isOpen || !candidate) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-xl bg-zinc-950 border border-zinc-800 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <img
              src={candidate.imageUrl}
              alt={candidate.name}
              className="h-16 w-16 rounded-xl object-cover grayscale contrast-125 border border-zinc-700 shadow-lg"
              onError={(e) => {
                (e.target as HTMLElement).setAttribute("src", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400");
              }}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-700">
                  Candidate #{candidate.blockchainCandidateId}
                </span>
                <span className="text-xs text-zinc-400 font-medium">{candidate.party}</span>
              </div>
              <h2 className="text-lg font-bold text-white mt-1">{candidate.name}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Slogan */}
        <div className="p-3.5 rounded-lg bg-black border border-zinc-800 text-sm italic text-zinc-300">
          "{candidate.slogan}"
        </div>

        {/* Policy statement */}
        <div className="space-y-2">
          <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Award className="h-4 w-4 text-white" />
            Platform & Key Policies
          </h3>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed bg-black/60 p-4 rounded-lg border border-zinc-800">
            {candidate.policyStatement}
          </p>
        </div>

        {/* Manifesto Link */}
        {candidate.manifestoUrl && (
          <div>
            <a
              href={candidate.manifestoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs text-zinc-300 hover:text-white underline font-medium"
            >
              <FileText className="h-4 w-4" />
              View Official Campaign Manifesto & Credentials
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white rounded-lg transition-colors"
          >
            Close
          </button>
          {onSelect && (
            <button
              onClick={() => {
                onSelect();
                onClose();
              }}
              className={`px-5 py-2 text-xs font-semibold rounded-lg transition-all border ${
                isSelected
                  ? "bg-zinc-800 text-zinc-200 border-zinc-600"
                  : "bg-white hover:bg-zinc-200 text-black border-white"
              }`}
            >
              {isSelected ? "Selected" : "Select Candidate"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
