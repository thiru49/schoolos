# SchoolOS mobile — flow + design audit

Tenant: **Arul Neri Academy** (`arulneri`). Isolation: `school-b`.
Password: `Password123!`.

Executable contracts live in `apps/mobile/features/home/all-scenarios.ts` and `__tests__/mobile-all-scenarios.test.ts`.

## Auth (all roles)

`/` → `/school-select` → `/login` → `/role-select` (multi-role only) → tabs.

## Teacher `TCH-8A`

| Scenario | Route | UI | Must not |
|---|---|---|---|
| T1 home | Home | TeacherHomeDashboard | fees, child switcher |
| T2 roster | /attendance | TeacherRoster P/A/L/H save | parent calendar |
| T3 homework | /homework | assign sheet | — |
| T4 marks | /marks | TeacherMarksEntry | published-only view |
| T5 fees | /fees | hidden | collect UPI |
| Isolation | 9-B | 403 | other tenant |

Attendance tile: Pending / N left / Saved from live roster.

## Parent `9000000001` (Arun)

| Scenario | Route | UI | Must not |
|---|---|---|---|
| P1 home | Home | ParentHomeDashboard + child switcher | roster save |
| P2 calendar | /attendance | ParentHistory | mark P/A/L/H |
| P3 fees | /fees | dues + ANA receipts | UPI collect |
| P4 report | /report-card | published | draft marks |

## Student `AN2021-0001`

| Scenario | Route | UI | Must not |
|---|---|---|---|
| S1 home | Home | StudentHomeDashboard | fees, child switcher |
| S2 fees | /fees | hidden on Academics | dues |
| S3 marks | /marks | published own | teacher draft |

## Design system

- `theme.colors` from branding (navy + gold).
- Screen, ScreenHeader, Card, MetricCard, StatusChip, AppButton, ModalSheet, StickyActionBar.
- Empty / Error / Offline / Denied on domain screens.

## Device pass still required

Expo + API cannot run in this merge environment. After `pnpm --filter @schoolos/mobile test` run the three logins on a phone.
