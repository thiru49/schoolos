# SchoolOS — Multi-Tenant School Management SaaS

**Document type:** Pre-implementation blueprint  
**Status:** MVP target plan (read this before writing code)  
**Date:** 12 September 2026  
**Updated:** same day — Expo, custom RBAC, typography, repo/SDLC locked, **demo tenant Arul Neri Academy**, flow + Figma map adopted  
**Layout reference only:** original 56-page mockup PDF — copy structure, **not** that school’s name, crest, or colours  
**Demo tenant:** Arul Neri Academy (`arulneri`) — fictional; logo = leaf + A  
**Companion docs:**
- `schoolos-arul-neri-complete-app-flow.md`
- `schoolos-arul-neri-figma-frame-map.md`

**Product stance:** One codebase, many schools. School name, logo, colours, **fonts/typography**, receipt prefix and tagline are **dynamic**. Mobile splash loads branding from API. MVP collects only school-operation data — **no Aadhaar, caste, religion, medical, biometric, or EMIS sync**.

**Architecture stance (locked):**
1. Mobile = **React Native + Expo** (not Flutter)
2. **Custom RBAC** is a first-class layer (not `if (role === 'admin')` scattered in screens)
3. Every action is checked against a **permission + resource-scope matrix**
4. **12 weeks = MVP target**, not a promised production launch
5. **Modular monolith** — no microservices
6. **PostgreSQL + `school_id` + Row Level Security**
7. Build **one complete vertical slice** before expanding modules
8. Use AI **feature-by-feature under this blueprint** — do not invent extra modules
9. **Typography is tenant config** — font family, scale, and weights come from branding API (same as colours). No hardcoded `System` / Inter in screens except fallback.
10. **Monorepo + feature folders** — `apps/web`, `apps/mobile`, `apps/api`, `apps/worker`, shared packages. Same feature name across web / mobile / Nest module.
11. **SDLC is mandatory** — ticket → AC → implement → RBAC/tenant tests → PR checklist → staging → pilot. A screen that “works” is not Done.
12. **UI libraries locked** — Web = shadcn/ui + Tailwind. Mobile = NativeWind + thin RN primitives. Share **tokens**, not Button components. No Material, no gluestack as the foundation.

---

## 1. What we agreed

### Goal
Multi-tenant SaaS for school management: **Expo app + Next.js admin**, white-labelled per school.

### What MVP is
- Daily operations shown in the 56-page mockup.
- Simple data: students, parents, teachers, class, attendance, homework, exams, timetable, fees (record payment), notices, events, holidays, reports.
- Tenant isolation with `school_id` + RLS.
- Dynamic theme/logo/name on mobile first, same branding on web.
- Custom RBAC + scoped permissions.

### What MVP is not
- Not a replacement for TN EMIS.
- Not government procurement.
- Not 50 separate apps.
- Not microservices / Kubernetes.
- Not extra sensitive PII beyond the mockup.
- Not online payment gateway (office records Cash / UPI / Bank).
- Not transport, library, inventory, biometric, AI chatbot as a product module.
- **Not a guaranteed public launch at week 12.** Week 12 means: vertical slice + remaining MVP modules in a usable internal build. Production = after a real school pilot and hardening.

### First tenant
- Seed **Arul Neri Academy** (`arulneri`) as tenant #1. Layouts may follow the old PDF; all copy, logo, receipts are Arul Neri.
- School #2 = new `schools` row + logo + theme. Same Expo binary. Never hardcode the school name in UI.

### Document set (read all three before coding)

| File | Role |
|---|---|
| `SCHOOL_SAAS_PROJECT_BLUEPRINT.md` (this file) | Architecture, RBAC matrix, stack, repo, SDLC, Definition of Done |
| `schoolos-arul-neri-complete-app-flow.md` | Screen catalogs, APIs in/out, empty/error, J1–J6 journeys, sidebar IA |
| `schoolos-arul-neri-figma-frame-map.md` | 13 Figma pages, ~151 frames, names like `mob_teacher_attendance-roster_default` |

UX rules from the flow pack (locked):
- Parent: today-first + child switcher + fees glance
- Teacher: attendance in few taps, sticky submit
- Admin: navy utility canvas, ACL-filtered sidebar
- Tamil: Noto Sans Tamil, 1.8 line-height
- Branding edited on Settings; splash reads API
- Logo = leaf-A only (no real-school crest)
- Fee lookup = student id / name only — no Aadhaar
- Figma first frames to draw: teacher attendance roster + states

### Platform vs school
| Layer | Who | Job |
|---|---|---|
| Platform owner | Later | Onboard school, billing, feature flags |
| School Super Admin | Web | Branding, academic year, create admins, assign roles |
| School Admin | Web | Office work, limited by permissions |
| Teacher / Parent / Student | Mobile | Day-to-day, limited by permissions + scope |

---

## 2. How to use AI while building

Rule: **blueprint first, AI second.**

