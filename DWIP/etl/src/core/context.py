"""
DWIP Workforce v1.1 — Shared Execution Context
===============================================
Encapsulates runtime dependencies (config, db, logger, run details)
and metric/performance state. Avoids global state and hidden singletons.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Any, Optional

from etl.src.config_loader import ConfigLoader
from etl.src.db_writer import DBWriter
from etl.src.validation_run import ValidationRunMetadata


@dataclass
class DWIPContext:
    """Shared execution context containing runtime infrastructure."""
    config: ConfigLoader
    db: DBWriter
    logger: logging.Logger
    validation_run: ValidationRunMetadata
    report_dir: Path
    db_path: Path
    input_dir: Path
    # Helper step instances
    normalizer: Any = None
    validator: Any = None
    odo_engine: Any = None
    sr_mapper: Any = None
    tech_normalizer: Any = None
    lineage_tracker: Any = None
    scorer: Any = None
    resolver: Any = None
    step_timings: Dict[str, float] = field(default_factory=dict)
    peak_ram_mb: float = 0.0
    peak_cpu_percent: float = 0.0
    metrics: Dict[str, Any] = field(default_factory=dict)


class StepTimer:
    """Timer context manager to record step timings in DWIPContext."""

    def __init__(self, ctx: DWIPContext, step_name: str) -> None:
        self.ctx = ctx
        self.step_name = step_name
        self.start_time: float = 0.0

    def __enter__(self) -> StepTimer:
        self.start_time = time.perf_counter()
        self.ctx.logger.info("[START] Step: %s", self.step_name)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        elapsed = round(time.perf_counter() - self.start_time, 3)
        key = self.name_to_key(self.step_name)
        self.ctx.step_timings[key] = elapsed
        if self.ctx.validation_run:
            self.ctx.validation_run.step_timings[key] = elapsed
        self.ctx.logger.info("[DONE] Step: %s in %.3f seconds", self.step_name, elapsed)

    @staticmethod
    def name_to_key(name: str) -> str:
        """Convert a step name to a canonical dictionary key."""
        return name.replace(" ", "_").replace("-", "_")
