"""
DWIP Workforce v1.1 — SQLAlchemy ORM Models
============================================
ORM-compatible with SQLite (Phase 1) and PostgreSQL (future migration).
Uses SQLAlchemy 2.0 Mapped[] style throughout.
No dialect-specific types — only String, Integer, Float, Boolean, Text, DateTime.
"""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    Boolean, DateTime, Float, ForeignKey,
    Integer, String, Text, UniqueConstraint, Index
)
from sqlalchemy.orm import (
    DeclarativeBase, Mapped, mapped_column, relationship
)


class Base(DeclarativeBase):
    """Shared declarative base for all DWIP models."""
    pass


# ─────────────────────────────────────────────────────────────────
# RAW STAGING TABLES  (Layer 1 — original values, never mutated)
# ─────────────────────────────────────────────────────────────────

class StgRawInvoice(Base):
    """Raw invoice rows exactly as ingested. Immutable after INSERT."""
    __tablename__ = "stg_raw_invoice"

    raw_id: Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_file: Mapped[str]      = mapped_column(String(512), nullable=False)
    source_row: Mapped[int]       = mapped_column(Integer, nullable=False)
    ingest_timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    invoice_date_raw: Mapped[Optional[str]]   = mapped_column(Text)
    invoice_no_raw: Mapped[Optional[str]]     = mapped_column(Text)
    job_card_no_raw: Mapped[Optional[str]]    = mapped_column(Text)
    vrn_raw: Mapped[Optional[str]]            = mapped_column(Text)
    customer_name_raw: Mapped[Optional[str]]  = mapped_column(Text)
    labour_raw: Mapped[Optional[str]]         = mapped_column(Text)
    spares_raw: Mapped[Optional[str]]         = mapped_column(Text)
    total_raw: Mapped[Optional[str]]          = mapped_column(Text)
    advisor_raw: Mapped[Optional[str]]        = mapped_column(Text)
    jc_type_raw: Mapped[Optional[str]]        = mapped_column(Text)
    mech_raw: Mapped[Optional[str]]           = mapped_column(Text)
    tec1_raw: Mapped[Optional[str]]           = mapped_column(Text)
    ele1_raw: Mapped[Optional[str]]           = mapped_column(Text)
    tec2_raw: Mapped[Optional[str]]           = mapped_column(Text)
    ele2_raw: Mapped[Optional[str]]           = mapped_column(Text)
    add_tech_raw: Mapped[Optional[str]]       = mapped_column(Text)
    add_elec_raw: Mapped[Optional[str]]       = mapped_column(Text)
    extra_fields_json: Mapped[Optional[str]]  = mapped_column(Text)


class StgRawServiceHistory(Base):
    """Raw service history rows exactly as ingested. Immutable after INSERT."""
    __tablename__ = "stg_raw_service_history"

    raw_id: Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_file: Mapped[str]      = mapped_column(String(512), nullable=False)
    source_row: Mapped[int]       = mapped_column(Integer, nullable=False)
    ingest_timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    job_card_no_raw: Mapped[Optional[str]]    = mapped_column(Text)
    vrn_raw: Mapped[Optional[str]]            = mapped_column(Text)
    sr_type_raw: Mapped[Optional[str]]        = mapped_column(Text)
    odometer_raw: Mapped[Optional[str]]       = mapped_column(Text)
    sr_assigned_to_raw: Mapped[Optional[str]] = mapped_column(Text)
    complaint_raw: Mapped[Optional[str]]      = mapped_column(Text)
    service_date_raw: Mapped[Optional[str]]   = mapped_column(Text)
    customer_name_raw: Mapped[Optional[str]]  = mapped_column(Text)
    extra_fields_json: Mapped[Optional[str]]  = mapped_column(Text)


