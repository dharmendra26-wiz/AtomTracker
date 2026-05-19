import json
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User, GoalSheet, Goal, AuditLog, SheetStatus, UOM, Role, SheetComment
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
    reject_comment: Optional[str] = None
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


class RejectIn(BaseModel):
    comment: str


class GoalUpdate(BaseModel):
    title: Optional[str] = None
    desc: Optional[str] = None
    thrust_area: Optional[str] = None
    uom: Optional[UOM] = None
    target: Optional[float] = None
    weight: Optional[int] = None


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


# -------------------- Employee: update goal weight --------------------

class WeightUpdate(BaseModel):
    weight: int


@router.patch("/goals/{goal_id}/weight")
def update_goal_weight(
    goal_id: str,
    body: WeightUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_curr_user),
):
    """Sheet owner adjusts weight on their own goals (shared or not) in Draft state."""
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(404, "Goal not found")

    sheet = db.query(GoalSheet).filter(GoalSheet.id == goal.sheet_id).first()
    if sheet.user_id != user.id:
        raise HTTPException(403, "Not your goal")
    if sheet.status != SheetStatus.Draft:
        raise HTTPException(400, "Weights can only be changed while the sheet is Draft")
    if body.weight < 10:
        raise HTTPException(400, "Weight must be at least 10")

    goal.weight = body.weight
    db.commit()
    return {"msg": "Weight updated", "goal_id": goal.id, "weight": goal.weight}


# -------------------- Employee: edit goal --------------------

@router.patch("/goals/{goal_id}", response_model=GoalOut)
def update_goal(
    goal_id: str,
    body: GoalUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_curr_user),
):
    """Edit any goal field while the sheet is still Draft."""
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(404, "Goal not found")

    sheet = db.query(GoalSheet).filter(GoalSheet.id == goal.sheet_id).first()
    if sheet.user_id != user.id:
        raise HTTPException(403, "Not your goal")
    if sheet.status != SheetStatus.Draft:
        raise HTTPException(400, "Goals can only be edited in Draft state")

    if goal.source_goal_id:
        # Shared copies: only weight is editable
        if any(v is not None for v in [body.title, body.desc, body.thrust_area, body.uom, body.target]):
            raise HTTPException(400, "Shared goals — only weight can be changed")

    if body.title is not None:
        goal.title = body.title
    if body.desc is not None:
        goal.desc = body.desc
    if body.thrust_area is not None:
        goal.thrust_area = body.thrust_area
    if body.uom is not None:
        goal.uom = body.uom
    if body.target is not None:
        goal.target = body.target
    if body.weight is not None:
        if body.weight < 10:
            raise HTTPException(400, "Weight must be at least 10")
        goal.weight = body.weight

    db.commit()
    db.refresh(goal)
    return goal


# -------------------- Employee: delete goal --------------------

@router.delete("/goals/{goal_id}")
def delete_goal(
    goal_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_curr_user),
):
    """Delete a goal (only allowed while the sheet is Draft)."""
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(404, "Goal not found")

    sheet = db.query(GoalSheet).filter(GoalSheet.id == goal.sheet_id).first()
    if sheet.user_id != user.id:
        raise HTTPException(403, "Not your goal")
    if sheet.status != SheetStatus.Draft:
        raise HTTPException(400, "Goals can only be deleted from a Draft sheet")
    if goal.source_goal_id:
        raise HTTPException(400, "Shared goals cannot be deleted — contact Admin")

    db.delete(goal)
    db.commit()
    return {"msg": "Goal deleted", "goal_id": goal_id}


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
    sheet.reject_comment = None  # clear any stale rework note on re-submit
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


# -------------------- Manager: return for rework --------------------

