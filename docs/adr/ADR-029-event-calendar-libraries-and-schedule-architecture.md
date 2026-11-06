# ADR-029: Event Calendar Libraries and Schedule Architecture

## Status

Accepted (2026-05-03) · Revised (2026-07-15) — schedule opened to any date · Revised (2026-07-16) — staff schedule visibility (default-closed, owner-granted)

This ADR is the canonical reference for schedule architecture and permissions. Historical rationale for the May 2026 edit/delete refinement was recorded separately in ADR-030, but the current rules live here.

**2026-07-15 revision.** The original decision tied every schedule entry to the event's own date window. In practice the schedule is the manager's agenda for an event, not a timetable of the event days: loading the van the evening before, the debrief the following week, and a supplier call a month out are all normal entries that the window rejected. Entries now accept **any** date. They remain event-scoped (`eventId` stays required, `byEventId` stays the only index) — only the date is free. The sections below reflect the revised behaviour; see "Superseded rules" at the end for what changed.

**2026-07-16 revision — staff schedule visibility.** The original matrix let `STAFF_LOGISTICS` see the whole team agenda, identical to `OWNER`/`CO_MANAGER`. In practice a staff member should not see everyone else's agenda by default. The rule is now **role-differentiated**:

- **`OWNER` and `CO_MANAGER` (Level 1) see everything, always** — they never depend on a grant, and cannot be hidden from. This is the ceiling of the model: an author cannot hide their agenda from Level 1.
- **`STAFF_LOGISTICS` sees only their own entries by default (fail-closed).** The `OWNER` grants full team-agenda visibility to a specific staff member on request, by setting `EventCollaborator.canViewTeamSchedule = true` on that collaborator's row. The flag is per-collaborator, owner-controlled, all-or-nothing (whole agenda or own only).

**Why the minimal shape.** An earlier design (`docs/plans/2026-07-16-agenda-quem-ve-o-que-design.md`) proposed a per-author grant model (`ScheduleVisibilityGrant(eventId, grantorUserId, granteeUserId)` — "the author decides who sees their agenda") and a separate ADR-037. That model solves per-author privacy, a need **not validated with users** (the design doc flags this itself). It was cut to a single boolean: no new table, no grant/revoke Lambdas, no in-app request flow ("staff asks the owner" happens out of band). The reversal is legible and cheap; if per-author granularity ever becomes a validated need, `canViewTeamSchedule` gives way to the grant table without data loss.

**Enforcement is server-side.** The filter lives in `list-event-schedule` (see the Lambda table below), not the client. The client-side avatar filter shipped earlier is presentation only. The `authors` list returned with the listing is computed **after** the visibility filter, so a staff member without access never receives the identity of authors they cannot see.

The Permission Matrix and Lambda sections below reflect the revised behaviour; see "Superseded rules" at the end for the pre-2026-07-16 rule.

## Context

Two related features required decisions on calendar/date libraries and a new data model:

### Group A — Event Date Picker (issues #105–#108)

The event creation/edit flow needed a date picker supporting three modes:
- **Single date** — legacy `eventDate` field
- **Range** — `eventStartDate` / `eventEndDate` (e.g. "3–5 June")
- **Specific dates** — `eventSpecificDates: string[]` (e.g. "3, 5, 8 June")

The picker needed i18n support for pt-PT, en-US, and fr-FR, and had to integrate with the existing Tailwind design token system without importing a heavy component library.

### Group B — Event Schedule Calendar (planned feature)

The event details page needed a schedule/agenda tab where OWNER, CO_MANAGER, and STAFF_LOGISTICS can create time-blocked entries (sessions, meals, transfers, etc.) and optionally link a supplier. All roles except STAFF_CHECKIN can view the schedule. The calendar needs month/week/day views with navigation between them.

## Decisions

### react-day-picker v9 (Group A)

**Library chosen:** `react-day-picker@^9.14.0`

**Rationale:**
- Headless-friendly: minimal default styles, overridable via CSS custom properties — integrates cleanly with Tailwind tokens via `EventDatePicker.css`
- Supports all three required selection modes (`single`, `range`, `multiple`) via the `mode` prop
- Built-in locale support via `react-day-picker/locale` — no separate setup, aligns with `date-fns` locales already in the project
- Actively maintained, small bundle footprint

**Usage pattern:**
```jsx
import { DayPicker } from 'react-day-picker';
import { pt, enUS, fr } from 'react-day-picker/locale';
import 'react-day-picker/style.css';
```

`date-fns` (already a project dependency) handles all formatting. No additional date library added.

**Component:** `src/Components/Event/EventDatePicker.jsx`  
Supports `mode: 'range' | 'specific'`. Rendered inside a `<Modal>` triggered by a summary chip in the event form.

---

### react-big-calendar (Group B)

**Library chosen:** `react-big-calendar` (to be installed)

**Rationale:**
- Provides month/week/day views out of the box — the three views required by the feature
- Supports `date-fns` localizer (already in project) — no moment.js dependency
- `onSelectSlot` enables creating entries by clicking empty slots in day view
- `onSelectEvent` enables the detail modal flow on entry click
- Custom `eventPropGetter` allows future colour coding per entry type

