"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSessionState, submitAnswer, endSession, getVoiceStatus, synthesizeSpeech, getVoiceOptions } from "@/lib/api";
import { SessionState, Message, VoiceOption } from "@/types";
import { DictationInput } from "@/components/DictationInput";
import { Settings, Send, LayoutDashboard, MessageSquare, UserCircle } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { AiAvatar } from "@/components/AiAvatar";
import { CameraPreview } from "@/components/CameraPreview";
import { QuestionCard } from "@/components/QuestionCard";
import { ScoreBoard } from "@/components/ScoreBoard";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

type Tab = "avatar" | "chat" | "stats";

export default function InterviewPage() {
    const params = useParams();
    const router = useRouter();
    const sessionId = params.id as string;

    const [session, setSession] = useState<SessionState | null>(null);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);

    // UI State
    const [activeTab, setActiveTab] = useState<Tab>("chat");
    const [cameraOn, setCameraOn] = useState(false);

    // Voice State
    const [voiceEnabled, setVoiceEnabled] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isListening, setIsListening] = useState(false); // From DictationInput
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

    const playTTS = useCallback(async (text: string) => {
        try {
            setIsPlaying(true);
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
    }, [voiceRate, selectedVoice]);

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

    // 2. Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [session?.messages.length]);

    // 3. Auto-Play Audio for new Interviewer messages
    useEffect(() => {
        if (!session || !voiceEnabled) return;

        const msgs = session.messages;
        if (msgs.length === 0) return;

        const lastMsg = msgs[msgs.length - 1];
        const msgId = `${msgs.length}-${lastMsg.content.substring(0, 10)}`;

        if (lastMsg.role === "interviewer" && !processedMsgs.current.has(msgId)) {
            processedMsgs.current.add(msgId);
            playTTS(lastMsg.content);
        }
    }, [session, voiceEnabled, playTTS]);

    // 4. Auto End
    useEffect(() => {
        if (session?.interview_complete) {
            router.push(`/report/${sessionId}`);
        }
    }, [session, sessionId, router]);

    const handleSend = useCallback(async () => {
        if (!input.trim() || !sessionId) return;
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
            alert("Failed to send answer.");
        } finally {
            setLoading(false);
        }
    }, [input, sessionId, router]);

    const handleVoiceResult = useCallback((text: string) => {
        if (!text.trim()) return;
        setInput(text);
    }, []);

    const handleEnd = useCallback(async () => {
        if (confirm("End interview early?")) {
            await endSession(sessionId);
            router.push(`/report/${sessionId}`);
        }
    }, [sessionId, router]);

    // Derived State
    const avatarMode = useMemo(() => isPlaying ? "speaking" : (isListening ? "listening" : "idle"), [isPlaying, isListening]);
    const currentQuestionText = useMemo(() => {
        if (!session) return "";
        // Prefer explicit current_question if available, else fallback to last interviewer message
        if (session.current_question) return session.current_question.text;
        const lastMsg = session.messages[session.messages.length - 1];
        return lastMsg?.role === "interviewer" ? lastMsg.content : "Waiting for next question...";
    }, [session]);

    if (!session) return <div className="flex h-screen items-center justify-center text-white">Loading...</div>;

    return (
        <div className="flex h-screen overflow-hidden relative bg-zinc-950">
            <audio ref={audioRef} className="hidden" />

            {/* Desktop 3-Panel Grid */}
            <div className="hidden md:grid md:grid-cols-12 w-full h-full gap-4 p-4 min-h-0">
                {/* Left Panel: Avatar & Controls (Col 3) */}
                <div className="col-span-3 flex flex-col gap-4 min-h-0">
                    <GlassCard className="flex-1 flex flex-col items-center justify-center relative p-0 overflow-hidden hover:border-white/10" hoverEffect={false}>
                        <div className="absolute top-4 left-4 z-10 w-full pr-8">
                            <CameraPreview active={cameraOn} onToggle={setCameraOn} />
                        </div>
                        <AiAvatar mode={avatarMode} className="scale-125 mt-10" />

                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                            {voiceEnabled && (
                                <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)} className="text-white/50 hover:bg-white/10">
                                    <Settings className="w-5 h-5" />
                                </Button>
                            )}
                        </div>
                    </GlassCard>
                </div>

                {/* Center Panel: Chat (Col 6) */}
                <div className="col-span-6 flex flex-col gap-4 min-h-0">
                    {/* Question Card (Fixed Height, Scrollable) */}
                    <QuestionCard
                        questionNumber={session.progress}
                        questionText={currentQuestionText}
                        isFollowUp={session.is_followup}
                    />

                    {/* Chat & Input Area */}
                    <GlassCard className="flex-1 flex flex-col relative p-0 min-h-0 overflow-hidden" hoverEffect={false}>
                        <div className="p-3 border-b border-white/10 bg-white/5 flex justify-end shrink-0">
                            <Button variant="ghost" size="sm" onClick={handleEnd} className="text-red-400 hover:text-red-300 hover:bg-red-900/20 h-8 text-xs">
                                End Session
                            </Button>
                        </div>

                        {/* Messages List - Optimized */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                            {session.messages.map((msg, i) => (
                                <div
                                    key={i}
                                    className={`flex ${msg.role === 'candidate' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[85%] rounded-2xl p-4 text-sm shadow-sm ${msg.role === 'candidate'
                                        ? 'bg-blue-600 text-white rounded-br-none'
                                        : 'bg-zinc-800 text-zinc-100 border border-zinc-700 rounded-bl-none'
                                        }`}>
                                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                    </div>
                                </div>
                            ))}
                            {loading && (
                                <div className="flex justify-start">
                                    <div className="bg-zinc-800/50 text-zinc-400 px-4 py-2 rounded-full animate-pulse text-sm">
                                        Thinking...
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-zinc-900/80 border-t border-white/5 backdrop-blur-sm shrink-0">
                            <div className="flex gap-2 items-end">
                                {voiceEnabled && (
                                    <DictationInput
                                        onResult={handleVoiceResult}
                                        onListeningChange={setIsListening}
                                        disabled={loading || isPlaying}
                                        autoSubmit={autoSubmit}
                                        silenceWaitSec={silenceWait}
                                    />
                                )}
                                <div className="flex-1 bg-zinc-800/50 rounded-xl border border-white/5 focus-within:border-blue-500/50 focus-within:bg-zinc-800 transition-colors">
                                    <textarea
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                        disabled={loading || isPlaying}
                                        placeholder={voiceEnabled ? "Speak or type..." : "Type your answer..."}
                                        className="w-full bg-transparent px-4 py-3 outline-none resize-none h-[52px] max-h-32 text-sm"
                                        rows={1}
                                    />
                                </div>
                                <Button
                                    onClick={handleSend}
                                    disabled={loading || !input.trim()}
                                    className="h-[52px] w-[52px] rounded-xl bg-blue-600 hover:bg-blue-500"
                                >
                                    <Send className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>
                    </GlassCard>
                </div>

                {/* Right Panel: Stats (Col 3) */}
                <div className="col-span-3 flex flex-col gap-4 min-h-0">
                    <ScoreBoard scores={session.scores} />
                </div>
            </div>

            {/* Mobile View with Tabs */}
            <div className="md:hidden flex flex-col w-full h-full relative">
                {/* Mobile Header */}
                <div className="h-14 border-b border-white/10 bg-zinc-900/80 backdrop-blur flex items-center justify-between px-4 sticky top-0 z-20 shrink-0">
                    <span className="font-bold">Interviewer.AI</span>
                    <Button variant="ghost" size="sm" onClick={handleEnd} className="text-red-400 h-8">End</Button>
                </div>

                <div className="flex-1 overflow-hidden relative">
                    <AnimatePresence mode="wait">
                        {activeTab === "avatar" && (
                            <motion.div
                                key="avatar"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="absolute inset-0 p-4 flex flex-col items-center justify-center overflow-auto"
                            >
                                <QuestionCard
                                    className="w-full mb-4 shrink-0"
                                    questionNumber={session.progress}
                                    questionText={currentQuestionText}
                                    isFollowUp={session.is_followup}
                                />
                                <CameraPreview active={cameraOn} onToggle={setCameraOn} />
                                <div className="flex-1 flex items-center justify-center min-h-[300px]">
                                    <AiAvatar mode={avatarMode} />
                                </div>
                            </motion.div>
                        )}

                        {activeTab === "chat" && (
                            <motion.div
                                key="chat"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="absolute inset-0 flex flex-col"
                            >
                                <QuestionCard
                                    className="shrink-0 mb-1 rounded-none border-x-0 border-t-0"
                                    questionNumber={session.progress}
                                    questionText={currentQuestionText}
                                    isFollowUp={session.is_followup}
                                />

                                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 min-h-0">
                                    {session.messages.map((msg, i) => (
                                        <div key={i} className={`flex ${msg.role === 'candidate' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[85%] rounded-xl p-3 text-sm ${msg.role === 'candidate' ? 'bg-blue-600 text-white' : 'bg-zinc-800 border border-zinc-700'}`}>
                                                <p>{msg.content}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 p-3 bg-zinc-900/90 border-t border-white/10 backdrop-blur-md">
                                    <div className="flex gap-2">
                                        {voiceEnabled && (
                                            <DictationInput
                                                onResult={handleVoiceResult}
                                                onListeningChange={setIsListening}
                                                disabled={loading || isPlaying}
                                                autoSubmit={autoSubmit}
                                                silenceWaitSec={silenceWait}
                                            />
                                        )}
                                        <input
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            className="flex-1 bg-zinc-800 rounded-full px-4 text-sm outline-none border border-white/5 focus:border-blue-500"
                                            placeholder="Type answer..."
                                        />
                                        <Button size="icon" className="rounded-full w-10 h-10" onClick={handleSend}><Send className="w-4 h-4" /></Button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === "stats" && (
                            <motion.div
                                key="stats"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="absolute inset-0 p-4 overflow-y-auto"
                            >
                                <ScoreBoard scores={session.scores} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Mobile Bottom Nav */}
                <div className="h-16 bg-zinc-950 border-t border-white/10 flex justify-around items-center z-20 shrink-0">
                    <button onClick={() => setActiveTab("avatar")} className={`p-2 flex flex-col items-center gap-1 ${activeTab === "avatar" ? "text-blue-400" : "text-zinc-600"}`}>
                        <UserCircle className="w-6 h-6" />
                        <span className="text-[10px]">Avatar</span>
                    </button>
                    <button onClick={() => setActiveTab("chat")} className={`p-2 flex flex-col items-center gap-1 ${activeTab === "chat" ? "text-blue-400" : "text-zinc-600"}`}>
                        <MessageSquare className="w-6 h-6" />
                        <span className="text-[10px]">Chat</span>
                    </button>
                    <button onClick={() => setActiveTab("stats")} className={`p-2 flex flex-col items-center gap-1 ${activeTab === "stats" ? "text-blue-400" : "text-zinc-600"}`}>
                        <LayoutDashboard className="w-6 h-6" />
                        <span className="text-[10px]">Stats</span>
                    </button>
                </div>
            </div>

            {/* Existing Voice Settings Modal (Hidden by default) */}
            {showSettings && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <GlassCard className="w-full max-w-md space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold">Voice Settings</h2>
                            <button onClick={() => setShowSettings(false)}>✕</button>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm text-zinc-400">AI Voice</label>
                                <select
                                    className="w-full bg-zinc-900 border border-white/10 rounded p-2"
                                    value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)}
                                >
                                    {voiceOptions.map(v => <option key={v.short_name} value={v.short_name}>{v.friendly_name}</option>)}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm text-zinc-400">Speed ({voiceRate}x)</label>
                                <input type="range" min="0.5" max="2.0" step="0.1" value={voiceRate} onChange={(e) => setVoiceRate(parseFloat(e.target.value))} className="w-full" />
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="text-sm text-zinc-400">Auto-submit ({silenceWait}s)</label>
                                <input type="checkbox" checked={autoSubmit} onChange={(e) => setAutoSubmit(e.target.checked)} className="w-5 h-5" />
                            </div>
                        </div>
                        <Button onClick={() => setShowSettings(false)} className="w-full">Done</Button>
                    </GlassCard>
                </div>
            )}
        </div>
    );
}
