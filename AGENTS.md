# AGENTS.md — SchoolOS Engineering Context & Operating Rules

## 1. Purpose

This repository is **SchoolOS**, a multi-tenant school-management SaaS.

This file is the baseline context for any coding agent working in this repository. Read it before implementing a ticket, reviewing code, or proposing architecture changes.

The agent must:
1. Understand the existing architecture before changing it.
2. Inspect the current repository and Git history/PR state before relying on status written in this file.
3. Implement only the requested scope and the authoritative project rules below.
4. Preserve backward compatibility with existing flows.
5. Treat security, tenant isolation, RBAC, scope enforcement, validation, tests, and operational states as part of feature completion.
6. Never invent product modules, permissions, database entities, or UI flows that are not supported by the approved project scope.

---

# 2. Product

## Tenant model

One codebase serves many schools.

Current demo tenant:
- School: Arul Neri Academy
- Tenant slug: `arulneri`

The original St. Joseph school PDF is a **layout/functional reference only**.
Do not copy its school name, crest, branding, or identity.

Every tenant-sensitive operation must preserve tenant isolation.

---

# 3. Authoritative Architecture

## Backend

- Framework: NestJS
- Architecture: **Modular monolith**
- Do NOT introduce microservices unless explicitly approved.
- ORM: Prisma
- Database: PostgreSQL 16+
- Queue: BullMQ
- Cache / queue infrastructure: Redis
- Object storage: MinIO initially, S3-compatible
- Authentication: JWT
- Authorization: custom RBAC + resource/scope policy
- PDF generation: PDFKit / Puppeteer where appropriate
- Excel: ExcelJS

## Web

- Next.js 15
- Tailwind CSS
- shadcn/ui
- Lucide icons
- React Hook Form
- Zod
- TanStack Table
- Recharts
- react-day-picker
- Sonner

Do NOT introduce:
- Material UI / MUI
- Chakra
- gluestack
- random UI component libraries

## Mobile

- React Native
- Expo
- NativeWind
- Thin RN primitives

Do NOT create a second competing mobile UI system.

## Monorepo

Keep feature naming and domain boundaries consistent across:
- `apps/web`
- `apps/mobile`
- `apps/api`
- shared packages

Shared UI packages contain:
- design tokens
- contracts
- shared primitives/contracts where approved

Do not force a shared Button/component implementation across Web and Mobile merely for reuse.

---

# 4. Tenant Isolation — NON-NEGOTIABLE

The tenant boundary is `school_id`.

Expected API/database pattern:

1. JWT contains the authenticated `schoolId` where applicable.
2. Application establishes the tenant context.
3. PostgreSQL uses:
   - `SET LOCAL app.school_id = ...`
   - Row Level Security (RLS)
4. Prisma/application data access must inject/enforce `schoolId`.
5. Redis keys must be tenant-aware.
6. Object-storage paths must be tenant-aware, e.g. school prefix.

Never trust a client-provided school ID when the authenticated tenant context already determines it.

Every new tenant-sensitive endpoint must have cross-tenant authorization/testing.

---

# 5. RBAC — FIRST-CLASS ARCHITECTURE

Do NOT scatter role checks throughout UI screens or services.

Authorization has two separate concepts:

## Permission

Resource + action:

`resource.action`

Examples:
- `reports.attendance`
- `reports.fees`
- `reports.progress`

## Scope

Examples:
- school
- class
- section
- subject
- self
- children

Every action must be evaluated through:

**permission + resource scope + tenant boundary**

Expected enforcement layers:

1. API authentication guard
2. Permission guard
3. Scope policy
4. Database tenant/RLS enforcement
5. UI capability gating

UI gating is not a security boundary.

## Seed roles

- `platform_owner`
- `school_super_admin`
- `school_admin`
- `accounts_admin`
- `academic_admin`
- `teacher`
- `parent`
- `student`

Be careful with multi-role users.

A user can hold multiple roles. Do not write logic that assumes exactly one role unless the domain explicitly guarantees it.

For privileged capabilities, prefer centralized authorization helpers/policies over repeating role arrays in individual screens.

---

# 6. Branding / Typography

Branding is tenant configuration.

Public branding endpoint:

`GET /public/tenants/:slug/branding`

Typography must come from tenant branding configuration using an allowlisted font set.

Tamil support must include:
- Noto Sans Tamil

Do not hardcode Inter/system font as the primary product typography.

---

# 7. Product Scope — MVP

The approved MVP modules are:

1. Identity / ACL
2. School settings / branding
3. Academic masters
   - years
   - classes
   - sections
   - subjects
4. People
   - students
   - parents
   - teachers
