"""
DWIP Workforce v1.1 — Unit Tests for Phase 2A (Foundation)
============================================================
Verifies:
- Config loading
- File discovery and encoding detection
- Header profiling (exact & fuzzy matching)
- Value normalization (VRN, dates, strings, amounts)
- Lineage tracking (with no DB)
"""

import unittest
import tempfile
import shutil
import json
import logging
from pathlib import Path
from unittest.mock import MagicMock

from etl.src.config_loader import ConfigLoader
from etl.src.loader import Loader, DiscoveredFile
from etl.src.profiler import Profiler
from etl.src.normalizer import Normalizer
from etl.src.lineage_tracker import LineageTracker
from etl.src.core.context import DWIPContext


class TestConfigLoader(unittest.TestCase):
    def setUp(self):
        self.temp_dir = Path(tempfile.mkdtemp())
        
        # Write dummy configs
        self.rules = {
            "synonyms": {
                "vrn": ["VRN", "Vehicle Number", "Registration"],
                "odometer": ["Odometer", "KM Reading", "Kms"]
            },
            "source_priority": {
                "odometer": ["service_history"]
            },
            "validation": {
                "jc_prefix_patterns": ["JC-"],
                "impossible_odometer_jump_km_per_day": 1000.0
            }
        }
        self.sr_map = {
            "Running Repairs": {"canonical": "Running Repair", "category": "REPAIR", "is_approved": True}
        }
        self.tech_map = {
            "MECH": {"role": "MECHANIC", "slot": "PRIMARY"}
        }
        self.mapping_rules = {
            "test_file.csv": {"VRN": "vrn"}
        }
        
        with open(self.temp_dir / "rules.json", "w") as f:
            json.dump(self.rules, f)
        with open(self.temp_dir / "sr_type_map.json", "w") as f:
            json.dump(self.sr_map, f)
        with open(self.temp_dir / "technician_column_map.json", "w") as f:
            json.dump(self.tech_map, f)
        with open(self.temp_dir / "mapping_rules.json", "w") as f:
            json.dump(self.mapping_rules, f)
            
        self.config = ConfigLoader(self.temp_dir)

    def tearDown(self):
        shutil.rmtree(self.temp_dir)

    def test_config_loading(self):
        self.assertEqual(self.config.rules["validation"]["jc_prefix_patterns"], ["JC-"])
        self.assertEqual(self.config.sr_type_map["Running Repairs"]["category"], "REPAIR")
        self.assertEqual(self.config.tech_column_map["MECH"]["role"], "MECHANIC")
        self.assertEqual(self.config.mapping_rules["test_file.csv"]["VRN"], "vrn")

    def test_synonyms_and_priorities(self):
        self.assertEqual(self.config.synonyms_for("vrn"), ["VRN", "Vehicle Number", "Registration"])
        self.assertEqual(self.config.source_priority("odometer"), ["service_history"])
        self.assertEqual(self.config.jc_prefix_patterns(), ["JC-"])
        self.assertEqual(self.config.impossible_odometer_km_per_day(), 1000.0)


class TestModels(unittest.TestCase):
    def test_orm_models_importable(self):
        from etl.src.models import (
            DimVehicle, DimCustomer, BridgeVehicleCustomer,
            DimEmployee, DimServiceType, DimDate,
            FactServiceEvent, FactServiceTechnician,
            AuditLineage
        )
        self.assertEqual(DimVehicle.__tablename__, "dim_vehicle")
        self.assertEqual(DimCustomer.__tablename__, "dim_customer")
        self.assertEqual(BridgeVehicleCustomer.__tablename__, "bridge_vehicle_customer")
        self.assertEqual(DimEmployee.__tablename__, "dim_employee")
        self.assertEqual(DimServiceType.__tablename__, "dim_service_type")
        self.assertEqual(DimDate.__tablename__, "dim_date")
        self.assertEqual(FactServiceEvent.__tablename__, "fact_service_event")
        self.assertEqual(FactServiceTechnician.__tablename__, "fact_service_technician")
        self.assertEqual(AuditLineage.__tablename__, "audit_lineage")


