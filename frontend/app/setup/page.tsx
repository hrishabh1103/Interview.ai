"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startSession } from "@/lib/api";
import { RoleEnum, DifficultyEnum } from "@/types";

export default function SetupPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError("");

        const formData = new FormData(e.currentTarget);
        const role = formData.get("role") as RoleEnum;
        const difficulty = formData.get("difficulty") as DifficultyEnum;
        const numQuestions = parseInt(formData.get("num_questions") as string);
        const resumeFile = formData.get("resume") as File;
        const voiceEnabled = formData.get("voice_enabled") === "on";

        if (!resumeFile || resumeFile.size === 0) {
            setError("Please upload a resume.");
            setLoading(false);
            return;
        }

        try {
            const state = await startSession(role, difficulty, numQuestions, resumeFile, voiceEnabled);
            router.push(`/interview/${state.session_id}`);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-zinc-50 p-4">
            <div className="w-full max-w-md space-y-8 bg-zinc-900 p-8 rounded-xl border border-zinc-800">
                <div className="text-center">
                    <h2 className="text-3xl font-bold">Setup Interview</h2>
                    <p className="text-zinc-400 mt-2">Upload your resume and configure settings</p>
                </div>

                {error && (
                    <div className="p-3 rounded bg-red-900/50 text-red-200 text-sm border border-red-900">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Target Role</label>
                        <select name="role" className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 focus:ring-1 ring-blue-500 outline-none">
                            <option value="SDE1">Software Development Engineer I (SDE1)</option>
                            <option value="Product Manager">Product Manager</option>
                            <option value="Marketing Manager">Marketing Manager</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Difficulty</label>
                        <select name="difficulty" className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 focus:ring-1 ring-blue-500 outline-none">
                            <option value="Easy">Easy</option>
                            <option value="Medium">Medium</option>
                            <option value="Hard">Hard</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Number of Questions</label>
                        <input
                            type="number"
                            name="num_questions"
                            defaultValue={5}
                            min={1}
                            max={10}
                            className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 focus:ring-1 ring-blue-500 outline-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Resume (PDF)</label>
                        <input
                            type="file"
                            name="resume"
                            accept=".pdf"
                            className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                        />
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                        <input type="checkbox" name="voice_enabled" id="voice" className="w-4 h-4 rounded" />
                        <label htmlFor="voice" className="text-sm font-medium cursor-pointer">Enable Voice Mode (Beta)</label>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Analyzing Resume..." : "Start Interview"}
                    </button>
                </form>
            </div>
        </div>
    );
}
