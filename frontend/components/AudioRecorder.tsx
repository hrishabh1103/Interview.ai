"use client";

import React, { useState, useRef } from "react";
import { Mic, Square, Loader2 } from "lucide-react";

interface AudioRecorderProps {
    onStop: (audioBlob: Blob) => void;
    disabled?: boolean;
}

export function AudioRecorder({ onStop, disabled }: AudioRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: "audio/webm" });
                onStop(blob);

                // Stop all tracks
                stream.getTracks().forEach((track) => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Could not access microphone. Please ensure permission is granted.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    return (
        <div className="flex items-center gap-2">
            {!isRecording ? (
                <button
                    onClick={startRecording}
                    disabled={disabled}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors ${disabled
                            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700 text-white"
                        }`}
                    title="Start Recording"
                >
                    <Mic className="w-4 h-4" />
                    <span>Tap to Speak</span>
                </button>
            ) : (
                <button
                    onClick={stopRecording}
                    className="flex items-center gap-2 px-4 py-2 rounded-full font-medium bg-red-500 hover:bg-red-600 text-white animate-pulse"
                    title="Stop Recording"
                >
                    <Square className="w-4 h-4 fill-current" />
                    <span>Recording...</span>
                </button>
            )}
        </div>
    );
}