For each feature:
1. Open the matching section of this file + the PDF page.
2. Ask AI only for that slice (schema + API + one Expo screen + one admin screen).
3. Reject output that adds fields or modules not in this document.
4. Run tenant isolation test after every write path.
5. Do not ask AI to “design the whole ERP again.”

Suggested prompt prefix:

> Follow `SCHOOL_SAAS_PROJECT_BLUEPRINT.md`. Modular monolith, NestJS, Postgres RLS, custom RBAC. Do not add EMIS, Aadhaar, payment gateway, or microservices. Feature: {name}. Scope: {permission + resource}.

---

## 3. Product surfaces

### 3.1 Mobile (React Native + Expo)
One app, role chosen on login (PDF page 2):

- Student — admission number + password  
- Parent — switch child if multiple linked  
- Teacher — employee ID + password  

Stack on device: Expo Router, TypeScript, NativeWind (or StyleSheet + theme tokens from branding API), Expo SecureStore for tokens, Expo Notifications + FCM.

Bottom nav: Home · Academics · Updates · Profile

Same binary for all schools. Branding fetched by `slug`.

### 3.2 Web admin (Next.js)
Pages 32–56. Sidebar items are **filtered by permissions**, not hardcoded for “Admin vs Super Admin” only. Super Admin is a role that happens to have all school permissions.

### 3.3 Public branding
```
GET /public/tenants/:slug/branding
```

---

## 4. Dynamic branding

No school name, colour, **or font** is hardcoded in screens except a platform fallback.

```json
{
  "tenantId": "uuid",
  "slug": "arulneri",
  "schoolName": "Arul Neri Academy",
  "tagline": "Learning · Care · Excellence",
  "location": "Tirunelveli · Madurai · Thoothukudi",
  "logoUrl": "https://cdn.example/tenants/{id}/logo.png",
  "poweredBy": "CREOVY Digital Solutions",
  "theme": {
    "primary": "#0B3A6E",
    "primaryDark": "#082A50",
    "accent": "#E8A317",
    "background": "#F4F7FB",
    "success": "#16A34A",
    "warning": "#F59E0B",
    "danger": "#DC2626"
  },
  "typography": {
    "preset": "arulneri",
    "source": "google",
    "families": {
      "display": "Plus Jakarta Sans",
      "body": "Plus Jakarta Sans",
      "tamil": "Noto Sans Tamil"
    },
    "googleFamilies": [
      "Plus+Jakarta+Sans:wght@400;500;600;700",
      "Noto+Sans+Tamil:wght@400;500;600;700"
    ],
    "files": {
      "displayRegular": null,
      "displayBold": null,
      "bodyRegular": null,
      "bodyBold": null,
      "tamilRegular": null
    },
    "scale": {
      "xs": 12,
      "sm": 14,
      "md": 16,
      "lg": 18,
      "xl": 22,
      "display": 28
    },
    "lineHeight": {
      "tight": 1.2,
      "normal": 1.45,
      "relaxed": 1.65
    },
    "weights": {
      "regular": "400",
      "medium": "500",
      "semibold": "600",
      "bold": "700"
    },
    "letterSpacing": {
      "display": 0,
      "body": 0
    }
  },
  "receiptPrefix": "ANA/26-27",
  "defaultLanguage": "en",
  "attendanceMode": "daily"
}
```

Expo: `BrandingProvider` fetches on splash, caches slug + theme + typography, loads fonts, then paints UI.  
Next.js: CSS variables `--font-display`, `--font-body`, `--font-tamil`, `--text-md`, etc. from the same payload.

### 4.1 Dynamic typography (required)

Typography is tenant config, edited under Super Admin → School Settings (`school.branding.update`). It must apply to **mobile, admin, report card PDF, and fee receipt PDF**.

**Load order**
1. Branding API returns `typography`.
2. If `source = google` — Expo uses `@expo-google-fonts/*` or `expo-font` + URI; Next uses `next/font/google` **or** a runtime `<link>` for tenant fonts (runtime link in MVP; `next/font` only for platform fallback).
3. If `source = file` — download `files.*` from MinIO (`tenants/{schoolId}/fonts/...`) via `expo-font` / `@font-face`.
4. If load fails — fall back to platform stack: `System` on native, `ui-sans-serif` on web, `Noto Sans Tamil` if already cached.
5. Do not render login/dashboard until display + body fonts are ready **or** fallback is applied (avoid layout jump on splash).

**Rules**
- Screens use semantic tokens, not raw pixel fonts: `Text` variant `display | title | body | caption | label`.
- Tamil / English can mix on one screen (student name later). Body font for Latin; `tamil` family when `lang=ta` or Unicode Tamil is detected.
- PDF renderer maps the same family names (embed a licensed TTF in MinIO for receipts; do not assume Google works inside Puppeteer without download).
- Allowlist fonts in MVP so a school cannot point at a random remote TTF (XSS/supply-risk). Start with: Plus Jakarta Sans, Inter, Poppins, Nunito, Noto Sans, Noto Sans Tamil, Hind Madurai.
- Custom upload = Super Admin only, WOFF2/TTF, max size cap, scanned MIME.

