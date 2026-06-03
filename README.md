# WAP Marketplace

A V1 task/bounty marketplace modeled on Whop's **workforce bounty** primitive: a user posts a task, funds a reward pool, sets how many people (slots) can be paid, and workers submit work that the poster approves until the slots fill. Styled with Frosted UI (`@whop/react`) so it looks native to Whop.

This MVP is **standalone**: it has its own JWT auth and a **mock wallet** (demo credits, no real money). Vocabulary is kept close to Whop bounties so a future swap to the real Whop Bounties API / ledger is a contained change.

## Stack

| Layer    | Tech                                                  |
| -------- | ----------------------------------------------------- |
| Frontend | Next.js (App Router) + `@whop/react` (Frosted UI)     |
| Backend  | FastAPI + SQLAlchemy 2.0 + Alembic                    |
| Database | Postgres 16                                           |
| Infra    | Docker + Docker Compose                               |

## Quick start

```bash
cp .env.example .env        # optional: tweak secrets/ports
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API docs (Swagger): http://localhost:8000/docs
- Postgres: localhost:5433 (host port; 5432 inside the network)

On boot the backend runs `alembic upgrade head` and seeds the fixed topic taxonomy. Each new account is granted demo credits (`SIGNUP_GRANT_CENTS`, default $500) so you can immediately fund a task.

## How it works

The engagement lifecycle is a hybrid volunteer/assignment flow:

1. **Register** to receive demo credits.
2. **Post a task**: choose a topic, set the reward per slot and the number of slots. The total (reward x slots) is moved from your available balance into **escrow**.
3. **Workers volunteer** for open tasks with an optional pitch; their profile is shown to the poster (one volunteer per worker per task).
4. **The poster accepts** volunteers into the open slots (each accept reserves a slot) or passes on them.
5. **Accepted workers submit their work**; the poster **confirms & pays**, releasing one slot's reward from escrow. Workers can **withdraw** before completing, freeing the slot.
6. When every slot is completed the task is **completed**. **Cancelling** refunds all unpaid escrow (including accepted-but-unpaid slots) to the poster.
7. After completion, the **poster and worker can review each other** (1-5 stars). Ratings and totals surface on **public profiles**.

Every balance movement is written to an auditable `wallet_transactions` ledger (`grant`, `escrow_hold`, `payout`, `refund`).

## API overview

| Method | Path                                  | Auth | Description                          |
| ------ | ------------------------------------- | ---- | ------------------------------------ |
| POST   | `/api/auth/register`                  | -    | Create account + wallet + credits    |
| POST   | `/api/auth/login`                     | -    | Get a JWT                            |
| GET    | `/api/auth/me`                        | yes  | Current user                        |
| GET    | `/api/topics`                         | -    | Fixed topic list                    |
| GET    | `/api/tasks`                          | -    | Browse/filter/search tasks          |
| POST   | `/api/tasks`                          | yes  | Create + fund a task (escrow)       |
| GET    | `/api/tasks/{id}`                     | -    | Task detail                         |
| POST   | `/api/tasks/{id}/cancel`              | yes  | Cancel + refund (poster only)       |
| GET    | `/api/tasks/me/posted`                | yes  | Your posted tasks                   |
| POST   | `/api/tasks/{id}/volunteer`           | yes  | Volunteer (with pitch)              |
| GET    | `/api/tasks/{id}/me`                  | yes  | Your engagement for a task          |
| GET    | `/api/tasks/{id}/submissions`         | yes  | List volunteers (poster only)       |
| POST   | `/api/submissions/{id}/accept`        | yes  | Accept into a slot (poster only)    |
| POST   | `/api/submissions/{id}/reject`        | yes  | Pass on a volunteer (poster only)   |
| POST   | `/api/submissions/{id}/submit-work`   | yes  | Deliver work (accepted worker)      |
| POST   | `/api/submissions/{id}/complete`      | yes  | Confirm + pay (poster only)         |
| POST   | `/api/submissions/{id}/withdraw`      | yes  | Withdraw (worker)                   |
| POST   | `/api/submissions/{id}/review`        | yes  | Review after completion             |
| GET    | `/api/me/submissions`                 | yes  | Your engagements                    |
| GET    | `/api/users/{id}`                     | -    | Public profile + stats              |
| GET    | `/api/users/{id}/reviews`             | -    | Reviews received                    |
| PATCH  | `/api/users/me`                       | yes  | Update display name / bio           |
| GET    | `/api/wallet`                         | yes  | Balance + transaction history       |

## Local development (without Docker)

Backend:

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=postgresql+psycopg2://wap:wap@localhost:5432/wap
alembic upgrade head && python -m app.seed
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

## Project layout

```
backend/
  app/
    main.py          # FastAPI app + CORS + rate limiting
    models.py        # SQLAlchemy models
    schemas.py       # Pydantic schemas
    services.py      # Wallet/escrow ledger operations
    deps.py          # Auth dependencies
    security.py      # Password hashing + JWT
    seed.py          # Topic taxonomy seed
    routers/         # auth, topics, tasks, submissions, wallet
  alembic/           # Migrations
frontend/
  app/               # Next.js routes (marketplace, auth, task detail, new, dashboard)
  components/         # Navbar, TaskCard
  lib/                # api client, auth context, types, formatting
docker-compose.yml
```
