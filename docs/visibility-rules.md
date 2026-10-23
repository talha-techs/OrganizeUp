# OrganizeUp: Visibility Rules & Admin Access Specification

This document defines the authoritative public/private visibility and access boundaries across all content types in OrganizeUp, complying with data privacy principles and regulatory moderation requirements.

---

## 1. Visibility Matrix

| Content Type | Visibility Field | Who Can Read | Who Can Edit / Delete | Authorized Admin Access |
|---|---|---|---|---|
| **Book** | `visibility` (`"public"` \| `"private"`) | **Public:** All users (Explore / Catalog)<br>**Private:** Author (`addedBy`) only | Author (`addedBy`) only | Read & preview full content (including private PDFs/audio via short-lived signed URLs), unpublish (`public` $\rightarrow$ `private`), or cascade-delete. Every access is audited. |
| **Course** | `visibility` (`"public"` \| `"private"`) | **Public:** All users (Explore)<br>**Private:** Author (`addedBy`) only | Author (`addedBy`) only | Read & preview full curriculum, unpublish (`public` $\rightarrow$ `private`), or cascade-delete. Every access is audited. |
| **Tool (Trick)** | `visibility` (`"public"` \| `"private"`) | **Public:** All users (Explore)<br>**Private:** Author (`addedBy`) only | Author (`addedBy`) only | Read & preview full tool specifications, unpublish (`public` $\rightarrow$ `private`), or cascade-delete. Every access is audited. |
| **Workspace (CustomSection)** | `visibility` (`"public"` \| `"private"`), `publishMode` | **Public:** All users (Explore / Clone)<br>**Private:** Creator (`addedBy`) & invited members (`collaborators`) | Creator & editors (`collaborators` with `role: "editor"`) | Read & preview workspace structure and child blocks (via authenticated admin preview with signed URLs), unpublish (`public` $\rightarrow$ `private`), or cascade-delete. Membership/ownership is never altered. Every access is audited. |
| **YouTube Playlist** | `visibility` (`"public"` \| `"private"`) | **Public:** All users (Curated Explore)<br>**Private:** Creator (`addedBy`) only | Creator (`addedBy`) only | Read & preview playlist and video tracks, approve publish request, unpublish (`public` $\rightarrow$ `private`), or cascade-delete. Every access is audited. |
| **Vault Capture** | Implicitly Private (no `visibility` field) | Owner (`user`) only | Owner (`user`) only | Regulatory moderation review: read metadata and preview media (via short-lived admin-signed URLs). Never exposed to other users or public endpoints. Every access is audited. |
| **Telegram Message** | Implicitly Private (no `visibility` field) | Owner (`user`) only | Owner (`user`) only | Regulatory moderation review: read message text and preview banner (via short-lived admin-signed URLs). Never exposed to other users or public endpoints. Every access is audited. |
| **Discord Message** | Implicitly Private (no `visibility` field) | Owner (`user`) only | Owner (`user`) only | Regulatory moderation review: read message and preview attachments (via short-lived admin-signed URLs). Never exposed to other users or public endpoints. Every access is audited. |
| **Publish Request** | `status` (`"pending"` \| `"approved"` \| `"rejected"`) | Requester (`requestedBy`) & Authorized Admin | Authorized Admin reviews (`approve` \| `reject`) with `adminNote` | Sole authority to approve or reject. Approval transitions content from `private` to `public`. Every decision is recorded in `AdminAuditLog`. |
| **Comment** | Inherits parent content visibility | Any user with read access to parent item | Author only | Authorized Admin can moderate and delete violating comments with cascade cleanup and audit logging. |

---

## 2. Core Security & Privacy Principles

1. **Strict Admin Identity Isolation:**
   - There is exactly **one** authorized administrator matching `process.env.ADMIN_EMAIL` (case-insensitive) with `role === "admin"`.
   - The user's role and email must be verified against the database on every admin request. JWT claims and client state are never trusted.
   - Non-administrators (and unauthenticated users) attempting to access admin endpoints receive `404 Route not found` to conceal route existence.

2. **Zero Inadvertent Public Exposure:**
   - Admin access is purely a read/preview and moderation interface. Viewing or previewing private content **never** toggles its visibility to public or alters its ownership.
   - Private media URLs are generated on-demand as short-lived presigned URLs (TTL $\le 1$ hour) only within authenticated admin preview endpoints.
   - Private media keys (`captures/`, `telegram/`, `discord/`) and private GridFS files remain strictly blocked on all public routes.

3. **Explicit Publishing Workflow:**
   - Making private content public requires the explicit publishing workflow (`PublishRequest`).
   - Admins cannot toggle private content to public via an ad-hoc switch. Only review and approval of a formal `PublishRequest` sets `visibility: "public"`.
   - Unpublishing (`public` $\rightarrow$ `private`) is an admin moderation power that can be executed directly, requiring a reason and writing to `AdminAuditLog`.

4. **Comprehensive Audit Trail (`AdminAuditLog`):**
   - Every read, preview, unpublish, delete, and publish review performed by the admin on private or public content is permanently logged.
   - The audit log tracks: `adminId`, `action`, `targetType`, `targetId`, `owner`, `reason`, `ipAddress`, and `timestamp`.
   - **Privacy invariant:** Passwords, tokens, secrets, session cookies, and private text/file bodies are strictly excluded from audit logs.

---

## 3. Discrepancies & Resolutions Identified During Audit

1. **Direct Visibility Toggle in Legacy Controller:**
   - *Legacy:* `PUT /api/admin/toggle-visibility` allowed toggling any item from `private` to `public` without a publish request or recorded review.
   - *Resolution:* Replaced with an explicit Unpublish moderation action (`unpublishContent`) requiring a reason, and constrained publishing to the reviewed `PublishRequest` approval flow.
2. **Missing Admin Visibility of Private Resources:**
   - *Legacy:* Content Management was limited to exploring public or personal items. Admin could not inspect private items for regulatory compliance.
   - *Resolution:* Added an authorized `visibility=private` filter in `getAllContent` with comprehensive preview drawers and signed media generation for the admin.
3. **Legacy GridFS ObjectId Guessability:**
   - *Legacy:* `/api/images/:objectId` served any GridFS file without verifying whether it was private.
   - *Resolution:* Restricted GridFS ObjectIds: private models (`CapturedResource`, `TelegramMessage`, `DiscordMessage`) require ownership or admin authentication; unauthenticated requests are strictly restricted to verified public image models (`Book`, `Course`, `Tool`, `User`, `CustomSection`).
