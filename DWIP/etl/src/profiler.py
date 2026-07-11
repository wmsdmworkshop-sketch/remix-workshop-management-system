"""
DWIP Workforce v1.1 — Profiler & Header Matcher
==============================================
Profiles CSV headers, maps raw headers to standard fields using rules.json synonyms.
Supports exact synonym matching and fuzzy matching (using standard difflib).
"""

from __future__ import annotations

import logging
from difflib import SequenceMatcher
from typing import Dict, List, Optional
import pandas as pd

from etl.src.config_loader import ConfigLoader
from etl.src.loader import DiscoveredFile
from etl.src.core.context import DWIPContext
from etl.src.core.step import ETLStep
from etl.src.core.result_types import RawData, ProfileResult

FUZZY_THRESHOLD = 0.80


class Profiler(ETLStep):
    """
    Profiles headers of discovered CSV files and maps them to standard fields.
    Updates the mapping rules config after verification.
    """

    def __init__(self, ctx: DWIPContext) -> None:
        super().__init__(ctx)
        self.config = ctx.config
        self.logger = ctx.logger

    def execute(self, data: RawData) -> ProfileResult:
        """
        Execute profiling on all discovered files.
        """
        mappings = {}
        for disc in data.discovered_files:
            mappings[disc.path.name] = self.profile_file(disc)
        return ProfileResult(mappings=mappings, profile_summary=pd.DataFrame())

    def profile_file(self, disc: DiscoveredFile) -> Dict[str, str]:
        """
        Determine standard field mapping for all headers in a discovered file.
        Uses existing mapping rules if available, otherwise runs auto-detection.
        Returns a dict of {raw_header: standard_field}.
        """
        filename = disc.path.name
        # 1. Check existing confirmed mappings
        existing = self.config.mapping_rules.get(filename)
        if existing:
            self.logger.info("Found existing mapping rules for %s", filename)
            return existing

        # 2. Run auto-detection
        mapping: Dict[str, str] = {}
        unmapped: List[str] = []

        for header in disc.headers:
            standard_field = self.detect_field(header)
            if standard_field:
                mapping[header] = standard_field
            else:
                unmapped.append(header)

        # Log unmapped headers for reference
        if unmapped:
            self.logger.warning("Unmapped headers in %s: %s", filename, unmapped)

        return mapping

    def detect_field(self, raw_header: str) -> Optional[str]:
        """
        Find standard field for raw_header.
        Matches exact synonym first, then runs fuzzy matching.
        """
        cleaned = raw_header.strip().lower()
        synonym_map = self.config.all_synonyms()

        # 1. Exact match / Synonym match
        for std_field, synonyms in synonym_map.items():
            # Check standard field name itself
            if std_field.lower() == cleaned:
                return std_field
            # Check all registered synonyms
            for syn in synonyms:
                if syn.lower() == cleaned:
                    return std_field

        # 2. Fuzzy match
        best_std: Optional[str] = None
        best_score = 0.0

        for std_field, synonyms in synonym_map.items():
            # Match against std_field
            score = SequenceMatcher(None, cleaned, std_field.lower()).ratio()
            if score > best_score:
                best_score = score
                best_std = std_field

            # Match against synonyms
            for syn in synonyms:
                score = SequenceMatcher(None, cleaned, syn.lower()).ratio()
                if score > best_score:
                    best_score = score
                    best_std = std_field

        if best_score >= FUZZY_THRESHOLD and best_std:
            self.logger.info("Fuzzy matched header '%s' to standard field '%s' (score: %.2f)", raw_header, best_std, best_score)
            return best_std

        return None
