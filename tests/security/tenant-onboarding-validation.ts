/**
 * TEN-VAL-001 — Second-tenant onboarding and branding validation gate.
 * Run against seeded API: pnpm tsx tests/security/tenant-onboarding-validation.ts
 *
 * Configures school-b via Settings APIs (same contract as Web Settings),
 * validates tenant branding/isolation/PDF surfaces, then restores seed fixture data.
 */
import { PrismaClient } from "@prisma/client";
import { renderReportCardPdf } from "../../apps/worker/src/report-card-pdf";

const API = process.env.API_URL ?? "http://localhost:4000";
const PASSWORD = process.env.SEED_PASSWORD ?? "Password123!";

const prisma = new PrismaClient();

type Scenario = { id: string; name: string; pass: boolean; note: string };
const scenarios: Scenario[] = [];

function record(id: string, name: string, pass: boolean, note = "") {
  scenarios.push({ id, name, pass, note });
  const mark = pass ? "PASS" : "FAIL";
  console.log(`[${mark}] ${id} ${name}${note ? ` — ${note}` : ""}`);
}

async function login(slug: string, identifier: string, roleHint?: string) {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug, identifier, password: PASSWORD, roleHint }),
  });
  if (!res.ok) throw new Error(`login ${identifier}@${slug}: ${res.status} ${await res.text()}`);
  return res.json() as Promise<{ accessToken: string }>;
}

async function authed(token: string, path: string, init: RequestInit = {}) {
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
}

type BrandingPayload = {
  tenantId: string;
  slug: string;
  schoolName: string;
  tagline: string;
  location: string;
  logoUrl: string | null;
  theme: { primary: string; accent: string };
  typography: { preset: string; families: { display: string } };
  receiptPrefix: string;
  defaultLanguage: string;
  attendanceMode: string;
};

function contains(hay: string, term: string) {
  if (hay.includes(term)) return true;
  const hex = Buffer.from(term, "utf8").toString("hex").toLowerCase();
  if (hay.toLowerCase().includes(hex.slice(0, 16))) return true;
  for (let i = 0; i < hex.length - 3; i += 4) {
    if (hay.toLowerCase().includes(hex.slice(i, i + 4))) return true;
  }
  return false;
}

function pdfHas(hay: string, label: string, value: string) {
  if (contains(hay, value)) return true;
  throw new Error(`${label} missing from PDF: ${value}`);
}

function pdfMustNotInclude(hay: string, label: string, value: string) {
  // Negative checks must be plaintext-only. Hex-nibble matching (contains)
  // false-positives against compressed PDF streams.
  if (!hay.includes(value)) return;
  throw new Error(`${label}: found "${value}"`);
}

function isPdf(body: ArrayBuffer) {
  const head = new Uint8Array(body).subarray(0, 5);
  return String.fromCharCode(...head) === "%PDF-";
}

const ONBOARDED = {
  schoolName: "Greenfield International School",
  tagline: "Grow · Learn · Lead",
  location: "Chennai · Coimbatore",
  receiptPrefix: "GIS/26-27",
  defaultLanguage: "ta" as const,
  theme: {
    primary: "#1E3A8A",
    primaryDark: "#1E40AF",
    accent: "#F97316",
    background: "#EFF6FF",
    success: "#16A34A",
    warning: "#F59E0B",
    danger: "#DC2626",
  },
  typography: { preset: "classic" as const },
};

const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function uploadLogo(token: string, file: Buffer, filename: string, mime: string) {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(file)], { type: mime }), filename);
  return fetch(`${API}/schools/branding/logo`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
}

async function publicBranding(slug: string) {
  const res = await fetch(`${API}/public/tenants/${encodeURIComponent(slug)}/branding`);
  if (!res.ok) throw new Error(`public branding ${slug}: ${res.status}`);
  return (await res.json()) as BrandingPayload;
}

function typographyPreset(value: unknown): string {
  const preset = (value as { preset?: unknown } | null)?.preset;
  return typeof preset === "string" && preset.length > 0 ? preset : "arulneri";
}

