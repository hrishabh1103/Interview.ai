"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startSession } from "@/lib/api";
import { RoleEnum, DifficultyEnum } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Mic, Upload, ArrowRight, User, CheckCircle2 } from "lucide-react";

export default function SetupPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [step, setStep] = useState(1);

    // Form State
    const [role, setRole] = useState<RoleEnum>("SDE1");
    const [difficulty, setDifficulty] = useState<DifficultyEnum>("Medium");
    const [numQuestions, setNumQuestions] = useState(5);
    const [resume, setResume] = useState<File | null>(null);
    const [voiceEnabled, setVoiceEnabled] = useState(false);

    const handleNext = () => setStep((p) => Math.min(p + 1, 3));
    const handlePrev = () => setStep((p) => Math.max(p - 1, 1));

    const handleSubmit = async () => {
        if (!resume) {
            setError("Please upload a resume.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const state = await startSession(role, difficulty, numQuestions, resume, voiceEnabled);
            router.push(`/interview/${state.session_id}`);
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    // Hardcoded options since Enums are types only
    const ROLES = ["SDE1", "Product Manager", "Marketing Manager"];

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <GlassCard className="w-full max-w-lg p-8 relative">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
                        Configure Session
                    </h1>
                    <div className="flex justify-center space-x-2 mt-4">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className={`h-1.5 w-12 rounded-full transition-colors duration-300 ${step >= i ? "bg-blue-500" : "bg-zinc-800"}`}
                            />
                        ))}
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div className="space-y-3">
                                <label className="text-sm text-zinc-400 font-medium">Target Role</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {ROLES.map((r) => (
                                        <div
                                            key={r}
                                            onClick={() => setRole(r as RoleEnum)}
                                            className={`p-3 rounded-lg border cursor-pointer flex items-center transition-all ${role === r ? "bg-blue-500/20 border-blue-500 text-blue-200" : "bg-zinc-900/50 border-white/5 hover:border-white/20"}`}
                                        >
                                            <User className="w-4 h-4 mr-3 opacity-70" />
                                            {r}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm text-zinc-400 font-medium">Difficulty</label>
                                    <select
                                        value={difficulty}
                                        onChange={(e) => setDifficulty(e.target.value as DifficultyEnum)}
                                        className="w-full p-2.5 rounded-lg bg-zinc-900/50 border border-white/10 outline-none focus:border-blue-500"
                                    >
                                        <option value="Easy">Easy</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Hard">Hard</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm text-zinc-400 font-medium">Questions</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={10}
                                        value={numQuestions}
                                        onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                                        className="w-full p-2.5 rounded-lg bg-zinc-900/50 border border-white/10 outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <Button onClick={handleNext} className="w-full">Continue <ArrowRight className="ml-2 w-4 h-4" /></Button>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6 text-center"
                        >
                            <div className="border-2 border-dashed border-zinc-700 rounded-xl p-8 transition-colors hover:border-blue-500/50 bg-zinc-900/20">
                                <input
                                    type="file"
                                    id="resume"
                                    accept=".pdf"
                                    className="hidden"
                                    onChange={(e) => setResume(e.target.files?.[0] || null)}
                                />
                                <label htmlFor="resume" className="cursor-pointer flex flex-col items-center">
                                    {resume ? <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" /> : <Upload className="w-12 h-12 text-zinc-500 mb-3" />}
                                    <span className="text-lg font-medium">{resume ? resume.name : "Upload Resume (PDF)"}</span>
                                    {!resume && <span className="text-zinc-500 text-sm mt-1">Click to browse files</span>}
                                </label>
                            </div>

                            <div className="flex gap-3">
                                <Button variant="ghost" onClick={handlePrev} className="flex-1">Back</Button>
                                <Button onClick={handleNext} disabled={!resume} className="flex-1">Continue</Button>
                            </div>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div className="bg-zinc-900/40 rounded-xl p-4 border border-white/5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${voiceEnabled ? "bg-blue-500/20 text-blue-400" : "bg-zinc-800 text-zinc-400"}`}>
                                            <Mic className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="font-medium">Voice Mode</div>
                                            <div className="text-xs text-zinc-500">Enable speech interaction</div>
                                        </div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={voiceEnabled}
                                        onChange={(e) => setVoiceEnabled(e.target.checked)}
                                        className="w-5 h-5"
                                    />
                                </div>
                            </div>

                            {error && <p className="text-red-400 text-center text-sm">{error}</p>}

                            <div className="flex gap-3 pt-4">
                                <Button variant="ghost" onClick={handlePrev} disabled={loading} className="flex-1">Back</Button>
                                <Button onClick={handleSubmit} disabled={loading} className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 border-0">
                                    {loading ? "Analyzing..." : "Start Interview"}
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </GlassCard>
        </div>
    );
}
