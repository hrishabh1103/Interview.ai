"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";

interface DictationInputProps {
    onResult: (text: string) => void;
    disabled?: boolean;
}

export function DictationInput({ onResult, disabled }: DictationInputProps) {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            // @ts-ignore
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = false;
                recognitionRef.current.interimResults = false;
                recognitionRef.current.lang = "en-US";

                recognitionRef.current.onresult = (event: any) => {
                    const transcript = event.results[0][0].transcript;
                    onResult(transcript);
                    setIsListening(false);
                };

                recognitionRef.current.onerror = (event: any) => {
                    console.error("Speech recognition error", event.error);
                    setIsListening(false);
                    alert("Microphone error: " + event.error);
                };

                recognitionRef.current.onend = () => {
                    setIsListening(false);
                };
            }
        }
    }, [onResult]);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert("Browser does not support Speech Recognition. Please use Chrome/Edge/Safari.");
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
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
            title={isListening ? "Stop Listening" : "Start Dictation"}
        >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            <span>{isListening ? "Listening..." : "Speak"}</span>
        </button>
    );
}
