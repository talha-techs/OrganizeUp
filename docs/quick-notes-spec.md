# OrganizeUp Quick Notes: User Stories and Spec

Save this file as `docs/quick-notes-spec.md` in the repo. It is the single source of truth for the feature.

## 1. Why this feature

People already use notepads to "message themselves" (links, snippets, reminders), to take lecture and course notes, and to jot things down while watching or reading. They then come back to find that note later. OrganizeUp users do the same while using courses, books and playlists, but today they leave the app to do it.

What users of other note apps complain about (this drives the requirements):
- Lost or overwritten notes after sync problems, the top complaint theme.
- Offline mode failing exactly when it is needed.
- Slow to open, so the thought is gone before they can type.
- Search that misses, and clutter once there are many notes.
- Lock-in: no easy export.

**Product principle:** reliable first, fast second, simple third. A note app that loses a note once loses the user.

## 2. Personas (from OrganizeUp's real audience)

| Persona | Typical use |
|---|---|
| Student (Sara) | Lecture notes, exam checklists, quick formulas |
| Self-learner (Ali) | Notes beside a course, book or playlist |
| Message-to-self user (Hamza) | Pastes links, snippets, ideas, to-dos, then finds them later |
| Commuter | Writes offline on a bad connection and expects it to sync later |

## 3. User stories and acceptance criteria

Priority: P1 = MVP, P2 = next, P3 = later.

### Epic A: Capture fast
**QN-1 (P1) Instant new note.** As a student in a lecture, I want to open a new note in one tap and start typing, so I do not miss what is being said.
- Reachable from any page: sidebar "Notes", a floating "+" on mobile, and keyboard shortcut `N` (when not typing).
- The cursor is in the editor immediately. No title is required and there is no "save" button.
- A blank note that is left empty is discarded automatically.

**QN-2 (P1) Auto title.** As a user, I want the title to come from my first line, so I never have to name notes.
- Title = first non-empty line (max 80 characters); falls back to "Untitled note".

**QN-3 (P2) Scratchpad.** As a message-to-self user, I want one always-open running note, so I can paste things quickly without creating a new note each time.
- A pinned "Scratchpad" note exists by default and can't be deleted (only cleared).
- "Add to Scratchpad" (a quick input) appends a timestamped entry at the end.

**QN-4 (P2) Share into OrganizeUp.** As an Android user, I want to share text or a link from another app into my Scratchpad, so I can capture while browsing.
- Web Share Target in the PWA manifest, text/url only, behind login with a safe redirect after login.

### Epic B: Never lose a word
**QN-5 (P1) Autosave.** As a user, I want my note saved automatically, so I never think about saving.
- Debounced save about 800 ms after typing stops, plus on blur, `visibilitychange` and `pagehide`.
- Every keystroke is written to a local draft (IndexedDB) first, then synced to the server.
- Visible status: "Saving…", "Saved", "Offline, will sync", "Couldn't save, retrying" (with `aria-live`).

**QN-6 (P1) Works offline.** As a commuter, I want to write with no connection and have it sync later.
- Create, edit and read previously opened notes offline. Changes queue and sync on reconnect with retry and backoff.

**QN-7 (P1) No silent overwrites.** As a user with two devices, I want no edit to silently destroy another.
- Server notes have a `version`. A save sends `baseVersion`; if it is stale the server returns 409.
- On conflict the client keeps both: the server copy stays, and the local text is saved as "<title> (conflict copy)" with a clear message. Never last-write-wins without telling the user.

**QN-8 (P1) Recover from mistakes.** As a user, I want deleted notes to be recoverable.
- Delete moves to "Recently deleted" for 30 days (restore or delete forever). Archive hides without deleting.

**QN-9 (P3) Version history.** Keep the last 10 snapshots per note with restore.

### Epic C: Find and organize
**QN-10 (P1) Search.** As a user with many notes, I want to find a note by any word, quickly.
- Search box (focus with `Ctrl+F` or `/` on the notes page), title and body, highlighted snippet, results under ~300 ms for up to 1,000 notes.

**QN-11 (P1) Light organization.** As a user, I want to pin and tag notes without a folder maze.
- Pin, archive and inline `#tags` (auto-detected); filter by tag. Sort: pinned first, then last updated.

**QN-12 (P1) Checklists and formatting.** As an exam crammer, I want checklists I can tick.
- Markdown with `- [ ]` task lines clickable in the preview; edit/preview toggle; headings, lists, links and code blocks supported.

### Epic D: Connect to learning
**QN-13 (P2) Notes on a resource.** As a self-learner, I want notes beside the course, book or playlist I am studying.
- A "Notes" panel on Book, Course and Playlist pages lists and creates notes linked to that item (`linkedTo`).
- Deleting the resource unlinks the notes; it never deletes them.

**QN-14 (P2) Move to workspace.** As a user, I want to turn a note into a block in one of my workspaces.
- "Add to workspace" creates a markdown block from the note's content.

**QN-15 (P3) Note reminder.** Reuse the Web Push reminder system to remind about a note at a chosen time.

