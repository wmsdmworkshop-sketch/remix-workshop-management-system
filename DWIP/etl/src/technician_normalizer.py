"""
DWIP Workforce v1.1 — Technician Normalizer
=============================================
Converts flat technician columns (MECH, TEC, ELE, TEC.1, ELE.1, etc.)
into normalized fact_service_technician rows.
One row per non-empty technician cell per job card.
"""

import logging
from etl.src.core.context import DWIPContext
from etl.src.core.step import ETLStep
from etl.src.models import FactServiceTechnician

logger = logging.getLogger("dwip.technician_normalizer")


class TechnicianNormalizer(ETLStep):
    """
    Reads technician columns from a normalized invoice/SH row dict
    and writes fact_service_technician rows.
    """

    def __init__(self, ctx: DWIPContext) -> None:
        super().__init__(ctx)
        self._tech_map = ctx.config.tech_column_map   # {col_header: {role, slot}}
        self._db = ctx.db
        self._norm = ctx.normalizer
        self.logger = ctx.logger
        # Cache: normalized_name → employee_id
        self._employee_cache: dict[str, int] = {}

    def execute(self, data: Any = None) -> Any:
        return None

    def process_event(
        self,
        service_event_id: int,
        row: dict,                  # normalized field dict
        source_file: str,
        source_row: int,
    ) -> int:
        """
        Process all technician columns for one service event.
        Returns the number of technician rows inserted.
        """
        inserted = 0

        for col_header, mapping in self._tech_map.items():
            # Try exact header match first, then case-insensitive
            raw_value = row.get(col_header) or row.get(col_header.upper())

            if not raw_value or not str(raw_value).strip():
                continue
            if str(raw_value).strip().lower() in ("nan", "none", ""):
                continue

            normalized_name = self._norm.employee_name(raw_value)
            if not normalized_name:
                continue

            employee_id = self._get_or_create_employee(
                name=normalized_name,
                raw_name=raw_value,
                role=mapping["role"],
                source_file=source_file,
            )

            with self._db.session() as sess:
                tech = FactServiceTechnician(
                    service_event_id=service_event_id,
                    employee_id=employee_id,
                    role=mapping["role"],
                    slot=mapping["slot"],
                    source_column=col_header,
                    source_file=source_file,
                    source_row=source_row,
                )
                sess.add(tech)

            inserted += 1

        return inserted

    def _get_or_create_employee(
        self,
        name: str,
        raw_name: str,
        role: str,
        source_file: str,
    ) -> int:
        """Look up or create a dim_employee entry. Returns employee_id."""
        if name in self._employee_cache:
            return self._employee_cache[name]

        from etl.src.models import DimEmployee
        is_code = self._norm.is_advisor_code(name)

        instance, created = self._db.get_or_create_employee(
            employee_name=name,
            employee_name_raw=raw_name,
            employee_code=name if is_code else None,
            is_code_only=is_code,
            default_role=role,
            source_file=source_file,
        )

        with self._db.session() as sess:
            emp = sess.query(DimEmployee).filter_by(employee_name=name).first()
            if emp:
                self._employee_cache[name] = emp.employee_id
                return emp.employee_id

        raise RuntimeError(f"Failed to retrieve employee_id for: {name}")
