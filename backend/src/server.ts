import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { config } from "./config";
import { authRouter } from "./routes/authRoutes";
import { voterRouter } from "./routes/voterRoutes";
import { electionRouter } from "./routes/electionRoutes";
import { candidateRouter } from "./routes/candidateRoutes";
import { ballotRouter } from "./routes/ballotRoutes";
import { resultsRouter } from "./routes/resultsRoutes";
import { adminRouter } from "./routes/adminRoutes";
import { blockchainService } from "./services/blockchainService";

const app = express();

// Security middlewares
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use("/api/", globalLimiter);

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "blockchain-mini-voting-backend",
  });
});

// Mount modular routes
app.use("/api/auth", authRouter);
app.use("/api/voter", voterRouter);
app.use("/api/election", electionRouter);
app.use("/api/candidates", candidateRouter);
app.use("/api/ballots", ballotRouter);
app.use("/api/results", resultsRouter);
app.use("/api/admin", adminRouter);

// Sync blockchain state periodically
setInterval(() => {
  blockchainService.syncBlockchainState().catch((err) => {
    // Non-blocking sync log
  });
}, 15000);

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

app.listen(config.port, () => {
  console.log(`\n⚡ Voting System Backend Server listening on port ${config.port}`);
  console.log(`📡 Connected to RPC: ${config.blockchain.rpcUrl} (Chain ID: ${config.blockchain.chainId})`);
});

export default app;
