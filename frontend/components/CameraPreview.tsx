"use client";

import { useEffect, useRef, useState } from "react";
import { GlassCard } from "./GlassCard";
import { Camera, CameraOff, Mic, MicOff } from "lucide-react";
import { Button } from "./ui/button";

interface CameraPreviewProps {
    active: boolean;
    onToggle: (active: boolean) => void;
}

export const CameraPreview = ({ active, onToggle }: CameraPreviewProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (active) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => {
            stopCamera();
        };
    }, [active]);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setError(null);
        } catch (err) {
            console.error("Camera access denied:", err);
            setError("Camera access denied or unavailable.");
            onToggle(false); // Turn off if failed
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };

    return (
        <div className="w-full">
            {active ? (
                <div className="relative aspect-video rounded-xl overflow-hidden bg-black/50 border border-white/10 shadow-lg">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover transform -scale-x-100" // Mirror effect
                    />
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded text-[10px] text-white/70">
                        You (Camera On)
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 text-white hover:bg-white/20 h-8 w-8"
                        onClick={() => onToggle(false)}
                    >
                        <CameraOff className="w-4 h-4" />
                    </Button>
                </div>
            ) : (
                <GlassCard className="flex items-center justify-between p-3 bg-black/40">
                    <div className="flex items-center gap-2 text-zinc-400 text-sm">
                        <CameraOff className="w-4 h-4" />
                        <span>Camera Off</span>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs border-white/10 hover:bg-white/10"
                        onClick={() => onToggle(true)}
                    >
                        Turn On
                    </Button>
                </GlassCard>
            )}
            {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
        </div>
    );
};
