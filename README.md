<p align="center">
  <br />
  <img src="client/public/organizeup-logo.svg" alt="OrganizeUp Logo" width="100" height="100" />
</p>

<h1 align="center">
  OrganizeUp
</h1>

<p align="center">
  <b>The modern personal knowledge engine & learning resource hub.</b><br />
  Capture, organize, and master books, video courses, developer tools, audiobooks, and community knowledge — all in one unified, distraction-free platform.
</p>

<p align="center">
  🚀 <b>Live Demo: <a href="https://organize-up.vercel.app">https://organizeup.app</a></b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Three.js-3D_Hero-000000?style=for-the-badge&logo=threedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Redux_Toolkit-State-764ABC?style=for-the-badge&logo=redux&logoColor=white" />
  <img src="https://img.shields.io/badge/PWA-Installable-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-Express_5-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-GridFS_Storage-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Telegram_Bot-Instant_Capture-24A1DE?style=for-the-badge&logo=telegram&logoColor=white" />
  <img src="https://img.shields.io/badge/Discord_Bot-Context_Menu_App-5865F2?style=for-the-badge&logo=discord&logoColor=white" />
  <img src="https://img.shields.io/badge/Deploy-Render_%2B_Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" />
</p>

---

## 🧩 The Problem & The Solution

**The Pain Point:** Free learning materials are everywhere — Telegram channels share PDFs, Discord servers drop dev tools, WhatsApp chats share course drives, and YouTube has gems scattered across playlists. Within days, those valuable links get lost in endless browser bookmark folders, deleted chat histories, or disorganized Google Drive folders.

**OrganizeUp solves this entirely:**
- **Zero-Friction Ingestion:** Forward messages and files directly to the **Telegram Bot** or right-click any Discord message using the **Discord Context Menu App** to capture links and media straight into your personal Inbox.
- **Universal Multi-Format Player:** Read PDFs with auto-saved scroll positions, watch Google Drive video series with progress tracking & post-lesson reflection prompts, and stream audiobooks with interactive waveforms.
- **Modular Knowledge Canvas:** Build structured custom sections with Markdown notes, interactive checklists, code snippets, and **drag-and-drop Kanban boards**.
- **Community & Discovery:** Explore curated public sections shared by other learners, upvote helpful resources, participate in nested discussions, or publish your own knowledge for admin review.

---

## ✨ Key Features

### 📖 1. Universal Books Player & Learning Tracker
Every book format is supported with granular progress tracking persisted to your user account:

| Format | Experience & Capabilities |
|---|---|
| 🎬 **Video Books** | Embedded Google Drive sequential video player. Tracks watch percentage per episode with animated progress bars. Automatically opens a **reflective note popup** upon 100% video completion to record key learnings directly to your database. Includes responsive fullscreen mode. |
| 📄 **Text Books (PDF)** | In-browser PDF reader with Edge-style reading position memory. Automatically captures and resumes on the exact page you last read. Includes full-screen preview and direct file downloads. |
| 🎧 **Audiobooks Hub** | <ul><li>**Custom Uploads:** Upload multi-track audio files stored in MongoDB GridFS with native HTTP 206 Partial Content range seeking. Features a **WaveSurfer.js** animated waveform visualizer, seek timeline, playback rate, volume controls, and tracklist navigation.</li><li>**LibriVox Public Domain Integration:** Live search and explore tens of thousands of free classic audiobooks with complete chapter streaming and 1-click library saving.</li><li>**YouTube Audiobooks & Summaries:** Curated modern audiobook search with embedded playback modals and topic filters.</li></ul> |

---

### 📥 2. Instant Capture Inboxes (Telegram & Discord Bots)
Never lose a shared resource again. OrganizeUp turns chat platforms into direct capture pipes:

- 🤖 **Telegram Bot (`@OrganizeUpBot`):**
  - Connect your account via a secure, time-limited `#link-xxxxxx` verification code generated from your Telegram Inbox page.
  - Forward any message, link, document, PDF, or audio file directly to the bot.
  - The bot parses URLs, downloads attached media to MongoDB GridFS, and pushes the item into your **Telegram Inbox** with unread notification badges.
  - Triage messages directly in the app: preview content, convert to permanent Books/Courses/Tools, or dismiss.
