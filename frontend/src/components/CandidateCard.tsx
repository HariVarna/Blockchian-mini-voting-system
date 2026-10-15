"use client";

import React, { useState } from "react";
import { CandidateData, CandidateModal } from "./CandidateModal";
import { Check, Info, Shield } from "lucide-react";

interface CandidateCardProps {
  candidate: CandidateData;
  isSelected: boolean;
  onSelect: (candidateId: number) => void;
  disabled?: boolean;
}

export const CandidateCard: React.FC<CandidateCardProps> = ({
  candidate,
  isSelected,
  onSelect,
  disabled = false,
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div
        onClick={() => !disabled && onSelect(candidate.blockchainCandidateId)}
        className={`relative flex flex-col justify-between p-5 rounded-xl transition-all cursor-pointer select-none ${
          isSelected
            ? "bg-zinc-900 border-2 border-white shadow-xl"
            : "glass-panel glass-panel-hover"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {/* Selection indicator */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={candidate.imageUrl}
                alt={candidate.name}
                className={`h-14 w-14 rounded-lg object-cover grayscale contrast-125 border ${
                  isSelected ? "border-white" : "border-zinc-800"
                }`}
                onError={(e) => {
                  (e.target as HTMLElement).setAttribute("src", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400");
                }}
              />
              <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded bg-black border border-zinc-700 text-[10px] font-mono font-bold text-zinc-300">
                #{candidate.blockchainCandidateId}
              </span>
            </div>
            <div>
              <h3 className="font-bold text-white text-base leading-tight">
                {candidate.name}
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">{candidate.party}</p>
            </div>
          </div>

          {/* Radio checkbox button */}
          <div
            className={`h-6 w-6 rounded-full border flex items-center justify-center transition-all ${
              isSelected
                ? "border-white bg-white text-black"
                : "border-zinc-700 bg-black hover:border-zinc-500"
            }`}
          >
            {isSelected && <Check className="h-3.5 w-3.5 stroke-[3] text-black" />}
          </div>
        </div>

        {/* Slogan */}
        <p className="text-xs text-zinc-300 italic line-clamp-2 mb-4 bg-black/60 p-2.5 rounded-lg border border-zinc-800">
          "{candidate.slogan}"
        </p>

        {/* Card Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800 text-xs">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setModalOpen(true);
            }}
            className="flex items-center gap-1 text-zinc-400 hover:text-white font-medium transition-colors"
          >
            <Info className="h-3.5 w-3.5" />
            Platform & Bio
          </button>

          <span
            className={`text-[11px] font-mono font-semibold uppercase tracking-wider ${
              isSelected ? "text-white font-bold" : "text-zinc-500"
            }`}
          >
            {isSelected ? "Selected" : "Select"}
          </span>
        </div>
      </div>

      <CandidateModal
        candidate={candidate}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={() => onSelect(candidate.blockchainCandidateId)}
        isSelected={isSelected}
      />
    </>
  );
};
