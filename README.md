# NexusChat — Real-Time Chatting & Video Calling Monorepo

Full-stack real-time communication platform built with **Next.js 16 (App Router)**, **Express**, **TypeScript**, **Prisma (PostgreSQL)**, and **WebSockets (Socket.IO)**, orchestrated using **Turborepo**.

---

## 📁 Monorepo Folder Structure

```
chatting_website/
├── apps/
│   ├── web/                     # Next.js 16 Frontend (App Router, TypeScript)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── globals.css  # Ultra-modern glassmorphic CSS design system
│   │   │   │   ├── layout.tsx   # Root layout with typography and SEO metadata
│   │   │   │   └── page.tsx     # Main chat application dashboard
│   │   │   ├── components/      # UI Components
│   │   │   │   ├── AuthModal.tsx       # Sign In / Register / 1-Click Demo Profiles
│   │   │   │   ├── ChatArea.tsx        # Messages feed, reply-to, actions, input
│   │   │   │   ├── CallModal.tsx       # WebRTC audio & video calling modal
│   │   │   │   ├── GroupModal.tsx      # Create group, add/remove members, rename
│   │   │   │   ├── Navbar.tsx          # App header, active status, user avatar
│   │   │   │   ├── Sidebar.tsx         # Conversation list, online indicators, search
│   │   │   │   └── UserSearchModal.tsx # Discover registered users to start chats
│   │   │   ├── hooks/
│   │   │   │   └── useSocket.ts # Real-time Socket.IO communication hook
│   │   │   └── lib/
│   │   │       ├── api.ts       # Backend REST API client with JWT support
│   │   │       └── types.ts     # Shared TypeScript domain models
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── server/                  # Express + TypeScript Backend API & WebSocket Server
│       ├── src/
│       │   ├── config/          # Passport.js Google OAuth configuration
│       │   ├── controllers/     # Call, Conversation, Message, User controllers
│       │   ├── db/              # Prisma Client & PostgreSQL pool connection
│       │   ├── middlewares/     # Auth (JWT), Error handler, Multer uploads
│       │   ├── routes/          # Express route definitions
│       │   ├── socket/          # Socket.IO real-time event handlers
│       │   ├── types/           # Express type augmentations
│       │   ├── utils/           # ApiError, ApiResponse, Cloudinary, Call Status
│       │   ├── validation/      # Joi schemas for users and messages
│       │   ├── app.ts           # Express application setup
│       │   └── index.ts         # Server entrypoint (HTTP + Socket.IO)
│       ├── prisma/              # Prisma schema and migrations
│       ├── scripts/             # Smoke test scripts
│       ├── package.json
│       ├── tsconfig.json
│       └── .env
│
├── turbo.json                   # Turborepo task pipeline configuration
├── package.json                 # Monorepo root workspace configuration
└── README.md
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Development Mode (Both Web & Server concurrently)
```bash
npm run dev
```
Turborepo will automatically launch:
- **Frontend**: `http://localhost:3000` (Next.js)
- **Backend API & WebSockets**: `http://localhost:5000` (Express + Socket.IO)

### 3. Type Checking & Verification
```bash
npm run check
```
Runs `tsc --noEmit` across all workspaces to guarantee zero type errors.

### 4. Production Build
```bash
npm run build
```
Builds both the Express backend (`dist/`) and the Next.js frontend (`.next/`).