class TestLoaderAndDiscovery(unittest.TestCase):
    def setUp(self):
        self.temp_dir = Path(tempfile.mkdtemp())
        self.input_dir = self.temp_dir / "input"
        self.config_dir = self.temp_dir / "config"
        self.input_dir.mkdir()
        self.config_dir.mkdir()
        
        # Create empty config files
        for name in ["rules.json", "sr_type_map.json", "technician_column_map.json", "mapping_rules.json"]:
            with open(self.config_dir / name, "w") as f:
                json.dump({}, f)
                
        self.config = ConfigLoader(self.config_dir)
        self.ctx = MagicMock(
            config=self.config,
            db=None,
            logger=logging.getLogger("test"),
            input_dir=self.input_dir
        )

    def tearDown(self):
        shutil.rmtree(self.temp_dir)

    def test_file_discovery_and_encoding_utf8(self):
        # Create invoices folder and a utf-8 csv file
        inv_dir = self.input_dir / "invoices"
        inv_dir.mkdir()
        
        csv_path = inv_dir / "sample_utf8.csv"
        # UTF-8 with special character
        content = "VRN,NAME,TOTAL\nKA32AB1234,Aslam,₹500\n"
        with open(csv_path, "w", encoding="utf-8") as f:
            f.write(content)
            
        loader = Loader(self.ctx)
        files = loader.discover_and_load()
        
        self.assertEqual(len(files), 1)
        disc = files[0]
        self.assertEqual(disc.path.name, "sample_utf8.csv")
        self.assertEqual(disc.subfolder, "invoices")
        self.assertEqual(disc.file_type, "invoice")
        self.assertEqual(disc.row_count, 1)
        self.assertEqual(disc.encoding, "utf-8")
        self.assertEqual(disc.headers, ["VRN", "NAME", "TOTAL"])

    def test_file_discovery_and_encoding_latin1(self):
        # Create invoices folder and a latin-1 csv file
        inv_dir = self.input_dir / "invoices"
        inv_dir.mkdir()
        
        csv_path = inv_dir / "sample_latin1.csv"
        # Latin-1 with umlaut/accent character
        content = "VRN,NAME,TOTAL\nKA32AB1234,Jérôme,500\n"
        with open(csv_path, "w", encoding="latin-1") as f:
            f.write(content)
            
        loader = Loader(self.ctx)
        files = loader.discover_and_load()
        
        self.assertEqual(len(files), 1)
        disc = files[0]
        self.assertEqual(disc.encoding, "latin-1")
        self.assertEqual(disc.df.iloc[0]["NAME"], "Jérôme")


class TestProfilerAndHeaderDetection(unittest.TestCase):
    def setUp(self):
        self.temp_dir = Path(tempfile.mkdtemp())
        
        # Write configs with synonyms
        self.rules = {
            "synonyms": {
                "vrn": ["VRN", "Vehicle Number", "Registration No"],
                "odometer": ["Odometer", "KM Reading"]
            }
        }
        with open(self.temp_dir / "rules.json", "w") as f:
            json.dump(self.rules, f)
        with open(self.temp_dir / "sr_type_map.json", "w") as f:
            json.dump({}, f)
        with open(self.temp_dir / "technician_column_map.json", "w") as f:
            json.dump({}, f)
        with open(self.temp_dir / "mapping_rules.json", "w") as f:
            json.dump({}, f)
            
        self.config = ConfigLoader(self.temp_dir)
        self.ctx = MagicMock(config=self.config, logger=logging.getLogger("test"))
        self.profiler = Profiler(self.ctx)

    def tearDown(self):
        shutil.rmtree(self.temp_dir)

    def test_header_detection_exact_and_synonym(self):
        # Match standard field
        self.assertEqual(self.profiler.detect_field("vrn"), "vrn")
        # Match registered synonym
        self.assertEqual(self.profiler.detect_field("Vehicle Number"), "vrn")
        self.assertEqual(self.profiler.detect_field("KM Reading"), "odometer")
        # Unrecognized field
        self.assertIsNone(self.profiler.detect_field("Unknown Column"))

    def test_header_detection_fuzzy(self):
        # Fuzzy match "Registration Noo" -> vrn ("Registration No" is in synonym list)
        self.assertEqual(self.profiler.detect_field("Registration Noo"), "vrn")
        # Fuzzy match "Odometerr" -> odometer
        self.assertEqual(self.profiler.detect_field("Odometerr"), "odometer")