class StgRawVehicleMaster(Base):
    """Raw vehicle master rows. Immutable after INSERT."""
    __tablename__ = "stg_raw_vehicle_master"

    raw_id: Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_file: Mapped[str]      = mapped_column(String(512), nullable=False)
    source_row: Mapped[int]       = mapped_column(Integer, nullable=False)
    ingest_timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    vrn_raw: Mapped[Optional[str]]              = mapped_column(Text)
    chassis_no_raw: Mapped[Optional[str]]       = mapped_column(Text)
    engine_no_raw: Mapped[Optional[str]]        = mapped_column(Text)
    manufacturer_raw: Mapped[Optional[str]]     = mapped_column(Text)
    model_raw: Mapped[Optional[str]]            = mapped_column(Text)
    product_line_raw: Mapped[Optional[str]]     = mapped_column(Text)
    fuel_type_raw: Mapped[Optional[str]]        = mapped_column(Text)
    original_sale_date_raw: Mapped[Optional[str]] = mapped_column(Text)
    color_raw: Mapped[Optional[str]]            = mapped_column(Text)
    customer_name_raw: Mapped[Optional[str]]    = mapped_column(Text)
    extra_fields_json: Mapped[Optional[str]]    = mapped_column(Text)


class StgRawCustomer(Base):
    """Raw customer master rows. Immutable after INSERT."""
    __tablename__ = "stg_raw_customer"

    raw_id: Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_file: Mapped[str]      = mapped_column(String(512), nullable=False)
    source_row: Mapped[int]       = mapped_column(Integer, nullable=False)
    ingest_timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    vrn_raw: Mapped[Optional[str]]           = mapped_column(Text)
    customer_name_raw: Mapped[Optional[str]] = mapped_column(Text)
    phone_raw: Mapped[Optional[str]]         = mapped_column(Text)
    address_raw: Mapped[Optional[str]]       = mapped_column(Text)
    extra_fields_json: Mapped[Optional[str]] = mapped_column(Text)


# ─────────────────────────────────────────────────────────────────
# DIMENSION TABLES  (Layer 5)
# ─────────────────────────────────────────────────────────────────

class DimVehicle(Base):
    """
    Master vehicle profile. One row per unique VRN.
    Supports both vehicles sold by us (is_sold_by_us=True)
    and outside vehicles serviced by us (is_sold_by_us=False).
    """
    __tablename__ = "dim_vehicle"

    vrn: Mapped[str]                    = mapped_column(String(20), primary_key=True)
    manufacturer: Mapped[Optional[str]] = mapped_column(String(100))
    model: Mapped[Optional[str]]        = mapped_column(String(200))
    fuel_type: Mapped[Optional[str]]    = mapped_column(String(50))
    year_of_build: Mapped[Optional[int]]= mapped_column(Integer)
    original_sale_date: Mapped[Optional[str]] = mapped_column(String(10))   # DD-MM-YYYY
    chassis_no: Mapped[Optional[str]]   = mapped_column(String(100))
    engine_no: Mapped[Optional[str]]    = mapped_column(String(100))
    color: Mapped[Optional[str]]        = mapped_column(String(50))
    is_sold_by_us: Mapped[bool]         = mapped_column(Boolean, default=False, nullable=False)
    last_odometer: Mapped[Optional[float]] = mapped_column(Float)
    last_odometer_date: Mapped[Optional[str]] = mapped_column(String(10))

    # Per-field lineage (the critical fields that may be derived)
    src_file_model: Mapped[Optional[str]]    = mapped_column(String(512))
    src_row_model: Mapped[Optional[int]]     = mapped_column(Integer)
    src_file_chassis: Mapped[Optional[str]]  = mapped_column(String(512))
    src_row_chassis: Mapped[Optional[int]]   = mapped_column(Integer)
    src_file_saledate: Mapped[Optional[str]] = mapped_column(String(512))
    src_row_saledate: Mapped[Optional[int]]  = mapped_column(Integer)
    src_file_manufacturer: Mapped[Optional[str]] = mapped_column(String(512))
    src_row_manufacturer: Mapped[Optional[int]]  = mapped_column(Integer)

    # Quality
    confidence_score: Mapped[float]          = mapped_column(Float, default=0.0, nullable=False)
    validation_status: Mapped[str]           = mapped_column(String(20), default="VALID", nullable=False)
    merge_rule: Mapped[Optional[str]]        = mapped_column(String(200))
    created_at: Mapped[datetime]             = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime]             = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    service_events: Mapped[List["FactServiceEvent"]] = relationship(back_populates="vehicle")
    customer_history: Mapped[List["BridgeVehicleCustomer"]] = relationship(back_populates="vehicle")


