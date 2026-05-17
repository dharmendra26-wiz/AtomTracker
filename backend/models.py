import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, ForeignKey, Enum, DateTime, Text
)
from sqlalchemy.orm import relationship

from database import Base


def utcnow():
    return datetime.now(timezone.utc)


def new_id():
    return str(uuid.uuid4())


class Role(str, enum.Enum):
    Employee = "Employee"
    Manager = "Manager"
    Admin = "Admin"


class SheetStatus(str, enum.Enum):
    Draft = "Draft"
    Submitted = "Submitted"
    Locked = "Locked"


class UOM(str, enum.Enum):
    Min = "Min"
    Max = "Max"
    Timeline = "Timeline"
    Zero = "Zero"


class Quarter(str, enum.Enum):
    Q1 = "Q1"
    Q2 = "Q2"
    Q3 = "Q3"
    Q4 = "Q4"


class CheckInStatus(str, enum.Enum):
    NotStarted = "Not Started"
    OnTrack = "On Track"
    Completed = "Completed"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=new_id)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_pw = Column(String, nullable=False)
    role = Column(Enum(Role), nullable=False, default=Role.Employee)
    mgr_id = Column(String, ForeignKey("users.id"), nullable=True)

    manager = relationship("User", remote_side=[id], backref="reports")
    sheets = relationship("GoalSheet", back_populates="user", cascade="all, delete-orphan")


class GoalSheet(Base):
    __tablename__ = "sheets"

    id = Column(String, primary_key=True, default=new_id)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    year = Column(String, nullable=False)
    status = Column(Enum(SheetStatus), nullable=False, default=SheetStatus.Draft)

    user = relationship("User", back_populates="sheets")
    goals = relationship("Goal", back_populates="sheet", cascade="all, delete-orphan")


class Goal(Base):
    __tablename__ = "goals"

    id = Column(String, primary_key=True, default=new_id)
    sheet_id = Column(String, ForeignKey("sheets.id"), nullable=False)
    title = Column(String, nullable=False)
    desc = Column(String, nullable=True)
    thrust_area = Column(String, nullable=True)
    uom = Column(Enum(UOM), nullable=False, default=UOM.Max)
    target = Column(Float, nullable=False, default=0.0)
    weight = Column(Integer, nullable=False, default=0)
    is_shared = Column(Boolean, nullable=False, default=False)

    sheet = relationship("GoalSheet", back_populates="goals")
    checkins = relationship("CheckIn", back_populates="goal", cascade="all, delete-orphan")


class CheckIn(Base):
    __tablename__ = "checkins"

    id = Column(String, primary_key=True, default=new_id)
    goal_id = Column(String, ForeignKey("goals.id"), nullable=False)
    qtr = Column(Enum(Quarter), nullable=False)
    actual = Column(Float, nullable=True)
    status = Column(Enum(CheckInStatus), nullable=False, default=CheckInStatus.NotStarted)
    mgr_comment = Column(String, nullable=True)

    goal = relationship("Goal", back_populates="checkins")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=new_id)
    entity_type = Column(String, nullable=False, index=True)
    entity_id = Column(String, nullable=False, index=True)
    changed_by = Column(String, ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    timestamp = Column(DateTime, nullable=False, default=utcnow)

    user = relationship("User")
