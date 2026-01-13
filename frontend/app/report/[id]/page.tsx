"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getReport, getReportPdfUrl } from "@/lib/api";
import { ReportResponse } from "@/types";

export default function ReportPage() {
    const params = useParams();
    const sessionId = params.id as string;
    const [data, setData] = useState<ReportResponse | null>(null);

    useEffect(() => {
        getReport(sessionId).then(setData).catch(console.error);
    }, [sessionId]);

    if (!data) return <div className="flex h-screen items-center justify-center bg-zinc-950 text-white">Generating Report...</div>;

    const { report } = data;

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-50 p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            Interview Report
                        </h1>
                        <p className="text-zinc-400 mt-2">Session ID: {sessionId.slice(0, 8)}...</p>
                    </div>
                    <div className="text-right">
                        <div className="text-5xl font-bold">{report.overall_score}<span className="text-2xl text-zinc-500">/10</span></div>
                        <div className="text-sm text-zinc-400">Overall Score</div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                    <a
                        href={getReportPdfUrl(sessionId)}
                        target="_blank"
                        className="px-6 py-2 bg-white text-black font-medium rounded hover:bg-zinc-200 transition-colors"
                    >
                        Download PDF
                    </a>
                    <a href="/" className="px-6 py-2 border border-zinc-700 rounded hover:bg-zinc-800 transition-colors">
                        Back to Home
                    </a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Breakdown */}
                    <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
                        <h3 className="text-xl font-bold mb-4">Category Breakdown</h3>
                        <div className="space-y-4">
                            {Object.entries(report.category_scores).map(([cat, score]) => (
                                <div key={cat} className="flex justify-between items-center">
                                    <span className="capitalize">{cat.replace('_', ' ')}</span>
                                    <div className="flex items-center gap-2 w-1/2">
                                        <div className="h-2 flex-1 bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500"
                                                style={{ width: `${score * 10}%` }}
                                            />
                                        </div>
                                        <span className="w-8 text-right font-mono">{score}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Strengths & Weaknesses */}
                    <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 space-y-6">
                        <div>
                            <h3 className="text-xl font-bold mb-2 text-green-400">Strengths</h3>
                            <ul className="list-disc list-inside space-y-1 text-sm text-zinc-300">
                                {report.strengths.map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold mb-2 text-red-400">Areas for Improvement</h3>
                            <ul className="list-disc list-inside space-y-1 text-sm text-zinc-300">
                                {report.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* 7 Day Plan */}
                <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
                    <h3 className="text-xl font-bold mb-4 text-purple-400">7-Day Improvement Plan</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {report.improvement_plan_7_days.map((item, i) => (
                            <div key={i} className="flex gap-3">
                                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-zinc-500">
                                    {i + 1}
                                </span>
                                <p className="text-sm text-zinc-300 pt-1">{item}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Improved Answers (Optional expansion) */}
                {report.improved_answers && report.improved_answers.length > 0 && (
                    <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
                        <h3 className="text-xl font-bold mb-4">Model Answers for Weakest Questions</h3>
                        <div className="space-y-6">
                            {report.improved_answers.map((item, i) => (
                                <div key={i} className="space-y-2">
                                    {/* Attempt to display nicely even if key is unknown question_id */}
                                    {Object.entries(item).map(([k, v]) => (
                                        <div key={k}>
                                            <div className="text-xs text-zinc-500 font-mono mb-1">{k}</div>
                                            <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800 text-sm text-zinc-300">
                                                {v}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
