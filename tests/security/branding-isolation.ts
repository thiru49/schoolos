/**
 * SET-001 School settings / branding RBAC, validation, tenant isolation, and audit.
 * Run after seed: pnpm tsx tests/security/branding-isolation.ts
 */
import { PrismaClient } from "@prisma/client";

const API = process.env.API_URL ?? "http://localhost:4000";
const PASSWORD = process.env.SEED_PASSWORD ?? "Password123!";

const prisma = new PrismaClient();

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

async function main() {
  const adminA = await login("arulneri", "superadmin", "school_super_admin");
  const readOnlyAdminA = await login("arulneri", "accounts", "accounts_admin");
  const teacherA = await login("arulneri", "TCH-8A", "teacher");
  const adminB = await login("school-b", "superadmin", "school_super_admin");

  const schoolA = await prisma.school.findFirst({ where: { slug: "arulneri" } });
  const schoolB = await prisma.school.findFirst({ where: { slug: "school-b" } });
  if (!schoolA || !schoolB) throw new Error("Seed schools missing");

  const originalName = schoolA.name;
  const originalPrefix = schoolA.receiptPrefix;

  try {
    const unauthSettings = await fetch(`${API}/schools/settings`);
    if (unauthSettings.status !== 401) {
      throw new Error(`unauthenticated GET /schools/settings expected 401, got ${unauthSettings.status}`);
    }

    const teacherSettings = await authed(teacherA.accessToken, "/schools/settings");
    if (teacherSettings.status !== 403) {
      throw new Error(`teacher GET /schools/settings expected 403, got ${teacherSettings.status}`);
    }

    const adminSettings = await authed(adminA.accessToken, "/schools/settings");
    if (!adminSettings.ok) throw new Error("admin settings read failed " + (await adminSettings.text()));
    const settings = (await adminSettings.json()) as { schoolName: string; receiptPrefix: string };
    if (settings.schoolName !== originalName) throw new Error("unexpected school name from settings");

    const readOnlySettings = await authed(readOnlyAdminA.accessToken, "/schools/settings");
    if (!readOnlySettings.ok) {
      throw new Error("accounts admin should read settings " + (await readOnlySettings.text()));
    }

    const readOnlyPatchBranding = await authed(readOnlyAdminA.accessToken, "/schools/branding", {
      method: "PATCH",
      body: JSON.stringify({ schoolName: "Hijacked Name" }),
    });
    if (readOnlyPatchBranding.status !== 403) {
      throw new Error(
        `accounts admin PATCH branding expected 403, got ${readOnlyPatchBranding.status}`,
      );
    }

    const readOnlyPatchSettings = await authed(readOnlyAdminA.accessToken, "/schools/settings", {
      method: "PATCH",
      body: JSON.stringify({ receiptPrefix: "HIJACK" }),
    });
    if (readOnlyPatchSettings.status !== 403) {
      throw new Error(
        `accounts admin PATCH settings expected 403, got ${readOnlyPatchSettings.status}`,
      );
    }

    const invalidBranding = await authed(adminA.accessToken, "/schools/branding", {
      method: "PATCH",
      body: JSON.stringify({ theme: { primary: "not-a-color" } }),
    });
    if (invalidBranding.status !== 400) {
      throw new Error(`invalid theme color expected 400, got ${invalidBranding.status}`);
    }

    const suffix = Date.now();
    const newName = `Arul Neri ${suffix}`;
    const updatedBranding = await authed(adminA.accessToken, "/schools/branding", {
      method: "PATCH",
      body: JSON.stringify({
        schoolName: newName,
        typography: { preset: "modern" },
      }),
    });
    if (!updatedBranding.ok) throw new Error("branding update failed " + (await updatedBranding.text()));
    const brandingPayload = (await updatedBranding.json()) as {
      schoolName: string;
      typography: { preset: string; families: { display: string } };
    };
    if (brandingPayload.schoolName !== newName) throw new Error("school name not updated");
    if (brandingPayload.typography.preset !== "modern") throw new Error("typography preset not applied");
    if (brandingPayload.typography.families.display !== "Inter") throw new Error("modern preset fonts missing");

    const publicBranding = await fetch(`${API}/public/tenants/arulneri/branding`);
    const publicPayload = (await publicBranding.json()) as { schoolName: string };
    if (publicPayload.schoolName !== newName) throw new Error("public branding not updated");

    const newPrefix = `ANA-T${suffix}`;
    const updatedSettings = await authed(adminA.accessToken, "/schools/settings", {
      method: "PATCH",
      body: JSON.stringify({ receiptPrefix: newPrefix }),
    });
    if (!updatedSettings.ok) throw new Error("settings update failed " + (await updatedSettings.text()));
    const settingsPayload = (await updatedSettings.json()) as { receiptPrefix: string };
    if (settingsPayload.receiptPrefix !== newPrefix) throw new Error("receipt prefix not updated");

    const auditRows = await prisma.auditLog.findMany({
      where: {
        schoolId: schoolA.id,
        resource: "school",
        action: { in: ["school.branding.update", "school.settings.update"] },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    if (!auditRows.some((r) => r.action === "school.branding.update")) {
      throw new Error("branding audit log missing");
    }
    if (!auditRows.some((r) => r.action === "school.settings.update")) {
      throw new Error("settings audit log missing");
    }

    const schoolBBefore = await prisma.school.findUnique({ where: { id: schoolB.id } });
    if (!schoolBBefore) throw new Error("school B missing");

    await authed(adminA.accessToken, "/schools/branding", {
      method: "PATCH",
      body: JSON.stringify({ schoolName: newName }),
    });

    const schoolBAfter = await prisma.school.findUnique({ where: { id: schoolB.id } });
    if (schoolBAfter?.name === newName) {
      throw new Error("tenant isolation failed: school B name changed");
    }

    const adminBSettings = await authed(adminB.accessToken, "/schools/settings");
    const bSettings = (await adminBSettings.json()) as { schoolName: string };
    if (bSettings.schoolName === newName) {
      throw new Error("cross-tenant settings read leaked school A name");
    }
  } finally {
    await authed(adminA.accessToken, "/schools/branding", {
      method: "PATCH",
      body: JSON.stringify({ schoolName: originalName, typography: { preset: "arulneri" } }),
    });
    await authed(adminA.accessToken, "/schools/settings", {
      method: "PATCH",
      body: JSON.stringify({ receiptPrefix: originalPrefix }),
    });
  }

  await prisma.$disconnect();
  console.log("✓ SET-001 branding isolation checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
