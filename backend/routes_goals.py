import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User, GoalSheet, Goal, AuditLog, SheetStatus, UOM, Role
from auth import get_curr_user, require_role

router = APIRouter()


# -------------------- Schemas --------------------

class SheetCreate(BaseModel):
    year: str


class SheetOut(BaseModel):
    id: str
    user_id: str
    year: str
    status: SheetStatus
    model_config = {"from_attributes": True}


class GoalCreate(BaseModel):
    title: str
    desc: Optional[str] = None
    thrust_area: Optional[str] = None
    uom: UOM
    target: float
    weight: int
    is_shared: bool = False


class GoalOut(BaseModel):
    id: str
    sheet_id: str
    title: str
    desc: Optional[str] = None
    thrust_area: Optional[str] = None
    uom: UOM
    target: float
    weight: int
    is_shared: bool
    model_config = {"from_attributes": True}


class TeamSheetOut(BaseModel):
    id: str
    year: str
    status: SheetStatus
    user_id: str
    user_name: str
    user_email: str
    total_weight: int
    goal_count: int


# -------------------- Employee: list my sheets --------------------

@router.get("/my-sheets", response_model=list[SheetOut])
def my_sheets(
    db: Session = Depends(get_db),
    user: User = Depends(get_curr_user),
):
    return (
        db.query(GoalSheet)
        .filter(GoalSheet.user_id == user.id)
        .order_by(GoalSheet.year.desc())
        .all()
    )


# -------------------- Employee: create sheet --------------------

@router.post("/sheets", response_model=SheetOut)
def create_sheet(
    body: SheetCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_curr_user),
):
    existing = db.query(GoalSheet).filter(
        GoalSheet.user_id == user.id,
        GoalSheet.year == body.year,
    ).first()
    if existing:
        raise HTTPException(400, f"You already have a sheet for {body.year}")

    sheet = GoalSheet(user_id=user.id, year=body.year, status=SheetStatus.Draft)
    db.add(sheet)
    db.commit()
    db.refresh(sheet)
    return sheet


# -------------------- Employee: add goal --------------------

@router.post("/sheets/{sheet_id}/goals", response_model=GoalOut)
def add_goal(
    sheet_id: str,
    body: GoalCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_curr_user),
):
    sheet = db.query(GoalSheet).filter(GoalSheet.id == sheet_id).first()
    if not sheet:
        raise HTTPException(404, "Sheet not found")
    if sheet.user_id != user.id:
        raise HTTPException(403, "Not your sheet")
    if sheet.status != SheetStatus.Draft:
        raise HTTPException(400, "Goals can only be added to a Draft sheet")

    if body.weight < 10:
        raise HTTPException(400, "Goal weight must be at least 10")

    count = db.query(Goal).filter(Goal.sheet_id == sheet_id).count()
    if count >= 8:
        raise HTTPException(400, "Sheet already has the maximum of 8 goals")

    goal = Goal(
        sheet_id=sheet_id,
        title=body.title,
        desc=body.desc,
        thrust_area=body.thrust_area,
        uom=body.uom,
        target=body.target,
        weight=body.weight,
        is_shared=body.is_shared,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


# -------------------- Employee: submit sheet --------------------

@router.post("/sheets/{sheet_id}/submit")
def submit_sheet(
    sheet_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_curr_user),
):
    sheet = db.query(GoalSheet).filter(GoalSheet.id == sheet_id).first()
    if not sheet:
        raise HTTPException(404, "Sheet not found")
    if sheet.user_id != user.id:
        raise HTTPException(403, "Not your sheet")
    if sheet.status != SheetStatus.Draft:
        raise HTTPException(400, "Sheet is already submitted or locked")

    total = sum(g.weight for g in sheet.goals)
    if total != 100:
        raise HTTPException(400, f"Goal weights must sum to exactly 100 (current: {total})")

    sheet.status = SheetStatus.Submitted
    db.commit()
    return {"msg": "Sheet submitted", "sheet_id": sheet.id, "status": sheet.status.value}


# -------------------- Manager: view team sheets --------------------

@router.get("/team-sheets", response_model=list[TeamSheetOut])
def team_sheets(
    db: Session = Depends(get_db),
    mgr: User = Depends(require_role(["Manager", "Admin"])),
):
    rows = (
        db.query(GoalSheet, User)
        .join(User, GoalSheet.user_id == User.id)
        .filter(
            User.mgr_id == mgr.id,
            GoalSheet.status.in_([SheetStatus.Submitted, SheetStatus.Locked]),
        )
        .all()
    )
    out = []
    for sheet, owner in rows:
        total = sum(g.weight for g in sheet.goals)
        out.append(TeamSheetOut(
            id=sheet.id,
            year=sheet.year,
            status=sheet.status,
            user_id=owner.id,
            user_name=owner.name,
            user_email=owner.email,
            total_weight=total,
            goal_count=len(sheet.goals),
        ))
    return out


# -------------------- Manager: approve & lock --------------------

@router.post("/sheets/{sheet_id}/approve")
def approve_sheet(
    sheet_id: str,
    db: Session = Depends(get_db),
    mgr: User = Depends(require_role(["Manager", "Admin"])),
):
    sheet = db.query(GoalSheet).filter(GoalSheet.id == sheet_id).first()
    if not sheet:
        raise HTTPException(404, "Sheet not found")
    if sheet.status != SheetStatus.Submitted:
        raise HTTPException(400, "Only Submitted sheets can be approved")

    # Managers can only approve their own reports' sheets. Admin can approve anything.
    if mgr.role == Role.Manager:
        owner = db.query(User).filter(User.id == sheet.user_id).first()
        if not owner or owner.mgr_id != mgr.id:
            raise HTTPException(403, "This employee does not report to you")

    sheet.status = SheetStatus.Locked

    db.add(AuditLog(
        entity_type="GoalSheet",
        entity_id=sheet.id,
        changed_by=mgr.id,
        action="approve",
        old_value=json.dumps({"status": "Submitted"}),
        new_value=json.dumps({"status": "Locked"}),
    ))

    db.commit()
    return {"msg": "Sheet approved and locked", "sheet_id": sheet.id, "status": sheet.status.value}
