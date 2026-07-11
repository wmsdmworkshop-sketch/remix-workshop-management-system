"""
DWIP Workforce v1.1 — Database Writer
=====================================
All SQLAlchemy session management, UPSERT operations, and batch inserts.
ORM-compatible: works with SQLite (Phase 1) and PostgreSQL (future).
"""

from __future__ import annotations

import logging
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Generator, Optional, Type, TypeVar

from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from etl.src.models import Base

logger = logging.getLogger(__name__)

T = TypeVar("T")


def build_engine(db_path: Path, echo: bool = False) -> Engine:
    """
    Create the SQLAlchemy engine.
    Uses SQLite for Phase 1. Switch to PostgreSQL by changing the URL.

    For PostgreSQL migration:
        url = "postgresql+psycopg2://user:pass@host/dwip"
    """
    url = f"sqlite:///{db_path.as_posix()}"
    engine = create_engine(url, echo=echo, future=True)

    # SQLite-specific optimizations (ignored silently on PostgreSQL)
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragmas(dbapi_conn, _connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys = ON")
        cursor.execute("PRAGMA journal_mode = WAL")
        cursor.execute("PRAGMA synchronous = NORMAL")
        cursor.close()

    return engine


def init_database(engine: Engine) -> None:
    """Create all tables from ORM models. Idempotent (CREATE IF NOT EXISTS)."""
    Base.metadata.create_all(engine)
    logger.info("Database schema initialized (all tables created if not exist).")


class DBWriter:
    """
    Handles all database write operations for the ETL pipeline.
    All public methods operate within managed sessions.
    """

    def __init__(self, engine: Engine) -> None:
        self._engine = engine
        self._Session = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    @contextmanager
    def session(self) -> Generator[Session, None, None]:
        """Provide a transactional session with automatic commit/rollback."""
        sess: Session = self._Session()
        try:
            yield sess
            sess.commit()
        except Exception:
            sess.rollback()
            raise
        finally:
            sess.close()

    # ── Generic Operations ────────────────────────────────────────

    def bulk_insert(self, records: list[Any]) -> int:
        """
        Insert a list of ORM model instances in a single transaction.
        Returns number of records inserted.
        """
        if not records:
            return 0
        with self.session() as sess:
            sess.add_all(records)
        logger.debug("Bulk inserted %d records of type %s", len(records), type(records[0]).__name__)
        return len(records)

    def upsert_by_pk(self, model_class: Type[T], pk_field: str, pk_value: Any, **fields) -> tuple[T, bool]:
        """
        Insert or update a record identified by a single natural PK field.
        Returns (instance, created_bool).
        """
        with self.session() as sess:
            instance = sess.get(model_class, pk_value)
            if instance is None:
                instance = model_class(**{pk_field: pk_value}, **fields)
                sess.add(instance)
                created = True
            else:
                for key, val in fields.items():
                    if val is not None:
                        setattr(instance, key, val)
                created = False
        return instance, created

    def get_or_create(self, model_class: Type[T], lookup: dict, defaults: Optional[dict] = None) -> tuple[T, bool]:
        """
        Get an existing record matching `lookup` fields,
        or create a new one with `lookup` + `defaults`.
        Returns (instance, created_bool).
        """
        defaults = defaults or {}
        with self.session() as sess:
            instance = sess.query(model_class).filter_by(**lookup).first()
            if instance is None:
                instance = model_class(**lookup, **defaults)
                sess.add(instance)
                created = True
            else:
                created = False
        return instance, created

    def get_by(self, model_class: Type[T], **filters) -> Optional[T]:
        """Return first matching record or None."""
        with self.session() as sess:
            return sess.query(model_class).filter_by(**filters).first()

    def count(self, model_class: Type[T]) -> int:
        """Return total row count for a model."""
        with self.session() as sess:
            return sess.query(model_class).count()

    # ── Raw Layer ─────────────────────────────────────────────────

    def insert_raw_batch(self, records: list[Any]) -> int:
        """Insert a batch of raw staging records."""
        return self.bulk_insert(records)

    # ── Dimension UPSERT Methods ──────────────────────────────────

    def upsert_vehicle(self, vrn: str, **kwargs) -> tuple[Any, bool]:
        """UPSERT dim_vehicle by vrn (natural PK)."""
        from etl.src.models import DimVehicle
        return self.upsert_by_pk(DimVehicle, "vrn", vrn, **kwargs)

    def get_or_create_employee(self, employee_name: str, **defaults) -> tuple[Any, bool]:
        """Get or create dim_employee by normalized employee_name."""
        from etl.src.models import DimEmployee
        return self.get_or_create(DimEmployee, {"employee_name": employee_name}, defaults)

    def get_or_create_service_type(self, raw_sr_type: str, **defaults) -> tuple[Any, bool]:
        """Get or create dim_service_type by raw_sr_type."""
        from etl.src.models import DimServiceType
        return self.get_or_create(DimServiceType, {"raw_sr_type": raw_sr_type}, defaults)

    def get_or_create_date(self, date_key: str, **kwargs) -> tuple[Any, bool]:
        """Get or create dim_date entry."""
        from etl.src.models import DimDate
        return self.get_or_create(DimDate, {"date_key": date_key}, kwargs)

    def upsert_service_event(self, job_card_no: str, **kwargs) -> tuple[Any, bool]:
        """UPSERT fact_service_event by job_card_no (unique business key)."""
        from etl.src.models import FactServiceEvent
        with self.session() as sess:
            instance = sess.query(FactServiceEvent).filter_by(job_card_no=job_card_no).first()
            if instance is None:
                instance = FactServiceEvent(job_card_no=job_card_no, **kwargs)
                sess.add(instance)
                created = True
            else:
                for key, val in kwargs.items():
                    if val is not None:
                        setattr(instance, key, val)
                created = False
        return instance, created

    # ── Report Table Writers ──────────────────────────────────────

    def log_duplicate(self, **kwargs) -> None:
        from etl.src.models import RptDuplicate
        with self.session() as sess:
            sess.add(RptDuplicate(**kwargs))

    def log_conflict(self, **kwargs) -> None:
        from etl.src.models import RptConflict
        with self.session() as sess:
            sess.add(RptConflict(**kwargs))

    def log_validation(self, rule_id: str, severity: str, description: str, **kwargs) -> None:
        from etl.src.models import RptValidation
        with self.session() as sess:
            sess.add(RptValidation(rule_id=rule_id, severity=severity, description=description, **kwargs))

    def log_rejected(self, reason: str, source_file: str, source_row: int, **kwargs) -> None:
        from etl.src.models import RptRejected
        with self.session() as sess:
            sess.add(RptRejected(reason=reason, source_file=source_file, source_row=source_row, **kwargs))

    def log_merge(self, phase: str, action: str, details: Optional[str] = None, record_count: Optional[int] = None) -> None:
        from etl.src.models import RptMergeLog
        with self.session() as sess:
            sess.add(RptMergeLog(phase=phase, action=action, details=details, record_count=record_count))
        logger.info("[%s] %s — %s (%s records)", phase, action, details or "", record_count or "")

    # ── Utility ───────────────────────────────────────────────────

    def execute_sql(self, sql: str) -> Any:
        """Execute a raw SQL statement (for view creation etc.)."""
        with self._engine.connect() as conn:
            result = conn.execute(text(sql))
            conn.commit()
            return result
