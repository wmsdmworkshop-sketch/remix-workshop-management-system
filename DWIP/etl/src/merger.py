from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Any, Optional

import pandas as pd

from etl.src.core.context import DWIPContext
from etl.src.core.step import ETLStep
from etl.src.core.result_types import RawData, MergeResult, DiscoveredFile, ScoredRecord, OdometerReading

logger = logging.getLogger("dwip.merger")

# Technician column headers to extract from invoice/SH rows
TECH_COLUMNS = ["MECH", "TEC", "ELE", "TEC.1", "ELE.1", "ADDITIONAL TECH", "ADDITIONAL ELEC"]


class Merger(ETLStep):
    """
    Orchestrates the full cross-file merge.
    Called by main.py after loading and validation.
    """

    def __init__(self, ctx: DWIPContext) -> None:
        super().__init__(ctx)
        self._config   = ctx.config
        self._db       = ctx.db
        self._lineage  = ctx.lineage_tracker
        self._sr       = ctx.sr_mapper
        self._odo      = ctx.odo_engine
        self._tech     = ctx.tech_normalizer
        self._scorer   = ctx.scorer
        self._validator = ctx.validator
        self._norm     = ctx.normalizer
        self._resolver = ctx.resolver
        self.logger    = ctx.logger

    def execute(self, data: RawData) -> MergeResult:
        """Execute the merge step using the staged RawData."""
        stats = self.merge_all(data.discovered_files)
        return MergeResult(stats=stats, success=True)

    def merge_all(self, discovered_files: list[Any]) -> dict[str, int]:
        """
        Main entry point. Processes all files by type and builds the star schema.
        Returns a summary dict of record counts.
        """
        # Partition files by type
        invoice_files       = [f for f in discovered_files if f.file_type == "invoice"]
        sh_files            = [f for f in discovered_files if f.file_type == "service_history"]
        vm_files            = [f for f in discovered_files if f.file_type == "vehicle_master"]
        customer_files      = [f for f in discovered_files if f.file_type == "customer_master"]

        stats: dict[str, int] = {}

        # Step 1: Build vehicle dimensions from Vehicle Master first
        vm_count = self._build_dim_vehicle_from_vm(vm_files)
        stats["vehicles_from_master"] = vm_count

        # Step 2: Build service events from invoices
        event_count, rejected_count = self._build_service_events(invoice_files, sh_files)
        stats["service_events"] = event_count
        stats["rejected_jc"] = rejected_count

        # Step 3: Update dim_vehicle for outside vehicles (not in VM)
        outside_count = self._build_dim_vehicle_outside()
        stats["vehicles_outside"] = outside_count

        # Step 4: Update last_odometer on dim_vehicle
        self._update_last_odometer()

        # Step 5: Build customer dimension
        cust_count = self._build_dim_customer(vm_files, invoice_files, customer_files)
        stats["customers"] = cust_count

        # Step 6: Run odometer sequence validation (across all events now loaded)
        odo_issues = self._odo.run_sequence_validation()
        stats["odometer_issues"] = odo_issues

        # Flush all lineage
        self._lineage.flush_and_log("MERGE")

        self.logger.info("Merge complete: %s", stats)
        return stats

    # ── Dimension Builders ────────────────────────────────────────

    def _build_dim_vehicle_from_vm(self, vm_files: list[DiscoveredFile]) -> int:
        """Build dim_vehicle from Vehicle Master files (highest priority)."""
        count = 0
        for disc in vm_files:
            for idx, row in disc.df.iterrows():
                vrn_raw = self._norm.generic_string(self._get(row, ["VRN", "Vehicle No"]))
                vrn = self._norm.vrn(vrn_raw)
                if not vrn:
                    continue

                model = self._norm.generic_string(
                    self._get(row, ["PRODUCT LINE", "Product Line", "MODEL", "Model"])
                )
                manufacturer = self._norm.generic_string(
                    self._get(row, ["MANUFACTURER", "Make", "Brand"])
                )
                fuel_type = self._norm.generic_string(
                    self._get(row, ["FUEL TYPE", "Fuel Type", "Fuel"])
                )
                sale_date_raw = self._get(row, ["ORIGINAL SALE DATE", "Sale Date", "DOR"])
                sale_date = self._norm.date(sale_date_raw)
                chassis = self._norm.generic_string(
                    self._get(row, ["CHASSIS NO", "Chassis No", "VIN"])
                )
                engine = self._norm.generic_string(
                    self._get(row, ["ENGINE NO", "Engine No"])
                )
                color = self._norm.generic_string(
                    self._get(row, ["COLOR", "Colour", "Vehicle Color"])
                )
                year = None
                if sale_date:
                    try:
                        from dateutil import parser as dp
                        year = dp.parse(sale_date, dayfirst=True).year
                    except Exception:
                        pass

                src = disc.path.name
                row_num = int(idx) + 2

                score = self._scorer.score(
                    "vehicle_master",
                    {"vrn": vrn, "model": model, "chassis_no": chassis},
                )
                instance, created = self._db.upsert_vehicle(
                    vrn=vrn,
                    manufacturer=manufacturer,
                    model=model,
                    fuel_type=fuel_type,
                    year_of_build=year,
                    original_sale_date=sale_date,
                    chassis_no=chassis,
                    engine_no=engine,
                    color=color,
                    is_sold_by_us=True,
                    src_file_model=src, src_row_model=row_num,
                    src_file_chassis=src, src_row_chassis=row_num,
                    src_file_saledate=src, src_row_saledate=row_num,
                    src_file_manufacturer=src, src_row_manufacturer=row_num,
                    confidence_score=score,
                    validation_status="VALID",
                    merge_rule="Vehicle Master Primary",
                )

                # Track lineage for key fields
                for field_name, value in [
                    ("vrn", vrn), ("model", model), ("chassis_no", chassis),
                    ("engine_no", engine), ("original_sale_date", sale_date),
                    ("manufacturer", manufacturer),
                ]:
                    self._lineage.track(
                        target_table="dim_vehicle", target_pk=vrn,
                        field_name=field_name, value_used=value,
                        source_file=src, source_header=field_name.upper(),
                        source_row=row_num, merge_rule="Vehicle Master Primary",
                        confidence_score=score,
                    )
                count += 1

        self.logger.info("dim_vehicle from Vehicle Master: %d records", count)
        return count

    def _build_dim_vehicle_outside(self) -> int:
        """
        Ensure all VRNs in fact_service_event have a dim_vehicle entry.
        Returns the count of outside vehicles (is_sold_by_us=False) in dim_vehicle.
        """
        from etl.src.models import DimVehicle, FactServiceEvent
        with self._db.session() as sess:
            event_vrns = {row[0] for row in sess.query(FactServiceEvent.vrn).distinct()}
            vm_vrns = {row[0] for row in sess.query(DimVehicle.vrn).distinct()}
            missing_vrns = event_vrns - vm_vrns

        for vrn in missing_vrns:
            score = self._scorer.score("synthetic", {"vrn": vrn})
            self._db.upsert_vehicle(
                vrn=vrn,
                is_sold_by_us=False,
                confidence_score=score,
                validation_status="VALID",
                merge_rule="Derived Shell — not in Vehicle Master",
            )

        with self._db.session() as sess:
            count = sess.query(DimVehicle).filter_by(is_sold_by_us=False).count()

        if count:
            self.logger.info("Found %d outside vehicles in database.", count)
        return count

    def _update_last_odometer(self) -> None:
        """Update dim_vehicle.last_odometer from best readings across all events."""
        from etl.src.models import DimVehicle
        with self._db.session() as sess:
            vrns = [row[0] for row in sess.query(DimVehicle.vrn).all()]

        for vrn in vrns:
            odo, date = self._odo.best_odometer_for_vrn(vrn)
            if odo is not None:
                self._db.upsert_vehicle(vrn=vrn, last_odometer=odo, last_odometer_date=date)

    def _build_dim_customer(
        self,
        vm_files: list[DiscoveredFile],
        invoice_files: list[DiscoveredFile],
        customer_files: list[DiscoveredFile],
    ) -> int:
        """
        Build dim_customer and bridge_vehicle_customer.
        Priority: VM (latest date) → Invoice (latest dated JC) → Customer Master.
        """
        from etl.src.models import DimCustomer, BridgeVehicleCustomer

        # Collect (vrn, customer_name, as_of_date, source, score) from all sources
        candidates: list[tuple[str, str, str, str, int, float]] = []
        # (vrn, name, date, source_file, source_row, score)

        for disc in vm_files:
            for idx, row in disc.df.iterrows():
                vrn = self._norm.vrn(self._get(row, ["VRN", "Vehicle No"]))
                name = self._norm.customer_name(self._get(row, ["NAME", "Customer Name", "Owner Name"]))
                date = self._norm.date(self._get(row, ["ORIGINAL SALE DATE", "Sale Date"]))
                if vrn and name:
                    candidates.append((vrn, name, date or "", disc.path.name, int(idx)+2, 90.0))

        for disc in invoice_files:
            for idx, row in disc.df.iterrows():
                vrn = self._norm.vrn(self._get(row, ["VRN", "Vehicle No"]))
                name = self._norm.customer_name(self._get(row, ["NAME", "Customer Name"]))
                date = self._norm.date(self._get(row, ["INVOICE DATE"]))
                if vrn and name:
                    candidates.append((vrn, name, date or "", disc.path.name, int(idx)+2, 80.0))

        for disc in customer_files:
            for idx, row in disc.df.iterrows():
                vrn = self._norm.vrn(self._get(row, ["VRN", "Vehicle No"]))
                name = self._norm.customer_name(self._get(row, ["NAME", "Customer Name"]))
                phone = self._norm.generic_string(self._get(row, ["PHONE", "Mobile"]))
                address = self._norm.generic_string(self._get(row, ["ADDRESS"]))
                if vrn and name:
                    candidates.append((vrn, name, "", disc.path.name, int(idx)+2, 65.0))

        # Group by VRN, pick latest date as current customer
        vrn_map: dict[str, list] = {}
        for cand in candidates:
            vrn_map.setdefault(cand[0], []).append(cand)

        count = 0
        for vrn, cands in vrn_map.items():
            # Sort: by date desc (latest first), then score desc
            try:
                from dateutil import parser as dp
                cands.sort(key=lambda c: (c[2] or "01-01-1900"), reverse=True)
            except Exception:
                pass

            # Insert all unique customer names as dim_customer entries
            seen_names: set[str] = set()
            for i, (vrn_, name, date, src, row_num, score) in enumerate(cands):
                if name in seen_names:
                    continue
                seen_names.add(name)

                with self._db.session() as sess:
                    existing = sess.query(DimCustomer).filter_by(vrn=vrn, customer_name=name).first()
                    if not existing:
                        cust = DimCustomer(
                            vrn=vrn, customer_name=name,
                            as_of_date=date or None,
                            source_file=src, source_row=row_num,
                            confidence_score=score
                        )
                        sess.add(cust)

            # Build bridge history
            with self._db.session() as sess:
                customer_records = sess.query(DimCustomer).filter_by(vrn=vrn).order_by(
                    DimCustomer.as_of_date.desc()
                ).all()
                # Mark all as not current, then mark latest as current
                for i, cust in enumerate(customer_records):
                    bridge = BridgeVehicleCustomer(
                        vrn=vrn,
                        customer_id=cust.customer_id,
                        is_current=(i == 0),
                        effective_from=cust.as_of_date,
                    )
                    sess.add(bridge)

            count += 1

        self.logger.info("dim_customer: %d VRNs processed.", count)
        return count

    # ── Service Event Builder ─────────────────────────────────────

    def _build_service_events(
        self,
        invoice_files: list[DiscoveredFile],
        sh_files: list[DiscoveredFile],
    ) -> tuple[int, int]:
        """
        Build fact_service_event by joining invoice rows with service history.
        Deduplicates records before building events.
        Returns (events_inserted, events_rejected).
        """
        # Index service history by job_card_no for O(1) lookup
        sh_index = self._build_sh_index(sh_files)

        events_inserted = 0
        events_rejected = 0
        scored_records: list[ScoredRecord] = []

        for disc in invoice_files:
            for idx, row in disc.df.iterrows():
                src_file = disc.path.name
                src_row = int(idx) + 2

                vrn     = self._norm.vrn(self._get(row, ["VRN", "Vehicle No"]))
                jc_raw  = self._get(row, ["J C NO", "Order#", "JC NO", "Job Card No"])
                jc_no   = self._norm.job_card_no(jc_raw)
                inv_date_raw = self._get(row, ["INVOICE DATE", "Invoice Date"])
                inv_date = self._norm.date(inv_date_raw)
                labour_raw  = self._get(row, ["LABOUR", "Labour", "Final Labour Invoice Amount"])
                spares_raw  = self._get(row, ["SPARES", "Spares", "Final Spares Invoice Amount"])
                total_raw   = self._get(row, ["Final Consolidated Invoice Amount", "TOTAL", "Total", "Grand Total"])
                labour = self._norm.amount(labour_raw) or 0.0
                spares = self._norm.amount(spares_raw) or 0.0
                total  = self._norm.amount(total_raw)  or 0.0
                adv_raw = self._get(row, ["ADVISIOR", "Advisor", "Service Advisor"])
                advisor_inv = self._norm.employee_name(adv_raw)
                jc_type_raw = self._get(row, ["JC TYPE", "JC Type", "Job Type"])
                cust_name_raw = self._get(row, ["NAME", "Customer Name", "Customer"])
                customer_name = self._norm.customer_name(cust_name_raw)

                summary = self._validator.validate_invoice_record(
                    vrn=vrn, job_card_no=jc_no, invoice_date=inv_date,
                    labour=labour, spares=spares, total=total,
                    service_advisor=advisor_inv, customer_name=customer_name,
                    source_file=src_file, source_row=src_row,
                )

                for failure in summary.failures:
                    self._db.log_validation(
                        rule_id=failure.rule_id, severity=failure.severity,
                        description=failure.description,
                        vrn=vrn, job_card_no=jc_no,
                        field_name=failure.field_name, raw_value=failure.raw_value,
                        source_file=src_file, source_row=src_row,
                    )

                if not summary.jc_filter_passed:
                    self._db.log_rejected(
                        reason="JC_PREFIX_FAIL" if jc_no else "MISSING_JC_NO",
                        job_card_no=jc_no,
                        vrn=vrn,
                        source_file=src_file,
                        source_row=src_row,
                        raw_data_json=json.dumps({k: str(v) for k, v in row.items()}, ensure_ascii=False)
                    )
                    events_rejected += 1
                    continue

                score = self._scorer.score(
                    source_type="invoice",
                    fields={
                        "vrn": vrn, "job_card_no": jc_no,
                        "service_date": inv_date, "total_bill": total,
                        "service_advisor": advisor_inv,
                        "sr_type": jc_type_raw, "customer_name": customer_name,
                    },
                    validation_delta=summary.total_score_delta,
                )

                scored_records.append(ScoredRecord(
                    unique_key=jc_no,
                    source_type="invoice",
                    source_file=src_file,
                    source_row=src_row,
                    fields=dict(row),
                    confidence_score=score,
                    validation_score_delta=summary.total_score_delta,
                ))

        # Resolve duplicates using DuplicateResolver
        resolved_records = self._resolver.resolve(scored_records, "invoice", "job_card_no")

        for rec in resolved_records:
            row_series = pd.Series(rec.fields)
            result = self._process_invoice_row(row_series, rec.source_file, rec.source_row, sh_index)
            if result == "REJECTED":
                events_rejected += 1
            elif result == "OK":
                events_inserted += 1

        logger.info(
            "fact_service_event: %d inserted, %d duplicate(s) resolved, %d rejected",
            events_inserted, len(scored_records) - len(resolved_records), events_rejected
        )
        self._db.log_merge(
            "MERGE", "Service Events Built",
            f"{events_inserted} events, {events_rejected} rejected",
            events_inserted
        )
        return events_inserted, events_rejected

    def _build_sh_index(self, sh_files: list[DiscoveredFile]) -> dict[str, dict]:
        """Build a {job_card_no → row_dict} index from all service history files."""
        index: dict[str, dict] = {}
        for disc in sh_files:
            for idx, row in disc.df.iterrows():
                jc_raw = self._get(row, ["J C NO", "JC NO", "Order#", "Job Card No"])
                jc = self._norm.job_card_no(jc_raw)
                if jc:
                    d = dict(row)
                    d["__source_file__"] = disc.path.name
                    d["__source_row__"] = int(idx) + 2
                    index[jc] = d
        self.logger.info("Service History index built: %d unique job cards.", len(index))
        return index

    def _process_invoice_row(
        self,
        row: pd.Series,
        src_file: str,
        src_row: int,
        sh_index: dict[str, dict],
    ) -> str:
        """Process one invoice row. Returns 'OK' or 'REJECTED'."""
        # Normalize key fields
        vrn     = self._norm.vrn(self._get(row, ["VRN", "Vehicle No"]))
        jc_raw  = self._get(row, ["J C NO", "Order#", "JC NO", "Job Card No"])
        jc_no   = self._norm.job_card_no(jc_raw)
        inv_no  = self._norm.generic_string(self._get(row, ["INVOICE NO", "Invoice No"]))
        inv_date_raw = self._get(row, ["INVOICE DATE", "Invoice Date"])
        inv_date = self._norm.date(inv_date_raw)

        labour_raw  = self._get(row, ["LABOUR", "Labour", "Final Labour Invoice Amount"])
        spares_raw  = self._get(row, ["SPARES", "Spares", "Final Spares Invoice Amount"])
        total_raw   = self._get(row, [
            "Final Consolidated Invoice Amount",
            "TOTAL", "Total", "Grand Total"
        ])
        labour = self._norm.amount(labour_raw) or 0.0
        spares = self._norm.amount(spares_raw) or 0.0
        total  = self._norm.amount(total_raw)  or 0.0
        total_bill_source = "Final Consolidated Invoice Amount" if self._get(
            row, ["Final Consolidated Invoice Amount"]
        ) else "TOTAL"

        adv_raw = self._get(row, ["ADVISIOR", "Advisor", "Service Advisor"])
        advisor_inv = self._norm.employee_name(adv_raw)
        jc_type_raw = self._get(row, ["JC TYPE", "JC Type", "Job Type"])

        cust_name_raw = self._get(row, ["NAME", "Customer Name", "Customer"])
        customer_name = self._norm.customer_name(cust_name_raw)

        # Run validation
        summary = self._validator.validate_invoice_record(
            vrn=vrn, job_card_no=jc_no, invoice_date=inv_date,
            labour=labour, spares=spares, total=total,
            service_advisor=advisor_inv, customer_name=customer_name,
            source_file=src_file, source_row=src_row,
        )

        # Write validation failures
        for failure in summary.failures:
            self._db.log_validation(
                rule_id=failure.rule_id, severity=failure.severity,
                description=failure.description,
                vrn=vrn, job_card_no=jc_no,
                field_name=failure.field_name, raw_value=failure.raw_value,
                source_file=src_file, source_row=src_row,
            )

        # If JC filter failed → reject
        if not summary.jc_filter_passed:
            self._db.log_rejected(
                reason="JC_PREFIX_FAIL" if jc_no else "MISSING_JC_NO",
                job_card_no=jc_no,
                vrn=vrn,
                source_file=src_file,
                source_row=src_row,
                raw_data_json=json.dumps({k: str(v) for k, v in row.items()}, ensure_ascii=False)
            )
            return "REJECTED"

        # Create VRN shell if not yet in dim_vehicle
        if vrn:
            from etl.src.models import DimVehicle
            with self._db.session() as sess:
                if not sess.get(DimVehicle, vrn):
                    self._db.upsert_vehicle(
                        vrn=vrn, is_sold_by_us=False,
                        confidence_score=30.0,
                        validation_status="VALID",
                        merge_rule="Derived Shell — first seen in invoice",
                    )

        # Merge with service history (if available)
        sh_row = sh_index.get(jc_no, {})
        sh_src_file = sh_row.get("__source_file__", src_file)
        sh_src_row  = sh_row.get("__source_row__", src_row)

        # Service classification: SH primary, Invoice fallback
        sr_type_raw = self._norm.generic_string(
            sh_row.get("SR TYPE") or sh_row.get("SR Type")
        ) or jc_type_raw
        sr_result = self._sr.map(sr_type_raw)
        sr_type_id = sr_result.sr_type_id if sr_result else None

        # Service advisor: SH primary, Invoice fallback
        advisor_sh = self._norm.employee_name(
            sh_row.get("SR ASSIGNED TO") or sh_row.get("SR Assigned To")
        )
        service_advisor = advisor_sh or advisor_inv
        advisor_source = "service_history" if advisor_sh else (
            "invoice_fallback" if advisor_inv else None
        )

        if service_advisor:
            self._db.get_or_create_employee(
                employee_name=service_advisor,
                employee_name_raw=advisor_sh or advisor_inv,
                employee_code=advisor_inv if self._norm.is_advisor_code(advisor_inv) else (
                    service_advisor if self._norm.is_advisor_code(service_advisor) else None
                ),
                is_code_only=self._norm.is_advisor_code(service_advisor),
                default_role="ADVISOR",
                source_file=sh_src_file if advisor_sh else src_file,
            )

        # Odometer: SH only
        odo_raw = sh_row.get("ODOMETER") or sh_row.get("Odometer") or sh_row.get("Odometer Reading")
        odo_value = self._norm.amount(str(odo_raw)) if odo_raw else None
        odo_reading = OdometerReading(
            vrn=vrn or "", service_date=inv_date,
            odometer=odo_value,
            source_file=sh_src_file, source_row=sh_src_row,
            job_card_no=jc_no,
        )
        odo_reading = self._odo.add_reading(odo_reading)
        odo_resolution = self._odo.resolve_for_event(
            vrn=vrn or "", service_date=inv_date,
            candidates=[odo_reading]
        )

        # Complaint
        complaint = self._norm.generic_string(
            sh_row.get("COMPLAINT") or sh_row.get("Complaint") or sh_row.get("Complaint Description")
        )

        # Confidence score
        score = self._scorer.score(
            source_type="invoice",
            fields={
                "vrn": vrn, "job_card_no": jc_no,
                "service_date": inv_date, "total_bill": total,
                "service_advisor": service_advisor,
                "sr_type": sr_type_raw, "customer_name": customer_name,
            },
            validation_delta=summary.total_score_delta,
            is_primary=True,
            has_conflict=(odo_resolution.status == "CONFLICT"),
        )

        validation_status = summary.validation_status

        # Ensure dim_date entry exists
        if inv_date:
            parts = self._norm.date_key_to_parts(inv_date)
            if parts:
                self._db.get_or_create_date(date_key=inv_date, **{
                    k: v for k, v in parts.items() if k != "date_key"
                })

        # Lookup customer_id
        customer_id = self._get_customer_id(vrn, customer_name)

        # UPSERT fact_service_event
        _, created = self._db.upsert_service_event(
            job_card_no=jc_no,
            vrn=vrn,
            customer_id=customer_id,
            sr_type_id=sr_type_id,
            service_date=inv_date,
            invoice_no=inv_no,
            odometer_reading=odo_resolution.odometer,
            odometer_status=odo_resolution.status,
            odometer_source=odo_resolution.source_file or src_file,
            labour_amount=labour,
            spares_amount=spares,
            total_bill=total,
            total_bill_source=total_bill_source,
            complaint_description=complaint,
            service_advisor=service_advisor,
            service_advisor_source=advisor_source,
            jc_filter_passed=True,
            validation_status=validation_status,
            confidence_score=score,
            merge_rule=f"Invoice primary + SH{'joined' if sh_row else 'absent'}",
            source_file=src_file,
            source_row=src_row,
        )

        # Get the new service_event_id
        service_event_id = self._get_service_event_id(jc_no)
        if service_event_id is None:
            return "OK"

        # Write technicians
        tech_row = {**dict(row)}
        if sh_row:
            tech_row.update({k: v for k, v in sh_row.items() if not k.startswith("__")})
        self._tech.process_event(service_event_id, tech_row, src_file, src_row)

        # Lineage
        for field_name, value, header, fsrc, frow in [
            ("vrn",                  vrn,            "VRN",             src_file,    src_row),
            ("service_date",         inv_date,       "INVOICE DATE",    src_file,    src_row),
            ("job_card_no",          jc_no,          "J C NO",          src_file,    src_row),
            ("invoice_no",           inv_no,         "INVOICE NO",      src_file,    src_row),
            ("total_bill",           total,          total_bill_source, src_file,    src_row),
            ("labour_amount",        labour,         "LABOUR",          src_file,    src_row),
            ("spares_amount",        spares,         "SPARES",          src_file,    src_row),
            ("service_advisor",      service_advisor, "SR ASSIGNED TO" if advisor_sh else "ADVISIOR",
             sh_src_file if advisor_sh else src_file,
             sh_src_row  if advisor_sh else src_row),
            ("sr_type",              sr_type_raw,    "SR TYPE" if sh_row else "JC TYPE",
             sh_src_file if sh_row else src_file,
             sh_src_row  if sh_row else src_row),
            ("odometer_reading",     odo_resolution.odometer, "ODOMETER", sh_src_file, sh_src_row),
            ("complaint_description",complaint,      "COMPLAINT",       sh_src_file, sh_src_row),
        ]:
            if value is not None:
                self._lineage.track(
                    target_table="fact_service_event",
                    target_pk=str(service_event_id),
                    field_name=field_name,
                    value_used=value,
                    source_file=fsrc,
                    source_header=header,
                    source_row=frow,
                    merge_rule="Direct Import" if fsrc == src_file else "Service History Join",
                    confidence_score=score,
                    validation_status=validation_status,
                )

        return "OK"

    # ── Utilities ─────────────────────────────────────────────────

    def _get_customer_id(self, vrn: Optional[str], name: Optional[str]) -> Optional[int]:
        if not vrn or not name:
            return None
        from etl.src.models import DimCustomer
        with self._db.session() as sess:
            row = sess.query(DimCustomer).filter_by(vrn=vrn, customer_name=name).first()
            return row.customer_id if row else None

    def _get_service_event_id(self, job_card_no: str) -> Optional[int]:
        from etl.src.models import FactServiceEvent
        with self._db.session() as sess:
            row = sess.query(FactServiceEvent).filter_by(job_card_no=job_card_no).first()
            return row.service_event_id if row else None

    @staticmethod
    def _get(row: Any, candidates: list[str]) -> Optional[str]:
        """Return first non-empty value from candidate column names."""
        if isinstance(row, pd.Series):
            for col in candidates:
                if col in row.index:
                    val = str(row[col]).strip()
                    if val and val.lower() not in ("nan", "none", ""):
                        return val
        elif isinstance(row, dict):
            for col in candidates:
                if col in row:
                    val = str(row[col]).strip()
                    if val and val.lower() not in ("nan", "none", ""):
                        return val
        return None