class DimCustomer(Base):
    """
    Customer snapshot. Latest verified customer per vehicle.
    Full ownership history is in BridgeVehicleCustomer.
    """
    __tablename__ = "dim_customer"

    customer_id: Mapped[int]          = mapped_column(Integer, primary_key=True, autoincrement=True)
    vrn: Mapped[str]                  = mapped_column(String(20), ForeignKey("dim_vehicle.vrn"), nullable=False)
    customer_name: Mapped[str]        = mapped_column(String(300), nullable=False)
    customer_name_raw: Mapped[Optional[str]] = mapped_column(Text)
    phone: Mapped[Optional[str]]      = mapped_column(String(50))
    address: Mapped[Optional[str]]    = mapped_column(Text)
    as_of_date: Mapped[Optional[str]] = mapped_column(String(10))  # DD-MM-YYYY
    source_file: Mapped[Optional[str]]= mapped_column(String(512))
    source_row: Mapped[Optional[int]] = mapped_column(Integer)
    confidence_score: Mapped[float]   = mapped_column(Float, default=0.0, nullable=False)
    created_at: Mapped[datetime]      = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    vehicle: Mapped["DimVehicle"] = relationship(back_populates=None)
    service_events: Mapped[List["FactServiceEvent"]] = relationship(back_populates="customer")
    vehicle_bridges: Mapped[List["BridgeVehicleCustomer"]] = relationship(back_populates="customer")

    __table_args__ = (
        Index("idx_customer_vrn", "vrn"),
    )


class BridgeVehicleCustomer(Base):
    """
    Complete ownership history per vehicle.
    Supports Customer 360° — who owned the vehicle and when.
    """
    __tablename__ = "bridge_vehicle_customer"

    bridge_id: Mapped[int]            = mapped_column(Integer, primary_key=True, autoincrement=True)
    vrn: Mapped[str]                  = mapped_column(String(20), ForeignKey("dim_vehicle.vrn"), nullable=False)
    customer_id: Mapped[int]          = mapped_column(Integer, ForeignKey("dim_customer.customer_id"), nullable=False)
    effective_from: Mapped[Optional[str]] = mapped_column(String(10))
    effective_to: Mapped[Optional[str]]   = mapped_column(String(10))
    is_current: Mapped[bool]          = mapped_column(Boolean, default=True, nullable=False)
    source_file: Mapped[Optional[str]]= mapped_column(String(512))
    created_at: Mapped[datetime]      = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    vehicle: Mapped["DimVehicle"]   = relationship(back_populates="customer_history")
    customer: Mapped["DimCustomer"] = relationship(back_populates="vehicle_bridges")

    __table_args__ = (
        Index("idx_bridge_vrn", "vrn"),
        Index("idx_bridge_current", "vrn", "is_current"),
    )


class DimEmployee(Base):
    """
    Unified employee/staff directory.
    Covers service advisors, mechanics, technicians, electricians.
    Handles both human names AND system ID codes (is_code_only=True).
    """
    __tablename__ = "dim_employee"

    employee_id: Mapped[int]          = mapped_column(Integer, primary_key=True, autoincrement=True)
    employee_name: Mapped[str]        = mapped_column(String(200), nullable=False, unique=True)
    employee_name_raw: Mapped[Optional[str]] = mapped_column(Text)
    employee_code: Mapped[Optional[str]]     = mapped_column(String(100))  # e.g. RS1_100B210
    is_code_only: Mapped[bool]        = mapped_column(Boolean, default=False, nullable=False)
    default_role: Mapped[Optional[str]] = mapped_column(String(50))
    # ADVISOR / MECHANIC / TECHNICIAN / ELECTRICIAN / PAINTER / HELPER
    source_file: Mapped[Optional[str]]= mapped_column(String(512))
    created_at: Mapped[datetime]      = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    tech_assignments: Mapped[List["FactServiceTechnician"]] = relationship(back_populates="employee")


