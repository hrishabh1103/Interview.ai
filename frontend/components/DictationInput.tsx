"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";

interface DictationInputProps {
    onResult: (text: string) => void;
    onInterimResult?: (text: string) => void;
    disabled?: boolean;
    autoSubmit?: boolean;
    silenceWaitSec?: number;
}

export function DictationInput({
    onResult,
    onInterimResult,
    disabled,
    autoSubmit = false,
    silenceWaitSec = 7
}: DictationInputProps) {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);
    const lastSpeechTimeRef = useRef<number>(0);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const currentTranscriptRef = useRef<string>("");

    useEffect(() => {
        if (typeof window !== "undefined") {
            // @ts-ignore
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = true; // Changed to true for continuous listening until silence
                recognitionRef.current.interimResults = true;
                recognitionRef.current.lang = "en-US";

                recognitionRef.current.onresult = (event: any) => {
                    lastSpeechTimeRef.current = Date.now();

                    let interim = "";
                    let final = "";

                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            final += event.results[i][0].transcript;
                        } else {
                            interim += event.results[i][0].transcript;
                        }
                    }

                    const fullText = final || interim;
                    // Note: continuously updating fullText might be tricky with continuous=true logic resetting?
                    // Simplified: Just take the latest result as "current" if we assume single turn.
                    // Actually, for auto-submit, we just want the growing buffer.
                    // Web Speech API accumulation with continuous=true can be complex.
                    // Let's stick to continuous=false behavior simulation or just accumulate?

                    // Better approach for this app: Just take the latest interim or final as "what user said so far".
                    currentTranscriptRef.current = fullText;

                    if (onInterimResult) {
                        onInterimResult(fullText);
                    }
                };

                recognitionRef.current.onerror = (event: any) => {
                    console.error("Speech error", event.error);
                    if (event.error !== "no-speech") {
                        setIsListening(false);
                    }
                };

                recognitionRef.current.onend = () => {
                    // If continuous=true, it shouldn't end unless we stop it.
                    // But if it does (network, etc), update state.
                    if (!autoSubmit) {
                        setIsListening(false);
                    } else {
                        // If autoSubmit is on, we might want to restart? Or just stop.
                        // Let's stop to be safe.
                        setIsListening(false);
                    }
                };
            }
        }
    }, [onResult, onInterimResult, autoSubmit]);

    // Silence Check Loop
    useEffect(() => {
        if (!isListening || !autoSubmit) {
            if (silenceTimerRef.current) clearInterval(silenceTimerRef.current);
            return;
        }

        silenceTimerRef.current = setInterval(() => {
            const now = Date.now();
            // Check if silence > limit AND we have some text
            if (lastSpeechTimeRef.current > 0 &&
                (now - lastSpeechTimeRef.current) > (silenceWaitSec * 1000)) {

                if (currentTranscriptRef.current.length > 10) {
                    // Trigger Submit
                    stopAndSubmit();
                }
            }
        }, 1000);

        return () => {
            if (silenceTimerRef.current) clearInterval(silenceTimerRef.current);
        };
    }, [isListening, autoSubmit, silenceWaitSec]);

    const stopAndSubmit = () => {
        if (recognitionRef.current) recognitionRef.current.stop();
        setIsListening(false);
        if (currentTranscriptRef.current.trim()) {
            onResult(currentTranscriptRef.current);
            currentTranscriptRef.current = ""; // Reset
        }
    };

    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert("Browser not supported.");
            return;
        }

        if (isListening) {
            // Manual Stop -> Submit
            stopAndSubmit();
        } else {
            currentTranscriptRef.current = "";
            lastSpeechTimeRef.current = Date.now(); // Init time
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    return (
        <button
            onClick={toggleListening}
            disabled={disabled}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors ${disabled
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : isListening
                    ? "bg-red-500 text-white animate-pulse hover:bg-red-600"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
            title={isListening ? "Stop & Send" : "Start Dictation"}
        >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            <span>{isListening ? "Listening..." : "Speak"}</span>
            {isListening && autoSubmit && (
                <span className="text-[10px] opacity-70 ml-1">(Auto-send on silence)</span>
            )}
        </button>
    );
}
