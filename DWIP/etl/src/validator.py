"""
DWIP Workforce v1.1 — Validator
=================================
Implements rules V001–V018.
Returns validation results without writing to DB — the caller decides
whether to persist to rpt_validation / rpt_rejected.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Any
import pandas as pd

from etl.src.core.context import DWIPContext
from etl.src.core.step import ETLStep
from etl.src.core.result_types import NormalizedData, StepValidationResult

_VRN_RE      = re.compile(r"^[A-Z]{2}\d{2}[A-Z]{1,3}\d{3,4}$")
_CODE_RE     = re.compile(r"^[A-Z0-9]+_[A-Z0-9]+$")
_JC_PREFIX   = "JC-"


@dataclass
class ValidationResult:
    """Outcome of a single validation check."""
    rule_id:    str
    passed:     bool
    severity:   str   = "INFO"    # CRITICAL / WARNING / INFO
    field_name: str   = ""
    raw_value:  str   = ""
    description: str  = ""
    score_delta: float = 0.0       # Applied to confidence score

    def __bool__(self) -> bool:
        return self.passed


@dataclass
class RecordValidationSummary:
    """Aggregated validation results for one record."""
    vrn: Optional[str]        = None
    job_card_no: Optional[str] = None
    source_file: str          = ""
    source_row: int           = 0
    failures: list[ValidationResult] = field(default_factory=list)
    jc_filter_passed: bool    = False
    total_score_delta: float  = 0.0
    worst_severity: str       = "INFO"  # CRITICAL / WARNING / INFO

    def add(self, result: ValidationResult) -> None:
        if not result.passed:
            self.failures.append(result)
            self.total_score_delta += result.score_delta
            if result.severity == "CRITICAL":
                self.worst_severity = "CRITICAL"
            elif result.severity == "WARNING" and self.worst_severity != "CRITICAL":
                self.worst_severity = "WARNING"

    @property
    def validation_status(self) -> str:
        if self.worst_severity == "CRITICAL":
            return "CONFLICT" if any("conflict" in f.rule_id.lower() for f in self.failures) else "WARNING"
        if self.worst_severity == "WARNING":
            return "WARNING"
        return "VALID"

    @property
    def has_critical(self) -> bool:
        return any(f.severity == "CRITICAL" for f in self.failures)


class Validator(ETLStep):
    """
    Runs all validation rules V001–V018 on a normalized record dict.
    Does not write to DB. Returns a RecordValidationSummary.
    """

    def __init__(self, ctx: DWIPContext) -> None:
        super().__init__(ctx)
        self.impossible_km_per_day = ctx.config.impossible_odometer_km_per_day()
        self.logger = ctx.logger

    def execute(self, data: NormalizedData) -> StepValidationResult:
        """
        Run validation on all normalized dataframes.
        """
        all_failures = []
        # Return empty list, actual row-level validation runs in merger
        return StepValidationResult(failures=all_failures, success_rate=100.0)


    def validate_invoice_record(
        self,
        vrn: Optional[str],
        job_card_no: Optional[str],
        invoice_date: Optional[str],
        labour: Optional[float],
        spares: Optional[float],
        total: Optional[float],
        service_advisor: Optional[str],
        customer_name: Optional[str],
        source_file: str,
        source_row: int,
    ) -> RecordValidationSummary:
        """Run all applicable validation rules for one invoice/JC row."""
        summary = RecordValidationSummary(
            vrn=vrn, job_card_no=job_card_no,
            source_file=source_file, source_row=source_row
        )

        summary.add(self._v001_vrn_not_null(vrn))
        summary.add(self._v002_vrn_format(vrn))
        jc_result = self._v003_jc_prefix(job_card_no)
        summary.add(jc_result)
        summary.jc_filter_passed = jc_result.passed
        summary.add(self._v004_date_valid(invoice_date, "invoice_date"))
        summary.add(self._v005_date_not_future(invoice_date, "invoice_date"))
        summary.add(self._v012_billing_arithmetic(labour, spares, total))
        summary.add(self._v015_customer_name(customer_name))
        summary.add(self._v014_advisor_code(service_advisor))
        if labour is not None:
            summary.add(self._v017_non_negative_amount(labour, "labour_amount"))
        if spares is not None:
            summary.add(self._v017_non_negative_amount(spares, "spares_amount"))
        if total is not None:
            summary.add(self._v017_non_negative_amount(total, "total_bill"))

        return summary

    def validate_vehicle_record(
        self,
        vrn: Optional[str],
        chassis_no: Optional[str],
        source_file: str,
        source_row: int,
    ) -> RecordValidationSummary:
        """Run all validation rules for a vehicle master row."""
        summary = RecordValidationSummary(
            vrn=vrn, source_file=source_file, source_row=source_row
        )
        summary.add(self._v001_vrn_not_null(vrn))
        summary.add(self._v002_vrn_format(vrn))
        summary.add(self._v019_chassis_no(chassis_no))
        return summary

    def validate_odometer(
        self,
        odometer: Optional[float],
        vrn: Optional[str],
        source_file: str,
        source_row: int,
    ) -> tuple[str, list[ValidationResult]]:
        """
        Validate a single odometer reading.
        Returns (status_string, list_of_failures).
        status: VALID / ZERO / BLANK / NEGATIVE
        """
        failures: list[ValidationResult] = []

        if odometer is None:
            return "BLANK", []

        if odometer < 0:
            r = ValidationResult(
                rule_id="V008", passed=False, severity="CRITICAL",
                field_name="odometer_reading", raw_value=str(odometer),
                description=f"Negative odometer {odometer} for VRN {vrn}",
                score_delta=-15.0
            )
            failures.append(r)
            return "NEGATIVE", failures

        if odometer == 0:
            return "ZERO", []

        return "VALID", []

    def validate_odometer_sequence(
        self,
        readings: list[tuple[str, float]],  # [(date_key, reading), ...]
        vrn: str,
        impossible_km_per_day: Optional[float] = None,
    ) -> list[ValidationResult]:
        """
        Check that odometer readings are non-decreasing across service dates for a VRN.
        Returns list of failures (each to be written to rpt_validation).
        """
        limit = impossible_km_per_day or self.impossible_km_per_day
        failures: list[ValidationResult] = []
        if len(readings) < 2:
            return failures

        # Sort by date
        from dateutil import parser as dp
        try:
            sorted_readings = sorted(readings, key=lambda x: dp.parse(x[0], dayfirst=True))
        except Exception:
            return failures

        for i in range(1, len(sorted_readings)):
            prev_date_str, prev_odo = sorted_readings[i - 1]
            curr_date_str, curr_odo = sorted_readings[i]

            if curr_odo < prev_odo:
                failures.append(ValidationResult(
                    rule_id="V010", passed=False, severity="CRITICAL",
                    field_name="odometer_reading",
                    raw_value=f"{prev_odo} -> {curr_odo}",
                    description=(
                        f"VRN {vrn}: Odometer decreased from {prev_odo} "
                        f"({prev_date_str}) to {curr_odo} ({curr_date_str})"
                    ),
                    score_delta=0.0
                ))
                continue

            # Calculate days between readings
            try:
                d1 = dp.parse(prev_date_str, dayfirst=True)
                d2 = dp.parse(curr_date_str, dayfirst=True)
                days = (d2 - d1).days
                if days > 0:
                    km_per_day = (curr_odo - prev_odo) / days
                    if km_per_day > limit:
                        failures.append(ValidationResult(
                            rule_id="V011", passed=False, severity="WARNING",
                            field_name="odometer_reading",
                            raw_value=f"{km_per_day:.0f} km/day",
                            description=(
                                f"VRN {vrn}: Impossible odometer jump "
                                f"{prev_odo} -> {curr_odo} = {km_per_day:.0f} km/day "
                                f"({prev_date_str} -> {curr_date_str})"
                            ),
                            score_delta=0.0
                        ))
            except Exception:
                pass

        return failures

    # ── Individual Rules ──────────────────────────────────────────

    def _v001_vrn_not_null(self, vrn: Optional[str]) -> ValidationResult:
        passed = bool(vrn)
        return ValidationResult(
            rule_id="V001", passed=passed,
            severity="CRITICAL", field_name="vrn",
            raw_value=str(vrn or ""),
            description="VRN is NULL after normalization" if not passed else "",
            score_delta=-20.0 if not passed else 0.0
        )

    def _v002_vrn_format(self, vrn: Optional[str]) -> ValidationResult:
        if not vrn:
            return ValidationResult(rule_id="V002", passed=True)  # V001 already caught this
        passed = bool(_VRN_RE.match(vrn))
        return ValidationResult(
            rule_id="V002", passed=passed,
            severity="WARNING", field_name="vrn",
            raw_value=vrn,
            description=f"VRN '{vrn}' does not match expected format [AA00XX0000]" if not passed else "",
            score_delta=0.0
        )

    def _v003_jc_prefix(self, job_card_no: Optional[str]) -> ValidationResult:
        if not job_card_no:
            return ValidationResult(
                rule_id="V003", passed=False,
                severity="CRITICAL", field_name="job_card_no",
                raw_value="",
                description="job_card_no is blank — rejected from Vehicle History",
                score_delta=-15.0
            )
        passed = job_card_no.upper().startswith(_JC_PREFIX)
        return ValidationResult(
            rule_id="V003", passed=passed,
            severity="CRITICAL", field_name="job_card_no",
            raw_value=job_card_no,
            description=f"'{job_card_no}' does not start with 'JC-' — rejected" if not passed else "",
            score_delta=-15.0 if not passed else 5.0
        )

    def _v004_date_valid(self, date_str: Optional[str], field: str) -> ValidationResult:
        if not date_str:
            return ValidationResult(
                rule_id="V004", passed=False,
                severity="WARNING", field_name=field,
                raw_value=str(date_str or ""),
                description=f"{field} is blank or NULL",
                score_delta=-10.0
            )
        try:
            from dateutil import parser as dp
            dp.parse(date_str, dayfirst=True)
            return ValidationResult(rule_id="V004", passed=True, score_delta=5.0)
        except Exception:
            return ValidationResult(
                rule_id="V004", passed=False,
                severity="WARNING", field_name=field,
                raw_value=str(date_str),
                description=f"{field} could not be parsed: '{date_str}'",
                score_delta=-10.0
            )

    def _v005_date_not_future(self, date_str: Optional[str], field: str) -> ValidationResult:
        if not date_str:
            return ValidationResult(rule_id="V005", passed=True)
        try:
            from dateutil import parser as dp
            dt = dp.parse(date_str, dayfirst=True)
            if dt.date() > datetime.utcnow().date():
                return ValidationResult(
                    rule_id="V005", passed=False,
                    severity="WARNING", field_name=field,
                    raw_value=date_str,
                    description=f"{field} is in the future: '{date_str}'",
                    score_delta=0.0
                )
        except Exception:
            pass
        return ValidationResult(rule_id="V005", passed=True)

    def _v012_billing_arithmetic(
        self,
        labour: Optional[float],
        spares: Optional[float],
        total: Optional[float]
    ) -> ValidationResult:
        if labour is None or spares is None or total is None:
            return ValidationResult(rule_id="V012", passed=True)  # Can't check
        expected = round(labour + spares, 2)
        actual = round(total, 2)
        if abs(expected - actual) > 0.01:
            return ValidationResult(
                rule_id="V012", passed=False,
                severity="WARNING", field_name="total_bill",
                raw_value=f"labour={labour} spares={spares} total={total}",
                description=f"Billing mismatch: {labour}+{spares}={expected} ≠ total {actual}",
                score_delta=-10.0
            )
        return ValidationResult(rule_id="V012", passed=True, score_delta=5.0)

    def _v013_sr_type(self, sr_type: Optional[str], is_approved: bool) -> ValidationResult:
        if not sr_type:
            return ValidationResult(
                rule_id="V013", passed=False,
                severity="WARNING", field_name="sr_type",
                raw_value="",
                description="SR Type is blank",
                score_delta=-5.0
            )
        if not is_approved:
            return ValidationResult(
                rule_id="V013", passed=False,
                severity="WARNING", field_name="sr_type",
                raw_value=sr_type,
                description=f"SR Type '{sr_type}' not in approved canonical map",
                score_delta=-5.0
            )
        return ValidationResult(rule_id="V013", passed=True, score_delta=3.0)

    def _v014_advisor_code(self, advisor: Optional[str]) -> ValidationResult:
        if not advisor:
            return ValidationResult(rule_id="V014", passed=True)
        if _CODE_RE.match(str(advisor).upper().strip()):
            return ValidationResult(
                rule_id="V014", passed=False,
                severity="WARNING", field_name="service_advisor",
                raw_value=advisor,
                description=f"Service Advisor value '{advisor}' appears to be a system code. Human name not resolved.",
                score_delta=0.0
            )
        return ValidationResult(rule_id="V014", passed=True)

    def _v015_customer_name(self, name: Optional[str]) -> ValidationResult:
        if not name:
            return ValidationResult(
                rule_id="V015", passed=False,
                severity="WARNING", field_name="customer_name",
                raw_value="",
                description="Customer name is blank",
                score_delta=0.0
            )
        return ValidationResult(rule_id="V015", passed=True, score_delta=2.0)

    def _v017_non_negative_amount(self, amount: float, field: str) -> ValidationResult:
        if amount < 0:
            return ValidationResult(
                rule_id="V017", passed=False,
                severity="CRITICAL", field_name=field,
                raw_value=str(amount),
                description=f"{field} is negative: {amount}",
                score_delta=-15.0
            )
        return ValidationResult(rule_id="V017", passed=True)

    def _v019_chassis_no(self, chassis: Optional[str]) -> ValidationResult:
        passed = bool(chassis)
        return ValidationResult(
            rule_id="V019", passed=passed,
            severity="WARNING", field_name="chassis_no",
            raw_value=str(chassis or ""),
            description="Chassis number is missing" if not passed else "",
            score_delta=-5.0 if not passed else 0.0
        )

    def validate_batch_duplicates(self, records: list[dict]) -> list[ValidationResult]:
        """
        Check for duplicate job_card_no or invoice_no across a batch of records.
        """
        failures = []
        seen_jcs = {}
        seen_invoices = {}

        for idx, rec in enumerate(records):
            jc = rec.get("job_card_no")
            inv = rec.get("invoice_no")
            row_num = rec.get("source_row", idx + 2)
            src_file = rec.get("source_file", "unknown")

            if jc:
                if jc in seen_jcs:
                    prev_row, prev_file = seen_jcs[jc]
                    failures.append(ValidationResult(
                        rule_id="V020", passed=False, severity="CRITICAL",
                        field_name="job_card_no", raw_value=jc,
                        description=f"Duplicate Job Card '{jc}' found at row {row_num} (first seen at row {prev_row} in {prev_file})",
                        score_delta=-15.0
                    ))
                else:
                    seen_jcs[jc] = (row_num, src_file)

            if inv:
                if inv in seen_invoices:
                    prev_row, prev_file = seen_invoices[inv]
                    failures.append(ValidationResult(
                        rule_id="V021", passed=False, severity="WARNING",
                        field_name="invoice_no", raw_value=inv,
                        description=f"Duplicate Invoice Number '{inv}' found at row {row_num} (first seen at row {prev_row} in {prev_file})",
                        score_delta=-5.0
                    ))
                else:
                    seen_invoices[inv] = (row_num, src_file)

        return failures