class DimServiceType(Base):
    """
    Service type dimension. Maps every raw SR Type / JC Type value
    to a canonical name and category. Preserves both raw and canonical.
    Includes service_stage for scheduled service variants.
    """
    __tablename__ = "dim_service_type"

    sr_type_id: Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    raw_sr_type: Mapped[str]          = mapped_column(String(200), nullable=False, unique=True)
    canonical_name: Mapped[str]       = mapped_column(String(200), nullable=False)
    canonical_service_category: Mapped[str] = mapped_column(String(50), nullable=False)
    # REPAIR / WARRANTY / FREE_SERVICE / AMC / BREAKDOWN /
    # PAID_SERVICE / SCHEDULED_SERVICE / RETROFIT / OTHER
    service_stage: Mapped[Optional[str]] = mapped_column(String(50))
    # Preserved for SCHEDULED_SERVICE: "0 (<5000Km)", "1 (<10000Km)", etc.
    is_approved: Mapped[bool]         = mapped_column(Boolean, default=False, nullable=False)
    mapped_by: Mapped[str]            = mapped_column(String(20), default="AUTO", nullable=False)
    created_at: Mapped[datetime]      = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    service_events: Mapped[List["FactServiceEvent"]] = relationship(back_populates="service_type")


class DimDate(Base):
    """
    Date dimension for time-intelligence analytics.
    Populated by ETL for every date encountered in fact tables.
    """
    __tablename__ = "dim_date"

    date_key: Mapped[str]         = mapped_column(String(10), primary_key=True)  # DD-MM-YYYY
    day: Mapped[int]              = mapped_column(Integer, nullable=False)
    month: Mapped[int]            = mapped_column(Integer, nullable=False)
    year: Mapped[int]             = mapped_column(Integer, nullable=False)
    month_name: Mapped[str]       = mapped_column(String(20), nullable=False)
    quarter: Mapped[str]          = mapped_column(String(5), nullable=False)    # Q1/Q2/Q3/Q4
    financial_year: Mapped[str]   = mapped_column(String(10), nullable=False)  # e.g. 2526
    week_of_year: Mapped[int]     = mapped_column(Integer, nullable=False)
    is_weekend: Mapped[bool]      = mapped_column(Boolean, default=False, nullable=False)


# ─────────────────────────────────────────────────────────────────
# FACT TABLES  (Layer 5)
# ─────────────────────────────────────────────────────────────────

