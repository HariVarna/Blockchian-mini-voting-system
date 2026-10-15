import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { blockchainService } from "../services/blockchainService";

export const electionRouter = Router();

const createElectionSchema = z.object({
  blockchainElectionId: z.number().int().positive().optional(),
  title: z.string().min(3).max(100),
  description: z.string().min(5).max(1000),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  status: z.enum(["NOT_STARTED", "OPEN", "CLOSED", "RESULTS_PUBLISHED", "PAUSED"]).optional(),
});

// GET /api/election/current - Get current active or latest election
electionRouter.get("/current", async (req: Request, res: Response): Promise<void> => {
  try {
    const election = await prisma.election.findFirst({
      orderBy: { createdAt: "desc" },
      include: {
        candidates: true,
        results: true,
        ballots: true,
      },
    });

    if (!election) {
      res.status(404).json({ error: "No election configured yet." });
      return;
    }

    // Attempt to sync with on-chain state if available
    const onChain = await blockchainService.getOnChainElectionDetails(election.blockchainElectionId);
    let status = election.status;
    let onChainTotalVotes = election.ballots?.length || 0;

    const now = new Date();
    const end = new Date(election.endTime);
    const start = new Date(election.startTime);

    if (election.status === "RESULTS_PUBLISHED") {
      status = "RESULTS_PUBLISHED";
    } else if (election.status === "CLOSED") {
      status = "CLOSED";
    } else if (election.status === "PAUSED") {
      status = "PAUSED";
    } else if (now >= end) {
      status = "CLOSED";
    } else if (election.status === "OPEN" || (now >= start && now < end)) {
      status = "OPEN";
    } else {
      status = "NOT_STARTED";
    }

    if (onChain) {
      const stateMap = ["NOT_CREATED", "NOT_STARTED", "OPEN", "CLOSED", "RESULTS_PUBLISHED", "PAUSED"];
      const onChainStatus = stateMap[onChain.state];
      if (onChainStatus === "RESULTS_PUBLISHED" || onChainStatus === "PAUSED") {
        status = onChainStatus;
      } else if (onChainStatus === "OPEN") {
        status = "OPEN";
      }
      onChainTotalVotes = onChain.totalVotesCast || onChainTotalVotes;
    }

    res.json({
      ...election,
      status,
      totalVotesCast: onChainTotalVotes,
      onChainDetails: onChain,
    });
  } catch (error) {
    console.error("fetch current election error:", error);
    res.status(500).json({ error: "Failed to fetch election." });
  }
});

// GET /api/election/list
electionRouter.get("/list", async (_req: Request, res: Response): Promise<void> => {
  try {
    const elections = await prisma.election.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        candidates: true,
        results: true,
        _count: {
          select: { ballots: true },
        },
      },
    });
    res.json(elections);
  } catch (error) {
    console.error("fetch election list error:", error);
    res.status(500).json({ error: "Failed to fetch elections list." });
  }
});

// POST /api/election - Create new election in off-chain database
electionRouter.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const parse = createElectionSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.errors[0].message });
      return;
    }

    const { title, description, startTime, endTime, status } = parse.data;
    let blockchainElectionId = parse.data.blockchainElectionId;

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      res.status(400).json({ error: "Start time must be before end time." });
      return;
    }

    // Auto-calculate unique blockchainElectionId if not provided or collision
    if (!blockchainElectionId) {
      const maxEl = await prisma.election.findFirst({
        orderBy: { blockchainElectionId: "desc" },
      });
      blockchainElectionId = maxEl ? maxEl.blockchainElectionId + 1 : 1;
    } else {
      const exists = await prisma.election.findUnique({
        where: { blockchainElectionId },
      });
      if (exists) {
        const maxEl = await prisma.election.findFirst({
          orderBy: { blockchainElectionId: "desc" },
        });
        blockchainElectionId = maxEl ? maxEl.blockchainElectionId + 1 : blockchainElectionId + 1;
      }
    }

    const now = new Date();
    const initialStatus = status || (start <= now && now < end ? "OPEN" : "OPEN");

    const election = await prisma.election.create({
      data: {
        blockchainElectionId,
        title,
        description,
        startTime: start,
        endTime: end,
        status: initialStatus,
      },
    });

    res.status(201).json(election);
  } catch (error: any) {
    console.error("create election error:", error);
    if (error.code === "P2002") {
      res.status(409).json({ error: "An election with this blockchain ID already exists." });
      return;
    }
    res.status(500).json({ error: "Failed to create election." });
  }
});

// PUT /api/election/:id/open - Open an election for voting
electionRouter.put("/:id/open", async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const election = await prisma.election.findUnique({ where: { id } });
    if (!election) {
      res.status(404).json({ error: "Election not found." });
      return;
    }

    const now = new Date();
    let endTime = election.endTime;
    // If end time already expired, extend by 3 days
    if (now >= new Date(endTime)) {
      endTime = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    }

    const updated = await prisma.election.update({
      where: { id },
      data: {
        status: "OPEN",
        startTime: new Date(now.getTime() - 1000 * 60), // started 1 min ago
        endTime,
      },
    });

    res.json({ success: true, message: "Election opened successfully for active voting!", election: updated });
  } catch (error) {
    console.error("open election error:", error);
    res.status(500).json({ error: "Failed to open election." });
  }
});

// PUT /api/election/:id/status
electionRouter.put("/:id/status", async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ["NOT_STARTED", "OPEN", "CLOSED", "RESULTS_PUBLISHED", "PAUSED"];
    if (!allowed.includes(status)) {
      res.status(400).json({ error: "Invalid status value." });
      return;
    }

    const updated = await prisma.election.update({
      where: { id },
      data: { status },
    });

    res.json(updated);
  } catch (error) {
    console.error("update election status error:", error);
    res.status(500).json({ error: "Failed to update election status." });
  }
});

// PUT /api/election/:id/close - Close an election
electionRouter.put("/:id/close", async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const election = await prisma.election.findUnique({ where: { id } });
    if (!election) {
      res.status(404).json({ error: "Election not found." });
      return;
    }

    const updated = await prisma.election.update({
      where: { id },
      data: { status: "CLOSED" },
    });

    res.json({ success: true, message: "Election closed successfully.", election: updated });
  } catch (error) {
    console.error("close election error:", error);
    res.status(500).json({ error: "Failed to close election." });
  }
});

// DELETE /api/election/:id - Delete election and cascaded data
electionRouter.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const election = await prisma.election.findUnique({
      where: { id },
    });

    if (!election) {
      res.status(404).json({ error: "Election not found." });
      return;
    }

    await prisma.election.delete({
      where: { id },
    });

    res.json({ success: true, message: `Election '${election.title}' and associated records were deleted successfully.` });
  } catch (error) {
    console.error("delete election error:", error);
    res.status(500).json({ error: "Failed to delete election." });
  }
});
