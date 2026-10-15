import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db";

export const candidateRouter = Router();

const defaultAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400";

const candidateSchema = z.object({
  electionId: z.string().optional(),
  blockchainCandidateId: z.number().int().positive().optional(),
  name: z.string().min(1, "Candidate name is required").max(100),
  party: z.string().min(1, "Party affiliation is required").max(100),
  imageUrl: z.string().optional().default(defaultAvatar),
  slogan: z.string().max(200, "Slogan must be under 200 characters").optional().default(""),
  policyStatement: z.string().max(1000, "Policy statement must be under 1000 characters").optional().default(""),
  manifestoUrl: z.string().optional().nullable(),
});

// GET /api/candidates?electionId=...
candidateRouter.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { electionId } = req.query;

    let query: any = {};
    if (electionId && typeof electionId === "string") {
      query.electionId = electionId;
    }

    const candidates = await prisma.candidate.findMany({
      where: query,
      orderBy: { blockchainCandidateId: "asc" },
    });

    res.json(candidates);
  } catch (error) {
    console.error("fetch candidates error:", error);
    res.status(500).json({ error: "Failed to fetch candidates." });
  }
});

// POST /api/candidates - Add new candidate
candidateRouter.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const parse = candidateSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.errors[0].message });
      return;
    }

    const data = parse.data;

    // Find electionId if not provided
    let electionId = data.electionId;
    if (!electionId) {
      const activeElection = await prisma.election.findFirst({
        orderBy: { createdAt: "desc" },
      });
      if (!activeElection) {
        res.status(400).json({ error: "No active election found. Please create an election first." });
        return;
      }
      electionId = activeElection.id;
    }

    // Auto-calculate blockchainCandidateId if not provided or if duplicate
    let candidateId = data.blockchainCandidateId;
    if (!candidateId) {
      const lastCandidate = await prisma.candidate.findFirst({
        where: { electionId },
        orderBy: { blockchainCandidateId: "desc" },
      });
      candidateId = lastCandidate ? lastCandidate.blockchainCandidateId + 1 : 1;
    } else {
      // If provided ID already exists, auto-increment to avoid crash
      const existing = await prisma.candidate.findUnique({
        where: {
          electionId_blockchainCandidateId: {
            electionId,
            blockchainCandidateId: candidateId,
          },
        },
      });
      if (existing) {
        const lastCandidate = await prisma.candidate.findFirst({
          where: { electionId },
          orderBy: { blockchainCandidateId: "desc" },
        });
        candidateId = lastCandidate ? lastCandidate.blockchainCandidateId + 1 : candidateId + 1;
      }
    }

    const safeImageUrl = data.imageUrl && data.imageUrl.trim().length > 0 ? data.imageUrl.trim() : defaultAvatar;
    const safeSlogan = data.slogan && data.slogan.trim().length > 0 ? data.slogan.trim() : "Dedicated to Transparent Governance & Service";
    const safePolicy = data.policyStatement && data.policyStatement.trim().length > 0 ? data.policyStatement.trim() : "Advancing open governance, integrity, and verified outcomes.";

    const candidate = await prisma.candidate.create({
      data: {
        electionId,
        blockchainCandidateId: candidateId,
        name: data.name.trim(),
        party: data.party.trim(),
        imageUrl: safeImageUrl,
        slogan: safeSlogan,
        policyStatement: safePolicy,
        manifestoUrl: data.manifestoUrl?.trim() || null,
      },
    });

    res.status(201).json(candidate);
  } catch (error: any) {
    console.error("create candidate error:", error);
    if (error.code === "P2002") {
      res.status(409).json({ error: "A candidate with this ID already exists for this election." });
      return;
    }
    res.status(500).json({ error: error.message || "Failed to add candidate." });
  }
});

// PUT /api/candidates/:id - Edit candidate
candidateRouter.put("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateSchema = candidateSchema.omit({ electionId: true, blockchainCandidateId: true }).partial();
    const parse = updateSchema.safeParse(req.body);

    if (!parse.success) {
      res.status(400).json({ error: parse.error.errors[0].message });
      return;
    }

    const updated = await prisma.candidate.update({
      where: { id },
      data: parse.data,
    });

    res.json(updated);
  } catch (error: any) {
    console.error("update candidate error:", error);
    res.status(500).json({ error: error.message || "Failed to update candidate." });
  }
});

// DELETE /api/candidates/:id - Delete candidate
candidateRouter.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.candidate.delete({
      where: { id },
    });
    res.json({ success: true, message: "Candidate deleted successfully." });
  } catch (error: any) {
    console.error("delete candidate error:", error);
    res.status(500).json({ error: error.message || "Failed to delete candidate." });
  }
});