**School Settings UI (extend page 56)**
- Font preset dropdown (Arul Neri default, Modern, Classic, Tamil-first)
- Display font / Body font / Tamil font
- Base size (`md`) — other sizes scale from it
- Preview: school name + sample Tamil line + sample receipt title

**DB**
`schools.theme jsonb`  
`schools.typography jsonb`  
Do not invent a table per font file unless uploads exist; file keys live inside `typography.files`.

**Expo sketch**

```ts
// tokens from branding.typography
fontFamily: {
  display: typography.families.display,
  body: typography.families.body,
  tamil: typography.families.tamil,
}
fontSize: typography.scale
```

**Next sketch**

```css
:root {
  --font-display: "Plus Jakarta Sans", ui-sans-serif, sans-serif;
  --font-body: "Plus Jakarta Sans", ui-sans-serif, sans-serif;
  --font-tamil: "Noto Sans Tamil", sans-serif;
  --text-md: 16px;
}
```

Preset `arulneri`: navy titles, medium weight body, 16px base, Noto Sans Tamil for Tamil strings. Logo mark = leaf + A only.

---

## 5. Custom RBAC (first-class)

Do **not** sprinkle `role === 'teacher'` across controllers and screens.

### 5.1 Model

```
schools
users                  -- belongs to one school in MVP
roles                  -- school-scoped; system roles seeded
permissions            -- global catalog (code is stable)
role_permissions       -- role ↔ permission
user_roles             -- user ↔ role (a user may have one role in MVP)
user_scopes            -- optional resource scope for that user
```

**Permission code format:** `resource.action`  
Examples: `attendance.mark`, `attendance.read`, `marks.submit`, `fees.record`, `school.settings.update`

**Resource scope** answers *where* the permission applies:

| Scope type | Meaning | Example |
|---|---|---|
| `school` | whole tenant | Super Admin, most Admin |
| `class` | one class | rare |
| `section` | class + section | class teacher of 8-A |
| `subject` | subject inside assigned sections | maths teacher |
| `self` | own student / own teacher record | student |
| `children` | linked students only | parent |

JWT after login:

```json
{
  "sub": "userId",
  "schoolId": "uuid",
  "roles": ["teacher"],
  "permissions": ["attendance.mark", "homework.create", "marks.submit", "..."],
  "scopes": [
    { "type": "section", "classId": "...", "sectionId": "..." },
    { "type": "subject", "subjectId": "..." }
  ]
}
```

Long permission lists can be fetched via `GET /me/acl` instead of stuffing JWT; JWT must still carry `schoolId` + `sub`. MVP can embed permissions if the list stays small.

### 5.2 Enforcement layers (all required)

1. **API guard** — `@RequirePermission('attendance.mark')`  
2. **Scope filter** — service loads only rows inside `user_scopes`  
3. **Postgres RLS** — `school_id = current_setting('app.school_id')`  
4. **UI** — hide buttons the ACL does not allow (never the only check)

### 5.3 Seeded roles (MVP)

| Role code | App | Default scope |
|---|---|---|
| `platform_owner` | future | all tenants (not in school JWT) |
| `school_super_admin` | Web | `school` |
| `school_admin` | Web | `school` minus a few dangerous perms |
| `accounts_admin` | Web | fees/payments/receipts + read students |
| `academic_admin` | Web | exams, marks publish, timetable, homework read |
| `teacher` | Mobile | assigned sections + subjects |
| `parent` | Mobile | `children` |
| `student` | Mobile | `self` |

PDF page 55 already has School Admin / Accounts Admin / Academic Admin — those become **roles with different permission sets**, not separate apps.

Super Admin cannot be deleted or demoted by School Admin (`users.manage_super` denied).

### 5.4 Permission + resource-scope matrix

Legend: `S` school-wide · `AS` assigned sections/subjects · `C` linked children · `Y` self · `—` deny