class FactServiceEvent(Base):
    """
    Central fact table. One row per unique Job Card.
    Business Entity: Vehicle → Visit → Job Card → Invoice + Labour + Technicians.
    Only records with jc_filter_passed=True appear in v_vehicle_history.
    """
    __tablename__ = "fact_service_event"

    service_event_id: Mapped[int]     = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Keys
    vrn: Mapped[str]                  = mapped_column(String(20), ForeignKey("dim_vehicle.vrn"), nullable=False)
    customer_id: Mapped[Optional[int]]= mapped_column(Integer, ForeignKey("dim_customer.customer_id"))
    sr_type_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("dim_service_type.sr_type_id"))
    service_date: Mapped[Optional[str]] = mapped_column(String(10), ForeignKey("dim_date.date_key"))

    # Job Card Identity
    job_card_no: Mapped[str]          = mapped_column(String(100), nullable=False, unique=True)
    invoice_no: Mapped[Optional[str]] = mapped_column(String(100))

    # Odometer
    odometer_reading: Mapped[Optional[float]] = mapped_column(Float)
    odometer_status: Mapped[str]      = mapped_column(String(20), default="BLANK", nullable=False)
    # VALID / ZERO / BLANK / NEGATIVE / CONFLICT
    odometer_source: Mapped[Optional[str]] = mapped_column(String(512))

    # Billing — always from Invoice
    labour_amount: Mapped[float]      = mapped_column(Float, default=0.0, nullable=False)
    spares_amount: Mapped[float]      = mapped_column(Float, default=0.0, nullable=False)
    total_bill: Mapped[float]         = mapped_column(Float, default=0.0, nullable=False)
    total_bill_source: Mapped[Optional[str]] = mapped_column(String(200))

    # Service Details — SH primary, Invoice fallback
    complaint_description: Mapped[Optional[str]] = mapped_column(Text)
    service_advisor: Mapped[Optional[str]]  = mapped_column(String(200))
    service_advisor_source: Mapped[Optional[str]] = mapped_column(String(100))
    # 'service_history' / 'invoice_fallback'

    # JC Filter — MUST be True to appear in vehicle history screen
    jc_filter_passed: Mapped[bool]    = mapped_column(Boolean, default=False, nullable=False)

    # Quality & Lineage
    validation_status: Mapped[str]    = mapped_column(String(20), default="VALID", nullable=False)
    confidence_score: Mapped[float]   = mapped_column(Float, default=0.0, nullable=False)
    merge_rule: Mapped[Optional[str]] = mapped_column(String(200))
    source_file: Mapped[str]          = mapped_column(String(512), nullable=False)
    source_row: Mapped[int]           = mapped_column(Integer, nullable=False)
    merge_timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    vehicle: Mapped["DimVehicle"]           = relationship(back_populates="service_events")
    customer: Mapped[Optional["DimCustomer"]] = relationship(back_populates="service_events")
    service_type: Mapped[Optional["DimServiceType"]] = relationship(back_populates="service_events")
    technicians: Mapped[List["FactServiceTechnician"]] = relationship(back_populates="service_event")

    __table_args__ = (
        Index("idx_event_vrn",        "vrn"),
        Index("idx_event_date",       "service_date"),
        Index("idx_event_jcno",       "job_card_no"),
        Index("idx_event_jc_passed",  "jc_filter_passed"),
        Index("idx_event_vrn_date",   "vrn", "service_date"),
    )


class FactServiceTechnician(Base):
    """
    Normalized technician assignments.
    One row per technician per job card — not flattened.
    Enables full technician productivity analysis.
    """
    __tablename__ = "fact_service_technician"

    tech_assignment_id: Mapped[int]   = mapped_column(Integer, primary_key=True, autoincrement=True)
    service_event_id: Mapped[int]     = mapped_column(Integer, ForeignKey("fact_service_event.service_event_id"), nullable=False)
    employee_id: Mapped[int]          = mapped_column(Integer, ForeignKey("dim_employee.employee_id"), nullable=False)
    role: Mapped[str]                 = mapped_column(String(50), nullable=False)
    # MECHANIC / TECHNICIAN / ELECTRICIAN / PAINTER / HELPER
    slot: Mapped[str]                 = mapped_column(String(20), nullable=False)
    # PRIMARY / SECONDARY / ADDITIONAL
    source_column: Mapped[str]        = mapped_column(String(50), nullable=False)
    # Original CSV column: MECH / TEC / ELE / TEC.1 / ELE.1 / etc.
    source_file: Mapped[str]          = mapped_column(String(512), nullable=False)
    source_row: Mapped[int]           = mapped_column(Integer, nullable=False)

    service_event: Mapped["FactServiceEvent"] = relationship(back_populates="technicians")
    employee: Mapped["DimEmployee"]           = relationship(back_populates="tech_assignments")

    __table_args__ = (
        Index("idx_tech_event",   "service_event_id"),
        Index("idx_tech_emp",     "employee_id"),
        Index("idx_tech_role",    "role"),
    )


# ─────────────────────────────────────────────────────────────────
# AUDIT / LINEAGE TABLE  (Cross-cutting)
# ─────────────────────────────────────────────────────────────────

