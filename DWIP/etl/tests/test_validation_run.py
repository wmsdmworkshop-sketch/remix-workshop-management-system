"""
DWIP Phase 2.5 — Validation Run Tests
=======================================
Tests for ValidationRunManager, StepTimer, safety checks,
and tbl_validation_run ORM model.
"""

import json
import re
import tempfile
import unittest
from datetime import datetime
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from etl.src.models import Base, TblValidationRun
from etl.src.validation_run import (
    DWIP_VERSION, ETL_VERSION, SCHEMA_VERSION,
    StepTimer, ValidationRunManager, ValidationRunMetadata,
)


class TestValidationRunID(unittest.TestCase):
    """Test unique run ID generation."""

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.mgr = ValidationRunManager(Path(self.tmpdir))

    def test_run_id_format(self):
        meta = self.mgr.create_run()
        pattern = r"^VAL-\d{8}-\d{4}$"
        self.assertRegex(meta.run_id, pattern, f"RunID {meta.run_id} does not match VAL-YYYYMMDD-NNNN")

    def test_run_id_contains_today(self):
        meta = self.mgr.create_run()
        today = datetime.now().strftime("%Y%m%d")
        self.assertIn(today, meta.run_id)

    def test_sequential_ids(self):
        meta1 = self.mgr.create_run()
        meta2 = self.mgr.create_run()
        seq1 = int(meta1.run_id.split("-")[-1])
        seq2 = int(meta2.run_id.split("-")[-1])
        self.assertEqual(seq2, seq1 + 1, "Sequential IDs should increment by 1")

    def test_version_metadata_captured(self):
        meta = self.mgr.create_run()
        self.assertEqual(meta.dwip_version, DWIP_VERSION)
        self.assertEqual(meta.etl_version, ETL_VERSION)
        self.assertEqual(meta.schema_version, SCHEMA_VERSION)
        self.assertTrue(meta.validation_date)
        self.assertTrue(meta.start_time)


class TestReportFolder(unittest.TestCase):
    """Test report folder creation."""

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.mgr = ValidationRunManager(Path(self.tmpdir))

    def test_report_folder_created(self):
        meta = self.mgr.create_run()
        folder = Path(meta.report_dir)
        self.assertTrue(folder.exists(), "Report folder should be created")
        self.assertTrue(folder.is_dir())

    def test_report_folder_naming(self):
        meta = self.mgr.create_run()
        folder = Path(meta.report_dir)
        self.assertTrue(
            folder.name.startswith("validation_run_VAL-"),
            f"Folder name {folder.name} should start with 'validation_run_VAL-'"
        )

    def test_no_overwrite(self):
        meta1 = self.mgr.create_run()
        meta2 = self.mgr.create_run()
        self.assertNotEqual(meta1.report_dir, meta2.report_dir)


class TestValidationDatabase(unittest.TestCase):
    """Test validation database path and safety checks."""

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.mgr = ValidationRunManager(Path(self.tmpdir))

    def test_db_path_per_run(self):
        meta = self.mgr.create_run()
        db_path = Path(meta.db_path)
        self.assertIn(meta.run_id, db_path.name)
        self.assertTrue(db_path.name.startswith("dwip_validation_"))
        self.assertTrue(db_path.name.endswith(".db"))

    def test_safety_check_blocks_production_db(self):
        meta = self.mgr.create_run()
        prod_db = Path(self.tmpdir) / "database" / "dwip.db"
        prod_db.parent.mkdir(parents=True, exist_ok=True)
        prod_db.touch()

        with self.assertRaises(RuntimeError) as ctx:
            self.mgr.safety_check_db_path(prod_db)
        self.assertIn("SAFETY VIOLATION", str(ctx.exception))

    def test_safety_check_allows_validation_db(self):
        meta = self.mgr.create_run()
        # Should not raise
        self.mgr.safety_check_db_path(Path(meta.db_path))


