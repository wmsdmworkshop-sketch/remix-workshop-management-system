"""
DWIP Workforce v1.1 — Configuration Loader
==========================================
Loads and validates all JSON config files from the DWIP/config/ directory.
Provides a single ConfigLoader instance used by all ETL modules.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


class ConfigLoader:
    """
    Loads and caches all DWIP configuration files.
    All ETL modules receive a single shared instance.
    """

    def __init__(self, config_dir: Path) -> None:
        self.config_dir = Path(config_dir)
        self._rules: Optional[Dict[str, Any]] = None
        self._sr_type_map: Optional[Dict[str, Any]] = None
        self._tech_column_map: Optional[Dict[str, Any]] = None
        self._mapping_rules: Optional[Dict[str, Any]] = None

    # ── Public Accessors ──────────────────────────────────────────

    @property
    def rules(self) -> Dict[str, Any]:
        if self._rules is None:
            self._rules = self._load("rules.json")
        return self._rules

    @property
    def sr_type_map(self) -> Dict[str, Any]:
        if self._sr_type_map is None:
            self._sr_type_map = {
                k: v for k, v in self._load("sr_type_map.json").items()
                if not k.startswith("_")
            }
        return self._sr_type_map

    @property
    def tech_column_map(self) -> Dict[str, Any]:
        if self._tech_column_map is None:
            self._tech_column_map = {
                k: v for k, v in self._load("technician_column_map.json").items()
                if not k.startswith("_")
            }
        return self._tech_column_map

    @property
    def mapping_rules(self) -> Dict[str, Any]:
        if self._mapping_rules is None:
            self._mapping_rules = {
                k: v for k, v in self._load("mapping_rules.json").items()
                if not k.startswith("_")
            }
        return self._mapping_rules

    def source_priority(self, field: str) -> list[str]:
        """Return the ordered source priority list for a given field."""
        return self.rules.get("source_priority", {}).get(field, [])

    def synonyms_for(self, standard_field: str) -> list[str]:
        """Return all known header synonyms for a standard field name."""
        return self.rules.get("synonyms", {}).get(standard_field, [standard_field])

    def all_synonyms(self) -> Dict[str, list[str]]:
        """Return the full synonym map {standard_field: [synonyms]}."""
        return self.rules.get("synonyms", {})

    def file_type_signatures(self) -> Dict[str, list[str]]:
        """Return the {file_type: [required_standard_fields]} map."""
        return self.rules.get("file_type_signatures", {})

    def input_subfolders(self) -> Dict[str, str]:
        """Return {subfolder_name: file_type} mapping."""
        return self.rules.get("input_subfolders", {})

    def validation_config(self) -> Dict[str, Any]:
        """Return validation thresholds and settings."""
        return self.rules.get("validation", {})

    def jc_prefix_patterns(self) -> list[str]:
        return self.validation_config().get("jc_prefix_patterns", ["JC-"])

    def impossible_odometer_km_per_day(self) -> float:
        return float(self.validation_config().get("impossible_odometer_jump_km_per_day", 1000))

    def save_mapping_rules(self, filename: str, mapping: Dict[str, str]) -> None:
        """Persist a confirmed header mapping back to mapping_rules.json."""
        existing = self.mapping_rules
        existing[filename] = mapping
        self._mapping_rules = existing
        path = self.config_dir / "mapping_rules.json"
        with open(path, "w", encoding="utf-8") as f:
            json.dump(existing, f, indent=2, ensure_ascii=False)
        logger.info("Saved mapping rules for %s to %s", filename, path)

    # ── Private ───────────────────────────────────────────────────

    def _load(self, filename: str) -> Dict[str, Any]:
        path = self.config_dir / filename
        if not path.exists():
            raise FileNotFoundError(
                f"Config file not found: {path}. "
                "Run the ETL from the DWIP root directory."
            )
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        logger.debug("Loaded config: %s (%d keys)", filename, len(data))
        return data
