"use client";

import { motion } from "framer-motion";

export const BackgroundFX = () => {
    return (
        <div className="fixed inset-0 -z-10 overflow-hidden bg-zinc-950">
            {/* Deep dark base */}
            <div className="absolute inset-0 bg-gradient-to-tr from-black via-zinc-950 to-zinc-900" />

            {/* Grid pattern */}
            <div className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
                    backgroundSize: "50px 50px"
                }}
            />

            {/* Animated Blobs */}
            <motion.div
                animate={{
                    x: [0, 100, 0],
                    y: [0, -50, 0],
                    scale: [1, 1.2, 1],
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-0 left-0 w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[120px]"
            />
            <motion.div
                animate={{
                    x: [0, -100, 0],
                    y: [0, 100, 0],
                    scale: [1, 1.5, 1],
                }}
                transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[120px]"
            />

            {/* Noise Overlay */}
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
                }}
            />
        </div>
    );
};