| Permission | Super Admin | School Admin | Accounts | Academic | Teacher | Parent | Student |
|---|---|---|---|---|---|---|---|
| `school.settings.read` | S | S | S | S | — | — | — |
| `school.settings.update` | S | — | — | — | — | — | — |
| `school.branding.update` | S | — | — | — | — | — | — |
| `academic_year.manage` | S | — | — | — | — | — | — |
| `roles.assign` | S | — | — | — | — | — | — |
| `admins.create` | S | — | — | — | — | — | — |
| `users.manage_super` | S | — | — | — | — | — | — |
| `students.read` | S | S | S | S | AS | C | Y |
| `students.write` | S | S | — | — | — | — | — |
| `parents.read` | S | S | S | — | — | Y | — |
| `parents.write` | S | S | — | — | — | — | — |
| `teachers.read` | S | S | — | S | Y | — | — |
| `teachers.write` | S | S | — | — | — | — | — |
| `classes.manage` | S | S | — | S | — | — | — |
| `subjects.manage` | S | S | — | S | — | — | — |
| `timetable.read` | S | S | — | S | AS | C | Y |
| `timetable.write` | S | S | — | S | — | — | — |
| `attendance.read` | S | S | — | S | AS | C | Y |
| `attendance.mark` | S | S | — | — | AS | — | — |
| `homework.read` | S | S | — | S | AS | C | Y |
| `homework.create` | S | S | — | S | AS | — | — |
| `homework.complete` | — | — | — | — | — | — | Y |
| `exams.read` | S | S | — | S | AS | C | Y |
| `exams.write` | S | S | — | S | — | — | — |
| `marks.draft` | S | S | — | S | AS | — | — |
| `marks.submit` | S | S | — | S | AS | — | — |
| `marks.publish` | S | S | — | S | — | — | — |
| `marks.read` | S | S | — | S | AS | C | Y |
| `fees.read` | S | S | S | — | — | C | Y |
| `fees.structure.write` | S | S | S | — | — | — | — |
| `fees.record` | S | S | S | — | — | — | — |
| `receipts.read` | S | S | S | — | — | C | Y |
| `notices.write` | S | S | — | S | — | — | — |
| `notices.read` | S | S | S | S | AS | C | Y |
| `events.write` | S | S | — | S | — | — | — |
| `events.read` | S | S | S | S | AS | C | Y |
| `holidays.manage` | S | S | — | S | — | — | — |
| `notifications.send` | S | S | S | S | — | — | — |
| `reports.attendance` | S | S | — | S | AS | — | — |
| `reports.fees` | S | S | S | — | — | — | — |
| `reports.progress` | S | S | — | S | AS | — | — |
| `audit.read` | S | — | — | — | — | — | — |

**Scope rule for teachers:** `attendance.mark` is allowed only if `student.section_id` is in `user_scopes`. Same for marks and homework.

**Scope rule for parents:** every child query joins `parent_students`. Switching child (PDF page 5) sets `activeStudentId` in app state; API still checks the link.

Implement the matrix as seed SQL, not comments. Changing a cell later = data change, not a code branch.

---

## 6. Modules (MVP catalogue)

Same as mockup. **Do not start all of them on day 1.** See vertical slice in section 12.

- Identity + ACL (`/me/acl`)
- School settings + branding
- Academic years, classes/sections, subjects
- Students, parents + links, teachers + assignments
- Attendance
- Homework
- Timetable
- Exams + marks + report card PDF
- Fees structure + record payment + receipt PDF
- Notices, events, holidays, notifications
- Reports
- Admin / role assignment UI

Deferred: EMIS, RTE, Aadhaar, gateway, WhatsApp, 11–12 HSE split, transport, library, trust dashboard, billing portal.

---

## 7. Data stored vs not stored

**Store:** school + theme + **typography jsonb**, year, class/section/subject, student operational fields, parent contact, teacher assignment, attendance, homework, exams/marks, fee heads/payments/receipts, comms, **roles/permissions/scopes**, audit. Optional font files under `tenants/{schoolId}/fonts/`.

**Do not store in MVP:** Aadhaar, caste/community/religion/income, medical, biometric, parent bank accounts, EMIS passwords.

Student login id = admission number.  
Receipt no = `{receiptPrefix}/{seq}`.

---

## 8. Data model (additions for RBAC)

Keep previous operational tables. Add:

```
roles (id, school_id nullable, code, name, is_system)
permissions (id, code, resource, action, description)
role_permissions (role_id, permission_id)
user_roles (user_id, role_id)
user_scopes (
  user_id,
  scope_type,          -- school|class|section|subject|self|children
  class_id, section_id, subject_id, student_id
)
```

System permission catalog is **global** (no school_id).  
Roles may be system-seeded per school on tenant create, or global templates copied into the school.

Every operational table still has `school_id`.

---

## 9. Data flow

### Branding
```
Expo splash → GET /public/tenants/{slug}/branding → theme provider
```

### Login + ACL
```
POST /auth/login { slug, roleHint?, identifier, password }
  → user in that school only
  → load roles + permissions + scopes
  → JWT + GET /me/acl
Expo / Next hide routes the ACL lacks
```

### Attendance (also the vertical slice)
```
Teacher (permission attendance.mark + section scope)
  → PUT /attendance
  → guard + scope + RLS
  → optional FCM to parents of absentees
Parent (attendance.read + children scope)
  → GET /attendance?studentId=
```

### Marks
```
Teacher marks.draft / marks.submit within subject+section
Academic / Super marks.publish
Student/Parent marks.read only published rows
```

### Fees
```
Accounts fees.record
Parent fees.read + receipts.read for linked children
No gateway webhook in MVP
```

### Isolation
```
JWT.schoolId → SET LOCAL app.school_id → RLS
Prisma middleware also injects schoolId
MinIO prefix tenants/{schoolId}/
Redis tenant:{schoolId}:...
```

---

## 10. Tech stack (locked)

