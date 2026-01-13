"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSessionState, submitAnswer, endSession, getVoiceStatus, synthesizeSpeech } from "@/lib/api";
import { SessionState, Message } from "@/types";
import { DictationInput } from "@/components/DictationInput";
import { Volume2 } from "lucide-react";

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

    const scrollRef = useRef<HTMLDivElement>(null);
    const lastMsgCount = useRef(0);

    // 1. Init Session & Voice Check
    useEffect(() => {
        getSessionState(sessionId).then(setSession).catch(console.error);
        getVoiceStatus().then(setVoiceEnabled).catch(() => setVoiceEnabled(false));
    }, [sessionId]);

    // 2. Auto-Scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [session?.messages]);

    // 3. Auto-Play Audio for new Interviewer messages (if voice enabled)
    useEffect(() => {
        if (!session || !voiceEnabled) return;

        const msgs = session.messages;
        if (msgs.length > lastMsgCount.current) {
            const lastMsg = msgs[msgs.length - 1];
            // Only speak if it's from interviewer and strictly new
            if (lastMsg.role === "interviewer") {
                playTTS(lastMsg.content);
            }
            lastMsgCount.current = msgs.length;
        }
    }, [session, voiceEnabled]);

    useEffect(() => {
        // Monitor finish state
        if (session && !session.current_question && session.progress.includes(session.progress.split('/')[1])) {
            // check done
        }
    }, [session]);

    const playTTS = async (text: string) => {
        try {
            setIsPlaying(true);
            const blob = await synthesizeSpeech(text);
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
        } catch (err) {
            console.error(err);
            alert("Failed to send answer. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleVoiceResult = async (text: string) => {
        if (!text.trim()) return;

        setInput(text);

        // Auto-send
        setLoading(true);
        const userMsg: Message = { role: "candidate", content: text };
        setSession(prev => prev ? { ...prev, messages: [...prev.messages, userMsg] } : null);

        try {
            // Stop audio if speaking
            if (audioRef.current) audioRef.current.pause();

            const newState = await submitAnswer(sessionId, text);
            setSession(newState);
            setInput("");
        } catch (err) {
            console.error(err);
            alert("Failed to submit answer.");
        } finally {
            setLoading(false);
        }
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
                    <p className="text-sm text-zinc-400">Question {session.progress}</p>
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
                    <div className="p-3 bg-blue-900/20 border border-blue-900/50 rounded-lg text-xs text-blue-200">
                        <div className="flex items-center gap-2 mb-1 font-bold">
                            <Volume2 className="w-4 h-4" /> Voice Mode Active
                        </div>
                        AI speaks automatically. Use the Mic to reply.
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
                    <span className="text-sm">{session.progress}</span>
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
                            <DictationInput onResult={handleVoiceResult} disabled={loading || isPlaying} />
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
