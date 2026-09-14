"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@schoolos/api-client";
import type { BrandingPayload } from "@schoolos/types";
import {
  BRANDING_TYPOGRAPHY_PRESET_IDS,
  BRANDING_TYPOGRAPHY_PRESET_LABELS,
  FONT_ALLOWLIST,
  resolveTypographyUpdate,
  type BrandingTypographyPresetId,
} from "@schoolos/ui";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { useAppBranding } from "../../lib/branding-context";
import { AppHeader } from "../../components/shell/app-header";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select } from "../../components/ui/select";
import { Skeleton } from "../../components/ui/skeleton";
import { ErrorState } from "../../components/states/error-state";
import { PermissionDenied } from "../../components/states/permission-denied";
import {
  canReadSettings,
  canUpdateBranding,
  canUpdateSettings,
} from "./settings-policy";

type ViewState = "loading" | "loaded" | "error" | "denied" | "offline";

const THEME_FIELDS: { key: keyof BrandingPayload["theme"]; label: string }[] = [
  { key: "primary", label: "Primary" },
  { key: "primaryDark", label: "Primary dark" },
  { key: "accent", label: "Accent" },
  { key: "background", label: "Background" },
  { key: "success", label: "Success" },
  { key: "warning", label: "Warning" },
  { key: "danger", label: "Danger" },
];

