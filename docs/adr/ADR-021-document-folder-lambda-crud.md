# ADR-021: Document Folder Lambda CRUD

## Status

Accepted (Amended 2026-02-19 — removed automatic "General" folder)

## Context

Two security issues in the Documents section when events are shared with collaborators:

1. **Root docs leak**: When sharing folders with collaborators, documents stored at the root level (`event-documents/{eventId}/{file}`) are visible to all collaborators via S3 `list()` without role verification.

2. **Uncontrolled CRUD**: `folderApi.js` used direct GraphQL mutations (`createDocumentFolder`, `updateDocumentFolder`, `deleteDocumentFolder`) with no Lambda verification layer. Any authenticated user in the USER group could create/update/delete any folder.

## Decision

Follow the pattern established in ADR-019 (Event-Scoped Roles) by implementing Lambda-backed mutations for folder CRUD operations.

### Lambda Functions Created

| Function | Purpose | Allowed Roles |
|----------|---------|---------------|
| `create-event-folder` | Create folders with role verification | OWNER, CO_MANAGER, STAFF_LOGISTICS |
| `update-event-folder` | Update folders with ownership checks | OWNER (any), CO_MANAGER (own), STAFF_LOGISTICS (own) |
| `delete-event-folder` | Delete folders with protection for default | OWNER (any), CO_MANAGER (own), STAFF_LOGISTICS (own) |

### Folder Requirement (no root-level documents)

Documents **must** live inside a folder. The frontend enforces this by:

- Requiring at least one folder to exist before allowing document uploads
- The upload modal includes a **folder picker** where users select the destination folder
- The folder picker includes a **"New folder"** button so users can create one inline without leaving the upload flow
- If no folders exist, the "Add document" button shows an alert prompting the user to create a folder first
- Drag-and-drop uploads also go through the same folder check

This eliminates the root docs leak without needing an automatic "General" folder.

### ~~Default "General" Folder~~ (Removed)

The original design auto-created a "General" folder with `isDefault: true` when an OWNER or CO_MANAGER first opened the Documents section. This was removed because:

1. **Ambiguous ownership** — the General folder's `owner` was whichever user first triggered creation, making sharing permissions unclear
2. **Permission complications** — collaborators in a shared General folder could edit/delete documents uploaded by the Owner, bypassing the ownership-based permission model
3. **Redundant** — the folder picker in the upload modal already requires explicit folder selection, making an auto-created catch-all unnecessary

Existing events that already have a General folder (`isDefault: true`) continue to work normally. The `isDefault` guard in Lambdas and frontend still prevents editing or deleting these legacy folders.

### Permission Matrix

| Operation | OWNER | CO_MANAGER | STAFF_LOGISTICS | STAFF_CHECKIN |
|-----------|-------|------------|-----------------|---------------|
| View all folders | Yes | No | No | No |
| View own + shared folders | Yes | Yes | Yes | No |
| Create folders | Yes | Yes | Yes | No |
| Edit any folder | Yes | No | No | No |
| Edit own folder | Yes | Yes | Yes | No |
| Delete any folder | Yes | No | No | No |
| Delete own folder | Yes | Yes | Yes | No |
| Delete "General" folder (legacy) | No | No | No | No |
| **Edit/delete docs in any folder** | **Yes** | **No** | **No** | **No** |
| **Edit/delete docs in own folder** | **Yes** | **Yes** | **Yes** | **No** |
| **Upload docs to own/shared folder** | **Yes** | **Yes** | **Yes** | **No** |

### Document-Level Permissions

In addition to folder-level access, document edit/delete actions are restricted by folder ownership:

- **OWNER**: can edit/delete documents in **all** folders
- **CO_MANAGER**: can edit/delete documents only in folders **they own** (shared folders are upload-only)
- **STAFF_LOGISTICS**: can edit/delete documents only in folders **they own** (shared folders are upload-only)

This is enforced in the frontend via `canManageDocumentsInFolder` (memoized, checks `folder.owner` against `userId`) and in the backend via Lambda ownership verification on folder mutations.

## Consequences

- All folder mutations now go through Lambda verification (no direct GraphQL bypass)
- Root-level documents are prevented by requiring folder selection before upload
- Existing events with a legacy "General" folder continue to function (backward compatible)
- `isDefault` field remains on the `DocumentFolder` model for legacy support
- Frontend `folderApi.js` uses Lambda-backed mutations (same pattern as `roleApi.js`)
- Document edit/delete permissions are scoped to folder ownership, not just role-based `canManageDocuments`

## Changelog

| Date | Change |
|------|--------|
| 2026-02-17 | Initial ADR — Lambda CRUD + automatic General folder |
| 2026-02-19 | Amended — removed auto General folder, added folder picker requirement, added document-level permission scoping |
