# OrganizeUp — Security Audit, Vulnerability Analysis & Feature Review

> **Date:** March 2026  
> **Scope:** Full-stack review of the OrganizeUp platform (Node.js/Express backend + React frontend)  
> **Audited Paths:** `server/`, `client/src/`

---

## 1. CRITICAL SECURITY VULNERABILITIES

### 1.1 Unauthenticated File Access (IDOR) — CRITICAL

- **Files:** `server/routes/books.js` (lines 31–34), `server/server.js` (line 81)
- The routes `GET /api/books/pdf/:fileId`, `GET /api/books/audio/:fileId`, and `GET /api/images/:fileId` have **no authentication middleware** (`protect` is missing).
- Anyone who knows or guesses a MongoDB ObjectId can access **any** PDF, audio file, or image stored in GridFS — including private user content.
- The `servePdf`, `serveAudio`, and `serveImage` functions in `bookController.js` perform zero ownership or visibility checks.
- **Impact:** Complete bypass of the visibility system. All uploaded PDFs, audio books, and images are publicly accessible if the file ID is known or enumerated.
- **Fix:** Add `protect` middleware to these routes **and** verify that the requesting user owns the book or the book is public before streaming the file.

---

### 1.2 NoSQL / Regex Injection via Search — HIGH

- **Files:** `server/controllers/exploreController.js` (lines 48–51, 57–60, 75–77), `server/controllers/courseController.js` (lines 68–70, 145–147, 331–333), `server/controllers/adminController.js` (lines 197–202)
- User-supplied `search` query params and `newCategory` values are directly interpolated into `$regex` MongoDB operators without sanitization:

  ```js
  { title: { $regex: search, $options: "i" } }
  ```

- A malicious user can send crafted regex strings such as `.*` or `(a+)+$` (ReDoS) to cause denial of service, or use regex operators to extract data patterns.
- The `newCategory` field in course creation constructs a RegExp directly from user input:

  ```js
  new RegExp(`^${newCategory.trim()}$`, "i")
  ```

  This is a classic **regex injection**.
- **Impact:** Denial of Service (ReDoS), potential data enumeration.
- **Fix:** Escape all special regex characters from user input before passing to `$regex`, or use MongoDB's `$text` index for full-text search.

---

### 1.3 Token Leaked in URL (Google OAuth) — HIGH

- **File:** `server/controllers/authController.js` (lines 120–122)
- After the Google OAuth callback, the JWT token is appended directly to the redirect URL:

  ```js
  res.redirect(`${process.env.CLIENT_URL}/auth/google/success?token=${token}`)
  ```

- JWT tokens in URLs are recorded by browsers, proxies, web servers, and can leak via the `Referer` header.
- **Impact:** Token theft through browser history, server access logs, proxy logs, or `Referer` leakage.
- **Fix:** Use a short-lived, single-use authorization code that the client can exchange for a token server-side, or set the token exclusively as an `httpOnly` cookie and redirect without it in the URL.

---

### 1.4 Hardcoded Session Secret Fallback — HIGH

- **File:** `server/server.js` (line 53)

  ```js
  secret: process.env.SESSION_SECRET || "organizeup-session-secret"
  ```

- If `SESSION_SECRET` is not set in the environment, a hardcoded, publicly visible secret is used.
- **Impact:** Session forgery if deployed without the env var being configured.
- **Fix:** Remove the fallback literal and fail fast (throw an error at startup) if `SESSION_SECRET` is not provided in production.

---

### 1.5 Google Drive API Injection — MEDIUM

- **File:** `server/controllers/driveController.js` (line 86)
- The Google Drive API query is built via string interpolation:

  ```js
  q: `'${folderId}' in parents and trashed = false`
  ```

- The `folderId` originates from user input (after a regex extraction). While the regex limits the character set, edge cases could still allow query manipulation.
- **Impact:** Potential Google Drive API query manipulation.
- **Fix:** Validate `folderId` strictly as alphanumeric characters plus hyphens/underscores only (e.g., `/^[a-zA-Z0-9_-]+$/`).

---

### 1.6 Content Security Policy Disabled — MEDIUM

- **File:** `server/server.js` (lines 34–37)

  ```js
  contentSecurityPolicy: false
  ```