**Localizer setup:**
```js
import { dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { pt, enUS, fr } from 'date-fns/locale';
```

**Mobile responsiveness:** month view is dense on small screens. Decision: simplified month view on mobile — entries render as coloured dots per day; clicking a dot opens a day list. Week/day views remain unchanged. Breakpoint: `< 768px`.

**Schedule entry colours:** calendar colours are presentation-only and are derived from schedule entry data, not from `Supplier.category`.

The frontend computes a deterministic colour with `getScheduleEntryColor(entry)`:
- key: `entry.supplierId || entry.id || entry.title`
- entries linked to the same supplier receive the same colour
- standalone entries fall back to their own entry id/title
- the colour is generated from the key hash using HSL/golden-angle distribution

This avoids coupling the calendar UI to supplier categories or to the caller's ability to fetch supplier details. Collaborators such as `STAFF_LOGISTICS` may only receive a scoped subset of suppliers, so category-based calendar colours would be inconsistent or missing. The schedule model intentionally does not persist a `color` field until manual colour selection becomes a product requirement.

---

### EventScheduleEntry Data Model

New Amplify model `EventScheduleEntry` per-event, Lambda-backed CRUD:

```
EventScheduleEntry
├── id: string (PK)
├── eventId: string (FK → Event, secondary index byEventId)
├── date: string (ISO date — any date; format validated by Lambda)
├── startTime: string (HH:MM — optional for all-day entries)
├── endTime: string (HH:MM — optional)
├── title: string (required)
├── description: string (optional)
├── location: string (optional — sub-location e.g. "Sala B")
├── supplierId: string (optional — FK → global Supplier catalog)
├── order: integer (optional — manual ordering within a day)
├── owner: string
├── createdAt: datetime
└── updatedAt: datetime
```

**Date validation:** `date` is a plain ISO date string and may fall on **any** day — before, during, or after the event. The Lambda validates only that it is a well-formed `YYYY-MM-DD` calendar date (`validateDateFormat` in `shared/scheduleValidation.ts`, called by the create and update handlers). No schema-level constraint — enforced in code.

This format check is load-bearing and must not be removed. Nothing else parses `date` before it reaches DynamoDB: the value goes straight into the `PutItem`/`UpdateItem` marshalling. While the window check existed it rejected malformed input as a side effect of the lexicographic comparison against `eventStartDate`; with the window gone, `validateDateFormat` is the only gate standing between the API and garbage rows.

**Events with no dates configured** have a fully working schedule. The date window was previously the only thing requiring the event to have dates at all, and the Lambda rejected every entry on such an event with `Event has no valid date configuration`.

---

### Supplier FK Pattern

`EventScheduleEntry.supplierId` is a FK to the global `Supplier` catalog (not `EventSupplier`).

When a schedule entry is created with a `supplierId`:
1. Lambda checks if an `EventSupplier` record exists for `(eventId, supplierId)`
2. If it exists → no action; the entry references the existing link
3. If it does **not** exist → Lambda creates an `EventSupplier` with `status: 'PENDING'`, `approvalStatus: 'DIRECT'` (if Owner/Co-Manager) or `PENDING_APPROVAL` (if Staff). This ensures the supplier enters the standard approval workflow.

This is consistent with the `select-event-supplier` Lambda pattern.

---

### Permission Matrix

| Operation | OWNER | CO_MANAGER | STAFF_LOGISTICS | STAFF_CHECKIN |
|-----------|-------|------------|-----------------|---------------|
| View own entries | Yes | Yes | Yes | No |
| View others' entries | Yes | Yes | Only if `canViewTeamSchedule` | No |
| Grant a staff member team-schedule visibility | Yes | No | No | No |
| Create entry | Yes | Yes | Yes | No |
| Edit any entry | Yes | Yes | No | No |
| Edit own entry | Yes | Yes | Yes | No |
| Delete entry authored by OWNER | Yes | No | No | No |
| Delete entry authored by non-OWNER | Yes | Yes | Own only | No |

**Visibility rule (2026-07-16).** `OWNER`/`CO_MANAGER` see every entry regardless of author. `STAFF_LOGISTICS` sees only entries they authored, unless the `OWNER` has set `EventCollaborator.canViewTeamSchedule = true` on that staff member's row — in which case they see the full agenda. The flag defaults to `false` (fail-closed) and only the `OWNER` may change it. `CO_MANAGER` sees everything but cannot grant.

Lambda verification follows ADR-019 pattern: `extract userId → owner check → collaborator role check → execute`. Edit and delete additionally call ownership-aware helpers `assertCanEditEntry` / `assertCanDeleteEntry`. `list-event-schedule` additionally applies the visibility rule above and filters entries before returning.

---

### Component Structure

