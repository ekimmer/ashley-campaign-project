"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCampaign } from "@/hooks/use-campaign";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, AlertTriangle, AlertCircle, Info, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Alert } from "@/types/database";
import { toast } from "sonner";

const sentimentColors = {
  positive: "bg-green-100 text-green-800",
  neutral: "bg-gray-100 text-gray-800",
  negative: "bg-red-100 text-red-800",
  mixed: "bg-yellow-100 text-yellow-800",
};

const tierConfig = {
  critical: {
    icon: AlertTriangle,
    color: "text-red-600",
    bg: "bg-red-50 border-red-200",
    badge: "bg-red-100 text-red-800",
  },
  high: {
    icon: AlertCircle,
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
    badge: "bg-amber-100 text-amber-800",
  },
  standard: {
    icon: Info,
    color: "text-green-600",
    bg: "bg-green-50 border-green-200",
    badge: "bg-green-100 text-green-800",
  },
};

export default function AlertsPage() {
  const { campaign } = useCampaign();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [tierFilter, setTierFilter] = useState("all");
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!campaign) return;
    fetchAlerts();
  }, [campaign]);

  async function fetchAlerts() {
    const { data } = await supabase
      .from("alerts")
      .select("*, alert_articles(id, article_id, article:articles(id, headline, url, outlet, date_published, sentiment))")
      .eq("campaign_id", campaign!.id)
      .order("created_at", { ascending: false });

    setAlerts((data || []) as Alert[]);
    setLoading(false);
  }

  async function acknowledgeAlert(alertId: string) {
    await supabase
      .from("alerts")
      .update({ acknowledged: true, acknowledged_at: new Date().toISOString() })
      .eq("id", alertId);

    toast.success("Alert acknowledged");
    fetchAlerts();
  }

  const filteredAlerts =
    tierFilter === "all"
      ? alerts
      : alerts.filter((a) => a.tier === tierFilter);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Alerts</h1>
        <Select value={tierFilter} onValueChange={(v) => v && setTierFilter(v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredAlerts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-lg font-medium">No alerts</p>
            <p className="text-sm mt-1">
              Alerts will appear here when the system detects noteworthy coverage.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => {
            const config = tierConfig[alert.tier];
            const Icon = config.icon;

            return (
              <Card
                key={alert.id}
                className={cn(
                  config.bg,
                  alert.acknowledged ? "opacity-60" : "",
                  "cursor-pointer"
                )}
                onClick={() => setExpandedAlertId(expandedAlertId === alert.id ? null : alert.id)}
              >
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${config.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={config.badge} variant="secondary">
                          {alert.tier}
                        </Badge>
                        <ChevronDown className={cn("h-4 w-4 transition-transform", expandedAlertId === alert.id && "rotate-180")} />
                        <span className="text-xs text-muted-foreground">
                          {new Date(alert.created_at).toLocaleString()}
                        </span>
                        {alert.acknowledged && (
                          <Badge variant="outline" className="text-xs">
                            Acknowledged
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium text-sm">{alert.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {alert.description}
                      </p>
                      {expandedAlertId === alert.id && (
                        <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                          {((alert as any).alert_articles || []).map((aa: any) => (
                            <div key={aa.id} className="flex items-center gap-3 p-2 bg-background/50 rounded text-sm">
                              <div className="flex-1 min-w-0">
                                <a href={aa.article?.url} target="_blank" rel="noopener noreferrer"
                                   className="text-primary hover:underline font-medium"
                                   onClick={(e) => e.stopPropagation()}>
                                  {aa.article?.headline}
                                </a>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                  <span>{aa.article?.outlet}</span>
                                  <span>&middot;</span>
                                  <span>{aa.article?.date_published}</span>
                                </div>
                              </div>
                              {aa.article?.sentiment && (
                                <Badge className={sentimentColors[aa.article.sentiment as keyof typeof sentimentColors]} variant="secondary">
                                  {aa.article.sentiment}
                                </Badge>
                              )}
                            </div>
                          ))}
                          {(!(alert as any).alert_articles || (alert as any).alert_articles.length === 0) && (alert as any).article && (
                            <div className="flex items-center gap-3 p-2 bg-background/50 rounded text-sm">
                              <div className="flex-1 min-w-0">
                                <a href={(alert as any).article.url} target="_blank" rel="noopener noreferrer"
                                   className="text-primary hover:underline font-medium"
                                   onClick={(e) => e.stopPropagation()}>
                                  {(alert as any).article.headline}
                                </a>
                                <span className="text-xs text-muted-foreground ml-2">{(alert as any).article.outlet}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {!alert.acknowledged && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          acknowledgeAlert(alert.id);
                        }}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Acknowledge
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