class TestStepTimer(unittest.TestCase):
    """Test step timing."""

    def test_timing_recorded(self):
        meta = ValidationRunMetadata(run_id="VAL-TEST-0001")
        import time
        with StepTimer(meta, "test_step"):
            time.sleep(0.05)
        self.assertIn("test_step", meta.step_timings)
        self.assertGreater(meta.step_timings["test_step"], 0.04)


class TestTblValidationRun(unittest.TestCase):
    """Test the ORM model for tbl_validation_run."""

    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            poolclass=StaticPool,
            connect_args={"check_same_thread": False},
        )
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)

    def test_insert_and_query(self):
        with self.Session() as sess:
            run = TblValidationRun(
                run_id="VAL-20260710-0001",
                dwip_version="1.1",
                etl_version="2.5.0",
                schema_version="1.0",
                config_version="1.0",
                validation_date="2026-07-10T10:00:00",
                start_time="2026-07-10T10:00:00",
                db_path="/tmp/test.db",
                report_dir="/tmp/reports",
            )
            sess.add(run)
            sess.commit()

        with self.Session() as sess:
            result = sess.query(TblValidationRun).filter_by(
                run_id="VAL-20260710-0001"
            ).first()
            self.assertIsNotNone(result)
            self.assertEqual(result.dwip_version, "1.1")
            self.assertEqual(result.validation_status, "PENDING")

    def test_unique_run_id(self):
        with self.Session() as sess:
            sess.add(TblValidationRun(
                run_id="VAL-DUP-0001",
                dwip_version="1.1", etl_version="2.5.0",
                schema_version="1.0", config_version="1.0",
                validation_date="2026-07-10", start_time="2026-07-10",
                db_path="/tmp/a.db", report_dir="/tmp/r1",
            ))
            sess.commit()

        with self.assertRaises(Exception):
            with self.Session() as sess:
                sess.add(TblValidationRun(
                    run_id="VAL-DUP-0001",
                    dwip_version="1.1", etl_version="2.5.0",
                    schema_version="1.0", config_version="1.0",
                    validation_date="2026-07-10", start_time="2026-07-10",
                    db_path="/tmp/b.db", report_dir="/tmp/r2",
                ))
                sess.commit()


class TestValidationRunMetadata(unittest.TestCase):
    """Test metadata serialisation."""

    def test_to_dict(self):
        meta = ValidationRunMetadata(run_id="VAL-20260710-0001")
        d = meta.to_dict()
        self.assertEqual(d["ValidationRunID"], "VAL-20260710-0001")
        self.assertIn("Quality_Dimensions", d)
        self.assertIn("Business_Health", d)
        self.assertIn("Performance", d)

    def test_to_json(self):
        meta = ValidationRunMetadata(run_id="VAL-20260710-0001")
        d = meta.to_dict()
        s = json.dumps(d, default=str)
        parsed = json.loads(s)
        self.assertEqual(parsed["ValidationRunID"], "VAL-20260710-0001")


class TestFinaliseRun(unittest.TestCase):
    """Test run finalisation logic."""

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.mgr = ValidationRunManager(Path(self.tmpdir))

    def test_pass_at_95(self):
        meta = self.mgr.create_run()
        meta.data_quality_score = 96.0
        self.mgr.finalise_run(meta)
        self.assertEqual(meta.validation_status, "PASS")

    def test_fail_below_95(self):
        meta = self.mgr.create_run()
        meta.data_quality_score = 80.0
        self.mgr.finalise_run(meta)
        self.assertEqual(meta.validation_status, "FAIL")

    def test_summary_json_written(self):
        meta = self.mgr.create_run()
        meta.data_quality_score = 99.0
        self.mgr.finalise_run(meta)
        json_path = Path(meta.report_dir) / "Validation_Summary.json"
        self.assertTrue(json_path.exists())
        with open(json_path) as f:
            data = json.load(f)
        self.assertEqual(data["ValidationRunID"], meta.run_id)
        self.assertEqual(data["Validation_Status"], "PASS")


if __name__ == "__main__":
    unittest.main()
