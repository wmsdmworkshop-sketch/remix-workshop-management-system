"""
DWIP Workforce v1.1 — Lineage Tracker
======================================
Writes per-field audit_lineage entries for every value placed
in any master or fact table. Required for full data traceability,
warranty, AI, and regulatory audit needs.
"""

import logging
from typing import Any, Optional
from etl.src.core.context import DWIPContext
from etl.src.core.step import ETLStep
from etl.src.models import AuditLineage

logger = logging.getLogger("dwip.lineage_tracker")


class LineageTracker(ETLStep):
    """
    Writes one audit_lineage row per field per master record.
    Batches writes and flushes at the end of each pipeline phase.
    """

    def __init__(self, ctx: DWIPContext) -> None:
        super().__init__(ctx)
        self._db = ctx.db
        self.logger = ctx.logger
        self._buffer: list[AuditLineage] = []
        self._flush_size = 500

    def execute(self, data: Any = None) -> Any:
        """Flush the lineage buffer."""
        return self.flush()

    def track(
        self,
        *,
        target_table: str,
        target_pk: str,
        field_name: str,
        value_used: Optional[Any],
        source_file: str,
        source_header: str,
        source_row: int,
        merge_rule: str,
        confidence_score: float = 0.0,
        validation_status: str = "VALID",
    ) -> None:
        """
        Buffer one lineage entry.
        Call flush() after processing each record batch.
        """
        entry = AuditLineage(
            target_table=target_table,
            target_pk=str(target_pk),
            field_name=field_name,
            value_used=str(value_used) if value_used is not None else None,
            source_file=source_file,
            source_header=source_header,
            source_row=source_row,
            merge_rule=merge_rule,
            confidence_score=round(confidence_score, 2),
            validation_status=validation_status,
        )
        self._buffer.append(entry)
        if len(self._buffer) >= self._flush_size:
            self.flush()

    def track_derived(
        self,
        *,
        target_table: str,
        target_pk: str,
        field_name: str,
        value_used: Optional[Any],
        source_file: str,
        source_row: int,
        confidence_score: float = 45.0,
    ) -> None:
        """Convenience method for tracking a derived/fallback value."""
        self.track(
            target_table=target_table,
            target_pk=target_pk,
            field_name=field_name,
            value_used=value_used,
            source_file=source_file,
            source_header="[DERIVED]",
            source_row=source_row,
            merge_rule=f"Derived from {source_file} row {source_row}",
            confidence_score=confidence_score,
            validation_status="VALID",
        )

    def track_conflict(
        self,
        *,
        target_table: str,
        target_pk: str,
        field_name: str,
        source_file: str,
        source_row: int,
    ) -> None:
        """Convenience method for tracking a conflict (value left NULL)."""
        self.track(
            target_table=target_table,
            target_pk=target_pk,
            field_name=field_name,
            value_used=None,
            source_file=source_file,
            source_header="[CONFLICT]",
            source_row=source_row,
            merge_rule="Conflict — human review required",
            confidence_score=0.0,
            validation_status="CONFLICT",
        )

    def flush(self) -> int:
        """Write all buffered entries to the database."""
        if not self._buffer:
            return 0
        if self._db is None:
            count = len(self._buffer)
            self._buffer = []
            return count
        count = self._db.bulk_insert(self._buffer)
        self.logger.debug("Flushed %d lineage entries.", count)
        self._buffer = []
        return count

    def flush_and_log(self, phase: str) -> None:
        """Flush and log to merge log."""
        count = self.flush()
        if count and self._db is not None:
            self._db.log_merge(phase, "Lineage Flush", f"{count} entries written", count)
