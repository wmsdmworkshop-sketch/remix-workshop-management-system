"""
DWIP Workforce v1.1 — Validation Run Manager
==============================================
Generates unique ValidationRunIDs, captures version metadata,
manages per-run report folders and validation databases.

Every validation execution has a unique ID that traces through
every report, database record, log entry, and audit trail.
"""

from __future__ import annotations

import json
import logging
import os
import platform
import shutil
import subprocess
import time
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# ── Constants ────────────────────────────────────────────────────
DWIP_VERSION = "1.1"
ETL_VERSION = "2.5.0"
SCHEMA_VERSION = "1.0"
CONFIG_VERSION = "1.0"


@dataclass
class ValidationRunMetadata:
    """Complete metadata for a single validation run."""

    run_id: str                              # VAL-20260710-0001
    dwip_version: str = DWIP_VERSION
    etl_version: str = ETL_VERSION
    schema_version: str = SCHEMA_VERSION
    config_version: str = CONFIG_VERSION
    git_commit_hash: str = ""
    validation_date: str = ""                # ISO 8601
    start_time: str = ""
    end_time: str = ""
    duration_seconds: float = 0.0
    db_path: str = ""
    report_dir: str = ""
    files_processed: int = 0
    rows_processed: int = 0
    data_quality_score: float = 0.0
    average_confidence: float = 0.0
    golden_dataset_status: str = "NOT_AVAILABLE"
    validation_status: str = "PENDING"       # PENDING / PASS / FAIL
    top_issues: List[str] = field(default_factory=list)

    # Quality dimensions
    completeness_score: float = 0.0
    consistency_score: float = 0.0
    validity_score: float = 0.0
    accuracy_score: float = 0.0
    uniqueness_score: float = 0.0
    timeliness_score: float = 0.0

    # Business health
    vehicle_master_completeness: float = 0.0
    customer_completeness: float = 0.0
    invoice_coverage: float = 0.0
    warranty_coverage: float = 0.0
    advisor_coverage: float = 0.0
    technician_coverage: float = 0.0
    service_classification_coverage: float = 0.0

    # Performance
    step_timings: Dict[str, float] = field(default_factory=dict)
    peak_ram_mb: float = 0.0
    peak_cpu_percent: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to a serialisable dictionary."""
        return {
            "ValidationRunID": self.run_id,
            "DWIP_Version": self.dwip_version,
            "ETL_Version": self.etl_version,
            "Schema_Version": self.schema_version,
            "Config_Version": self.config_version,
            "Git_Commit_Hash": self.git_commit_hash,
            "Validation_Date": self.validation_date,
            "Start_Time": self.start_time,
            "End_Time": self.end_time,
            "Duration_Seconds": self.duration_seconds,
            "DB_Path": self.db_path,
            "Report_Dir": self.report_dir,
            "Files_Processed": self.files_processed,
            "Rows_Processed": self.rows_processed,
            "Data_Quality_Score": self.data_quality_score,
            "Average_Confidence": self.average_confidence,
            "Golden_Dataset_Status": self.golden_dataset_status,
            "Validation_Status": self.validation_status,
            "Top_20_Issues": self.top_issues[:20],
            "Quality_Dimensions": {
                "Completeness": self.completeness_score,
                "Consistency": self.consistency_score,
                "Validity": self.validity_score,
                "Accuracy": self.accuracy_score,
                "Uniqueness": self.uniqueness_score,
                "Timeliness": self.timeliness_score,
            },
            "Business_Health": {
                "Vehicle_Master_Completeness": self.vehicle_master_completeness,
                "Customer_Completeness": self.customer_completeness,
                "Invoice_Coverage": self.invoice_coverage,
                "Warranty_Coverage": self.warranty_coverage,
                "Advisor_Coverage": self.advisor_coverage,
                "Technician_Coverage": self.technician_coverage,
                "Service_Classification_Coverage": self.service_classification_coverage,
            },
            "Performance": {
                "Step_Timings": self.step_timings,
                "Peak_RAM_MB": self.peak_ram_mb,
                "Peak_CPU_Percent": self.peak_cpu_percent,
            },
        }


class ValidationRunManager:
    """
    Manages the lifecycle of a single validation run.
    Generates unique IDs, creates folders, initialises databases.
    """

    def __init__(self, project_root: Path) -> None:
        self.project_root = Path(project_root)
        self.reports_root = self.project_root / "reports"
        self.database_dir = self.project_root / "database"

    def create_run(self) -> ValidationRunMetadata:
        """
        Create a new validation run with a unique ID.
        Sets up folder structure and database path.
        """
        run_id = self._generate_run_id()
        now = datetime.now()

        meta = ValidationRunMetadata(
            run_id=run_id,
            validation_date=now.isoformat(),
            start_time=now.isoformat(),
            git_commit_hash=self._get_git_hash(),
        )

        # Set up report folder
        report_dir = self.reports_root / f"validation_run_{run_id}"
        report_dir.mkdir(parents=True, exist_ok=True)
        meta.report_dir = str(report_dir)

        # Set up validation database
        db_filename = f"dwip_validation_{run_id}.db"
        db_path = self.database_dir / db_filename
        self.database_dir.mkdir(parents=True, exist_ok=True)
        meta.db_path = str(db_path)

        logger.info(
            "ValidationRun created: %s -> DB: %s, Reports: %s",
            run_id, db_path.name, report_dir.name,
        )
        return meta

    def finalise_run(self, meta: ValidationRunMetadata) -> None:
        """
        Mark a run as complete: compute duration, set end time.
        Write Validation_Summary.json to the report folder.
        """
        now = datetime.now()
        meta.end_time = now.isoformat()

        # Compute duration from start
        try:
            start_dt = datetime.fromisoformat(meta.start_time)
            meta.duration_seconds = round((now - start_dt).total_seconds(), 2)
        except Exception:
            pass

        # Determine PASS/FAIL
        if meta.data_quality_score >= 95.0:
            meta.validation_status = "PASS"
        else:
            meta.validation_status = "FAIL"

        # Write summary JSON
        summary_path = Path(meta.report_dir) / "Validation_Summary.json"
        with open(summary_path, "w", encoding="utf-8") as f:
            json.dump(meta.to_dict(), f, indent=2, ensure_ascii=False, default=str)
        logger.info("Validation Summary JSON written: %s", summary_path)

    def safety_check_db_path(self, db_path: Path) -> None:
        """
        Hard-fail if the db_path points to the production database.
        This is the final safety net against accidental production writes.
        """
        resolved = Path(db_path).resolve()
        production_db = (self.database_dir / "dwip.db").resolve()

        if resolved == production_db:
            raise RuntimeError(
                f"SAFETY VIOLATION: Attempted to write to production database "
                f"{production_db}. Validation runs MUST use a separate file. "
                f"Use --db-path to specify a validation database."
            )

        # Also check by filename as a secondary guard
        if resolved.name == "dwip.db":
            raise RuntimeError(
                f"SAFETY VIOLATION: Database filename is 'dwip.db'. "
                f"Validation databases must be named differently."
            )

        logger.info("Database safety check passed: %s", resolved)

    # ── Private ────────────────────────────────────────────────────

    def _generate_run_id(self) -> str:
        """
        Generate a unique ValidationRunID in the format VAL-YYYYMMDD-NNNN.
        Sequence number increments based on existing runs for today.
        """
        today = datetime.now().strftime("%Y%m%d")
        prefix = f"VAL-{today}-"

        # Scan existing run folders to find the next sequence number
        existing_seq = 0
        if self.reports_root.exists():
            for child in self.reports_root.iterdir():
                if child.is_dir() and child.name.startswith(f"validation_run_{prefix}"):
                    try:
                        seq_str = child.name.split(prefix)[-1]
                        seq = int(seq_str)
                        existing_seq = max(existing_seq, seq)
                    except (ValueError, IndexError):
                        continue

        next_seq = existing_seq + 1
        run_id = f"{prefix}{next_seq:04d}"
        return run_id

    @staticmethod
    def _get_git_hash() -> str:
        """Attempt to capture the current git commit hash. Returns '' if unavailable."""
        try:
            result = subprocess.run(
                ["git", "rev-parse", "--short", "HEAD"],
                capture_output=True, text=True, timeout=5,
            )
            if result.returncode == 0:
                return result.stdout.strip()
        except Exception:
            pass
        return ""


class StepTimer:
    """
    Context manager to time individual validation steps.
    Records elapsed time into the run metadata.
    """

    def __init__(self, meta: ValidationRunMetadata, step_name: str) -> None:
        self._meta = meta
        self._step_name = step_name
        self._start: float = 0.0

    def __enter__(self) -> StepTimer:
        self._start = time.perf_counter()
        logger.info("▶ Starting step: %s", self._step_name)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        elapsed = round(time.perf_counter() - self._start, 3)
        self._meta.step_timings[self._step_name] = elapsed
        logger.info(
            "✓ Completed step: %s in %.3f seconds", self._step_name, elapsed
        )
        return False   # do not suppress exceptions