5. Attendance
6. Homework
7. Timetable
8. Exams / marks / report card
9. Fees / receipts
10. Notices / events / holidays / notifications
11. Reports
12. Role assignment UI

The following are deferred and must NOT be invented into MVP work:

- EMIS
- RTE
- Aadhaar
- payment gateway
- WhatsApp integration
- 11-12 HSE split
- transport
- library
- trust dashboard
- billing portal

Do not add sensitive data fields that are explicitly excluded by the approved product design, including:

- Aadhaar
- caste
- religion
- income
- medical data
- biometric data
- bank-account data
- EMIS passwords

---

# 8. UI / UX Source of Truth

Reference sources include:

- `ST_JOSEPH_School_All_UI_Mockups.pdf`
  - layout and functional reference only
- `SchoolOS_UIUX_Design_Source_ArulNeri.pdf`
- `SchoolOS_Complete_Module_UI_Web_Mobile.pdf`
- `schoolos-arul-neri-complete-app-flow.md`
- approved Figma/frame mapping where available

Do not invent screens simply because a generic SaaS product normally has them.

Use approved product flows and acceptance criteria as the source of truth.

---

# 9. Build Strategy

Build one complete vertical slice before expanding breadth.

Current authoritative module sequence:

**Masters → Attendance → Homework → Timetable → Exams → Fees → Communications → Reports → second-tenant/cross-tenant validation**

A feature is not "done" because a screen renders.

---

# 10. Definition of Done

A feature is complete only when applicable items are covered:

- requirement implemented
- approved UI states implemented
- API implemented
- DB schema/migration implemented
- permission defined/enforced
- scope policy enforced
- tenant isolation enforced
- validation implemented
- loading state
- empty state
- error state
- audit behavior where required
- automated tests
- regression tests
- documentation when API/contract changes

A green page with CRUD behavior but missing authorization or tenant tests is **not Done**.

---

# 11. Current Implementation Status — Verify Against Git Before Acting

This section is a planning snapshot, not a substitute for repository inspection.

Known completed/merged areas from the latest project review:

- Attendance
- People
- Homework
- Timetable
- Exams / marks / report card
- Fees
- Communications backend (COM-001)
- Reports backend (REPORT-001)

Known work that was pending in the latest review:

## Communications
COM-002 Web UI was in open PR state:
- notices
- events
- holidays
- web admin workflows

There was no confirmed dedicated mobile communications slice in the latest review.

## Reports
REPORT-002 Web reports was in open PR state.

Web reports scope included:
- central `/reports` hub
- attendance
- progress
- fee collection
- payments
- students
- teacher workload
- CSV download
- frontend route authorization
- backend teacher-workload authorization hardening

A remaining architecture cleanup was identified:
- centralize Web Reports authorization logic into a reusable helper
- avoid duplicated role/permission logic in `reports-hub.tsx`, `teacher-workload-view.tsx`, and tests
- tests should exercise the centralized authorization helper rather than maintain a second authorization algorithm

Do not assume these PRs are still open or unchanged. **Inspect GitHub/current branch/main/PR state first.**

---

# 12. Reports Plan

There are six approved MVP report types:

1. Attendance
2. Student Progress
3. Fee Collection
4. Payment Report
5. Student List
6. Teacher Workload

Permissions currently used by the reports implementation include:

- `reports.attendance`
- `reports.fees`
- `reports.progress`

Teacher Workload authorization is intentionally stricter than "teacher can see own data".

A teacher-only user must not automatically gain administrative teacher-workload reporting merely because they have `reports.progress`.

Multi-role behavior must be explicit:
- teacher + approved admin role may use the admin capability where policy allows
- teacher-only must not be elevated to admin capability

Approved report phases:

### REPORT-001
Backend + CSV.

### REPORT-002
Web reports hub and web report views/integration.

### REPORT-003
PDF generation / worker / batch execution / E2E coverage as approved by the project plan.

Do not mix REPORT-003 scope into REPORT-002 unless explicitly requested.

---

# 13. Mobile Status / Rules

Known completed mobile slices:

- Attendance
- Homework
- Timetable
- Exams / Marks
- Fees

Known gaps from the latest review:

- dedicated Mobile Communications slice not confirmed
- Mobile Reports not implemented

Do not start Mobile Reports merely because Web Reports exists.

First verify:
1. current main branch
2. mobile module requirements
3. approved UI/flow references
4. exact ticket scope
5. existing mobile patterns

Do not invent a mobile feature from a web feature without an approved requirement.

---

# 14. Coding-Agent Workflow

For every ticket:

## Step 1 — Inspect

Before editing:
- read repository structure
- inspect related module/domain
- inspect existing patterns
- inspect current migrations/schema
- inspect existing permissions
- inspect tests
- inspect relevant PRs/commits when applicable

