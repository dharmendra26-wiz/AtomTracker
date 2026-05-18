import csv
import io
import json
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import User, GoalSheet, Goal, AuditLog, CheckIn, Role, SheetStatus, Quarter
from auth import require_role, hash_pw
from routes_checkins import compute_score

router = APIRouter()


# -------------------- User Management (Admin) --------------------

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: Role
    mgr_id: Optional[str] = None


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: Role
    mgr_id: Optional[str] = None
    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[Role] = None
    mgr_id: Optional[str] = None
    password: Optional[str] = None


@router.get("/users", response_model=List[UserOut])
def list_users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(["Admin"])),
):
    return db.query(User).order_by(User.name).all()


@router.post("/users", response_model=UserOut)
def create_user(
    body: UserCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(["Admin"])),
):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(400, "Email already in use")
    user = User(
        name=body.name,
        email=body.email,
        hashed_pw=hash_pw(body.password),
        role=body.role,
        mgr_id=body.mgr_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: str,
    body: UserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(["Admin"])),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    if body.name:
        user.name = body.name
    if body.role:
        user.role = body.role
    if body.mgr_id is not None:
        user.mgr_id = body.mgr_id or None
    if body.password:
        user.hashed_pw = hash_pw(body.password)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(["Admin"])),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    if user.role == Role.Admin:
        raise HTTPException(400, "Cannot delete an Admin account")
    db.delete(user)
    db.commit()
    return {"msg": "User deleted", "user_id": user_id}


# -------------------- QoQ Analytics --------------------

class QoQPoint(BaseModel):
    quarter: str
    avg_score: float
    completed_count: int


class QoQOut(BaseModel):
    year: str
    points: List[QoQPoint]


@router.get("/analytics/qoq", response_model=QoQOut)
def qoq_analytics(
    year: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(["Admin"])),
):
    """Quarter-on-Quarter average achievement score across all employees."""
    y = year or str(datetime.now().year)
    quarters = [Quarter.Q1, Quarter.Q2, Quarter.Q3, Quarter.Q4]
    points = []

    for qtr in quarters:
        checkins = (
            db.query(CheckIn, Goal)
            .join(Goal, CheckIn.goal_id == Goal.id)
            .join(GoalSheet, Goal.sheet_id == GoalSheet.id)
            .filter(GoalSheet.year == y, CheckIn.qtr == qtr, CheckIn.actual.isnot(None))
            .all()
        )
        scores = [
            compute_score(goal.uom.value, goal.target, ci.actual)
            for ci, goal in checkins
        ]
        avg = round(sum(scores) / len(scores), 2) if scores else 0.0
        points.append(QoQPoint(
            quarter=qtr.value,
            avg_score=avg,
            completed_count=len(scores),
        ))

    return QoQOut(year=y, points=points)


# -------------------- Manager Team Analytics --------------------

class TeamMemberStat(BaseModel):
    user_id: str
    user_name: str
    user_email: str
    sheet_status: Optional[str] = None
    goal_count: int
    overall_score: float


@router.get("/team-analytics", response_model=List[TeamMemberStat])
def team_analytics(
    year: Optional[str] = None,
    db: Session = Depends(get_db),
    mgr: User = Depends(require_role(["Manager", "Admin"])),
):
    """Per-employee score summary for the manager's team."""
    y = year or str(datetime.now().year)
    reports = db.query(User).filter(User.mgr_id == mgr.id).all()
    result = []
    for emp in reports:
        sheet = db.query(GoalSheet).filter(
            GoalSheet.user_id == emp.id,
            GoalSheet.year == y,
        ).first()
        if not sheet:
            result.append(TeamMemberStat(
                user_id=emp.id, user_name=emp.name, user_email=emp.email,
                sheet_status=None, goal_count=0, overall_score=0.0,
            ))
            continue
        weighted_sum = 0.0
        total_weight = 0
        for goal in sheet.goals:
            effective = goal.source if goal.source_goal_id else goal
            ckins = sorted(effective.checkins, key=lambda c: c.qtr.value)
            latest = ckins[-1] if ckins else None
            score = compute_score(goal.uom.value, goal.target, latest.actual) if (latest and latest.actual is not None) else 0.0
            weighted_sum += score * goal.weight
            total_weight += goal.weight
        overall = round(weighted_sum / total_weight, 2) if total_weight else 0.0
        result.append(TeamMemberStat(
            user_id=emp.id, user_name=emp.name, user_email=emp.email,
            sheet_status=sheet.status.value, goal_count=len(sheet.goals), overall_score=overall,
        ))
    return result