| Layer | Technology |
|---|---|
| Mobile | **React Native + Expo** (SDK current), Expo Router, TypeScript |
| Mobile UI | **NativeWind + custom RN primitives** (View/Text/Pressable/TextInput/Modal). No heavy mobile kit. |
| Mobile icons | Lucide-style / Expo-compatible Lucide |
| Mobile storage | Expo SecureStore |
| Push | Expo Notifications + FCM |
| Web admin | Next.js 15 + TypeScript + **Tailwind CSS + shadcn/ui** (Radix/Base primitives) |
| Web icons | **Lucide** |
| Web forms | **React Hook Form + Zod** (`packages/validation`) |
| Web tables | **TanStack Table + shadcn/ui** |
| Web charts | **Recharts** |
| Web dates | shadcn/ui + **react-day-picker** |
| Web toast | **Sonner** |
| Shared UI | `packages/ui` = **tokens + contracts only** |
| API | NestJS + TypeScript (**modular monolith**) |
| Worker | Same NestJS process/entry, BullMQ |
| ORM | Prisma |
| DB | PostgreSQL 16 + RLS |
| Cache/jobs | Redis 7 + BullMQ |
| Files | MinIO → S3 later |
| Auth | JWT + custom RBAC module |
| PDF | PDFKit or Puppeteer |
| Excel | ExcelJS |
| Hosting | Docker Compose, one VPS |
| CI | GitHub Actions |

**Not in MVP:** Flutter, Kafka, K8s, one service per module, Elasticsearch, Material UI, MUI, Chakra, NativeBase, gluestack-ui as the shared foundation.

### 10.1 UI architecture (locked)

This product is a **custom SaaS skin** (Arul Neri tokens at runtime), not Material Design. shadcn/ui fits because we **own** the components and restyle them from branding tokens.

```
                 packages/ui
            tokens + contracts only
                      │
         ┌────────────┴────────────┐
         │                         │
     apps/web                 apps/mobile
  shadcn/ui + Tailwind     NativeWind + RN
  Lucide, RHF, Zod         Lucide-style icons
  TanStack Table           custom Button/Input/Modal
  Recharts, Sonner
```

| Area | Use |
|---|---|
| Web Admin | shadcn/ui + Tailwind CSS |
| Mobile | NativeWind + React Native core components |
| Icons | Lucide (web) / Expo-compatible Lucide (mobile) |
| Forms | React Hook Form + Zod |
| Tables | TanStack Table + shadcn/ui |
| Charts | Recharts |
| Date/calendar | shadcn/ui / react-day-picker |
| Toast | Sonner |
| Shared design tokens | `packages/ui` |

**Do not share UI components across platforms.**

```
Don't: Web Button === Mobile Button
Do:    same tokens → web shadcn Button / mobile RN Pressable
```

`packages/ui`:

```
packages/ui/
├── tokens/
│   ├── colors.ts
│   ├── typography.ts
│   ├── spacing.ts
│   ├── radius.ts
│   └── shadows.ts
├── contracts/          # names + variants only, no DOM/RN views
│   ├── Button.ts
│   ├── Input.ts
│   ├── Status.ts
│   └── Typography.ts
└── theme/
    ├── createTheme.ts
    └── branding.ts     # maps branding API → tokens
```

Runtime:

```
GET branding → BrandingProvider → packages/ui tokens
  → apps/web shadcn classNames / CSS variables
  → apps/mobile NativeWind classNames / StyleSheet
```

Web maps naturally to admin screens: tables, filters, dialogs, badges, dashboards, ACL sidebar, branding playground.  
Mobile stays thin so tenant fonts/colours are not fighting a third-party kit.

**Rejected for this repo:** gluestack-ui as the one kit for web+mobile (Next.js support is not the foundation we want). One-off experiments later must not replace this lock.

Repo layout, feature folders, Git, PR, tests, and Definition of Done: **§17–§32** (engineering playbook). Do not invent a second folder style.

---

## 11. API (ACL-aware)

Public: `GET /public/tenants/:slug/branding`  
Auth: `POST /auth/login` `POST /auth/refresh` `POST /auth/logout`  
Me: `GET /me` `GET /me/acl` `GET /me/children` `POST /me/children/select`

All other routes as before, each decorated with `@RequirePermission(...)`.  
Admin role-assignment: `GET/POST /rbac/roles` `PUT /users/:id/roles` `PUT /users/:id/scopes` — permission `roles.assign`.

---

## 12. Build strategy

### 12.1 One vertical slice first (do not skip)

**Slice name: Tenant-branded attendance**

Must work end-to-end before Students CRUD explosion, fees, exams, etc.

1. Docker: Postgres, Redis, MinIO, API, Expo, Admin  
2. `schools` + branding API + logo upload  
3. Users + RBAC seed + login + `/me/acl`  
4. Classes/sections + a teacher scoped to 8-A + students in 8-A + parent linked to Arun  
5. Expo splash (Arul Neri **theme + fonts**) → teacher login → mark P/A/L/H → save  
6. Parent login → switch child → see Arun present  
7. Admin web: load attendance for 8-A  
8. Automated test: teacher of 8-A cannot mark 9-B; school A cannot read school B  

When this slice is demoable, expand feature-by-feature under the matrix.

### 12.2 After the slice (MVP backlog)

Masters → homework → timetable → exams → fees record → comms → reports → second tenant branding check.

