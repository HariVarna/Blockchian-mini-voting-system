"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { useWallet } from "@/context/WalletContext";
import {
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Lock,
  ArrowRight,
  Copy,
  Check,
  FileCheck2,
} from "lucide-react";

export default function VoterSuccessPage() {
  const { networkName, chainId } = useWallet();
  const [receipt, setReceipt] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Fire minimalist monochrome confetti
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#ffffff", "#a1a1aa", "#71717a", "#e4e4e7"],
      });
    } catch {
      // Ignored in non-browser env
    }

    const saved = sessionStorage.getItem("last_vote_receipt");
    if (saved) {
      try {
        setReceipt(JSON.parse(saved));
      } catch (e) {
        console.warn(e);
      }
    }
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const explorerBase = chainId === 11155111
    ? "https://sepolia.etherscan.io/tx"
    : (chainId === 80002 ? "https://amoy.polygonscan.com/tx" : "http://localhost:8545");

  return (
    <div className="container max-w-xl mx-auto py-12 px-4 md:px-8 space-y-6 animate-in fade-in">
      <div className="text-center space-y-2">
        <div className="h-12 w-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white mx-auto">
          <CheckCircle2 className="h-6 w-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white font-mono">Vote Confirmed</h1>
      </div>

      <div className="glass-panel p-6 rounded-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div>
            <div className="text-[11px] text-zinc-500 font-mono">Election</div>
            <div className="text-sm font-bold text-white mt-0.5 font-mono">
              {receipt?.electionTitle || "Active Election"}
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-200 border border-zinc-700 text-xs font-mono font-bold uppercase">
            Confirmed
          </span>
        </div>

        {/* Transaction Hash Info */}
        <div className="space-y-3 text-xs font-mono">
          <div className="space-y-1 bg-black p-3 rounded-lg border border-zinc-800">
            <div className="text-zinc-500 flex items-center justify-between">
              <span>Tx Hash:</span>
              {receipt?.txHash && (
                <button
                  onClick={() => handleCopy(receipt.txHash)}
                  className="text-zinc-300 hover:text-white flex items-center gap-1 font-sans text-[11px]"
                >
                  {copied ? <Check className="h-3 w-3 text-white" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              )}
            </div>
            <div className="text-white break-all font-bold text-[11px]">
              {receipt?.txHash || "Confirmed"}
            </div>
          </div>

          {receipt?.ballotCommitment && (
            <div className="space-y-1 bg-black p-3 rounded-lg border border-zinc-800">
              <div className="text-zinc-500">Ballot Commitment:</div>
              <div className="text-zinc-300 break-all text-[11px]">
                {receipt.ballotCommitment}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-black p-2.5 rounded-lg border border-zinc-800 space-y-0.5">
              <div className="text-zinc-500 text-[11px]">Network:</div>
              <div className="text-white font-bold">{networkName}</div>
            </div>
            <div className="bg-black p-2.5 rounded-lg border border-zinc-800 space-y-0.5">
              <div className="text-zinc-500 text-[11px]">Block:</div>
              <div className="text-white font-bold">
                {receipt?.blockNumber ? `#${receipt.blockNumber}` : "Latest"}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-zinc-800">
          {receipt?.txHash && (
            <a
              href={`${explorerBase}/${receipt.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              Explorer
              <ExternalLink className="h-3 w-3" />
            </a>
          )}

          <Link
            href="/voter"
            className="w-full sm:w-auto px-4 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-bold flex items-center justify-center gap-2 border border-white transition-all"
          >
            Voter Portal
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
