from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

DB_URL = "sqlite:///./atomtracker.db"

engine = create_engine(
    DB_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def run_migrations():
    """Add any missing columns to the existing SQLite database.

    SQLAlchemy's create_all() only creates missing *tables*, not missing
    *columns* in existing tables. We run these ALTER TABLE statements on every
    startup; SQLite raises OperationalError if the column already exists, which
    we intentionally swallow.
    """
    migrations = [
        "ALTER TABLE sheets ADD COLUMN reject_comment VARCHAR",
        "ALTER TABLE goals  ADD COLUMN source_goal_id VARCHAR REFERENCES goals(id)",
        "ALTER TABLE checkins ADD COLUMN mgr_comment VARCHAR",
    ]
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                pass  # Column already exists — safe to ignore
