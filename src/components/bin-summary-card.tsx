"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { BinSummary, BinType } from "@/types/database";

interface BinSummaryCardProps {
  summary: BinSummary | null;
  bin: BinType;
}

const binLabels: Record<BinType, string> = {
  candidate: "Candidate Coverage",
  opponent: "Opponent Coverage",
  general_race: "General Race Coverage",
};

const trendIcons = {
  increasing: TrendingUp,
  stable: Minus,
  declining: TrendingDown,
};

const trendColors = {
  increasing: "text-green-600",
  stable: "text-gray-500",
  declining: "text-red-600",
};

export function BinSummaryCard({ summary, bin }: BinSummaryCardProps) {
  if (!summary) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="py-6 text-center text-muted-foreground">
          <p>Insufficient data for a summary. More articles needed.</p>
        </CardContent>
      </Card>
    );
  }

  const TrendIcon = trendIcons[summary.narrative_trend];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{binLabels[bin]} Summary</CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendIcon className={`h-4 w-4 ${trendColors[summary.narrative_trend]}`} />
            <span className="capitalize">{summary.narrative_trend}</span>
            <Badge variant="outline" className="text-xs">
              {summary.article_count} articles
            </Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Last updated: {new Date(summary.generated_at).toLocaleString()}
        </p>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed">{summary.summary_text}</p>
      </CardContent>
    </Card>
  );
}