class AuditLineage(Base):
    """
    Per-field data lineage. Every value in every master table is
    traceable to its exact source file, row, and column.
    Required for Warranty and AI modules.
    """
    __tablename__ = "audit_lineage"

    lineage_id: Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    target_table: Mapped[str]         = mapped_column(String(100), nullable=False)
    target_pk: Mapped[str]            = mapped_column(String(200), nullable=False)
    field_name: Mapped[str]           = mapped_column(String(100), nullable=False)
    value_used: Mapped[Optional[str]] = mapped_column(Text)
    source_file: Mapped[str]          = mapped_column(String(512), nullable=False)
    source_header: Mapped[str]        = mapped_column(String(200), nullable=False)
    source_row: Mapped[int]           = mapped_column(Integer, nullable=False)
    merge_rule: Mapped[str]           = mapped_column(String(200), nullable=False)
    confidence_score: Mapped[float]   = mapped_column(Float, default=0.0, nullable=False)
    validation_status: Mapped[str]    = mapped_column(String(20), default="VALID", nullable=False)
    created_at: Mapped[datetime]      = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("idx_lineage_target", "target_table", "target_pk"),
        Index("idx_lineage_source", "source_file",  "source_row"),
    )


# ─────────────────────────────────────────────────────────────────
# REPORT STAGING TABLES  (Exception / Audit outputs)
# ─────────────────────────────────────────────────────────────────

class RptDuplicate(Base):
    """Records that lost to a higher-confidence winner. Never deleted."""
    __tablename__ = "rpt_duplicate"

    dup_id: Mapped[int]               = mapped_column(Integer, primary_key=True, autoincrement=True)
    dataset_type: Mapped[str]         = mapped_column(String(50), nullable=False)
    vrn: Mapped[Optional[str]]        = mapped_column(String(20))
    job_card_no: Mapped[Optional[str]]= mapped_column(String(100))
    invoice_no: Mapped[Optional[str]] = mapped_column(String(100))
    source_file: Mapped[Optional[str]]= mapped_column(String(512))
    source_row: Mapped[Optional[int]] = mapped_column(Integer)
    confidence_score: Mapped[Optional[float]] = mapped_column(Float)
    unselected_reason: Mapped[Optional[str]]  = mapped_column(Text)
    created_at: Mapped[datetime]      = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class RptConflict(Base):
    """
    Fields where 2+ valid conflicting values were found.
    Human review required. ETL never auto-resolves these.
    """
    __tablename__ = "rpt_conflict"

    conflict_id: Mapped[int]          = mapped_column(Integer, primary_key=True, autoincrement=True)
    conflict_type: Mapped[str]        = mapped_column(String(50), nullable=False)
    vrn: Mapped[str]                  = mapped_column(String(20), nullable=False)
    service_date: Mapped[Optional[str]] = mapped_column(String(10))
    field_name: Mapped[str]           = mapped_column(String(100), nullable=False)
    value_a: Mapped[Optional[str]]    = mapped_column(Text)
    value_b: Mapped[Optional[str]]    = mapped_column(Text)
    source_file_a: Mapped[Optional[str]] = mapped_column(String(512))
    source_row_a: Mapped[Optional[int]]  = mapped_column(Integer)
    source_file_b: Mapped[Optional[str]] = mapped_column(String(512))
    source_row_b: Mapped[Optional[int]]  = mapped_column(Integer)
    resolution: Mapped[str]           = mapped_column(String(50), default="UNRESOLVED", nullable=False)
    created_at: Mapped[datetime]      = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class RptValidation(Base):
    """All validation rule failures with severity level."""
    __tablename__ = "rpt_validation"

    validation_id: Mapped[int]        = mapped_column(Integer, primary_key=True, autoincrement=True)
    rule_id: Mapped[str]              = mapped_column(String(10), nullable=False)   # V001..V018
    severity: Mapped[str]             = mapped_column(String(20), nullable=False)   # CRITICAL/WARNING/INFO
    vrn: Mapped[Optional[str]]        = mapped_column(String(20))
    job_card_no: Mapped[Optional[str]]= mapped_column(String(100))
    field_name: Mapped[Optional[str]] = mapped_column(String(100))
    raw_value: Mapped[Optional[str]]  = mapped_column(Text)
    description: Mapped[str]         = mapped_column(Text, nullable=False)
    source_file: Mapped[Optional[str]]= mapped_column(String(512))
    source_row: Mapped[Optional[int]] = mapped_column(Integer)
    created_at: Mapped[datetime]      = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class RptRejected(Base):
    """Records that failed the JC- filter or other hard rejection rules. Full raw data preserved."""
    __tablename__ = "rpt_rejected"

    rejected_id: Mapped[int]          = mapped_column(Integer, primary_key=True, autoincrement=True)
    reason: Mapped[str]               = mapped_column(String(100), nullable=False)
    job_card_no: Mapped[Optional[str]]= mapped_column(String(100))
    vrn: Mapped[Optional[str]]        = mapped_column(String(20))
    source_file: Mapped[str]          = mapped_column(String(512), nullable=False)
    source_row: Mapped[int]           = mapped_column(Integer, nullable=False)
    raw_data_json: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime]      = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class RptMergeLog(Base):
    """Step-by-step ETL execution log. Written throughout the pipeline."""
    __tablename__ = "rpt_merge_log"

    log_id: Mapped[int]               = mapped_column(Integer, primary_key=True, autoincrement=True)
    phase: Mapped[str]                = mapped_column(String(50), nullable=False)
    action: Mapped[str]               = mapped_column(String(200), nullable=False)
    details: Mapped[Optional[str]]    = mapped_column(Text)
    record_count: Mapped[Optional[int]] = mapped_column(Integer)
    created_at: Mapped[datetime]      = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


