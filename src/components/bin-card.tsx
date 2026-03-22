"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { BinType, NarrativeTrend } from "@/types/database";

interface BinCardProps {
  bin: BinType;
  articleCount: number;
  trend: NarrativeTrend | null;
  isSelected: boolean;
  onClick: () => void;
}

const binLabels: Record<BinType, string> = {
  candidate: "Candidate",
  opponent: "Opponents",
  general_race: "General Race",
};

const trendConfig = {
  increasing: { icon: TrendingUp, label: "Increasing", color: "text-green-600" },
  stable: { icon: Minus, label: "Stable", color: "text-gray-500" },
  declining: { icon: TrendingDown, label: "Declining", color: "text-red-600" },
};

export function BinCard({ bin, articleCount, trend, isSelected, onClick }: BinCardProps) {
  const trendInfo = trend ? trendConfig[trend] : null;
  const TrendIcon = trendInfo?.icon;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "rounded-lg border p-4 transition-all duration-200 cursor-pointer",
        isSelected
          ? "border-primary bg-primary/5 shadow-[0_0_12px_rgba(236,72,153,0.3)]"
          : "border-border bg-card hover:border-primary/50"
      )}
    >
      <h3 className="text-sm font-medium text-muted-foreground">{binLabels[bin]}</h3>
      <p className="mt-1 text-2xl font-bold">{articleCount}</p>
      <p className="text-xs text-muted-foreground">
        {articleCount === 1 ? "article" : "articles"}
      </p>

      {trendInfo && TrendIcon && (
        <div className={cn("mt-3 flex items-center gap-1.5 text-xs", trendInfo.color)}>
          <TrendIcon className="h-3.5 w-3.5" />
          <span>{trendInfo.label}</span>
        </div>
      )}

      {!trendInfo && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Minus className="h-3.5 w-3.5" />
          <span>No trend data</span>
        </div>
      )}
    </div>
  );
}
