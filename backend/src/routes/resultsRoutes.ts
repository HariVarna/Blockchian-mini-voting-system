import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { encryptionService } from "../services/encryptionService";
import { blockchainService } from "../services/blockchainService";

export const resultsRouter = Router();

const tallySchema = z.object({
  electionId: z.string().uuid(),
});

const publishResultSchema = z.object({
  electionId: z.string().uuid(),
  resultHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  winnerCandidateId: z.number().int().optional(),
  isTie: z.boolean(),
  totalVotes: z.number().int(),
  candidateCounts: z.record(z.string(), z.number()),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
});

// GET /api/results/:electionId
resultsRouter.get("/:electionId", async (req: Request, res: Response): Promise<void> => {
  try {
    const { electionId } = req.params;

    const result = await prisma.result.findUnique({
      where: { electionId },
      include: {
        election: {
          include: { candidates: true },
        },
      },
    });

    if (!result) {
      res.status(404).json({ error: "Results have not been published yet for this election." });
      return;
    }

    const candidateCounts = JSON.parse(result.candidateCountsJson);
    const candidateResults = result.election.candidates.map((c) => {
      const votes = candidateCounts[c.blockchainCandidateId] || 0;
      const percentage = result.totalVotes > 0 ? ((votes / result.totalVotes) * 100).toFixed(1) : "0.0";
      return {
        candidateId: c.blockchainCandidateId,
        name: c.name,
        party: c.party,
        imageUrl: c.imageUrl,
        votes,
        percentage: parseFloat(percentage),
      };
    });

    res.json({
      electionId: result.electionId,
      electionTitle: result.election.title,
      totalVotes: result.totalVotes,
      winnerCandidateId: result.winnerCandidateId,
      isTie: result.isTie,
      resultHash: result.resultHash,
      publishedOnChain: result.publishedOnChain,
      txHash: result.txHash,
      candidates: candidateResults,
    });
  } catch (error) {
    console.error("fetch results error:", error);
    res.status(500).json({ error: "Failed to fetch election results." });
  }
});

// POST /api/results/tally - Admin tallying pipeline
resultsRouter.post("/tally", async (req: Request, res: Response): Promise<void> => {
  try {
    const parse = tallySchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.errors[0].message });
      return;
    }

    const { electionId } = parse.data;

    const election = await prisma.election.findUnique({
      where: { id: electionId },
      include: {
        candidates: true,
        ballots: true,
      },
    });

    if (!election) {
      res.status(404).json({ error: "Election not found." });
      return;
    }

    // Tally encrypted ballots
    const counts: Record<number, number> = {};
    for (const c of election.candidates) {
      counts[c.blockchainCandidateId] = 0;
    }

    let validBallotsCount = 0;
    for (const ballot of election.ballots) {
      try {
        const decryptedStr = encryptionService.decryptBallot(ballot.encryptedVote);
        const parsed = JSON.parse(decryptedStr);
        const candidateId = Number(parsed.candidateId);
        if (counts[candidateId] !== undefined) {
          counts[candidateId] += 1;
        } else {
          counts[candidateId] = 1;
        }
        validBallotsCount++;
      } catch (err) {
        console.error(`Failed to decrypt ballot ${ballot.id}:`, err);
      }
    }

    // Determine highest vote count & winner / tie
    let highestVotes = -1;
    let winnerId: number | null = null;
    let isTie = false;

    const tallyArray = Object.entries(counts).map(([cid, v]) => ({
      candidateId: Number(cid),
      votes: v,
    }));

    for (const item of tallyArray) {
      if (item.votes > highestVotes) {
        highestVotes = item.votes;
        winnerId = item.candidateId;
        isTie = false;
      } else if (item.votes === highestVotes && highestVotes > 0) {
        isTie = true;
      }
    }

    // If all candidates have 0 votes, treat as tie or no winner
    if (highestVotes === 0 && tallyArray.length > 1) {
      isTie = true;
      winnerId = null;
    }

    const resultHash = encryptionService.computeResultHash(election.blockchainElectionId, tallyArray);

    const detailedCandidates = election.candidates.map((c) => {
      const votes = counts[c.blockchainCandidateId] || 0;
      const percentage = validBallotsCount > 0 ? ((votes / validBallotsCount) * 100).toFixed(1) : "0.0";
      return {
        candidateId: c.blockchainCandidateId,
        name: c.name,
        party: c.party,
        imageUrl: c.imageUrl,
        votes,
        percentage: parseFloat(percentage),
      };
    });

    res.json({
      success: true,
      electionId: election.id,
      blockchainElectionId: election.blockchainElectionId,
      totalVotes: validBallotsCount,
      winnerCandidateId: isTie ? 0 : (winnerId || 0),
      isTie,
      resultHash,
      candidateCounts: counts,
      candidates: detailedCandidates,
    });
  } catch (error) {
    console.error("tally results error:", error);
    res.status(500).json({ error: "Failed to compute results tally." });
  }
});

// POST /api/results/publish - Persist finalized results
resultsRouter.post("/publish", async (req: Request, res: Response): Promise<void> => {
  try {
    const parse = publishResultSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.errors[0].message });
      return;
    }

    const { electionId, resultHash, winnerCandidateId, isTie, totalVotes, candidateCounts, txHash } = parse.data;

    const result = await prisma.result.upsert({
      where: { electionId },
      update: {
        resultHash,
        winnerCandidateId: isTie ? null : winnerCandidateId,
        isTie,
        candidateCountsJson: JSON.stringify(candidateCounts),
        totalVotes,
        publishedOnChain: Boolean(txHash),
        txHash: txHash || null,
      },
      create: {
        electionId,
        resultHash,
        winnerCandidateId: isTie ? null : winnerCandidateId,
        isTie,
        candidateCountsJson: JSON.stringify(candidateCounts),
        totalVotes,
        publishedOnChain: Boolean(txHash),
        txHash: txHash || null,
      },
    });

    // Update election status
    await prisma.election.update({
      where: { id: electionId },
      data: { status: "RESULTS_PUBLISHED" },
    });

    res.json({
      success: true,
      message: "Results recorded and published.",
      result,
    });
  } catch (error) {
    console.error("publish results error:", error);
    res.status(500).json({ error: "Failed to publish results." });
  }
});
