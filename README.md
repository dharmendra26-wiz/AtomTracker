# AtomTracker

> An enterprise-grade Goal Setting & Tracking Portal that replaces fragile, formula-prone Excel sheets with a clean web app. Employees set quarterly goals with strict 100% weight validation, managers approve and review progress, and every change to a locked goal is captured in a tamper-evident audit trail — all behind JWT-based role-based access control.

## Tech Stack

| Layer       | Choice                                        |
| ----------- | --------------------------------------------- |
| Backend     | **FastAPI** (Python 3.11+), SQLAlchemy 2, Uvicorn |
| Database    | **SQLite** (zero-config; swap to Postgres via `DB_URL` env var) |
| Auth        | **PyJWT** (HS256) + **bcrypt** for password hashing |
| Frontend    | **React 19** + **Vite 8**                     |
| Styling     | **Tailwind CSS v4** (via `@tailwindcss/vite`) |
| Icons       | **lucide-react**                              |
| Routing     | **react-router-dom v7**                       |

## Key Features

### 🔒 Role-Based Access Control (RBAC)
Three roles — **Employee**, **Manager**, **Admin** — encoded into signed JWTs. Every protected route checks the role server-side. Managers can only act on sheets belonging to their direct reports (`mgr_id` link); cross-team actions return `403`. Admins can override anything.

### ✅ Strict Goal-Sheet Validation
- Max **8 goals** per sheet
- Minimum weight of **10** per goal
- The "Submit for Approval" button is disabled visually until the **sum of weights equals exactly 100** — and the backend re-validates server-side regardless.

### 📊 Automatic Quarterly Scoring
A standalone `compute_score(uom, target, actual)` helper handles all four UoMs:

| UoM | Logic |
| --- | --- |
| **Min** (higher is better) | `(actual / target) × 100`, capped at 100 |
| **Max** (lower is better)  | `(target / actual) × 100`, capped at 100, safe on `actual=0` |
| **Zero**                   | `100` if `actual == 0`, else `0` |
| **Timeline**               | `actual` (treated as a % already) |

The overall sheet score is a weighted average across goals.

### 🛡️ Atomic Audit Trail
A single generic `AuditLog` table tracks `(entity_type, entity_id, changed_by, action, old_value, new_value, timestamp)` for:

- `GoalSheet / approve` — when a manager locks a sheet
- `Goal / override` — when an admin changes target or weight
- `CheckIn / update_actual` — when an employee revises a previously logged quarter

Each audit row is written in the **same transaction** as the change it records — if the commit fails, neither persists. Old/new values are stored as JSON strings, rendered as red→green diff pills in the Admin Console.

### 📥 One-Click CSV Report
`GET /reports/achievements.csv` joins Employees ↔ Sheets ↔ Goals ↔ Check-ins, runs `compute_score` on the latest actual per goal, and streams a download-ready CSV.

### 🎨 Polished UX touches
- Demo-login buttons (Employee / Manager / Admin) on the login page for instant access
- Status-aware routing — a Draft sheet opens in the editor, a Locked sheet opens in the check-in view
- "Copy ID" chips next to every Sheet, Goal, and Check-in so audit lookups are one click away
- Live analytics dashboard: users by role, sheets by status, goals by thrust area

## Local Setup

### 1. Clone & enter the repo

```bash
git clone <your-repo-url>
cd atomtracker
```

### 2. Backend — FastAPI on port 8000

```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload
```

The API will be live at **http://127.0.0.1:8000** and Swagger UI at **http://127.0.0.1:8000/docs**.

### 3. Seed the demo users (one-time)

In a browser or with curl:

```bash
curl http://127.0.0.1:8000/setup-demo
```

This idempotently creates three demo accounts:

| Role     | Email                  | Password   |
| -------- | ---------------------- | ---------- |
| Admin    | `admin@test.com`       | `admin`    |
| Manager  | `manager@test.com`     | `manager`  |
| Employee | `employee@test.com`    | `employee` |

The Employee is automatically linked to the Manager via `mgr_id`.

### 4. Frontend — React/Vite on port 5173

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** and click any of the three demo-login buttons to jump straight into that role's dashboard.

### 5. (Optional) Point the frontend at a different API

Create `frontend/.env`:

```
VITE_API_URL=https://your-deployed-backend.example.com
```

## Demo Walkthrough

1. **Employee**: create a 2026 sheet → add goals totaling weight 100 → submit for approval
2. **Manager**: review the submitted sheet → Approve & Lock
3. **Employee**: open the now-Locked sheet → log Q1 actuals (and revise them — triggers an audit log)
4. **Manager**: open the same sheet → add feedback to a specific check-in
5. **Admin**: open the Admin Console → see live analytics, paste any Sheet/Goal/Check-in ID into the audit explorer to see the full change history → download the achievement CSV

## Project Structure

```
atomtracker/
├── backend/
│   ├── main.py                # FastAPI app, /login, /setup-demo
│   ├── database.py            # SQLAlchemy engine + Session
│   ├── models.py              # User, GoalSheet, Goal, CheckIn, AuditLog
│   ├── auth.py                # JWT, bcrypt, get_curr_user, require_role
│   ├── routes_goals.py        # Sheet + Goal CRUD and approval flow
│   ├── routes_checkins.py     # Quarterly check-ins + scoring helper
│   ├── routes_admin.py        # Audit explorer, analytics, CSV export
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── App.jsx                # Routes + Protected wrapper
│       ├── AuthContext.jsx        # Login state via jwt-decode
│       ├── api.js                 # fetch wrapper + downloadBlob helper
│       ├── IdChip.jsx             # Reusable "copy entity ID" pill
│       ├── LoginPage.jsx
│       ├── EmployeeDashboard.jsx
│       ├── SheetDetail.jsx        # Draft / Submitted editor
│       ├── EmployeeCheckin.jsx    # Locked sheet — log progress
│       ├── ManagerDashboard.jsx
│       ├── ManagerSheetDetail.jsx # Approve & Lock
│       ├── ManagerCheckin.jsx     # Add quarterly feedback
│       └── AdminDashboard.jsx     # Analytics + audit explorer + CSV
└── README.md
```

## License

MIT — built for a hackathon, do whatever you want with it.