# -------------------- Schemas --------------------

class GoalOverride(BaseModel):
    target: Optional[float] = None
    weight: Optional[int] = None


class GoalOut(BaseModel):
    id: str
    title: str
    target: float
    weight: int
    model_config = {"from_attributes": True}


class AuditLogOut(BaseModel):
    id: str
    entity_type: str
    entity_id: str
    changed_by: str
    action: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    timestamp: datetime
    model_config = {"from_attributes": True}


class Analytics(BaseModel):
    users_by_role: dict
    sheets_by_status: dict
    goals_by_thrust_area: dict
    totals: dict


# -------------------- Cascade (Shared Goals) --------------------

class CascadeIn(BaseModel):
    employee_emails: List[str]
    year: str
    default_weight: int = 10


class CascadeResult(BaseModel):
    email: str
    status: str  # "cloned" | "already shared" | "skipped: <reason>"
    new_goal_id: Optional[str] = None


@router.post("/goals/{goal_id}/cascade", response_model=List[CascadeResult])
def cascade_goal(
    goal_id: str,
    body: CascadeIn,
    db: Session = Depends(get_db),
    actor: User = Depends(require_role(["Admin", "Manager"])),
):
    """Push a goal to multiple employees' Draft sheets as shared copies."""
    from models import GoalSheet  # local import keeps top of file tidy

    source = db.query(Goal).filter(Goal.id == goal_id).first()
    if not source:
        raise HTTPException(404, "Source goal not found")
    if source.source_goal_id is not None:
        raise HTTPException(400, "Cannot cascade a goal that is itself a shared copy. Use the primary goal.")
    if body.default_weight < 10:
        raise HTTPException(400, "default_weight must be at least 10")

    # Mark the source as shared so the UI can show a "Primary" badge.
    source.is_shared = True

    results: List[CascadeResult] = []
    for email in body.employee_emails:
        email = email.strip().lower()
        if not email:
            continue

        recipient = db.query(User).filter(User.email == email).first()
        if not recipient:
            results.append(CascadeResult(email=email, status="skipped: user not found"))
            continue

        # Manager scoping: can only cascade to direct reports. Admin bypasses.
        if actor.role == Role.Manager and recipient.mgr_id != actor.id:
            results.append(CascadeResult(email=email, status="skipped: not your direct report"))
            continue

        if recipient.id == source.sheet.user_id:
            results.append(CascadeResult(email=email, status="skipped: source owner"))
            continue

        # Find or auto-create a Draft sheet for the given year.
        sheet = db.query(GoalSheet).filter(
            GoalSheet.user_id == recipient.id,
            GoalSheet.year == body.year,
        ).first()
        if not sheet:
            sheet = GoalSheet(user_id=recipient.id, year=body.year, status=SheetStatus.Draft)
            db.add(sheet)
            db.flush()
        elif sheet.status != SheetStatus.Draft:
            results.append(CascadeResult(email=email, status=f"skipped: sheet is {sheet.status.value}"))
            continue

        # Already cascaded to this employee?
        existing = db.query(Goal).filter(
            Goal.sheet_id == sheet.id,
            Goal.source_goal_id == source.id,
        ).first()
        if existing:
            results.append(CascadeResult(email=email, status="already shared", new_goal_id=existing.id))
            continue

        # 8-goal cap
        goal_count = db.query(Goal).filter(Goal.sheet_id == sheet.id).count()
        if goal_count >= 8:
            results.append(CascadeResult(email=email, status="skipped: 8-goal cap reached"))
            continue

        copy = Goal(
            sheet_id=sheet.id,
            title=source.title,
            desc=source.desc,
            thrust_area=source.thrust_area,
            uom=source.uom,
            target=source.target,
            weight=body.default_weight,
            is_shared=True,
            source_goal_id=source.id,
        )
        db.add(copy)
        db.flush()
        results.append(CascadeResult(email=email, status="cloned", new_goal_id=copy.id))

        db.add(AuditLog(
            entity_type="Goal",
            entity_id=copy.id,
            changed_by=actor.id,
            action="cascade",
            old_value=None,
            new_value=json.dumps({
                "source_goal_id": source.id,
                "to_user": recipient.email,
                "year": body.year,
            }),
        ))

    db.commit()
    return results


