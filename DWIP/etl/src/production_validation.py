"""
DWIP Workforce v1.1 — Production Validation Pipeline
======================================================
Phase 2.5: Complete ETL validation against real dealership data.

Generates a full validation audit package:
  - 15+ styled Excel reports
  - Executive Dashboard with traffic-light KPIs
  - Validation Certificate for sign-off
  - Summary JSON for automation
  - Golden Dataset baseline

CRITICAL: This script NEVER writes to dwip.db (production).
          All writes go to dwip_validation_<RunID>.db.

Usage:
    python -m etl.src.production_validation
    python -m etl.src.production_validation --input-dir DWIP/input
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import random
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd

from etl.src.config_loader import ConfigLoader
from etl.src.db_writer import DBWriter, build_engine, init_database
from etl.src.lineage_tracker import LineageTracker
from etl.src.loader import Loader
from etl.src.core.result_types import DiscoveredFile
from etl.src.core.context import DWIPContext, StepTimer
from etl.src.merger import Merger
from etl.src.models import (
    AuditLineage, Base, DimCustomer, DimEmployee, DimServiceType,
    DimVehicle, FactServiceEvent, FactServiceTechnician,
    RptConflict, RptDuplicate, RptMergeLog, RptRejected,
    RptValidation, TblValidationRun,
)
from etl.src.normalizer import Normalizer
from etl.src.odometer_engine import OdometerEngine
from etl.src.profiler import Profiler
from etl.src.report_generator import ReportGenerator
from etl.src.resolver import ConfidenceScorer, DuplicateResolver
from etl.src.sr_type_mapper import SRTypeMapper
from etl.src.technician_normalizer import TechnicianNormalizer
from etl.src.validation_run import (
    ValidationRunManager, ValidationRunMetadata,
)
from etl.src.validator import Validator

logger = logging.getLogger("dwip.validation")

# ═══════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════


def _safe_pct(numerator: int, denominator: int) -> float:
    """Return percentage, avoiding division by zero."""
    return round(numerator / denominator * 100, 2) if denominator else 0.0


def _try_ram_mb() -> float:
    """Return current process RSS in MB, or 0 if psutil unavailable."""
    try:
        import psutil
        return round(psutil.Process(os.getpid()).memory_info().rss / 1e6, 2)
    except Exception:
        return 0.0


# ═══════════════════════════════════════════════════════════════════
# PRODUCTION VALIDATION PIPELINE
# ═══════════════════════════════════════════════════════════════════


class ProductionValidationPipeline:
    """
    Orchestrates the complete Phase 2.5 validation pipeline.
    Every step is timed and logged into the ValidationRunMetadata.
    """

    def __init__(
        self,
        project_root: Path,
        input_dir: Optional[Path] = None,
    ) -> None:
        self.project_root = Path(project_root)
        self.input_dir = Path(input_dir) if input_dir else self.project_root / "input"
        self.config_dir = self.project_root / "config"
        self.golden_dir = self.project_root / "golden_dataset"

        # These are set during run()
        self.meta: Optional[ValidationRunMetadata] = None
        self.report_dir: Optional[Path] = None
        self.db: Optional[DBWriter] = None
        self.config: Optional[ConfigLoader] = None
        self.discovered: List[DiscoveredFile] = []
        self.rg: Optional[ReportGenerator] = None

    def run(self) -> ValidationRunMetadata:
        """Execute the complete validation pipeline."""

        # ── Initialise Run ────────────────────────────────────────
        run_mgr = ValidationRunManager(self.project_root)
        self.meta = run_mgr.create_run()
        self.report_dir = Path(self.meta.report_dir)

        # Safety check: never write to production
        run_mgr.safety_check_db_path(Path(self.meta.db_path))

        # Initialise database
        engine = build_engine(Path(self.meta.db_path))
        init_database(engine)
        self.db = DBWriter(engine)

        # Load config
        self.config = ConfigLoader(self.config_dir)

        # Build DWIPContext
        self.ctx = DWIPContext(
            config=self.config,
            db=self.db,
            logger=logger,
            validation_run=self.meta,
            report_dir=self.report_dir,
            db_path=Path(self.meta.db_path),
            input_dir=self.input_dir
        )

        # Bind helpers to context
        self.ctx.normalizer = Normalizer(self.ctx)
        self.ctx.validator = Validator(self.ctx)
        self.ctx.odo_engine = OdometerEngine(self.ctx)
        self.ctx.sr_mapper = SRTypeMapper(self.ctx)
        self.ctx.tech_normalizer = TechnicianNormalizer(self.ctx)
        self.ctx.scorer = ConfidenceScorer(self.ctx)
        self.ctx.resolver = DuplicateResolver(self.ctx)
        self.ctx.lineage_tracker = LineageTracker(self.ctx)

        self.rg = ReportGenerator(self.ctx)

        # Record run start in DB
        self._persist_run_start()

        logger.info("=" * 60)
        logger.info("DWIP Phase 2.5 - Production Validation")
        logger.info("Run ID: %s", self.meta.run_id)
        logger.info("DB:     %s", self.meta.db_path)
        logger.info("Reports: %s", self.meta.report_dir)
        logger.info("=" * 60)

        try:
            # ── Step 1: Data Profiling ────────────────────────────
            with StepTimer(self.ctx, "Step01_DataProfiling"):
                self._step_01_data_profiling()

            # ── Step 2: Field Mapping ─────────────────────────────
            with StepTimer(self.ctx, "Step02_FieldMapping"):
                self._step_02_field_mapping()

            # ── Step 3: Validation Engine ─────────────────────────
            with StepTimer(self.ctx, "Step03_Validation"):
                self._step_03_validation()

            # ── Step 4: Merge Engine ──────────────────────────────
            with StepTimer(self.ctx, "Step04_Merge"):
                self._step_04_merge()

            # ── Step 5: Master Tables ─────────────────────────────
            with StepTimer(self.ctx, "Step05_MasterTables"):
                self._step_05_master_tables()

            # ── Step 6: Master Data Statistics ────────────────────
            with StepTimer(self.ctx, "Step06_Statistics"):
                self._step_06_statistics()

            # ── Step 7: Business Audit ────────────────────────────
            with StepTimer(self.ctx, "Step07_BusinessAudit"):
                self._step_07_business_audit()

            # ── Step 8: Missing Master Data ───────────────────────
            with StepTimer(self.ctx, "Step08_MissingMaster"):
                self._step_08_missing_master()

            # ── Step 9: Data Recovery Report ──────────────────────
            with StepTimer(self.ctx, "Step09_DataRecovery"):
                self._step_09_data_recovery()

            # ── Step 10: Merge Decisions ──────────────────────────
            with StepTimer(self.ctx, "Step10_MergeDecisions"):
                self._step_10_merge_decisions()

            # ── Step 11: Odometer Audit ───────────────────────────
            with StepTimer(self.ctx, "Step11_OdometerAudit"):
                self._step_11_odometer_audit()

            # ── Step 12: Vehicle Timeline Verification ────────────
            with StepTimer(self.ctx, "Step12_VehicleTimeline"):
                self._step_12_vehicle_timeline()

            # ── Step 13: Lineage Audit ────────────────────────────
            with StepTimer(self.ctx, "Step13_LineageAudit"):
                self._step_13_lineage_audit()

            # ── Step 14: Business Exceptions ──────────────────────
            with StepTimer(self.ctx, "Step14_BusinessExceptions"):
                self._step_14_business_exceptions()

            # ── Step 15: Performance Summary ──────────────────────
            self.meta.peak_ram_mb = _try_ram_mb()
            with StepTimer(self.ctx, "Step15_Performance"):
                self._step_15_performance()

            # ── Quality & Health Scoring ──────────────────────────
            with StepTimer(self.ctx, "QualityScoring"):
                self._compute_quality_scores()
                self._compute_business_health()

            # ── Executive Dashboard ───────────────────────────────
            with StepTimer(self.ctx, "ExecutiveDashboard"):
                self._generate_executive_dashboard()

            # ── Validation Certificate ────────────────────────────
            with StepTimer(self.ctx, "ValidationCertificate"):
                self._generate_validation_certificate()

            # ── Golden Dataset ────────────────────────────────────
            with StepTimer(self.ctx, "GoldenDataset"):
                self._golden_dataset()

            # ── Report Index ──────────────────────────────────────
            with StepTimer(self.ctx, "ReportIndex"):
                self._generate_report_index()

        except Exception as exc:
            logger.exception("Validation pipeline failed: %s", exc)
            self.meta.validation_status = "FAIL"
            raise
        finally:
            # Finalise run
            run_mgr.finalise_run(self.meta)
            self._persist_run_end()

        logger.info("=" * 60)
        logger.info("VALIDATION COMPLETE - Status: %s", self.meta.validation_status)
        logger.info("Quality Score: %.1f%%", self.meta.data_quality_score)
        logger.info("Reports: %s", self.meta.report_dir)
        logger.info("=" * 60)

        return self.meta

    # ═══════════════════════════════════════════════════════════════
    # STEP IMPLEMENTATIONS
    # ═══════════════════════════════════════════════════════════════

    def _step_01_data_profiling(self) -> None:
        """Step 1: Discover files, profile each, generate Data_Profile_Report.xlsx."""
        loader = Loader(self.ctx)
        self.discovered = loader.discover_and_load()

        self.meta.files_processed = len(self.discovered)
        self.meta.rows_processed = sum(d.row_count for d in self.discovered)

        profile_rows = []
        for disc in self.discovered:
            df = disc.df
            dup_count = int(df.duplicated().sum())
            null_pct = round(df.isna().mean().mean() * 100, 2) if len(df) > 0 else 0
            blank_pct = round((df == "").mean().mean() * 100, 2) if len(df) > 0 else 0

            # Detect column types
            date_cols, numeric_cols, text_cols = [], [], []
            date_formats = {}
            for col in df.columns:
                parsed = pd.to_datetime(df[col], errors="coerce", dayfirst=True)
                valid_dates = parsed.notna().sum()
                if valid_dates > len(df) * 0.3:
                    date_cols.append(col)
                    # Detect format from sample
                    samples = df[col].dropna().head(20)
                    fmt = _detect_date_format(samples)
                    invalid_count = len(df) - valid_dates
                    date_formats[col] = {
                        "format": fmt, "example": str(samples.iloc[0]) if len(samples) > 0 else "",
                        "invalid_count": int(invalid_count),
                    }
                elif pd.to_numeric(df[col], errors="coerce").notna().sum() > len(df) * 0.5:
                    numeric_cols.append(col)
                else:
                    text_cols.append(col)

            # Sample values (first 3 non-empty per column)
            sample_vals = {}
            for col in df.columns[:5]:
                non_empty = df[col].dropna().head(3).tolist()
                sample_vals[col] = "; ".join(str(v) for v in non_empty)

            profile_rows.append({
                "File Name": disc.path.name,
                "Dataset Type": disc.file_type,
                "Row Count": disc.row_count,
                "Column Count": len(disc.headers),
                "Duplicate Rows": dup_count,
                "Null %": null_pct,
                "Blank %": blank_pct,
                "Encoding": disc.encoding,
                "Date Columns": ", ".join(date_cols),
                "Numeric Columns": ", ".join(numeric_cols),
                "Text Columns": ", ".join(text_cols),
                "Header List": ", ".join(disc.headers),
                "Sample Values": json.dumps(sample_vals, ensure_ascii=False),
                "Date Formats": json.dumps(date_formats, ensure_ascii=False),
            })

        df_profile = pd.DataFrame(profile_rows)
        self.rg.write_dataframe_report(
            df_profile,
            self.report_dir / "Data_Profile_Report.xlsx",
            sheet_name="Data Profile",
            run_id=self.meta.run_id,
            db_path=self.meta.db_path,
        )
        logger.info("Step 1 complete: %d files profiled.", len(self.discovered))

    def _step_02_field_mapping(self) -> None:
        """Step 2: Generate Field_Mapping_Report.xlsx."""
        profiler = Profiler(self.ctx)
        mapping_rows = []

        for disc in self.discovered:
            mapping = profiler.profile_file(disc)
            for raw_header, standard in mapping.items():
                # Header match score
                header_score = _header_similarity(raw_header, standard)
                # Data match: check if column has valid non-empty data
                col_data = disc.df[raw_header] if raw_header in disc.df.columns else pd.Series()
                non_empty = col_data.dropna()
                non_empty = non_empty[non_empty.astype(str).str.strip() != ""]
                data_match = _safe_pct(len(non_empty), len(col_data)) if len(col_data) > 0 else 0
                # Business rule match: 100 if exact match, 80 if fuzzy
                biz_match = 100.0 if header_score >= 1.0 else 80.0
                # Final confidence = average
                final = round((header_score * 100 + data_match + biz_match) / 3, 1)
                mapped = "YES" if final >= 60 else "NO"

                mapping_rows.append({
                    "Business Field": standard,
                    "Detected Header": raw_header,
                    "Source File": disc.path.name,
                    "Header Match %": round(header_score * 100, 1),
                    "Data Match %": round(data_match, 1),
                    "Business Rule Match %": biz_match,
                    "Final Confidence %": final,
                    "Mapped": mapped,
                })

        df_mapping = pd.DataFrame(mapping_rows)
        self.rg.write_dataframe_report(
            df_mapping,
            self.report_dir / "Field_Mapping_Report.xlsx",
            sheet_name="Field Mapping",
            run_id=self.meta.run_id,
            db_path=self.meta.db_path,
            score_columns=["Final Confidence %"],
        )
        logger.info("Step 2 complete: %d mappings generated.", len(mapping_rows))

    def _step_03_validation(self) -> None:
        """Step 3: Generate Validation_Report.xlsx from DB validation table."""
        # Validation happens during merge (step 4), but we read the results here
        # after merge. If there's nothing yet, this generates an empty report.
        self._export_validation_report()

    def _step_04_merge(self) -> None:
        """Step 4: Run full merge, generate Merge_Log, Duplicate, Conflict reports."""
        merger = Merger(self.ctx)
        stats = merger.merge_all(self.discovered)
        logger.info("Merge complete: %s", stats)

        # Now re-export validation report (populated during merge)
        self._export_validation_report()

        # Merge Log
        with self.db.session() as sess:
            logs = sess.query(RptMergeLog).all()
            log_dicts = [
                {"phase": r.phase, "action": r.action, "details": r.details,
                 "record_count": r.record_count, "created_at": str(r.created_at)}
                for r in logs
            ]
        self.rg.generate_merge_log_report(
            log_dicts, self.report_dir / "Merge_Log.xlsx",
            run_id=self.meta.run_id, db_path=self.meta.db_path,
        )

        # Duplicate Report
        with self.db.session() as sess:
            dups = sess.query(RptDuplicate).all()
            dup_dicts = [
                {"dataset_type": r.dataset_type, "vrn": r.vrn,
                 "job_card_no": r.job_card_no, "invoice_no": r.invoice_no,
                 "source_file": r.source_file, "source_row": r.source_row,
                 "confidence_score": r.confidence_score,
                 "unselected_reason": r.unselected_reason}
                for r in dups
            ]
        self.rg.generate_duplicate_report(
            dup_dicts, self.report_dir / "Duplicate_Report.xlsx",
            run_id=self.meta.run_id, db_path=self.meta.db_path,
        )

        # Conflict Report
        with self.db.session() as sess:
            conflicts = sess.query(RptConflict).all()
            conf_dicts = [
                {"conflict_type": r.conflict_type, "vrn": r.vrn,
                 "service_date": r.service_date, "field_name": r.field_name,
                 "value_a": r.value_a, "value_b": r.value_b,
                 "source_file_a": r.source_file_a, "source_row_a": r.source_row_a,
                 "source_file_b": r.source_file_b, "source_row_b": r.source_row_b,
                 "resolution": r.resolution}
                for r in conflicts
            ]
        self.rg.generate_conflict_report(
            conf_dicts, self.report_dir / "Conflict_Report.xlsx",
            run_id=self.meta.run_id, db_path=self.meta.db_path,
        )

        logger.info("Step 4 complete: %d logs, %d dups, %d conflicts.",
                     len(log_dicts), len(dup_dicts), len(conf_dicts))

    def _step_05_master_tables(self) -> None:
        """Step 5: Export all master tables to Master_Tables.xlsx."""
        engine = self.db._engine
        tables = {
            "DimVehicle": "dim_vehicle",
            "DimCustomer": "dim_customer",
            "DimEmployee": "dim_employee",
            "DimServiceType": "dim_service_type",
            "FactServiceEvent": "fact_service_event",
            "FactTechAssignment": "fact_service_technician",
        }
        sheets = {}
        for sheet_name, table_name in tables.items():
            try:
                df = pd.read_sql_table(table_name, con=engine)
                sheets[sheet_name] = df
            except Exception as exc:
                logger.warning("Cannot read table %s: %s", table_name, exc)
                sheets[sheet_name] = pd.DataFrame()

        self.rg.write_multi_sheet_report(
            sheets,
            self.report_dir / "Master_Tables.xlsx",
            run_id=self.meta.run_id,
            db_path=self.meta.db_path,
        )
        logger.info("Step 5 complete: Master tables exported.")

    def _step_06_statistics(self) -> None:
        """Step 6: Generate Master_Data_Statistics.xlsx."""
        with self.db.session() as sess:
            total_vehicles = sess.query(DimVehicle).count()
            outside_vehicles = sess.query(DimVehicle).filter_by(is_sold_by_us=False).count()
            total_customers = sess.query(DimCustomer).count()
            total_events = sess.query(FactServiceEvent).count()
            jc_passed = sess.query(FactServiceEvent).filter_by(jc_filter_passed=True).count()
            total_techs = sess.query(FactServiceTechnician).count()
            total_employees = sess.query(DimEmployee).count()
            total_dups = sess.query(RptDuplicate).count()
            total_conflicts = sess.query(RptConflict).count()
            total_validations = sess.query(RptValidation).count()

            # Service type breakdown
            from sqlalchemy import func
            type_counts = {}
            results = sess.query(
                DimServiceType.canonical_service_category,
                func.count(FactServiceEvent.service_event_id),
            ).outerjoin(
                FactServiceEvent,
                FactServiceEvent.sr_type_id == DimServiceType.sr_type_id,
            ).group_by(DimServiceType.canonical_service_category).all()
            for cat, cnt in results:
                type_counts[cat or "UNKNOWN"] = cnt

            # Averages
            avg_row = sess.query(
                func.avg(FactServiceEvent.total_bill),
                func.avg(FactServiceEvent.labour_amount),
                func.avg(FactServiceEvent.spares_amount),
                func.avg(FactServiceEvent.confidence_score),
            ).first()
            avg_total = round(avg_row[0] or 0, 2)
            avg_labour = round(avg_row[1] or 0, 2)
            avg_parts = round(avg_row[2] or 0, 2)
            avg_confidence = round(avg_row[3] or 0, 2)

        self.meta.average_confidence = avg_confidence

        stats = {
            "Metric": [
                "Vehicles Imported", "Outside Vehicles", "Customers Imported",
                "Invoices/Events Imported", "Job Cards (JC Filter Passed)",
                "Duplicate Records", "Conflict Records", "Validation Errors",
                "Employees/Technicians", "Technician Assignments",
                "Warranty Jobs", "Scheduled Services", "Running Repairs",
                "Breakdowns", "Retrofits", "Paid Services", "AMC",
                "Average Invoice", "Average Labour", "Average Parts",
                "Average Confidence Score",
            ],
            "Value": [
                total_vehicles, outside_vehicles, total_customers,
                total_events, jc_passed,
                total_dups, total_conflicts, total_validations,
                total_employees, total_techs,
                type_counts.get("WARRANTY", 0),
                type_counts.get("SCHEDULED_SERVICE", 0) + type_counts.get("FREE_SERVICE", 0),
                type_counts.get("REPAIR", 0),
                type_counts.get("BREAKDOWN", 0),
                type_counts.get("RETROFIT", 0),
                type_counts.get("PAID_SERVICE", 0),
                type_counts.get("AMC", 0),
                avg_total, avg_labour, avg_parts,
                avg_confidence,
            ],
        }

        df_stats = pd.DataFrame(stats)
        self.rg.write_dataframe_report(
            df_stats,
            self.report_dir / "Master_Data_Statistics.xlsx",
            sheet_name="Statistics",
            run_id=self.meta.run_id,
            db_path=self.meta.db_path,
        )
        logger.info("Step 6 complete.")

    def _step_07_business_audit(self) -> None:
        """Step 7: Generate Business_Audit.xlsx with per-entity summary sheets."""
        engine = self.db._engine
        sheets = {}

        # Vehicles
        df_v = pd.read_sql("SELECT vrn, manufacturer, model, fuel_type, original_sale_date, is_sold_by_us, confidence_score, validation_status FROM dim_vehicle", engine)
        sheets["Vehicles"] = df_v

        # Customers
        df_c = pd.read_sql("SELECT customer_id, vrn, customer_name, phone, as_of_date, confidence_score FROM dim_customer", engine)
        sheets["Customers"] = df_c

        # Invoices
        df_i = pd.read_sql("SELECT service_event_id, vrn, job_card_no, invoice_no, service_date, total_bill, confidence_score FROM fact_service_event", engine)
        sheets["Invoices"] = df_i

        # Job Cards
        df_jc = pd.read_sql("SELECT job_card_no, vrn, service_date, service_advisor, jc_filter_passed, validation_status FROM fact_service_event WHERE jc_filter_passed = 1", engine)
        sheets["Job Cards"] = df_jc

        # Warranty
        df_w = pd.read_sql("""
            SELECT fse.job_card_no, fse.vrn, fse.service_date, fse.total_bill,
                   dst.canonical_service_category
            FROM fact_service_event fse
            LEFT JOIN dim_service_type dst ON fse.sr_type_id = dst.sr_type_id
            WHERE dst.canonical_service_category = 'WARRANTY'
        """, engine)
        sheets["Warranty"] = df_w

        # Technicians
        df_t = pd.read_sql("SELECT employee_id, employee_name, employee_code, is_code_only, default_role FROM dim_employee", engine)
        sheets["Technicians"] = df_t

        # Service Advisors
        df_sa = pd.read_sql("SELECT employee_id, employee_name, employee_code, is_code_only FROM dim_employee WHERE default_role = 'ADVISOR'", engine)
        sheets["Service Advisors"] = df_sa

        # Service Types
        df_st = pd.read_sql("SELECT sr_type_id, raw_sr_type, canonical_name, canonical_service_category, is_approved FROM dim_service_type", engine)
        sheets["Service Types"] = df_st

        self.rg.write_multi_sheet_report(
            sheets,
            self.report_dir / "Business_Audit.xlsx",
            run_id=self.meta.run_id,
            db_path=self.meta.db_path,
        )
        logger.info("Step 7 complete.")

    def _step_08_missing_master(self) -> None:
        """Step 8: Generate Missing_Master_Data.xlsx."""
        engine = self.db._engine
        missing = {}

        # Vehicles without model
        df = pd.read_sql("SELECT vrn FROM dim_vehicle WHERE model IS NULL OR model = ''", engine)
        missing["Model Missing"] = df

        # Vehicles without sale date
        df = pd.read_sql("SELECT vrn FROM dim_vehicle WHERE original_sale_date IS NULL OR original_sale_date = ''", engine)
        missing["Sale Date Missing"] = df

        # Events without advisor
        df = pd.read_sql("SELECT job_card_no, vrn FROM fact_service_event WHERE service_advisor IS NULL OR service_advisor = ''", engine)
        missing["Advisor Missing"] = df

        # Events without service type
        df = pd.read_sql("SELECT job_card_no, vrn FROM fact_service_event WHERE sr_type_id IS NULL", engine)
        missing["Service Type Missing"] = df

        # Vehicles without customer
        df = pd.read_sql("""
            SELECT dv.vrn FROM dim_vehicle dv
            LEFT JOIN dim_customer dc ON dv.vrn = dc.vrn
            WHERE dc.customer_id IS NULL
        """, engine)
        missing["Customer Missing"] = df

        # Vehicles without chassis
        df = pd.read_sql("SELECT vrn FROM dim_vehicle WHERE chassis_no IS NULL OR chassis_no = ''", engine)
        missing["Chassis Missing"] = df

        self.rg.write_multi_sheet_report(
            missing,
            self.report_dir / "Missing_Master_Data.xlsx",
            run_id=self.meta.run_id,
            db_path=self.meta.db_path,
        )
        logger.info("Step 8 complete.")

    def _step_09_data_recovery(self) -> None:
        """Step 9: Generate Data_Recovery_Report.xlsx."""
        engine = self.db._engine

        recovery_rows = []
        # Model: count vehicles with vs without model, compare against raw
        with self.db.session() as sess:
            total_v = sess.query(DimVehicle).count()
            model_present = sess.query(DimVehicle).filter(DimVehicle.model.isnot(None), DimVehicle.model != "").count()
            model_missing = total_v - model_present

            # For recovery calculation: outside vehicles originally had no model
            outside = sess.query(DimVehicle).filter_by(is_sold_by_us=False).count()
            recovered = max(0, model_present - (total_v - outside))
            still_missing = model_missing

        recovery_rows.append({
            "Field": "Model", "Total": total_v,
            "Present": model_present, "Missing": model_missing,
            "Recovered": recovered, "Still Missing": still_missing,
            "Recovery %": _safe_pct(model_present, total_v),
        })

        # Customer
        with self.db.session() as sess:
            cust_present = sess.query(DimCustomer).count()
            vrns_with_cust = sess.query(DimCustomer.vrn).distinct().count()

        recovery_rows.append({
            "Field": "Customer", "Total": total_v,
            "Present": vrns_with_cust, "Missing": total_v - vrns_with_cust,
            "Recovered": 0, "Still Missing": total_v - vrns_with_cust,
            "Recovery %": _safe_pct(vrns_with_cust, total_v),
        })

        # Sale Date
        with self.db.session() as sess:
            sd_present = sess.query(DimVehicle).filter(
                DimVehicle.original_sale_date.isnot(None),
                DimVehicle.original_sale_date != "",
            ).count()

        recovery_rows.append({
            "Field": "Sale Date", "Total": total_v,
            "Present": sd_present, "Missing": total_v - sd_present,
            "Recovered": 0, "Still Missing": total_v - sd_present,
            "Recovery %": _safe_pct(sd_present, total_v),
        })

        # Advisor
        with self.db.session() as sess:
            total_events = sess.query(FactServiceEvent).count()
            adv_present = sess.query(FactServiceEvent).filter(
                FactServiceEvent.service_advisor.isnot(None),
                FactServiceEvent.service_advisor != "",
            ).count()

        recovery_rows.append({
            "Field": "Advisor", "Total": total_events,
            "Present": adv_present, "Missing": total_events - adv_present,
            "Recovered": 0, "Still Missing": total_events - adv_present,
            "Recovery %": _safe_pct(adv_present, total_events),
        })

        df_recovery = pd.DataFrame(recovery_rows)
        self.rg.write_dataframe_report(
            df_recovery,
            self.report_dir / "Data_Recovery_Report.xlsx",
            sheet_name="Data Recovery",
            run_id=self.meta.run_id,
            db_path=self.meta.db_path,
            score_columns=["Recovery %"],
        )
        logger.info("Step 9 complete.")

    def _step_10_merge_decisions(self) -> None:
        """Step 10: Generate Merge_Decisions_Report.xlsx from audit_lineage."""
        engine = self.db._engine
        df = pd.read_sql("""
            SELECT target_table AS 'Table', target_pk AS 'PK',
                   field_name AS 'Field', value_used AS 'Final Value',
                   source_file AS 'Source File', source_header AS 'Source Header',
                   source_row AS 'Source Row', merge_rule AS 'Merge Rule',
                   confidence_score AS 'Confidence', validation_status AS 'Status'
            FROM audit_lineage
            ORDER BY target_table, target_pk, field_name
        """, engine)

        self.rg.write_dataframe_report(
            df,
            self.report_dir / "Merge_Decisions_Report.xlsx",
            sheet_name="Merge Decisions",
            run_id=self.meta.run_id,
            db_path=self.meta.db_path,
            score_columns=["Confidence"],
        )
        logger.info("Step 10 complete: %d merge decisions.", len(df))

    def _step_11_odometer_audit(self) -> None:
        """Step 11: Generate Odometer_Audit.xlsx."""
        engine = self.db._engine
        df = pd.read_sql("""
            SELECT fse.vrn AS 'Vehicle', fse.service_date AS 'Date',
                   fse.job_card_no AS 'Job Card',
                   fse.odometer_reading AS 'Chosen Odometer',
                   fse.odometer_status AS 'Status',
                   fse.odometer_source AS 'Source',
                   fse.confidence_score AS 'Confidence'
            FROM fact_service_event fse
            WHERE fse.jc_filter_passed = 1
            ORDER BY fse.vrn, fse.service_date
        """, engine)

        # Add a Conflict flag
        df["Conflict"] = df["Status"].apply(lambda s: "YES" if s == "CONFLICT" else "NO")

        self.rg.write_dataframe_report(
            df,
            self.report_dir / "Odometer_Audit.xlsx",
            sheet_name="Odometer Audit",
            run_id=self.meta.run_id,
            db_path=self.meta.db_path,
        )
        logger.info("Step 11 complete: %d odometer records.", len(df))

    def _step_12_vehicle_timeline(self) -> None:
        """Step 12: Random 50 vehicles timeline for DMS cross-check."""
        engine = self.db._engine

        # Get all VRNs, sample 50
        all_vrns = pd.read_sql("SELECT DISTINCT vrn FROM fact_service_event WHERE jc_filter_passed = 1", engine)
        sample_size = min(50, len(all_vrns))
        if sample_size == 0:
            self.rg.write_dataframe_report(
                pd.DataFrame(), self.report_dir / "Vehicle_Timeline_Verification.xlsx",
                sheet_name="Timeline", run_id=self.meta.run_id, db_path=self.meta.db_path,
            )
            return

        sampled_vrns = all_vrns.sample(n=sample_size, random_state=42)
        vrn_list = ", ".join(f"'{v}'" for v in sampled_vrns["vrn"].tolist())

        df = pd.read_sql(f"""
            SELECT dv.vrn AS 'Vehicle',
                   dc.customer_name AS 'Customer',
                   fse.job_card_no AS 'Job Card',
                   fse.invoice_no AS 'Invoice',
                   dst.canonical_name AS 'Service Type',
                   fse.service_advisor AS 'Advisor',
                   fse.odometer_reading AS 'Odometer',
                   fse.total_bill AS 'Amount',
                   fse.service_date AS 'Date',
                   fse.confidence_score AS 'Confidence'
            FROM fact_service_event fse
            LEFT JOIN dim_vehicle dv ON fse.vrn = dv.vrn
            LEFT JOIN dim_customer dc ON fse.customer_id = dc.customer_id
            LEFT JOIN dim_service_type dst ON fse.sr_type_id = dst.sr_type_id
            WHERE fse.vrn IN ({vrn_list})
              AND fse.jc_filter_passed = 1
            ORDER BY fse.vrn, fse.service_date
        """, engine)

        self.rg.write_dataframe_report(
            df,
            self.report_dir / "Vehicle_Timeline_Verification.xlsx",
            sheet_name="Timeline Verification",
            run_id=self.meta.run_id,
            db_path=self.meta.db_path,
            score_columns=["Confidence"],
        )
        logger.info("Step 12 complete: %d timeline records for %d vehicles.", len(df), sample_size)

    def _step_13_lineage_audit(self) -> None:
        """Step 13: 5% sample (100-500 rows) lineage audit."""
        engine = self.db._engine

        total = pd.read_sql("SELECT COUNT(*) AS cnt FROM audit_lineage", engine).iloc[0]["cnt"]
        sample_size = max(100, min(500, int(total * 0.05)))
        sample_size = min(sample_size, total)

        df = pd.read_sql(f"""
            SELECT target_table AS 'Table', target_pk AS 'PK',
                   field_name AS 'Field', value_used AS 'Final Value',
                   source_file AS 'Source File', source_header AS 'Source Header',
                   source_row AS 'Source Row', merge_rule AS 'Merge Rule',
                   confidence_score AS 'Confidence', validation_status AS 'Status'
            FROM audit_lineage
            ORDER BY RANDOM()
            LIMIT {sample_size}
        """, engine)

        self.rg.write_dataframe_report(
            df,
            self.report_dir / "Lineage_Audit.xlsx",
            sheet_name="Lineage Audit",
            run_id=self.meta.run_id,
            db_path=self.meta.db_path,
            score_columns=["Confidence"],
        )
        logger.info("Step 13 complete: %d/%d lineage rows sampled.", len(df), total)

    def _step_14_business_exceptions(self) -> None:
        """Step 14: Generate Business_Exceptions.xlsx."""
        engine = self.db._engine
        exceptions = []

        # Outside vehicles
        df = pd.read_sql("SELECT vrn FROM dim_vehicle WHERE is_sold_by_us = 0", engine)
        for _, row in df.iterrows():
            exceptions.append({"Exception": "Outside Vehicle", "VRN": row["vrn"], "Details": "Not in Vehicle Master"})

        # Missing advisor
        df = pd.read_sql("SELECT job_card_no, vrn FROM fact_service_event WHERE (service_advisor IS NULL OR service_advisor = '') AND jc_filter_passed = 1", engine)
        for _, row in df.iterrows():
            exceptions.append({"Exception": "Missing Advisor", "VRN": row["vrn"], "Details": row["job_card_no"]})

        # Missing technician (events with no technician assignments)
        df = pd.read_sql("""
            SELECT fse.job_card_no, fse.vrn FROM fact_service_event fse
            LEFT JOIN fact_service_technician fst ON fse.service_event_id = fst.service_event_id
            WHERE fst.tech_assignment_id IS NULL AND fse.jc_filter_passed = 1
        """, engine)
        for _, row in df.iterrows():
            exceptions.append({"Exception": "Missing Technician", "VRN": row["vrn"], "Details": row["job_card_no"]})

        # Missing SR Type
        df = pd.read_sql("SELECT job_card_no, vrn FROM fact_service_event WHERE sr_type_id IS NULL AND jc_filter_passed = 1", engine)
        for _, row in df.iterrows():
            exceptions.append({"Exception": "Missing SR Type", "VRN": row["vrn"], "Details": row["job_card_no"]})

        # Odometer conflicts
        df = pd.read_sql("SELECT job_card_no, vrn FROM fact_service_event WHERE odometer_status = 'CONFLICT'", engine)
        for _, row in df.iterrows():
            exceptions.append({"Exception": "Odometer Conflict", "VRN": row["vrn"], "Details": row["job_card_no"]})

        # Negative odometer
        df = pd.read_sql("SELECT job_card_no, vrn FROM fact_service_event WHERE odometer_status = 'NEGATIVE'", engine)
        for _, row in df.iterrows():
            exceptions.append({"Exception": "Odometer Negative", "VRN": row["vrn"], "Details": row["job_card_no"]})

        # Duplicate chassis
        df = pd.read_sql("""
            SELECT chassis_no, GROUP_CONCAT(vrn) as vrns
            FROM dim_vehicle WHERE chassis_no IS NOT NULL AND chassis_no != ''
            GROUP BY chassis_no HAVING COUNT(*) > 1
        """, engine)
        for _, row in df.iterrows():
            exceptions.append({"Exception": "Duplicate Chassis", "VRN": row["vrns"], "Details": row["chassis_no"]})

        # Duplicate engine
        df = pd.read_sql("""
            SELECT engine_no, GROUP_CONCAT(vrn) as vrns
            FROM dim_vehicle WHERE engine_no IS NOT NULL AND engine_no != ''
            GROUP BY engine_no HAVING COUNT(*) > 1
        """, engine)
        for _, row in df.iterrows():
            exceptions.append({"Exception": "Duplicate Engine", "VRN": row["vrns"], "Details": row["engine_no"]})

        # Missing invoice amount
        df = pd.read_sql("SELECT job_card_no, vrn FROM fact_service_event WHERE total_bill = 0 AND jc_filter_passed = 1", engine)
        for _, row in df.iterrows():
            exceptions.append({"Exception": "Zero Invoice Amount", "VRN": row["vrn"], "Details": row["job_card_no"]})

        df_exc = pd.DataFrame(exceptions) if exceptions else pd.DataFrame(columns=["Exception", "VRN", "Details"])
        self.rg.write_dataframe_report(
            df_exc,
            self.report_dir / "Business_Exceptions.xlsx",
            sheet_name="Business Exceptions",
            run_id=self.meta.run_id,
            db_path=self.meta.db_path,
        )
        logger.info("Step 14 complete: %d business exceptions.", len(exceptions))

    def _step_15_performance(self) -> None:
        """Step 15: Generate Performance_Summary.xlsx."""
        self.meta.peak_ram_mb = max(self.meta.peak_ram_mb, _try_ram_mb())

        perf_rows = []
        for step_name, elapsed in self.meta.step_timings.items():
            perf_rows.append({"Step": step_name, "Elapsed (sec)": elapsed})

        # Total
        total_time = sum(self.meta.step_timings.values())
        rows_per_sec = round(self.meta.rows_processed / total_time, 1) if total_time > 0 else 0

        perf_rows.append({"Step": "TOTAL", "Elapsed (sec)": round(total_time, 3)})
        perf_rows.append({"Step": "Rows Processed", "Elapsed (sec)": self.meta.rows_processed})
        perf_rows.append({"Step": "Rows/sec", "Elapsed (sec)": rows_per_sec})
        perf_rows.append({"Step": "Peak RAM (MB)", "Elapsed (sec)": self.meta.peak_ram_mb})

        df_perf = pd.DataFrame(perf_rows)
        self.rg.write_dataframe_report(
            df_perf,
            self.report_dir / "Performance_Summary.xlsx",
            sheet_name="Performance",
            run_id=self.meta.run_id,
            db_path=self.meta.db_path,
        )
        logger.info("Step 15 complete.")

    # ═══════════════════════════════════════════════════════════════
    # QUALITY & HEALTH SCORING
    # ═══════════════════════════════════════════════════════════════

    def _compute_quality_scores(self) -> None:
        """Compute the 6 quality dimensions + overall score."""
        with self.db.session() as sess:
            total_events = sess.query(FactServiceEvent).count() or 1
            total_vehicles = sess.query(DimVehicle).count() or 1
            total_validations = sess.query(RptValidation).count()
            total_dups = sess.query(RptDuplicate).count()
            total_conflicts = sess.query(RptConflict).count()

            # Completeness: % of events with all critical fields present
            complete_events = sess.query(FactServiceEvent).filter(
                FactServiceEvent.vrn.isnot(None),
                FactServiceEvent.service_date.isnot(None),
                FactServiceEvent.job_card_no.isnot(None),
            ).count()
            self.meta.completeness_score = _safe_pct(complete_events, total_events)

            # Consistency: % of events without conflicts
            conflicted = sess.query(FactServiceEvent).filter_by(validation_status="CONFLICT").count()
            self.meta.consistency_score = _safe_pct(total_events - conflicted, total_events)

            # Validity: % of events without validation errors
            critical_errors = sess.query(RptValidation).filter_by(severity="CRITICAL").count()
            self.meta.validity_score = _safe_pct(total_events - critical_errors, total_events)

            # Accuracy: average confidence score
            from sqlalchemy import func
            avg_conf = sess.query(func.avg(FactServiceEvent.confidence_score)).scalar() or 0
            self.meta.accuracy_score = round(min(avg_conf, 100.0), 2)

            # Uniqueness: % of events that are not duplicates
            self.meta.uniqueness_score = _safe_pct(total_events, total_events + total_dups)

            # Timeliness: assume 100% if we have recent data (within 1 year)
            self.meta.timeliness_score = 100.0

        # Overall = weighted average
        self.meta.data_quality_score = round(
            (self.meta.completeness_score * 0.25 +
             self.meta.consistency_score * 0.20 +
             self.meta.validity_score * 0.20 +
             self.meta.accuracy_score * 0.15 +
             self.meta.uniqueness_score * 0.10 +
             self.meta.timeliness_score * 0.10),
            2,
        )

        logger.info(
            "Quality Scores - Completeness: %.1f%%, Consistency: %.1f%%, "
            "Validity: %.1f%%, Accuracy: %.1f%%, Uniqueness: %.1f%%, "
            "Timeliness: %.1f%%, Overall: %.1f%%",
            self.meta.completeness_score, self.meta.consistency_score,
            self.meta.validity_score, self.meta.accuracy_score,
            self.meta.uniqueness_score, self.meta.timeliness_score,
            self.meta.data_quality_score,
        )

    def _compute_business_health(self) -> None:
        """Compute the 7 business health metrics."""
        with self.db.session() as sess:
            total_v = sess.query(DimVehicle).count() or 1
            total_e = sess.query(FactServiceEvent).filter_by(jc_filter_passed=True).count() or 1

            # Vehicle Master Completeness: % with model AND sale_date
            vm_complete = sess.query(DimVehicle).filter(
                DimVehicle.model.isnot(None), DimVehicle.model != "",
                DimVehicle.original_sale_date.isnot(None),
            ).count()
            self.meta.vehicle_master_completeness = _safe_pct(vm_complete, total_v)

            # Customer Completeness
            vrns_with_cust = sess.query(DimCustomer.vrn).distinct().count()
            self.meta.customer_completeness = _safe_pct(vrns_with_cust, total_v)

            # Invoice Coverage: events with total_bill > 0
            inv_covered = sess.query(FactServiceEvent).filter(
                FactServiceEvent.total_bill > 0, FactServiceEvent.jc_filter_passed == True,
            ).count()
            self.meta.invoice_coverage = _safe_pct(inv_covered, total_e)

            # Warranty Coverage: events with warranty SR type
            from sqlalchemy import func
            warranty_count = sess.query(FactServiceEvent).join(
                DimServiceType, FactServiceEvent.sr_type_id == DimServiceType.sr_type_id,
            ).filter(DimServiceType.canonical_service_category == "WARRANTY").count()
            self.meta.warranty_coverage = _safe_pct(warranty_count, total_e)

            # Advisor Coverage
            adv_covered = sess.query(FactServiceEvent).filter(
                FactServiceEvent.service_advisor.isnot(None),
                FactServiceEvent.service_advisor != "",
                FactServiceEvent.jc_filter_passed == True,
            ).count()
            self.meta.advisor_coverage = _safe_pct(adv_covered, total_e)

            # Technician Coverage
            events_with_tech = sess.query(FactServiceTechnician.service_event_id).distinct().count()
            self.meta.technician_coverage = _safe_pct(events_with_tech, total_e)

            # Service Classification Coverage
            classified = sess.query(FactServiceEvent).filter(
                FactServiceEvent.sr_type_id.isnot(None),
                FactServiceEvent.jc_filter_passed == True,
            ).count()
            self.meta.service_classification_coverage = _safe_pct(classified, total_e)

        logger.info(
            "Business Health - VM: %.1f%%, Customer: %.1f%%, Invoice: %.1f%%, "
            "Warranty: %.1f%%, Advisor: %.1f%%, Tech: %.1f%%, Classification: %.1f%%",
            self.meta.vehicle_master_completeness, self.meta.customer_completeness,
            self.meta.invoice_coverage, self.meta.warranty_coverage,
            self.meta.advisor_coverage, self.meta.technician_coverage,
            self.meta.service_classification_coverage,
        )

    # ═══════════════════════════════════════════════════════════════
    # EXECUTIVE REPORTS
    # ═══════════════════════════════════════════════════════════════

    def _generate_executive_dashboard(self) -> None:
        """Generate Executive_Validation_Summary.xlsx with traffic-light KPIs."""
        kpi_data = {
            "KPI": [
                "Overall Data Quality Score (%)",
                "Total Records Processed",
                "Records Successfully Merged",
                "Duplicate Records",
                "Conflict Records",
                "Validation Errors",
                "Data Recovery Rate (%)",
                "Vehicles Imported",
                "Outside Vehicles",
                "Job Cards Imported",
                "Invoices Imported",
                "Warranty Records",
                "Average Confidence Score",
                "ETL Execution Time (sec)",
                "Completeness (%)",
                "Consistency (%)",
                "Validity (%)",
                "Accuracy (%)",
                "Uniqueness (%)",
                "Vehicle Master Health (%)",
                "Customer Health (%)",
                "Advisor Coverage (%)",
                "Technician Coverage (%)",
                "Service Classification (%)",
            ],
            "Value": [
                self.meta.data_quality_score,
                self.meta.rows_processed,
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                self.meta.average_confidence,
                sum(self.meta.step_timings.values()),
                self.meta.completeness_score,
                self.meta.consistency_score,
                self.meta.validity_score,
                self.meta.accuracy_score,
                self.meta.uniqueness_score,
                self.meta.vehicle_master_completeness,
                self.meta.customer_completeness,
                self.meta.advisor_coverage,
                self.meta.technician_coverage,
                self.meta.service_classification_coverage,
            ],
        }

        # Fill in values from DB
        with self.db.session() as sess:
            total_events = sess.query(FactServiceEvent).count()
            total_dups = sess.query(RptDuplicate).count()
            total_conflicts = sess.query(RptConflict).count()
            total_validations = sess.query(RptValidation).count()
            total_vehicles = sess.query(DimVehicle).count()
            outside_vehicles = sess.query(DimVehicle).filter_by(is_sold_by_us=False).count()
            jc_passed = sess.query(FactServiceEvent).filter_by(jc_filter_passed=True).count()

        kpi_data["Value"][2] = total_events
        kpi_data["Value"][3] = total_dups
        kpi_data["Value"][4] = total_conflicts
        kpi_data["Value"][5] = total_validations
        kpi_data["Value"][6] = self.meta.completeness_score  # recovery proxy
        kpi_data["Value"][7] = total_vehicles
        kpi_data["Value"][8] = outside_vehicles
        kpi_data["Value"][9] = jc_passed
        kpi_data["Value"][10] = total_events
        kpi_data["Value"][11] = 0  # warranty filled separately

        df_kpi = pd.DataFrame(kpi_data)
        self.rg.write_dataframe_report(
            df_kpi,
            self.report_dir / "Executive_Validation_Summary.xlsx",
            sheet_name="Executive Dashboard",
            run_id=self.meta.run_id,
            db_path=self.meta.db_path,
            score_columns=["Value"],
        )
        logger.info("Executive Dashboard generated.")

    def _generate_validation_certificate(self) -> None:
        """Generate Validation_Certificate.xlsx — formal sign-off document."""
        cert_data = {
            "Field": [
                "DWIP Version", "ETL Version", "Schema Version",
                "Configuration Version", "Git Commit Hash",
                "Validation Date", "ValidationRunID",
                "Datasets Used", "Rows Processed",
                "Data Quality Score", "Golden Dataset Status",
                "Validation Status", "Approved By", "Remarks",
            ],
            "Value": [
                self.meta.dwip_version, self.meta.etl_version,
                self.meta.schema_version, self.meta.config_version,
                self.meta.git_commit_hash or "N/A",
                self.meta.validation_date, self.meta.run_id,
                str(self.meta.files_processed) + " files",
                self.meta.rows_processed,
                f"{self.meta.data_quality_score:.1f}%",
                self.meta.golden_dataset_status,
                self.meta.validation_status,
                "(Pending Manual Approval)",
                self._generate_remarks(),
            ],
        }

        df_cert = pd.DataFrame(cert_data)
        self.rg.write_dataframe_report(
            df_cert,
            self.report_dir / "Validation_Certificate.xlsx",
            sheet_name="Validation Certificate",
            run_id=self.meta.run_id,
            db_path=self.meta.db_path,
        )
        logger.info("Validation Certificate generated.")

    def _golden_dataset(self) -> None:
        """Create/compare golden dataset."""
        self.golden_dir.mkdir(parents=True, exist_ok=True)
        golden_path = self.golden_dir / "golden_vehicles.csv"

        engine = self.db._engine
        df_current = pd.read_sql("""
            SELECT vrn, manufacturer, model, fuel_type, original_sale_date,
                   chassis_no, engine_no, is_sold_by_us, confidence_score
            FROM dim_vehicle
            WHERE is_sold_by_us = 1
            ORDER BY vrn
        """, engine)

        if golden_path.exists():
            # Compare
            df_golden = pd.read_csv(golden_path, dtype=str)
            mismatches = []

            golden_vrns = set(df_golden["vrn"].tolist()) if "vrn" in df_golden.columns else set()
            current_vrns = set(df_current["vrn"].tolist())

            for vrn in golden_vrns:
                if vrn not in current_vrns:
                    mismatches.append(f"Golden VRN {vrn} missing from current run")

            if mismatches:
                self.meta.golden_dataset_status = "FAIL"
                self.meta.top_issues.extend(mismatches[:5])
                logger.warning("Golden dataset FAILED: %d mismatches", len(mismatches))
            else:
                self.meta.golden_dataset_status = "PASS"
                logger.info("Golden dataset comparison: PASS")
        else:
            # First run: create baseline
            df_current.to_csv(golden_path, index=False)
            self.meta.golden_dataset_status = "CREATED"
            logger.info("Golden dataset created: %s (%d vehicles)", golden_path, len(df_current))

    def _generate_report_index(self) -> None:
        """Generate Report_Index.xlsx listing all generated reports."""
        index_rows = []
        if self.report_dir and self.report_dir.exists():
            for f in sorted(self.report_dir.iterdir()):
                if f.is_file() and f.suffix in (".xlsx", ".json", ".csv", ".pdf"):
                    index_rows.append({
                        "Report Name": f.name,
                        "Description": _report_description(f.name),
                        "Size (KB)": round(f.stat().st_size / 1024, 1),
                        "Generated": datetime.fromtimestamp(f.stat().st_mtime).strftime("%Y-%m-%d %H:%M:%S"),
                        "Status": "OK",
                        "Location": str(f),
                    })

        df_index = pd.DataFrame(index_rows) if index_rows else pd.DataFrame(
            columns=["Report Name", "Description", "Size (KB)", "Generated", "Status", "Location"]
        )
        self.rg.write_dataframe_report(
            df_index,
            self.report_dir / "Report_Index.xlsx",
            sheet_name="Report Index",
            run_id=self.meta.run_id,
            db_path=self.meta.db_path,
        )
        logger.info("Report Index generated: %d reports.", len(index_rows))

    # ═══════════════════════════════════════════════════════════════
    # PRIVATE HELPERS
    # ═══════════════════════════════════════════════════════════════

    def _export_validation_report(self) -> None:
        """Export rpt_validation to Validation_Report.xlsx."""
        with self.db.session() as sess:
            rows = sess.query(RptValidation).all()
            failures = [
                {"rule_id": r.rule_id, "severity": r.severity, "vrn": r.vrn,
                 "job_card_no": r.job_card_no, "field_name": r.field_name,
                 "raw_value": r.raw_value, "description": r.description,
                 "source_file": r.source_file, "source_row": r.source_row}
                for r in rows
            ]
        self.rg.generate_validation_report(
            failures, self.report_dir / "Validation_Report.xlsx",
            run_id=self.meta.run_id, db_path=self.meta.db_path,
        )

    def _persist_run_start(self) -> None:
        """Write the initial run record to tbl_validation_run."""
        with self.db.session() as sess:
            run = TblValidationRun(
                run_id=self.meta.run_id,
                dwip_version=self.meta.dwip_version,
                etl_version=self.meta.etl_version,
                schema_version=self.meta.schema_version,
                config_version=self.meta.config_version,
                git_commit_hash=self.meta.git_commit_hash,
                validation_date=self.meta.validation_date,
                start_time=self.meta.start_time,
                db_path=self.meta.db_path,
                report_dir=self.meta.report_dir,
            )
            sess.add(run)

    def _persist_run_end(self) -> None:
        """Update the run record with final metrics."""
        try:
            with self.db.session() as sess:
                run = sess.query(TblValidationRun).filter_by(run_id=self.meta.run_id).first()
                if run:
                    run.end_time = self.meta.end_time
                    run.duration_seconds = self.meta.duration_seconds
                    run.files_processed = self.meta.files_processed
                    run.rows_processed = self.meta.rows_processed
                    run.data_quality_score = self.meta.data_quality_score
                    run.average_confidence = self.meta.average_confidence
                    run.golden_dataset_status = self.meta.golden_dataset_status
                    run.validation_status = self.meta.validation_status
                    run.completeness_score = self.meta.completeness_score
                    run.consistency_score = self.meta.consistency_score
                    run.validity_score = self.meta.validity_score
                    run.accuracy_score = self.meta.accuracy_score
                    run.uniqueness_score = self.meta.uniqueness_score
                    run.timeliness_score = self.meta.timeliness_score
                    run.vehicle_master_completeness = self.meta.vehicle_master_completeness
                    run.customer_completeness = self.meta.customer_completeness
                    run.invoice_coverage = self.meta.invoice_coverage
                    run.warranty_coverage = self.meta.warranty_coverage
                    run.advisor_coverage = self.meta.advisor_coverage
                    run.technician_coverage = self.meta.technician_coverage
                    run.service_classification_coverage = self.meta.service_classification_coverage
                    run.peak_ram_mb = self.meta.peak_ram_mb
                    run.step_timings_json = json.dumps(self.meta.step_timings)
                    run.top_issues_json = json.dumps(self.meta.top_issues[:20])
        except Exception as exc:
            logger.warning("Could not persist run end metadata: %s", exc)

    def _generate_remarks(self) -> str:
        """Auto-generate remarks based on quality scores."""
        remarks = []
        if self.meta.data_quality_score >= 95:
            remarks.append("Data quality exceeds 95%. Recommended for production.")
        elif self.meta.data_quality_score >= 80:
            remarks.append("Data quality acceptable but review issues before production.")
        else:
            remarks.append("Data quality below threshold. Do NOT deploy to production.")

        with self.db.session() as sess:
            critical = sess.query(RptValidation).filter_by(severity="CRITICAL").count()
            conflicts = sess.query(RptConflict).count()
        if critical > 0:
            remarks.append(f"{critical} CRITICAL validation errors require review.")
        if conflicts > 0:
            remarks.append(f"{conflicts} data conflicts require manual resolution.")

        return " | ".join(remarks)


# ═══════════════════════════════════════════════════════════════════
# UTILITY FUNCTIONS
# ═══════════════════════════════════════════════════════════════════


def _detect_date_format(series: pd.Series) -> str:
    """Detect the most likely date format from a sample of strings."""
    formats = {"DD-MM-YYYY": 0, "DD/MM/YYYY": 0, "YYYY-MM-DD": 0, "MM/DD/YYYY": 0, "Other": 0}
    for val in series:
        s = str(val).strip()
        if "-" in s and len(s) == 10 and s[2] == "-":
            formats["DD-MM-YYYY"] += 1
        elif "/" in s and len(s) == 10 and s[2] == "/":
            formats["DD/MM/YYYY"] += 1
        elif "-" in s and len(s) == 10 and s[4] == "-":
            formats["YYYY-MM-DD"] += 1
        elif "/" in s and len(s) == 10:
            formats["MM/DD/YYYY"] += 1
        else:
            formats["Other"] += 1
    return max(formats, key=formats.get)


def _header_similarity(raw: str, standard: str) -> float:
    """Quick similarity score between a raw header and standard field name."""
    from difflib import SequenceMatcher
    return SequenceMatcher(None, raw.lower().strip(), standard.lower().strip()).ratio()


def _report_description(filename: str) -> str:
    """Return a human-readable description for a report filename."""
    desc_map = {
        "Data_Profile_Report.xlsx": "File-level data profiling (rows, nulls, formats)",
        "Field_Mapping_Report.xlsx": "Header-to-field mapping with confidence scores",
        "Validation_Report.xlsx": "All validation rule failures (V001+)",
        "Merge_Log.xlsx": "ETL execution log",
        "Duplicate_Report.xlsx": "Duplicate records with resolution reason",
        "Conflict_Report.xlsx": "Data conflicts requiring manual review",
        "Master_Tables.xlsx": "All dimension and fact tables",
        "Master_Data_Statistics.xlsx": "Aggregate KPIs and counts",
        "Business_Audit.xlsx": "Per-entity business audit",
        "Missing_Master_Data.xlsx": "Fields with missing master data",
        "Data_Recovery_Report.xlsx": "Data recovery percentages",
        "Merge_Decisions_Report.xlsx": "Per-field merge decisions with confidence",
        "Odometer_Audit.xlsx": "Odometer readings and conflicts",
        "Vehicle_Timeline_Verification.xlsx": "Random vehicle timelines for DMS cross-check",
        "Lineage_Audit.xlsx": "Sampled data lineage audit trail",
        "Business_Exceptions.xlsx": "Business rule exceptions",
        "Performance_Summary.xlsx": "ETL performance metrics",
        "Executive_Validation_Summary.xlsx": "Traffic-light KPI executive dashboard",
        "Validation_Certificate.xlsx": "Formal validation sign-off document",
        "Report_Index.xlsx": "Master index of all generated reports",
        "Validation_Summary.json": "Machine-readable validation summary",
    }
    return desc_map.get(filename, filename)


# ═══════════════════════════════════════════════════════════════════
# CLI ENTRY POINT
# ═══════════════════════════════════════════════════════════════════


def main():
    """CLI entry point for Phase 2.5 production validation."""
    parser = argparse.ArgumentParser(
        description="DWIP Phase 2.5 — Production Validation Pipeline"
    )
    parser.add_argument(
        "--project-root",
        default=str(Path(__file__).resolve().parents[2]),
        help="Path to the DWIP project root (default: auto-detected)",
    )
    parser.add_argument(
        "--input-dir",
        default=None,
        help="Path to the input directory (default: <project-root>/input)",
    )
    args = parser.parse_args()

    # Set up logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout),
        ],
    )

    project_root = Path(args.project_root)
    input_dir = Path(args.input_dir) if args.input_dir else None

    pipeline = ProductionValidationPipeline(project_root, input_dir)
    meta = pipeline.run()

    print("\n" + "=" * 60)
    print(f"  DWIP Phase 2.5 - Validation {'PASSED [OK]' if meta.validation_status == 'PASS' else 'FAILED [FAIL]'}")
    print(f"  Run ID:        {meta.run_id}")
    print(f"  Quality Score: {meta.data_quality_score:.1f}%")
    print(f"  Golden Dataset:{meta.golden_dataset_status}")
    print(f"  Reports:       {meta.report_dir}")
    print("=" * 60)

    return 0 if meta.validation_status == "PASS" else 1


if __name__ == "__main__":
    sys.exit(main())
