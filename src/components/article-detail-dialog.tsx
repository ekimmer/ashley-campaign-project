"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Article } from "@/types/database";

interface ArticleDetailDialogProps {
  article: Article | null;
  onClose: () => void;
}

const sentimentColors = {
  positive: "bg-green-100 text-green-800",
  neutral: "bg-gray-100 text-gray-800",
  negative: "bg-red-100 text-red-800",
  mixed: "bg-yellow-100 text-yellow-800",
};

export function ArticleDetailDialog({ article, onClose }: ArticleDetailDialogProps) {
  if (!article) return null;

  return (
    <Dialog open={!!article} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg leading-tight">
            {article.headline}
          </DialogTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
            <span>{article.outlet}</span>
            {article.reporter && (
              <>
                <span>·</span>
                <span>{article.reporter}</span>
              </>
            )}
            <span>·</span>
            <span>{article.date_published}</span>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            <Badge className={sentimentColors[article.sentiment]} variant="secondary">
              {article.sentiment}
            </Badge>
            <Badge variant="outline">{article.reach}</Badge>
            {article.key_themes.map((theme) => (
              <Badge key={theme} variant="secondary">
                {theme}
              </Badge>
            ))}
            {article.paywall_status === "unavailable" && (
              <Badge variant="destructive">Paywall</Badge>
            )}
          </div>

          <Separator />

          {/* AI Summary */}
          <div>
            <h3 className="font-semibold text-sm mb-2">AI Summary</h3>
            <p className="text-sm text-muted-foreground">{article.ai_summary}</p>
          </div>

          {/* Alert info */}
          {article.alert_tier !== "none" && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-sm mb-2">Alert</h3>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={article.alert_tier === "critical" ? "destructive" : "secondary"}
                  >
                    {article.alert_tier}
                  </Badge>
                  {article.alert_reason && (
                    <span className="text-sm text-muted-foreground">
                      {article.alert_reason}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}

          {/* VA Politics */}
          {article.va_politics_relevant && article.va_politics_topics.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-sm mb-2">VA Politics Topics</h3>
                <div className="flex gap-2 flex-wrap">
                  {article.va_politics_topics.map((topic) => (
                    <Badge key={topic} variant="outline">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Full text */}
          {article.full_text && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-sm mb-2">Full Text</h3>
                <div className="text-sm text-muted-foreground max-h-60 overflow-y-auto whitespace-pre-wrap">
                  {article.full_text}
                </div>
              </div>
            </>
          )}

          {/* Source link */}
          <Separator />
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            Read original article →
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
