# AtomTracker — Hackathon Submission

> **In-House Goal Setting & Tracking Portal** — replaces fragile Excel sheets with strict 100% weight validation, automatic quarterly scoring, JWT-based RBAC, and a tamper-evident audit trail.

---

## 1. Live Working Link

| Component       | URL                                                |
| --------------- | -------------------------------------------------- |
| **Frontend**    | https://atom-tracker-rust.vercel.app               |
| **Backend API** | https://atomtracker.onrender.com                   |
| **API Docs**    | https://atomtracker.onrender.com/docs              |

> ⚠️ **First request may take ~30 seconds.** The backend is hosted on Render's free tier, which sleeps the container after 15 minutes of inactivity. Just refresh once and it'll be instant from then on.

### One-time setup (already done — included for reproducibility)

The three demo accounts have already been seeded. To re-seed (idempotent), open:

```
https://atomtracker.onrender.com/setup-demo
```

### Demo Login Credentials

> The login page also has **one-click "Demo Login"** buttons for each role.

| Role         | Email                  | Password   |
| ------------ | ---------------------- | ---------- |
| **Admin**    | `admin@test.com`       | `admin`    |
| **Manager**  | `manager@test.com`     | `manager`  |
| **Employee** | `employee@test.com`    | `employee` |

The Employee is already linked to the Manager via `mgr_id`, so the full approve → check-in → feedback flow works out of the box.

---

## 2. Source Code Repository

**GitHub:** https://github.com/dharmendra26-wiz/AtomTracker

Repo layout:

```
atomtracker/
├── backend/        # FastAPI + SQLAlchemy + SQLite
└── frontend/       # React + Vite + Tailwind v4
```

See [README.md](./README.md) for full local-setup instructions.

---

## 3. System Architecture

AtomTracker is a clean two-tier app: a stateless React SPA talking to a single FastAPI backend over JSON. Auth is handled with signed JWTs (HS256) carried in the `Authorization: Bearer` header on every request. The backend enforces role checks server-side regardless of what the client sends.

![System architecture: Client - Transport - FastAPI Server - SQLite](./docs/architecture.png)

### Request lifecycle (example: an Employee logs Q1 progress)

![Request lifecycle: Employee logs Q1 progress](./docs/request-lifecycle.png)

### Key architectural decisions

| Decision | Why |
| -------- | --- |
| **JWT in `Authorization` header**, not cookies | Stateless server, trivial CORS, no CSRF surface |
| **Single generic `AuditLog` table** with `(entity_type, entity_id)` | One audit pattern across Goals/Sheets/Check-ins; easy to extend to new entities without migrations |
| **Audit writes share the transaction** of the change | Either both persist or neither does — no orphan logs, no missing logs |
| **Shared Goals via `source_goal_id` self-FK on `Goal`** | One row of truth for actuals — copies are read-only links that proxy the primary's check-ins, so cascaded KPIs stay consistent for free |
| **Upsert check-ins** keyed on `(goal_id, quarter)` | "Latest" is unambiguous; revisions still preserved in the audit trail |
| **Server re-validates everything** the client validates (weight = 100, role checks, ownership) | UI never bypasses business rules |
| **SQLite for the hackathon**, swappable via `DB_URL` env var | Zero-config now, Postgres-ready in one env-var change |

### Feature coverage vs. the problem statement

| BRD requirement | Status | Endpoint(s) |
| --- | --- | --- |
| Three roles (Employee / Manager / Admin) with RBAC | ✅ | `auth.require_role` |
| Up to 8 goals per sheet, min weight 10, total = 100 | ✅ | `POST /sheets/{id}/goals`, `POST /sheets/{id}/submit` |
| Manager approves and locks the sheet | ✅ | `POST /sheets/{id}/approve` |
| **Manager returns sheet for rework with a comment** | ✅ | `POST /sheets/{id}/reject` |
| **Manager inline edits target/weight pre-approval** | ✅ | `POST /goals/{id}/override` (Manager scope: own reports on Submitted only) |
| Quarterly check-ins with auto-computed scores per UoM | ✅ | `POST /goals/{id}/checkins`, `GET /sheets/{id}/progress` |
| Manager comments on a specific check-in | ✅ | `POST /checkins/{id}/comment` |
| **Shared / cascaded goals (weight-only edit, actuals sync)** | ✅ | `POST /goals/{id}/cascade` |
| Admin override of locked goals with audit trail | ✅ | `POST /goals/{id}/override` |
| **Completion dashboard (per-employee × quarter matrix)** | ✅ | `GET /completion` |
| Full audit trail explorer (per entity + system-wide feed) | ✅ | `GET /audit-logs`, `GET /audit-logs/{entity_id}` |
| Achievement CSV report | ✅ | `GET /reports/achievements.csv` |
| Org analytics (users by role, sheets by status, goals by thrust area) | ✅ | `GET /analytics` |

---

## Built With

FastAPI · SQLAlchemy 2 · PyJWT · bcrypt · React 19 · Vite 8 · Tailwind v4 · lucide-react · react-router-dom v7
