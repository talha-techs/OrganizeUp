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
**OrganizeUp** is a high-performance personal knowledge engine designed for self-learners, developers, and knowledge workers. It solves the fragmentation problem where valuable learning materials get lost across Telegram channels, Discord servers, YouTube playlists, Google Drives, and browser bookmarks.

### The 5 Core Pillars
1. **Universal Multi-Format Vault**: Ingest PDFs, audiobooks with waveforms, Google Drive videos, YouTube playlists, and developer tools in a unified, distraction-free interface.
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
        summary: 'Learn the essential workflows to organize your first learning resource.',
        badge: 'Guide',
        readTime: '5 min read',
        content: `
### Overview
Follow this 5-minute guide to get fully onboarded with OrganizeUp.

Step 1: Sign Up & Access the Dashboard
Navigate to [organizeup.app](https://organizeup.app). You can sign up with an email and password or use one-click **Google OAuth**. Once authenticated, you will arrive at your personalized study cockpit.

Step 2: Add Your First Book or Learning Resource
1. Open the **Books** page from the sidebar navigation.
2. Click the **+ Add Book** button in the top right.
3. Choose your format:
   - **Text Book (PDF)**: Upload a PDF file. OrganizeUp will remember your exact reading page across devices.
   - **Video Book**: Paste a Google Drive video link or direct MP4 stream.
   - **Audiobook**: Upload multi-track MP3 files or search the LibriVox catalog.
4. Assign categories, tags, and set your reading goals.

Step 3: Ingest Content with Quick Capture
Press <kbd>Ctrl</kbd> + <kbd>K</kbd> (or <kbd>Cmd</kbd> + <kbd>K</kbd> on macOS) anywhere inside the app to open the **Quick Capture Modal**. Paste any link, text note, or social media URL to automatically parse and store it in your Vault.

Step 4: Explore Curated Community Knowledge
Visit the **Explore** page from the sidebar to browse verified playlists, audiobooks, and development tools shared by the community. Click **Add to Library** to clone any resource into your personal workspace with fresh, blank notes!
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
        summary: 'How to install OrganizeUp as an offline-capable desktop and mobile application.',
        badge: 'Platform',
        readTime: '3 min read',
        content: `
### Progressive Web App (PWA) Capabilities
OrganizeUp is built as a PWA with service workers, asset caching, and native OS integration.

