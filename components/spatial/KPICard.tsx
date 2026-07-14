"use client";

import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import TiltCard from "./TiltCard";
import { cn } from "@/lib/utils";

interface KPICardProps {
  label: string;
  value: string | number;
  subtext: string;
  trend?: "up" | "down" | "neutral";
  trendColor?: "green" | "red" | "amber" | "neutral";
  glowColor?: string;
  onClick?: () => void;
}

export default function KPICard({
  label,
  value,
  subtext,
  trend = "neutral",
  trendColor = "neutral",
  glowColor,
  onClick,
}: KPICardProps) {
  const getTrendIcon = () => {
    if (trend === "up") return <TrendingUp className="w-3.5 h-3.5" />;
    if (trend === "down") return <TrendingDown className="w-3.5 h-3.5" />;
    return null;
  };

  const getTextColor = () => {
    if (trendColor === "green") return "text-emerald-400";
    if (trendColor === "red") return "text-rose-400";
    if (trendColor === "amber") return "text-amber-400";
    return "text-neutral-500";
  };

  return (
    <TiltCard
      glowColor={glowColor}
      onClick={onClick}
      className="p-5 h-full flex flex-col justify-between"
    >
      <div>
        <p className="text-xs uppercase tracking-wider text-neutral-500 font-semibold select-none">
          {label}
        </p>
        <h3 className="text-3xl font-extrabold text-white mt-2 select-none tracking-tight">
          {value}
        </h3>
      </div>
      <div className={cn("text-xs mt-3 flex items-center gap-1.5 font-medium select-none", getTextColor())}>
        {getTrendIcon()}
        <span>{subtext}</span>
      </div>
    </TiltCard>
  );
}