@router.post("/sheets/{sheet_id}/reject")
def reject_sheet(
    sheet_id: str,
    body: RejectIn,
    db: Session = Depends(get_db),
    mgr: User = Depends(require_role(["Manager", "Admin"])),
):
    """Send a Submitted sheet back to Draft with a rework comment."""
    if not body.comment or not body.comment.strip():
        raise HTTPException(400, "A rework comment is required")

    sheet = db.query(GoalSheet).filter(GoalSheet.id == sheet_id).first()
    if not sheet:
        raise HTTPException(404, "Sheet not found")
    if sheet.status != SheetStatus.Submitted:
        raise HTTPException(400, "Only Submitted sheets can be returned for rework")

    if mgr.role == Role.Manager:
        owner = db.query(User).filter(User.id == sheet.user_id).first()
        if not owner or owner.mgr_id != mgr.id:
            raise HTTPException(403, "This employee does not report to you")

    sheet.status = SheetStatus.Draft
    sheet.reject_comment = body.comment.strip()

    db.add(AuditLog(
        entity_type="GoalSheet",
        entity_id=sheet.id,
        changed_by=mgr.id,
        action="reject",
        old_value=json.dumps({"status": "Submitted"}),
        new_value=json.dumps({"status": "Draft", "comment": sheet.reject_comment}),
    ))

    db.commit()
    return {"msg": "Sheet returned for rework", "sheet_id": sheet.id, "status": sheet.status.value}


# -------------------- Sheet Comments (Manager <-> Employee Feedback) --------------------

class CommentCreate(BaseModel):
    text: str


class CommentOut(BaseModel):
    id: str
    sheet_id: str
    author_id: str
    author_name: str
    author_role: str
    text: str
    created_at: str


@router.get("/sheets/{sheet_id}/comments", response_model=List[CommentOut])
def get_comments(
    sheet_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_curr_user),
):
    """Fetch all comments for a sheet. Accessible by the sheet owner and their manager."""
    sheet = db.query(GoalSheet).filter(GoalSheet.id == sheet_id).first()
    if not sheet:
        raise HTTPException(404, "Sheet not found")

    # Access check: sheet owner, their manager, or Admin
    owner = db.query(User).filter(User.id == sheet.user_id).first()
    if user.role.value == "Employee" and sheet.user_id != user.id:
        raise HTTPException(403, "Not your sheet")
    if user.role.value == "Manager" and owner and owner.mgr_id != user.id:
        raise HTTPException(403, "This employee does not report to you")

    comments = (
        db.query(SheetComment)
        .filter(SheetComment.sheet_id == sheet_id)
        .order_by(SheetComment.created_at.asc())
        .all()
    )
    return [
        CommentOut(
            id=c.id,
            sheet_id=c.sheet_id,
            author_id=c.author_id,
            author_name=c.author.name,
            author_role=c.author.role.value,
            text=c.text,
            created_at=c.created_at.isoformat(),
        )
        for c in comments
    ]


@router.post("/sheets/{sheet_id}/comments", response_model=CommentOut)
def add_comment(
    sheet_id: str,
    body: CommentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_curr_user),
):
    """Post a comment on a sheet (employee or manager)."""
    if not body.text or not body.text.strip():
        raise HTTPException(400, "Comment text cannot be empty")

    sheet = db.query(GoalSheet).filter(GoalSheet.id == sheet_id).first()
    if not sheet:
        raise HTTPException(404, "Sheet not found")

    owner = db.query(User).filter(User.id == sheet.user_id).first()
    if user.role.value == "Employee" and sheet.user_id != user.id:
        raise HTTPException(403, "Not your sheet")
    if user.role.value == "Manager" and owner and owner.mgr_id != user.id:
        raise HTTPException(403, "This employee does not report to you")

    comment = SheetComment(
        sheet_id=sheet_id,
        author_id=user.id,
        text=body.text.strip(),
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    return CommentOut(
        id=comment.id,
        sheet_id=comment.sheet_id,
        author_id=comment.author_id,
        author_name=comment.author.name,
        author_role=comment.author.role.value,
        text=comment.text,
        created_at=comment.created_at.isoformat(),
    )
