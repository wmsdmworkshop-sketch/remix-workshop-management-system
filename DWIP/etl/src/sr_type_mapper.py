"""
DWIP Workforce v1.1 — SR Type Mapper
======================================
Maps raw SR Type / JC Type values to canonical names and categories.
Preserves BOTH raw_sr_type AND canonical_service_category per the approved design.
Handles SCHEDULED_SERVICE with service_stage preservation.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from difflib import SequenceMatcher
from typing import Optional

from etl.src.core.context import DWIPContext
from etl.src.core.step import ETLStep

logger = logging.getLogger("dwip.sr_type_mapper")


@dataclass
class SRTypeResult:
    """Result of mapping one raw SR type value."""
    raw_sr_type: str
    canonical_name: str
    canonical_service_category: str
    service_stage: Optional[str]
    is_approved: bool
    mapped_by: str    # AUTO / FUZZY_AUTO / USER_CONFIRMED
    sr_type_id: Optional[int] = None


class SRTypeMapper(ETLStep):
    """
    Maps raw service type strings to canonical dim_service_type entries.
    Writes new types to the database and caches them.
    """
    FUZZY_THRESHOLD = 0.85

    def __init__(self, ctx: DWIPContext) -> None:
        super().__init__(ctx)
        self._config = ctx.config
        self._db = ctx.db
        self.logger = ctx.logger
        self._cache: dict[str, SRTypeResult] = {}   # raw_value → result
        self._id_cache: dict[str, int] = {}          # raw_value → sr_type_id

    def execute(self, data: Any = None) -> Any:
        return None

    def map(self, raw_value: Optional[str]) -> Optional[SRTypeResult]:
        """
        Map a raw SR Type or JC Type string to a canonical result.
        Returns None if raw_value is blank.
        Writes to dim_service_type if not already present.
        """
        if not raw_value or not raw_value.strip():
            return None

        raw = raw_value.strip()
        if raw in self._cache:
            return self._cache[raw]

        result = self._resolve(raw)
        self._cache[raw] = result

        # Write/get in dim_service_type
        instance, created = self._db.get_or_create_service_type(
            raw_sr_type=raw,
            canonical_name=result.canonical_name,
            canonical_service_category=result.canonical_service_category,
            service_stage=result.service_stage,
            is_approved=result.is_approved,
            mapped_by=result.mapped_by,
        )

        # Retrieve the generated PK
        with self._db.session() as sess:
            from etl.src.models import DimServiceType
            row = sess.query(DimServiceType).filter_by(raw_sr_type=raw).first()
            if row:
                result.sr_type_id = row.sr_type_id

        if created:
            self.logger.info("New SR Type registered: '%s' -> '%s' [%s]%s",
                        raw, result.canonical_name, result.canonical_service_category,
                        f" stage={result.service_stage}" if result.service_stage else "")
        return result

    def get_sr_type_id(self, raw_value: Optional[str]) -> Optional[int]:
        """Map and return just the sr_type_id FK."""
        result = self.map(raw_value)
        return result.sr_type_id if result else None

    # ── Private ───────────────────────────────────────────────────

    def _resolve(self, raw: str) -> SRTypeResult:
        """Try exact match → fuzzy match → fallback to OTHER."""
        sr_map = self._config.sr_type_map

        # 1. Exact match (case-insensitive)
        for key, val in sr_map.items():
            if key.strip().lower() == raw.lower():
                return SRTypeResult(
                    raw_sr_type=raw,
                    canonical_name=val["canonical"],
                    canonical_service_category=val["category"],
                    service_stage=val.get("service_stage"),
                    is_approved=val.get("is_approved", False),
                    mapped_by="AUTO",
                )

        # 2. Fuzzy match
        best_key, best_score = None, 0.0
        for key in sr_map:
            score = SequenceMatcher(None, raw.lower(), key.lower()).ratio()
            if score > best_score:
                best_score = score
                best_key = key

        if best_key and best_score >= self.FUZZY_THRESHOLD:
            val = sr_map[best_key]
            self.logger.warning(
                "Fuzzy SR Type match: '%s' -> '%s' (score=%.2f). Flagged for review.",
                raw, best_key, best_score
            )
            return SRTypeResult(
                raw_sr_type=raw,
                canonical_name=val["canonical"],
                canonical_service_category=val["category"],
                service_stage=val.get("service_stage"),
                is_approved=False,   # Fuzzy match requires approval
                mapped_by="FUZZY_AUTO",
            )

        # 3. Fallback
        self.logger.warning("Unrecognized SR Type: '%s' -> mapped to OTHER. Add to sr_type_map.json.", raw)
        return SRTypeResult(
            raw_sr_type=raw,
            canonical_name=raw,                  # Keep raw as canonical until approved
            canonical_service_category="OTHER",
            service_stage=None,
            is_approved=False,
            mapped_by="AUTO",
        )
