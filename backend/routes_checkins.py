import json
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import (
    User, GoalSheet, Goal, CheckIn, AuditLog,
    SheetStatus, Quarter, CheckInStatus, UOM, Role,
)
from auth import get_curr_user, require_role

router = APIRouter()


# -------------------- Score helper --------------------

def compute_score(uom: str, target: float, actual: float) -> float:
    """Percentage score (0-100) for a single goal based on its UOM."""
    if actual is None:
        return 0.0

    if uom == "Min":  # higher actual is better
        if target == 0:
            return 0.0
        return min((actual / target) * 100, 100.0)

    if uom == "Max":  # lower actual is better
        try:
            return min((target / actual) * 100, 100.0)
        except ZeroDivisionError:
            return 0.0

    if uom == "Zero":
        return 100.0 if actual == 0 else 0.0

    if uom == "Timeline":
        return float(actual)

    return 0.0


# -------------------- Schemas --------------------

class CheckInCreate(BaseModel):
    qtr: Quarter
    actual: float
    status: Optional[CheckInStatus] = None


class CheckInOut(BaseModel):
    id: str
    goal_id: str
    qtr: Quarter
    actual: Optional[float] = None
    status: CheckInStatus
    mgr_comment: Optional[str] = None
    model_config = {"from_attributes": True}


class CommentIn(BaseModel):
    comment: str


class GoalProgress(BaseModel):
    id: str
    title: str
    uom: UOM
    target: float
    weight: int
    score: float
    checkins: List[CheckInOut]
    source_goal_id: Optional[str] = None
    is_shared: bool = False


class SheetProgress(BaseModel):
    sheet_id: str
    year: str
    status: SheetStatus
    overall_score: float
    goals: List[GoalProgress]
    reject_comment: Optional[str] = None


# -------------------- Employee: log check-in --------------------

@router.post("/goals/{goal_id}/checkins", response_model=CheckInOut)
def log_checkin(
    goal_id: str,
    body: CheckInCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_curr_user),
):
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(404, "Goal not found")

    if goal.source_goal_id is not None:
        raise HTTPException(
            400,
            "This is a shared goal copy. Actuals are owned by the primary owner and will sync automatically.",
        )

    sheet = db.query(GoalSheet).filter(GoalSheet.id == goal.sheet_id).first()
    if sheet.user_id != user.id:
        raise HTTPException(403, "Not your goal")
    if sheet.status != SheetStatus.Locked:
        raise HTTPException(400, "Sheet must be approved (Locked) before logging check-ins")

    # One check-in per (goal, quarter) — upsert keeps the dashboard clean.
    existing = db.query(CheckIn).filter(
        CheckIn.goal_id == goal_id,
        CheckIn.qtr == body.qtr,
    ).first()

    if existing:
        old_actual = existing.actual
        existing.actual = body.actual
        if body.status is not None:
            existing.status = body.status

        db.add(AuditLog(
            entity_type="CheckIn",
            entity_id=existing.id,
            changed_by=user.id,
            action="update_actual",
            old_value=json.dumps({"actual": old_actual}),
            new_value=json.dumps({"actual": body.actual}),
        ))

        db.commit()
        db.refresh(existing)
        return existing

    checkin = CheckIn(
        goal_id=goal_id,
        qtr=body.qtr,
        actual=body.actual,
        status=body.status or CheckInStatus.OnTrack,
    )
    db.add(checkin)
    db.commit()
    db.refresh(checkin)
    return checkin


# -------------------- Manager: add comment --------------------

@router.post("/checkins/{checkin_id}/comment", response_model=CheckInOut)
def add_comment(
    checkin_id: str,
    body: CommentIn,
    db: Session = Depends(get_db),
    mgr: User = Depends(require_role(["Manager", "Admin"])),
):
    checkin = db.query(CheckIn).filter(CheckIn.id == checkin_id).first()
    if not checkin:
        raise HTTPException(404, "Check-in not found")

    # A Manager can only comment on their own reports; Admin can comment anywhere.
    if mgr.role == Role.Manager:
        goal = db.query(Goal).filter(Goal.id == checkin.goal_id).first()
        sheet = db.query(GoalSheet).filter(GoalSheet.id == goal.sheet_id).first()
        owner = db.query(User).filter(User.id == sheet.user_id).first()
        if not owner or owner.mgr_id != mgr.id:
            raise HTTPException(403, "This employee does not report to you")

    checkin.mgr_comment = body.comment
    db.commit()
    db.refresh(checkin)
    return checkin


# -------------------- Progress dashboard --------------------

_QTR_ORDER = {Quarter.Q1: 1, Quarter.Q2: 2, Quarter.Q3: 3, Quarter.Q4: 4}


@router.get("/sheets/{sheet_id}/progress", response_model=SheetProgress)
def sheet_progress(
    sheet_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_curr_user),
):
    sheet = db.query(GoalSheet).filter(GoalSheet.id == sheet_id).first()
    if not sheet:
        raise HTTPException(404, "Sheet not found")

    # Owner, their manager, or admin can view.
    if user.role != Role.Admin and sheet.user_id != user.id:
        owner = db.query(User).filter(User.id == sheet.user_id).first()
        if not owner or owner.mgr_id != user.id:
            raise HTTPException(403, "You don't have access to this sheet")

    goals_out: List[GoalProgress] = []
    weighted_sum = 0.0
    total_weight = 0

    for goal in sheet.goals:
        # Shared copies read their check-ins from the primary goal.
        effective = goal.source if goal.source_goal_id else goal
        ckins_sorted = sorted(effective.checkins, key=lambda c: _QTR_ORDER[c.qtr])
        latest = ckins_sorted[-1] if ckins_sorted else None

        if latest and latest.actual is not None:
            score = compute_score(goal.uom.value, goal.target, latest.actual)
        else:
            score = 0.0

        weighted_sum += score * goal.weight
        total_weight += goal.weight

        goals_out.append(GoalProgress(
            id=goal.id,
            title=goal.title,
            uom=goal.uom,
            target=goal.target,
            weight=goal.weight,
            score=round(score, 2),
            checkins=ckins_sorted,
            source_goal_id=goal.source_goal_id,
            is_shared=goal.is_shared,
        ))

    overall = round(weighted_sum / total_weight, 2) if total_weight else 0.0

    return SheetProgress(
        sheet_id=sheet.id,
        year=sheet.year,
        status=sheet.status,
        overall_score=overall,
        goals=goals_out,
        reject_comment=sheet.reject_comment,
    )