# -------------------- Admin: override goal --------------------

@router.post("/goals/{goal_id}/override", response_model=GoalOut)
def override_goal(
    goal_id: str,
    body: GoalOverride,
    db: Session = Depends(get_db),
    actor: User = Depends(require_role(["Admin", "Manager"])),
):
    """Admins can override any goal anytime. Managers can edit goals on Submitted sheets they own."""
    if body.target is None and body.weight is None:
        raise HTTPException(400, "Provide at least one of: target, weight")

    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(404, "Goal not found")

    # Shared-copy protection: title/target are owned by the primary.
    if goal.source_goal_id is not None and body.target is not None:
        raise HTTPException(400, "Cannot change target on a shared copy. Edit the primary goal instead.")

    sheet = db.query(GoalSheet).filter(GoalSheet.id == goal.sheet_id).first()

    if actor.role == Role.Manager:
        owner = db.query(User).filter(User.id == sheet.user_id).first()
        if not owner or owner.mgr_id != actor.id:
            raise HTTPException(403, "This employee does not report to you")
        if sheet.status != SheetStatus.Submitted:
            raise HTTPException(
                400,
                "Managers can only inline-edit goals while the sheet is Submitted (not yet locked)",
            )

    old = {"target": goal.target, "weight": goal.weight}
    new = dict(old)

    if body.target is not None:
        goal.target = body.target
        new["target"] = body.target
    if body.weight is not None:
        goal.weight = body.weight
        new["weight"] = body.weight

    log = AuditLog(
        entity_type="Goal",
        entity_id=goal.id,
        changed_by=actor.id,
        action="override",
        old_value=json.dumps(old),
        new_value=json.dumps(new),
    )
    db.add(log)
    db.commit()
    db.refresh(goal)
    return goal


# -------------------- Admin: view audit logs --------------------

@router.get("/audit-logs", response_model=List[AuditLogOut])
def all_audit_logs(
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(["Admin"])),
):
    return (
        db.query(AuditLog)
        .order_by(AuditLog.timestamp.desc())
        .limit(50)
        .all()
    )


@router.get("/audit-logs/{entity_id}", response_model=List[AuditLogOut])
def get_audit_logs(
    entity_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(["Admin"])),
):
    return (
        db.query(AuditLog)
        .filter(AuditLog.entity_id == entity_id)
        .order_by(AuditLog.timestamp.desc())
        .all()
    )


# -------------------- Admin: analytics --------------------

@router.get("/analytics", response_model=Analytics)
def analytics(
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(["Admin"])),
):
    users_by_role = {
        role.value: 0 for role in Role
    }
    for role, count in db.query(User.role, func.count(User.id)).group_by(User.role).all():
        users_by_role[role.value] = count

    sheets_by_status = {
        s.value: 0 for s in SheetStatus
    }
    for status, count in db.query(GoalSheet.status, func.count(GoalSheet.id)).group_by(GoalSheet.status).all():
        sheets_by_status[status.value] = count

    goals_by_thrust_area = {}
    for area, count in db.query(Goal.thrust_area, func.count(Goal.id)).group_by(Goal.thrust_area).all():
        key = area if area else "Unassigned"
        goals_by_thrust_area[key] = count

    totals = {
        "users": sum(users_by_role.values()),
        "sheets": sum(sheets_by_status.values()),
        "goals": sum(goals_by_thrust_area.values()),
    }

    return Analytics(
        users_by_role=users_by_role,
        sheets_by_status=sheets_by_status,
        goals_by_thrust_area=goals_by_thrust_area,
        totals=totals,
    )


