"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Article, SentimentType } from "@/types/database";

interface ArticleTableProps {
  articles: Article[];
  onArticleClick: (article: Article) => void;
}

const sentimentColors: Record<SentimentType, string> = {
  positive: "bg-green-100 text-green-800",
  neutral: "bg-gray-100 text-gray-800",
  negative: "bg-red-100 text-red-800",
  mixed: "bg-yellow-100 text-yellow-800",
};

type SortField = "date_published" | "outlet" | "sentiment" | "reach";
type SortDir = "asc" | "desc";

export function ArticleTable({ articles, onArticleClick }: ArticleTableProps) {
  const [sentimentFilter, setSentimentFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("date_published");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const filtered = useMemo(() => {
    let result = articles;
    if (sentimentFilter !== "all") {
      result = result.filter((a) => a.sentiment === sentimentFilter);
    }
    return result.sort((a, b) => {
      const aVal = a[sortField] || "";
      const bVal = b[sortField] || "";
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [articles, sentimentFilter, sortField, sortDir]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  if (articles.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg font-medium">No articles yet</p>
        <p className="text-sm mt-1">
          Articles will appear here once the first scan completes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Select value={sentimentFilter} onValueChange={(v) => v && setSentimentFilter(v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter sentiment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sentiment</SelectItem>
            <SelectItem value="positive">Positive</SelectItem>
            <SelectItem value="neutral">Neutral</SelectItem>
            <SelectItem value="negative">Negative</SelectItem>
            <SelectItem value="mixed">Mixed</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {filtered.length} article{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Headline</TableHead>
              <TableHead>Reporter</TableHead>
              <TableHead
                className="cursor-pointer hover:text-foreground"
                onClick={() => toggleSort("outlet")}
              >
                Outlet {sortField === "outlet" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:text-foreground"
                onClick={() => toggleSort("date_published")}
              >
                Date {sortField === "date_published" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:text-foreground"
                onClick={() => toggleSort("sentiment")}
              >
                Sentiment
              </TableHead>
              <TableHead
                className="cursor-pointer hover:text-foreground"
                onClick={() => toggleSort("reach")}
              >
                Reach
              </TableHead>
              <TableHead>Themes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((article) => (
              <TableRow
                key={article.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onArticleClick(article)}
              >
                <TableCell className="font-medium">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {article.headline}
                  </a>
                  {article.paywall_status === "unavailable" && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      Paywall
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {article.reporter || "—"}
                </TableCell>
                <TableCell>{article.outlet}</TableCell>
                <TableCell className="text-muted-foreground">
                  {article.date_published || "—"}
                </TableCell>
                <TableCell>
                  <Badge className={sentimentColors[article.sentiment] || ""} variant="secondary">
                    {article.sentiment}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{article.reach}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {article.key_themes.slice(0, 3).map((theme) => (
                      <Badge key={theme} variant="secondary" className="text-xs">
                        {theme}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