- 🎮 **Discord Bot & Context Menu App:**
  - Deployed with both Guild and User Install support.
  - Right-click any Discord message → Select **Apps** → **Save to OrganizeUp**.
  - Automatically extracts links, embeds, and streams file attachments into GridFS.
  - Full triage interface in the app for converting Discord discoveries into structured learning items.

---

### 🗂️ 3. Custom Sections & Modular Knowledge Canvas
OrganizeUp includes a block-based knowledge workspace for structuring personal wikis, study guides, and project hubs:

- **Section Architecture:** Set custom section titles, descriptions, banner images, and toggle privacy (**Public** or **Private**).
- **Sub-Section Blocks:**
  - 📝 **Markdown Notes:** Formatted long-form guides, notes, and study material.
  - 📋 **Kanban Boards:** Drag-and-drop task boards powered by `@dnd-kit/core` with custom columns (e.g. *To Do*, *In Progress*, *Done*), item priorities (*Low*, *Medium*, *High*), and due dates.
  - ✅ **Interactive To-Do Lists:** Checklists with completion state persistence, priority badges, and target dates.
  - 💻 **Code Snippets:** Syntax-highlighted code blocks with language indicators and 1-click copy.
  - 🔗 **Curated Resource Links:** Clean link cards with titles and descriptions.
  - 🖼️ **Image Galleries:** Visual reference blocks with captions and modal expansion.
- **Publishing Pipeline:** Request to publish custom sections to the community Explore tab. Admins review and approve submissions through the moderation panel.

---

### 🌐 4. Community Explore & Social Layer
- **Community Knowledge Feed:** Discover public sections, courses, books, and developer tools curated by the community.
- **Social Engagement:** Real-time upvoting, downvoting, and net score calculations powered by an optimized MongoDB aggregation pipeline (reducing DB queries by over 95%).
- **Discussion Threads:** Nested comments system on resources and sections for peer learning and recommendations.
- **1-Click Library Cloning:** Save any public section or resource to your personal library with a single click.

---

### 🎓 5. Courses & 🛠️ Developer Tools Vault
- **Courses Management:** Dynamic category creation, thumbnail banners, drive links, and full CRUD operations without page reloads.
- **Developer Tools & Free Resource Vault:** Curated directory for developer tools, free trial tricks, web utilities, and productivity shortcuts with expandable descriptions.

---

### 📂 6. Google Drive Universal Scanner
- Connect any Google Drive folder URL or ID.
- The built-in scanner recursively indexes videos, PDFs, Google Docs, Sheets, Slides, images, text, and code files.
- Batch import detected resources directly into your OrganizeUp library with automatic MIME type classification.

---

### 📱 7. Progressive Web App (PWA) & Responsive UI
- **Installable PWA:** Install OrganizeUp natively on iOS, Android, macOS, and Windows via `vite-plugin-pwa`.
- **Offline Resilience:** Workbox service worker caching for offline asset delivery.
- **Mobile-First Navigation:** Mobile splash screen, bottom navigation tab bar (`MobileTabBar.jsx`), accessible slide-over drawer (`MobileDrawer.jsx`), and desktop collapsible sidebar (`Sidebar.jsx`).
- **Universal File Viewer:** Dedicated multi-tier viewer supporting formatted text/code preview with line numbers and copy-all, PDF viewing, and fallback image streaming.

---

### 🎨 8. Design System & 3D Visual Identity
- **Refined Non-Blue Color Palette:** Built on a sleek neutral **Zinc-950** dark canvas and pure white light canvas, paired with an electric **Ember / Terracotta (`#ff5722`)** primary accent.
- **Interactive 3D Hero:** Custom **Three.js** + **React Three Fiber** + **Drei** scene on the landing page featuring floating content type cards with idle drift and cursor parallax.
- **Micro-Interactions:** Cursor-reactive tilt cards (`TiltCard.jsx`), animated counter widgets (`AnimatedCounter.jsx`), glassmorphism backdrop blur cards, and unified Framer Motion transition variants.
- **Accessible Primitives:** Modals, tooltips, and dropdown menus powered by `@radix-ui` primitives.