export function SettingsBoard() {
  const { acl, applyBranding } = useAppBranding();
  const canRead = canReadSettings(acl);
  const canBrand = canUpdateBranding(acl);
  const canOps = canUpdateSettings(acl);

  const [settings, setSettings] = useState<BrandingPayload | null>(null);
  const [state, setState] = useState<ViewState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [savingBranding, setSavingBranding] = useState(false);
  const [savingOps, setSavingOps] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadSettings = useCallback(async () => {
    if (!canRead) {
      setState("denied");
      return;
    }
    setState("loading");
    setErrorMessage("");
    try {
      const data = await api().branding.getSettings();
      setSettings(data);
      setState("loaded");
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setState("denied");
        setErrorMessage(err.message);
        return;
      }
      if (err instanceof TypeError) {
        setState("offline");
        setErrorMessage("You appear to be offline.");
        return;
      }
      setState("error");
      setErrorMessage(err instanceof Error ? err.message : "Failed to load settings");
    }
  }, [canRead]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  async function saveBranding() {
    if (!settings || !canBrand) return;
    setSavingBranding(true);
    try {
      const updated = await api().branding.update({
        schoolName: settings.schoolName,
        tagline: settings.tagline,
        location: settings.location,
        theme: settings.theme,
        typography: {
          families: settings.typography.families,
          scale: { md: settings.typography.scale.md },
        },
      });
      setSettings(updated);
      applyBranding(updated);
      toast.success("Branding saved and applied.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save branding");
    } finally {
      setSavingBranding(false);
    }
  }

  async function saveOperational() {
    if (!settings || !canOps) return;
    setSavingOps(true);
    try {
      const updated = await api().branding.updateSettings({
        receiptPrefix: settings.receiptPrefix,
        defaultLanguage: settings.defaultLanguage as "en" | "ta",
        attendanceMode: settings.attendanceMode as "daily",
      });
      setSettings(updated);
      applyBranding(updated);
      toast.success("Operational settings saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSavingOps(false);
    }
  }

  async function onLogoSelected(file: File | undefined) {
    if (!file || !settings || !canBrand) return;
    setUploadingLogo(true);
    try {
      const { logoUrl } = await api().branding.uploadLogo(file);
      const next = { ...settings, logoUrl };
      setSettings(next);
      applyBranding(next);
      toast.success("Logo uploaded.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Logo upload failed");
    } finally {
      setUploadingLogo(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function setPreset(preset: BrandingTypographyPresetId) {
    if (!settings) return;
    setSettings({
      ...settings,
      typography: resolveTypographyUpdate(settings.typography, { preset }),
    });
  }

  if (state === "loading") {
    return (
      <div>
        <AppHeader title="School Settings" subtitle="Identity, branding, and operational defaults." />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div>
        <AppHeader title="School Settings" />
        <PermissionDenied
          detail={errorMessage || "You do not have permission to view school settings."}
        />
      </div>
    );
  }

  if (state === "offline" || state === "error" || !settings) {
    return (
      <div>
        <AppHeader title="School Settings" />
        <ErrorState
          message={
            state === "offline"
              ? errorMessage || "You appear to be offline."
              : errorMessage || "Could not load settings."
          }
          onRetry={() => void loadSettings()}
        />
      </div>
    );
  }

  const readOnlyBranding = !canBrand;
  const readOnlyOps = !canOps;

  return (
    <div>
      <AppHeader
        title="School Settings"
        subtitle="Runtime white-label configuration for this tenant."
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <h2 className="font-display text-lg font-semibold text-slate-900">Identity</h2>
            <p className="mt-1 text-sm text-slate-500">School name, tagline, and location shown across the shell.</p>
            <div className="mt-4 space-y-4">
              <div>
                <Label htmlFor="schoolName">School name</Label>
                <Input
                  className="mt-1"
                  value={settings.schoolName}
                  disabled={readOnlyBranding || savingBranding}
                  onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  className="mt-1"
                  value={settings.tagline}
                  disabled={readOnlyBranding || savingBranding}
                  onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  className="mt-1"
                  value={settings.location}
                  disabled={readOnlyBranding || savingBranding}
                  onChange={(e) => setSettings({ ...settings, location: e.target.value })}
                />
              </div>
              <div>
                <Label>Logo</Label>
                <div className="mt-2 flex items-center gap-4">
                  {settings.logoUrl ? (
                    <img
                      src={settings.logoUrl}
                      alt={`${settings.schoolName} logo`}
                      className="h-14 w-14 rounded-lg border border-slate-200 object-contain bg-white p-1"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-400">
                      <ImagePlus className="h-5 w-5" />
                    </div>
                  )}
                  <div>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      disabled={readOnlyBranding || uploadingLogo}
                      onChange={(e) => void onLogoSelected(e.target.files?.[0])}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={readOnlyBranding || uploadingLogo}
                      onClick={() => fileRef.current?.click()}
                    >
                      {uploadingLogo ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading…
                        </>
                      ) : (
                        "Upload logo"
                      )}
                    </Button>
                    {readOnlyBranding && (
                      <p className="mt-1 text-xs text-slate-500">Requires school.branding.update</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="font-display text-lg font-semibold text-slate-900">Theme colours</h2>
            <p className="mt-1 text-sm text-slate-500">Primary palette applied via CSS variables.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {THEME_FIELDS.map(({ key, label }) => (
                <div key={key}>
                  <Label htmlFor={`theme-${key}`}>{label}</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      id={`theme-${key}`}
                      type="color"
                      className="h-10 w-12 cursor-pointer rounded border border-slate-200 disabled:cursor-not-allowed"
                      value={settings.theme[key]}
                      disabled={readOnlyBranding || savingBranding}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          theme: { ...settings.theme, [key]: e.target.value },
                        })
                      }
                    />
                    <Input
                      value={settings.theme[key]}
                      disabled={readOnlyBranding || savingBranding}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          theme: { ...settings.theme, [key]: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="font-display text-lg font-semibold text-slate-900">Typography</h2>
            <p className="mt-1 text-sm text-slate-500">Font preset and families from the approved allowlist.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="preset">Font preset</Label>
                <Select
                  id="preset"
                  className="mt-1"
                  value={settings.typography.preset}
                  disabled={readOnlyBranding || savingBranding}
                  onChange={(e) => setPreset(e.target.value as BrandingTypographyPresetId)}
                >
                  {BRANDING_TYPOGRAPHY_PRESET_IDS.map((id) => (
                    <option key={id} value={id}>
                      {BRANDING_TYPOGRAPHY_PRESET_LABELS[id]}
                    </option>
                  ))}
                </Select>
              </div>
              {(["display", "body", "tamil"] as const).map((role) => (
                <div key={role}>
                  <Label htmlFor={`font-${role}`}>{role === "tamil" ? "Tamil font" : `${role} font`}</Label>
                  <Select
                    id={`font-${role}`}
                    className="mt-1"
                    value={settings.typography.families[role]}
                    disabled={readOnlyBranding || savingBranding}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        typography: {
                          ...settings.typography,
                          families: {
                            ...settings.typography.families,
                            [role]: e.target.value,
                          },
                        },
                      })
                    }
                  >
                    {FONT_ALLOWLIST.map((font) => (
                      <option key={font} value={font}>
                        {font}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
              <div>
                <Label htmlFor="baseSize">Base size (md)</Label>
                <Input
                  type="number"
                  className="mt-1"
                  value={String(settings.typography.scale.md)}
                  disabled={readOnlyBranding || savingBranding}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      typography: {
                        ...settings.typography,
                        scale: {
                          ...settings.typography.scale,
                          md: Number(e.target.value),
                        },
                      },
                    })
                  }
                />
              </div>
            </div>
            {canBrand && (
              <Button className="mt-6" disabled={savingBranding} onClick={() => void saveBranding()}>
                {savingBranding ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving branding…
                  </>
                ) : (
                  "Save identity, theme & typography"
                )}
              </Button>
            )}
            {readOnlyBranding && (
              <p className="mt-4 text-sm text-slate-500">Branding edits require school.branding.update.</p>
            )}
          </Card>

          <Card>
            <h2 className="font-display text-lg font-semibold text-slate-900">Operational</h2>
            <p className="mt-1 text-sm text-slate-500">Receipt prefix, language, and attendance mode.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="receiptPrefix">Receipt prefix</Label>
                <Input
                  className="mt-1"
                  value={settings.receiptPrefix}
                  disabled={readOnlyOps || savingOps}
                  onChange={(e) => setSettings({ ...settings, receiptPrefix: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="defaultLanguage">Default language</Label>
                <Select
                  id="defaultLanguage"
                  className="mt-1"
                  value={settings.defaultLanguage}
                  disabled={readOnlyOps || savingOps}
                  onChange={(e) => setSettings({ ...settings, defaultLanguage: e.target.value })}
                >
                  <option value="en">English</option>
                  <option value="ta">Tamil</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="attendanceMode">Attendance mode</Label>
                <Select
                  id="attendanceMode"
                  className="mt-1"
                  value={settings.attendanceMode}
                  disabled={readOnlyOps || savingOps}
                  onChange={(e) => setSettings({ ...settings, attendanceMode: e.target.value })}
                >
                  <option value="daily">Daily</option>
                </Select>
              </div>
            </div>
            {canOps && (
              <Button className="mt-6" disabled={savingOps} onClick={() => void saveOperational()}>
                {savingOps ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save operational settings"
                )}
              </Button>
            )}
            {readOnlyOps && (
              <p className="mt-4 text-sm text-slate-500">Operational edits require school.settings.update.</p>
            )}
          </Card>
        </div>

        <Card className="h-fit xl:sticky xl:top-8">
          <p className="text-xs uppercase tracking-wide text-slate-400">Live preview</p>
          {settings.logoUrl && (
            <img
              src={settings.logoUrl}
              alt=""
              className="mt-4 h-12 w-12 rounded object-contain"
            />
          )}
          <p className="mt-3 font-display text-2xl font-bold text-primary">{settings.schoolName}</p>
          <p className="text-accent">{settings.tagline}</p>
          <p className="mt-2 text-sm text-slate-500">{settings.location}</p>
          <p className="mt-6 font-tamil text-lg text-slate-800">அறிவு · பராமரிப்பு · சிறப்பு</p>
          <p className="mt-4 text-sm font-semibold text-slate-700">
            Receipt: {settings.receiptPrefix}/0001
          </p>
          <p className="mt-4 text-xs text-slate-500">
            {settings.typography.families.display} · {settings.typography.families.tamil}
          </p>
        </Card>
      </div>
    </div>
  );
}
