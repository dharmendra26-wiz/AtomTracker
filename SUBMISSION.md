# AtomTracker — Hackathon Submission

> **In-House Goal Setting & Tracking Portal** — replaces fragile Excel sheets with strict 100% weight validation, automatic quarterly scoring, JWT-based RBAC, and a tamper-evident audit trail.

---

## 1. Live Working Link

| Component       | URL                                          |
| --------------- | -------------------------------------------- |
| **Frontend**    | `<https://your-frontend.vercel.app>`         |
| **Backend API** | `<https://your-backend.onrender.com>`        |
| **API Docs**    | `<https://your-backend.onrender.com/docs>`   |

### One-time setup (after first deploy)

Hit this URL in your browser to seed the three demo accounts:

```
<https://your-backend.onrender.com/setup-demo>
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

**GitHub:** `<https://github.com/your-username/atomtracker>`

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

```mermaid
flowchart LR
    subgraph CLIENT["🖥️ Client (Browser)"]
        REACT["React 19 + Vite SPA<br/>Tailwind v4 · react-router"]
        AUTH_STORE[("localStorage<br/>JWT + role")]
        REACT -. reads/writes .-> AUTH_STORE
    end

    subgraph TRANSPORT["🔐 Transport"]
        REST["REST / JSON<br/>Authorization: Bearer &lt;JWT&gt;"]
    end

    subgraph SERVER["⚙️ FastAPI Server (Uvicorn)"]
        MAIN["main.py<br/>app + CORS + /login + /setup-demo"]
        AUTH["auth.py<br/>bcrypt · PyJWT · get_curr_user · require_role"]
        R_GOALS["routes_goals.py<br/>Sheets · Goals · Approve"]
        R_CHK["routes_checkins.py<br/>Check-ins · compute_score()"]
        R_ADMIN["routes_admin.py<br/>Override · AuditLogs · Analytics · CSV"]
        MAIN --> AUTH
        MAIN --> R_GOALS
        MAIN --> R_CHK
        MAIN --> R_ADMIN
    end

    subgraph DATA["💾 Persistence (SQLite via SQLAlchemy)"]
        T_USER[("users")]
        T_SHEET[("goal_sheets")]
        T_GOAL[("goals")]
        T_CHK[("checkins")]
        T_AUDIT[("audit_logs")]
        T_USER -- "mgr_id (self-ref)" --> T_USER
        T_USER --> T_SHEET
        T_SHEET --> T_GOAL
        T_GOAL --> T_CHK
        T_USER -. "changed_by" .-> T_AUDIT
    end

    REACT --> REST
    REST --> MAIN
    AUTH --> T_USER
    R_GOALS --> T_SHEET
    R_GOALS --> T_GOAL
    R_GOALS --> T_AUDIT
    R_CHK --> T_CHK
    R_CHK --> T_AUDIT
    R_ADMIN --> T_GOAL
    R_ADMIN --> T_SHEET
    R_ADMIN --> T_USER
    R_ADMIN --> T_AUDIT
```

### Request lifecycle (example: an Employee logs Q1 progress)

```mermaid
sequenceDiagram
    actor Emp as Employee
    participant FE as React SPA
    participant API as FastAPI
    participant DB as SQLite

    Emp->>FE: Fills "Log Progress" form
    FE->>API: POST /goals/{id}/checkins<br/>Authorization: Bearer <JWT>
    API->>API: get_curr_user (verify JWT)
    API->>DB: SELECT goal, sheet
    API->>API: Check sheet.user_id == user.id<br/>Check sheet.status == Locked
    alt First check-in for this quarter
        API->>DB: INSERT checkin
    else Re-logging same quarter
        API->>DB: UPDATE checkin
        API->>DB: INSERT audit_log<br/>(CheckIn, update_actual, old→new)
    end
    DB-->>API: commit (single transaction)
    API-->>FE: 200 OK + check-in JSON
    FE-->>Emp: UI refreshes,<br/>score recomputes
```

### Key architectural decisions

| Decision | Why |
| -------- | --- |
| **JWT in `Authorization` header**, not cookies | Stateless server, trivial CORS, no CSRF surface |
| **Single generic `AuditLog` table** with `(entity_type, entity_id)` | One audit pattern across Goals/Sheets/Check-ins; easy to extend to new entities without migrations |
| **Audit writes share the transaction** of the change | Either both persist or neither does — no orphan logs, no missing logs |
| **Upsert check-ins** keyed on `(goal_id, quarter)` | "Latest" is unambiguous; revisions still preserved in the audit trail |
| **Server re-validates everything** the client validates (weight = 100, role checks, ownership) | UI never bypasses business rules |
| **SQLite for the hackathon**, swappable via `DB_URL` env var | Zero-config now, Postgres-ready in one env-var change |

---

## Built With

FastAPI · SQLAlchemy 2 · PyJWT · bcrypt · React 19 · Vite 8 · Tailwind v4 · lucide-react · react-router-dom v7
