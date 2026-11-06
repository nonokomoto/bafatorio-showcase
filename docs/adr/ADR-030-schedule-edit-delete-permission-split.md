# ADR-030: Schedule Edit/Delete Permission Split & Logistics Access

**Status:** Superseded by ADR-029
**Date:** 2026-05-06
**Author:** Ney Carvalho
**Branch:** `feature/controlo-de-acesso`
**Related:** ADR-015 (Event Collaboration & Access Control), ADR-019 (Event-scoped Roles), ADR-029 (Schedule Architecture)

---

## Current Status

This ADR is historical rationale only. The canonical schedule permission rules now live in ADR-029.

ADR-030 originally refined the first ADR-029 permission matrix after the initial schedule rules proved too restrictive for collaborative event planning. The final rules were folded back into ADR-029 so the schedule feature has a single source of truth.

---

## Historical Decision

The schedule edit/delete model was changed to:

- allow `STAFF_LOGISTICS` to create schedule entries;
- allow `STAFF_LOGISTICS` to edit and delete only entries they authored;
- allow `CO_MANAGER` to edit any schedule entry;
- allow `CO_MANAGER` to delete entries not authored by the event `OWNER`;
- keep `OWNER` as the only role allowed to delete OWNER-authored entries.

The implementation split the previous modify check into ownership-aware edit/delete helpers because delete needs the event owner identity and edit does not.

---

## Canonical References

- ADR-029 defines the current `EventScheduleEntry` permission matrix and Lambda behavior.
- ADR-015 lists the global event collaboration permission matrix and points schedule-specific ownership rules back to ADR-029.
