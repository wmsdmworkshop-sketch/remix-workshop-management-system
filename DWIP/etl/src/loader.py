"""
DWIP Workforce v1.1 — File Loader
===================================
Multi-folder CSV discovery, encoding detection, and raw data reading.
Detects encoding automatically. Classifies source files by subfolder.
Writes all raw rows into stg_raw_* tables.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import pandas as pd

from etl.src.config_loader import ConfigLoader
from etl.src.db_writer import DBWriter
from etl.src.models import (
    StgRawCustomer, StgRawInvoice,
    StgRawServiceHistory, StgRawVehicleMaster,
)
from etl.src.core.context import DWIPContext
from etl.src.core.step import ETLStep
from etl.src.core.result_types import RawData, DiscoveredFile

ENCODINGS = ["utf-8", "utf-8-sig", "latin-1", "cp1252"]


class Loader(ETLStep):
    """
    Discovers, reads, and raw-stages all input CSV files.
    """

    SUBFOLDER_TYPE_MAP = {
        "invoices":        "invoice",
        "service_history": "service_history",
        "vehicle_master":  "vehicle_master",
        "customers":       "customer_master",
        "warranty":        "service_history",   # warranty JCs processed as SH
        "breakdown":       "service_history",   # breakdown JCs processed as SH
    }

    def __init__(self, ctx: DWIPContext) -> None:
        super().__init__(ctx)
        self.input_dir = ctx.input_dir
        self.config = ctx.config
        self.db = ctx.db
        self.logger = ctx.logger



    def execute(self, data: Any = None) -> RawData:
        discovered_files = self.discover_and_load()
        total_rows = sum(d.row_count for d in discovered_files)
        return RawData(discovered_files=discovered_files, total_rows=total_rows)

    def discover_and_load(self) -> list[DiscoveredFile]:
        """
        Scan all input subfolders, read every CSV, write raw rows to DB if db is provided.
        Returns list of DiscoveredFile objects for the profiler.
        """
        discovered: list[DiscoveredFile] = []

        for subfolder_path in sorted(self.input_dir.iterdir()):
            if not subfolder_path.is_dir():
                continue
            subfolder = subfolder_path.name
            file_type = self.SUBFOLDER_TYPE_MAP.get(subfolder, "other")
            # Find all CSV files case-insensitively and avoid duplicates on case-insensitive filesystems
            csv_files = sorted(list({
                p.resolve() for p in subfolder_path.glob("*")
                if p.is_file() and p.suffix.lower() == ".csv"
            }))

            if not csv_files:
                self.logger.debug("No CSV files in input/%s/ — skipping.", subfolder)
                continue

            for csv_path in sorted(csv_files):
                disc = self._read_file(csv_path, subfolder, file_type)
                if disc is None:
                    continue
                if self.db is not None:
                    self._write_raw(disc)
                discovered.append(disc)

        self.logger.info("Loader complete. %d file(s) discovered.", len(discovered))
        if self.db is not None:
            self.db.log_merge("LOAD", "File Discovery Complete",
                              f"{len(discovered)} files loaded",
                              sum(d.row_count for d in discovered))
        return discovered

    # ── Private ───────────────────────────────────────────────────

    def _read_file(self, path: Path, subfolder: str, file_type: str) -> Optional[DiscoveredFile]:
        """Try encodings in cascade until the file reads cleanly."""
        for enc in ENCODINGS:
            try:
                df = pd.read_csv(path, dtype=str, encoding=enc, keep_default_na=False)
                # Normalize column names: strip whitespace, preserve case
                df.columns = [c.strip() for c in df.columns]
                disc = DiscoveredFile(
                    path=path,
                    subfolder=subfolder,
                    file_type=file_type,
                    row_count=len(df),
                    headers=list(df.columns),
                    encoding=enc,
                    df=df,
                )
                self.logger.info("Loaded %s (%d rows, %s, enc=%s)", path.name, len(df), file_type, enc)
                return disc
            except UnicodeDecodeError:
                continue
            except Exception as exc:
                self.logger.error("Failed to read %s: %s", path, exc)
                return None
        self.logger.error("Cannot determine encoding for %s — skipped.", path)
        return None

    def _write_raw(self, disc: DiscoveredFile) -> None:
        """Write all rows of a discovered file into the appropriate stg_raw_* table."""
        writer_map = {
            "invoice":        self._write_raw_invoice,
            "service_history": self._write_raw_service_history,
            "vehicle_master": self._write_raw_vehicle_master,
            "customer_master": self._write_raw_customer,
        }
        writer = writer_map.get(disc.file_type, self._write_raw_generic)
        writer(disc)
        self.logger.debug("Raw staged: %s (%d rows) -> %s", disc.path.name, disc.row_count, disc.file_type)

    def _write_raw_invoice(self, disc: DiscoveredFile) -> None:
        df = disc.df
        records = []
        for idx, row in df.iterrows():
            r = StgRawInvoice(
                source_file=disc.path.name,
                source_row=int(idx) + 2,  # 1-based + header row
                invoice_date_raw=self._get(row, ["INVOICE DATE", "Invoice Date", "Date"]),
                invoice_no_raw=self._get(row, ["INVOICE NO", "Invoice No", "Invoice Number"]),
                job_card_no_raw=self._get(row, ["J C NO", "Order#", "JC NO", "Job Card No"]),
                vrn_raw=self._get(row, ["VRN", "Vehicle No", "Registration"]),
                customer_name_raw=self._get(row, ["NAME", "Customer Name", "Customer"]),
                labour_raw=self._get(row, ["LABOUR", "Labour", "Final Labour Invoice Amount"]),
                spares_raw=self._get(row, ["SPARES", "Spares", "Final Spares Invoice Amount"]),
                total_raw=self._get(row, ["TOTAL", "Total", "Final Consolidated Invoice Amount", "Grand Total"]),
                advisor_raw=self._get(row, ["ADVISIOR", "Advisor", "Service Advisor", "SR Assigned To"]),
                jc_type_raw=self._get(row, ["JC TYPE", "JC Type", "Job Type", "SR Type"]),
                mech_raw=self._get(row, ["MECH", "Mechanic"]),
                tec1_raw=self._get(row, ["TEC"]),
                ele1_raw=self._get(row, ["ELE"]),
                tec2_raw=self._get(row, ["TEC.1"]),
                ele2_raw=self._get(row, ["ELE.1"]),
                add_tech_raw=self._get(row, ["ADDITIONAL TECH", "Add Tech"]),
                add_elec_raw=self._get(row, ["ADDITIONAL ELEC", "Add Elec"]),
                extra_fields_json=self._extra_fields_json(row, [
                    "INVOICE DATE", "Invoice Date", "INVOICE NO", "J C NO", "Order#",
                    "VRN", "NAME", "LABOUR", "SPARES", "TOTAL",
                    "Final Consolidated Invoice Amount",
                    "ADVISIOR", "JC TYPE", "MECH", "TEC", "ELE", "TEC.1", "ELE.1",
                    "ADDITIONAL TECH", "ADDITIONAL ELEC"
                ]),
            )
            records.append(r)
        self.db.bulk_insert(records)

    def _write_raw_service_history(self, disc: DiscoveredFile) -> None:
        df = disc.df
        records = []
        for idx, row in df.iterrows():
            r = StgRawServiceHistory(
                source_file=disc.path.name,
                source_row=int(idx) + 2,
                job_card_no_raw=self._get(row, ["J C NO", "JC NO", "Order#", "Job Card No"]),
                vrn_raw=self._get(row, ["VRN", "Vehicle No", "Registration"]),
                sr_type_raw=self._get(row, ["SR TYPE", "SR Type", "Service Type", "JC TYPE"]),
                odometer_raw=self._get(row, ["ODOMETER", "Odometer", "Odometer Reading", "KM", "Mileage"]),
                sr_assigned_to_raw=self._get(row, ["SR ASSIGNED TO", "SR Assigned To", "Advisor", "ADVISIOR"]),
                complaint_raw=self._get(row, ["COMPLAINT", "Complaint", "Complaint Description", "Symptoms"]),
                service_date_raw=self._get(row, ["SERVICE DATE", "Service Date", "Date", "INVOICE DATE"]),
                customer_name_raw=self._get(row, ["NAME", "Customer Name", "Customer"]),
                extra_fields_json=self._extra_fields_json(row, [
                    "J C NO", "VRN", "SR TYPE", "ODOMETER", "SR ASSIGNED TO",
                    "COMPLAINT", "SERVICE DATE", "NAME"
                ]),
            )
            records.append(r)
        self.db.bulk_insert(records)

    def _write_raw_vehicle_master(self, disc: DiscoveredFile) -> None:
        df = disc.df
        records = []
        for idx, row in df.iterrows():
            r = StgRawVehicleMaster(
                source_file=disc.path.name,
                source_row=int(idx) + 2,
                vrn_raw=self._get(row, ["VRN", "Vehicle No", "Registration"]),
                chassis_no_raw=self._get(row, ["CHASSIS NO", "Chassis No", "Chassis Number", "VIN"]),
                engine_no_raw=self._get(row, ["ENGINE NO", "Engine No", "Engine Number"]),
                manufacturer_raw=self._get(row, ["MANUFACTURER", "Make", "Brand", "OEM"]),
                model_raw=self._get(row, ["MODEL", "Model", "Variant"]),
                product_line_raw=self._get(row, ["PRODUCT LINE", "Product Line"]),
                fuel_type_raw=self._get(row, ["FUEL TYPE", "Fuel Type", "Fuel"]),
                original_sale_date_raw=self._get(row, ["ORIGINAL SALE DATE", "Sale Date", "DOR", "Delivery Date"]),
                color_raw=self._get(row, ["COLOR", "Colour", "Vehicle Color"]),
                customer_name_raw=self._get(row, ["NAME", "Customer Name", "Owner Name"]),
                extra_fields_json=self._extra_fields_json(row, [
                    "VRN", "CHASSIS NO", "ENGINE NO", "MANUFACTURER", "MODEL",
                    "PRODUCT LINE", "FUEL TYPE", "ORIGINAL SALE DATE", "COLOR", "NAME"
                ]),
            )
            records.append(r)
        self.db.bulk_insert(records)

    def _write_raw_customer(self, disc: DiscoveredFile) -> None:
        df = disc.df
        records = []
        for idx, row in df.iterrows():
            r = StgRawCustomer(
                source_file=disc.path.name,
                source_row=int(idx) + 2,
                vrn_raw=self._get(row, ["VRN", "Vehicle No", "Registration"]),
                customer_name_raw=self._get(row, ["NAME", "Customer Name", "Customer"]),
                phone_raw=self._get(row, ["PHONE", "Mobile", "Contact", "Phone Number"]),
                address_raw=self._get(row, ["ADDRESS", "Address", "Location", "City"]),
                extra_fields_json=self._extra_fields_json(row, ["VRN", "NAME", "PHONE", "ADDRESS"]),
            )
            records.append(r)
        self.db.bulk_insert(records)

    def _write_raw_generic(self, disc: DiscoveredFile) -> None:
        """For unknown file types — log a warning (future: stage generically)."""
        self.logger.warning(
            "Unknown file type for %s (subfolder: %s). Not staged to raw tables. "
            "Add this subfolder to SUBFOLDER_TYPE_MAP.",
            disc.path.name, disc.subfolder
        )

    @staticmethod
    def _get(row: pd.Series, candidates: list[str]) -> Optional[str]:
        """Return the first non-empty value from a list of candidate column names."""
        for col in candidates:
            if col in row.index:
                val = str(row[col]).strip()
                if val and val.lower() not in ("nan", "none", ""):
                    return val
        return None

    @staticmethod
    def _extra_fields_json(row: pd.Series, known_cols: list[str]) -> Optional[str]:
        """Capture any extra columns not in the known list."""
        extra = {
            col: str(val)
            for col, val in row.items()
            if col not in known_cols
            and str(val).strip()
            and str(val).strip().lower() not in ("nan", "none", "")
        }
        return json.dumps(extra, ensure_ascii=False) if extra else None
