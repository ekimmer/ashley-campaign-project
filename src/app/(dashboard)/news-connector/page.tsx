"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCampaign } from "@/hooks/use-campaign";
import { TagAutocomplete } from "@/components/tag-autocomplete";
import { ArticleNotes } from "@/components/article-notes";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Star, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Article, Tag, ArticleTag } from "@/types/database";

const sentimentColors: Record<string, string> = {
  positive: "bg-green-100 text-green-800",
  neutral: "bg-gray-100 text-gray-800",
  negative: "bg-red-100 text-red-800",
  mixed: "bg-yellow-100 text-yellow-800",
};

interface StarredArticle extends Article {
  tags: Tag[];
}

export default function NewsConnectorPage() {
  const { campaign } = useCampaign();
  const [articles, setArticles] = useState<StarredArticle[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string>("all");
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    if (!campaign) return;

    // Fetch starred article IDs
    const { data: stars } = await supabase
      .from("article_stars")
      .select("article_id")
      .eq("campaign_id", campaign.id);

    if (!stars || stars.length === 0) {
      setArticles([]);
      setLoading(false);
      return;
    }

    const starredArticleIds = stars.map((s: { article_id: string }) => s.article_id);

    // Fetch the articles
    const { data: articlesData } = await supabase
      .from("articles")
      .select("*")
      .in("id", starredArticleIds)
      .order("date_published", { ascending: false });

    // Fetch all article_tags for these articles
    const { data: articleTags } = await supabase
      .from("article_tags")
      .select("*, tag:tags(*)")
      .in("article_id", starredArticleIds);

    // Fetch all campaign tags for the filter dropdown
    const { data: tagsData } = await supabase
      .from("tags")
      .select("*")
      .eq("campaign_id", campaign.id)
      .order("name");

    setAllTags((tagsData || []) as Tag[]);

    // Build article-tag map
    const tagMap: Record<string, Tag[]> = {};
    if (articleTags) {
      for (const at of articleTags as (ArticleTag & { tag: Tag })[]) {
        if (!tagMap[at.article_id]) tagMap[at.article_id] = [];
        if (at.tag) tagMap[at.article_id].push(at.tag);
      }
    }

    const enriched: StarredArticle[] = ((articlesData || []) as Article[]).map((a) => ({
      ...a,
      tags: tagMap[a.id] || [],
    }));

    setArticles(enriched);
    setLoading(false);
  }, [campaign]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleUnstar(articleId: string) {
    if (!campaign) return;
    await supabase
      .from("article_stars")
      .delete()
      .eq("campaign_id", campaign.id)
      .eq("article_id", articleId);
    setArticles((prev) => prev.filter((a) => a.id !== articleId));
  }

  async function handleTagAdd(articleId: string, tag: Tag) {
    await supabase.from("article_tags").insert({
      article_id: articleId,
      tag_id: tag.id,
    });
    setArticles((prev) =>
      prev.map((a) =>
        a.id === articleId ? { ...a, tags: [...a.tags, tag] } : a
      )
    );
    // Refresh allTags in case a new tag was created
    if (!allTags.some((t) => t.id === tag.id)) {
      setAllTags((prev) => [...prev, tag]);
    }
  }

  async function handleTagRemove(articleId: string, tagId: string) {
    await supabase
      .from("article_tags")
      .delete()
      .eq("article_id", articleId)
      .eq("tag_id", tagId);
    setArticles((prev) =>
      prev.map((a) =>
        a.id === articleId
          ? { ...a, tags: a.tags.filter((t) => t.id !== tagId) }
          : a
      )
    );
  }

  const filteredArticles =
    tagFilter === "all"
      ? articles
      : articles.filter((a) => a.tags.some((t) => t.id === tagFilter));

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">NewsConnector</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Research workspace for starred articles. Tag, annotate, and organize.
        </p>
      </div>

      {articles.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Star className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No starred articles yet</p>
          <p className="text-sm mt-1">
            Star articles in the News Tracker to add them to your research workspace.
          </p>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex items-center gap-3">
            <Select
              value={tagFilter}
              onValueChange={(v) => v && setTagFilter(v)}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {allTags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    {tag.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              {filteredArticles.length} article
              {filteredArticles.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Article table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="w-[280px]">Headline</TableHead>
                  <TableHead>Outlet</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Sentiment</TableHead>
                  <TableHead>Tags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredArticles.map((article) => {
                  const isExpanded = expandedId === article.id;
                  return (
                    <TableRow
                      key={article.id}
                      className="group"
                    >
                      <TableCell colSpan={7} className="p-0">
                        {/* Main row */}
                        <div
                          className={cn(
                            "flex items-center cursor-pointer hover:bg-muted/50 transition-colors",
                            isExpanded && "bg-muted/30"
                          )}
                          onClick={() =>
                            setExpandedId(isExpanded ? null : article.id)
                          }
                        >
                          {/* Expand chevron */}
                          <div className="w-10 flex items-center justify-center px-2 py-3">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>

                          {/* Unstar */}
                          <div className="w-10 flex items-center justify-center px-2 py-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUnstar(article.id);
                              }}
                              className="hover:scale-110 transition-transform"
                              title="Remove from NewsConnector"
                            >
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            </button>
                          </div>

                          {/* Headline */}
                          <div className="flex-1 min-w-0 w-[280px] px-2 py-3 font-medium">
                            <a
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {article.headline}
                            </a>
                          </div>

                          {/* Outlet */}
                          <div className="w-[100px] px-2 py-3 text-sm">
                            {article.outlet}
                          </div>

                          {/* Date */}
                          <div className="w-[100px] px-2 py-3 text-sm text-muted-foreground">
                            {article.date_published || "—"}
                          </div>

                          {/* Sentiment */}
                          <div className="w-[100px] px-2 py-3">
                            <Badge
                              className={sentimentColors[article.sentiment] || ""}
                              variant="secondary"
                            >
                              {article.sentiment}
                            </Badge>
                          </div>

                          {/* Tags */}
                          <div className="flex-1 px-2 py-3">
                            <div className="flex gap-1 flex-wrap">
                              {article.tags.map((tag) => (
                                <Badge
                                  key={tag.id}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {tag.name}
                                </Badge>
                              ))}
                              {article.tags.length === 0 && (
                                <span className="text-xs text-muted-foreground">
                                  No tags
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Expanded detail panel */}
                        {isExpanded && campaign && (
                          <div className="border-t bg-muted/10 px-6 py-4 space-y-4">
                            {/* AI Summary */}
                            <div>
                              <h4 className="text-sm font-semibold mb-1">
                                AI Summary
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {article.ai_summary}
                              </p>
                            </div>

                            <Separator />

                            {/* Tags management */}
                            <div>
                              <h4 className="text-sm font-semibold mb-2">
                                Tags
                              </h4>
                              <TagAutocomplete
                                campaignId={campaign.id}
                                selectedTags={article.tags}
                                onTagAdd={(tag) =>
                                  handleTagAdd(article.id, tag)
                                }
                                onTagRemove={(tagId) =>
                                  handleTagRemove(article.id, tagId)
                                }
                              />
                            </div>

                            <Separator />

                            {/* Notes */}
                            <ArticleNotes
                              campaignId={campaign.id}
                              articleId={article.id}
                            />
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
