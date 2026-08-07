"""
DWIP Workforce v1.1 — Normalizer
==================================
Cleans and standardizes raw field values into canonical forms.
All normalization is non-destructive — raw values are never mutated,
only the output dict fields are set.
"""

from __future__ import annotations

import logging
import re
from typing import Optional, Any

from dateutil import parser as dateutil_parser

from etl.src.core.context import DWIPContext
from etl.src.core.step import ETLStep
from etl.src.core.result_types import RawData, ProfileResult, NormalizedData

# VRN must be uppercase alphanumeric only
_VRN_RE = re.compile(r"^[A-Z]{2}\d{2}[A-Z]{1,3}\d{3,4}$")
_CODE_RE = re.compile(r"^[A-Z0-9]+_[A-Z0-9]+$")   # Advisor system code pattern
logger = logging.getLogger("dwip.normalizer")


class Normalizer(ETLStep):
    """
    Cleans and standardizes raw field values into canonical forms.
    """

    def __init__(self, ctx: DWIPContext) -> None:
        super().__init__(ctx)
        self.logger = ctx.logger

    def execute(self, data: tuple[RawData, ProfileResult]) -> NormalizedData:
        """
        Normalize column names and field values across all discovered DataFrames.
        """
        raw_data, profile_result = data
        normalized_dfs = {}

        for disc in raw_data.discovered_files:
            filename = disc.path.name
            mappings = profile_result.mappings.get(filename, {})
            
            # Make a copy and rename columns to standard names
            df_norm = disc.df.copy()
            df_norm = df_norm.rename(columns=mappings)

            # Apply value normalization on recognized columns
            for col in df_norm.columns:
                if col == "vrn":
                    df_norm[col] = df_norm[col].apply(self.vrn)
                elif col in ("service_date", "original_sale_date"):
                    df_norm[col] = df_norm[col].apply(self.date)
                elif col in ("labour_amount", "spares_amount", "total_bill", "odometer"):
                    df_norm[col] = df_norm[col].apply(self.amount)
                elif col == "customer_name":
                    df_norm[col] = df_norm[col].apply(self.customer_name)
                elif col == "service_advisor":
                    df_norm[col] = df_norm[col].apply(self.employee_name)
                elif col == "job_card_no":
                    df_norm[col] = df_norm[col].apply(self.job_card_no)

            normalized_dfs[filename] = df_norm

        return NormalizedData(normalized_dfs=normalized_dfs)


    # ── VRN ──────────────────────────────────────────────────────

    @staticmethod
    def vrn(raw: Optional[str]) -> Optional[str]:
        """
        Normalize a vehicle registration number.
        Strips all non-alphanumeric characters, uppercases.
        Returns None if blank after normalization.
        """
        if not raw:
            return None
        cleaned = re.sub(r"[^A-Z0-9]", "", raw.upper().strip())
        return cleaned if cleaned else None

    @staticmethod
    def vrn_is_valid(vrn: Optional[str]) -> bool:
        """True if the normalized VRN matches the expected Indian format."""
        if not vrn:
            return False
        return bool(_VRN_RE.match(vrn))

    # ── Dates ─────────────────────────────────────────────────────

    @staticmethod
    def date(raw: Optional[str]) -> Optional[str]:
        """
        Parse any date format and return DD-MM-YYYY.
        Returns None if unparseable (original raw retained in caller).
        """
        if not raw or str(raw).strip().lower() in ("nan", "none", ""):
            return None
        raw = str(raw).strip()
        try:
            dt = dateutil_parser.parse(raw, dayfirst=True)
            return dt.strftime("%d-%m-%Y")
        except Exception:
            try:
                # Try explicit DD/MM/YYYY
                dt = dateutil_parser.parse(raw, dayfirst=True, fuzzy=False)
                return dt.strftime("%d-%m-%Y")
            except Exception:
                logger.debug("Cannot parse date: %r", raw)
                return None

    @staticmethod
    def date_key_to_parts(date_key: str) -> dict:
        """
        Convert DD-MM-YYYY → dict with day/month/year/quarter/financial_year/etc.
        for populating dim_date.
        """
        try:
            dt = dateutil_parser.parse(date_key, dayfirst=True)
            month = dt.month
            year = dt.year
            # Financial year: Apr(4)–Mar(3). FY2526 = Apr2025–Mar2026
            if month >= 4:
                fy_start = year % 100
                fy_end = (year + 1) % 100
            else:
                fy_start = (year - 1) % 100
                fy_end = year % 100
            financial_year = f"{fy_start:02d}{fy_end:02d}"
            quarter_map = {1: "Q1", 2: "Q1", 3: "Q1",  # Apr/May/Jun
                           4: "Q2", 5: "Q2", 6: "Q2",   # Jul/Aug/Sep
                           7: "Q3", 8: "Q3", 9: "Q3",   # Oct/Nov/Dec
                           10: "Q4", 11: "Q4", 12: "Q4"} # Jan/Feb/Mar
            # Rebase to financial quarter (month 4 = FQ1)
            fin_month = ((month - 4) % 12) + 1
            quarter = f"Q{(fin_month - 1) // 3 + 1}"
            return {
                "date_key": date_key,
                "day": dt.day,
                "month": month,
                "year": year,
                "month_name": dt.strftime("%B"),
                "quarter": quarter,
                "financial_year": financial_year,
                "week_of_year": dt.isocalendar()[1],
                "is_weekend": dt.weekday() >= 5,
            }
        except Exception:
            return {}

    # ── Amounts ───────────────────────────────────────────────────

    @staticmethod
    def amount(raw: Optional[str]) -> Optional[float]:
        """
        Parse a currency string to float.
        Strips ₹, Rs., Rs, commas, spaces. Returns None if blank.
        """
        if not raw or str(raw).strip().lower() in ("nan", "none", ""):
            return None
        cleaned = re.sub(r"(?i)Rs\.?", "", str(raw).strip())
        cleaned = re.sub(r"[₹,\s]", "", cleaned)
        try:
            return float(cleaned)
        except ValueError:
            logger.debug("Cannot parse amount: %r", raw)
            return None

    # ── Strings ───────────────────────────────────────────────────

    @staticmethod
    def customer_name(raw: Optional[str]) -> Optional[str]:
        """
        Normalize a customer name:
        - Strip whitespace
        - Strip trailing dots/commas
        - Title-case if all-uppercase
        - Return None if blank
        """
        if not raw or str(raw).strip().lower() in ("nan", "none", ""):
            return None
        name = str(raw).strip().rstrip(".,;")
        if name.isupper():
            name = name.title()
        return name if name else None

    @staticmethod
    def employee_name(raw: Optional[str]) -> Optional[str]:
        """
        Normalize an employee name or system code.
        If it looks like a system code (e.g. RS1_100B210), return as-is uppercase.
        Otherwise title-case.
        """
        if not raw or str(raw).strip().lower() in ("nan", "none", ""):
            return None
        cleaned = str(raw).strip()
        if _CODE_RE.match(cleaned.upper()):
            return cleaned.upper()
        return cleaned.title()

    @staticmethod
    def is_advisor_code(value: Optional[str]) -> bool:
        """Return True if the value matches the system advisor code pattern."""
        if not value:
            return False
        return bool(_CODE_RE.match(str(value).upper().strip()))

    @staticmethod
    def job_card_no(raw: Optional[str]) -> Optional[str]:
        """Normalize job card number — strip whitespace only, preserve case."""
        if not raw or str(raw).strip().lower() in ("nan", "none", ""):
            return None
        return str(raw).strip()

    @staticmethod
    def generic_string(raw: Optional[str]) -> Optional[str]:
        """Generic string normalization — strip whitespace and empty checks."""
        if not raw or str(raw).strip().lower() in ("nan", "none", ""):
            return None
        return str(raw).strip()