- This completely disables CSP headers on all responses.
- **Impact:** XSS attacks are not mitigated by browser CSP enforcement.
- **Fix:** Configure a proper CSP policy (e.g., using `helmet`'s `contentSecurityPolicy` option with explicit directives) instead of disabling it entirely.

---

### 1.7 X-Frame-Options Intentionally Removed for PDFs — MEDIUM

- **File:** `server/controllers/bookController.js` (line 400)

  ```js
  res.removeHeader("X-Frame-Options")
  ```

- This header is removed before serving PDFs, allowing them to be embedded in any third-party `<iframe>`.
- Combined with the unauthenticated file access (§1.1), this allows embedding **private** PDFs on any attacker-controlled site.
- **Impact:** Clickjacking and unauthorized embedding of private content.

---

## 2. AUTHORIZATION & ACCESS CONTROL FLAWS

### 2.1 Admin Role Assignment via Registration — HIGH

- **File:** `server/controllers/authController.js` (lines 19–22)
- If anyone registers with an email matching the `ADMIN_EMAIL` environment variable, they are automatically granted the admin role.
- There is **no email verification** — `isVerified` is hardcoded to `true`.
- **Impact:** If the `ADMIN_EMAIL` value is known (e.g., from `.env.example` or a leaked config), anyone can register with that address and immediately become an admin.
- **Fix:** Require email verification before granting the admin role, or use a separate, out-of-band admin provisioning mechanism.

---

### 2.2 No Email Verification System — MEDIUM

- **File:** `server/controllers/authController.js` (line 28)
- All users are created with `isVerified: true` — the schema field exists but is never enforced.
- There is no email verification flow, no verification tokens, and no confirmation emails are sent.
- **Impact:** Spam account creation and email impersonation.

---

### 2.3 Google OAuth Account Linking Without Verification — MEDIUM

- **File:** `server/config/passport.js` (lines 35–42)
- If a user registers via email/password, and someone subsequently authenticates via Google OAuth using the same email, the Google ID is linked to the existing account **without any additional verification**.
- **Impact:** An attacker who controls a Google account with the same email as a victim can silently take over the victim's OrganizeUp account.

---

### 2.4 Course Validation Bypass with `newCategory` — LOW

- **File:** `server/routes/courses.js` (line 38), `server/middleware/validators.js` (lines 60–63)
- The `courseRules` validator requires `category` to be non-empty, but the `createCourse` controller also accepts `newCategory` from `req.body`. When `newCategory` is provided, `category` is left empty in the form data — which would normally trigger a validation error. However, as documented in §5.2, the `courseRules` and `validate` middleware are **not applied** to the create route at all, so the validation is silently bypassed rather than blocked. Additionally, because the route applies `upload.single("bannerImage")` before any validation step, multipart form data is already parsed before validators could run.

---

### 2.5 Missing Validation on Update Routes — MEDIUM

- **Files:** `server/routes/books.js` (lines 62–69), `server/routes/courses.js` (line 40), `server/routes/tools.js`
- The `PUT /:id` routes for books, courses, and tools do **not** apply validation middleware (`bookRules`, `courseRules`, `toolRules`). Validation is only applied on `POST` (create) routes.
- **Impact:** Users can update resources with empty titles, invalid types, or other invalid data that would be rejected at creation time.

---

## 3. DATA EXPOSURE & INFORMATION LEAKAGE

### 3.1 Token Returned in JSON Response Body — MEDIUM

- **File:** `server/controllers/authController.js` (lines 51, 91)
- On login and registration, the JWT token is returned in **both** the `httpOnly` cookie **and** the JSON response body.
- The client stores this token in `localStorage` (see `client/src/redux/slices/authSlice.js`, lines 101–102).
- **Impact:** Any XSS vulnerability can steal the token from `localStorage`. Returning the token in the response body and storing it in `localStorage` defeats the security benefit of the `httpOnly` cookie.

---

### 3.2 Stack Trace Exposure in Development — LOW

- **File:** `server/server.js` (line 105)

  ```js
  ...(process.env.NODE_ENV === "development" && { stack: err.stack })
  ```

- Stack traces are only included when `NODE_ENV` is `"development"`. However, if `NODE_ENV` is not explicitly set to `"production"` in a deployment, stack traces will leak in error responses.
- **Fix:** Default `NODE_ENV` to `"production"` or explicitly assert its value at startup.

---

### 3.3 Detailed Error Logging to Console — LOW

- Multiple controllers use `console.error("error:", error)`, which logs full error objects — potentially including sensitive data such as query parameters or internal paths — to stdout/stderr.
- **Fix:** Use a structured logger with configurable log levels and sanitize sensitive fields before logging.

---

### 3.4 User Email Exposed in Populate Calls — LOW

- **Files:** Multiple controllers (`bookController.js`, `courseController.js`, `toolController.js`)

  ```js
  .populate("addedBy", "name email avatar")
  ```

- User email addresses are included in API responses that are visible to any authenticated user browsing public content.
- **Impact:** Email harvesting for all content authors across the platform.
- **Fix:** Remove `email` from the `populate` selection in user-facing (non-admin) endpoints.

---

## 4. FEATURE REVIEW — WHAT EACH USER ROLE CAN DO

### 4.1 Regular User (role: `"user"`)

| Feature | Implementation Status | Issues |
|---|---|---|
| Register (email/password) | ✅ Working | No email verification |
| Register (Google OAuth) | ✅ Working | Account linking vulnerability (§2.3) |
| Login (email/password) | ✅ Working | No rate limiting |
| Login (Google OAuth) | ✅ Working | Token leaked in URL (§1.3) |
| Update Profile (name, avatar) | ✅ Working | Avatar upload to GridFS |
| Create Books (text/video/audio) | ✅ Working | Private by default |
| Upload PDFs to GridFS | ✅ Working | PDFs publicly accessible without auth (§1.1) |
| Upload Audio Files to GridFS | ✅ Working | Audio publicly accessible without auth (§1.1) |
| Create Courses | ✅ Working | Can create new categories inline, bypassing admin-only category creation (§5.1) |
| Create Tools/Tricks | ✅ Working | Private by default |
| Create Custom Sections | ✅ Working | With sub-sections (notes, todos, boards, links, snippets) |
| Import from Google Drive | ✅ Working | Scans drive folder and imports file metadata |
| Track Video Progress | ✅ Working | Per-video timestamp tracking |
| Track Reading Progress | ✅ Working | Page tracking for text books |
| Request Publish (make private content public) | ✅ Working | Goes through admin approval |
| Vote on Public Content | ✅ Working | Upvote/downvote system |
| Comment on Public Content | ✅ Working | Can delete own comments |
| Save Public Content to Library | ✅ Working | With personal notes |
| View Explore Feed | ✅ Working | Filtered, sorted, paginated |
| Mark Notifications Read | ✅ Working | Bulk mark all |
| Clone Public Sections | ✅ Working | Deep-copies section and sub-sections |

---

### 4.2 Admin User (role: `"admin"`)

| Feature | Implementation Status | Issues |
|---|---|---|
| All regular user features | ✅ Working | — |
| View Dashboard Stats | ✅ Working | User count, content counts, pending requests |
| View All Users | ✅ Working | Includes all user details |
| View User Detail | ✅ Working | With progress data |
| Delete Users | ✅ Working | Cannot delete other admins |
| View/Manage All Content | ✅ Working | Across all users |
| Toggle Content Visibility | ✅ Working | Public/private for any content |
| Review Publish Requests | ✅ Working | Approve/reject with admin notes and notifications |
| Create/Delete Categories | ✅ Working | Only admin via the category API routes |
| Delete Any Comment | ✅ Working | Moderation capability |
| Delete Any Content | ✅ Working | Books, courses, tools, sections, playlists |
| Content is Public by Default | ✅ Working | Admin-created content is auto-set to public |

---

## 5. WRONGLY IMPLEMENTED FEATURES & BUGS

### 5.1 Category Creation Not Actually Admin-Only — BUG

- **Route:** `POST /api/courses/categories` correctly requires `adminOnly` middleware.
- **But:** `POST /api/courses` (`createCourse`) allows **any** authenticated user to pass `newCategory` in the request body, which creates a new category directly — bypassing the admin-only restriction entirely.
- **Impact:** Any authenticated user can create arbitrary categories.

---

### 5.2 Course Validation Rules Conflict with FormData — BUG

- **File:** `server/routes/courses.js` (line 38)
- The create route is defined as:

  ```js
  router.post("/", protect, upload.single("bannerImage"), createCourse)
  ```

  Note that `courseRules` and `validate` middleware are **not** applied to this route.
- The validation rules for courses are defined but unused on the create endpoint (they are only applied to the category creation route).
- **Impact:** Courses can be created without any server-side title validation.

---

### 5.3 `getBooks` Doesn't Show Public Books to Regular Users — DESIGN ISSUE

- **File:** `server/controllers/bookController.js` (lines 18–22)
- When `req.user.role !== "admin"`, the filter applied is `{ addedBy: req.user._id }` — regular users see **only their own** books.
- Public books from other users are **not** returned by `GET /api/books`; they are only discoverable through `GET /api/explore`.
- This creates an inconsistency: the existing code comment suggests "user sees own + public" but the implementation shows only the user's own content.
- The same issue exists in `getCourses` and `getTools`.

---

### 5.4 Explore Feed N+1 Query Performance — DESIGN ISSUE

- **File:** `server/controllers/exploreController.js`
- The `attachSocialCounts` helper makes **3 separate database queries per item** (upvotes, downvotes, comments).
- A single page of 20 items across 4 content types can generate up to **240 database queries** per page load.
- With the `"popular"` sort, **all items** are fetched from the database first, scores are attached, and then the results are sorted and sliced in memory.
- **Impact:** Severe performance degradation at scale.
- **Fix:** Use aggregation pipelines to compute counts in a single query, and add database indexes on `targetId` for social data collections.

---

### 5.5 Logout Doesn't Invalidate JWT — DESIGN ISSUE

- **File:** `server/controllers/authController.js` (logout function)
- Logout only clears the cookie. The JWT token itself remains cryptographically valid until its expiry.
- There is no token blacklist or server-side session revocation mechanism.
- **Impact:** A stolen token remains usable for the full duration of its validity, even after the user has explicitly logged out.
- **Fix:** Maintain a server-side token blacklist (e.g., storing invalidated JTIs in Redis) or switch to shorter-lived access tokens combined with refresh tokens.

---

### 5.6 Admin Cannot Be Deleted But Can Delete Self — EDGE CASE

- **File:** `server/controllers/adminController.js` (line 98)
- The check `if (user.role === "admin")` prevents admins from deleting **other** admin accounts. However, there is no check preventing an admin from deleting their **own** account if they can reach the user deletion endpoint.

---

### 5.7 No Rate Limiting — MISSING FEATURE

- There is no rate limiting on any endpoint — including login, registration, API reads, and file uploads.
- **Impact:** Brute-force attacks against credentials, spam content creation, and denial-of-service through resource exhaustion.
- **Fix:** Apply `express-rate-limit` (or an equivalent) at a minimum to authentication endpoints, and set reasonable limits on content creation and file upload endpoints.

---

### 5.8 No Input Sanitization for HTML/XSS — MISSING

- Comment text, book descriptions, course descriptions, and tool descriptions are stored and returned as-is without sanitization.
- If rendered as HTML (e.g., via `dangerouslySetInnerHTML` or a Markdown renderer), this enables **stored XSS**.
- The React frontend escapes content by default in JSX, but any use of `dangerouslySetInnerHTML` or an unguarded Markdown renderer would be vulnerable.
- **Fix:** Sanitize rich-text content server-side with a library such as `DOMPurify` (server-side), `sanitize-html`, or `xss` before storing or before returning in API responses.

---

### 5.9 File Upload MIME Type Check is Weak — MEDIUM

- **File:** `server/middleware/upload.js`
- The `imageFilter` uses a regex `.test(file.mimetype)` that checks whether the pattern exists **anywhere** in the MIME type string — not as an exact match. For example, `image/jpeg-malicious` would pass the check.
- Furthermore, `file.mimetype` is client-supplied and can be trivially spoofed.
- **Impact:** Malicious files could be uploaded by crafting a spoofed MIME type.
- **Fix:** Check `file.mimetype` against an explicit allowlist of exact values (e.g., `["image/jpeg", "image/png", "image/webp"]`) and additionally validate using a server-side magic-bytes check (e.g., `file-type` library).

---

### 5.10 GridFS File Deletion Not Cascading — BUG

- **File:** `server/controllers/adminController.js` (`adminDeleteContent`)
- When an admin deletes content (books, courses, tools), the associated GridFS files (PDFs, images, audio) are **not deleted**.
- **Impact:** Orphaned files accumulate in MongoDB GridFS indefinitely, consuming storage without bound.
- **Fix:** After deleting a content document, iterate over its associated GridFS file IDs and delete them using the GridFS `delete` API.

---

### 5.11 Publish Request Status Creates Ambiguous "Pending" State — BUG

- **File:** `server/controllers/socialController.js` (line 232)
- When a publish request is created, content visibility is set to `"pending"`.
- If an admin never reviews the request, the content remains in `"pending"` state indefinitely — it is neither public nor truly private, creating an ambiguous state.
- Users can still see the content in their own `getBooks` results (which filter by `addedBy` only), but the `visibility: "pending"` value is semantically inconsistent.
- **Fix:** Keep the original visibility value unchanged when a publish request is submitted; use a separate `publishRequest` status field to track the request lifecycle.

---

## 6. DEPENDENCY & CONFIGURATION CONCERNS

### 6.1 Memory Storage for File Uploads

- All file uploads use `multer.memoryStorage()` — entire files are buffered in process memory before being piped to GridFS.
- With a maximum allowed audio file size of 200 MB, concurrent uploads can exhaust available memory and crash the server.
- **Fix:** Stream uploads directly to GridFS using a disk-based multer storage engine or a custom stream pipe, avoiding full in-memory buffering.

---

### 6.2 Session Store is In-Memory

- Express session uses the default in-memory store — no MongoDB or Redis session store is configured.
- Sessions are lost on every server restart, and the in-memory store does not scale horizontally across multiple server instances.
- **Fix:** Use `connect-mongo` or `connect-redis` as the session store.

---

### 6.3 No HTTPS Enforcement

- The cookie `secure` flag is set only in production, but there is no HTTP-to-HTTPS redirect middleware configured.
- **Fix:** Add a redirect middleware (or configure it at the reverse-proxy/load-balancer level) to enforce HTTPS for all traffic.

---

### 6.4 CORS Configuration

- `origin: process.env.CLIENT_URL || "http://localhost:5173"` accepts only a single origin.
- If `CLIENT_URL` has a typo or is not set, CORS may block legitimate requests from the production frontend, or default to allowing the development origin in a production environment.
- **Fix:** Validate that `CLIENT_URL` is set at startup, and consider supporting a list of allowed origins for staging and production environments.

---

## 7. SUMMARY SEVERITY TABLE

| # | Vulnerability | Severity | Type |
|---|---|---|---|
| 1 | Unauthenticated file access (PDF / Audio / Image) | 🔴 CRITICAL | Auth Bypass |
| 2 | NoSQL / Regex injection in search & category | 🟠 HIGH | Injection |
| 3 | JWT token leaked in Google OAuth redirect URL | 🟠 HIGH | Token Leakage |
| 4 | Hardcoded session secret fallback | 🟠 HIGH | Config |
| 5 | Google OAuth account takeover via email linking | 🟠 HIGH | Auth |
| 6 | Admin role via known `ADMIN_EMAIL` registration | 🟠 HIGH | Privilege Escalation |
| 7 | Token in `localStorage` (XSS steal-able) | 🟡 MEDIUM | Data Exposure |
| 8 | No rate limiting anywhere | 🟡 MEDIUM | DoS / Brute Force |
| 9 | CSP completely disabled | 🟡 MEDIUM | XSS Surface |
| 10 | Category creation bypass via `newCategory` | 🟡 MEDIUM | Auth Bypass |
| 11 | MIME type validation weak / spoofable | 🟡 MEDIUM | Upload |
| 12 | Missing validation on update routes | 🟡 MEDIUM | Input Validation |
| 13 | Explore feed N+1 query problem | 🟡 MEDIUM | Performance |
| 14 | GridFS orphan files on content deletion | 🟢 LOW | Resource Leak |
| 15 | No email verification | 🟢 LOW | Missing Feature |
| 16 | Memory storage for large uploads | 🟢 LOW | Stability |