# ─────────────────────────────────────────────────────────────────
# VALIDATION RUN TABLE  (Audit — one row per ETL validation execution)
# ─────────────────────────────────────────────────────────────────

class TblValidationRun(Base):
    """
    Stores complete metadata for each validation run.
    Every report, DB record, and log entry references this run_id.
    """
    __tablename__ = "tbl_validation_run"

    id: Mapped[int]                   = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str]               = mapped_column(String(50), nullable=False, unique=True)
    dwip_version: Mapped[str]         = mapped_column(String(20), nullable=False)
    etl_version: Mapped[str]          = mapped_column(String(20), nullable=False)
    schema_version: Mapped[str]       = mapped_column(String(20), nullable=False)
    config_version: Mapped[str]       = mapped_column(String(20), nullable=False)
    git_commit_hash: Mapped[Optional[str]] = mapped_column(String(50))
    validation_date: Mapped[str]      = mapped_column(String(30), nullable=False)
    start_time: Mapped[str]           = mapped_column(String(30), nullable=False)
    end_time: Mapped[Optional[str]]   = mapped_column(String(30))
    duration_seconds: Mapped[Optional[float]] = mapped_column(Float)
    db_path: Mapped[str]              = mapped_column(String(512), nullable=False)
    report_dir: Mapped[str]           = mapped_column(String(512), nullable=False)
    files_processed: Mapped[int]      = mapped_column(Integer, default=0)
    rows_processed: Mapped[int]       = mapped_column(Integer, default=0)

    # Overall quality
    data_quality_score: Mapped[float] = mapped_column(Float, default=0.0)
    average_confidence: Mapped[float] = mapped_column(Float, default=0.0)
    golden_dataset_status: Mapped[str]= mapped_column(String(20), default="NOT_AVAILABLE")
    validation_status: Mapped[str]    = mapped_column(String(20), default="PENDING")

    # Quality dimensions (0–100)
    completeness_score: Mapped[float] = mapped_column(Float, default=0.0)
    consistency_score: Mapped[float]  = mapped_column(Float, default=0.0)
    validity_score: Mapped[float]     = mapped_column(Float, default=0.0)
    accuracy_score: Mapped[float]     = mapped_column(Float, default=0.0)
    uniqueness_score: Mapped[float]   = mapped_column(Float, default=0.0)
    timeliness_score: Mapped[float]   = mapped_column(Float, default=0.0)

    # Business health (0–100)
    vehicle_master_completeness: Mapped[float] = mapped_column(Float, default=0.0)
    customer_completeness: Mapped[float]       = mapped_column(Float, default=0.0)
    invoice_coverage: Mapped[float]            = mapped_column(Float, default=0.0)
    warranty_coverage: Mapped[float]           = mapped_column(Float, default=0.0)
    advisor_coverage: Mapped[float]            = mapped_column(Float, default=0.0)
    technician_coverage: Mapped[float]         = mapped_column(Float, default=0.0)
    service_classification_coverage: Mapped[float] = mapped_column(Float, default=0.0)

    # Performance
    peak_ram_mb: Mapped[Optional[float]]     = mapped_column(Float)
    peak_cpu_percent: Mapped[Optional[float]]= mapped_column(Float)
    step_timings_json: Mapped[Optional[str]] = mapped_column(Text)

    # Summary
    top_issues_json: Mapped[Optional[str]]   = mapped_column(Text)
    created_at: Mapped[datetime]             = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


