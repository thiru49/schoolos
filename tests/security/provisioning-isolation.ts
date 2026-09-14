/**
 * TENANT-PROVISIONING-001 — Platform school provisioning RBAC, validation, isolation, and audit.
 * Run after seed with API + PLATFORM_OWNER_API_KEY configured:
 *   pnpm tsx tests/security/provisioning-isolation.ts
 */
import { PrismaClient } from "@prisma/client";

const API = process.env.API_URL ?? "http://localhost:4000";
const PASSWORD = process.env.SEED_PASSWORD ?? "Password123!";
const PLATFORM_KEY = process.env.PLATFORM_OWNER_API_KEY ?? "change-me-platform-key";

const prisma = new PrismaClient();

async function login(
  slug: string,
  identifier: string,
  roleHint?: string,
  password: string = PASSWORD,
) {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug, identifier, password, roleHint }),
  });
  if (!res.ok) throw new Error(`login ${identifier}@${slug}: ${res.status} ${await res.text()}`);
  return res.json() as Promise<{ accessToken: string }>;
}

async function platformRequest(path: string, init: RequestInit = {}) {
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Platform-Api-Key": PLATFORM_KEY,
      ...(init.headers ?? {}),
    },
  });
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
  const suffix = Date.now();
  const slug = `provision-${suffix}`;
  const adminIdentifier = `admin-${suffix}`;
  const adminPassword = `ProvPass${suffix}!`;

  const schoolA = await prisma.school.findFirst({ where: { slug: "arulneri" } });
  if (!schoolA) throw new Error("Seed school arulneri missing");
  const arulStudentCountBefore = await prisma.student.count({ where: { schoolId: schoolA.id } });

  const tenantAdmin = await login("arulneri", "superadmin", "school_super_admin");

  const unauth = await fetch(`${API}/platform/schools`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug,
      name: "Provision Test School",
      admin: { identifier: adminIdentifier, displayName: "Provision Admin", password: adminPassword },
    }),
  });
  if (unauth.status !== 401) {
    throw new Error(`unauthenticated POST /platform/schools expected 401, got ${unauth.status}`);
  }

  const schoolAdminAttempt = await fetch(`${API}/platform/schools`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tenantAdmin.accessToken}`,
    },
    body: JSON.stringify({
      slug: `${slug}-blocked`,
      name: "Blocked Provision",
      admin: { identifier: "blocked-admin", displayName: "Blocked", password: adminPassword },
    }),
  });
  if (schoolAdminAttempt.status !== 401) {
    throw new Error(`school admin POST /platform/schools expected 401, got ${schoolAdminAttempt.status}`);
  }

  const provisionBody = {
    slug,
    name: `Provision Test School ${suffix}`,
    tagline: "Tamil Nadu excellence",
    location: "Chennai",
    admin: {
      identifier: adminIdentifier,
      displayName: "Provision Admin",
      password: adminPassword,
    },
    academicYear: { name: `AY-${suffix}`, isActive: true },
  };

  const provisionRes = await platformRequest("/platform/schools", {
    method: "POST",
    body: JSON.stringify(provisionBody),
  });
  if (!provisionRes.ok) {
    throw new Error(`provision failed ${provisionRes.status} ${await provisionRes.text()}`);
  }
  const provisioned = (await provisionRes.json()) as {
    schoolId: string;
    slug: string;
    admin: { userId: string; roleCode: string };
    academicYear: { id: string; name: string };
    publicBrandingUrl: string;
  };

  if (provisioned.slug !== slug) throw new Error("provision response slug mismatch");
  if (provisioned.admin.roleCode !== "school_super_admin") {
    throw new Error(`expected school_super_admin initial role, got ${provisioned.admin.roleCode}`);
  }

  const duplicateSlug = await platformRequest("/platform/schools", {
    method: "POST",
    body: JSON.stringify({
      ...provisionBody,
      admin: { identifier: `other-${adminIdentifier}`, displayName: "Other", password: adminPassword },
    }),
  });
  if (duplicateSlug.status !== 409) {
    throw new Error(`duplicate slug expected 409, got ${duplicateSlug.status}`);
  }

  const duplicateAdmin = await platformRequest("/platform/schools", {
    method: "POST",
    body: JSON.stringify({
      slug: `${slug}-dup-admin`,
      name: "Duplicate Admin School",
      admin: {
        identifier: adminIdentifier,
        displayName: "Duplicate Admin",
        password: adminPassword,
      },
    }),
  });
  if (duplicateAdmin.status !== 409) {
    throw new Error(
      `duplicate admin identifier expected 409, got ${duplicateAdmin.status} ${await duplicateAdmin.text()}`,
    );
  }

  const publicBranding = await fetch(`${API}/public/tenants/${slug}/branding`);
  if (!publicBranding.ok) throw new Error("public branding missing for provisioned school");
  const branding = (await publicBranding.json()) as { slug: string; schoolName: string };
  if (branding.slug !== slug) throw new Error("public branding slug mismatch");

  const newAdmin = await login(slug, adminIdentifier, "school_super_admin", adminPassword);

  const settings = await authed(newAdmin.accessToken, "/schools/settings");
  if (!settings.ok) throw new Error("provisioned admin cannot read settings " + (await settings.text()));

  const years = await authed(newAdmin.accessToken, "/academics/years");
  if (!years.ok) throw new Error("provisioned admin cannot read academic years " + (await years.text()));
  const yearList = (await years.json()) as { id: string; name: string }[];
  if (!yearList.some((y) => y.id === provisioned.academicYear.id)) {
    throw new Error("provisioned academic year not visible to admin");
  }

  const audit = await prisma.auditLog.findFirst({
    where: { schoolId: provisioned.schoolId, action: "platform.school.provision" },
  });
  if (!audit) throw new Error("provision audit log missing");

  const crossTenant = await authed(newAdmin.accessToken, "/schools/settings");
  const crossSettings = (await crossTenant.json()) as { tenantId: string };
  if (crossSettings.tenantId !== provisioned.schoolId) {
    throw new Error("provisioned admin tenant context mismatch");
  }

  const arulStudentsAfter = await prisma.student.count({ where: { schoolId: schoolA.id } });
  if (arulStudentsAfter !== arulStudentCountBefore) {
    throw new Error("existing school data changed after provisioning");
  }

  const arulStudent = await prisma.student.findFirst({ where: { schoolId: schoolA.id } });
  if (arulStudent) {
    const leaked = await prisma.student.findFirst({
      where: { schoolId: provisioned.schoolId, id: arulStudent.id },
    });
    if (leaked) throw new Error("cross-tenant student leakage detected");
  }

  await prisma.school.delete({ where: { id: provisioned.schoolId } });

  console.log("✓ TENANT-PROVISIONING-001 provisioning isolation tests passed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
