# 🧠 LingoMate MK2 — Real-Time Language Learning Chat Platform

> The next evolution of LingoMate — rebuilt from the ground up with a fully custom real-time chat engine, translation modes, and WebRTC video calling.

🌐 **Live App:** [https://lingomate-mk2.onrender.com](https://lingomate-mk2.onrender.com)

---

# 🗣️ About The Project

**LingoMate MK2** is a production-deployed, full-stack language exchange platform designed to help users learn languages through real conversation.

Unlike MK1 — which relied on third-party realtime infrastructure — MK2 introduces a **fully self-hosted chat architecture** powered by WebSockets, Prisma, and WebRTC.

It behaves like a modern messaging app, optimized for immersive language learning.

---

# 🔁 Evolution From MK1 → MK2

| Capability      | MK1             | MK2                        |
| --------------- | --------------- | -------------------------- |
| Chat Engine     | Stream Chat API | Custom Socket.IO backend   |
| Video Calls     | Stream links    | Native WebRTC              |
| Message Storage | Third-party     | PostgreSQL                 |
| Realtime Sync   | Managed service | Self-hosted sockets        |
| Translation     | Planned         | Integrated                 |
| Call Logs       | External        | Persistent system messages |

MK2 represents a shift from **API integration → systems engineering**.

---

# ✨ Core Features

## 💬 Real-Time Messaging

* 1-to-1 chat
* Text + media messages
* Edit & delete
* Read/delivered status
* Pagination

---

## 🌐 Translation Chat Modes

Each participant can switch modes independently:

| Mode         | Behavior                       |
| ------------ | ------------------------------ |
| **Bridge**   | Normal chat                    |
| **Comfort**  | Translate to native language   |
| **Learning** | Translate to learning language |

Translations are:

* Generated on send
* Stored per message
* Displayed dynamically

---

## 😀 Reactions & Typing

* Emoji reactions (1/user/message)
* Typing indicators
* Real-time updates

---

## 🟢 Presence System

* Online/offline tracking
* Last seen timestamps
* Live presence broadcast

---

## 📞 WebRTC Video Calling

### Call Lifecycle

* RINGING
* ONGOING
* REJECTED
* MISSED
* ENDED

### Features

* Peer-to-peer streams
* Socket signaling
* SDP + ICE exchange
* Duration tracking
* Persistent logs

---

## 🧾 Call Logs Inside Chat

Calls appear as system messages:

* “Started a call”
* “Missed call”
* “Call ended (2m 41s)”

Stored in the same message history.

---

# 🛠 Tech Stack

## Frontend

* React
* Vite
* React Router
* TanStack Query
* Socket.IO Client
* TailwindCSS
* DaisyUI
* Zustand

---

## Backend

* Node.js
* Express.js
* Socket.IO
* Prisma ORM
* PostgreSQL
* JWT Auth

---

## Media & AI

* WebRTC
* Cloudinary
* Google Gemini API (translations)

---

# 🧱 System Architecture

```
Client (React)
   ├── REST APIs
   ├── Socket.IO
   └── WebRTC

Backend (Node + Express)
   ├── Prisma ORM
   ├── PostgreSQL
   ├── Socket.IO Server
   └── External Services
```

---

# 🔄 Data Flow Design

| Layer       | Responsibility         |
| ----------- | ---------------------- |
| REST        | Auth, CRUD, pagination |
| Socket.IO   | Live events            |
| Query Cache | Sync state             |
| WebRTC      | Media streams          |

---

# 🗄 Database Models

* User
* FriendRequest
* Conversation
* ConversationParticipant
* Message
* Reaction
* Call

### Design Highlights

* Chat mode per participant
* Unread counters
* Last read tracking
* System call logs
* Translation storage

---

# 🚀 Deployment

## Infrastructure

* **Hosting:** Render Web Service
* **Database:** Render PostgreSQL
* **Media:** Cloudinary

## Production Features

* Static React serving via Express
* Prisma migrations on deploy
* WebSocket support
* Monorepo build orchestration

---

# 📦 Monorepo Structure

```
root
 ├── backend
 │   ├── prisma
 │   ├── src
 │   └── package.json
 │
 ├── frontend
 │   ├── src
 │   └── package.json
 │
 └── package.json
```

---

# 🧪 Local Development

## Prerequisites

* Node.js ≥ 18
* PostgreSQL

---

## Setup

```bash
git clone https://github.com/Dev-9913/lingomateMK2.git
cd lingomateMK2
```

Install:

```bash
npm install --prefix backend
npm install --prefix frontend
```

Env (`backend/.env`):

```env
PORT=7000
DATABASE_URL=postgresql://...
JWT_SECRET=...
CLIENT_URL=http://localhost:5173
CLOUDINARY_...
GEMINI_API_KEY=...
```

Run:

```bash
npm run dev --prefix backend
npm run dev --prefix frontend
```

---

# 🧠 What MK2 Demonstrates

* Real-time systems design
* WebSocket architecture
* WebRTC signaling
* Translation pipelines
* Monorepo deployment
* Prisma migrations
* Production debugging

---

# 🔮 Future Roadmap

* Group chats
* Voice calls
* Push notifications
* Redis socket scaling
* AI conversation analysis
* Language progress tracking

---

# 📜 License

MIT License



