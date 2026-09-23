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
        summary: 'Cinema player mode, isolated user notes, responsive resolution, and single video workspaces.',
        badge: 'Studio',
        readTime: '4 min read',
        content: `
### Distraction-Free Video Learning
YouTube is filled with valuable learning resources, but recommendation algorithms create constant distractions. The YouTube Study Studio isolates the content into a dedicated learning cockpit.

Step 1: Adding a Full Playlist
1. Navigate to **Playlists** in the sidebar.
2. Click **+ Add Playlist**.
3. Paste the URL of any public YouTube playlist (e.g. \`https://www.youtube.com/playlist?list=PL...\`).
4. OrganizeUp automatically fetches playlist metadata, video titles, durations, and high-res thumbnails.
5. In playlists, use the **Sync** button at any time to automatically poll and ingest newly added episodes from YouTube.

Step 2: Dedicated Single Video Workspaces
1. In the Playlists page, switch to the **Single Videos** tab.
2. Click **+ Add Single Video** and paste any YouTube video URL.
3. The video is ingested into your library as a standalone learning item with its own dedicated notes workspace.
4. **Optimized Interface**: Unlike multi-episode playlists, single videos omit redundant sync controls for an uncluttered focus view.
5. **Full Auto-Linkified Description**: The video's complete YouTube description is parsed and displayed beneath the player. All URLs are rendered as safe, openable links (opening in new tabs), and timestamps (e.g. \`04:15\`) are highlighted. Toggle the expandable description drawer at any time.

Step 3: Adaptive Video Resolution
1. OrganizeUp smartly defaults playback resolution to a fast, bandwidth-friendly quality (720p or 480p).
2. Use the resolution dropdown to switch to higher or lower available resolutions up to the maximum quality supported by that video.

Step 4: Using the Cinema Player
1. Click on any video episode to launch the **Cinema Player**.
2. The player expands to maximize visual focus while keeping your interactive notes workspace alongside the video.
        `,
        callouts: [
          {
            type: 'info',
            title: 'Playlist Sync vs. Single Videos',
            text: 'Multi-video playlists include an active "Sync" button to poll YouTube for new episodes. Standalone single videos are individual assets, so sync controls are omitted to preserve a clean, focused UI.',
          },
        ],
        quickLinks: [
          { label: 'Timestamps & Video Notes Workspace', targetId: 'yt-notes' },
          { label: 'Global Shortcuts', targetId: 'shortcuts' },
        ],
      },
      {
        id: 'yt-notes',
        title: 'Timestamps & Video Notes Workspace',
        summary: 'Capture timestamps, write persistent Markdown notes, and drag-to-resize the split screen.',
        badge: 'Interactive',
        readTime: '4 min read',
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

Step 4: Draggable & Resizable Split Notes Panel
1. Customize your viewing split between the video player and your notes editor.
2. Hover your mouse over the **left edge** of the notes workspace until the resize cursor (<kbd>col-resize</kbd>) appears.
3. Click and drag horizontally:
   - **Expand up to 50%**: Creates an equal 50/50 side-by-side split — perfect for side-by-side code replication, math notations, or in-depth synthesis.
   - **Minimize down to 25%**: Keeps a compact, unobtrusive note pane while giving maximum screen real estate to the video.
4. **Drag Shield Protection**: While dragging, an invisible protection layer engages over the YouTube iframe to prevent video player mouse capture and ensure buttery smooth resizing.
5. **Persistent Layout Memory**: Your chosen width is automatically stored in browser storage and remembered across all videos.
        `,
        callouts: [
          {
            type: 'tip',
            title: 'Side-by-Side 50/50 Study Cockpit',
            text: 'Drag the left border of the notes panel towards the center of your screen to enjoy an equal 50/50 split between video and notes. Your preference is automatically remembered for all future study sessions.',
          },
        ],
        quickLinks: [
          { label: 'Playlists & Single Videos', targetId: 'yt-overview' },
          { label: 'Global Shortcuts', targetId: 'shortcuts' },
        ],
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
        summary: 'Build project hubs with Smart Clipboard ingestion, Markdown notes, checklists, code, and banners.',
        badge: 'Canvas',
        readTime: '5 min read',
        content: `
### Versatile Multi-Purpose Workspaces
Sections are flexible workspaces where you can organize multifaceted projects, study guides, technical cheat sheets, and research wikis.

Step 1: Creating a Custom Section
1. Navigate to **Custom Sections** in the sidebar.
2. Click **+ New Section**.
3. Choose a title, icon, and accent color to distinguish your workspace.

Step 2: Modular Content Blocks
Inside your Section canvas, click **+ Add Block** to add any content type:
- **Markdown Notes**: Rich formatted documentation with headers, bullet points, and tables.
- **Interactive Checklists**: Checkboxes to track project milestones, bug lists, and reading targets.
- **Syntax-Highlighted Code Blocks**: Formatted snippets for JavaScript, Python, Bash, HTML, CSS, SQL, Rust, Go, and JSON with 1-click copy.
- **Image Galleries**: High-resolution image blocks with GridFS cloud persistence.
- **Web Bookmark Links**: Ingest URL links with domain previews and favicons.
- **File Attachments**: Upload supplementary documents directly to your private cloud storage.

Step 3: Smart Multimodal Clipboard Ingestion (<kbd>Ctrl</kbd> + <kbd>V</kbd>)
Never slow down to configure block types manually. Press <kbd>Ctrl</kbd> + <kbd>V</kbd> anywhere on the canvas:
1. **Screenshots & Images**: Paste directly from the Snipping Tool, <kbd>Win</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd>, or browser clipboard. OrganizeUp uploads the image to MongoDB GridFS and creates a dedicated Image block automatically.
2. **Note-Adjacent Image Insertion**: If you paste an image while actively editing a Note block, OrganizeUp automatically inserts the new Image block directly underneath the active note instead of placing it at the bottom of the canvas!
3. **Task Lists & Bullet Points**: Pasting multiline text formatted with dashes, bullet points, numbers, or \`- [ ]\` checkboxes automatically parses and creates an Interactive Checklist.
4. **Code Snippets**: Automatically detects code syntax (JavaScript, TypeScript, Python, HTML, CSS, SQL, Rust, Go, Shell, JSON) and creates a syntax-highlighted Code block.
5. **Web URLs**: Pasting any link creates a Bookmark Link block with favicon and domain preview.
6. **Smart-Paste Notification with Undo**: A floating badge confirms the ingested block type with an instant 1-click **Undo** button to revert if needed.

Step 4: In-Block Pasting & Drag-and-Drop
- **Checklist Blocks**: Paste multi-line text directly into a Todo block to bulk-add multiple items in a single action.
- **Image Blocks**: Drag and drop image files directly onto the drop zone or paste images directly into the block.

Step 5: Custom Section Banners & Pexels Discovery
Personalize your section workspace with a hero header banner displayed on the section page and across the Sections gallery cards:
1. Click **Change Banner** in the section header.
2. Select your preferred banner source:
   - **Upload Custom File**: Upload personal PNG, JPG, or WebP images directly to MongoDB GridFS.
   - **Web Image Address**: Paste any direct public image URL.
   - **Auto-Discovery via Pexels API**: When \`PEXELS_API_KEY\` is configured, OrganizeUp automatically searches and suggests high-definition royalty-free covers matching your section title, complete with sleek gradient fallbacks.
3. Update or remove the banner at any time.
        `,
        callouts: [
          {
            type: 'tip',
            title: 'Instant Screenshot Ingestion',
            text: 'Capture any diagram or code snippet with Win+Shift+S (or Cmd+Shift+4) and hit Ctrl+V in your Custom Section. If you are typing inside a Note block, the screenshot will conveniently appear right below your note!',
          },
        ],
        quickLinks: [
          { label: 'Drag-and-Drop Kanban Boards', targetId: 'kanban' },
          { label: 'Global Shortcuts & Fast Ingestion', targetId: 'shortcuts' },
        ],
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
        summary: 'Use keyboard shortcuts anywhere to capture thoughts, media, and links.',
        badge: 'Shortcuts',
        readTime: '3 min read',
        content: `
### Frictionless Knowledge Ingestion
Capture valuable articles, videos, and screenshots in seconds without interrupting your workflow.

Step 1: Keyboard Shortcuts Reference
| Shortcut | Action | Scope |
|---|---|---|
| <kbd>Ctrl</kbd> + <kbd>K</kbd> | Open Quick Capture Modal | Global |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd> | Instant Quick Capture | Global |
| <kbd>Ctrl</kbd> + <kbd>V</kbd> | Smart Multimodal Clipboard Ingestion | Custom Sections Canvas |
| <kbd>/</kbd> | Focus Search Bar | Explore & Docs |
| <kbd>Esc</kbd> | Close Modals & Overlays | Global |

Step 2: Smart Clipboard Ingestion in Sections
Press <kbd>Ctrl</kbd> + <kbd>V</kbd> inside any Custom Section to automatically classify and insert screenshots, multi-line checklists, code snippets, links, or notes without clicking any menus.

Step 3: Quick Capture Anywhere
1. Press <kbd>Ctrl</kbd> + <kbd>K</kbd> anywhere in the application.
2. Paste any URL (article, YouTube video, PDF link, social post).
3. OrganizeUp automatically fetches metadata, titles, and thumbnails, saving the item into your **Vault & Captures** library.
        `,
        callouts: [
          {
            type: 'tip',
            title: 'Fast Navigation Tip',
            text: 'Press "/" from anywhere in Explore or Docs to immediately jump your focus to the search bar.',
          },
        ],
      },
      {
        id: 'social-embeds',
        title: 'Social Video Embeds & Media',
        summary: 'Embedded video player support for X, Instagram, Facebook Reels, and YouTube.',
        badge: 'Media',
        readTime: '3 min read',
        content: `
### Rich Embeds for Modern Media

OrganizeUp automatically renders rich, interactive video players for your saved social links.

Step 1: Supported Platforms
- **X (Twitter)**: Clean embeds for tweets, articles, and video clips.
- **Instagram**: Native player cards for posts and Reels.
- **Facebook**: Embeds public videos and Facebook Reels directly in your Vault.
- **YouTube**: Displays responsive video embeds with duration and channel details.

Step 2: Distraction-Free Playback
Watch and study captured videos directly inside your Vault without getting pulled into algorithmic social media feeds.
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
3. The bot securely saves media attachments to your private vault and pushes the resource into your **Telegram Inbox** with unread notification badges.

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
    id: 'community',
    title: 'Community & Explore',
    icon: 'IoGlobeOutline',
    description: 'Explore community content, vote on top resources, and join nested discussions.',
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
- **Books**: Public domain audiobooks and curated textbooks.
- **Courses**: Community-reviewed video lecture series.
- **Tricks & Tools**: Developer cheat sheets and utility links.
- **Sections**: Curated project wikis and study blueprints.
- **Playlists**: Curated YouTube playlists.

Step 2: Upvoting & Discussions
1. Click the **Upvote (▲)** button on any resource card to boost its visibility for other learners.
2. Click the **Comments** icon to open the discussion drawer to ask questions or share insights.
3. Click **Add to Library** on any public resource to bookmark or clone it into your own workspace!
        `,
      },
    ],
  },
];
