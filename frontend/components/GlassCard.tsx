"use client";

import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";
import { ReactNode } from "react";

interface GlassCardProps extends HTMLMotionProps<"div"> {
    children: ReactNode;
    className?: string;
    hoverEffect?: boolean;
}

export const GlassCard = ({ children, className, hoverEffect = false, ...props }: GlassCardProps) => {
    return (
        <motion.div
            whileHover={hoverEffect ? { y: -5, scale: 1.01 } : {}}
            className={cn(
                "relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm shadow-lg",
                "transition-colors hover:border-white/20",
                className
            )}
            {...props}
        >
            {/* Shine effect */}
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-white/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            {children}
        </motion.div>
    );
};
