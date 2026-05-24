import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CanvasLayoutProps {
  leftBlock?: ReactNode;
  centerBlock: ReactNode;
  rightBlock?: ReactNode;
  className?: string;
}

export function CanvasLayout({ leftBlock, centerBlock, rightBlock, className }: CanvasLayoutProps) {
  return (
    // Absolute fill: occupies the parent's inset-0 from PulseView's motion.div
    <div className={cn("absolute inset-0 flex flex-row overflow-hidden", className)}>

      {/* 1. Left Column (30%) */}
      {leftBlock && (
        <div className="w-[30%] flex-shrink-0 flex flex-col overflow-hidden border-r border-white/[0.05]">
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-5" style={{ scrollbarWidth: 'thin' }}>
            {leftBlock}
          </div>
        </div>
      )}

      {/* 2. Center Column (fills remaining space) */}
      <div className={cn(
        "flex flex-col overflow-hidden",
        leftBlock && rightBlock ? "flex-1" : "",
        leftBlock && !rightBlock ? "flex-1" : "",
        !leftBlock && rightBlock ? "flex-1" : "",
        !leftBlock && !rightBlock ? "flex-1" : "",
        rightBlock ? "border-r border-white/[0.05]" : ""
      )}>
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-5" style={{ scrollbarWidth: 'thin' }}>
          {centerBlock}
        </div>
      </div>

      {/* 3. Right Column (fixed 260px) */}
      {rightBlock && (
        <div className="w-[260px] flex-shrink-0 flex flex-col overflow-hidden bg-black/[0.12]">
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-5" style={{ scrollbarWidth: 'thin' }}>
            {rightBlock}
          </div>
        </div>
      )}

    </div>
  );
}
