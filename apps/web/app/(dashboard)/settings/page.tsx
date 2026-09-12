"use client";

import { useEffect, useState } from "react";
import type { BrandingPayload } from "@schoolos/types";
import { api } from "../../../lib/api";
import { getSlug } from "../../../lib/session";

export default function SettingsPage() {
  const [branding, setBranding] = useState<BrandingPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api()
      .branding.get(getSlug())
      .then(setBranding)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (!branding) return <p className="text-slate-500">{error ?? "Loading…"}</p>;

  async function save() {
    setError(null);
    setSaved(false);
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
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-2xl font-bold text-primary">School Settings · Branding</h1>
      <label className="mt-6 block text-sm">School name</label>
      <input
        className="mt-1 w-full rounded-lg border px-3 py-2"
        value={branding.schoolName}
        onChange={(e) => setBranding({ ...branding, schoolName: e.target.value })}
      />
      <label className="mt-4 block text-sm">Tagline</label>
      <input
        className="mt-1 w-full rounded-lg border px-3 py-2"
        value={branding.tagline}
        onChange={(e) => setBranding({ ...branding, tagline: e.target.value })}
      />
      <label className="mt-4 block text-sm">Location</label>
      <input
        className="mt-1 w-full rounded-lg border px-3 py-2"
        value={branding.location}
        onChange={(e) => setBranding({ ...branding, location: e.target.value })}
      />
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      {saved ? <p className="mt-3 text-sm text-success">Saved. Next splash/refresh shows new tokens.</p> : null}
      <button className="mt-6 rounded-lg bg-primary px-4 py-2 text-white" onClick={() => void save()}>
        Save
      </button>
    </div>
  );
}
