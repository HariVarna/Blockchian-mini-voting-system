"use client";

import React, { useState, useEffect } from "react";
import { formatTimeRemaining } from "@/lib/utils";
import { Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

interface CountdownTimerProps {
  endTime: string | Date;
  onEnded?: () => void;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ endTime, onEnded }) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isEnded: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isEnded: false });

  useEffect(() => {
    const targetDate = new Date(endTime).getTime();

    const calculate = () => {
      const diff = targetDate - Date.now();
      const res = formatTimeRemaining(diff);
      setTimeLeft(res);
      if (res.isEnded && onEnded) {
        onEnded();
      }
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [endTime, onEnded]);

  if (timeLeft.isEnded) {
    return (
      <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-mono font-semibold">
        <AlertTriangle className="h-3.5 w-3.5 text-zinc-400" />
        <span>Voting Window Ended</span>
      </div>
    );
  }

  const format2 = (n: number) => n.toString().padStart(2, "0");

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex items-center gap-1.5 text-xs text-zinc-400 mr-1 font-mono">
        <Clock className="h-3.5 w-3.5 text-white animate-pulse" />
        <span className="hidden sm:inline">Closes in:</span>
      </div>
      <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-white">
        <div className="flex flex-col items-center justify-center h-11 w-11 rounded-lg bg-black border border-zinc-800">
          <span className="text-sm text-white font-bold">{format2(timeLeft.days)}</span>
          <span className="text-[8px] text-zinc-500 uppercase font-sans">Days</span>
        </div>
        <span className="text-zinc-600 font-bold">:</span>
        <div className="flex flex-col items-center justify-center h-11 w-11 rounded-lg bg-black border border-zinc-800">
          <span className="text-sm text-white font-bold">{format2(timeLeft.hours)}</span>
          <span className="text-[8px] text-zinc-500 uppercase font-sans">Hrs</span>
        </div>
        <span className="text-zinc-600 font-bold">:</span>
        <div className="flex flex-col items-center justify-center h-11 w-11 rounded-lg bg-black border border-zinc-800">
          <span className="text-sm text-white font-bold">{format2(timeLeft.minutes)}</span>
          <span className="text-[8px] text-zinc-500 uppercase font-sans">Min</span>
        </div>
        <span className="text-zinc-600 font-bold">:</span>
        <div className="flex flex-col items-center justify-center h-11 w-11 rounded-lg bg-black border border-zinc-800">
          <span className="text-sm text-white font-bold">{format2(timeLeft.seconds)}</span>
          <span className="text-[8px] text-zinc-500 uppercase font-sans">Sec</span>
        </div>
      </div>
    </div>
  );
};
