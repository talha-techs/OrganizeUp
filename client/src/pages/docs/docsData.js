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
        summary: 'Understand the core philosophy and learning workflow behind OrganizeUp.',
        badge: 'Core',
        readTime: '3 min read',
        content: `
### What is OrganizeUp?

**OrganizeUp** is a high-performance personal knowledge engine designed for self-learners, researchers, and knowledge workers. It solves the fragmentation problem where valuable learning materials get lost across Telegram channels, Discord servers, YouTube playlists, Google Drives, and browser bookmarks.

### The 6 Core Pillars

1. **Universal Multi-Format Vault**: Collect PDFs, audiobooks with waveforms, Google Drive videos, YouTube playlists, and developer tools in a unified, distraction-free interface.
2. **Instant Capture Pipes**: Capture links and media without opening the app via the **Telegram Bot** (\`@OrganizeUpBot\`) and **Discord Context Menu App**.
3. **Deep Study Workspaces**: High-focus study tools with memory — PDF reading position persistence, video watch progress with reflection prompts, and time-stamped video note taking.
4. **Custom Knowledge Canvas**: Modular workspaces with interactive checklists, code snippets, visual notes, and drag-and-drop Kanban boards.
5. **Intelligent Reminders & Notification Cockpit**: Universal study scheduling, native device notifications, real-time alert chimes, and persistent reminder tracking.
6. **Community Discovery & Roadmap**: Explore curated public resources, vote on top picks, join discussions, and shape future features on the live community roadmap.
        `,
        quickLinks: [
          { label: '5-Minute Quickstart', targetId: 'quickstart' },
          { label: 'Smart Links & Sharing', targetId: 'smart-sharing' },
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
Navigate to [organizeup.app](https://organizeup.app). You can sign up with an email and password or use one-click **Google Sign-In**. Once authenticated, you will arrive at your personalized study cockpit.

Step 2: Add Your First Book or Learning Resource
1. Open the **Books** page from the sidebar navigation.
2. Click the **+ Add Book** button in the top right.
3. Choose your format:
   - **Text Book (PDF)**: Upload a PDF file. OrganizeUp immediately closes the dialog and processes the upload in the background, notifying you when it is ready.
   - **Video Book**: Link a video lecture series or direct video link.
   - **Audiobook**: Upload multi-track audio files or search the LibriVox catalog.
4. Assign categories, tags, and set your reading goals.

Step 3: Ingest Content with Quick Capture & Smart Reminders
Press <kbd>Ctrl</kbd> + <kbd>K</kbd> (or <kbd>Cmd</kbd> + <kbd>K</kbd> on macOS) anywhere inside the app to open the **Quick Capture Modal**.
1. Paste any link, text note, or social media URL to automatically store it in your Vault.
2. Toggle **Remind Me** to pick a quick preset (\`+1 Hour\`, \`Tonight 8 PM\`, \`Tomorrow 9 AM\`, \`In 2 Days\`) or set a custom study time.
3. Add an optional reminder note (e.g., *"Review chapter 4 and write summary"*).

Step 4: Track Due Items on the Dashboard
Your Dashboard displays your study cockpit, upcoming and due reminders sorted from earliest to latest, reading streaks, and quick resume links.

Step 5: Explore Curated Community Knowledge
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
        id: 'smart-sharing',
        title: '1-Click Sharing & Smart Links',
        summary: 'Share books, courses, videos, and workspaces with automatic onboarding for friends.',
        badge: 'Sharing',
        readTime: '3 min read',
        content: `
### Frictionless Resource Sharing

OrganizeUp makes sharing knowledge completely frictionless. You can share any public book, course, video, or workspace with friends, study groups, or colleagues with a single click.

Step 1: Sharing with One Click
1. Look for the **Share** button in the top action bar of any **Book**, **Course**, **YouTube Video**, or **Workspace**.
2. Click **Share** to automatically copy the clean link to your clipboard, or trigger your device's native sharing sheet on mobile.
3. Paste and send the link in WhatsApp, Discord, Slack, Telegram, or email.

Step 2: Smart Onboarding for Unregistered Friends
What happens when you send a link to a friend who does not have an OrganizeUp account yet?
1. When your friend opens the link, OrganizeUp welcomes them with a dedicated preview badge: *"👋 You've been shared a resource!"*
2. It prompts them for a quick, 10-second free signup (or 1-click Google Sign-In).
3. **Automatic Redirection**: As soon as they sign up, OrganizeUp **automatically redirects them directly to the opened resource**!
4. They never lose their place, never have to search for the book again, and can start reading immediately!

Step 3: Team Collaboration in Workspaces
When inviting team members to a collaborative Workspace:
- Assign specific roles: **Can edit** (collaborate, add blocks, check items) or **Can view** (read-only observer).
- Team members can access the workspace immediately through their invite link or dashboard notification.
        `,
        callouts: [
          {
            type: 'tip',
            title: 'Smart Deep Linking',
            text: 'Shared links remember the user’s intended destination through registration or login, ensuring smooth transitions without losing content.',
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
OrganizeUp is built as a modern progressive web app with instant loading, asset caching, and native OS integration.

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
        summary: 'Background uploads, PDF page memory, Quote to Notes, and collapsible study notes.',
        badge: 'Feature',
        readTime: '5 min read',
        content: `
### Reading Without Losing Your Place
OrganizeUp features a specialized reading engine designed for textbooks, academic papers, and technical books.

Step 1: Background Uploads with Instant Modal Close
1. When creating or uploading a new book, select **Text Book (PDF)** and choose your document.
2. Click **Save Book** — the dialog **instantly closes** so you can continue studying without staring at a loading bar!
3. The upload runs smoothly in the background while you navigate freely.
4. When finished, a notification toast appears and chimes to let you know your book is ready in your library.

Step 2: Reading Textbooks with Position Memory
1. Open any PDF book from your library.
2. Read at your own pace — zoom in, navigate pages, or enter fullscreen mode.
3. As you read, OrganizeUp **automatically remembers your exact page number**.
4. When you return days later on any device, the reader automatically resumes on your exact last read page!

Step 3: Interactive Text Highlighting & "Quote to Notes"
1. While reading any textbook, highlight any sentence or paragraph with your mouse or touch cursor.
2. A floating **Quote to Notes** button appears above your selection.
3. Click it to instantly append the quote to your personal study notes, complete with the page number reference (e.g. \`> "Quoted text..." (Page 42)\`).
4. Build comprehensive study summaries without switching windows or typing manually!

Step 4: Collapsible Notes Drawer & Focus Mode
1. Click the **Notes** button in the header toolbar to toggle your study notes drawer open or closed.
2. Closing notes expands the PDF viewer to full screen width for deep reading immersion.
3. Opening notes splits your view so you can read and write simultaneously.

Step 5: Video Books & Reflection Prompts
1. Add a Video Book by linking a video lecture or lecture series.
2. Watch lectures in the embedded player. Progress is tracked incrementally.
3. When the video reaches **100% completion**, OrganizeUp automatically triggers a **Reflective Note Modal**.
4. Write your key takeaways or summary, permanently attached to your study profile!

Step 6: Sharing Books
Click the **Share** button in the top action bar to copy the book link or share directly with friends.
        `,
        callouts: [
          {
            type: 'tip',
            title: 'Quote to Notes',
            text: 'Highlight any text while reading a PDF and click "Quote to Notes" to cite key points directly into your markdown notes with automatic page references!',
          },
        ],
      },
      {
        id: 'audiobooks',
        title: 'Audiobooks Hub & Waveforms',
        summary: 'Interactive waveforms, chapter navigation, LibriVox classics, and modern audiobooks.',
        badge: 'Audio',
        readTime: '4 min read',
        content: `
### Smooth Audiobook Player
OrganizeUp provides a streamlined audio learning experience with real-time waveform visualization and chapter playback.

Step 1: Uploading & Playing Custom Audiobooks
1. Navigate to **Books** ➔ **+ Add Book** ➔ Select **Audiobook**.
2. Upload multi-track audio files with custom chapter titles.
3. Open the audiobook to launch the interactive waveform player.
4. Click anywhere on the rendered waveform to jump directly to that point with zero delay.
5. Use playback rate controls (0.75x to 2.0x) and switch between chapters seamlessly.

Step 2: Exploring LibriVox Public Domain Classics
1. Go to the **Explore** page and click the **Books** tab.
2. Use the genre filters (History, Philosophy, Fiction, Science) or type a book title in the search bar.
3. Click any LibriVox classic to launch the full chapter audio player.
4. Click **Save Audiobook** to bookmark it directly into your personal Saved Library.

Step 3: Streaming Modern Curated Audiobooks
1. On the Explore Books tab, switch to **Modern Audiobooks**.
2. Browse curated book summaries and productivity audiobooks.
3. Listen in the persistent audio player while continuing to navigate the rest of the application!
        `,
      },
      {
        id: 'courses',
        title: 'Courses & Google Drive Import',
        summary: 'Multi-module video courses, Google Drive folder import, and lesson tracking.',
        badge: 'Courses',
        readTime: '4 min read',
        content: `
### Structure Complex Video Courses
Organize video courses, bootcamps, and technical lecture series into modular hierarchies.

Step 1: One-Click Google Drive Folder Scanner & Import
1. Navigate to **Courses** and click **Import from Drive** or click **+ Add Course**.
2. Paste the link to any shared Google Drive folder containing course materials.
3. OrganizeUp scans the folder structure, detects subfolders, videos, and PDFs, and automatically builds your course curriculum with zero manual entry!

Step 2: Manual Course Creation
1. Click **+ Add Course**.
2. Enter the title, instructor, description, and thumbnail cover.
3. Define custom **Categories** (with automatic cover imagery) and organize your lessons.

Step 3: Tracking Progress & Completion
1. Click into any lesson to start watching or reading.
2. Check off lessons as you complete them.
3. The course dashboard automatically recalculates your animated progress percentage, remaining hours, and estimated completion date.
4. Share the course link with classmates using the header **Share** button!
        `,
        callouts: [
          {
            type: 'tip',
            title: 'Drive Import Tip',
            text: 'Save hours of manual data entry by using the Drive folder importer to automatically structure entire course playlists into modules and lessons.',
          },
        ],
      },
      {
        id: 'tools',
        title: 'Tricks & Developer Tools',
        summary: 'Store CLI snippets, cheat sheets, online tools, and productivity tricks.',
        badge: 'Tools',
        readTime: '2 min read',
        content: `
### Developer Cheat Sheets & One-Liners
Never forget a complex command, shorthand shortcut, or regex pattern again.

Step 1: Adding a Developer Tool or Trick
1. Navigate to **Tools & Tricks** from the sidebar.
2. Click **+ Add Tool**.
3. Choose the category (CLI, Web Development, DevOps, AI, Database).
4. Enter the command or snippet along with a brief explanation and documentation link.

Step 2: Copying Commands & Quick Links
1. Search your tools catalog using the search bar or tag filters.
2. Click the **Copy Code** button on any snippet to copy it directly to your clipboard.
3. Click **View Tool** for external reference documentation.
4. Tool cards provide a clean layout focused entirely on rapid command retrieval.
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
        summary: 'Cinema player mode, isolated user notes, single video workspaces, and 1-click sharing.',
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
4. **Optimized Interface**: Standalone single videos omit redundant sync controls for an uncluttered focus view.
5. **Full Auto-Linkified Description**: The video's complete YouTube description is parsed and displayed beneath the player. All URLs are rendered as safe, openable links, and timestamps (e.g. \`04:15\`) are highlighted.

Step 3: Adaptive Video Resolution
1. OrganizeUp smartly defaults playback resolution to a fast, bandwidth-friendly quality (720p or 480p).
2. Use the resolution dropdown to switch to higher or lower available resolutions up to the maximum quality supported by that video.

Step 4: Using the Cinema Player
1. Click on any video episode to launch the **Cinema Player**.
2. The player expands to maximize visual focus while keeping your interactive notes workspace alongside the video.

Step 5: Scheduling Video Reminders & Sharing
1. Never leave a series unfinished. Click the 3-dots menu on any playlist card and select **Set Reminder**, or click the **Reminder** button in the top right of the Cinema player header.
2. Share any playlist or standalone video with study partners using the header **Share** button.
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
   - **Expand up to 50%**: Creates an equal 50/50 side-by-side split — perfect for code replication, math notations, or in-depth synthesis.
   - **Minimize down to 25%**: Keeps a compact, unobtrusive note pane while giving maximum screen real estate to the video.
4. **Layout Memory**: Your chosen width is automatically remembered across all videos.
        `,
        callouts: [
          {
            type: 'tip',
            title: 'Side-by-Side 50/50 Study Cockpit',
            text: 'Drag the left border of the notes panel towards the center of your screen to enjoy an equal 50/50 split between video and notes. Your preference is automatically remembered for all future study sessions.',
          },
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
    title: 'Workspaces & Modular Canvas',
    icon: 'IoFolderOutline',
    description: 'Collaborative workspaces, live co-editing, smart clipboard ingestion, and custom block view preferences.',
    items: [
      {
        id: 'sections',
        title: 'Workspaces & Modular Blocks',
        summary: 'Build real-time collaborative workspaces with live co-editing, smart clipboard ingestion, notes, checklists, code, and default view preferences.',
        badge: 'Workspaces',
        readTime: '5 min read',
        content: `
### Collaborative Project Workspaces
Workspaces are flexible multi-user hubs where you and your team can organize multifaceted projects, research wikis, sprint roadmaps, and code snippets together.

Step 1: Creating a Workspace
1. Navigate to **Workspaces** in the sidebar.
2. Click **+ New Workspace**.
3. Choose a title, icon, and accent color to distinguish your workspace.

Step 2: Default Block Expansion Preference
Customize how your workspace blocks load when you open any workspace:
1. In the workspace header toolbar, locate the **Expanded by default / Collapsed by default** checkmark control.
2. Click the checkmark to toggle between:
   - **Expanded by default**: Automatically opens all notes, checklists, and code blocks ready to read.
   - **Collapsed by default**: Shows compact, tidy block headers for quick visual scanning of large workspaces.
3. Your setting is saved to your user profile and automatically applies across all workspaces!

Step 3: Modular Content Blocks
Inside your Workspace canvas, click **+ Add Block** to add any content type:
- **Markdown Notes**: Rich formatted documentation with headers, bullet points, and tables.
- **Interactive Checklists**: Checkboxes to track project milestones, bug lists, and reading targets.
- **Syntax-Highlighted Code Blocks**: Formatted snippets for JavaScript, Python, Bash, HTML, CSS, SQL, Rust, Go, and JSON with 1-click copy.
- **Image Galleries**: High-resolution image blocks to save diagrams, concept maps, and charts.
- **Web Bookmark Links**: Ingest URL links with domain previews and favicons.
- **File Attachments**: Upload supplementary documents directly to your workspace.

Step 4: Smart Multimodal Clipboard Ingestion (<kbd>Ctrl</kbd> + <kbd>V</kbd>)
Never slow down to configure block types manually. Press <kbd>Ctrl</kbd> + <kbd>V</kbd> anywhere on the workspace canvas:
1. **Screenshots & Images**: Paste directly from the Snipping Tool, <kbd>Win</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd>, or browser clipboard. OrganizeUp automatically creates a dedicated Image block.
2. **Note-Adjacent Image Insertion**: If you paste an image while actively editing a Note block, OrganizeUp automatically inserts the new Image block directly underneath the active note instead of placing it at the bottom of the canvas!
3. **Task Lists & Bullet Points**: Pasting multiline text formatted with dashes, bullet points, numbers, or \`- [ ]\` checkboxes automatically parses and creates an Interactive Checklist.
4. **Code Snippets**: Automatically detects code syntax and creates a syntax-highlighted Code block.
5. **Web URLs**: Pasting any link creates a Bookmark Link block with favicon and domain preview.
6. **Smart-Paste Notification with Undo**: A floating badge confirms the ingested block type with an instant 1-click **Undo** button to revert if needed.

Step 5: Real-Time Team Collaboration & Presence
Experience seamless synchronous collaboration with your team:
- **Granular Roles**: Invite team members via direct email or invite link with roles: *Owner*, *Editor*, *Viewer*.
- **Live Presence Tracking**: Emerald presence pills and live collaborator avatars display who is actively in the workspace.
- **Visual Block Focus**: Glowing colored borders and floating badges indicate what block a teammate is editing, proactively preventing overlap.
- **Instant Live Sync**: Notes, task status, board cards, and code snippets update instantly across all open screens without needing to refresh.
- **Conflict Resolver**: Side-by-side visual comparison to easily review or merge edits if teammates edit at the same moment.

Step 6: Workspace Banners & Cover Discovery
Personalize your workspace with a hero header banner:
1. Click **Change Banner** in the workspace header.
2. Select your preferred banner source:
   - **Upload Custom File**: Upload personal PNG, JPG, or WebP images from your device.
   - **Web Image Address**: Paste any direct public image URL.
   - **Auto-Discovery Cover Photos**: OrganizeUp automatically suggests high-definition covers matching your workspace title, or applies stylish gradient themes.
        `,
        callouts: [
          {
            type: 'tip',
            title: 'Default Block View Toggle',
            text: 'Prefer your blocks collapsed for an executive overview or expanded for deep reading? Click the checkmark in the workspace header toolbar to set your global default preference.',
          },
        ],
        quickLinks: [
          { label: 'Drag-and-Drop Kanban Boards', targetId: 'kanban' },
          { label: 'Smart Links & Sharing', targetId: 'smart-sharing' },
          { label: 'Global Shortcuts', targetId: 'shortcuts' },
        ],
      },
      {
        id: 'kanban',
        title: 'Drag-and-Drop Kanban Boards',
        summary: 'Manage learning roadmaps and study tasks with interactive visual boards.',
        badge: 'Productivity',
        readTime: '3 min read',
        content: `
### Visual Task Management
Keep your learning structured with interactive Kanban boards integrated directly into your workspaces.

Step 1: Enabling Kanban Board
1. Open any Workspace.
2. Switch to the **Kanban Board** tab.
3. You will see three columns: **To Do**, **In Progress**, and **Completed**.

Step 2: Managing Task Cards
1. Click **+ Add Task** in any column.
2. Give the card a title, description, and priority level (Low, Medium, High).
3. Drag and drop cards smoothly between columns as you make progress. Your board updates instantly and saves automatically!
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
| <kbd>Ctrl</kbd> + <kbd>V</kbd> | Smart Multimodal Clipboard Ingestion | Workspace Canvas |
| <kbd>/</kbd> | Focus Search Bar | Explore & Docs |
| <kbd>Esc</kbd> | Close Modals & Overlays | Global |

Step 2: Smart Clipboard Ingestion in Workspaces
Press <kbd>Ctrl</kbd> + <kbd>V</kbd> inside any Workspace to automatically classify and insert screenshots, multi-line checklists, code snippets, links, or notes without clicking any menus.

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
- **X (Twitter)**: Clean embeds for posts, articles, and video clips.
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
    id: 'reminders-notifications',
    title: 'Smart Reminders & Notifications',
    icon: 'IoNotificationsOutline',
    description: 'Schedule study reminders, receive real-time audio-visual alerts, and manage tasks from the central notification drawer.',
    items: [
      {
        id: 'vault-reminders',
        title: 'Vault & Captures Reminders',
        summary: 'Schedule study reminders for captured resources with quick presets, custom dates, and contextual notes.',
        badge: 'Reminders',
        readTime: '4 min read',
        content: `
### Frictionless Study Reminders
Never let a saved article, tutorial, or resource slip through the cracks. OrganizeUp includes an intelligent reminder scheduler built directly into your knowledge pipeline.

Step 1: Scheduling When Capturing (<kbd>Ctrl</kbd> + <kbd>K</kbd>)
1. Press <kbd>Ctrl</kbd> + <kbd>K</kbd> anywhere in OrganizeUp.
2. Paste a URL or type a note.
3. Toggle the **Remind Me** switch.
4. Choose from one of the **Quick Presets**:
   - **+1 Hour**: Perfect for a short break or next focus block.
   - **Tonight (8 PM)**: Ideal for evening reading.
   - **Tomorrow (9 AM)**: Great for starting tomorrow's study session.
   - **In 2 Days**: Ideal for spaced repetition.
5. Or pick a **Custom Date & Time** using the built-in calendar picker.
6. Add an optional reminder note (e.g. *"Read section 2 and test in code sandbox"*).

Step 2: Scheduling from the Vault & Captures Page
1. Open **Vault & Captures** from the sidebar.
2. Every uncompleted capture card includes an active reminder badge or a **Set Reminder** action.
3. Click the reminder button to modify, update, or clear the scheduled time.

Step 3: Chronological Sorting & Due Counters
1. **Earliest to Farthest**: On both your Dashboard cockpit and the Vault & Captures page, all reminders are sorted chronologically from earliest/overdue to far future.
2. **Reminders Due Counter**: The "Reminders Due" stat card on your Captures page dynamically tracks overdue and due captures in real time.
3. **Overdue Badges**: Overdue items glow with an alert indicator, ensuring high-priority items never get missed.
        `,
        callouts: [
          {
            type: 'tip',
            title: 'Spaced Repetition Presets',
            text: 'Use the "+1 Hour", "Tonight", and "Tomorrow" presets to queue up reading materials without ever touching a date-picker.',
          },
        ],
        quickLinks: [
          { label: 'YouTube Study Reminders', targetId: 'youtube-reminders' },
          { label: 'Central Notifications Drawer', targetId: 'notifications-center' },
        ],
      },
      {
        id: 'youtube-reminders',
        title: 'YouTube Study Reminders',
        summary: 'Schedule study sessions for playlists and standalone videos directly from cards or player headers.',
        badge: 'YouTube',
        readTime: '3 min read',
        content: `
### Keep Long Video Series on Track
Online course playlists and multi-hour tech tutorials often go unfinished. OrganizeUp brings dedicated study alarms to your YouTube learning experience.

Step 1: Setting a Reminder on Playlists & Single Videos
1. Navigate to **Playlists** from the sidebar.
2. On any playlist or single video card, click the three-dots action menu and choose **Set Reminder**.
3. Alternatively, when watching inside the **Cinema Player**, click the **Reminder** button in the top right actions bar!

Step 2: Selecting Date & Presets
1. Select from the quick presets (\`+1 Hour\`, \`Tonight\`, \`Tomorrow\`, \`In 2 Days\`) or select a custom date/time.
2. Add custom study targets in the optional note field.
3. Click **Save Reminder**.

Step 3: Active Card Badges & Resumption
1. Cards with active reminders display an illuminated reminder pill with the scheduled date and time.
2. Overdue videos feature an alert red badge with *"Due"* status.
3. Clicking on the notification automatically brings you right into the Cinema Player with your isolated notes workspace ready to go.
        `,
        quickLinks: [
          { label: 'Central Notifications Drawer', targetId: 'notifications-center' },
          { label: 'Playlists & Single Videos', targetId: 'yt-overview' },
        ],
      },
      {
        id: 'notifications-center',
        title: 'Notifications Drawer & Desktop Alerts',
        summary: 'High-contrast notification panel, filter tabs (All, Due, Upcoming), audio chimes, and native browser OS alerts.',
        badge: 'Alerts',
        readTime: '4 min read',
        content: `
### Real-Time Alerts & Notification Center
OrganizeUp features a unified notification center that ensures you never miss a study deadline across all your devices.

Step 1: The Central Notifications Drawer
1. Click the **Notification Bell** in the sidebar (or top right on mobile).
2. The high-contrast drawer opens instantly above your workspace without backdrop clipping.
3. The pulsating red badge indicates the number of active due reminders.

Step 2: Smart Filter Tabs
1. **All**: View all recent notifications, background upload completions, and reminders in one stream.
2. **Reminders Due**: Dedicated filter displaying all pending and overdue reminders with priority borders.
3. **Upcoming**: Preview your scheduled study calendar for the next few days.

Step 3: Native Desktop & Audio Alerts
1. OrganizeUp integrates with native system notifications to deliver alerts even when the browser window is minimized or in the background.
2. Includes a pleasant study chime audio alert when a reminder fires or when a background upload completes.
3. Click **Enable / Test Alert** inside the notifications drawer to test your system permissions with one click!

Step 4: Inline Actions on Cards
Each notification card allows immediate action:
- **Mark Done**: Mark the capture or study session as completed in 1 click.
- **Snooze 1h**: Temporarily postpone the alert by 1 hour.
- **Open Resource**: Click directly into the video player, book reader, article link, or workspace.
        `,
        callouts: [
          {
            type: 'info',
            title: 'Cross-Device Synchronization',
            text: 'Reminders sync continuously across all your devices and open tabs, ensuring alerts ring on time wherever you are studying.',
          },
        ],
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
3. The bot securely saves attachments and pushes the resource into your **Telegram Inbox** with unread notification badges.

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
    title: 'Community & Feedback',
    icon: 'IoGlobeOutline',
    description: 'Explore community content, vote on top resources, and submit feature requests.',
    items: [
      {
        id: 'community-explore',
        title: 'Explore Hub & Discussions',
        summary: 'Browse community knowledge, vote on resources, and engage in discussions.',
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
- **Workspaces**: Curated project wikis, team spaces, and study blueprints.
- **Playlists**: Curated YouTube playlists.

Step 2: Upvoting & Discussions
1. View separate **Upvote (▲)** and **Downvote (▼)** tallies on every card for transparent community feedback.
2. Click the **Comments** icon to open the discussion drawer to ask questions or share insights.
3. Click **Add to Library** on any public resource to bookmark or clone it into your own workspace!

Step 3: Personal Focus vs. Community Discovery
OrganizeUp intentionally separates personal study focus from community collaboration:
- **Personal Libraries (Books, Courses, Tools)**: Kept distraction-free with zero comment counter clutter, letting you read, practice, and code with deep focus.
- **Explore Hub**: The central social space where learners discuss, vote, review, and exchange feedback on shared resources.
        `,
      },
      {
        id: 'suggestions',
        title: 'Feature Suggestions & Live Roadmap',
        summary: 'Propose new features, upvote community ideas, and track implementation on the live roadmap.',
        badge: 'Roadmap',
        readTime: '3 min read',
        content: `
### Shape the Future of OrganizeUp
Have an idea for a new feature, a workflow tweak, or a new integration? The built-in **Suggestions** portal connects learners directly to the platform roadmap.

Step 1: Submitting a Feature Suggestion
1. Navigate to **Suggestions** from the sidebar navigation.
2. Click **+ Suggest a Feature**.
3. Give your idea a concise title.
4. Select the target area:
   - **Workspaces & Blocks**
   - **Book Reader**
   - **Courses & Drive**
   - **Vault Captures**
   - **Telegram / Discord Inboxes**
   - **Explore Hub**
   - **Tools & Tricks**
   - **General UX / Mobile**
5. Clearly describe the problem and your suggested improvement, then choose an impact level (*Nice to Have*, *Helpful Improvement*, or *Critical Need*).
6. Click **Submit Suggestion**.

Step 2: Community Upvoting & Feedback
1. Browse feature suggestions submitted by other learners.
2. Filter by module or search by keywords.
3. Upvote ideas you want to see built to increase their priority on the roadmap!

Step 3: Tracking the Interactive Roadmap
Every suggestion progresses through clear, transparent status columns:
- **Pending Review**: Newly submitted idea awaiting initial review.
- **Under Consideration**: Team is actively designing and evaluating the workflow.
- **Planned for Roadmap**: Approved and queued for upcoming release.
- **Shipped & Implemented**: Feature is live in the application!
        `,
        callouts: [
          {
            type: 'tip',
            title: 'Live Product Roadmap',
            text: 'Track feature ideas as they move from community proposal to "Shipped & Implemented". Every user can contribute to the evolution of OrganizeUp!',
          },
        ],
      },
    ],
  },
];
