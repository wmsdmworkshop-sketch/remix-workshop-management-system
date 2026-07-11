"""
DWIP Workforce v1.1 — Confidence Scorer & Duplicate Resolver
==============================================================
Implements the confidence scoring algorithm from Section 8 of the architecture.
Groups duplicate records and retains the highest-confidence winner.
Losers are written to rpt_duplicate, never deleted.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Any, Optional

from etl.src.core.context import DWIPContext
from etl.src.core.step import ETLStep
from etl.src.core.result_types import ScoredRecord

logger = logging.getLogger("dwip.resolver")

# Base scores by source file type
BASE_SCORES: dict[str, float] = {
    "vehicle_master":   90.0,
    "invoice":          80.0,
    "service_history":  70.0,
    "customer_master":  65.0,
    "derived_single":   55.0,
    "derived_multi":    45.0,
    "synthetic":        30.0,
    "other":            40.0,
}

CRITICAL_FIELDS = [
    "vrn", "job_card_no", "service_date", "total_bill",
    "service_advisor", "sr_type", "customer_name"
]


class ConfidenceScorer(ETLStep):
    """
    Computes a confidence score (0–100) for any normalized record.
    """

    def __init__(self, ctx: DWIPContext) -> None:
        super().__init__(ctx)
        self.logger = ctx.logger

    def execute(self, data: Any = None) -> Any:
        return None

    def score(
        self,
        source_type: str,
        fields: dict[str, Any],
        validation_delta: float = 0.0,
        is_primary: bool = True,
        has_conflict: bool = False,
    ) -> float:
        """
        Compute confidence score.
        source_type: 'invoice' / 'vehicle_master' / 'service_history' /
                     'customer_master' / 'derived_single' / 'derived_multi' /
                     'synthetic' / 'other'
        """
        score = BASE_SCORES.get(source_type, BASE_SCORES["other"])

        # Completeness bonus: +2 per critical field present, max +14
        for cf in CRITICAL_FIELDS:
            val = fields.get(cf)
            if val is not None and str(val).strip() not in ("", "None", "nan"):
                score += 2.0

        # Validation adjustments
        score += validation_delta

        # Source quality modifier
        if is_primary:
            score += 5.0
        if has_conflict:
            score -= 15.0

        return max(0.0, min(100.0, round(score, 2)))


class DuplicateResolver(ETLStep):
    """
    Groups records by their unique business key.
    Picks the winner (highest confidence score).
    Writes losers to rpt_duplicate.
    """

    def __init__(self, ctx: DWIPContext) -> None:
        super().__init__(ctx)
        self._db = ctx.db
        self._scorer = ctx.scorer
        self.logger = ctx.logger

    def execute(self, data: Any = None) -> Any:
        return None

    def resolve(
        self,
        records: list[ScoredRecord],
        dataset_type: str,
        key_field: str,    # e.g. "job_card_no" or "vrn"
    ) -> list[ScoredRecord]:
        """
        Deduplicate records by unique_key.
        Returns only the winning (highest score) record per group.
        Writes duplicates to rpt_duplicate.
        """
        # Group by unique_key
        groups: dict[str, list[ScoredRecord]] = {}
        for rec in records:
            key = str(rec.unique_key or "")
            groups.setdefault(key, []).append(rec)

        winners: list[ScoredRecord] = []
        total_dups = 0

        for key, group in groups.items():
            if len(group) == 1:
                winners.append(group[0])
                continue

            # Sort descending by confidence, then by source type priority
            source_rank = {
                "vehicle_master": 1, "invoice": 2,
                "service_history": 3, "customer_master": 4,
                "derived_single": 5, "derived_multi": 6, "other": 7
            }
            group.sort(
                key=lambda r: (-r.confidence_score, source_rank.get(r.source_type, 9))
            )

            winner = group[0]
            losers = group[1:]
            winners.append(winner)

            for loser in losers:
                reason = (
                    f"Duplicate of {key_field}={key}. "
                    f"Winner score={winner.confidence_score:.1f}, "
                    f"this score={loser.confidence_score:.1f}"
                )
                if self._db is not None:
                    # Look up fields using both lower & upper case keys to support raw headers
                    raw_vrn = loser.fields.get("vrn") or loser.fields.get("VRN")
                    raw_inv = loser.fields.get("invoice_no") or loser.fields.get("INVOICE NO")
                    self._db.log_duplicate(
                        dataset_type=dataset_type,
                        vrn=raw_vrn,
                        job_card_no=loser.unique_key if key_field == "job_card_no" else None,
                        invoice_no=raw_inv,
                        source_file=loser.source_file,
                        source_row=loser.source_row,
                        confidence_score=loser.confidence_score,
                        unselected_reason=reason,
                    )
                total_dups += 1

            if losers:
                self.logger.info(
                    "Duplicate resolved: %s=%s — winner src_row=%d (score=%.1f), %d duplicate(s) logged",
                    key_field, key, winner.source_row, winner.confidence_score, len(losers)
                )

        if total_dups and self._db is not None:
            self._db.log_merge(
                "RESOLVE", "Duplicate Resolution",
                f"{total_dups} duplicates logged for {dataset_type}", total_dups
            )

        self.logger.info(
            "Duplicate resolution for %s: %d input -> %d unique, %d duplicates",
            dataset_type, len(records), len(winners), total_dups
        )
        return winners
