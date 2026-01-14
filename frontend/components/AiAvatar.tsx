"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface AiAvatarProps {
    mode: "idle" | "speaking" | "listening";
    intensity?: number; // 0-1
    className?: string;
}

export const AiAvatar = ({ mode, intensity = 0.5, className }: AiAvatarProps) => {

    // Base colors
    const idleColor = "from-cyan-500/20 to-blue-500/20";
    const speakingColor = "from-purple-500/40 to-pink-500/40";
    const listeningColor = "from-emerald-500/30 to-green-500/30";

    const glowColor =
        mode === "speaking" ? "shadow-purple-500/50" :
            mode === "listening" ? "shadow-emerald-500/50" :
                "shadow-cyan-500/50";

    return (
        <div className={cn("relative flex items-center justify-center w-64 h-64", className)}>
            {/* Core Orb */}
            <motion.div
                animate={{
                    scale: mode === "speaking" ? [1, 1.1 + (intensity * 0.2), 1] : [1, 1.05, 1],
                    rotate: mode === "listening" ? [0, 360] : 0,
                }}
                transition={{
                    scale: { duration: mode === "speaking" ? 0.3 : 2, repeat: Infinity },
                    rotate: { duration: 10, repeat: Infinity, ease: "linear" }
                }}
                className={cn(
                    "w-32 h-32 rounded-full bg-gradient-to-tr backdrop-blur-md border border-white/20 shadow-[0_0_60px_rgba(0,0,0,0.5)] transition-colors duration-500",
                    mode === "speaking" ? speakingColor : mode === "listening" ? listeningColor : idleColor,
                    glowColor
                )}
            >
                {/* Inner Core */}
                <div className="absolute inset-4 rounded-full bg-white/10 blur-sm" />
            </motion.div>

            {/* Orbit Rings */}
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border border-white/5 border-t-white/20"
            />

            {/* Waveform Rings (Speaking) */}
            {mode === "speaking" && (
                <>
                    {[1, 2, 3].map((i) => (
                        <motion.div
                            key={i}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1.5, opacity: 0 }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                            className="absolute inset-0 rounded-full border border-purple-500/30"
                        />
                    ))}
                </>
            )}

            {/* Listening Particles */}
            {mode === "listening" && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                        className="w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_10px_#34d399]"
                    />
                </div>
            )}
        </div>
    );
};
