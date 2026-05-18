from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import User, Role
from auth import hash_pw, verify_pw, create_token
from routes_goals import router as goals_router
from routes_checkins import router as checkins_router
from routes_admin import router as admin_router

Base.metadata.create_all(bind=engine)

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
    """Idempotently seed Admin, Manager, and Employee accounts for the demo."""

    def upsert(name, email, password, role, mgr_id=None):
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            # Make sure the manager link is set even if the user pre-existed.
            if mgr_id and existing.mgr_id != mgr_id:
                existing.mgr_id = mgr_id
                db.commit()
            return existing, "already existed"
        u = User(
            name=name, email=email,
            hashed_pw=hash_pw(password), role=role, mgr_id=mgr_id,
        )
        db.add(u)
        db.commit()
        db.refresh(u)
        return u, "created"

    admin, a_status = upsert("Admin",    "admin@test.com",    "admin",    Role.Admin)
    mgr,   m_status = upsert("Manager",  "manager@test.com",  "manager",  Role.Manager)
    emp,   e_status = upsert("Employee", "employee@test.com", "employee", Role.Employee, mgr_id=mgr.id)

    return {
        "msg": "Demo users ready",
        "users": [
            {"email": admin.email, "password": "admin",    "role": "Admin",    "status": a_status},
            {"email": mgr.email,   "password": "manager",  "role": "Manager",  "status": m_status},
            {"email": emp.email,   "password": "employee", "role": "Employee", "status": e_status, "reports_to": mgr.email},
        ],
    }
