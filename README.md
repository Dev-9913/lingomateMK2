---

## Local Development

### Prerequisites
- Node.js ≥ 18
- A [Neon](https://neon.tech) database (free tier)
- Cloudinary account (free tier)
- Google Gemini API key

### Setup

```bash
git clone https://github.com/Dev-9913/lingomateMK2.git
cd lingomateMK2
```

Install dependencies:

```bash
npm install --prefix backend
npm install --prefix frontend
```

Create `backend/.env`:

```env
PORT=7000
DATABASE_URL=postgresql://...         # Neon pooled connection string
DIRECT_URL=postgresql://...           # Neon direct connection string
JWT_SECRET=your_jwt_secret
NODE_ENV=development
CLIENT_URL=http://localhost:5173
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
GEMINI_API_KEY=
```

Push the schema:

```bash
cd backend && npx prisma db push
```

Run:

```bash
npm run dev --prefix backend
npm run dev --prefix frontend
```

---

## Deployment

Hosted on **Render** (Web Service) with **Neon** PostgreSQL.

The root `package.json` build script handles the full deploy pipeline:
1. Install backend + frontend dependencies
2. Build the React frontend (`vite build`)
3. Run `prisma migrate deploy` against Neon
4. Express serves the compiled frontend in production

Environment variables required on Render: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `CLIENT_URL`, `CLOUDINARY_*`, `GEMINI_API_KEY`

---

## What This Project Demonstrates

- Designing a real-time system from scratch (no managed chat APIs)
- WebSocket architecture and event-driven state sync
- WebRTC signaling and peer connection management
- Translation pipelines with per-message storage
- Monorepo build orchestration for a Node + React stack
- Prisma schema design with relational modeling
- Production deployment and debugging on Render + Neon

---

## Roadmap

- [ ] Group chats
- [ ] Voice-only calls
- [ ] Push notifications
- [ ] Redis for horizontal socket scaling
- [ ] AI conversation analysis and feedback
- [ ] Language progress tracking

---

## License

MIT
