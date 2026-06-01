````md
<div align="center">

# 🌐 LingoMate MK2

### Learn Languages Through Real Conversations

A full-stack real-time language exchange platform that combines messaging, AI-powered translation, and WebRTC video calling into a seamless language learning experience.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-lingomate--mk2.onrender.com-6852D6?style=for-the-badge&logo=render&logoColor=white)](https://lingomate-mk2.onrender.com)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-22-339933?style=for-the-badge&logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-00E5BF?style=for-the-badge&logo=postgresql&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-Real--Time-black?style=for-the-badge&logo=socket.io)
![WebRTC](https://img.shields.io/badge/WebRTC-P2P%20Video-blue?style=for-the-badge)

</div>

---

# 📖 Overview

LingoMate MK2 is a production-deployed language exchange platform where users connect with native speakers and learn through real conversation.

Unlike traditional chat applications, LingoMate integrates language-learning directly into the communication workflow. Users can dynamically switch how messages are displayed using personalized translation modes while still participating in the same conversation.

MK2 is a complete architectural rewrite of the original platform.

The project evolved from integrating third-party communication services into building a fully self-hosted real-time system powered by:

- Socket.IO
- WebRTC
- PostgreSQL
- Prisma
- Gemini AI

---

# 🚀 Live Demo

### Production Deployment

🔗 https://lingomate-mk2.onrender.com

---

# ✨ Core Features

## 💬 Real-Time Messaging

- One-to-one chat powered by Socket.IO
- Instant message delivery
- Message editing
- Message deletion
- Reply to messages
- Emoji reactions
- Typing indicators
- Read receipts
- Delivery status
- Infinite scroll message history
- Unread conversation counters

---

## 🌐 Intelligent Translation Modes

One of the defining features of LingoMate.

Every participant can independently choose how incoming messages are displayed.

### Bridge Mode

Messages appear exactly as sent.

Perfect for fluent conversations.

---

### Comfort Mode

Incoming messages are translated into the user's native language.

Allows users to communicate comfortably with speakers of other languages.

---

### Learning Mode

Incoming messages are translated into the user's target learning language.

Creates immersion while maintaining context.

---

### Example

Original message:

```text
How was your day?
````

User A (Learning Japanese):

```text
今日はどうだった？
```

User B (Learning English):

```text
How was your day?
```

The same message is rendered differently for each participant.

---

## 📞 Video Calling

Built entirely using WebRTC.

Features:

* Peer-to-peer video calling
* Call signaling through Socket.IO
* ICE candidate exchange
* SDP negotiation
* Missed call tracking
* Rejected call tracking
* Call duration tracking
* Persistent call history

Calls automatically appear inside the conversation timeline as system messages.

---

## 🟢 Presence System

Real-time presence tracking.

Features:

* Online status
* Offline status
* Last seen timestamps
* Instant status updates

---

## 🔐 Authentication

* JWT authentication
* HTTP-only cookies
* Protected API routes
* Secure session management

---

# 🧠 Why I Built LingoMate

Most language exchange applications focus on matching users but provide little support once a conversation starts.

LingoMate was designed to reduce communication friction while still encouraging language acquisition.

Goals:

* Make language exchange more accessible
* Preserve natural conversation flow
* Allow users to control translation assistance
* Build a real-time system from scratch without relying on managed chat providers

The project became an opportunity to explore:

* Distributed real-time systems
* WebRTC networking
* Translation pipelines
* Database design
* Production deployment

---

# 🏗️ Architecture

```text
                 ┌─────────────────┐
                 │   React Client  │
                 └────────┬────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
         ▼                ▼                ▼

      REST API      Socket.IO       WebRTC Media

         │                │                │
         └────────────────┴────────────────┘
                          │
                          ▼

              Node.js + Express Backend

                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼

    PostgreSQL      Cloudinary       Gemini API
      (Neon)
```

---

# ⚙️ Tech Stack

## Frontend

| Category         | Technology       |
| ---------------- | ---------------- |
| Framework        | React 19         |
| Build Tool       | Vite             |
| Routing          | React Router DOM |
| State Management | TanStack Query   |
| Real-Time        | Socket.IO Client |
| Styling          | Tailwind CSS     |
| Components       | DaisyUI          |
| Icons            | Lucide React     |
| Notifications    | React Hot Toast  |

---

## Backend

| Category         | Technology |
| ---------------- | ---------- |
| Runtime          | Node.js    |
| Framework        | Express.js |
| Real-Time        | Socket.IO  |
| ORM              | Prisma     |
| Authentication   | JWT        |
| Password Hashing | bcrypt     |
| AI               | Gemini API |
| Media Storage    | Cloudinary |

---

## Database

| Technology               |
| ------------------------ |
| PostgreSQL               |
| Neon Serverless Postgres |
| Prisma ORM               |

---

# 🔥 Engineering Challenges Solved

## Real-Time State Synchronization

Maintaining consistency across:

* Messages
* Edits
* Deletions
* Reactions
* Read receipts
* Typing indicators
* Presence updates

required an event-driven architecture powered by Socket.IO.

---

## Per-User Translation State

Chat mode is stored per participant rather than per conversation.

This allows multiple users to experience the same conversation differently depending on their language-learning goals.

---

## WebRTC Signaling

Implemented a complete signaling workflow using Socket.IO:

* Offer creation
* Answer creation
* ICE candidate exchange
* Call lifecycle management

without relying on third-party communication providers.

---

## Persistent Call History

Calls are represented as:

* Structured database records
* System messages inside conversations

This keeps communication history unified and searchable.

---

# 📊 Database Design

Core Models:

```text
User
FriendRequest
Conversation
ConversationParticipant
Message
Reaction
Call
```

### Design Highlights

* Per-user chat mode settings
* Translation storage per message
* Read-state tracking
* Conversation-level unread counts
* Persistent call records

---

# 📡 Data Flow

## Messaging Flow

```text
User
  │
  ▼
React Client
  │
  ▼
Socket.IO Event
  │
  ▼
Express Backend
  │
  ▼
PostgreSQL
  │
  ▼
Broadcast to Participants
```

---

## Translation Flow

```text
User Sends Message
        │
        ▼
Gemini Translation Service
        │
        ▼
Store Original + Translations
        │
        ▼
Socket Broadcast
        │
        ▼
Client Chooses Display Variant
```

Translations are generated once and reused to minimize API costs and latency.

---

# 📂 Project Structure

```text
lingomate/

├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   │
│   └── src/
│       ├── controllers/
│       ├── middleware/
│       ├── routes/
│       ├── lib/
│       │   ├── socket.js
│       │   ├── prisma.js
│       │   ├── cloudinary.js
│       │   └── gemini.js
│       └── server.js
│
├── frontend/
│   └── src/
│       ├── components/
│       ├── hooks/
│       ├── pages/
│       ├── lib/
│       └── store/
│
└── package.json
```

---

# 🛠️ Local Development

## Prerequisites

* Node.js 18+
* PostgreSQL (or Neon)
* Cloudinary Account
* Gemini API Key

---

## Installation

```bash
git clone https://github.com/Dev-9913/lingomateMK2.git

cd lingomateMK2
```

Install dependencies:

```bash
npm install --prefix backend
npm install --prefix frontend
```

---

## Environment Variables

```env
PORT=7000

DATABASE_URL=

DIRECT_URL=

JWT_SECRET=

CLIENT_URL=http://localhost:5173

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

GEMINI_API_KEY=
```

---

## Run Development Servers

Backend:

```bash
npm run dev --prefix backend
```

Frontend:

```bash
npm run dev --prefix frontend
```

---

# 🚢 Deployment

Production stack:

* Render
* Neon PostgreSQL
* Cloudinary
* Gemini API

Deployment pipeline:

1. Install dependencies
2. Build React frontend
3. Run Prisma migrations
4. Start Express server
5. Serve frontend from backend

---

# 🎯 Skills Demonstrated

### Frontend

* React Architecture
* State Management
* Real-Time UI Synchronization
* Responsive Design

### Backend

* REST API Design
* Authentication Systems
* Event-Driven Architecture
* Socket.IO

### Database

* Relational Modeling
* Prisma ORM
* Query Optimization

### Real-Time Systems

* Presence Tracking
* WebSocket Communication
* Event Synchronization

### Networking

* WebRTC Signaling
* Peer-to-Peer Communication

### AI Integration

* Translation Pipelines
* Gemini API Integration
* Cost-Aware API Usage

### Cloud & Deployment

* Render
* Neon PostgreSQL
* Cloudinary
* Production Environment Management

---

# 🗺️ Roadmap

* [ ] Group Chats
* [ ] Voice Calls
* [ ] Push Notifications
* [ ] Redis Socket Scaling
* [ ] AI Conversation Feedback
* [ ] Language Progress Analytics
* [ ] Community Learning Spaces

---

# 📜 License

MIT

---

<div align="center">

### Built to explore the intersection of real-time communication, language learning, and AI.

⭐ Star the repository if you found it interesting.

</div>
```
