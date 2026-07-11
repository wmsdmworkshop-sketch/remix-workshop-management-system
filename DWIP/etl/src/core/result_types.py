"""
DWIP Workforce v1.1 — Pipeline Result Types
=============================================
Defines standard dataclasses for pipeline input/output flow.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional
import pandas as pd

@dataclass
class DiscoveredFile:
    """Represents one discovered CSV file with its metadata."""
    path: Path
    subfolder: str                    # invoices / vehicle_master / etc.
    file_type: str                    # invoice / service_history / vehicle_master / customer_master
    row_count: int = 0
    headers: list[str] = field(default_factory=list)
    encoding: str = "utf-8"
    df: Optional[pd.DataFrame] = field(default=None, repr=False)


@dataclass
class RawData:
    """Output of the Loader step."""
    discovered_files: List[DiscoveredFile] = field(default_factory=list)
    total_rows: int = 0


@dataclass
class ProfileResult:
    """Output of the Profiler step."""
    mappings: Dict[str, Dict[str, str]] = field(default_factory=dict)
    profile_summary: pd.DataFrame = field(default_factory=pd.DataFrame)


@dataclass
class NormalizedData:
    """Output of the Normalizer step."""
    # Maps file name to its normalized dataframe
    normalized_dfs: Dict[str, pd.DataFrame] = field(default_factory=dict)


@dataclass
class StepValidationResult:
    """Output of the Validator step."""
    failures: List[Dict[str, Any]] = field(default_factory=list)
    success_rate: float = 0.0


@dataclass
class MappedData:
    """Output of the Mapper step (SRType and Technician mapping)."""
    mapped_records: List[Any] = field(default_factory=list)
    techs_mapped: int = 0


@dataclass
class MergeResult:
    """Output of the Merger step."""
    stats: Dict[str, int] = field(default_factory=dict)
    success: bool = False


@dataclass
class ReportPackage:
    """Output of the Reporter step."""
    report_paths: List[Path] = field(default_factory=list)
    summary_json: Dict[str, Any] = field(default_factory=dict)
    status: str = "PENDING"  # PASS / FAIL


@dataclass
class ScoredRecord:
    """A normalized record with its computed confidence score."""
    unique_key: str                # e.g. job_card_no or vrn
    source_type: str               # invoice / vehicle_master / service_history / etc.
    source_file: str
    source_row: int
    fields: dict[str, Any]        # all normalized field values
    confidence_score: float = 0.0
    validation_score_delta: float = 0.0  # from Validator
    is_primary: bool = True        # False if this is a derived/fallback record
    has_conflict: bool = False


@dataclass
class OdometerReading:
    """One odometer reading with its source context."""
    vrn: str
    service_date: Optional[str]    # DD-MM-YYYY
    odometer: Optional[float]
    status: str = "BLANK"          # BLANK / ZERO / NEGATIVE / VALID
    source_file: str = ""
    source_row: int = 0
    job_card_no: Optional[str] = None


@dataclass
class OdometerResolution:
    """The resolved odometer value for a service event."""
    odometer: Optional[float]
    status: str   # VALID / ZERO / BLANK / NEGATIVE / CONFLICT
    source_file: str
    source_row: int
