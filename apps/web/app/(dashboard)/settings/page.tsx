"use client";

import { useEffect, useState } from "react";
import type { BrandingPayload } from "@schoolos/types";
import { toast } from "sonner";
import { api } from "../../../lib/api";
import { getSlug } from "../../../lib/session";
import { AppHeader } from "../../../components/shell/app-header";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Card } from "../../../components/ui/card";

export default function SettingsPage() {
  const [branding, setBranding] = useState<BrandingPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api()
      .branding.get(getSlug())
      .then(setBranding)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (!branding) return <p className="text-slate-500">{error ?? "Loading…"}</p>;

  async function save() {
    if (!branding) return;
    try {
      const next = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/schools/branding`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("schoolos.access") ?? ""}`,
        },
        body: JSON.stringify({
          schoolName: branding.schoolName,
          tagline: branding.tagline,
          location: branding.location,
        }),
      });
      if (!next.ok) throw new Error("Save failed");
      toast.success("Branding saved. Refresh to apply.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  return (
    <div>
      <AppHeader title="School Settings · Branding" subtitle="Runtime white-label. Next open uses these tokens." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <Label>School name</Label>
          <Input className="mt-1" value={branding.schoolName} onChange={(e) => setBranding({ ...branding, schoolName: e.target.value })} />
          <Label className="mt-4 block">Tagline</Label>
          <Input className="mt-1" value={branding.tagline} onChange={(e) => setBranding({ ...branding, tagline: e.target.value })} />
          <Label className="mt-4 block">Location</Label>
          <Input className="mt-1" value={branding.location} onChange={(e) => setBranding({ ...branding, location: e.target.value })} />
          <p className="mt-4 text-xs text-slate-500">Primary {branding.theme.primary} · Accent {branding.theme.accent}</p>
          <Button className="mt-6" onClick={() => void save()}>
            Save
          </Button>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-slate-400">Live preview</p>
          <p className="mt-3 font-display text-2xl font-bold text-primary">{branding.schoolName}</p>
          <p className="text-accent">{branding.tagline}</p>
          <p className="mt-2 text-sm text-slate-500">{branding.location}</p>
          <p className="mt-6 text-sm text-slate-500">{branding.typography.families.display} + {branding.typography.families.tamil}</p>
        </Card>
      </div>
    </div>
  );
}