**QN-16 (P3) Telegram `/note`.** The Telegram bot appends a message to the Scratchpad.

### Epic E: Control and trust
**QN-17 (P1) Export, no lock-in.** As a user, I want my notes out of the app whenever I choose.
- Download a note as `.md` or `.txt` (P1). "Export all" as a zip (P2).

**QN-18 (P1) Privacy.** As a user, I want my notes to be mine alone.
- Owner-only. Never in Explore. Admin tools show counts and metadata only, never note bodies. Not end-to-end encrypted, and the privacy text states this honestly.

**QN-19 (P1) Fair limits.** As the platform owner, I need limits so the free tier stays healthy.
- Max 100 KB per note, max 1,000 active notes per user, write rate limiting, clear error messages.

### Non-goals (MVP)
Real-time collaboration, public share links, images/attachments (avoids storage and bandwidth costs), AI features, end-to-end encryption.

## 4. Design

**Placement:** a "Notes" item in the sidebar plus a mobile floating action button. Route `/notes` (list + editor side by side on desktop; list then full-screen editor on mobile). Lazy-loaded.

**Look:** use the app's existing design tokens and accent. No hardcoded colors, no blue, works in light and dark mode.

**Empty state:** one sentence of guidance and a primary "New note" button.

**Accessibility:** keyboard operable, visible focus, status announced via `aria-live`, touch targets at least 44 px.

## 5. Data model (MongoDB)

`Note`
- `user` (ObjectId, indexed, required)
- `title` (string, max 80), `body` (string, max 100 KB)
- `pinned`, `archived` (booleans), `isScratchpad` (boolean)
- `tags` ([string], lowercase, max 20)
- `linkedTo` ({ type: "book" | "course" | "playlist" | "capture", id })
- `version` (number, starts at 1, incremented on each save)
- `clientId` (string UUID, for idempotent offline create)
- `deletedAt` (date | null), `createdAt`, `updatedAt`

Indexes: `{user:1, deletedAt:1, updatedAt:-1}`; text index on `title` and `body`; unique partial `{user:1, clientId:1}`; unique partial `{user:1}` where `isScratchpad:true`; `linkedTo` lookup index. Permanent purge of items deleted over 30 days (scheduled job through the existing cron endpoint).

## 6. API (all routes `protect`, owner-scoped, validated)

- `GET /api/notes?q=&tag=&archived=&deleted=&cursor=&limit=`: returns `id, title, snippet (160 chars), pinned, tags, updatedAt`, never the full body (protects bandwidth).
- `GET /api/notes/:id`: full note.
- `POST /api/notes`: create (idempotent via `clientId`).
- `PATCH /api/notes/:id` with `baseVersion`: 409 plus the server note on conflict.
- `DELETE /api/notes/:id` (soft), `POST /api/notes/:id/restore`, `DELETE /api/notes/:id/permanent`.
- `GET /api/notes/:id/export?format=md|txt`; `GET /api/notes/export` (P2, zip).
- Other users' notes return 404. Strip unknown fields (no mass assignment). Rate limit writes.

## 7. Client architecture

- Editor: native `<textarea>` for speed (no heavy rich-text engine in v1). Lazy-load markdown preview with `react-markdown` and `remark-gfm` if the app doesn't already include them.
- Local-first storage with Dexie (IndexedDB): `drafts` and a `syncQueue`.
- Save pipeline: keystroke, then local write, then debounced PATCH, with retry and backoff. On `pagehide`, flush with `fetch(..., {keepalive:true})`. Do not use `sendBeacon` (cannot send the Authorization header).
- State: Redux Toolkit slice for the list and status; the editor holds its own text state.
- Service worker: do not break the Web Push service worker; offline cache must not cache `/api/notes` responses of other users (clear on logout).
- On logout, wipe local drafts for that user.

## 8. Phases

- **Phase 1 (MVP):** QN-1, 2, 5, 6, 7, 8, 10, 11, 12, 17 (single note), 18, 19. Backend, tests, UI, sidebar entry, offline drafts.
- **Phase 2:** QN-3, 4, 13, 14, export-all.
- **Phase 3:** QN-9, 15, 16.

## 9. Tests and acceptance checklist

1. Kill the tab mid-typing, reopen: text is there.
2. Airplane mode: create and edit, reconnect, it syncs once with no duplicates.
3. Two devices edit the same note: second save gets a conflict copy, nothing lost.
4. User B cannot read or patch user A's note (404); admin endpoints never return bodies.
5. 100 KB and 1,000-note limits enforced with friendly errors.
6. List endpoint payload for 100 notes is small (target under ~30 KB).
7. Logout clears local drafts; login as another user shows none.
8. Lighthouse and keyboard-only pass; works in light and dark mode.
9. Server tests for validation, idempotent create, version conflict, soft delete and restore.

## 10. Success metrics (privacy-safe, no content logged)

Share of new users who create a note in the first session, notes per active user per week, autosave failure rate, 7-day return rate for note users.