### 12.3 Twelve weeks = target, not contract

| Window | Target outcome | Reality check |
|---|---|---|
| Weeks 1–3 | Vertical slice live on devices | If slice slips, do not start fees |
| Weeks 4–8 | Remaining MVP modules in staging | Quality over finishing page 54 |
| Weeks 9–12 | Second tenant + reports + bugfix | **MVP candidate**, not App Store + paid customers |
| After week 12 | Pilot one real school, harden auth/RLS/backups | Production launch only after pilot |

Missed week 12 is acceptable. Shipping a leaky tenant or a role bypass is not.

---

## 13. Security rules

1. Tenant from JWT only after login.  
2. Permission check on every mutating route.  
3. Scope check on class/section/subject/child.  
4. RLS always on.  
5. UI hiding is cosmetic.  
6. Signed file URLs for private PDFs.  
7. Audit: marks submit, payment record, role change, student write.  
8. Unique admission number **per school**, not globally.  
9. No Super Admin delete by Admin.

---

## 14. Success criteria

### Vertical slice done
- Arul Neri splash from API (logo, colours, **fonts**). Receipts use `ANA/26-27`.  
- Teacher marks 8-A only.  
- Parent sees only linked children.  
- Cross-tenant test fails closed.

### MVP candidate (target ~12 weeks)
- Modules in section 6 usable with dummy data.  
- School #2 onboarded by settings + logo.  
- Matrix enforced in API tests.  
- No Aadhaar/caste columns.

### Production (after MVP)
- Real school pilot.  
- Backups, rate limit, error tracking.  
- Store listing / extra DPDP work as needed.

---

## 15. First files to create

1. `docker-compose.yml`  
2. Prisma: `schools` (theme + typography jsonb), `users`, `roles`, `permissions`, `role_permissions`, `user_roles`, `user_scopes`  
3. Nest `TenancyModule` + `RbacModule` + `AuthModule` + `BrandingModule`  
4. Seed: Arul Neri Academy (`arulneri`) + RBAC matrix  
5. `packages/ui` tokens + branding mapper  
6. Expo app: splash, BrandingProvider, NativeWind, login, ACL gate  
7. Next.js `apps/web`: shadcn/ui shell, Lucide, ACL sidebar  
8. Attendance slice only  

Then stop and demo. Then next feature under this file.

---

## 16. Open decisions (non-blocking)

- Permissions in JWT vs `/me/acl` only (default: `/me/acl` + short JWT)  
- Attendance daily vs per-period (`attendanceMode` already on school)  
- Forgot password = office reset in MVP  

---

---

## 17. Engineering playbook (locked)

Product architecture is §§1–16. This section is **how we write, review, test, and release code**. Follow it for humans and for AI.

Architecture is **frozen** before implementation:

- React Native + Expo  
- Modular NestJS monolith + separate worker entry  
- PostgreSQL + RLS  
- Custom RBAC + scopes  
- Dynamic theme + allowlisted typography  
- pnpm workspaces + Turborepo  
- Feature names identical on web, mobile, and API  
- Web UI = shadcn/ui + Tailwind + Lucide; Mobile UI = NativeWind + RN primitives  
- `packages/ui` = tokens + contracts, not shared views  

Do not re-decide these in a feature prompt.

---

## 18. Repository (pnpm + Turbo monorepo)

```
schoolos/
│
├── apps/
│   ├── web/                    # Next.js admin (not apps/admin)
│   ├── mobile/                 # React Native + Expo
│   ├── api/                    # NestJS modular monolith
│   └── worker/                 # BullMQ processors (same domain code, different entry)
│
├── packages/
│   ├── ui/                     # tokens + contracts only (not shared RN/DOM components)
│   ├── types/                  # shared TypeScript types
│   ├── validation/             # shared Zod schemas
│   ├── api-client/             # typed HTTP client
│   ├── config/                 # eslint, tsconfig, prettier
│   ├── permissions/            # permission codes + scope enums
│   └── utils/
│
├── database/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed/
│   └── scripts/
│
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── database/
│   ├── security/
│   ├── decisions/              # ADRs
│   └── runbooks/
│
├── tests/
│   ├── e2e/
│   ├── integration/
│   └── security/
│
├── infrastructure/
│   ├── docker/
│   ├── nginx/
│   ├── scripts/
│   └── environments/
│
├── .github/
│   ├── workflows/
│   ├── ISSUE_TEMPLATE/
│   └── pull_request_template.md
│
├── docker-compose.yml
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── .env.example
├── README.md
└── SCHOOL_SAAS_PROJECT_BLUEPRINT.md
```

`app/` / Expo `app/` = routes only.  
Business code = `features/*` (web/mobile) or `modules/*` (api).

---

## 19. Web folder (`apps/web`)

