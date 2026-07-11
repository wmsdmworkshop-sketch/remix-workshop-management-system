"""
DWIP Workforce v1.1 — ETL Pipeline Step Base Class
===================================================
Defines the standard execute interface for all pipeline steps.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from etl.src.core.context import DWIPContext


class ETLStep(ABC):
    """
    Abstract base class for all ETL pipeline steps.
    Accepts context at instantiation and handles input/output flow.
    """

    def __init__(self, ctx: DWIPContext) -> None:
        self.ctx = ctx

    @abstractmethod
    def execute(self, data: Any) -> Any:
        """
        Execute the pipeline step with context and input data.
        Returns the output result dataclass.
        """
        pass