---

### 🛡️ 9. Admin Governance Suite
- **Analytics & Metrics:** Real-time dashboard showing total users, content counts by category, and pending submissions.
- **Publish Moderation:** Approve or reject community section publish requests with automated user notifications.
- **Content & User Management:** Centralized control to inspect, edit, or delete inappropriate content, moderate comments, and promote user roles.

---

## 🏗️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 19** | Core UI library |
| **Vite 7** | Next-generation build tool & dev server |
| **React Router v7** | Declarative client-side routing & code splitting |
| **Redux Toolkit** | Global state management (10 domain slices) |
| **Tailwind CSS v4** | Modern CSS-first utility framework with `@theme` design tokens |
| **Three.js & React Three Fiber** | Interactive 3D hero canvas on landing page |
| **@radix-ui Primitives** | Headless accessible UI primitives (Dialog, DropdownMenu, Tooltip) |
| **@dnd-kit/core** | Accessible drag-and-drop engine for Kanban boards |
| **WaveSurfer.js v7** | Audio waveform visualizer and seeking player |
| **Framer Motion** | Physics-based animations and layout transitions |
| **Vite PWA Plugin** | Progressive Web App manifest, service worker & offline caching |

### Backend & Microservices
| Technology | Purpose |
|---|---|
| **Node.js + Express 5** | RESTful API server with route modularization |
| **MongoDB + Mongoose 9** | Primary document database |
| **MongoDB GridFS** | Binary streaming storage for audiobooks, PDFs, and Discord/Telegram media |
| **node-telegram-bot-api** | Long-polling Telegram bot daemon for message & document ingestion |
| **discord.js v14** | Discord bot & Context Menu User App daemon |
| **Google APIs (v3)** | Google Drive folder scanner and YouTube Data API v3 integration |
| **Passport.js** | Google OAuth 2.0 authentication strategy |
| **Cloudinary** | Cloud storage for profile avatars and custom section banners |
| **Security & Optimization** | Helmet CSP, CORS with credentials, express-rate-limit, gzip compression, httpOnly cookies |

---

## 📁 Project Structure

```
OrganizeUp/
├── client/                               # React 19 + Vite 7 Frontend
│   ├── public/                           # PWA icons, manifest, screenshots & splash assets
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/                     # ProtectedRoute, Google Auth callback handlers
│   │   │   ├── forms/                    # BookForm, CourseForm, ToolForm, Drive/Book modals
│   │   │   ├── landing/                  # LandingHero3D (Three.js / Fiber / Drei canvas)
│   │   │   ├── layout/                   # Sidebar, MobileDrawer, MobileTabBar, Header, Layout
│   │   │   ├── sections/                 # SubSectionBlock (Markdown, Kanban, Todo, Code, Media)
│   │   │   └── ui/                       # WaveformPlayer, ModernAudiobookCard, FileViewer, Modals
│   │   ├── hooks/                        # Custom hooks (useDocumentTitle, etc.)
│   │   ├── motion/                       # Reusable Framer Motion animation presets
│   │   ├── pages/                        # 19 Route-level view components
│   │   │   ├── auth/                     # Login, Signup, OAuth success pages
│   │   │   ├── discord/                  # Discord Inbox & media triage
│   │   │   ├── telegram/                 # Telegram Inbox & link instructions
│   │   │   ├── AdminPage.jsx             # Admin governance & publish approval dashboard
│   │   │   ├── BookDetailPage.jsx        # Audio/Video/PDF multi-format player
│   │   │   ├── BooksPage.jsx             # Filterable books library (Video, Text, Audio)
│   │   │   ├── CoursesPage.jsx           # Categorized courses catalog
│   │   │   ├── ExplorePage.jsx           # Community hub with voting & comments
│   │   │   ├── SectionsPage.jsx          # Custom sections grid
│   │   │   ├── SectionDetailPage.jsx     # Canvas with Kanban, notes, and todo blocks
│   │   │   └── SavedLibraryPage.jsx      # Personal bookmarked items shelf
│   │   ├── redux/                        # Store configuration & 10 domain slices
│   │   ├── theme/                        # ThemeContext (Light & Dark zinc/ember system)
│   │   ├── utils/                        # Axios instance with cookie credentials interceptor
│   │   ├── index.css                     # Design system variables & custom utilities
│   │   └── main.jsx                      # App entry point with ThemeProvider & Redux Provider
│   ├── vite.config.js                    # Vite 7 + Tailwind v4 + VitePWA configuration
│   └── vercel.json                       # Vercel deployment rewrites
│
├── server/                               # Express 5 + Node.js Backend
│   ├── bot/
│   │   ├── telegramBot.js                # Telegram capture daemon with #link-code auth
│   │   └── discordBot.js                 # Discord bot daemon with context menu app
│   ├── config/                           # MongoDB, GridFS bucket, Passport OAuth, Cloudinary
│   ├── controllers/                      # 13 Express route controllers
│   ├── middleware/                       # JWT auth, Multer upload, role verification
│   ├── models/                           # 14 Mongoose models (User, Book, Section, Inboxes, etc.)
│   ├── routes/                           # 15 Express REST API route modules
│   ├── services/                         # LibriVox API, YouTube API, and Google Drive services
│   └── server.js                         # Server entry point with 14-min keep-alive ping
│
├── render.yaml                           # Render cloud deployment specification
└── package.json                          # Monorepo root scripts (concurrent dev runner)
```

