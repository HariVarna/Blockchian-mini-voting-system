import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { encryptionService } from "../services/encryptionService";
import { otpService } from "../services/otpService";

export const ballotRouter = Router();

const prepareBallotSchema = z.object({
  electionId: z.string().uuid(),
  candidateId: z.number().int().positive(),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  otp: z.string().length(6).optional(),
});

const submitBallotSchema = z.object({
  electionId: z.string().uuid(),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  encryptedVote: z.string().min(10),
  ballotCommitment: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
});

// POST /api/ballots/prepare - Authenticates voter, encrypts choice, outputs on-chain commitment
ballotRouter.post("/prepare", async (req: Request, res: Response): Promise<void> => {
  try {
    const parse = prepareBallotSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.errors[0].message });
      return;
    }

    const { electionId, candidateId, walletAddress, otp } = parse.data;
    const lowerWallet = walletAddress.toLowerCase();

    // Check user exists and is verified
    const user = await prisma.user.findUnique({
      where: { walletAddress: lowerWallet },
    });

    if (!user || !user.emailVerified) {
      res.status(401).json({ error: "Identity verification required. Please verify your email first." });
      return;
    }

    // Verify OTP if provided
    if (otp) {
      const otpRes = await otpService.verifyOtp(user.email, otp);
      if (!otpRes.valid && !user.emailVerified) {
        res.status(400).json({ error: otpRes.message });
        return;
      }
    }

    // Check election exists
    const election = await prisma.election.findUnique({
      where: { id: electionId },
    });

    if (!election) {
      res.status(404).json({ error: "Election not found." });
      return;
    }

    // Prepare ballot plaintext payload: candidateId + random salt + timestamp
    const salt = Math.random().toString(36).substring(2, 15);
    const ballotPayload = JSON.stringify({
      electionId: election.blockchainElectionId,
      candidateId,
      salt,
      timestamp: Date.now(),
    });

    // Encrypt payload off-chain
    const encryptedVote = encryptionService.encryptBallot(ballotPayload);

    // Compute keccak256 commitment hash
    const ballotCommitment = encryptionService.computeBallotCommitment(encryptedVote);

    res.json({
      success: true,
      encryptedVote,
      ballotCommitment,
      message: "Ballot encrypted. Submit the commitment to the blockchain.",
    });
  } catch (error) {
    console.error("prepare ballot error:", error);
    res.status(500).json({ error: "Failed to prepare and encrypt ballot." });
  }
});

// POST /api/ballots/submit - Persist encrypted ballot metadata after on-chain transaction
ballotRouter.post("/submit", async (req: Request, res: Response): Promise<void> => {
  try {
    const parse = submitBallotSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.errors[0].message });
      return;
    }

    const { electionId, walletAddress, encryptedVote, ballotCommitment, txHash } = parse.data;
    const lowerWallet = walletAddress.toLowerCase();

    // Store ballot record
    const ballot = await prisma.ballot.create({
      data: {
        electionId,
        walletAddress: lowerWallet,
        encryptedVote,
        ballotCommitment,
        txHash,
        status: "RECORDED",
      },
    });

    res.status(201).json({
      success: true,
      message: "Encrypted ballot stored successfully.",
      ballotId: ballot.id,
      txHash: ballot.txHash,
    });
  } catch (error: any) {
    console.error("submit ballot error:", error);
    if (error.code === "P2002") {
      res.status(409).json({ error: "A ballot with this commitment hash already exists." });
      return;
    }
    res.status(500).json({ error: "Failed to submit ballot." });
  }
});

// GET /api/ballots/status/:walletAddress?electionId=...
ballotRouter.get("/status/:walletAddress", async (req: Request, res: Response): Promise<void> => {
  try {
    const { walletAddress } = req.params;
    const { electionId } = req.query;

    const ballot = await prisma.ballot.findFirst({
      where: {
        walletAddress: walletAddress.toLowerCase(),
        ...(electionId && typeof electionId === "string" ? { electionId } : {}),
      },
    });

    res.json({
      hasVoted: Boolean(ballot),
      ballot: ballot ? {
        id: ballot.id,
        txHash: ballot.txHash,
        ballotCommitment: ballot.ballotCommitment,
        createdAt: ballot.createdAt,
      } : null,
    });
  } catch (error) {
    console.error("ballot status error:", error);
    res.status(500).json({ error: "Failed to fetch ballot status." });
  }
});
