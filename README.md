<h1 align="center">
  <br />
  📚 OrganizeUp
  <br />
</h1>

<p align="center">
  <b>Your personal knowledge hub — organize books, courses, tools, and learning resources all in one place.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Stack-MERN-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Database-MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/State-Redux%20Toolkit-764ABC?style=for-the-badge&logo=redux&logoColor=white" />
  <img src="https://img.shields.io/badge/Styling-Tailwind%20CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Auth-JWT%20%2B%20Google%20OAuth-orange?style=for-the-badge&logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/Files-GridFS%20%2B%20Cloudinary-4285F4?style=for-the-badge&logo=cloudinary&logoColor=white" />
  <img src="https://img.shields.io/badge/Deploy-Render%20%2B%20Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" />
</p>

---

## 🧩 The Problem

Saving free learning resources shouldn't be this hard. You find a great PDF on Telegram, a video course on Google Drive, a killer dev tool shared in a WhatsApp group — and within a week, it's buried somewhere in a folder full of `.html` bookmarks, impossible to find when you actually need it.

**OrganizeUp** was born from that frustration. It's a full-stack web application that centralizes all your learning resources — books, courses, tools, custom sections — into a single beautiful, searchable platform accessible from anywhere.

---

## ✨ Features

### 📖 Books — Three Formats, One Player
All books are tracked with reading/viewing progress saved per user.

| Type | What it does |
|------|-------------|
| **Video Books** | Embeds Google Drive video files in a sequential player. Progress bar tracks watch %, auto-popup takes notes after completion. |
| **Text Books (PDF)** | Embeds PDFs directly in-browser. Scroll progress is saved so you return to the exact page you left off — just like Microsoft Edge's PDF reader. |
| **Audio Books** | Upload `.mp3` / `.wav` / any audio file. Stored in MongoDB GridFS with HTTP Range support for native seeking. Playback features animated waveform bars, a draggable seek timeline, Prev/Play/Next controls, volume slider, and a scrollable track list. |

### 🎓 Courses — Categorized Learning Paths
- Categories you define (add new on the fly)
- Each course has a name, description, optional banner image, and a link
- Full CRUD: add, edit, delete — all without page reloads

### 🛠️ Tools & Tricks — Free Resources Vault
- Store tools, hacks, free trials, and shortcuts
- Title, description, banner image, and link
- "See more" expansions for long descriptions
- Full CRUD operations

### 🗂️ Custom Sections — Your Personal Knowledge Pages
- Create fully custom sections with a name, banner, and privacy setting
- Add rich sub-sections with **Markdown text blocks** and **image blocks**
- Set sections to **Public** (appears in Explore) or **Private** (only you can see)
- Request to **publish** a section — admin reviews and approves
- Section templates for quick starts
- Other users can **save** public sections to their own library

### 🌐 Explore — Discover Public Knowledge
- Browse all public sections shared by other users
- Filter and search across the community's knowledge base
- Save any section to your personal library with one click

### 📺 YouTube Playlist Manager
- Save and organize YouTube playlists
- Quick access to your curated video collections

### 💾 Saved Library
- A personal shelf of everything you've bookmarked across the platform
- All your saved sections, courses, and resources in one view

### 👤 User Profiles & Avatars
- Customizable profile with avatar upload
- View your contributed and saved content

### 🛡️ Admin Panel
- Centralized content management (add/edit/delete books, courses, tools)
- Review and approve section publish requests
- View user-submitted notes and learning data
- User management dashboard

### 🔔 Quality-of-Life
- **Dynamic browser tab titles** — every page updates the tab name contextually
- **Framer Motion animations** throughout for smooth transitions
- **Glass-morphism UI** — dark, modern aesthetic with blur + gradient cards
- **Fully responsive** — works on mobile, tablet, and desktop
- **Redux Toolkit** state management — zero full-page reloads
- **Real-time toast notifications** for every action

---

## 🏗️ Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| React 18 | UI framework with hooks |
| Redux Toolkit | Global state management |
| React Router v6 | Client-side routing |
| Tailwind CSS | Utility-first styling |
| Framer Motion | Animations & transitions |
| react-icons / io5 | Icon library |

### Backend
| Technology | Purpose |
|-----------|---------|
| Node.js + Express 5 | REST API server |
| MongoDB + Mongoose | Primary database |
| MongoDB GridFS | Binary file storage (audio uploads) |
| Cloudinary | Image storage (banners, avatars) |
| Multer | File upload middleware |
| JSON Web Tokens | Authentication |
| Passport.js | Google OAuth 2.0 |
| bcryptjs | Password hashing |
| Helmet + CORS | Security hardening |

### Deployment
| Service | What runs there |
|---------|----------------|
| **Render** | Node.js backend API |
| **Vercel** | React frontend (Vite) |
| **MongoDB Atlas** | Cloud database (with SRV → direct URI fallback for mobile hotspot DNS issues) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- Cloudinary account (for image uploads)
- Google Cloud Console project (for OAuth)

### 1. Clone the repo
```bash
git clone https://github.com/talha-techs/OrganizeUp.git
cd OrganizeUp
```

### 2. Server setup
```bash
cd server
npm install
cp .env.example .env
# Fill in your .env values (see below)
npm run dev
```

### 3. Client setup
```bash
cd client
npm install
npm run dev
```

The client runs on `http://localhost:5173` and proxies `/api` requests to `http://localhost:5000`.

---

## 🔑 Environment Variables

Create `server/.env` from `server/.env.example`:

```env
PORT=5000
NODE_ENV=development

# MongoDB
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/organizeup
MONGO_URI_DIRECT=mongodb://<user>:<pass>@shard-00-00:27017,...?ssl=true&authSource=admin
# ^ Direct URI fallback for hotspot/DNS environments

# Auth
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# App
CLIENT_URL=http://localhost:5173
ADMIN_EMAIL=your_admin_email@example.com
```

---

## 📁 Project Structure

```
OrganizeUp/
├── client/                     # React frontend (Vite)
│   └── src/
│       ├── components/         # Reusable UI components & forms
│       ├── hooks/              # Custom hooks (useDocumentTitle, etc.)
│       ├── pages/              # Route-level page components
│       └── redux/              # Redux slices & store
│
└── server/                     # Express backend
    ├── config/                 # DB connection, GridFS setup
    ├── controllers/            # Route handler logic
    ├── middleware/             # Auth, upload, validation
    ├── models/                 # Mongoose schemas
    └── routes/                 # Express route definitions
```

---

## 🗺️ Roadmap

- [ ] Mobile app (React Native)
- [ ] AI-powered resource tagging and smart search
- [ ] Browser extension to save links directly from any page
- [ ] Collaborative sections (shared editing)
- [ ] Email digests of new public sections

---

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request for bug fixes, features, or documentation improvements.

1. Fork the repository
2. Create your branch: `git checkout -b feat/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push and open a pull request

---

## 📄 License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) for details.

---

<p align="center">
  Built with ❤️ to stop losing good resources in the void of unorganized folders.
</p>