---

## 🔑 Environment Variables Reference

Create `server/.env` using the template below:

```env
# Server Runtime
PORT=5000
NODE_ENV=development

# MongoDB Connection Strings
# Primary SRV URI (Atlas)
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/organizeup?retryWrites=true&w=majority
# Direct connection fallback (for restricted networks / hotspot DNS issues)
MONGO_URI_DIRECT=mongodb://<username>:<password>@shard-00-00.mongodb.net:27017,...?ssl=true&authSource=admin

# Authentication & Session
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRE=30d
SESSION_SECRET=your_express_session_secret

# Google OAuth 2.0
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Google APIs (Drive Scanner & YouTube Audiobooks/Playlists)
GOOGLE_API_KEY=your_google_cloud_api_key

# Cloudinary (Banners & User Avatars)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Telegram Bot Integration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_from_botfather

# Discord Bot & Context Menu App
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_application_id
DISCORD_CLIENT_SECRET=your_discord_client_secret

# Application URLs
CLIENT_URL=http://localhost:5173
ADMIN_EMAIL=your_admin_account_email@gmail.com

# Production Self-Ping (Optional: Prevents Render free-tier sleep)
RENDER_EXTERNAL_URL=https://your-organizeup-api.onrender.com
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js:** v18.0.0 or higher
- **MongoDB:** Atlas cluster or local MongoDB instance
- **Cloudinary Account:** For image and banner uploads
- **Google Cloud Console Project:** Enabled OAuth 2.0, Google Drive API v3, and YouTube Data API v3

### 1. Clone the Repository
```bash
git clone https://github.com/talha-techs/OrganizeUp.git
cd OrganizeUp
```

### 2. Install Dependencies
Install dependencies for root, server, and client with a single command:
```bash
npm run install-all
```

*(Alternatively, run `npm install` inside both `/server` and `/client` directories).*

### 3. Configure Environment Variables
Copy and configure the environment variables for the server:
```bash
cp server/.env.example server/.env
# Edit server/.env with your API credentials
```

### 4. Run Locally
Launch both the Express backend and Vite frontend concurrently from the root:
```bash
npm run dev
```

- **Frontend Client:** `http://localhost:5173`
- **Backend API:** `http://localhost:5000`

---

## 🤖 Bot Setup Instructions

### Telegram Bot Setup
1. Message `@BotFather` on Telegram to create a new bot and obtain your `TELEGRAM_BOT_TOKEN`.
2. Add the token to `server/.env`.
3. Start the server — the bot will initialize polling automatically.
4. Open OrganizeUp → Go to **Telegram Inbox** in the sidebar → Click **Link Telegram**.
5. Send the generated `#link-xxxxxx` command to your bot on Telegram.
6. Once verified, forward any message, document, or audio to the bot to instantly see it in your inbox!

