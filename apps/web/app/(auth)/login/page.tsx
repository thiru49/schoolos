"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createTheme } from "@schoolos/ui";
import type { BrandingPayload } from "@schoolos/types";
import { api } from "../../../lib/api";
import { getSlug, setSlug, setTokens } from "../../../lib/session";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [slug, setSlugField] = useState(getSlug());
  const [identifier, setIdentifier] = useState("superadmin");
  const [password, setPassword] = useState("");
  const [branding, setBranding] = useState<BrandingPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [brandError, setBrandError] = useState(false);

  useEffect(() => {
    api()
      .branding.get(slug)
      .then((b) => {
        setBranding(b);
        setBrandError(false);
        const theme = createTheme(b);
        for (const [k, v] of Object.entries(theme.cssVars)) {
          document.documentElement.style.setProperty(k, v);
        }
      })
      .catch(() => {
        setBranding(null);
        setBrandError(true);
      });
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
      setError(err instanceof Error ? err.message : "Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2" style={{ background: theme.colors.background }}>
      <section
        className="hidden flex-col justify-between p-12 text-white lg:flex"
        style={{ background: theme.colors.primaryDark }}
      >
        <p className="text-xs uppercase tracking-[0.25em] text-white/60">SchoolOS</p>
        <div>
          <h1 className="font-display text-4xl font-bold">{branding?.schoolName ?? "School"}</h1>
          <p className="mt-3 text-accent">{branding?.tagline ?? ""}</p>
          <p className="mt-6 text-sm text-white/70">{branding?.location}</p>
        </div>
        <p className="text-xs text-white/50">{branding?.poweredBy ?? "CREOVY Digital Solutions"}</p>
      </section>
      <section className="flex items-center justify-center p-6">
        <form onSubmit={onSubmit} className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
          <p className="text-sm text-slate-500">Web admin</p>
          <h2 className="mt-1 font-display text-2xl font-bold text-primary">Sign in</h2>
          {brandError ? <p className="mt-3 text-sm text-danger">School unavailable — check tenant slug.</p> : null}
          <Label className="mt-6 block">Tenant slug</Label>
          <Input className="mt-1" value={slug} onChange={(e) => setSlugField(e.target.value)} />
          <Label className="mt-4 block">Identifier</Label>
          <Input className="mt-1" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
          <Label className="mt-4 block">Password</Label>
          <Input className="mt-1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
          <Button className="mt-6 w-full" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Continue"}
          </Button>
        </form>
      </section>
    </main>
  );
}