```
src/Components/EventSchedule/
├── EventSchedule.jsx             — feature root: data fetching + calendar wrapper
├── ScheduleCalendar.jsx          — <Calendar> from react-big-calendar, custom renderers
├── ScheduleCalendarToolbar.jsx   — custom rbc toolbar: prev/next/today, view switcher
├── ScheduleCalendarMiniPicker.jsx — month-jump picker (react-day-picker), opened from the toolbar
├── ScheduleMonthDateHeader.jsx   — month.dateHeader: today pill + event-day emphasis
├── ScheduleDaySheet.jsx          — per-day entry list (bottom sheet on mobile, popover on desktop)
├── ScheduleShowMore.jsx          — replaces rbc's "+N" popup so the day sheet can anchor to a rect
├── ScheduleEntryDetailPopover.jsx — click-to-view with Edit button (read-only for STAFF)
├── ScheduleEntryFormModal.jsx    — create/edit form (react-hook-form + Modal)
├── scheduleCalendarContexts.js   — DayEventsCtx / EventDayCtx / ShowMoreCtx (bridges rbc's
│                                   imperative slot-component API back into React state)
├── scheduleUtils.js              — buildIsEventDay, getScheduleEntryColor, formatTimeLabel
└── rbc-overrides.css             — visual override layer over react-big-calendar
```

**Event days are emphasis, never a gate.** `buildIsEventDay` drives a background tint (`.rbc-event-day`) and a weighted date number; every other day accepts entries exactly the same way. An event with no dates configured simply has nothing to emphasise — the calendar opens on the current month (react-big-calendar's own default, no `defaultDate` is passed) and works normally.

FAB integration: `ContextualFAB` triggers `ScheduleEntryFormModal` via `document.getElementById('fab-action-schedule')?.click()` (same pattern as other tabs). The form pre-fills `date` with the currently visible calendar date.

---

### Lambda Functions

| Function | Purpose | Allowed Roles |
|----------|---------|---------------|
| `list-event-schedule` | List entries by eventId, verify read access, then apply the 2026-07-16 visibility filter (OWNER/CO_MANAGER: all; STAFF_LOGISTICS: own only unless `canViewTeamSchedule`). `authors` is computed post-filter. | OWNER, CO_MANAGER, STAFF_LOGISTICS |
| `create-event-schedule-entry` | Create entry + optional supplier upsert | OWNER, CO_MANAGER, STAFF_LOGISTICS |
| `update-schedule-entry` | Update entry with ownership-aware check (`assertCanEditEntry`) | OWNER (any), CO_MANAGER (any), STAFF_LOGISTICS (own) |
| `delete-schedule-entry` | Delete entry with ownership-aware check (`assertCanDeleteEntry`) | OWNER (any), CO_MANAGER (non-OWNER-authored), STAFF_LOGISTICS (own) |

## Consequences

- `react-day-picker` replaces any ad-hoc date input for event dates going forward. Do not introduce a second date picker library.
- `react-big-calendar` is the canonical calendar view for schedule features. Do not introduce a second calendar library.
- The `SELECTED` status on `EventSupplier` is a new status value — update any status enum, badge mapping, and i18n keys that enumerate `EventSupplier` statuses.
- Schedule entries do **not** support categories or persisted/manual colour selection in this version. Calendar colours are derived client-side from schedule entry identifiers and must not depend on `Supplier.category`.
- Drag-and-drop reordering within a day is deferred (the `order` field is reserved for this).
- Entries accept any date, so an entry can outlive the event's own dates. Writability is still bounded by the billing gate (`isEventWritable`, `shared/plans.ts`), which closes all writes to an event 30 days after `eventEndDate` on STARTER/PAY_PER_EVENT. That gate compares `now` against the window — it never looks at the entry's `date` — so a far-future entry is fine, but the agenda as a whole stops accepting changes once the event's plan window closes. If the agenda is ever expected to outlive that window, the gate is the thing to revisit, not the date validation.

---

### Superseded rules (pre-2026-07-15)

Recorded so the reversal is legible, not to be re-implemented:

- **Uniform schedule visibility (pre-2026-07-16).** `STAFF_LOGISTICS` saw the entire team agenda, exactly like `OWNER`/`CO_MANAGER` — "View schedule: Yes" for all three roles. Staff visibility is now default-closed and owner-granted via `EventCollaborator.canViewTeamSchedule` (see the 2026-07-16 revision note at the top).
- `date` had to fall inside `eventStartDate`–`eventEndDate` (range) or `eventSpecificDates[]` (specific), enforced by `validateDateInEventPeriod` in the create and update Lambdas. That function is deleted.
- An event with no date configuration rejected every schedule entry with `Event has no valid date configuration`.
- The frontend refused to mount the calendar for a dateless event, showing an empty state linking to the event settings tab (`hasEventDates` + the `schedule:emptyState.noDates.*` i18n keys — all removed).
- Days outside the window were dimmed (`.rbc-invalid-date`) and click-to-create was blocked on desktop. Mobile never enforced this, so the rule was already inconsistent across breakpoints.
- In `specific` mode the entry form rendered a `<Select>` enumerating the allowed dates instead of a date input. There is now a single unconditional date input.
