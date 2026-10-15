"use client";

import React, { useState, useRef, useEffect } from "react";
import { Mail, KeyRound, ArrowRight, RefreshCw, X, AlertCircle } from "lucide-react";

interface OtpModalProps {
  email: string;
  isOpen: boolean;
  onClose: () => void;
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
  title?: string;
  subtitle?: string;
  devOtpPreview?: string | null;
}

export const OtpModal: React.FC<OtpModalProps> = ({
  email,
  isOpen,
  onClose,
  onVerify,
  onResend,
  title = "Enter Security OTP",
  subtitle = "We have sent a 6-digit one-time verification code to your registered email.",
  devOtpPreview,
}) => {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isOpen) {
      setDigits(["", "", "", "", "", ""]);
      setError(null);
      setCooldown(60);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 150);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, cooldown]);

  if (!isOpen) return null;

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value.substring(value.length - 1);
    setDigits(newDigits);
    setError(null);

    // Auto move focus to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted) {
      const newDigits = [...digits];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || "";
      }
      setDigits(newDigits);
      const nextFocus = Math.min(pasted.length, 5);
      inputRefs.current[nextFocus]?.focus();
    }
  };

  const fullOtp = digits.join("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fullOtp.length !== 6) {
      setError("Please enter all 6 digits of the OTP.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onVerify(fullOtp);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to verify OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendClick = async () => {
    if (cooldown > 0) return;
    setError(null);
    try {
      await onResend();
      setCooldown(60);
    } catch (err: any) {
      setError(err.message || "Failed to resend OTP.");
    }
  };

  const handleAutoFillDevOtp = (code: string) => {
    const chars = code.split("").slice(0, 6);
    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = chars[i] || "";
    }
    setDigits(newDigits);
    setError(null);
    inputRefs.current[5]?.focus();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-xl bg-zinc-950 border border-zinc-800 p-6 sm:p-8 space-y-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1 text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center space-y-2">
          <div className="mx-auto h-11 w-11 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
            <KeyRound className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-bold text-white font-mono">{title}</h2>
          <p className="text-xs text-zinc-400">{subtitle}</p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-black border border-zinc-800 text-xs font-mono text-zinc-300">
            <Mail className="h-3.5 w-3.5 text-zinc-400" />
            {email}
          </div>
        </div>

        {devOtpPreview && (
          <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs flex items-center justify-between font-mono">
            <span className="text-zinc-400">Dev Code:</span>
            <button
              type="button"
              onClick={() => handleAutoFillDevOtp(devOtpPreview)}
              className="px-2.5 py-1 rounded bg-black border border-zinc-600 hover:border-white text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
              title="Click to auto-fill"
            >
              <span>{devOtpPreview}</span>
              <span className="text-[10px] text-zinc-400 font-normal">(Auto-fill)</span>
            </button>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs flex items-center gap-2 font-mono">
            <AlertCircle className="h-4 w-4 shrink-0 text-white" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputRefs.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="h-12 w-11 sm:h-13 sm:w-12 text-center text-lg sm:text-xl font-mono font-bold rounded-lg bg-black border border-zinc-800 text-white focus:border-white focus:ring-1 focus:ring-white focus:outline-none transition-all"
              />
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-500 font-mono">
            <span>Valid for 10 min</span>
            <button
              type="button"
              onClick={handleResendClick}
              disabled={cooldown > 0}
              className={`flex items-center gap-1 font-medium transition-colors ${
                cooldown > 0 ? "text-zinc-600 cursor-not-allowed" : "text-zinc-300 hover:text-white"
              }`}
            >
              <RefreshCw className={`h-3 w-3 ${cooldown > 0 ? "" : "hover:rotate-180 transition-transform"}`} />
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend Code"}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || fullOtp.length !== 6}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs sm:text-sm font-semibold border border-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Verifying..." : "Verify & Continue"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
