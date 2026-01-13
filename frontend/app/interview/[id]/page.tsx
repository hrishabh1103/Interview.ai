"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSessionState, submitAnswer, endSession, getVoiceStatus, synthesizeSpeech, getVoiceOptions } from "@/lib/api";
import { SessionState, Message, VoiceOption } from "@/types";
import { DictationInput } from "@/components/DictationInput";
import { Volume2, Settings } from "lucide-react";

export default function InterviewPage() {
    const params = useParams();
    const router = useRouter();
    const sessionId = params.id as string;

    const [session, setSession] = useState<SessionState | null>(null);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);

    // Voice State
    const [voiceEnabled, setVoiceEnabled] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Voice Settings
    const [voiceOptions, setVoiceOptions] = useState<VoiceOption[]>([]);
    const [selectedVoice, setSelectedVoice] = useState<string>("en-US-ChristopherNeural");
    const [voiceRate, setVoiceRate] = useState<number>(1.0);
    const [autoSubmit, setAutoSubmit] = useState<boolean>(true);
    const [silenceWait, setSilenceWait] = useState<number>(7);
    const [showSettings, setShowSettings] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const processedMsgs = useRef<Set<string>>(new Set());

    // 1. Init Session & Voice Check
    useEffect(() => {
        getSessionState(sessionId).then(setSession).catch(console.error);
        getVoiceStatus().then((enabled) => {
            setVoiceEnabled(enabled);
            if (enabled) {
                getVoiceOptions().then(setVoiceOptions).catch(console.error);
            }
        }).catch(() => setVoiceEnabled(false));
    }, [sessionId]);

    // 3. Auto-Play Audio for new Interviewer messages (Voice Mode)
    useEffect(() => {
        if (!session || !voiceEnabled) {
            console.log("TTS Skipped: No session or voice disabled", { voiceEnabled });
            return;
        }

        const msgs = session.messages;
        if (msgs.length === 0) return;

        const lastMsg = msgs[msgs.length - 1];
        // Generate a pseudo-ID if not present (hash content + index)
        const msgId = `${msgs.length}-${lastMsg.content.substring(0, 10)}`;

        if (lastMsg.role === "interviewer" && !processedMsgs.current.has(msgId)) {
            processedMsgs.current.add(msgId);
            playTTS(lastMsg.content);
        }
    }, [session, voiceEnabled]);

    useEffect(() => {
        // Monitor finish state
        if (session?.interview_complete) {
            router.push(`/report/${sessionId}`);
        }
    }, [session, sessionId, router]);

    const playTTS = async (text: string) => {
        try {
            setIsPlaying(true);

            // Format rate: 1.0 -> "+0%", 1.1 -> "+10%"
            const ratePct = Math.round((voiceRate - 1.0) * 100);
            const rateStr = ratePct >= 0 ? `+${ratePct}%` : `${ratePct}%`;

            const blob = await synthesizeSpeech(text, selectedVoice, rateStr);
            const url = URL.createObjectURL(blob);

            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = url;
                audioRef.current.play();
                audioRef.current.onended = () => setIsPlaying(false);
            }
        } catch (err) {
            console.error("TTS play failed", err);
            setIsPlaying(false);
        }
    };

    const handleSend = async () => {
        if (!input.trim() || !sessionId) return;

        // Stop audio if speaking
        if (audioRef.current) audioRef.current.pause();

        setLoading(true);

        const userMsg: Message = { role: "candidate", content: input };
        setSession(prev => prev ? { ...prev, messages: [...prev.messages, userMsg] } : null);

        try {
            const newState = await submitAnswer(sessionId, input);
            setSession(newState);
            setInput("");

            if (newState.interview_complete) {
                router.push(`/report/${sessionId}`);
            }
        } catch (err) {
            console.error(err);
            alert("Failed to send answer. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleVoiceResult = (text: string) => {
        if (!text.trim()) return;
        setInput(text);
        // No auto-send
    };

    const handleEnd = async () => {
        if (confirm("Are you sure you want to end the interview early?")) {
            await endSession(sessionId);
            router.push(`/report/${sessionId}`);
        }
    }

    if (!session) return <div className="flex h-screen items-center justify-center bg-zinc-950 text-white">Loading...</div>;

    return (
        <div className="flex h-screen bg-zinc-950 text-zinc-50 overflow-hidden">
            {/* Audio Element Hidden */}
            <audio ref={audioRef} className="hidden" />

            {/* Sidebar / Scoreboard (Desktop) */}
            <div className="hidden w-80 border-r border-zinc-800 bg-zinc-900 p-6 md:flex md:flex-col space-y-6">
                <div>
                    <h2 className="text-xl font-bold">Live Scoreboard</h2>
                    <div className="flex items-center gap-2">
                        <p className="text-sm text-zinc-400">Question {session.progress}</p>
                        {session.is_followup && (
                            <span className="px-2 py-0.5 text-xs font-bold bg-amber-500/20 text-amber-500 rounded border border-amber-500/50">
                                Follow-up
                            </span>
                        )}
                    </div>
                </div>

                {session.scores ? (
                    <div className="space-y-4">
                        <ScoreItem label="Correctness" value={session.scores.correctness_score} />
                        <ScoreItem label="Depth" value={session.scores.depth_score} />
                        <ScoreItem label="Structure" value={session.scores.structure_score} />
                        <ScoreItem label="Communication" value={session.scores.communication_score} />
                    </div>
                ) : (
                    <div className="text-sm text-zinc-500 italic">Scores appear after first answer...</div>
                )}

                {voiceEnabled && (
                    <div className="p-3 bg-blue-900/20 border border-blue-900/50 rounded-lg text-xs text-blue-200 space-y-2">
                        <div className="flex items-center justify-between font-bold">
                            <div className="flex items-center gap-2">
                                <Volume2 className="w-4 h-4" /> Voice Active
                            </div>
                            <button onClick={() => setShowSettings(true)} className="hover:text-white" title="Settings">
                                <Settings className="w-4 h-4" />
                            </button>
                        </div>
                        <p>AI speaks automatically. Use the Mic to reply.</p>
                        <p className="opacity-70 text-[10px]">{autoSubmit ? `Auto-send after ${silenceWait}s silence` : "Manual send"}</p>
                    </div>
                )}

                <div className="flex-1" />
                <button onClick={handleEnd} className="w-full py-2 bg-red-900/30 text-red-200 border border-red-900 rounded hover:bg-red-900/50">
                    End Interview
                </button>
            </div>

            {/* Chat Area */}
            <div className="flex flex-1 flex-col relative">
                <header className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/50 p-4 md:hidden">
                    <span className="font-bold">Interviewer.AI</span>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setShowSettings(true)} className="p-1 text-zinc-400 hover:text-white">
                            <Settings className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <span className="text-sm">{session.progress}</span>
                            {session.is_followup && (
                                <span className="text-xs text-amber-500 font-bold">Follow-up</span>
                            )}
                        </div>
                    </div>
                </header>

                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                    {session.messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'candidate' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-lg p-4 ${msg.role === 'candidate'
                                ? 'bg-blue-600 text-white'
                                : 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                                }`}>
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-zinc-800/50 text-zinc-400 p-3 rounded-lg animate-pulse">
                                Thinking...
                            </div>
                        </div>
                    )}
                </div>

                <div className="border-t border-zinc-800 bg-zinc-900 p-4">
                    <div className="mx-auto max-w-3xl flex gap-2 items-center">
                        {voiceEnabled && (
                            <DictationInput
                                onResult={handleVoiceResult}
                                disabled={loading || isPlaying}
                                autoSubmit={autoSubmit}
                                silenceWaitSec={silenceWait}
                            />
                        )}

                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                            disabled={loading || isPlaying}
                            placeholder={voiceEnabled ? "Speak or type..." : "Type your answer..."}
                            className="flex-1 bg-zinc-800 border-zinc-700 rounded-lg px-4 py-2 focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                        <button
                            onClick={handleSend}
                            disabled={loading || !input.trim()}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            Send
                        </button>
                    </div>
                    {/* Hint/End for mobile */}
                    <div className="md:hidden mt-2 text-center">
                        <button
                            onClick={handleEnd}
                            className="text-xs text-red-400 underline"
                        >
                            End Interview
                        </button>
                    </div>

                    {!session.current_question && !loading && session.messages.length > 0 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                            <div className="bg-zinc-900 p-8 rounded-xl border border-zinc-700 text-center space-y-4">
                                <h2 className="text-2xl font-bold">Interview Complete</h2>
                                <button
                                    onClick={() => router.push(`/report/${sessionId}`)}
                                    className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold"
                                >
                                    View Results
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* Settings Modal */}
            {showSettings && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-zinc-900 rounded-xl border border-zinc-700 p-6 space-y-6 shadow-2xl">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Settings className="w-5 h-5" /> Voice Settings
                            </h2>
                            <button onClick={() => setShowSettings(false)} className="text-zinc-400 hover:text-white">✕</button>
                        </div>

                        <div className="space-y-4">
                            {/* Voice Selection */}
                            <div className="space-y-2">
                                <label className="text-sm text-zinc-400">AI Voice</label>
                                <select
                                    value={selectedVoice}
                                    onChange={(e) => setSelectedVoice(e.target.value)}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                >
                                    {voiceOptions.map(v => (
                                        <option key={v.short_name} value={v.short_name}>
                                            {v.friendly_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Speed Slider */}
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <label className="text-sm text-zinc-400">Speed</label>
                                    <span className="text-xs text-zinc-500">{voiceRate}x</span>
                                </div>
                                <input
                                    type="range" min="0.5" max="2.0" step="0.1"
                                    value={voiceRate}
                                    onChange={(e) => setVoiceRate(parseFloat(e.target.value))}
                                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                />
                            </div>

                            <hr className="border-zinc-800" />

                            {/* Auto-Submit Toggle */}
                            <div className="flex items-center justify-between">
                                <label className="text-sm text-zinc-400">Auto-send after silence</label>
                                <button
                                    onClick={() => setAutoSubmit(!autoSubmit)}
                                    className={`w-12 h-6 rounded-full p-1 transition-colors ${autoSubmit ? 'bg-green-600' : 'bg-zinc-700'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${autoSubmit ? 'translate-x-6' : 'translate-x-0'}`} />
                                </button>
                            </div>

                            {/* Silence Duration */}
                            {autoSubmit && (
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <label className="text-sm text-zinc-400">Silence Wait Time</label>
                                        <span className="text-xs text-zinc-500">{silenceWait}s</span>
                                    </div>
                                    <input
                                        type="range" min="2" max="10" step="1"
                                        value={silenceWait}
                                        onChange={(e) => setSilenceWait(parseInt(e.target.value))}
                                        className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-green-600"
                                    />
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setShowSettings(false)}
                            className="w-full py-2 bg-blue-600 rounded-lg font-medium hover:bg-blue-700"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function ScoreItem({ label, value }: { label: string, value: number }) {
    // Color based on score
    let color = "bg-red-500";
    if (value >= 7) color = "bg-green-500";
    else if (value >= 4) color = "bg-yellow-500";

    return (
        <div className="space-y-1">
            <div className="flex justify-between text-sm">
                <span>{label}</span>
                <span className="font-mono">{value}/10</span>
            </div>
            <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${value * 10}%` }} />
            </div>
        </div>
    );
}
