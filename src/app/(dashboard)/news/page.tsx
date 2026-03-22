"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCampaign } from "@/hooks/use-campaign";
import { ArticleTable } from "@/components/article-table";
import { BinSummaryCard } from "@/components/bin-summary-card";
import { BinCard } from "@/components/bin-card";
import { ArticleDetailDialog } from "@/components/article-detail-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { Article, BinSummary, BinType } from "@/types/database";

export default function NewsPage() {
  const { campaign } = useCampaign();
  const [articles, setArticles] = useState<Article[]>([]);
  const [summaries, setSummaries] = useState<Record<string, BinSummary | null>>({});
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [activeTab, setActiveTab] = useState<BinType>("candidate");
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
  const supabase = createClient();

  useEffect(() => {
    if (!campaign) return;

    async function fetchData() {
      const { data: articlesData } = await supabase
        .from("articles")
        .select("*")
        .eq("campaign_id", campaign!.id)
        .order("date_published", { ascending: false });

      setArticles((articlesData || []) as Article[]);

      // Fetch latest summary for each bin
      const bins: BinType[] = ["candidate", "opponent", "general_race"];
      const summaryMap: Record<string, BinSummary | null> = {};

      for (const bin of bins) {
        const { data } = await supabase
          .from("bin_summaries")
          .select("*")
          .eq("campaign_id", campaign!.id)
          .eq("bin", bin)
          .order("generated_at", { ascending: false })
          .limit(1)
          .single();

        summaryMap[bin] = data as BinSummary | null;
      }

      setSummaries(summaryMap);

      // Fetch starred article IDs
      const { data: stars } = await supabase
        .from("article_stars")
        .select("article_id")
        .eq("campaign_id", campaign!.id);
      if (stars) {
        setStarredIds(new Set(stars.map((s: { article_id: string }) => s.article_id)));
      }

      setLoading(false);
    }

    fetchData();
  }, [campaign]);

  async function toggleStar(articleId: string) {
    if (!campaign) return;
    const isStarred = starredIds.has(articleId);

    if (isStarred) {
      await supabase
        .from("article_stars")
        .delete()
        .eq("campaign_id", campaign.id)
        .eq("article_id", articleId);
      setStarredIds((prev) => {
        const next = new Set(prev);
        next.delete(articleId);
        return next;
      });
    } else {
      await supabase
        .from("article_stars")
        .insert({ campaign_id: campaign.id, article_id: articleId });
      setStarredIds((prev) => new Set(prev).add(articleId));
    }
  }

  const filteredArticles = articles.filter((a) => a.bin === activeTab);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">News Tracker</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(["candidate", "opponent", "general_race"] as BinType[]).map((bin) => (
          <BinCard
            key={bin}
            bin={bin}
            articleCount={articles.filter((a) => a.bin === bin).length}
            trend={summaries[bin]?.narrative_trend ?? null}
            isSelected={activeTab === bin}
            onClick={() => setActiveTab(bin)}
          />
        ))}
      </div>

      <BinSummaryCard summary={summaries[activeTab] || null} bin={activeTab} />
      <ArticleTable
        articles={filteredArticles}
        onArticleClick={setSelectedArticle}
        starredArticleIds={starredIds}
        onToggleStar={toggleStar}
      />

      <ArticleDetailDialog
        article={selectedArticle}
        onClose={() => setSelectedArticle(null)}
      />
    </div>
  );
}