```
apps/web/
├── app/
│   ├── (auth)/login/  forgot-password/
│   ├── (dashboard)/
│   │   ├── dashboard/ students/ parents/ teachers/
│   │   ├── attendance/ homework/ exams/ marks/
│   │   ├── timetable/ fees/ notices/ events/
│   │   ├── reports/ settings/
│   └── layout.tsx
├── features/          # domain implementation
│   ├── auth/ dashboard/ students/ parents/ teachers/
│   ├── attendance/ homework/ exams/ marks/
│   ├── timetable/ fees/ notices/ events/
│   ├── reports/ settings/
├── components/        # layout, navigation, tables, forms, dialogs, feedback
├── lib/               # api, auth, acl, branding, utils
├── hooks/ providers/ stores/ styles/ tests/
```

Principle: **routing in `app/`, business in `features/`.**

---

## 20. Mobile folder (`apps/mobile`)

```
apps/mobile/
├── app/                         # Expo Router
│   ├── (auth)/login.tsx  role-select.tsx
│   ├── (tabs)/home.tsx academics.tsx updates.tsx profile.tsx
│   └── _layout.tsx
├── features/
│   ├── auth/ branding/ dashboard/
│   ├── homework/ attendance/ exams/ marks/ timetable/
│   ├── fees/ notices/ events/ notifications/ profile/
├── components/ ui/ cards/ lists/ forms/ feedback/
├── services/ api/ auth/ notifications/ storage/ branding/
├── hooks/ providers/ store/ theme/ constants/ utils/ tests/
```

Same feature name everywhere:

```
web       → features/attendance
mobile    → features/attendance
backend   → modules/attendance
```

---

## 21. API folder (`apps/api`)

```
apps/api/src/
├── main.ts
├── app.module.ts
├── config/
├── common/          # decorators, guards, interceptors, filters, pipes, middleware, errors
└── modules/
    ├── auth/ tenancy/ rbac/ branding/ users/
    ├── students/ parents/ teachers/ academics/
    ├── attendance/ homework/ timetable/
    ├── exams/ marks/ fees/
    ├── communications/ notifications/
    ├── reports/ files/ audit/
```

Inside a module:

```
attendance/
├── attendance.module.ts
├── attendance.controller.ts
├── attendance.service.ts
├── attendance.repository.ts
├── attendance.policy.ts      # resource-scope rules
├── dto/
├── domain/
├── mappers/
├── constants/
└── tests/
```

Request path (required):

```
controller
  → @RequirePermission("attendance.mark")
  → attendance.policy (scope)
  → attendance.service
  → repository
  → Prisma
  → Postgres RLS
```

---

## 22. Worker (`apps/worker`)

```
apps/worker/src/
├── main.ts
├── queues/
├── jobs/          notifications/ reports/ pdf/ files/
└── processors/    notification.processor.ts  report.processor.ts  pdf.processor.ts
```

```
API → enqueue → Redis → Worker → FCM / PDF / Excel / email
```

HTTP handlers never render heavy PDFs inline if a queue exists.

---

## 23. Shared packages

**`packages/types`** — Student, Parent, Teacher, Attendance, Homework, Exam, Marks, Fee, Notification, Branding, Typography, Acl.

**`packages/permissions`**

```ts
export const PERMISSIONS = {
  STUDENTS_READ: "students.read",
  STUDENTS_WRITE: "students.write",
  ATTENDANCE_MARK: "attendance.mark",
  MARKS_SUBMIT: "marks.submit",
  FEES_RECORD: "fees.record",
} as const;
```

**`packages/validation`** — Zod: CreateStudentSchema, MarkAttendanceSchema, HomeworkSchema. API + web + mobile share where the shape is the same.

**`packages/api-client`** — `studentsApi.list()`, `attendanceApi.mark()`, `feesApi.getMyFees()`.

**`packages/ui`**

```
components/
tokens/  colors.ts typography.ts spacing.ts radius.ts shadows.ts
theme/   createTheme.ts  branding.ts
```

Runtime:

```
API branding → BrandingProvider → tokens → Web / Mobile
```

Fonts resolve only from the **allowlist** (Inter, Poppins, Roboto, Open Sans, Plus Jakarta Sans, Nunito, Noto Sans, Noto Sans Tamil, Hind Madurai). No arbitrary remote font URL from a school in MVP. Custom upload = later, Super Admin + MIME/size cap.

---

## 24. SDLC

```
Requirement
 → Acceptance criteria
 → UI reference (PDF page)
 → Architecture (this file / ADR)
 → DB design
 → API contract
 → Implementation (api + policy + web and/or mobile + worker)
 → Unit tests
 → Integration tests
 → Security / tenant tests
 → Code review (PR checklist)
 → Staging
 → QA
 → Pilot
 → Production
 → Monitoring
 → Feedback → next ticket
```

One feature = one ticket. Example: `SO-ATT-001` Teacher marks attendance.

**Acceptance criteria example (ATT-001)**

- Teacher sees assigned class only  
- Loads today’s students  
- Marks P/A/L/H  
- Cannot access another section  
- Parent can see attendance  
- Absence notification can be enqueued  
- Audit row created  

Order of work on a ticket: Design → DB → API → Mobile → Web → Worker → Tests.

---

## 25. Git, commits, PR

