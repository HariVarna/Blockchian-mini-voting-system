import React from "react";
import Link from "next/link";
import { Vote } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-zinc-800 bg-black mt-auto py-6 px-4 md:px-8 text-xs text-zinc-500 font-mono">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-white font-bold">
          <Vote className="h-4 w-4 text-white" />
          <span>VoteSphere</span>
        </div>

        <div className="flex items-center gap-6 text-[11px] text-zinc-400">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <Link href="/voter" className="hover:text-white transition-colors">Voter</Link>
          <Link href="/voter/election" className="hover:text-white transition-colors">Election</Link>
          <Link href="/admin/login" className="hover:text-white transition-colors">Admin</Link>
        </div>

        <div className="text-[11px] text-zinc-600">
          © {new Date().getFullYear()} VoteSphere
        </div>
      </div>
    </footer>
  );
};

