"use client";

import { GlassCard } from "@/components/GlassCard";
import { cn } from "@/lib/utils";
import { FileText } from "lucide-react";

interface QuestionCardProps {
    questionNumber: string | number;
    questionText: string;
    isFollowUp: boolean;
    className?: string;
}

export function QuestionCard({ questionNumber, questionText, isFollowUp, className }: QuestionCardProps) {
    return (
        <GlassCard className={cn("flex flex-col p-0 overflow-hidden min-h-0 shrink-0", className)}>
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/10 bg-white/5 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <span className="font-bold text-sm">Question {questionNumber}</span>
                </div>
                {isFollowUp && (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 uppercase tracking-wide">
                        Follow-up
                    </span>
                )}
            </div>

            {/* Scrollable Body */}
            <div className="p-4 overflow-y-auto max-h-[120px] overscroll-contain relative scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                <p className="text-lg font-medium leading-relaxed text-zinc-100">
                    {questionText}
                </p>
            </div>
        </GlassCard>
    );
}