### Discord Bot Setup
1. Create an application in the [Discord Developer Portal](https://discord.com/developers/applications).
2. Under the **Bot** tab, enable **Message Content Intent** and copy the bot token to `DISCORD_TOKEN`.
3. Copy the Client ID to `DISCORD_CLIENT_ID` and Client Secret to `DISCORD_CLIENT_SECRET`.
4. The server automatically registers the global Context Menu command (`"Save to OrganizeUp"`).
5. Invite the bot to your server or authorize it as a User Installable App. Right-click any message → **Apps** → **Save to OrganizeUp**!

---

## 📡 REST API Architecture

| Route Prefix | Controller / Scope | Description |
|---|---|---|
| `/api/auth` | `authController` | Registration, login, logout, session verification (`getMe`), Google OAuth |
| `/api/books` | `bookController` | Video, text, and audio book CRUD, watch/reading progress, reflection notes |
| `/api/audiobooks` | `audiobookController` | LibriVox directory search, chapter streaming, YouTube modern audiobooks |
| `/api/courses` | `courseController` | Categorized course links, category creation, banner management |
| `/api/tools` | `toolController` | Developer tools, trial hacks, and web utility resources CRUD |
| `/api/sections` | `sectionController` | Custom sections, visibility settings, publish request submission |
| `/api/content` | `subSectionController`| Sub-section blocks: Markdown, @dnd-kit Kanban boards, todos, code |
| `/api/explore` | `exploreController` | Community feed of published sections, aggregated vote & comment counts |
| `/api/social` | `socialController` | Resource upvoting, downvoting, and nested discussion comments |
| `/api/library` | `libraryController` | User personal saved library, bookmarking toggles |
| `/api/telegram` | `telegramBot` / Routes | Account linking code generator, unread counts, inbox message triage |
| `/api/discord` | `discordBot` / Routes | OAuth config, Discord captured items, attachment GridFS streaming |
| `/api/drive` | `driveController` | Recursive Google Drive folder scanning & batch resource import |
| `/api/youtube-playlists` | `youtubePlaylistController` | Curated YouTube playlists management & in-app streaming |
| `/api/admin` | `adminController` | Platform stats, user role management, publish approvals/rejections |

---

## ☁️ Deployment

### Backend on Render
1. Connect your repository to [Render](https://render.com).
2. Render detects `render.yaml` automatically to deploy the `organizeup-api` web service.
3. Configure the environment variables in the Render dashboard.
4. *Self-Ping Keep-Alive:* When `NODE_ENV=production` and `RENDER_EXTERNAL_URL` are supplied, the server automatically pings `/api/health` every 14 minutes to prevent free-tier cold starts.

### Frontend on Vercel
1. Connect your repository to [Vercel](https://vercel.com) and set the root directory to `client`.
2. Build Command: `npm run build` | Output Directory: `dist`.
3. The included `client/vercel.json` ensures client-side routing fallback and proxies `/api` calls directly to your Render backend.

---

## 🗺️ Roadmap

- [x] Full UI & design system overhaul (Zinc-950 + Ember `#ff5722`, zero blue palette)
- [x] Three.js interactive 3D hero canvas on landing page
- [x] LibriVox public domain audiobooks live directory integration
- [x] Telegram Bot auto-capture pipeline with user link codes
- [x] Discord Bot message context menu application
- [x] Block-based Sub-Sections with @dnd-kit Kanban boards and Markdown
- [x] Progressive Web App (PWA) with offline caching and mobile tab bar
- [ ] AI-assisted auto-tagging and summary generation for saved articles
- [ ] Browser Extension for 1-click URL saving from Chrome, Edge, and Firefox
- [ ] Collaborative real-time editing on shared custom sections

---

## 🤝 Contributing

Contributions are always welcome!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feat/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: add AmazingFeature'`)
4. Push to the Branch (`git push origin feat/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for more information.

---

<p align="center">
  Built with ❤️ to stop losing good learning resources in the void of unorganized folders.
</p>