**Branching (small team):**

```
main
 ├── feature/SO-ATT-001-attendance
 ├── fix/...
 └── chore/...
```

PR required. No direct push to `main`.  
Use `develop` only when a second engineer joins.

**Commits (conventional):**

```
feat(attendance): add teacher attendance marking
feat(rbac): add section scope validation
fix(fees): prevent duplicate receipt number
test(tenancy): add cross-school isolation tests
docs(api): document attendance endpoints
chore(ci): add prisma migration check
```

**PR checklist (required):**

- Requirement implemented  
- API documented if changed  
- Migration included if schema changed  
- Permission added / reused  
- Scope checked  
- Tenant isolation checked  
- Validation added  
- Unit tests  
- Integration tests where needed  
- UI empty/loading/error states  
- Errors handled  
- Audit if required  
- No unrelated modules changed  
- No sensitive data logged  

Tenant isolation + RBAC are **not optional** on the checklist.

---

## 26. Testing

| Layer | What |
|---|---|
| Unit | services, policies, Zod, utils |
| Integration | API + Postgres, Redis, RBAC, tenant isolation |
| E2E | login → create student → assign teacher → mark attendance → parent views |
| Security | School A ↛ B; teacher 8-A ↛ 9-B; parent Arun ↛ unlinked Maria; admin ↛ demote Super Admin; student ↛ admin route |

Cross-tenant failure-closed is a **success criterion**, not a nice-to-have.

---

## 27. Environments and secrets

```
local → development → staging → production
```

Separate DB, Redis, MinIO/S3, Firebase, API URLs, secrets per env.  
Commit only `.env.example`. Never commit production secrets.

---

## 28. CI / release

CI on every PR:

- lint  
- typecheck  
- unit  
- integration (with Postgres service)  
- build web + api + mobile (Expo preview optional)

Release:

```
feature complete → PR approved → CI green → staging → QA
 → release candidate → production → smoke test → monitor
```

MVP “release” may stop at staging + pilot. Production is after pilot (see §14).

---

## 29. Documentation in-repo

```
docs/architecture/   system.md tenancy.md rbac.md notifications.md file-storage.md
docs/database/       erd.md conventions.md
docs/api/            conventions.md
docs/security/       checklist.md
docs/decisions/      ADR-001-react-native.md
                     ADR-002-modular-monolith.md
                     ADR-003-postgres-rls.md
                     ADR-004-dynamic-branding-typography.md
docs/runbooks/       deployment.md backup-restore.md incident.md
```

ADRs stop AI from re-opening frozen choices.

---

## 30. How to prompt AI

Never: “Build the school app.”

Always:

1. Requirement / ticket id  
2. Blueprint section  
3. Existing files  
4. Acceptance criteria  
5. Constraints (no EMIS, no gateway, no new module)  
6. Expected files  
7. Tests  

Template:

> Implement SO-ATT-001 per SCHOOL_SAAS_PROJECT_BLUEPRINT.md. Modular NestJS monolith. Add Prisma migration, attendance repository/service/controller/policy, `attendance.mark`, section-scope, RLS-safe query, Expo teacher screen under `features/attendance`, Next.js admin view under `features/attendance`, unit tests, cross-tenant integration tests. Do not modify unrelated modules.

---

## 31. Definition of Done

```
DONE =
  Requirement
+ UI (PDF states)
+ API
+ DB / migration
+ RBAC permission
+ Resource scope
+ Tenant security
+ Validation
+ Error / empty / loading states
+ Tests
+ Audit (if required)
+ Docs (if contract changed)
```

A green screen without policy + tenant test is **not Done**.

---

## 32. Tickets

```
EPIC: Attendance
  ATT-001 Teacher mark attendance     ← first (vertical slice)
  ATT-002 Parent attendance view
  ATT-003 Admin attendance report
  ATT-004 Absence notification
  ATT-005 Attendance export
```

Same pattern for Students, Fees, Exams. Do not open Fees epics until ATT-001 meets Done.

---

## 33. Operating model

```
PRODUCT REQUIREMENT
        → BLUEPRINT (this file)
        → WEB / MOBILE / API / WORKER
        → packages/types + permissions + validation + api-client
        → Prisma + RLS
        → RBAC + scopes
        → tests
        → review
        → staging
        → pilot
        → production
        → monitor + next ticket
```

Blueprint layers in one place:

1. Product scope  
2. UI reference  
3. Multi-tenancy  
4. Dynamic branding + typography  
5. RBAC + scopes  
6. Database  
7. API  
8. Web architecture  
9. Mobile architecture  
10. Worker  
11. Shared packages  
12. Repository  
13. SDLC  
14. Git / PR  
15. Testing  
16. CI/CD  
17. Deployment / envs  
18. Security  
19. Monitoring (after pilot)  
20. MVP roadmap  

---

*Implement against this file and the 56-page UI. Custom RBAC, scope matrix, tenant tests, and the folder/SDLC rules above are not optional. 12 weeks is a planning horizon. First demo is the attendance vertical slice, not the full sidebar.*

