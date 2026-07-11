"""
DWIP Workforce v1.1 — Odometer Engine
=======================================
Validates odometer readings per record and across all service visits for a VRN.
Rules V006–V011: per-record status, conflict detection, sequence validation.
"""

from __future__ import annotations

import logging
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Optional

from etl.src.core.context import DWIPContext
from etl.src.core.step import ETLStep
from etl.src.core.result_types import OdometerReading, OdometerResolution

logger = logging.getLogger("dwip.odometer")


class OdometerEngine(ETLStep):
    """
    Processes odometer readings for the full dataset.
    Step 1: Per-record validation (classify each reading).
    Step 2: Conflict detection (same VRN + date, 2 different valid readings).
    Step 3: Sequence validation (decreasing or impossible jumps across dates).
    """

    def __init__(self, ctx: DWIPContext) -> None:
        super().__init__(ctx)
        self._db = ctx.db
        self._validator = ctx.validator
        self.logger = ctx.logger
        # {vrn → [OdometerReading, ...]}
        self._all_readings: dict[str, list[OdometerReading]] = defaultdict(list)

    def execute(self, data: Any = None) -> Any:
        """Run sequence validation."""
        return self.run_sequence_validation()

    def add_reading(self, reading: OdometerReading) -> OdometerReading:
        """
        Classify a single reading and add it to the VRN history.
        Returns the reading with status set.
        """
        status, failures = self._validator.validate_odometer(
            odometer=reading.odometer,
            vrn=reading.vrn,
            source_file=reading.source_file,
            source_row=reading.source_row,
        )
        reading.status = status

        # Write NEGATIVE findings to rpt_validation immediately
        for f in failures:
            self._db.log_validation(
                rule_id=f.rule_id,
                severity=f.severity,
                description=f.description,
                vrn=reading.vrn,
                job_card_no=reading.job_card_no,
                field_name=f.field_name,
                raw_value=f.raw_value,
                source_file=reading.source_file,
                source_row=reading.source_row,
            )

        if reading.status == "VALID":
            self._all_readings[reading.vrn].append(reading)

        return reading

    def resolve_for_event(
        self,
        vrn: str,
        service_date: Optional[str],
        candidates: list[OdometerReading],
    ) -> OdometerResolution:
        """
        Given multiple odometer candidates for the same service event,
        resolve to the best single value or CONFLICT.
        """
        valid_readings = [r for r in candidates if r.status == "VALID"]

        if not valid_readings:
            # Pick best non-VALID status
            zero = [r for r in candidates if r.status == "ZERO"]
            if zero:
                r = zero[0]
                return OdometerResolution(0.0, "ZERO", r.source_file, r.source_row)
            neg = [r for r in candidates if r.status == "NEGATIVE"]
            if neg:
                r = neg[0]
                return OdometerResolution(None, "NEGATIVE", r.source_file, r.source_row)
            return OdometerResolution(None, "BLANK", "", 0)

        if len(valid_readings) == 1:
            r = valid_readings[0]
            return OdometerResolution(r.odometer, "VALID", r.source_file, r.source_row)

        # Multiple VALID readings — check if they match
        unique_values = {r.odometer for r in valid_readings}
        if len(unique_values) == 1:
            # Same value from multiple sources — no conflict
            r = valid_readings[0]
            return OdometerResolution(r.odometer, "VALID", r.source_file, r.source_row)

        # CONFLICT: different valid values for same event
        self.logger.warning(
            "Odometer CONFLICT: VRN=%s date=%s values=%s",
            vrn, service_date, unique_values
        )
        for i in range(len(valid_readings) - 1):
            self._db.log_conflict(
                conflict_type="ODOMETER_CONFLICT",
                vrn=vrn,
                service_date=service_date,
                field_name="odometer_reading",
                value_a=str(valid_readings[i].odometer),
                value_b=str(valid_readings[i + 1].odometer),
                source_file_a=valid_readings[i].source_file,
                source_row_a=valid_readings[i].source_row,
                source_file_b=valid_readings[i + 1].source_file,
                source_row_b=valid_readings[i + 1].source_row,
            )

        return OdometerResolution(None, "CONFLICT", valid_readings[0].source_file, valid_readings[0].source_row)

    def run_sequence_validation(self) -> int:
        """
        After all readings are loaded, validate chronological sequence per VRN.
        Writes findings to rpt_validation. Returns count of issues found.
        """
        issue_count = 0
        for vrn, readings in self._all_readings.items():
            if len(readings) < 2:
                continue
            # Build (date, odometer) pairs
            pairs = [
                (r.service_date, r.odometer)
                for r in readings
                if r.service_date and r.odometer is not None
            ]
            failures = self._validator.validate_odometer_sequence(pairs, vrn)
            for f in failures:
                self._db.log_validation(
                    rule_id=f.rule_id,
                    severity=f.severity,
                    description=f.description,
                    vrn=vrn,
                    field_name=f.field_name,
                    raw_value=f.raw_value,
                )
                issue_count += 1

        self.logger.info("Odometer sequence validation complete. %d issues found.", issue_count)
        return issue_count

    def best_odometer_for_vrn(self, vrn: str) -> tuple[Optional[float], Optional[str]]:
        """Return (latest_valid_odometer, date) for updating dim_vehicle.last_odometer."""
        readings = self._all_readings.get(vrn, [])
        if not readings:
            return None, None
        # Sort by date descending, pick latest
        try:
            from dateutil import parser as dp
            sorted_r = sorted(
                readings,
                key=lambda r: dp.parse(r.service_date, dayfirst=True) if r.service_date else dp.parse("01-01-1900", dayfirst=True),
                reverse=True
            )
            r = sorted_r[0]
            return r.odometer, r.service_date
        except Exception:
            return readings[-1].odometer, readings[-1].service_date
