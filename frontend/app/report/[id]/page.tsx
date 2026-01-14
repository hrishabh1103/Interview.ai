"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getReport, getReportPdfUrl } from "@/lib/api";
import { ReportResponse } from "@/types";
import { BackgroundFX } from "@/components/BackgroundFX";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft, Home, Trophy, Target, TrendingUp, CheckCircle, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function ReportPage() {
    const params = useParams();
    const sessionId = params.id as string;
    const [data, setData] = useState<ReportResponse | null>(null);

    useEffect(() => {
        getReport(sessionId).then(setData).catch(console.error);
    }, [sessionId]);

    if (!data) return (
        <div className="flex min-h-screen items-center justify-center text-white relative overflow-hidden">
            <BackgroundFX />
            <div className="z-10 bg-zinc-900/50 p-6 rounded-xl border border-white/10 backdrop-blur-md">
                Generating Detailed Report...
            </div>
        </div>
    );

    const { report } = data;

    return (
        <div className="min-h-screen text-zinc-50 relative overflow-hidden bg-zinc-950">
            <BackgroundFX />

            <div className="relative z-10 container mx-auto px-4 py-8 max-w-5xl space-y-8 pb-20">
                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <Button variant="ghost" className="mb-2 text-zinc-400 pl-0 hover:text-white" asChild>
                            <a href="/"><Home className="w-4 h-4 mr-2" /> Back to Home</a>
                        </Button>
                        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            Interview Analysis
                        </h1>
                        <p className="text-zinc-500 text-sm mt-1 font-mono uppercase tracking-wider">Session ID: {sessionId.slice(0, 8)}</p>
                    </div>
                    <div className="flex flex-col items-end">
                        <div className="flex items-baseline gap-2">
                            <span className="text-6xl font-bold bg-white/5 p-2 rounded-lg backdrop-blur-sm border border-white/10 shadow-xl">
                                {report.overall_score}
                            </span>
                            <span className="text-2xl text-zinc-500 font-light">/10</span>
                        </div>
                        <span className="text-sm text-zinc-400 mt-1 uppercase tracking-widest font-bold">Overall Score</span>
                    </div>
                </header>

                <div className="flex gap-4">
                    <Button asChild className="bg-white text-zinc-900 hover:bg-zinc-200">
                        <a href={getReportPdfUrl(sessionId)} target="_blank">
                            <Download className="w-4 h-4 mr-2" /> Download PDF Report
                        </a>
                    </Button>
                </div>

                {/* Score Breakdown Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Category Scores */}
                    <GlassCard className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-bold">Performance Metrics</h2>
                        </div>

                        <div className="space-y-5">
                            {Object.entries(report.category_scores).map(([cat, score]) => (
                                <div key={cat} className="space-y-1">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="capitalize font-medium text-zinc-300">{cat.replace('_', ' ')}</span>
                                        <span className="font-mono text-zinc-400">{score}/10</span>
                                    </div>
                                    <div className="h-2 w-full bg-zinc-900/50 rounded-full overflow-hidden border border-white/5">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${score * 10}%` }}
                                            transition={{ duration: 1 }}
                                            className={`h-full rounded-full ${score >= 7 ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' :
                                                    score >= 4 ? 'bg-amber-500' : 'bg-red-500'
                                                }`}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </GlassCard>

                    {/* 7-Day Plan */}
                    <GlassCard className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                                <Target className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-bold">Improvement Roadmap</h2>
                        </div>
                        <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {report.improvement_plan_7_days.map((item, i) => (
                                <div key={i} className="flex gap-4 p-3 rounded-lg bg-zinc-900/30 border border-white/5">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-900/30 border border-purple-500/30 flex items-center justify-center font-bold text-purple-300 text-sm">
                                        {i + 1}
                                    </div>
                                    <p className="text-sm text-zinc-300 pt-1 leading-relaxed">{item}</p>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                </div>

                {/* Strengths & Weaknesses */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <GlassCard className="p-6 border-b-green-500/20">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-green-500/10 rounded-lg text-green-400">
                                <Trophy className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-bold text-green-400">Key Strengths</h3>
                        </div>
                        <ul className="space-y-3">
                            {report.strengths.map((s, i) => (
                                <li key={i} className="flex gap-3 text-sm text-zinc-300 items-start">
                                    <CheckCircle className="w-4 h-4 text-green-500/50 mt-0.5 flex-shrink-0" />
                                    <span>{s}</span>
                                </li>
                            ))}
                        </ul>
                    </GlassCard>

                    <GlassCard className="p-6 border-b-red-500/20">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-red-500/10 rounded-lg text-red-400">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-bold text-red-400">Areas to Improve</h3>
                        </div>
                        <ul className="space-y-3">
                            {report.weaknesses.map((w, i) => (
                                <li key={i} className="flex gap-3 text-sm text-zinc-300 items-start">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500/50 mt-1.5 flex-shrink-0" />
                                    <span>{w}</span>
                                </li>
                            ))}
                        </ul>
                    </GlassCard>
                </div>

                {/* Improved Answers */}
                {report.improved_answers && report.improved_answers.length > 0 && (
                    <GlassCard className="p-6">
                        <h3 className="text-xl font-bold mb-6">Model Answers for Weakest Areas</h3>
                        <div className="space-y-6">
                            {report.improved_answers.map((item, i) => (
                                <div key={i} className="space-y-2">
                                    {Object.entries(item).map(([k, v]) => (
                                        <div key={k} className="p-4 bg-zinc-900/50 border border-white/5 rounded-xl">
                                            <div className="text-xs text-zinc-500 font-mono mb-2 uppercase tracking-wide">Question Context: {k}</div>
                                            <div className="text-sm text-zinc-300 leading-relaxed border-l-2 border-green-500/30 pl-4">
                                                {v}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                )}
            </div>
        </div>
    );
}
