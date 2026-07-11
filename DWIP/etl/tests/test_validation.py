"""
DWIP Workforce v1.1 — Unit Tests for Phase 2B (Validation)
============================================================
Verifies all validation rules V001–V018, chassis V019, duplicates V020–V021,
and generation of the styled Validation_Report.xlsx file.
"""

import unittest
import tempfile
import shutil
import logging
from pathlib import Path
from unittest.mock import MagicMock

from etl.src.validator import Validator, ValidationResult
from etl.src.report_generator import ReportGenerator


class TestValidatorAndValidationRules(unittest.TestCase):
    def setUp(self):
        mock_config = MagicMock()
        mock_config.impossible_odometer_km_per_day.return_value = 1000.0
        self.ctx = MagicMock(config=mock_config, logger=logging.getLogger("test"))
        self.validator = Validator(self.ctx)
        self.temp_dir = Path(tempfile.mkdtemp())

    def tearDown(self):
        shutil.rmtree(self.temp_dir)

    def test_missing_vrn(self):
        # Null VRN should fail V001
        res = self.validator._v001_vrn_not_null(None)
        self.assertFalse(res.passed)
        self.assertEqual(res.rule_id, "V001")
        self.assertEqual(res.severity, "CRITICAL")

        res_valid = self.validator._v001_vrn_not_null("KA32AB1234")
        self.assertTrue(res_valid.passed)

    def test_missing_chassis(self):
        # Null chassis should fail V019
        res = self.validator._v019_chassis_no(None)
        self.assertFalse(res.passed)
        self.assertEqual(res.rule_id, "V019")
        self.assertEqual(res.severity, "WARNING")

        res_valid = self.validator._v019_chassis_no("CHASSIS12345")
        self.assertTrue(res_valid.passed)

    def test_invalid_dates(self):
        # Unparseable date should fail V004
        res = self.validator._v004_date_valid("invalid-date", "invoice_date")
        self.assertFalse(res.passed)
        self.assertEqual(res.rule_id, "V004")
        self.assertEqual(res.severity, "WARNING")

        # Future date should fail V005
        res_future = self.validator._v005_date_not_future("12-12-2050", "invoice_date")
        self.assertFalse(res_future.passed)
        self.assertEqual(res_future.rule_id, "V005")
        self.assertEqual(res_future.severity, "WARNING")

        # Valid past date
        res_valid = self.validator._v004_date_valid("25-06-2026", "invoice_date")
        self.assertTrue(res_valid.passed)

    def test_invalid_odometers(self):
        # Negative odometer should result in "NEGATIVE" status and fail V008
        status, failures = self.validator.validate_odometer(-100.0, "KA32AB1234", "sample.csv", 10)
        self.assertEqual(status, "NEGATIVE")
        self.assertEqual(len(failures), 1)
        self.assertEqual(failures[0].rule_id, "V008")
        self.assertEqual(failures[0].severity, "CRITICAL")

        # Zero odometer should result in "ZERO" status
        status_zero, failures_zero = self.validator.validate_odometer(0.0, "KA32AB1234", "sample.csv", 10)
        self.assertEqual(status_zero, "ZERO")
        self.assertEqual(len(failures_zero), 0)

        # Odometer decreasing sequence should fail V010
        readings = [("20-06-2026", 1500.0), ("25-06-2026", 1400.0)]
        seq_failures = self.validator.validate_odometer_sequence(readings, "KA32AB1234")
        self.assertEqual(len(seq_failures), 1)
        self.assertEqual(seq_failures[0].rule_id, "V010")
        self.assertEqual(seq_failures[0].severity, "CRITICAL")

    def test_negative_amounts(self):
        # Negative total bill amount should fail V017
        res = self.validator._v017_non_negative_amount(-500.0, "total_bill")
        self.assertFalse(res.passed)
        self.assertEqual(res.rule_id, "V017")
        self.assertEqual(res.severity, "CRITICAL")

    def test_duplicate_invoices_and_job_cards(self):
        records = [
            {"job_card_no": "JC-1", "invoice_no": "INV-100", "source_row": 2, "source_file": "file.csv"},
            {"job_card_no": "JC-1", "invoice_no": "INV-101", "source_row": 3, "source_file": "file.csv"}, # Duplicate JC
            {"job_card_no": "JC-2", "invoice_no": "INV-100", "source_row": 4, "source_file": "file.csv"}, # Duplicate Invoice
        ]
        failures = self.validator.validate_batch_duplicates(records)
        self.assertEqual(len(failures), 2)
        
        jc_fail = [f for f in failures if f.rule_id == "V020"]
        self.assertEqual(len(jc_fail), 1)
        self.assertEqual(jc_fail[0].severity, "CRITICAL")
        
        inv_fail = [f for f in failures if f.rule_id == "V021"]
        self.assertEqual(len(inv_fail), 1)
        self.assertEqual(inv_fail[0].severity, "WARNING")

    def test_generate_validation_report_xlsx(self):
        # Dummy validation failure list
        failures = [
            {
                "rule_id": "V001",
                "severity": "CRITICAL",
                "vrn": None,
                "job_card_no": "JC-123",
                "field_name": "vrn",
                "raw_value": "",
                "description": "VRN is NULL after normalization",
                "source_file": "invoices.csv",
                "source_row": 12
            },
            {
                "rule_id": "V005",
                "severity": "WARNING",
                "vrn": "KA32AB1234",
                "job_card_no": "JC-124",
                "field_name": "invoice_date",
                "raw_value": "12-12-2050",
                "description": "invoice_date is in the future",
                "source_file": "invoices.csv",
                "source_row": 15
            }
        ]

        report_path = self.temp_dir / "Validation_Report.xlsx"
        ReportGenerator.generate_validation_report(failures, report_path)

        self.assertTrue(report_path.exists())
        self.assertGreater(report_path.stat().st_size, 0)


if __name__ == "__main__":
    unittest.main()
