import { Router, Request, Response } from "express";
import { z } from "zod";
import { otpService } from "../services/otpService";

export const authRouter = Router();

const requestOtpSchema = z.object({
  email: z.string().email(),
});

const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

// POST /api/auth/request-otp
authRouter.post("/request-otp", async (req: Request, res: Response): Promise<void> => {
  try {
    const parse = requestOtpSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: "Invalid email format." });
      return;
    }

    const { email } = parse.data;
    const result = await otpService.createOtpChallenge(email);

    if (!result.success) {
      res.status(429).json({ error: result.message });
      return;
    }

    res.json({
      message: result.message,
      devOtpPreview: result.otpPreviewForDev,
    });
  } catch (error) {
    console.error("request-otp error:", error);
    res.status(500).json({ error: "Failed to generate OTP challenge." });
  }
});

// POST /api/auth/verify-otp
authRouter.post("/verify-otp", async (req: Request, res: Response): Promise<void> => {
  try {
    const parse = verifyOtpSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: "Invalid input. Email and 6-digit OTP are required." });
      return;
    }

    const { email, otp } = parse.data;
    const result = await otpService.verifyOtp(email, otp);

    if (!result.valid) {
      res.status(400).json({ error: result.message });
      return;
    }

    res.json({ success: true, message: result.message });
  } catch (error) {
    console.error("verify-otp error:", error);
    res.status(500).json({ error: "Failed to verify OTP." });
  }
});
