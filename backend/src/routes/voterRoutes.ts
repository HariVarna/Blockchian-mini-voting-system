import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { otpService } from "../services/otpService";

export const voterRouter = Router();

const voterRegisterSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum wallet address"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email(),
  otp: z.string().length(6),
});

// POST /api/voter/register - Completes OTP challenge and binds identity to wallet
voterRouter.post("/register", async (req: Request, res: Response): Promise<void> => {
  try {
    const parse = voterRegisterSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.errors[0].message });
      return;
    }

    const { walletAddress, name, email, otp } = parse.data;
    const lowerWallet = walletAddress.toLowerCase();
    const cleanEmail = email.toLowerCase().trim();

    // Verify OTP first
    const otpResult = await otpService.verifyOtp(cleanEmail, otp);
    if (!otpResult.valid) {
      res.status(400).json({ error: otpResult.message });
      return;
    }

    // Upsert User in database
    const user = await prisma.user.upsert({
      where: { walletAddress: lowerWallet },
      update: {
        name,
        email: cleanEmail,
        emailVerified: true,
      },
      create: {
        walletAddress: lowerWallet,
        name,
        email: cleanEmail,
        emailVerified: true,
      },
    });

    res.json({
      success: true,
      message: "Voter identity verified successfully.",
      user: {
        walletAddress: user.walletAddress,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    console.error("voter register error:", error);
    res.status(500).json({ error: "Failed to register voter identity." });
  }
});

// GET /api/voter/status/:walletAddress
voterRouter.get("/status/:walletAddress", async (req: Request, res: Response): Promise<void> => {
  try {
    const { walletAddress } = req.params;
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/i.test(walletAddress)) {
      res.status(400).json({ error: "Invalid wallet address format." });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
    });

    if (!user) {
      res.json({
        verified: false,
        walletAddress: walletAddress.toLowerCase(),
      });
      return;
    }

    res.json({
      verified: user.emailVerified,
      walletAddress: user.walletAddress,
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    console.error("voter status error:", error);
    res.status(500).json({ error: "Failed to fetch voter status." });
  }
});