# -------------------- Completion Dashboard --------------------

class CompletionRow(BaseModel):
    user_id: str
    user_name: str
    user_email: str
    manager_email: Optional[str] = None
    sheet_id: Optional[str] = None
    sheet_status: Optional[str] = None
    goals_count: int
    q1: bool
    q2: bool
    q3: bool
    q4: bool


class CompletionOut(BaseModel):
    year: str
    employees: List[CompletionRow]
    summary: dict


@router.get("/completion", response_model=CompletionOut)
def completion_dashboard(
    year: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(["Admin"])),
):
    """Per-employee check-in completion matrix for the given year."""
    from models import CheckIn

    y = year or str(datetime.now().year)
    employees = db.query(User).filter(User.role == Role.Employee).order_by(User.name).all()

    rows: List[CompletionRow] = []
    totals = {"Q1": 0, "Q2": 0, "Q3": 0, "Q4": 0}

    for u in employees:
        mgr = db.query(User).filter(User.id == u.mgr_id).first() if u.mgr_id else None
        sheet = db.query(GoalSheet).filter(
            GoalSheet.user_id == u.id, GoalSheet.year == y
        ).first()

        quarter_done = {"Q1": False, "Q2": False, "Q3": False, "Q4": False}
        goals_count = 0
        if sheet:
            goals_count = len(sheet.goals)
            # A quarter counts as "done" if every owned (non-shared-copy) goal has a check-in for it.
            owned = [g for g in sheet.goals if g.source_goal_id is None]
            for q in ["Q1", "Q2", "Q3", "Q4"]:
                if owned:
                    quarter_done[q] = all(
                        any(c.qtr.value == q for c in g.checkins) for g in owned
                    )

        for q, ok in quarter_done.items():
            if ok:
                totals[q] += 1

        rows.append(CompletionRow(
            user_id=u.id,
            user_name=u.name,
            user_email=u.email,
            manager_email=mgr.email if mgr else None,
            sheet_id=sheet.id if sheet else None,
            sheet_status=sheet.status.value if sheet else None,
            goals_count=goals_count,
            q1=quarter_done["Q1"], q2=quarter_done["Q2"],
            q3=quarter_done["Q3"], q4=quarter_done["Q4"],
        ))

    headcount = len(employees)
    summary = {
        "headcount": headcount,
        "with_sheet": sum(1 for r in rows if r.sheet_id),
        "locked_sheets": sum(1 for r in rows if r.sheet_status == "Locked"),
        "q1_pct": round(100 * totals["Q1"] / headcount, 1) if headcount else 0,
        "q2_pct": round(100 * totals["Q2"] / headcount, 1) if headcount else 0,
        "q3_pct": round(100 * totals["Q3"] / headcount, 1) if headcount else 0,
        "q4_pct": round(100 * totals["Q4"] / headcount, 1) if headcount else 0,
    }

    return CompletionOut(year=y, employees=rows, summary=summary)


# -------------------- Admin: achievement CSV report --------------------

@router.get("/reports/achievements.csv")
def achievements_csv(
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(["Admin"])),
):
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow([
        "Employee Name", "Sheet Year", "Thrust Area", "Goal Title",
        "UoM", "Target", "Latest Actual", "Computed Score",
    ])

    rows = (
        db.query(Goal, GoalSheet, User)
        .join(GoalSheet, Goal.sheet_id == GoalSheet.id)
        .join(User, GoalSheet.user_id == User.id)
        .order_by(User.name, GoalSheet.year)
        .all()
    )

    for goal, sheet, owner in rows:
        checkins = sorted(goal.checkins, key=lambda c: c.qtr.value)
        latest = checkins[-1] if checkins else None
        actual = latest.actual if (latest and latest.actual is not None) else ""
        score = (
            round(compute_score(goal.uom.value, goal.target, latest.actual), 2)
            if (latest and latest.actual is not None) else 0.0
        )
        w.writerow([
            owner.name, sheet.year, goal.thrust_area or "", goal.title,
            goal.uom.value, goal.target, actual, score,
        ])

    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="achievements.csv"'},
    )
