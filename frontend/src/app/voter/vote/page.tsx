"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { useWallet } from "@/context/WalletContext";
import { api } from "@/lib/api";
import { CandidateCard } from "@/components/CandidateCard";
import { CandidateData } from "@/components/CandidateModal";
import { CountdownTimer } from "@/components/CountdownTimer";
import {
  Vote,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Lock,
  Loader2,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  HelpCircle,
} from "lucide-react";

export default function VotingBoothPage() {
  const { address, isConnected, connectWallet, getSigner, networkName, chainId } = useWallet();
  const router = useRouter();

  const [election, setElection] = useState<any>(null);
  const [candidates, setCandidates] = useState<CandidateData[]>([]);
  const [voterStatus, setVoterStatus] = useState<any>(null);
  const [hasAlreadyVoted, setHasAlreadyVoted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Selection & Flow State
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Transaction States: IDLE, PREPARING_ENCRYPTION, WAITING_WALLET_SIGNATURE, MINING_BLOCKCHAIN, SUCCESS, FAILED
  const [txStep, setTxStep] = useState<string>("IDLE");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

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

    async function init() {
      if (!address) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [el, vStatus, bStatus] = await Promise.all([
          api.getCurrentElection(),
          api.getVoterStatus(address),
          api.getBallotStatus(address),
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

        setHasAlreadyVoted(bStatus.hasVoted);
      } catch (err) {
        console.warn("Init booth error:", err);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [address]);

  const selectedCandidate = candidates.find((c) => c.blockchainCandidateId === selectedCandidateId);

  // Handle Initial "Confirm Vote" Button Click
  const handleInitiateVote = () => {
    if (!selectedCandidateId) return;
    setTxError(null);
    setShowConfirmModal(true);
  };

  // Step 1: User confirms modal -> Encrypt Ballot & Submit Blockchain Tx
  const handleCastBallot = async () => {
    setShowConfirmModal(false);
    if (!address || !election || !selectedCandidateId) return;

    setTxStep("PREPARING_ENCRYPTION");
    setTxError(null);

    try {
      // 1. Prepare encrypted ballot with backend
      const prepRes = await api.prepareBallot({
        electionId: election.id,
        candidateId: selectedCandidateId,
        walletAddress: address,
      });

      const { encryptedVote, ballotCommitment } = prepRes;

      // 2. Submit on-chain transaction
      // If connected to Mainnet (1) or unsupported chain, switch to Sepolia (11155111)
      if (chainId !== 11155111 && chainId !== 31337) {
        setTxStep("SWITCHING_NETWORK");
        try {
          await switchNetwork(11155111);
        } catch (netErr: any) {
          throw new Error("Please switch your MetaMask network to Sepolia Testnet (or Hardhat Localhost) to cast your vote.");
        }
      }

      setTxStep("WAITING_WALLET_SIGNATURE");
      const signer = await getSigner();
      if (!signer) {
        throw new Error("Could not access Web3 wallet signer. Please ensure MetaMask is connected.");
      }

      // Load contract info
      const deploymentsRes = await fetch("/contracts/deployments.json").catch(() => null);
      let votingContractAddress = process.env.NEXT_PUBLIC_VOTING_CONTRACT_ADDRESS;

      if (deploymentsRes && deploymentsRes.ok) {
        const depJson = await deploymentsRes.json();
        votingContractAddress = votingContractAddress || depJson.votingSystemAddress;
      }

      if (!votingContractAddress) {
        // Fallback default local address if needed
        votingContractAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
      }

      const votingAbi = [
        "function castVote(uint256 electionId, bytes32 ballotCommitment) external",
        "function hasVoted(uint256 electionId, address voter) external view returns (bool)",
        "function getElectionState(uint256 electionId) external view returns (uint8)",
      ];

      const votingContract = new ethers.Contract(votingContractAddress, votingAbi, signer);

      const tx = await votingContract.castVote(election.blockchainElectionId, ballotCommitment);
      setTxHash(tx.hash);
      setTxStep("MINING_BLOCKCHAIN");

      // 3. Wait for 1 confirmation
      const receipt = await tx.wait(1);

      if (receipt.status !== 1) {
        throw new Error("Smart contract transaction reverted on-chain.");
      }

      // 4. Save metadata off-chain
      await api.submitBallot({
        electionId: election.id,
        walletAddress: address,
        encryptedVote,
        ballotCommitment,
        txHash: tx.hash,
      });

      setTxStep("SUCCESS");

      // Store in session storage for receipt page
      sessionStorage.setItem("last_vote_receipt", JSON.stringify({
        electionTitle: election.title,
        candidateName: selectedCandidate?.name,
        party: selectedCandidate?.party,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        ballotCommitment,
        timestamp: new Date().toISOString(),
      }));

      setTimeout(() => {
        router.push("/voter/success");
      }, 1000);
    } catch (err: any) {
      console.error("Voting failed:", err);
      setTxStep("FAILED");
      if (err.code === "ACTION_REJECTED" || err.code === 4001) {
        setTxError("Transaction rejected by user in MetaMask.");
      } else if (err.message && err.message.includes("Already voted")) {
        setTxError("You have already voted in this election.");
      } else {
        setTxError(err.message || "Failed to commit vote transaction.");
      }
    }
  };

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto py-24 px-4 text-center text-zinc-500 font-mono text-xs">
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3 text-white" />
        Loading voting booth and blockchain state...
      </div>
    );
  }

  if (!isConnected || !address) {
    return (
      <div className="container max-w-md mx-auto py-24 px-4 text-center space-y-4">
        <Lock className="h-10 w-10 text-zinc-400 mx-auto" />
        <h2 className="text-lg font-bold text-white font-mono">Wallet Connection Required</h2>
        <p className="text-xs text-zinc-400">Please connect your Ethereum wallet to access the voting booth.</p>
        <button onClick={() => connectWallet(true)} className="px-6 py-2.5 rounded-lg bg-white hover:bg-zinc-200 text-black font-semibold text-xs border border-white">
          Connect MetaMask
        </button>
      </div>
    );
  }

  if (!voterStatus?.verified) {
    return (
      <div className="container max-w-md mx-auto py-24 px-4 text-center space-y-4">
        <ShieldAlert className="h-10 w-10 text-zinc-400 mx-auto" />
        <h2 className="text-lg font-bold text-white font-mono">Identity Verification Required</h2>
        <p className="text-xs text-zinc-400">You must verify your legal name and email OTP before entering the voting booth.</p>
        <Link href="/voter/verify" className="inline-block px-6 py-2.5 rounded-lg bg-white hover:bg-zinc-200 text-black font-semibold text-xs border border-white">
          Verify Identity Now
        </Link>
      </div>
    );
  }

  if (hasAlreadyVoted) {
    return (
      <div className="container max-w-lg mx-auto py-20 px-4 text-center space-y-6">
        <div className="h-14 w-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white mx-auto">
          <CheckCircle2 className="h-7 w-7 text-white" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white font-mono">You Have Already Voted</h2>
          <p className="text-xs text-zinc-400">
            One-wallet-one-vote rule is strictly enforced on-chain. Your ballot commitment has already been registered for this election.
          </p>
        </div>
        <Link
          href="/voter/success"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white font-semibold hover:border-zinc-500"
        >
          View Voting Receipt
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  if (!election || election.status !== "OPEN") {
    return (
      <div className="container max-w-md mx-auto py-24 px-4 text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-zinc-400 mx-auto" />
        <h2 className="text-lg font-bold text-white font-mono">
          {election?.status === "NOT_STARTED" ? "Voting Has Not Started Yet" : "Voting is Currently Closed"}
        </h2>
        <p className="text-xs text-zinc-400">
          The smart contract only accepts ballot commitments during the active election window.
        </p>
        <Link href="/voter/election" className="inline-block px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:text-white">
          Back to Election Overview
        </Link>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto py-12 px-4 md:px-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-5 rounded-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-700 font-bold">
              Official Ballot
            </span>
            <span className="text-xs text-zinc-300 font-mono font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-white" />
              Verified Voter: {voterStatus.name}
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-white font-mono">{election.title}</h1>
        </div>

        <CountdownTimer endTime={election.endTime} />
      </div>

      {txError && (
        <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs flex items-center gap-3 font-mono">
          <AlertCircle className="h-5 w-5 shrink-0 text-white" />
          <div className="space-y-0.5">
            <div className="font-bold text-white">Transaction Failed</div>
            <div>{txError}</div>
          </div>
        </div>
      )}

      {/* Transaction Progress Overlay / Modal */}
      {txStep !== "IDLE" && txStep !== "FAILED" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 animate-in fade-in">
          <div className="max-w-md w-full p-8 rounded-xl bg-zinc-950 border border-zinc-800 space-y-6 text-center">
            <div className="h-14 w-14 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-white">
              <Loader2 className="h-7 w-7 animate-spin text-white" />
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-bold text-white font-mono">
                {txStep === "PREPARING_ENCRYPTION" && "Encrypting Ballot Choice..."}
                {txStep === "WAITING_WALLET_SIGNATURE" && "Confirm in MetaMask"}
                {txStep === "MINING_BLOCKCHAIN" && "Recording On-Chain Commitment..."}
                {txStep === "SUCCESS" && "Vote Cast Successfully!"}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {txStep === "WAITING_WALLET_SIGNATURE" && "Please sign the transaction in your MetaMask wallet to commit your vote to the Ethereum blockchain."}
                {txStep === "MINING_BLOCKCHAIN" && "Waiting for Ethereum block confirmation. Do not close this window."}
              </p>
            </div>

            {txHash && (
              <div className="p-3 rounded-lg bg-black border border-zinc-800 text-xs font-mono text-zinc-400 truncate">
                Tx: {txHash}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Candidate Selection List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white font-mono">Select Exactly One Candidate</h2>
          <span className="text-xs text-zinc-500 font-mono">
            {selectedCandidateId ? "1 candidate selected" : "No candidate selected"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {candidates.map((c) => (
            <CandidateCard
              key={c.blockchainCandidateId}
              candidate={c}
              isSelected={selectedCandidateId === c.blockchainCandidateId}
              onSelect={(id) => setSelectedCandidateId(id)}
            />
          ))}
        </div>
      </div>

      {/* Action Footer */}
      <div className="sticky bottom-4 z-40 p-4 sm:p-5 rounded-xl bg-black border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs font-mono">
          {selectedCandidate ? (
            <div className="flex items-center gap-2 text-white">
              <span className="text-zinc-500">Your choice:</span>
              <span className="font-bold text-white">{selectedCandidate.name}</span>
              <span className="text-zinc-400">({selectedCandidate.party})</span>
            </div>
          ) : (
            <div className="text-zinc-500">Please select a candidate card above to proceed.</div>
          )}
        </div>

        <button
          type="button"
          onClick={handleInitiateVote}
          disabled={!selectedCandidateId || txStep !== "IDLE"}
          className="w-full sm:w-auto px-7 py-3 rounded-lg bg-white hover:bg-zinc-200 text-black font-semibold text-xs sm:text-sm border border-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Vote className="h-4 w-4 text-black" />
          Review & Cast Vote
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 animate-in fade-in">
          <div className="max-w-md w-full p-6 sm:p-7 rounded-xl bg-zinc-950 border border-zinc-800 space-y-6">
            <div className="h-11 w-11 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white mx-auto">
              <AlertCircle className="h-5 w-5" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-white font-mono">Confirm Your Vote Choice</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                You are about to cast your vote for{" "}
                <strong className="text-white font-bold">{selectedCandidate.name}</strong> (
                {selectedCandidate.party}). This action cannot be reversed once committed to the blockchain.
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-black border border-zinc-800 text-xs text-zinc-400 space-y-1 font-mono">
              <div className="flex justify-between">
                <span>Voter Name:</span>
                <span className="text-white font-medium">{voterStatus.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Wallet Address:</span>
                <span className="text-zinc-300">{address.substring(0, 8)}...</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCastBallot}
                className="px-5 py-2 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-bold border border-white transition-colors flex items-center gap-1.5"
              >
                <Vote className="h-3.5 w-3.5" />
                Confirm & Cast Vote
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
