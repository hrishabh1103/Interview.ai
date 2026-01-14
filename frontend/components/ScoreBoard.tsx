"use client";

import React, { memo } from "react";
import { GlassCard } from "@/components/GlassCard";
import { motion } from "framer-motion";
import { SessionState } from "@/types";

interface ScoreBoardProps {
    scores: SessionState["scores"];
}

export const ScoreBoard = memo(function ScoreBoard({ scores }: ScoreBoardProps) {
    return (
        <GlassCard className="flex-1 p-6 space-y-6">
            <h3 className="font-bold text-lg border-b border-white/10 pb-4">Analysis</h3>
            {scores ? (
                <div className="space-y-6">
                    <ScoreItem label="Correctness" value={scores.correctness_score} />
                    <ScoreItem label="Depth" value={scores.depth_score} />
                    <ScoreItem label="Structure" value={scores.structure_score} />
                    <ScoreItem label="Communication" value={scores.communication_score} />
                </div>
            ) : (
                <div className="text-center text-zinc-500 py-10">
                    <p>AI is analyzing your responses...</p>
                </div>
            )}
        </GlassCard>
    );
});

function ScoreItem({ label, value }: { label: string, value: number }) {
    let color = "bg-red-500";
    if (value >= 7) color = "bg-green-400 shadow-[0_0_10px_#4ade80]";
    else if (value >= 4) color = "bg-amber-400";

    return (
        <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
                <span className="text-zinc-300">{label}</span>
                <span className="font-mono text-zinc-100">{value}/10</span>
            </div>
            <div className="h-2 w-full bg-zinc-900/50 rounded-full overflow-hidden border border-white/5">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${value * 10}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full ${color} rounded-full`}
                />
            </div>
        </div>
    );
}