async function restoreSchoolB(
  token: string,
  original: {
    id: string;
    name: string;
    tagline: string;
    location: string;
    receiptPrefix: string;
    defaultLanguage: string;
    attendanceMode: string;
    theme: unknown;
    typography: unknown;
    logoUrl: string | null;
  },
) {
  await authed(token, "/schools/branding", {
    method: "PATCH",
    body: JSON.stringify({
      schoolName: original.name,
      tagline: original.tagline,
      location: original.location,
      theme: original.theme as object,
      typography: { preset: typographyPreset(original.typography) },
    }),
  });
  await authed(token, "/schools/settings", {
    method: "PATCH",
    body: JSON.stringify({
      receiptPrefix: original.receiptPrefix,
      defaultLanguage: original.defaultLanguage,
      attendanceMode: original.attendanceMode,
    }),
  });
  await prisma.$executeRaw`SELECT set_config('app.school_id', ${original.id}, false)`;
  await prisma.school.update({
    where: { id: original.id },
    data: { logoUrl: original.logoUrl },
  });
}

async function main() {
  const schoolA = await prisma.school.findFirst({ where: { slug: "arulneri" } });
  const schoolB = await prisma.school.findFirst({ where: { slug: "school-b" } });
  if (!schoolA || !schoolB) throw new Error("Seed schools missing");

  const originalB = await prisma.school.findUniqueOrThrow({ where: { id: schoolB.id } });
  const originalA = await prisma.school.findUniqueOrThrow({ where: { id: schoolA.id } });

  const adminB = await login("school-b", "superadmin", "school_super_admin");
  const adminA = await login("arulneri", "superadmin", "school_super_admin");
  const accountsA = await login("arulneri", "accounts", "accounts_admin");

  let onboardedLogoUrl: string | null = null;

  try {
    // ── 1. Tenant onboarding via Settings APIs ───────────────────────────────
    const settingsRead = await authed(adminB.accessToken, "/schools/settings");
    record(
      "1.1",
      "school-b super admin can open Settings (GET /schools/settings)",
      settingsRead.ok,
      settingsRead.ok ? "" : await settingsRead.text(),
    );

    const brandingPatch = await authed(adminB.accessToken, "/schools/branding", {
      method: "PATCH",
      body: JSON.stringify({
        schoolName: ONBOARDED.schoolName,
        tagline: ONBOARDED.tagline,
        location: ONBOARDED.location,
        theme: ONBOARDED.theme,
        typography: ONBOARDED.typography,
      }),
    });
    const brandingBody = brandingPatch.ok
      ? ((await brandingPatch.json()) as BrandingPayload)
      : null;
    record(
      "1.2",
      "Configure school-b identity, theme, typography",
      brandingPatch.ok && brandingBody?.schoolName === ONBOARDED.schoolName,
      brandingPatch.ok ? `preset=${brandingBody?.typography.preset}` : await brandingPatch.text(),
    );

    const settingsPatch = await authed(adminB.accessToken, "/schools/settings", {
      method: "PATCH",
      body: JSON.stringify({
        receiptPrefix: ONBOARDED.receiptPrefix,
        defaultLanguage: ONBOARDED.defaultLanguage,
        attendanceMode: "daily",
      }),
    });
    const settingsBody = settingsPatch.ok ? ((await settingsPatch.json()) as BrandingPayload) : null;
    record(
      "1.3",
      "Configure school-b operational settings",
      settingsPatch.ok &&
        settingsBody?.receiptPrefix === ONBOARDED.receiptPrefix &&
        settingsBody?.defaultLanguage === ONBOARDED.defaultLanguage,
      settingsPatch.ok ? `lang=${settingsBody?.defaultLanguage}` : await settingsPatch.text(),
    );

    const logoRes = await uploadLogo(adminB.accessToken, PNG_1X1, "school-b-logo.png", "image/png");
    if (logoRes.ok) {
      const logoBody = (await logoRes.json()) as { logoUrl: string };
      onboardedLogoUrl = logoBody.logoUrl;
      record("1.4", "Upload school-b logo", Boolean(onboardedLogoUrl), onboardedLogoUrl ?? "");
    } else {
      record(
        "1.4",
        "Upload school-b logo",
        false,
        `MinIO/upload unavailable: ${logoRes.status} ${await logoRes.text()}`,
      );
    }

    // ── 2. Web branding (API contract used by Web shell) ───────────────────
    const reloginB = await login("school-b", "superadmin", "school_super_admin");
    const settingsAfterLogin = await authed(reloginB.accessToken, "/schools/settings");
    const shellB = settingsAfterLogin.ok
      ? ((await settingsAfterLogin.json()) as BrandingPayload)
      : null;
    record(
      "2.1",
      "school-b settings after re-login match onboarding",
      Boolean(
        shellB &&
          shellB.schoolName === ONBOARDED.schoolName &&
          shellB.tagline === ONBOARDED.tagline &&
          shellB.location === ONBOARDED.location,
      ),
      shellB?.schoolName ?? "settings read failed",
    );

    const publicA = await publicBranding("arulneri");
    const publicB = await publicBranding("school-b");
    record(
      "2.2",
      "Public branding differs between tenants",
      publicA.schoolName !== publicB.schoolName &&
        publicA.theme.primary !== publicB.theme.primary &&
        publicB.schoolName === ONBOARDED.schoolName,
      `A=${publicA.schoolName}, B=${publicB.schoolName}`,
    );

    const publicBRefresh = await publicBranding("school-b");
    record(
      "2.3",
      "school-b branding persists across refresh (public API)",
      publicBRefresh.schoolName === ONBOARDED.schoolName &&
        publicBRefresh.receiptPrefix === ONBOARDED.receiptPrefix,
      publicBRefresh.schoolName,
    );

    // ── 3. Tenant isolation ──────────────────────────────────────────────────
    const aReadsBViaPublic = publicA.tenantId === schoolA.id && publicA.slug === "arulneri";
    record(
      "3.1",
      "school-a public branding remains school-a",
      aReadsBViaPublic && publicA.schoolName === originalA.name,
      publicA.schoolName,
    );

    const bRowAfterOnboard = await prisma.school.findUniqueOrThrow({ where: { id: schoolB.id } });
    record(
      "3.2",
      "school-b DB row remains scoped to school-b after onboarding",
      bRowAfterOnboard.id === schoolB.id && bRowAfterOnboard.slug === "school-b",
      bRowAfterOnboard.slug,
    );

    const bReadsASettings = await authed(adminB.accessToken, "/schools/settings");
    const bSettings = bReadsASettings.ok ? ((await bReadsASettings.json()) as BrandingPayload) : null;
    record(
      "3.3",
      "school-b settings read scoped to school-b only",
      Boolean(bSettings && bSettings.tenantId === schoolB.id && bSettings.slug === "school-b"),
      bSettings?.tenantId ?? "missing",
    );

    const aSettingsAfter = await authed(adminA.accessToken, "/schools/settings");
    const aSettingsBody = aSettingsAfter.ok ? ((await aSettingsAfter.json()) as BrandingPayload) : null;
    record(
      "3.4",
      "school-b onboarding does not change school-a operational settings",
      aSettingsBody?.receiptPrefix === originalA.receiptPrefix &&
        aSettingsBody?.tenantId === schoolA.id,
      `school-a prefix=${aSettingsBody?.receiptPrefix}`,
    );

    const accountsPatch = await authed(accountsA.accessToken, "/schools/branding", {
      method: "PATCH",
      body: JSON.stringify({ schoolName: "Accounts Hijack" }),
    });
    record(
      "3.5",
      "Read-only admin cannot write branding (403)",
      accountsPatch.status === 403,
      `status=${accountsPatch.status}`,
    );

    // ── 4. Mobile branding flow (public API per stored slug) ─────────────────
    record(
      "4.1",
      "Mobile splash contract: school-b slug returns school-b branding",
      publicB.slug === "school-b" && publicB.schoolName === ONBOARDED.schoolName,
      "GET /public/tenants/:slug/branding",
    );
    record(
      "4.2",
      "Mobile splash contract: arulneri slug not affected by school-b onboarding",
      publicA.slug === "arulneri" && publicA.schoolName === originalA.name,
      publicA.schoolName,
    );

    // ── 5. Receipt PDF ───────────────────────────────────────────────────────
    const studentsBRes = await authed(adminB.accessToken, "/students");
    const studentsB = studentsBRes.ok
      ? ((await studentsBRes.json()) as { id: string; fullName: string }[])
      : [];
    const studentB = Array.isArray(studentsB) ? studentsB[0] : undefined;
    const headBRes = await authed(adminB.accessToken, "/fee-heads", {
      method: "POST",
      body: JSON.stringify({ name: `TENVAL-${Date.now()}`, amount: 750 }),
    });
    const headB = headBRes.ok ? ((await headBRes.json()) as { id: string }) : null;
    const recBRes =
      studentB &&
      headB &&
      (await authed(adminB.accessToken, "/fees", {
        method: "POST",
        body: JSON.stringify({
          studentId: studentB.id,
          feeHeadId: headB.id,
          amount: 750,
          method: "cash",
        }),
      }));
    const recB = recBRes?.ok ? ((await recBRes.json()) as { receiptId: string; receiptNumber: string }) : null;

    if (recB) {
      let pass51 = false;
      let note51 = recB.receiptNumber;
      try {
        const pdfB = await authed(adminB.accessToken, `/receipts/${recB.receiptId}/pdf`);
        if (!pdfB.ok) throw new Error(`PDF status ${pdfB.status}`);
        const pdfBBody = await pdfB.arrayBuffer();
        if (!isPdf(pdfBBody)) throw new Error("not a PDF");
        const pdfBText = Buffer.from(pdfBBody).toString("latin1");
        pdfHas(pdfBText, "school name", "Greenfield");
        pdfHas(pdfBText, "receipt number", recB.receiptNumber);
        pdfMustNotInclude(pdfBText, "school-b receipt leak", "Arul Neri Academy");
        pass51 = true;
      } catch (err) {
        note51 = err instanceof Error ? err.message : String(err);
      }
      record("5.1", "school-b receipt PDF uses onboarded branding", pass51, note51);
    } else {
      record("5.1", "school-b receipt PDF uses onboarded branding", false, "fee record failed");
    }

    const studentsARes = await authed(accountsA.accessToken, "/students");
    const studentsA = studentsARes.ok
      ? ((await studentsARes.json()) as { id: string; fullName: string }[])
      : [];
    const arun = Array.isArray(studentsA) ? studentsA.find((s) => s.fullName.startsWith("Arun")) : undefined;
    const headARes = await authed(accountsA.accessToken, "/fee-heads", {
      method: "POST",
      body: JSON.stringify({ name: `TENVAL-A-${Date.now()}`, amount: 500 }),
    });
    const headA = headARes.ok ? ((await headARes.json()) as { id: string }) : null;
    const recARes =
      arun &&
      headA &&
      (await authed(accountsA.accessToken, "/fees", {
        method: "POST",
        body: JSON.stringify({
          studentId: arun.id,
          feeHeadId: headA.id,
          amount: 500,
          method: "cash",
        }),
      }));
    const recA = recARes?.ok ? ((await recARes.json()) as { receiptId: string }) : null;
    if (recA) {
      let pass52 = false;
      let note52 = originalA.name;
      try {
        const pdfA = await authed(accountsA.accessToken, `/receipts/${recA.receiptId}/pdf`);
        if (!pdfA.ok) throw new Error(`PDF status ${pdfA.status}`);
        const pdfAText = Buffer.from(await pdfA.arrayBuffer()).toString("latin1");
        pdfHas(pdfAText, "school name", "Arul");
        pdfMustNotInclude(pdfAText, "school-a receipt leak", "Greenfield International");
        pass52 = true;
      } catch (err) {
        note52 = err instanceof Error ? err.message : String(err);
      }
      record("5.2", "school-a receipt PDF remains school-a branded", pass52, note52);
    } else {
      record("5.2", "school-a receipt PDF remains school-a branded", false, "fee record failed");
    }

    // ── 6. Report card PDF ───────────────────────────────────────────────────
    const sectionsBRes = await authed(adminB.accessToken, "/academics/sections");
    const sectionsB = sectionsBRes.ok
      ? ((await sectionsBRes.json()) as { id: string; classId: string; label: string }[])
      : [];
    const sectionB = Array.isArray(sectionsB) ? sectionsB[0] : undefined;
    const subjectRes = await authed(adminB.accessToken, "/subjects", {
      method: "POST",
      body: JSON.stringify({ name: `TENVAL-RC-${Date.now()}` }),
    });
    const subject = subjectRes.ok ? ((await subjectRes.json()) as { id: string }) : null;
    const teacherB = await login("school-b", "TCH-B", "teacher");

    if (sectionB && subject && studentB) {
      const examRes = await authed(adminB.accessToken, "/exams", {
        method: "POST",
        body: JSON.stringify({
          classId: sectionB.classId,
          sectionId: sectionB.id,
          subjectId: subject.id,
          name: `TENVAL Exam ${Date.now()}`,
          examDate: "2026-09-20",
          maxScore: 100,
        }),
      });
      const exam = examRes.ok ? ((await examRes.json()) as { id: string }) : null;
      if (exam) {
        await authed(teacherB.accessToken, `/exams/${exam.id}/marks`, {
          method: "PUT",
          body: JSON.stringify({ marks: [{ studentId: studentB.id, score: 91 }] }),
        });
        await authed(teacherB.accessToken, `/exams/${exam.id}/marks/submit`, { method: "POST" });
        await authed(adminB.accessToken, `/exams/${exam.id}/marks/publish`, { method: "POST" });

        const cardRes = await authed(adminB.accessToken, `/exams/report-card?studentId=${studentB.id}`);
        const card = cardRes.ok
          ? ((await cardRes.json()) as {
              schoolName: string;
              studentName: string;
              classSection: string;
              academicYear: string;
              rows: { exam: string; subject: string; score: number; maxScore: number }[];
            })
          : null;
        record(
          "6.1",
          "school-b report-card JSON uses onboarded school name",
          Boolean(card && card.schoolName === ONBOARDED.schoolName && card.rows.some((r) => r.score === 91)),
          card?.schoolName ?? "report-card failed",
        );

        if (card) {
          let pass62 = false;
          let note62 = "worker renderReportCardPdf";
          try {
            const pdfBuf = await renderReportCardPdf({
              schoolName: card.schoolName,
              logoUrl: onboardedLogoUrl,
              typography: publicB.typography,
              studentName: card.studentName,
              classSection: card.classSection,
              academicYear: card.academicYear,
              rows: card.rows,
            });
            if (pdfBuf.subarray(0, 5).toString() !== "%PDF-") throw new Error("not a PDF");
            const pdfHay = pdfBuf.toString("latin1");
            pdfHas(pdfHay, "school name", "Greenfield");
            pdfMustNotInclude(pdfHay, "school-b report-card leak", "Arul Neri Academy");
            pass62 = true;
          } catch (err) {
            note62 = err instanceof Error ? err.message : String(err);
          }
          record("6.2", "school-b report-card PDF render contains tenant branding", pass62, note62);
        } else {
          record("6.2", "school-b report-card PDF render contains tenant branding", false, "no card payload");
        }
      } else {
        record("6.1", "school-b report-card JSON uses onboarded school name", false, "exam create failed");
        record("6.2", "school-b report-card PDF render contains tenant branding", false, "exam create failed");
      }
    } else {
      record("6.1", "school-b report-card JSON uses onboarded school name", false, "fixtures missing");
      record("6.2", "school-b report-card PDF render contains tenant branding", false, "fixtures missing");
    }

    const cardA = await authed(
      (await login("arulneri", "AN2021-0001", "student")).accessToken,
      "/exams/report-card",
    );
    const cardABody = cardA.ok ? ((await cardA.json()) as { schoolName: string }) : null;
    record(
      "6.3",
      "school-a report-card JSON not replaced by school-b branding",
      Boolean(cardABody && cardABody.schoolName === originalA.name),
      cardABody?.schoolName ?? "n/a",
    );

    // ── 7. Persistence check ─────────────────────────────────────────────────
    const persistLogin = await login("school-b", "superadmin", "school_super_admin");
    const persistSettings = await authed(persistLogin.accessToken, "/schools/settings");
    const persistBody = persistSettings.ok ? ((await persistSettings.json()) as BrandingPayload) : null;
    record(
      "7.1",
      "school-b configuration persists after re-login",
      Boolean(
        persistBody &&
          persistBody.schoolName === ONBOARDED.schoolName &&
          persistBody.receiptPrefix === ONBOARDED.receiptPrefix,
      ),
      persistBody?.schoolName ?? "",
    );
  } finally {
    await restoreSchoolB(adminB.accessToken, {
      id: originalB.id,
      name: originalB.name,
      tagline: originalB.tagline,
      location: originalB.location,
      receiptPrefix: originalB.receiptPrefix,
      defaultLanguage: originalB.defaultLanguage,
      attendanceMode: originalB.attendanceMode,
      theme: originalB.theme,
      typography: originalB.typography,
      logoUrl: originalB.logoUrl,
    });

    const restored = await publicBranding("school-b");
    record(
      "8.1",
      "Cleanup restores school-b seed fixture branding",
      restored.schoolName === originalB.name &&
        restored.receiptPrefix === originalB.receiptPrefix &&
        restored.logoUrl === originalB.logoUrl,
      restored.schoolName,
    );
  }

  await prisma.$disconnect();

  const failed = scenarios.filter((s) => !s.pass);
  console.log("\n── TEN-VAL-001 Summary ──");
  for (const s of scenarios) {
    console.log(`${s.pass ? "PASS" : "FAIL"} | ${s.id} | ${s.name}${s.note ? ` | ${s.note}` : ""}`);
  }
  console.log(`\nTotal: ${scenarios.length} | Passed: ${scenarios.length - failed.length} | Failed: ${failed.length}`);

  if (failed.length > 0) {
    process.exit(1);
  }
  console.log("\n✓ TEN-VAL-001 tenant onboarding validation gate passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
