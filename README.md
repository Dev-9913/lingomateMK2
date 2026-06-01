

# 🌐 LingoMate MK2

> A production-grade language exchange platform built with React, Node.js, Socket.IO, WebRTC, PostgreSQL, Prisma, and Gemini AI.

LingoMate MK2 enables users to connect with native speakers, communicate in real time, learn through immersive conversations, and seamlessly switch between translation modes without disrupting communication flow.

🔗 **Live Demo:** [https://lingomate-mk2.onrender.com](https://lingomate-mk2.onrender.com)

---

## 🚀 Project Highlights

* 💬 Real-time messaging powered by Socket.IO
* 🌐 AI-powered multilingual conversations
* 📞 Peer-to-peer video calling using WebRTC
* 🔄 Three dynamic translation modes
* 🟢 Real-time online/offline presence system
* 📚 Persistent chat and call history
* ⚡ Production deployment on Render + Neon PostgreSQL
* 🔐 JWT authentication with secure session management

---

# 🔄 MK1 → MK2 Evolution

LingoMate MK2 is not the first version of the platform.

The original version (MK1) was built using managed communication services. While this enabled rapid development, it limited flexibility and prevented deeper understanding of the systems powering real-time communication.

MK2 was rebuilt from scratch to gain complete ownership of the architecture and implement the underlying systems directly.

| Capability               | MK1                 | MK2                        |
| ------------------------ | ------------------- | -------------------------- |
| Chat Engine              | Stream Chat API     | Custom Socket.IO Backend   |
| Video Calling            | Stream Video SDK    | Native WebRTC              |
| Message Storage          | Third-Party Service | PostgreSQL + Prisma        |
| Presence Tracking        | Managed Service     | Custom Socket.IO Events    |
| Translation              | Planned             | Gemini API Integration     |
| Call History             | External Service    | Persistent System Messages |
| Backend Ownership        | Partial             | Full Ownership             |
| Real-Time Infrastructure | Managed             | Self-Hosted                |

### Why Rebuild?

MK1 focused on API integration.

MK2 focused on understanding and implementing:

* Real-time messaging infrastructure
* Presence management
* WebRTC signaling
* Database design
* Translation pipelines
* Conversation synchronization
* Read receipt systems

The project represents a transition from:

```text
API Integration
      ↓
Systems Engineering
```

---

# 💡 What Problem Does LingoMate Solve?

Most language exchange applications focus on connecting users but offer little support once conversations begin.

LingoMate reduces communication barriers while still encouraging language acquisition.

Users can:

* Speak naturally with native speakers
* Learn through immersive conversations
* Control translation assistance dynamically
* Switch between comprehension and immersion instantly

---

# 🌐 Translation Modes

One of LingoMate's defining features.

Each participant independently controls how incoming messages are displayed.

### Bridge Mode

Messages appear exactly as sent.

Perfect for fluent conversations.

### Comfort Mode

Incoming messages are translated into the user's native language.

Ideal for comfortable communication.

### Learning Mode

Incoming messages are translated into the user's target language.

Designed to maximize immersion.

### Example

Original message:

```text
How was your day?
```

User A (Learning Japanese):

```text
今日はどうだった？
```

User B (Learning English):

```text
How was your day?
```

The same conversation can be experienced differently by each participant.

---

# 💬 Real-Time Messaging

Built using Socket.IO.

Features:

* One-to-one chat
* Message editing
* Message deletion
* Reply-to-message support
* Emoji reactions
* Typing indicators
* Read receipts
* Delivery status
* Infinite scroll history
* Unread conversation counters

---

# 📞 WebRTC Video Calling

Video calling is implemented using native WebRTC.

Features:

* Peer-to-peer communication
* Custom Socket.IO signaling
* SDP negotiation
* ICE candidate exchange
* Call duration tracking
* Missed call handling
* Rejected call handling
* Persistent call history

Calls are automatically logged inside the conversation timeline.

---

# 🟢 Presence System

Real-time presence architecture tracks:

* Online status
* Offline status
* Last seen timestamps
* Live status broadcasts

---

# 🏗 System Architecture

```text
                    React Client
                          │
      ┌───────────────────┼───────────────────┐
      │                   │                   │
      ▼                   ▼                   ▼

   REST API         Socket.IO          WebRTC Media

      │                   │                   │
      └───────────────────┴───────────────────┘
                          │
                          ▼

                Node.js + Express

                          │

      ┌───────────────────┼───────────────────┐
      ▼                   ▼                   ▼

 PostgreSQL          Cloudinary         Gemini API
    (Neon)
```

---

# ⚙️ Tech Stack

## Frontend

* React 19
* Vite
* React Router DOM
* TanStack Query
* Socket.IO Client
* Tailwind CSS
* DaisyUI
* Lucide React
* React Hot Toast

## Backend

* Node.js
* Express.js
* Socket.IO
* Prisma ORM
* JWT Authentication
* bcrypt
* Gemini API
* Cloudinary

## Database

* PostgreSQL
* Neon
* Prisma ORM

---

# 🔥 Engineering Challenges Solved

## Real-Time Synchronization

Maintaining consistency across:

* Message delivery
* Message edits
* Message deletion
* Reactions
* Presence updates
* Typing indicators
* Read receipts

through an event-driven architecture.

---

## Per-User Translation State

Translation preferences are stored per participant rather than per conversation.

This allows multiple users to experience the same conversation differently.

---

## WebRTC Signaling

Implemented a custom signaling layer using Socket.IO:

* Offers
* Answers
* ICE candidates
* Call lifecycle management

without third-party communication providers.

---

## Persistent Call History

Calls are represented both as:

* Structured database records
* System messages inside conversations

creating a unified communication timeline.

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

### Highlights

* Per-user chat modes
* Translation storage per message
* Conversation unread counts
* Read-state tracking
* Persistent call records

---

# 📂 Project Structure

```text
lingomateMK2/

├── backend/
│   ├── prisma/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── lib/
│   │   └── server.js
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
4. Start Express backend
5. Serve frontend through Express

---

# 🎯 Skills Demonstrated

### Frontend

* React Architecture
* State Management
* Real-Time UI Synchronization

### Backend

* REST API Design
* Authentication & Authorization
* Socket.IO

### Database

* PostgreSQL
* Prisma
* Relational Data Modeling

### Real-Time Systems

* Presence Tracking
* Event Synchronization
* WebSocket Communication

### Networking

* WebRTC
* Signaling Architecture

### AI Integration

* Gemini API
* Translation Pipelines

### Cloud & Deployment

* Render
* Neon
* Cloudinary

---

# 🗺 Roadmap

* [ ] Group Chats
* [ ] Voice Calls
* [ ] Push Notifications
* [ ] Redis Socket Scaling
* [ ] AI Conversation Feedback
* [ ] Language Progress Tracking

---

# ⭐ What This Project Demonstrates

* Building a real-time communication platform from scratch
* Designing scalable WebSocket architectures
* Implementing WebRTC signaling workflows
* Integrating AI-powered translation pipelines
* Modeling complex relational databases
* Deploying production applications to the cloud

---

## 📜 License

MIT

---

⭐ If you found the project interesting, consider starring the repository.
