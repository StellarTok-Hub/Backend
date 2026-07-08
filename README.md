# Backend

![status](https://img.shields.io/badge/status-active-brightgreen)
![node](https://img.shields.io/badge/node-%3E%3D20-blue)
![python](https://img.shields.io/badge/python-%3E%3D3.11-blue)
![license](https://img.shields.io/badge/license-MIT-lightgrey)

Two-service backend powering the platform's real-time tipping and analytics layer:

- **Gateway** (Node.js/TypeScript) — public-facing BFF: auth, TikTok identity linking, live tip stream fan-out to clients.
- **Analytics Service** (Python/FastAPI) — listens to the Stellar network for live tip events and validates brand campaign analytics against on-chain data.

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Run with Docker Compose](#run-with-docker-compose)
  - [Run services individually](#run-services-individually)
- [Project Structure](#project-structure)
- [API Overview](#api-overview)
- [Testing](#testing)
- [CI](#ci)
- [Contributing](#contributing)
- [License](#license)

## Architecture

```
                    ┌─────────────┐
   client  ───────► │   Gateway   │  Node.js / Express / Prisma
                     │  (BFF, SSE) │
                     └──────┬──────┘
                            │ REST                 ▲ Redis pub/sub
                            ▼                       │ (tip events)
                    ┌───────────────┐        ┌──────┴────────┐
                    │  PostgreSQL   │        │ Analytics Svc │  Python / FastAPI
                    │ (users, ids)  │        │ (campaigns,   │  SQLAlchemy / Alembic
                    └───────────────┘        │  tip events)  │
                                              └──────┬────────┘
                                                      │
                                              ┌───────┴────────┐
                                              │ Stellar Horizon│
                                              │   (streaming)  │
                                              └────────────────┘
```

The gateway owns user identity and TikTok OAuth linking. The analytics service owns everything derived from the Stellar chain: it streams payments to a watched account, persists them as tip events, and publishes each one to a Redis channel that the gateway relays to clients over Server-Sent Events. Campaign validation cross-checks brand-reported metrics against the on-chain-derived tip totals.

## Tech Stack

| Concern              | Choice                                  |
|-----------------------|------------------------------------------|
| Gateway runtime       | Node.js 20, TypeScript, Express          |
| Gateway ORM           | Prisma                                   |
| Analytics runtime     | Python 3.11, FastAPI                     |
| Analytics ORM         | SQLAlchemy 2.0 (async) + Alembic         |
| Database              | PostgreSQL 16                            |
| Cache / pub-sub       | Redis 7                                  |
| Blockchain             | Stellar network (Horizon streaming API)  |
| Auth                  | JWT                                      |

## Getting Started

### Prerequisites

- Docker and Docker Compose (recommended path), **or**
- Node.js >= 20 and Python >= 3.11 for running services natively
- A Stellar Horizon endpoint (testnet by default) and an account to watch for tips

### Run with Docker Compose

```bash
cp .env.example .env
docker compose up --build
```

- Gateway: `http://localhost:3000`
- Analytics service: `http://localhost:8000` (docs at `/docs`)
- Postgres: `localhost:5432` · Redis: `localhost:6379`

### Run services individually

**Gateway**

```bash
cd services/gateway
cp .env.example .env
# fill in ENCRYPTION_KEY in .env: openssl rand -base64 32
npm install
npx prisma migrate deploy   # applies the committed migration history
npm run dev
```

Schema changes go through `npx prisma migrate dev --name <change>`, which generates a new file under `prisma/migrations/` — commit it like any other code change. The Docker image applies pending migrations automatically on container start (`docker-entrypoint.sh`).

**Analytics service**

```bash
cd services/analytics-service
cp .env.example .env
pip install -r requirements-dev.txt
alembic upgrade head
uvicorn app.main:app --reload
```

Schema changes go through `alembic revision --autogenerate -m "<change>"` — review the generated file, then commit it. The Docker image applies pending migrations automatically on container start.

## Project Structure

```
Backend/
├── docker-compose.yml
├── .pre-commit-config.yaml
├── scripts/
│   └── init-multi-db.sh          # creates separate gateway/analytics DBs in one Postgres instance
├── services/
│   ├── gateway/                  # Node.js / Express BFF
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/       # committed migration history (prisma migrate deploy)
│   │   ├── docker-entrypoint.sh  # runs `prisma migrate deploy` before the server starts
│   │   ├── src/
│   │   │   ├── config/           # env validation (zod)
│   │   │   ├── db/               # Prisma client
│   │   │   ├── redis/            # Redis client, tip event pub/sub fan-out
│   │   │   ├── middleware/       # auth, error handling, rate limiting, request logging/IDs
│   │   │   ├── routes/ controllers/ services/  # auth, identity, tips, campaigns, health
│   │   │   └── app.ts server.ts
│   │   └── tests/
│   └── analytics-service/        # Python / FastAPI
│       ├── alembic/
│       │   └── versions/         # committed migration history (alembic upgrade head)
│       ├── docker-entrypoint.sh  # runs `alembic upgrade head` before uvicorn starts
│       └── app/
│           ├── core/             # settings, logging, request-id middleware
│           ├── db/                # SQLAlchemy session/base
│           ├── models/            # campaign, tip_event, stream_cursor
│           ├── schemas/
│           ├── services/          # stellar_listener, campaign_validator, redis_client
│           └── api/routes/        # health, campaigns, tips
└── .github/workflows/ci.yml
```

## API Overview

**Gateway** (`http://localhost:3000/api/v1`)

| Method | Endpoint                    | Auth | Description                                        |
|--------|------------------------------|------|------------------------------------------------------|
| GET    | `/health`                   | —    | Liveness check (process is up, no dependency calls)  |
| GET    | `/health/ready`              | —    | Readiness check (DB + Redis reachable, 503 if not)   |
| POST   | `/auth/register`            | —    | Create an account, returns an access + refresh token  |
| POST   | `/auth/login`               | —    | Authenticate, returns an access + refresh token       |
| POST   | `/auth/refresh`             | —    | Exchange a refresh token for a new (rotated) pair     |
| POST   | `/auth/logout`              | —    | Revoke a refresh token                                |
| GET    | `/identity/tiktok/authorize`| JWT  | Get a TikTok OAuth authorize URL (with signed state)  |
| POST   | `/identity/link`            | JWT  | Exchange a TikTok OAuth code + state, link identity   |
| GET    | `/identity`                 | JWT  | Get the caller's linked TikTok identity               |
| GET    | `/tips/stream`               | JWT  | SSE stream of live tip events                         |
| POST   | `/campaigns/validate`        | JWT  | Validate a brand campaign against on-chain data (proxies to analytics service) |

**Analytics Service** (`http://localhost:8000/api/v1`)

| Method | Endpoint              | Description                                                  |
|--------|------------------------|----------------------------------------------------------------|
| GET    | `/health`              | Liveness check (process is up, no dependency calls)            |
| GET    | `/health/ready`        | Readiness check (DB + Redis reachable, 503 if not)             |
| POST   | `/campaigns`           | Register a campaign and the Stellar wallet its tips are paid into |
| POST   | `/campaigns/validate`  | Validate reported campaign metrics against that wallet's tip events |
| GET    | `/tips/recent`         | List recently observed Stellar tip events (max 200 per page)  |

Access tokens and TikTok-linking state tokens are both JWTs signed with `JWT_SECRET` but carry distinct `aud` claims (`access` vs `tiktok-oauth-state`), so one can never be replayed as the other. TikTok access/refresh tokens are encrypted at rest (AES-256-GCM, `ENCRYPTION_KEY`) and are never returned by `/identity` or `/identity/link`.

Sessions are carried by a rotating, revocable refresh token rather than a single long-lived access token: the access token expires in `JWT_EXPIRES_IN` (15 minutes by default) and can't be revoked, but `/auth/refresh` issues a fresh pair each time and immediately revokes the token it consumed. Presenting an already-revoked refresh token is treated as a stolen-token replay and revokes every outstanding refresh token for that user.

## Testing

```bash
# Gateway
cd services/gateway && npm test

# Analytics service
cd services/analytics-service && pytest
```

## CI

GitHub Actions (`.github/workflows/ci.yml`) lints, format-checks, builds, and tests both services independently — against real Postgres/Redis service containers — on every push and pull request to `main`.

## Pre-commit hooks

A [pre-commit](https://pre-commit.com) config at the repo root runs the same lint/format checks as CI before a commit lands, plus generic hygiene (trailing whitespace, merge conflict markers, large files). One-time setup:

```bash
pip install pre-commit
pre-commit install
```

The Node hooks shell out to the gateway's own installed `eslint`/`prettier`, so run `npm install` in `services/gateway` first.

## Contributing

1. Fork the repo and create your branch from `main`.
2. Make your changes with clear, focused commits.
3. Open a pull request describing what changed and why.

## License

[MIT](LICENSE)