## Step 2 — Plan

Produce a small implementation plan that explicitly states:
- files/modules to change
- DB impact
- API impact
- permission/scope impact
- tenant-security impact
- tests to add/update
- migration requirements
- UI states

Do not redesign unrelated areas.

## Step 3 — Implement

Use existing project patterns wherever possible.

Prefer:
- central policy/helper
- reusable service functions
- typed contracts
- small feature-focused modules

Avoid:
- copy/paste authorization logic
- duplicated validation
- hidden permission bypasses
- broad refactors unrelated to the ticket

## Step 4 — Test

At minimum, run the relevant:
- unit tests
- integration/security tests
- typecheck
- lint
- build

For tenant-sensitive features, test:
- authenticated access
- permission denial
- scope denial
- cross-tenant denial

For multi-role behavior, test representative role combinations.

## Step 5 — Review

Before creating/declaring PR-ready:
- inspect git diff
- verify migration
- verify API contracts
- verify authorization path
- verify tenant boundary
- verify no unrelated changes
- verify UI loading/empty/error states
- verify tests cover the security boundary

## Step 6 — PR

PR title should identify the ticket and feature clearly.

PR description should include:
- implementation summary
- DB changes
- API changes
- authorization behavior
- tests run
- known limitations

Never claim a PR is merged unless GitHub confirms it.

---

# 15. Agent Communication Rules

When reporting progress, use this structure:

### Implemented
Concrete files/features completed.

### Tested
Exact commands/results.

### Remaining
Known gaps or follow-up work.

### Risk
Security, scope, compatibility, migration, or architectural concerns.

Do not report "done" when only the frontend works.

Do not hide uncertainty.

If current repository state conflicts with this file, **current code/GitHub is authoritative for what exists; this file is authoritative for product/architecture intent unless explicitly superseded by a newer approved project document or ticket.**

---

# 16. Git / PR Discipline

Never:
- force-push unless explicitly requested
- rewrite unrelated history
- modify another feature to make a test pass unless necessary
- merge a PR just because CI is green
- bypass security tests
- weaken authorization to make UI tests pass

Before modifying an existing PR:
- inspect its current diff
- inspect review comments
- inspect CI
- preserve valid earlier fixes

---

# 17. Database Rules

Use Prisma migrations.

Before changing schema:
- inspect existing models/relations
- check indexes and uniqueness
- check tenant key propagation
- check cascade behavior
- check nullable semantics
- check existing seed data

Every tenant-owned table should have a clear tenant boundary and appropriate indexing.

Do not use a global table without understanding how tenant isolation is enforced.

---

# 18. Async / Queue Rules

BullMQ is the approved background-job mechanism.

Do not assume asynchronous code is "fire and forget" without checking:
- whether the worker owns the completion boundary
- whether job completion is awaited/observed
- retries
- failure handling
- idempotency
- persistence state

For any queue feature, document what "job complete" means.

---

# 19. API Rules

API contract changes must be intentional.

For protected endpoints:
- authentication guard
- permission guard
- scope policy
- tenant boundary

Avoid accepting a client-provided tenant ID as an authority signal.

Validate:
- params
- query
- body
- IDs
- date ranges
- enum values

Return consistent authorization errors.

---

# 20. Frontend Rules

Every data-driven screen should handle:

- loading
- empty
- populated
- error
- permission denied where relevant
- validation feedback where relevant

Route-level authorization must not be the only security mechanism.

Do not put complex RBAC algorithms directly inside screens.

Prefer a feature-level authorization helper/policy that screens consume.

---

# 21. Backward Compatibility

Existing flows must continue working.

For every change that touches shared logic:
- run existing module tests
- run impacted end-to-end/integration tests
- test old flows that depend on the changed contract

A new feature is not allowed to silently change behavior for existing tenants/users unless the requirement explicitly calls for it.

---

# 22. Truth / Evidence Rule

The project prefers technical truth over optimistic reporting.

When there is uncertainty:
- say what is known
- say what was verified
- say what is inferred
- do not invent certainty

Always prefer:
**current source code + schema + tests + GitHub state**
over assumptions.

---

# 23. Priority Rule

When instructions conflict, use this order:

1. Explicit user/ticket requirement
2. Latest approved project blueprint
3. Existing security architecture
4. Existing working code/patterns
5. This AGENTS.md baseline
6. General engineering preference

Do not override a higher-priority project decision with a generic best practice.

---

# 24. Immediate Working Principle

The intended development loop is:

**Understand → Inspect → Plan → Implement → Test → Review → PR → Staging → QA → Release**

The coding agent is expected to make the smallest correct change that fits the SchoolOS architecture, not to redesign the application while implementing a ticket.