# ─────────────────────────────────────────────────────────────────
# FUTURE EXPANSION TABLES  (Stubbed — schema ready, populated later)
# ─────────────────────────────────────────────────────────────────

class FactWarrantyClaim(Base):
    """Warranty claims — links to vehicle and originating job card."""
    __tablename__ = "fact_warranty_claim"

    claim_id: Mapped[int]             = mapped_column(Integer, primary_key=True, autoincrement=True)
    vrn: Mapped[str]                  = mapped_column(String(20), ForeignKey("dim_vehicle.vrn"), nullable=False)
    service_event_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("fact_service_event.service_event_id"))
    warranty_type: Mapped[Optional[str]]    = mapped_column(String(100))
    claim_date: Mapped[Optional[str]]       = mapped_column(String(10))
    claim_status: Mapped[Optional[str]]     = mapped_column(String(50))
    claim_amount: Mapped[Optional[float]]   = mapped_column(Float)
    created_at: Mapped[datetime]      = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class FactBreakdownEvent(Base):
    """Breakdown events — linked to service job card."""
    __tablename__ = "fact_breakdown_event"

    breakdown_id: Mapped[int]         = mapped_column(Integer, primary_key=True, autoincrement=True)
    vrn: Mapped[str]                  = mapped_column(String(20), ForeignKey("dim_vehicle.vrn"), nullable=False)
    service_event_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("fact_service_event.service_event_id"))
    breakdown_date: Mapped[Optional[str]]   = mapped_column(String(10))
    breakdown_location: Mapped[Optional[str]] = mapped_column(Text)
    cause_code: Mapped[Optional[str]]       = mapped_column(String(100))
    created_at: Mapped[datetime]      = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class DimBay(Base):
    """Workshop bay dimension for bay monitoring module."""
    __tablename__ = "dim_bay"

    bay_id: Mapped[int]               = mapped_column(Integer, primary_key=True, autoincrement=True)
    bay_name: Mapped[str]             = mapped_column(String(100), nullable=False)
    bay_type: Mapped[Optional[str]]   = mapped_column(String(50))
    is_active: Mapped[bool]           = mapped_column(Boolean, default=True, nullable=False)


class FactTechnicianAttendance(Base):
    """Daily attendance for technician productivity module."""
    __tablename__ = "fact_technician_attendance"

    attendance_id: Mapped[int]        = mapped_column(Integer, primary_key=True, autoincrement=True)
    employee_id: Mapped[int]          = mapped_column(Integer, ForeignKey("dim_employee.employee_id"), nullable=False)
    work_date: Mapped[str]            = mapped_column(String(10), nullable=False)
    time_in: Mapped[Optional[str]]    = mapped_column(String(8))
    time_out: Mapped[Optional[str]]   = mapped_column(String(8))
    hours_worked: Mapped[Optional[float]] = mapped_column(Float)
    created_at: Mapped[datetime]      = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
