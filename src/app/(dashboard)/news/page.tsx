"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCampaign } from "@/hooks/use-campaign";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArticleTable } from "@/components/article-table";
import { BinSummaryCard } from "@/components/bin-summary-card";
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
      setLoading(false);
    }

    fetchData();
  }, [campaign]);

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

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as BinType)}>
        <TabsList>
          <TabsTrigger value="candidate">
            Candidate ({articles.filter((a) => a.bin === "candidate").length})
          </TabsTrigger>
          <TabsTrigger value="opponent">
            Opponents ({articles.filter((a) => a.bin === "opponent").length})
          </TabsTrigger>
          <TabsTrigger value="general_race">
            General Race ({articles.filter((a) => a.bin === "general_race").length})
          </TabsTrigger>
        </TabsList>

        {(["candidate", "opponent", "general_race"] as BinType[]).map((bin) => (
          <TabsContent key={bin} value={bin} className="space-y-4">
            <BinSummaryCard summary={summaries[bin] || null} bin={bin} />
            <ArticleTable
              articles={articles.filter((a) => a.bin === bin)}
              onArticleClick={setSelectedArticle}
            />
          </TabsContent>
        ))}
      </Tabs>

      <ArticleDetailDialog
        article={selectedArticle}
        onClose={() => setSelectedArticle(null)}
      />
    </div>
  );
}
