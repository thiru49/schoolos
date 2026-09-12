"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createTheme } from "@schoolos/ui";
import type { BrandingPayload } from "@schoolos/types";
import { api } from "../../../lib/api";
import { getSlug, setSlug, setTokens } from "../../../lib/session";

export default function LoginPage() {
  const router = useRouter();
  const [slug, setSlugField] = useState(getSlug());
  const [identifier, setIdentifier] = useState("superadmin");
  const [password, setPassword] = useState("");
  const [branding, setBranding] = useState<BrandingPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api()
      .branding.get(slug)
      .then(setBranding)
      .catch(() => setBranding(null));
  }, [slug]);

  const theme = createTheme(branding);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      setSlug(slug);
      const res = await api().auth.login({ slug, identifier, password });
      setTokens(res.accessToken, res.refreshToken);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6" style={{ background: theme.colors.background }}>
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-2xl bg-white p-8 shadow-md">
        <p className="text-sm text-slate-500">SchoolOS Admin</p>
        <h1 className="mt-1 font-display text-2xl font-bold" style={{ color: theme.colors.primary }}>
          {branding?.schoolName ?? "School"}
        </h1>
        <p className="mt-1 text-sm" style={{ color: theme.colors.accent }}>
          {branding?.tagline ?? ""}
        </p>
        <label className="mt-6 block text-sm font-medium">Tenant slug</label>
        <input
          className="mt-1 w-full rounded-lg border px-3 py-2"
          value={slug}
          onChange={(e) => setSlugField(e.target.value)}
        />
        <label className="mt-4 block text-sm font-medium">Identifier</label>
        <input
          className="mt-1 w-full rounded-lg border px-3 py-2"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />
        <label className="mt-4 block text-sm font-medium">Password</label>
        <input
          type="password"
          className="mt-1 w-full rounded-lg border px-3 py-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-lg py-2.5 font-medium text-white"
          style={{ background: theme.colors.primary }}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
