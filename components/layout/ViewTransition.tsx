"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

interface ViewTransitionProps {
  children: ReactNode;
  activeKey: string;
}

export function ViewTransition({ children, activeKey }: ViewTransitionProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeKey}
        initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
        transition={{ 
          duration: 0.25, 
          ease: [0.23, 1, 0.32, 1] // Custom ease out quint
        }}
        className="w-full h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
