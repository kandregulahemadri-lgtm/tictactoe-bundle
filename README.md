# Tic Tac Toe — iPhone-style, Full Stack

## Setup

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Update DATABASE_URL and JWT_SECRET in .env
# Example DATABASE_URL for local Postgres:
# DATABASE_URL=postgres://tictactoe_user:password123@127.0.0.1:5432/tictactoe
# If DATABASE_URL is unset, the server will use an in-memory fallback database.
node server.js
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:3000

### Docker Compose (recommended for automatic Postgres + backend)

If you want Postgres and the backend to start together automatically, install Docker Desktop and run from the repository root:

```bash
cd /Users/kandregulahemadri/Downloads/tictactoe-bundle
docker compose up --build
```

This starts:
- `postgres` on port `5432`
- `backend` on port `8001`

Then run the frontend separately:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

> If Docker is not installed, install Docker Desktop for macOS first.

If you use Docker Compose, the backend already has `DATABASE_URL` configured for the compose Postgres service, so no local `.env` edits are required for that setup.
