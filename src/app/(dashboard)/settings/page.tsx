"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCampaign } from "@/hooks/use-campaign";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Save } from "lucide-react";
import type { Campaign, SearchConfig } from "@/types/database";
import { toast } from "sonner";

export default function SettingsPage() {
  const { campaign, loading: campaignLoading } = useCampaign();
  const [name, setName] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [district, setDistrict] = useState("");
  const [alertEmail, setAlertEmail] = useState("");
  const [digestTime, setDigestTime] = useState("07:00");
  const [candidateTerms, setCandidateTerms] = useState("");
  const [raceTerms, setRaceTerms] = useState("");
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!campaign) return;
    setName(campaign.name);
    setCandidateName(campaign.candidate_name);
    setDistrict(campaign.district);
    setAlertEmail(campaign.alert_email);
    setDigestTime(campaign.digest_time?.slice(0, 5) || "07:00");

    const config = campaign.search_config as SearchConfig;
    setCandidateTerms((config.candidate_terms || []).join(", "));
    setRaceTerms((config.general_race_terms || []).join(", "));
  }, [campaign]);

  async function handleSave() {
    if (!campaign) return;
    setSaving(true);

    const searchConfig: SearchConfig = {
      candidate_terms: candidateTerms
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      general_race_terms: raceTerms
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };

    const { error } = await supabase
      .from("campaigns")
      .update({
        name,
        candidate_name: candidateName,
        district,
        alert_email: alertEmail,
        digest_time: digestTime + ":00",
        search_config: searchConfig,
      })
      .eq("id", campaign.id);

    setSaving(false);

    if (error) {
      toast.error("Failed to save settings");
    } else {
      toast.success("Settings saved");
    }
  }

  if (campaignLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Campaign Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Campaign Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Candidate Name</Label>
              <Input
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>District</Label>
            <Input value={district} onChange={(e) => setDistrict(e.target.value)} />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Candidate Search Terms</Label>
            <Input
              value={candidateTerms}
              onChange={(e) => setCandidateTerms(e.target.value)}
              placeholder="Comma-separated search terms"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated terms used to find articles about the candidate
            </p>
          </div>

          <div className="space-y-2">
            <Label>General Race Search Terms</Label>
            <Input
              value={raceTerms}
              onChange={(e) => setRaceTerms(e.target.value)}
              placeholder="Comma-separated search terms"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated terms for general race/district coverage
            </p>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Alert Email</Label>
              <Input
                type="email"
                value={alertEmail}
                onChange={(e) => setAlertEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Daily Digest Time</Label>
              <Input
                type="time"
                value={digestTime}
                onChange={(e) => setDigestTime(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
