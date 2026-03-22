"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCampaign } from "@/hooks/use-campaign";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserPlus, Users, Check, X, ExternalLink, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Opponent, DetectedEntity, CandidateHit } from "@/types/database";
import { toast } from "sonner";

export default function OpponentsPage() {
  const { campaign } = useCampaign();
  const [opponents, setOpponents] = useState<Opponent[]>([]);
  const [detectedEntities, setDetectedEntities] = useState<DetectedEntity[]>([]);
  const [hits, setHits] = useState<CandidateHit[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newParty, setNewParty] = useState("");
  const [activeTab, setActiveTab] = useState<"tracking" | "hits">("tracking");
  const supabase = createClient();

  useEffect(() => {
    if (!campaign) return;
    fetchData();
  }, [campaign]);

  async function fetchData() {
    const { data: opps } = await supabase
      .from("opponents")
      .select("*")
      .eq("campaign_id", campaign!.id)
      .order("created_at", { ascending: false });

    setOpponents((opps || []) as Opponent[]);

    // Get unresolved detected entities, grouped by name
    const { data: entities } = await supabase
      .from("detected_entities")
      .select("*, article:articles(headline, url)")
      .eq("campaign_id", campaign!.id)
      .eq("resolved", false)
      .eq("role", "opponent")
      .order("confidence", { ascending: false });

    setDetectedEntities((entities || []) as DetectedEntity[]);

    const { data: hitsData } = await supabase
      .from("candidate_hits")
      .select("*, article:articles(headline, url, date_published)")
      .eq("campaign_id", campaign!.id)
      .order("created_at", { ascending: false });
    setHits((hitsData || []) as CandidateHit[]);

    setLoading(false);
  }

  // Group detected entities by name
  const groupedEntities = detectedEntities.reduce(
    (acc, entity) => {
      const key = entity.name.toLowerCase();
      if (!acc[key]) {
        acc[key] = { name: entity.name, entities: [], totalConfidence: 0 };
      }
      acc[key].entities.push(entity);
      acc[key].totalConfidence = Math.max(acc[key].totalConfidence, entity.confidence);
      return acc;
    },
    {} as Record<string, { name: string; entities: DetectedEntity[]; totalConfidence: number }>
  );

  async function approveOpponent(name: string, entityIds: string[]) {
    const searchTerms = [
      name,
      `${name.split(" ").pop()} VA`,
      `${name.split(" ").pop()} Congress`,
    ];

    const { error } = await supabase.from("opponents").insert({
      campaign_id: campaign!.id,
      name,
      search_terms: searchTerms,
      source: "detected",
    });

    if (error) {
      toast.error("Failed to add opponent");
      return;
    }

    // Mark entities as resolved
    for (const id of entityIds) {
      await supabase
        .from("detected_entities")
        .update({ resolved: true })
        .eq("id", id);
    }

    toast.success(`${name} added as opponent`);
    fetchData();
  }

  async function dismissEntity(entityIds: string[]) {
    for (const id of entityIds) {
      await supabase
        .from("detected_entities")
        .update({ resolved: true })
        .eq("id", id);
    }
    toast.success("Dismissed");
    fetchData();
  }

  async function addManualOpponent() {
    if (!newName.trim()) return;

    const searchTerms = [
      newName,
      `${newName.split(" ").pop()} VA`,
      `${newName.split(" ").pop()} Congress`,
    ];

    const { error } = await supabase.from("opponents").insert({
      campaign_id: campaign!.id,
      name: newName,
      party: newParty || null,
      search_terms: searchTerms,
      source: "manual",
    });

    if (error) {
      toast.error("Failed to add opponent");
      return;
    }

    toast.success(`${newName} added`);
    setNewName("");
    setNewParty("");
    setAddDialogOpen(false);
    fetchData();
  }

  async function toggleOpponentStatus(opponent: Opponent) {
    const newStatus = opponent.status === "active" ? "inactive" : "active";
    await supabase
      .from("opponents")
      .update({ status: newStatus })
      .eq("id", opponent.id);

    toast.success(`${opponent.name} ${newStatus === "active" ? "reactivated" : "deactivated"}`);
    fetchData();
  }

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Opponents</h1>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Opponent
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Opponent Manually</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-2">
                <Label>Party (optional)</Label>
                <Input
                  value={newParty}
                  onChange={(e) => setNewParty(e.target.value)}
                  placeholder="e.g., Republican, Democrat"
                />
              </div>
              <Button onClick={addManualOpponent} className="w-full">
                Add Opponent
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Navigation cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { id: "tracking" as const, label: "Opponent Tracking", icon: Users, count: opponents.length, sub: "tracked opponents" },
          { id: "hits" as const, label: "Tara/GOP Hits", icon: ShieldAlert, count: hits.length, sub: "detected hits" },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <div
              key={tab.id}
              role="button"
              tabIndex={0}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setActiveTab(tab.id); }}
              className={cn(
                "rounded-xl border-2 p-5 cursor-pointer transition-all",
                isSelected
                  ? "border-primary bg-primary/5 shadow-[0_0_12px_rgba(236,72,153,0.3)]"
                  : "border-border bg-card hover:border-primary/50"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn("h-5 w-5", isSelected ? "text-primary" : "text-muted-foreground")} />
                <div>
                  <p className={cn("font-semibold text-sm", isSelected ? "text-primary" : "text-foreground")}>
                    {tab.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tab.count} {tab.sub}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "tracking" && (
        <div className="space-y-6">
          {/* Detected Entities Review Queue */}
          {Object.keys(groupedEntities).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Detected Potential Opponents</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.values(groupedEntities).map((group) => (
                  <div
                    key={group.name}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{group.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Detected in {group.entities.length} article{group.entities.length !== 1 ? "s" : ""} ·
                        Confidence: {Math.round(group.totalConfidence * 100)}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        &quot;{group.entities[0].context.slice(0, 120)}...&quot;
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          approveOpponent(
                            group.name,
                            group.entities.map((e) => e.id)
                          )
                        }
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          dismissEntity(group.entities.map((e) => e.id))
                        }
                      >
                        <X className="h-4 w-4 mr-1" />
                        Dismiss
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Opponent List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tracked Opponents</CardTitle>
            </CardHeader>
            <CardContent>
              {opponents.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No opponents tracked yet. Add one manually or wait for AI detection.
                </p>
              ) : (
                <div className="space-y-3">
                  {opponents.map((opponent) => (
                    <div
                      key={opponent.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{opponent.name}</p>
                          <Badge
                            variant={opponent.status === "active" ? "default" : "secondary"}
                          >
                            {opponent.status}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {opponent.source}
                          </Badge>
                        </div>
                        {opponent.party && (
                          <p className="text-sm text-muted-foreground">{opponent.party}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Search terms: {opponent.search_terms.join(", ")}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleOpponentStatus(opponent)}
                      >
                        {opponent.status === "active" ? "Deactivate" : "Reactivate"}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "hits" && (
        <div className="space-y-4">
          {hits.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p className="text-lg font-medium">No hits detected yet</p>
                <p className="text-sm mt-1">
                  Negative comments about the candidate or VA GOP will appear here
                  as they are detected in news coverage.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Negative Hits Against Candidate/GOP</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-[400px]">Comment / Hit Summary</TableHead>
                      <TableHead>Article</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hits.map((hit) => (
                      <TableRow key={hit.id}>
                        <TableCell className="font-medium">{hit.source_name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {hit.article?.date_published || new Date(hit.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{hit.comment_summary}</TableCell>
                        <TableCell>
                          {hit.article?.url && (
                            <a href={hit.article.url} target="_blank" rel="noopener noreferrer"
                               className="text-primary hover:underline inline-flex items-center gap-1">
                              View <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
