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
from models import User, GoalSheet, Goal, AuditLog, Role, SheetStatus
from auth import require_role
from routes_checkins import compute_score

router = APIRouter()


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


# -------------------- Admin: override goal --------------------

@router.post("/goals/{goal_id}/override", response_model=GoalOut)
def override_goal(
    goal_id: str,
    body: GoalOverride,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(["Admin"])),
):
    if body.target is None and body.weight is None:
        raise HTTPException(400, "Provide at least one of: target, weight")

    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(404, "Goal not found")

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
        changed_by=admin.id,
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
