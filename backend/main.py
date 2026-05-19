from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import Base, engine, get_db, run_migrations
from models import User, Role
from auth import hash_pw, verify_pw, create_token
from routes_goals import router as goals_router
from routes_checkins import router as checkins_router
from routes_admin import router as admin_router

Base.metadata.create_all(bind=engine)
run_migrations()  # safely add any missing columns to the existing DB

app = FastAPI(title="AtomTracker")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(goals_router)
app.include_router(checkins_router)
app.include_router(admin_router)


class LoginIn(BaseModel):
    email: str
    password: str


class LoginOut(BaseModel):
    token: str
    role: str
    name: str


@app.get("/")
def root():
    return {"app": "AtomTracker", "status": "ok"}


@app.post("/login", response_model=LoginOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_pw(body.password, user.hashed_pw):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Wrong email or password")

    token = create_token(user.id, user.role.value)
    return LoginOut(token=token, role=user.role.value, name=user.name)


@app.get("/setup-demo")
def setup_demo(db: Session = Depends(get_db)):
    """Idempotently seed demo accounts + rich pre-made data for judges."""
    from models import GoalSheet, Goal, CheckIn, AuditLog, SheetStatus, UOM, Quarter, CheckInStatus
    import json

    def upsert_user(name, email, password, role, mgr_id=None):
        u = db.query(User).filter(User.email == email).first()
        if u:
            if mgr_id and u.mgr_id != mgr_id:
                u.mgr_id = mgr_id
                db.commit()
            return u
        u = User(name=name, email=email, hashed_pw=hash_pw(password), role=role, mgr_id=mgr_id)
        db.add(u); db.commit(); db.refresh(u)
        return u

    # ── Core users ──
    admin = upsert_user("Admin HR",       "admin@test.com",    "admin",     Role.Admin)
    mgr   = upsert_user("Priya Manager",  "manager@test.com",  "manager",   Role.Manager)
    emp1  = upsert_user("Rahul Employee", "employee@test.com", "employee",  Role.Employee, mgr_id=mgr.id)
    emp2  = upsert_user("Sneha Kapoor",   "sneha@test.com",    "employee2", Role.Employee, mgr_id=mgr.id)

    created = []

    def has_sheet(user_id, year):
        return db.query(GoalSheet).filter(GoalSheet.user_id == user_id, GoalSheet.year == year).first()

    def seed_sheet(owner, year, goals_data, sheet_status, seed_checkins=False):
        if has_sheet(owner.id, year):
            return
        sheet = GoalSheet(user_id=owner.id, year=year, status=SheetStatus(sheet_status))
        db.add(sheet); db.commit(); db.refresh(sheet)

        db.add(AuditLog(entity_type="sheet", entity_id=sheet.id,
                        changed_by=owner.id, action="create",
                        old_value=None,
                        new_value=json.dumps({"status": sheet_status, "year": year})))
        if sheet_status in ("Submitted", "Locked"):
            db.add(AuditLog(entity_type="sheet", entity_id=sheet.id,
                            changed_by=owner.id, action="approve",
                            old_value=json.dumps({"status": "Submitted"}),
                            new_value=json.dumps({"status": sheet_status})))
        db.commit()

        for g in goals_data:
            goal = Goal(
                sheet_id=sheet.id, title=g["title"], desc=g.get("desc"),
                thrust_area=g.get("thrust_area"), uom=UOM(g["uom"]),
                target=g["target"], weight=g["weight"],
            )
            db.add(goal); db.commit(); db.refresh(goal)

            if seed_checkins and sheet_status == "Locked":
                for ci in g.get("checkins", []):
                    db.add(CheckIn(
                        goal_id=goal.id, qtr=Quarter(ci["qtr"]),
                        actual=ci["actual"], status=CheckInStatus(ci["status"]),
                    ))
                    db.add(AuditLog(entity_type="checkin", entity_id=goal.id,
                                    changed_by=owner.id, action="update_actual",
                                    old_value=None,
                                    new_value=json.dumps({"qtr": ci["qtr"], "actual": ci["actual"]})))
        db.commit()
        created.append({"owner": owner.email, "year": year, "status": sheet_status})

    # ── Rahul: Locked 2026 sheet with Q1 + Q2 check-ins already logged ──
    seed_sheet(emp1, "2026", sheet_status="Locked", seed_checkins=True, goals_data=[
        {"title": "Increase Monthly Revenue", "thrust_area": "Sales", "uom": "Min",
         "target": 500000, "weight": 30, "desc": "Grow monthly revenue to ₹5L by year-end",
         "checkins": [
             {"qtr": "Q1", "actual": 480000, "status": "On Track"},
             {"qtr": "Q2", "actual": 520000, "status": "Completed"},
         ]},
        {"title": "Reduce Customer TAT", "thrust_area": "Operations", "uom": "Max",
         "target": 24, "weight": 25, "desc": "Cut support ticket turnaround to 24 hrs",
         "checkins": [
             {"qtr": "Q1", "actual": 30, "status": "On Track"},
             {"qtr": "Q2", "actual": 22, "status": "Completed"},
         ]},
        {"title": "Zero Safety Incidents", "thrust_area": "Safety", "uom": "Zero",
         "target": 0, "weight": 20, "desc": "Maintain zero workplace safety incidents",
         "checkins": [
             {"qtr": "Q1", "actual": 0, "status": "Completed"},
             {"qtr": "Q2", "actual": 0, "status": "Completed"},
         ]},
        {"title": "Complete Product Training", "thrust_area": "L&D", "uom": "Timeline",
         "target": 100, "weight": 25, "desc": "Finish all assigned product certifications",
         "checkins": [
             {"qtr": "Q1", "actual": 60, "status": "On Track"},
             {"qtr": "Q2", "actual": 85, "status": "On Track"},
         ]},
    ])

    # ── Rahul: Draft 2025 sheet — judge can add goals, submit, see the flow ──
    seed_sheet(emp1, "2025", sheet_status="Draft", goals_data=[
        {"title": "Expand Client Base", "thrust_area": "Sales", "uom": "Min",
         "target": 20, "weight": 40, "desc": "Add 20 new enterprise clients this year"},
        {"title": "Improve NPS Score", "thrust_area": "CX", "uom": "Min",
         "target": 75, "weight": 35, "desc": "Achieve NPS score of 75+"},
        {"title": "Internal Audit Compliance", "thrust_area": "Compliance", "uom": "Timeline",
         "target": 100, "weight": 25, "desc": "100% compliance on all internal audits"},
    ])

    # ── Sneha: Submitted 2026 sheet awaiting manager approval ──
    seed_sheet(emp2, "2026", sheet_status="Submitted", goals_data=[
        {"title": "Launch 3 New Features", "thrust_area": "Product", "uom": "Timeline",
         "target": 3, "weight": 35, "desc": "Ship 3 major product features by Q3"},
        {"title": "Reduce Bug Backlog", "thrust_area": "Engineering", "uom": "Max",
         "target": 10, "weight": 30, "desc": "Keep open bugs below 10 at all times"},
        {"title": "Team Mentorship", "thrust_area": "People", "uom": "Min",
         "target": 4, "weight": 20, "desc": "Mentor 4 junior engineers this year"},
        {"title": "Cost Optimisation", "thrust_area": "Finance", "uom": "Max",
         "target": 50000, "weight": 15, "desc": "Reduce infra spend by ₹50K"},
    ])

    return {
        "msg": "Demo data ready ✓",
        "logins": [
            {"email": "admin@test.com",    "password": "admin",     "role": "Admin/HR"},
            {"email": "manager@test.com",  "password": "manager",   "role": "Manager"},
            {"email": "employee@test.com", "password": "employee",  "role": "Employee — Rahul (Locked FY2026 with Q1+Q2 done; Draft FY2025 to play with)"},
            {"email": "sneha@test.com",    "password": "employee2", "role": "Employee — Sneha (FY2026 submitted, awaiting manager review)"},
        ],
        "seeded": created,
    }