class TestNormalizer(unittest.TestCase):
    def test_vrn_normalization(self):
        self.assertEqual(Normalizer.vrn("KA-32-AB-1234"), "KA32AB1234")
        self.assertEqual(Normalizer.vrn("  ka 32 ab 1234  "), "KA32AB1234")
        self.assertIsNone(Normalizer.vrn("   "))
        self.assertIsNone(Normalizer.vrn(None))

    def test_vrn_validity(self):
        self.assertTrue(Normalizer.vrn_is_valid("KA32AB1234"))
        self.assertTrue(Normalizer.vrn_is_valid("MH01A123"))
        self.assertTrue(Normalizer.vrn_is_valid("DL10CAA4567"))
        self.assertFalse(Normalizer.vrn_is_valid("K32AB1234"))
        self.assertFalse(Normalizer.vrn_is_valid("KA32A12"))

    def test_date_normalization(self):
        self.assertEqual(Normalizer.date("25/06/2026"), "25-06-2026")
        self.assertEqual(Normalizer.date("2026-06-25"), "25-06-2026")
        self.assertEqual(Normalizer.date("25-06-2026"), "25-06-2026")
        self.assertIsNone(Normalizer.date("invalid-date"))
        self.assertIsNone(Normalizer.date(None))

    def test_date_parts(self):
        parts = Normalizer.date_key_to_parts("25-06-2026")
        self.assertEqual(parts["day"], 25)
        self.assertEqual(parts["month"], 6)
        self.assertEqual(parts["year"], 2026)
        self.assertEqual(parts["month_name"], "June")
        self.assertEqual(parts["quarter"], "Q1")  # June is Q1 of FY (Apr-Mar)
        self.assertEqual(parts["financial_year"], "2627") # Jun 2026 is FY 2026-27

    def test_amount_normalization(self):
        self.assertEqual(Normalizer.amount("₹1,250.50"), 1250.5)
        self.assertEqual(Normalizer.amount(" 350 "), 350.0)
        self.assertIsNone(Normalizer.amount("free"))

    def test_string_normalization(self):
        self.assertEqual(Normalizer.customer_name("DEVANAND WORKSHOP."), "Devanand Workshop")
        self.assertEqual(Normalizer.employee_name("aslam"), "Aslam")
        self.assertEqual(Normalizer.employee_name("RS1_100B210"), "RS1_100B210")
        self.assertTrue(Normalizer.is_advisor_code("RS1_100B210"))
        self.assertFalse(Normalizer.is_advisor_code("Aslam"))


class TestLineageTracker(unittest.TestCase):
    def test_batch_lineage_no_db(self):
        ctx = MagicMock(db=None, logger=logging.getLogger("test"))
        tracker = LineageTracker(ctx)
        
        # Track less than flush size
        tracker.track(
            target_table="dim_vehicle",
            target_pk="KA32AB1234",
            field_name="model",
            value_used="LPT 1613",
            source_file="master.csv",
            source_header="MODEL",
            source_row=5,
            merge_rule="Direct Import"
        )
        self.assertEqual(len(tracker._buffer), 1)
        
        # Flush explicitly
        count = tracker.flush()
        self.assertEqual(count, 1)
        self.assertEqual(len(tracker._buffer), 0)


if __name__ == "__main__":
    unittest.main()
