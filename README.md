# AtomTracker 🎯

> **In-House Goal Setting & Tracking Portal** — Atomquest Hackathon 1.0 Submission

[![Live App](https://img.shields.io/badge/Live%20App-atom--tracker--rust.vercel.app-4f46e5?style=for-the-badge&logo=vercel)](https://atom-tracker-rust.vercel.app)
[![GitHub](https://img.shields.io/badge/Source%20Code-GitHub-181717?style=for-the-badge&logo=github)](https://github.com/dharmendra26-wiz/AtomTracker)
[![API Docs](https://img.shields.io/badge/API%20Docs-Swagger%20UI-85ea2d?style=for-the-badge&logo=swagger)](https://atomtracker.onrender.com/docs)

---

## 🚀 Quick Start (Demo)

Open **[https://atom-tracker-rust.vercel.app](https://atom-tracker-rust.vercel.app)** and use one of the one-click demo login buttons, or enter credentials manually:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@test.com` | `admin` |
| **Manager** | `manager@test.com` | `manager` |
| **Employee** | `employee@test.com` | `employee` |

> ⚠️ **First load takes ~30 seconds** — the backend runs on Render's free tier which sleeps after inactivity. The app auto-retries until the server is awake.

---

## 📋 What It Solves

Atomberg's performance review process ran on fragile Excel sheets — inconsistent formats, no weight validation, no audit trail, and no digital manager review workflow. **AtomTracker** replaces this with a structured, role-based web portal.

### Key Features

| Feature | Description |
|---------|-------------|
| 🎯 **Structured Goal Setting** | Up to 8 goals per sheet. Total weight **enforced at exactly 100%** before submission. Min / Max / Zero / Timeline UoMs with automatic quarterly scoring. |
| ✅ **Manager Approval Flow** | Managers review submitted sheets, inline-edit target/weight, **Approve & Lock** or **Return for Rework** with a comment. |
| 📊 **Quarterly Check-ins** | Once locked, employees log Q1–Q4 actuals. Scores computed automatically. Managers add per-check-in feedback. |
| 🛡️ **Tamper-Evident Audit Trail** | Every change (approve, reject, override, cascade, check-in) is logged with old/new values, timestamp, and actor. Admin can search by any UUID. |
| 🔗 **Cascaded Shared Goals** | Admin pushes a primary goal to multiple employees. Copies are read-only linked — actuals sync automatically from the primary owner. |
| 📈 **Org Analytics & Export** | Charts: users by role, sheets by status, QoQ score trend, per-employee completion matrix. One-click CSV export. |

---

## 🏗️ Architecture

```
Browser (React SPA)
    │  HTTPS /api/*
    ▼
Vercel Edge Network  ──── server-side proxy (no CORS)
    │
    ▼
Render (FastAPI + Uvicorn)
    │  JWT Auth  │  RBAC  │  Audit Log
    ▼
SQLite (SQLAlchemy 2)
```

**Deployment:**
- **Frontend:** [Vercel](https://vercel.com) — `atom-tracker-rust.vercel.app`
- **Backend:** [Render](https://render.com) — `atomtracker.onrender.com`
- **Proxy:** `vercel.json` rewrites `/api/*` → Render (eliminates CORS entirely)

---

## 🛠️ Tech Stack

**Frontend**
- React 19 · Vite 8 · Tailwind CSS v4 · React Router v7
- Recharts · lucide-react

**Backend**
- FastAPI · SQLAlchemy 2 · SQLite · PyJWT (HS256) · bcrypt · Pydantic v2 · Uvicorn

---

## 📁 Repository Structure

```
atomtracker/
├── backend/
│   ├── main.py              # FastAPI app, CORS, startup migration
│   ├── auth.py              # JWT creation/validation, RBAC helpers
│   ├── models.py            # SQLAlchemy models
│   ├── database.py          # Engine, session, startup schema migrations
│   ├── routes_goals.py      # /sheets, /goals, /checkins endpoints
│   ├── routes_checkins.py   # /completion, /team-analytics, progress
│   └── routes_admin.py      # /users, /analytics, /audit-logs, /reports
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx               # Routes (Protected, role-based)
│   │   ├── Layout.jsx            # Sidebar nav + server status banner
│   │   ├── LoginPage.jsx         # Auth + quick demo login buttons
│   │   ├── EmployeeDashboard.jsx # My sheets, filtered views
│   │   ├── SheetDetail.jsx       # Add/edit/delete goals, submit
│   │   ├── EmployeeCheckin.jsx   # Log quarterly actuals + score ring
│   │   ├── ManagerDashboard.jsx  # Team sheets, filtered views
│   │   ├── ManagerSheetDetail.jsx# Approve/reject/inline override
│   │   ├── ManagerCheckin.jsx    # View actuals, add comments
│   │   ├── AdminDashboard.jsx    # Analytics, audit trail, cascade
│   │   ├── UserManagement.jsx    # Full user CRUD
│   │   └── api.js                # Fetch wrapper with retry logic
│   └── vercel.json               # SPA routing + /api/* proxy rewrite
│
├── docs/
│   ├── architecture_diagram.png
│   └── screenshots/              # 10 live demo screenshots
│
├── scripts/
│   └── generate_pdf.py           # Generates SUBMISSION.pdf with clickable links
│
├── SUBMISSION.pdf                # Hackathon submission document
└── SUBMISSION.html               # Printable HTML version
```

---

## 🔌 API Endpoints

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `POST` | `/login` | All | JWT auth |
| `GET` | `/my-sheets` | Employee | Own sheets |
| `POST` | `/sheets` | Employee | Create sheet |
| `POST` | `/sheets/{id}/goals` | Employee | Add goal |
| `PATCH` | `/goals/{id}` | Employee | Edit goal |
| `POST` | `/sheets/{id}/submit` | Employee | Submit (requires weight=100) |
| `GET` | `/team-sheets` | Manager | All team sheets |
| `POST` | `/sheets/{id}/approve` | Manager | Approve & lock |
| `POST` | `/sheets/{id}/reject` | Manager | Return for rework |
| `POST` | `/goals/{id}/override` | Manager/Admin | Edit target/weight |
| `POST` | `/goals/{id}/checkins` | Employee | Log quarterly actual |
| `POST` | `/checkins/{id}/comment` | Manager | Add feedback |
| `POST` | `/goals/{id}/cascade` | Admin | Push goal to employees |
| `GET` | `/analytics` | Admin | Org-wide stats |
| `GET` | `/audit-logs` | Admin | Full audit trail |
| `GET` | `/reports/achievements.csv` | Admin | CSV export |

---

## 📄 Submission Document

The hackathon submission document is `SUBMISSION.pdf` — a 4-page PDF with:
- Working link, GitHub repo, API docs (all **clickable** links)
- Architecture diagram
- Full feature coverage table
- Live demo screenshots (all 3 roles)
- Tech stack & repo structure

To regenerate:
```bash
cd backend
.\venv\Scripts\python.exe ..\scripts\generate_pdf.py
```

---

## 👨‍💻 Built By

**Dharmendra** — Atomquest Hackathon 1.0