Step 1: Desktop Installation (Chrome / Edge / Brave)
1. Open [https://organizeup.app](https://organizeup.app) in your desktop browser.
2. Look for the **Install App** icon in the URL address bar or the banner at the bottom of the screen.
3. Click **Install**.
4. OrganizeUp will launch in its own dedicated, borderless window with desktop taskbar integration and full hardware acceleration.

Step 2: Mobile Installation on Android
1. Open Chrome on your Android device and visit [https://organizeup.app](https://organizeup.app).
2. Tap the browser's three-dots menu in the top right.
3. Tap **Install App** (or **Add to Home screen**).
4. An icon will be added to your app drawer and home screen. It will also register as a native Android **Share Target**!

Step 3: Mobile Installation on iOS (iPhone & iPad)
1. Open Safari and visit [https://organizeup.app](https://organizeup.app).
2. Tap the **Share** button (the square icon with an upward arrow) in the bottom toolbar.
3. Scroll down and tap **Add to Home Screen**.
4. Confirm by tapping **Add**. The app will run in standalone full-screen mode.
        `,
      },
    ],
  },
  {
    id: 'library',
    title: 'Universal Library (Vault)',
    icon: 'IoBookOutline',
    description: 'Master Books, Video Books, Audiobooks, Courses, and Developer Tools.',
    items: [
      {
        id: 'books',
        title: 'Books & Reading Tracker',
        summary: 'PDF position memory, video book tracking, and reflective learning.',
        badge: 'Feature',
        readTime: '4 min read',
        content: `
### Reading Without Losing Your Place
OrganizeUp features a specialized reader engine designed for academic textbooks, research papers, and technical books.

Step 1: Reading Textbooks (PDF)
1. Open any PDF book from your library.
2. Read at your own pace — zoom in, navigate pages, or enter fullscreen mode.
3. As you navigate, OrganizeUp **automatically remembers your exact page number**.
4. When you return days later on any device, the reader automatically resumes on your exact last read page!

Step 2: Video Books & Reflection Prompts
1. Add a Video Book by linking a Google Drive video series or video lecture.
2. Watch lectures in the embedded player. Progress is tracked incrementally.
3. When the video reaches **100% completion**, OrganizeUp automatically triggers a **Reflective Note Modal**.
4. Write your key takeaways, learnings, or summary. These are permanently attached to your user study profile!
        `,
      },
      {
        id: 'audiobooks',
        title: 'Audiobooks Hub & WaveSurfer',
        summary: 'Custom MP3 chapters, interactive waveforms, LibriVox, and YouTube audiobooks.',
        badge: 'Audio',
        readTime: '4 min read',
        content: `
### Dual-Engine Audiobook Architecture
OrganizeUp provides an audio learning experience powered by WaveSurfer.js and cloud streaming.

Step 1: Uploading & Playing Custom Audiobooks
1. Navigate to **Books** ➔ **+ Add Book** ➔ Select **Audiobook**.
2. Upload multi-track MP3 audio files.
3. Open the audiobook to launch the **WaveSurfer.js Waveform Visualizer**.
4. Click anywhere on the rendered waveform to seek instantly with zero buffer lag (powered by native HTTP 206 Partial Content range requests).
5. Use playback rate controls (0.75x to 2.0x) and switch between chapters seamlessly.

Step 2: Exploring LibriVox Public Domain Classics
1. Go to the **Explore** page and click the **Books** tab.
2. Use the genre filters (History, Philosophy, Fiction, Science) or type a book title in the search bar.
3. Click any LibriVox classic to launch the full chapter audio player.
4. Click **Save Audiobook** to bookmark it directly into your personal Saved Library.

Step 3: Streaming Modern YouTube Audiobooks
1. On the Explore Books tab, switch to **Modern Audiobooks**.
2. Browse curated book summaries and productivity audiobooks.
3. Listen in the persistent audio player modal while continuing to navigate the rest of the application!
        `,
      },
      {
        id: 'courses',
        title: 'Courses & Video Modules',
        summary: 'Multi-module video courses with granular lesson completion tracking.',
        badge: 'Courses',
        readTime: '3 min read',
        content: `
### Structure Complex Video Courses
Organize video courses, bootcamps, and technical lecture series into modular hierarchies.

Step 1: Creating a Course
1. Navigate to the **Courses** page and click **+ Add Course**.
2. Enter the title, instructor, description, and thumbnail cover.
3. Define your **Modules** and individual **Lessons**.

Step 2: Tracking Progress
1. Click into any lesson to start watching.
2. Check off lessons as you complete them.
3. The course dashboard automatically recalculates your animated progress percentage, remaining hours, and estimated completion date.
        `,
      },
      {
        id: 'tools',
        title: 'Tricks & Developer Tools',
        summary: 'Store CLI snippets, cheat sheets, online tools, and productivity tricks.',
        badge: 'Tools',
        readTime: '2 min read',
        content: `
### Developer Cheat Sheets & One-Liners
Never forget a complex Docker command, Git command, or regex pattern again.

Step 1: Adding a Developer Tool or Trick
1. Navigate to **Tools & Tricks** from the sidebar.
2. Click **+ Add Tool**.
3. Choose the category (CLI, Web Development, DevOps, AI, Database).
4. Enter the command or snippet along with a brief explanation and documentation link.

Step 2: Copying Commands in 1-Click
1. Search your tools catalog using the search bar or tag filters.
2. Click the **Copy Code** button on any snippet to copy it directly to your clipboard.
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
        badge: 'Studio',
        readTime: '4 min read',
        content: `
### Distraction-Free Video Learning
YouTube is filled with valuable learning resources, but recommendation algorithms create constant distractions. The YouTube Study Studio isolates the content into a dedicated learning cockpit.

Step 1: Adding a Full Playlist
1. Navigate to **Playlists** in the sidebar.
2. Click **+ Add Playlist**.
3. Paste the URL of any public YouTube playlist (e.g. \`https://www.youtube.com/playlist?list=PL...\`).
4. OrganizeUp automatically fetches the playlist metadata, video titles, durations, and thumbnails.

Step 2: Adding a Single Video
1. In the Playlists page, navigate to the **Single Videos** tab.
2. Click **+ Add Single Video** and paste the video URL.
3. The video is ingested into your library as a standalone learning item with its own dedicated notes workspace!

Step 3: Using the Cinema Player
1. Click on any video episode to launch the **Cinema Player**.
2. The player expands to maximize focus while keeping your notes workspace alongside the video.
        `,
      },
      {
        id: 'yt-notes',
        title: 'Timestamps & Video Notes Workspace',
        summary: 'Capture timestamps and write persistent Markdown notes while watching.',
        badge: 'Interactive',
        readTime: '3 min read',
        content: `
### Interactive Timestamped Notes
OrganizeUp allows you to link your written notes directly to specific moments in the video.

Step 1: Inserting a Timestamp
1. While the video is playing in the Cinema Player, reach a key explanation or diagram.
2. Click the **+ Insert Timestamp** button below the video (or press your designated shortcut).
3. OrganizeUp inserts the exact current playback time (e.g. \`[04:25]\`) directly into your notes editor!

Step 2: Jumping to Timestamps
1. Whenever you review your notes in the future, every timestamp is an interactive clickable button.
2. Click on \`04:25\` — the video player immediately seeks to that exact second!

Step 3: Private Notes Isolation
Every note you take is completely isolated to your account. Even if you clone a public playlist from the Explore page, your personal notes remain 100% private to you.
        `,
      },
      {
        id: 'yt-explore',
        title: 'Explore & Curated Playlists',
        summary: 'Discover curated learning tracks and clone them to your personal library.',
        badge: 'Explore',
        readTime: '3 min read',
        content: `
### Curated Learning Tracks
To maintain quality, only administrators can publish verified curated playlists into the public Explore feed.

Step 1: Browsing Playlists in Explore
1. Go to the **Explore** page and click the **Playlists** tab.
2. Browse through vetted roadmaps covering Web Development, Machine Learning, System Design, and DevOps.

Step 2: Cloning to Your Library
1. Click **Add to Library** on any playlist card.
2. The playlist will be cloned into your personal studio.
3. The cloned playlist starts with a **completely blank, clean notes workspace**, allowing you to write your own private reflections from scratch!
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
        badge: 'Canvas',
        readTime: '4 min read',
        content: `
### Versatile Multi-Purpose Workspaces
Sections are flexible workspaces where you can organize multifaceted projects, study guides, and research wikis.

Step 1: Creating a Custom Section
1. Navigate to **Custom Sections** in the sidebar.
2. Click **+ New Section**.
3. Choose a title, icon, and accent color to distinguish your workspace.

Step 2: Adding Modular Blocks
Inside your Section, you can click **+ Add Block** to add:
- **Markdown Notes**: Rich formatted documentation with headers, bullet points, and tables.
- **Interactive Checklists**: Checkboxes to track project milestones and reading goals.
- **Syntax-Highlighted Code Blocks**: Formatted snippets for JavaScript, Python, Bash, HTML, CSS, and SQL with 1-click copy.
- **File Attachments**: Upload supplementary documents directly to MongoDB GridFS.
        `,
      },
      {
        id: 'kanban',
        title: 'Drag-and-Drop Kanban Boards',
        summary: 'Manage learning roadmaps and study tasks with dnd-kit powered boards.',
        badge: 'Productivity',
        readTime: '3 min read',
        content: `
### Visual Task Management
Keep your learning structured with interactive Kanban boards integrated directly into your sections.

Step 1: Enabling Kanban Board
1. Open any Custom Section.
2. Switch to the **Kanban Board** tab.
3. You will see three columns: **To Do**, **In Progress**, and **Completed**.

Step 2: Managing Task Cards
1. Click **+ Add Task** in any column.
2. Give the card a title, description, and priority level (Low, Medium, High).
3. Drag and drop cards smoothly between columns as you make progress (powered by \`@dnd-kit\`). State is persisted instantly to the database!
        `,
      },
    ],
  },
  {
    id: 'quick-capture',
    title: 'Quick Capture & Media Scrapers',
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
### Frictionless Knowledge Ingestion
Capture valuable articles and videos in seconds without interrupting your workflow.

Step 1: Keyboard Shortcuts Reference
| Shortcut | Action | Scope |
|---|---|---|
| <kbd>Ctrl</kbd> + <kbd>K</kbd> | Open Quick Capture Modal | Global |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd> | Instant Quick Capture | Global |
| <kbd>/</kbd> | Focus Search Bar | Explore & Docs |
| <kbd>Esc</kbd> | Close Modals & Overlays | Global |

Step 2: Ingesting Links
1. Press <kbd>Ctrl</kbd> + <kbd>K</kbd> anywhere in the application.
2. Paste any URL (article, YouTube video, PDF link, social post).
3. OrganizeUp automatically fetches metadata, titles, and thumbnails, saving the item into your **Vault & Captures** library.
        `,
      },
      {
        id: 'social-embeds',
        title: 'Social Video Embeds & Scraper',
        summary: 'Embedded video player support for X, Instagram, Facebook Reels, and YouTube.',
        badge: 'Media',
        readTime: '3 min read',
        content: `
### Rich Embeds for Modern Media
OrganizeUp features a server-side metadata resolver and streaming proxy.

Step 1: Supported Platforms
- **X (Twitter)**: Resolves tweet text, author handle, and embeds video or images.
- **Instagram**: Renders native embed cards for posts, carousels, and Reels.
- **Facebook**: Resolves canonical post URLs using specialized \`facebookexternalhit\` user agents to bypass security walls and embed videos.
- **YouTube**: Displays responsive video embeds with duration and channel details.

Step 2: Streaming Proxy
When external CDNs enforce strict CORS or hotlink protection, OrganizeUp routes media through a secure backend proxy with HTTP Range support for seamless seeking.
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
        badge: 'Bot',
        readTime: '4 min read',
        content: `
### Zero-Friction Chat Ingestion
Never lose an educational PDF, audio file, or article shared in Telegram channels.

Step 1: Link Your Telegram Account
1. Open OrganizeUp and go to **Telegram Inbox** in the sidebar.
2. Click **Connect Telegram**. A unique verification token will be generated (e.g. \`#link-a8f391\`).
3. Click to open **[@OrganizeUpBot](https://t.me/OrganizeUpBot)** in your Telegram app.
4. Send the verification code (e.g. \`#link-a8f391\`) to the bot.
5. The bot will respond with a confirmation message: *"Account linked successfully!"*

Step 2: Forwarding Resources to the Bot
1. Whenever you find a useful message, link, PDF document, or audio file in any Telegram group or channel:
2. Simply **forward the message directly to @OrganizeUpBot**.
3. The bot downloads media attachments to MongoDB GridFS and pushes the resource into your **Telegram Inbox** with unread notification badges.

Step 3: Triaging Your Inbox
1. Inside OrganizeUp, open your **Telegram Inbox**.
2. Preview the forwarded text and media.
3. Click **Convert to Book**, **Convert to Course**, or **Save to Vault** to permanently store the resource!
        `,
      },
      {
        id: 'discord-bot',
        title: 'Discord Context Menu App',
        summary: 'Right-click any Discord message to capture it to OrganizeUp.',
        badge: 'Bot',
        readTime: '3 min read',
        content: `
### One-Click Discord Captures
Turn Discord servers and coding communities into direct learning pipelines.

Step 1: Install the Discord App
OrganizeUp's Discord App supports **User App Install** — install it once to your personal Discord profile, and use it in *any* server or DM without requiring server administrator permissions!

Step 2: Capturing Messages
1. Right-click on any message containing links, code snippets, or attachments.
2. Hover over **Apps** ➔ Click **Save to OrganizeUp**.
3. The bot captures the message author, text, embeds, and attachments, piping them straight into your **Discord Inbox** in OrganizeUp.
        `,
      },
    ],
  },
  {
    id: 'community-admin',
    title: 'Community & Admin Cockpit',
    icon: 'IoGlobeOutline',
    description: 'Explore community content, nested discussions, and administrative operations.',
    items: [
      {
        id: 'community-explore',
        title: 'Explore Hub & Discussions',
        summary: 'Browse community knowledge, upvote resources, and engage in nested discussions.',
        badge: 'Community',
        readTime: '3 min read',
        content: `
### Collaborative Knowledge Sharing
OrganizeUp features a curated public directory where learners share high-yield resources.

Step 1: Browsing by Category
Use the top navigation bar in Explore to filter by:
- **Books**: Public domain and curated text books.
- **Courses**: Community-reviewed video lecture series.
- **Tricks & Tools**: Developer cheat sheets and utility links.
- **Sections**: Curated project wikis and study blueprints.
- **Playlists**: Curated YouTube playlists.

Step 2: Upvoting & Discussions
1. Click the **Upvote (▲)** button on any resource card to boost its visibility.
2. Click the **Comments** icon to open the nested discussion drawer to ask questions or share insights with fellow learners.
        `,
      },
      {
        id: 'admin-cockpit',
        title: 'Admin Operations & Atlas Quota',
        summary: 'Monitor web traffic, operations analytics, and MongoDB Atlas 512MB storage quotas.',
        badge: 'Admin',
        readTime: '4 min read',
        content: `
### Operations Cockpit (Admin Only)
Administrators have access to a real-time operations console at \`/admin\`.

Step 1: MongoDB Atlas 512MB Quota Monitoring
1. The Atlas Storage Gauge calculates real-time disk consumption against the 512MB free tier limit.
2. Displays visual color-coded warnings (Green < 60%, Amber 60-80%, Red > 80%).
3. Inspects GridFS file chunks and database indexes.

Step 2: User Storage Footprint Breakdown
1. The User Management section displays exact storage usage per user.
2. Sort users by storage consumption to identify heavy uploaders.
3. Moderate uploaded files and approve or reject community public submissions.
        `,
      },
      {
        id: 'namecom-setup',
        title: 'Subdomain DNS Guide (docs.organizeup.app)',
        summary: 'How to route docs.organizeup.app to your hosting provider via CNAME.',
        badge: 'DNS',
        readTime: '3 min read',
        content: `
### Subdomain Architecture
OrganizeUp uses subdomain-aware routing in the frontend client. Visitors navigating to \`https://docs.organizeup.app\` automatically see this Documentation Portal as the home view.

Step 1: Configure CNAME on Name.com
1. Log into your [Name.com](https://www.name.com) account.
2. Navigate to **My Domains** ➔ Click **\`organizeup.app\`**.
3. Click **DNS Records** (or Manage DNS).
4. Add a new record:
   - **Type**: \`CNAME\`
   - **Host**: \`docs\`
   - **Answer / Target**: \`cname.vercel-dns.com.\`
   - **TTL**: \`300\`
5. Save the record.

Step 2: Add Subdomain in Vercel
1. Open your **Vercel Project Dashboard**.
2. Go to **Settings** ➔ **Domains**.
3. Enter **\`docs.organizeup.app\`** and click **Add**.
4. Vercel automatically detects the Name.com CNAME record, displays a green checkmark, and issues a free Let's Encrypt SSL certificate!
        `,
      },
    ],
  },
];
