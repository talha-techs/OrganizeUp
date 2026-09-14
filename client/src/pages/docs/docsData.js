export const DOCS_SECTIONS = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: 'IoRocketOutline',
    description: 'Welcome to OrganizeUp — your unified knowledge engine and learning hub.',
    items: [
      {
        id: 'intro',
        title: 'Introduction to OrganizeUp',
        summary: 'Understand the architecture and core philosophy behind OrganizeUp.',
        badge: 'Core',
        readTime: '3 min read',
        content: `
### What is OrganizeUp?
**OrganizeUp** is an all-in-one personal knowledge engine designed for self-learners, developers, and knowledge workers. It solves the fragmentation problem where valuable learning materials get scattered across Telegram channels, Discord servers, YouTube playlists, Google Drives, and browser bookmarks.

### Key Pillars
1. **Universal Multi-Format Ingestion**: Ingest PDFs, audiobooks, Google Drive videos, YouTube playlists, and developer tools in a unified interface.
2. **Instant Capture Pipes**: Capture links and media without opening the app via the **Telegram Bot** (\`@OrganizeUpBot\`) and **Discord Context Menu App**.
3. **Deep Study Workspaces**: High-focus study tools with memory — PDF reading position persistence, video watch progress with reflection prompts, and time-stamped video note taking.
4. **Custom Knowledge Canvas**: Markdown wikis, interactive checklists, code snippets, and drag-and-drop Kanban boards.
5. **Community Discovery**: Explore curated public resources, vote on top picks, and join nested discussions.
        `,
        quickLinks: [
          { label: '5-Minute Quickstart', targetId: 'quickstart' },
          { label: 'PWA Installation', targetId: 'pwa' },
        ],
      },
      {
        id: 'quickstart',
        title: '5-Minute Quickstart',
        summary: 'Learn the essential workflows to organize your first resource.',
        badge: 'Guide',
        readTime: '5 min read',
        content: `
### Step 1: Sign Up & Access the Dashboard
Head over to [organizeup.app](https://organizeup.app) or your deployment, create an account, or log in instantly using **Google OAuth**.

### Step 2: Add Your First Book or Course
1. Open the **Books** page from the sidebar.
2. Click **+ Add Book** and choose your format:
   - **Text Book (PDF)**: Upload a PDF file or link. OrganizeUp will remember your exact reading page across sessions.
   - **Video Book**: Link a Google Drive video folder or stream.
   - **Audiobook**: Upload MP3 chapters or stream via LibriVox.
3. Organize into custom tags, set reading goals, and track your daily streak.

### Step 3: Trigger Quick Capture
Press <kbd>Ctrl</kbd> + <kbd>K</kbd> (or <kbd>Cmd</kbd> + <kbd>K</kbd> on macOS) anywhere inside the app to trigger the **Quick Capture Modal**. Paste any link, text snippet, or social media URL to automatically ingest it into your vault.
        `,
        callouts: [
          {
            type: 'tip',
            title: 'Pro Tip: PWA Share Target',
            text: 'Install the OrganizeUp PWA on Android or iOS to use your native system "Share" sheet directly into OrganizeUp!',
          },
        ],
      },
      {
        id: 'pwa',
        title: 'PWA & Mobile Installation',
        summary: 'How to install OrganizeUp as an offline-capable desktop and mobile app.',
        badge: 'Platform',
        readTime: '3 min read',
        content: `
### Install as Desktop Application (Chrome / Edge / Brave)
1. Open [https://organizeup.app](https://organizeup.app).
2. Click the **Install App** icon in the browser address bar (or look for the bottom install banner).
3. Click **Install**. OrganizeUp will launch as a standalone desktop window with native keyboard shortcut integration and hardware acceleration.

### Install on Mobile (Android & iOS)
- **Android (Chrome)**: Tap the 3-dots menu ➔ **Install App** or **Add to Home screen**.
- **iOS (Safari)**: Tap the **Share** button ➔ Scroll down and select **Add to Home Screen**.
        `,
      },
    ],
  },
  {
    id: 'library',
    title: 'Universal Library (Vault)',
    icon: 'IoBookOutline',
    description: 'Learn how to master Books, Audiobooks, Courses, and Developer Tools.',
    items: [
      {
        id: 'books',
        title: 'Books & Reading Tracker',
        summary: 'PDF position memory, video book tracking, and reflective learning.',
        badge: 'Feature',
        readTime: '4 min read',
        content: `
### In-Browser PDF Reader
- **Page Memory**: OrganizeUp saves your exact page number automatically as you read. Returning to any book resumes right where you left off.
- **Controls**: Includes zoom, page jump, download toggle, and responsive full-screen reading mode.

### Video Books & Reflection Prompts
- Embedded Google Drive and direct stream video player.
- **Auto Reflection**: When a video reaches 100% completion, OrganizeUp opens a reflective note modal prompting you to write your key takeaway, saving it directly to your study profile.
        `,
      },
      {
        id: 'audiobooks',
        title: 'Audiobooks Hub & WaveSurfer',
        summary: 'Custom MP3 chapters, interactive waveforms, LibriVox, and YouTube audiobooks.',
        badge: 'Audio',
        readTime: '4 min read',
        content: `
### WaveSurfer.js Waveform Visualizer
Audio tracks uploaded to OrganizeUp are rendered using interactive audio waveforms:
- Click anywhere on the waveform to seek with zero buffering lag.
- Native HTTP 206 Partial Content range requests allow instant seeking on multi-megabyte audio files.
- Tracklist switcher, playback speed controls (0.75x to 2x), and chapter bookmarking.

### LibriVox Public Domain Classics
Search and listen to tens of thousands of free public domain audiobooks directly within the **Explore** page with 1-click library saving.

### YouTube Modern Audiobooks
Stream curated modern book summaries and audiobooks in a dedicated background audio player modal.
        `,
      },
      {
        id: 'courses',
        title: 'Courses & Video Modules',
        summary: 'Multi-module video courses with granular lesson completion tracking.',
        badge: 'Feature',
        readTime: '3 min read',
        content: `
OrganizeUp allows you to bundle complex video tutorials and course drives into structured modules:
- Track completed vs remaining lessons with animated progress bars.
- Add lesson notes and attach code references.
- Link course certificates and external project repositories.
        `,
      },
      {
        id: 'tools',
        title: 'Tricks & Developer Tools',
        summary: 'Store CLI snippets, cheat sheets, online tools, and productivity tricks.',
        badge: 'Utilities',
        readTime: '2 min read',
        content: `
A dedicated catalogue for command-line one-liners, web dev utilities, regex cheatsheets, and AI tools. Categorize by tech stack and copy commands in one click.
        `,
      },
    ],
  },
  {
    id: 'youtube-studio',
    title: 'YouTube Study Studio',
    icon: 'IoLogoYoutube',
    description: 'Turn YouTube into an ad-free, high-retention study environment.',
    items: [
      {
        id: 'yt-overview',
        title: 'Playlists & Single Videos',
        summary: 'Cinema player mode, isolated user notes, and personal video management.',
        badge: 'New',
        readTime: '4 min read',
        content: `
### Dual Ingestion Modes
1. **Full Playlists**: Paste a YouTube playlist URL to automatically import all episodes with thumbnail and metadata extraction.
2. **Single Videos**: Save individual tutorials and tech talks into your dedicated Single Videos shelf.

### Cinema Player Experience
- Embedded YouTube Player with distraction-free layout (removes distracting algorithm recommendations).
- Seamless playback controls with keyboard shortcuts.
        `,
      },
      {
        id: 'yt-notes',
        title: 'Timestamps & Video Notes Workspace',
        summary: 'Capture timestamps and write persistent Markdown notes while watching.',
        badge: 'Interactive',
        readTime: '3 min read',
        content: `
### Isolated Personal Notes
Every note you save on a playlist or single video is strictly private to your account.
- **Timestamp Capture**: Click **+ Insert Timestamp** while watching to tag the exact second in the video.
- Clicking any timestamp in your saved notes jumps the player right to that moment.
- Markdown formatting supported: bold, bullet points, checklists, and code snippets.
        `,
      },
      {
        id: 'yt-explore',
        title: 'Explore & Public Playlists',
        summary: 'How curated playlists are shared and cloned to personal libraries.',
        badge: 'Explore',
        readTime: '3 min read',
        content: `
Only administrators can publish verified curated playlists into the public Explore feed.
When you discover an interesting playlist in Explore:
- Click **Add to Library** to clone the playlist into your personal studio.
- The cloned playlist starts with a completely blank, fresh notes workspace ready for your personal annotations!
        `,
      },
    ],
  },
  {
    id: 'modular-canvas',
    title: 'Modular Knowledge Canvas',
    icon: 'IoFolderOutline',
    description: 'Custom sections, Markdown wikis, code blocks, and Kanban boards.',
    items: [
      {
        id: 'sections',
        title: 'Custom Sections & Blocks',
        summary: 'Build project hubs with Markdown notes, checklists, and code snippets.',
        badge: 'Workspace',
        readTime: '4 min read',
        content: `
Sections are versatile multi-purpose workspaces. Inside any Section, you can mix and match dynamic blocks:
- **Markdown Notes**: Rich formatting, tables, headings, and links.
- **Checklists**: Interactive checkboxes with completion tallies.
- **Code Snippets**: Syntax highlighting with 1-click copy for JavaScript, Python, Bash, HTML, CSS, and SQL.
- **File Attachments**: Upload supplementary documents directly to GridFS storage.
        `,
      },
      {
        id: 'kanban',
        title: 'Drag-and-Drop Kanban Boards',
        summary: 'Manage learning roadmaps and study tasks with dnd-kit powered boards.',
        badge: 'Productivity',
        readTime: '3 min read',
        content: `
Every Section includes an optional Kanban task board powered by \`@dnd-kit\`:
- Default columns: **To Do**, **In Progress**, and **Completed**.
- Smooth drag-and-drop between columns with real-time state persistence.
- Add priority badges, due dates, and quick notes to any card.
        `,
      },
    ],
  },
  {
    id: 'quick-capture',
    title: 'Quick Capture & Media Embeds',
    icon: 'IoFlashOutline',
    description: 'Zero-friction link capture, keyboard shortcuts, and social video embeds.',
    items: [
      {
        id: 'shortcuts',
        title: 'Global Shortcuts & Fast Ingestion',
        summary: 'Use keyboard shortcuts anywhere to capture thoughts and links.',
        badge: 'Shortcuts',
        readTime: '2 min read',
        content: `
| Shortcut | Action | Scope |
|---|---|---|
| <kbd>Ctrl</kbd> + <kbd>K</kbd> | Open Quick Capture Modal | Global |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd> | Instant Quick Capture | Global |
| <kbd>/</kbd> | Focus Search Bar | Explore & Docs |
| <kbd>Esc</kbd> | Close Modals & Overlays | Global |
        `,
      },
      {
        id: 'social-embeds',
        title: 'Social Video Embeds & Scraper',
        summary: 'Embedded video player support for X, Instagram, Facebook Reels, and YouTube.',
        badge: 'Scraping',
        readTime: '3 min read',
        content: `
When you paste a link into Quick Capture, OrganizeUp inspects the metadata:
- **X (Twitter)**: Extracts tweet copy, author, and embeds interactive media.
- **Instagram**: Renders native embed widgets for posts and reels.
- **Facebook**: Resolves canonical post URLs and renders full video players with \`facebookexternalhit\` user agent compatibility.
- **YouTube**: Ingests thumbnails, channel details, and duration.
        `,
      },
    ],
  },
  {
    id: 'bot-inboxes',
    title: 'Telegram & Discord Bots',
    icon: 'IoPaperPlaneOutline',
    description: 'Turn your everyday chat apps into instant capture pipes.',
    items: [
      {
        id: 'telegram-bot',
        title: 'Telegram Bot (@OrganizeUpBot)',
        summary: 'Forward any message, PDF, or audio file directly to your private inbox.',
        badge: 'Integration',
        readTime: '4 min read',
        content: `
### Linking Your Account
1. Open the **Telegram Inbox** tab inside OrganizeUp.
2. Click **Connect Telegram** to generate your secure token (e.g. \`#link-a8f391\`).
3. Open Telegram and search for **[@OrganizeUpBot](https://t.me/OrganizeUpBot)**.
4. Send the \`#link-xxxxxx\` code to the bot.
5. You will receive an instant confirmation message confirming your account is paired!

### How to Use
- **Forward Messages**: Forward any post from private or public channels.
- **Send Files**: Send PDFs, MP3s, or images. The bot streams them directly to your MongoDB GridFS storage.
- **Triage**: From your Telegram Inbox inside OrganizeUp, preview and convert any message into a permanent Book, Course, or Section with one click.
        `,
      },
      {
        id: 'discord-bot',
        title: 'Discord Context Menu App',
        summary: 'Right-click any Discord message to capture it to OrganizeUp.',
        badge: 'Integration',
        readTime: '3 min read',
        content: `
### Installation
OrganizeUp Discord Bot supports **User App Install** — meaning you can use it in *any* server or DM without needing server admin permissions!

### How to Use
1. Right-click on any message in Discord.
2. Navigate to **Apps** ➔ **Save to OrganizeUp**.
3. The bot extracts text, author, attachments, and embeds, pushing them straight into your **Discord Inbox**.
        `,
      },
    ],
  },
  {
    id: 'subdomain-guide',
    title: 'Name.com & Domain Setup',
    icon: 'IoGlobeOutline',
    description: 'Step-by-step guide to configuring docs.organizeup.app DNS on Name.com.',
    items: [
      {
        id: 'namecom-setup',
        title: 'Subdomain DNS Guide (docs.organizeup.app)',
        summary: 'How to route docs.organizeup.app to your hosting provider via CNAME.',
        badge: 'Setup',
        readTime: '3 min read',
        content: `
### How Subdomain Routing Works
OrganizeUp is architected to handle subdomains directly in the frontend application!
When a visitor goes to **\`https://docs.organizeup.app\`**, the app detects the \`docs.\` subdomain and automatically serves this comprehensive Documentation Portal as the home view.

---

### Step-by-Step Name.com Configuration

#### Step 1: Add CNAME in Name.com
1. Log into your [Name.com](https://www.name.com) account.
2. Go to **My Domains** and click **\`organizeup.app\`**.
3. Select **DNS Records** (or Manage DNS).
4. Add the following record:
   - **Type**: \`CNAME\`
   - **Host**: \`docs\`
   - **Answer**: \`cname.vercel-dns.com.\` *(or your hosting target)*
   - **TTL**: \`300\` (or default)
5. Save the record.

#### Step 2: Add Subdomain in Vercel
1. Open your **Vercel Dashboard**.
2. Select your OrganizeUp project.
3. Go to **Settings** ➔ **Domains**.
4. Type **\`docs.organizeup.app\`** and click **Add**.
5. Vercel will match your Name.com DNS record, verify the CNAME, and automatically issue a free Let's Encrypt SSL certificate!

---

### Verification
Once added, you can test DNS propagation by opening a terminal and running:
\`\`\`bash
nslookup docs.organizeup.app
\`\`\`
It will resolve directly to \`cname.vercel-dns.com\`.
        `,
      },
    ],
  },
];
