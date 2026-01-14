import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BackgroundFX } from "@/components/BackgroundFX";
import { GlassCard } from "@/components/GlassCard";
import { Mic, Video, FileText, ArrowRight, BrainCircuit } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-zinc-50 relative overflow-hidden">
      <BackgroundFX />

      <div className="z-10 container mx-auto px-4 py-20 flex flex-col items-center text-center space-y-8">
        {/* Creating a glow behind the title */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-500/20 blur-[100px] rounded-full -z-10" />

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 text-xs font-medium backdrop-blur-sm mb-4">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          AI-Powered Interview Coach
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight pb-2">
          Master Your <br />
          <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
            Remote Interview
          </span>
        </h1>

        <p className="text-xl text-zinc-400 max-w-2xl leading-relaxed">
          Experience the future of interview preparation. Realistic 3D environment,
          real-time AI feedback, and personalized voice coaching tailored to your resume.
        </p>

        <div className="flex gap-4 pt-4">
          <Link href="/setup">
            <Button size="lg" className="rounded-full px-8 h-14 text-lg bg-blue-600 hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.3)]">
              Start New Session <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mt-20 text-left">
          <GlassCard className="p-6 hover:bg-white/5 transition-colors">
            <div className="w-12 h-12 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-400 mb-4">
              <Video className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Simulated Reality</h3>
            <p className="text-zinc-400 text-sm">Use your webcam and mic in a realistic 3D-styled environment to build confidence.</p>
          </GlassCard>

          <GlassCard className="p-6 hover:bg-white/5 transition-colors">
            <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center text-purple-400 mb-4">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">AI Analysis</h3>
            <p className="text-zinc-400 text-sm">Receive instant, detailed feedback on your correctness, depth, and communication style.</p>
          </GlassCard>

          <GlassCard className="p-6 hover:bg-white/5 transition-colors">
            <div className="w-12 h-12 rounded-lg bg-emerald-600/20 flex items-center justify-center text-emerald-400 mb-4">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Resume Tailored</h3>
            <p className="text-zinc-400 text-sm">Questions are uniquely generated based on your uploaded resume and target role.</p>
          </GlassCard>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 text-zinc-600 text-xs text-center w-full">
        © 2024 Interviewer.AI. Built for High Performance.
      </div>
    </div>
  );
}
