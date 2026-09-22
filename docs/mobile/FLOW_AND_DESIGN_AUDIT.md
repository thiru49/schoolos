# SchoolOS mobile — flow + design audit

Tenant: **Arul Neri Academy** (`arulneri`). Isolation: `school-b`.
Password: `Password123!`.

Visual check is a **code + contract audit**. Expo cannot run in this merge environment. Each screen below is mapped to role, tokens, and empty/error/offline/denied.

## Shell (all roles)

| Screen | Route | Tokens | States |
|---|---|---|---|
| Splash | `/` | branding + canvas | loading branding |
| School select | `/school-select` | primary / surface | invalid slug |
| Login | `/login` | AppInput / AppButton | auth error |
| Role select | `/role-select` | cards | multi-role only |
| Tabs | Home / Academics / Updates / Profile | tab bar = primary + surface + inkMuted | OfflineBanner |

## Teacher `TCH-8A` (8-A only)

1. Home → identity Class Teacher · 8-A → metrics → mark attendance / homework / marks → today periods.
2. Academics → attendance, timetable, homework, marks. **No fees. No report-card download.**
3. Attendance roster → P/A/L/H → save → 9-B hidden / 403.
4. Homework create sheet → publish.
5. Marks draft → validate max → submit sheet.
6. Timetable Mon–Sat + Today.
7. Updates = notices / events / holidays.
8. Profile = role, school, logout.

## Parent `9000000001` (Arun only)

1. Home → child switcher → today attendance + dues.
2. Academics → attendance calendar, timetable, homework, published marks, report card, fees/receipts.
3. Cannot open teacher roster or mark 9-B.
4. Fees = dues + receipt list (no UPI collect).
5. Report card = published rows only.

## Student `AN2021-0001`

1. Home → own periods + homework + results.
2. Academics → timetable, homework, attendance, marks, report card. **No fees module.**
3. Marks/report = own published data.

## Design system contract

- Colour from `createTheme` / `theme.colors` (Arul Neri navy + gold).
- Status chips: P present, A absent, L late, H holiday.
- Primitives: Screen, ScreenHeader, Card, MetricCard, StatusChip, AppButton, ModalSheet, StickyActionBar.
- Feedback: Empty / Error / Offline / Denied on domain screens.
- Tamil: Noto allowlist; no second palette.

## Known gaps (not this pass)

- Cannot screenshot a live device here.
- Some inner cards still use slate hex; next pass maps them to `inkMuted` / `surface`.
- No UPI, bus, chat, Classes 1–12 census.
