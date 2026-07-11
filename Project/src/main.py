import os
import sys
import logging
import argparse
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any

# Add Project directory to sys.path for local module imports
sys.path.append(str(Path(__file__).resolve().parent.parent))

from src.loader import DataLoader
from src.normalizer import normalize_vrn, normalize_date, normalize_string, clean_amount
from src.validator import DataValidator
from src.resolver import DataResolver
from src.merger import DataMerger
from src.exporter import DataExporter
from src.report_generator import ReportGenerator

# Global log collector for Merge_Log.xlsx
orchestration_logs: List[Dict[str, Any]] = []

def log_action(phase: str, action: str, details: str, logger_func=logging.info):
    """
    Logs an action to the standard logger and records it for Merge_Log.xlsx.
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    logger_func(f"[{phase}] {action} - {details}")
    orchestration_logs.append({
        "timestamp": timestamp,
        "phase": phase,
        "action": action,
        "details": details
    })

def setup_logging(logs_dir: Path):
    """
    Sets up logger to print to console and save to logs/Processing.log.
    """
    logs_dir.mkdir(parents=True, exist_ok=True)
    log_file = logs_dir / "Processing.log"
    
    logger = logging.getLogger("ETLEngine")
    logger.setLevel(logging.DEBUG)
    
    # File Handler
    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setLevel(logging.DEBUG)
    file_format = logging.Formatter('%(asctime)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s')
    file_handler.setFormatter(file_format)
    logger.addHandler(file_handler)
    
    # Console Handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_format = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s', datefmt='%H:%M:%S')
    console_handler.setFormatter(console_format)
    logger.addHandler(console_handler)

def run_etl(project_dir: Path, interactive: bool = True):
    # Setup directories
    input_dir = project_dir / "input"
    output_dir = project_dir / "output"
    logs_dir = project_dir / "logs"
    reports_dir = project_dir / "reports"
    config_dir = project_dir / "config"
    
    for d in [input_dir, output_dir, logs_dir, reports_dir, config_dir]:
        d.mkdir(parents=True, exist_ok=True)
        
    setup_logging(logs_dir)
    logger = logging.getLogger("ETLEngine")
    
    log_action("STARTUP", "Initializing ETL Engine", f"Workspace directory: {project_dir}")
    
    # Check rules.json
    rules_file = config_dir / "rules.json"
    if not rules_file.exists():
        err_msg = f"Configuration rules file missing at {rules_file}. Cannot boot engine."
        logger.error(err_msg)
        sys.exit(1)
        
    try:
        # 1. Initialize modules
        loader = DataLoader(config_dir, input_dir)
        
        # Load validation parameters from rules.json
        import json
        with open(rules_file, "r") as f:
            rules = json.load(f)
            
        allowed_sr_types = rules.get("validation", {}).get("allowed_sr_types", [])
        impossible_jump = rules.get("validation", {}).get("impossible_odometer_jump_km_per_day", 1000)
        source_priorities = rules.get("source_priority", {})
        
        validator = DataValidator(allowed_sr_types, impossible_jump)
        resolver = DataResolver(source_priorities)
        merger = DataMerger(source_priorities)
        exporter = DataExporter(output_dir)
        report_gen = ReportGenerator(reports_dir)
        
        # 2. Scan and load input CSV files
        input_files = loader.scan_input_files()
        if not input_files:
            log_action("LOAD", "No files found", "No CSV files found in input/ directory. Exiting.", logger.warning)
            report_gen.generate_merge_log(orchestration_logs)
            return
            
        file_mappings: Dict[str, Dict[str, Optional[str]]] = {}
        dataframes: Dict[str, pd.DataFrame] = {}
        
        for fp in input_files:
            df, headers = loader.load_csv(fp)
            mapping = loader.match_headers(fp.name, headers, interactive=interactive)
            file_mappings[fp.name] = mapping
            dataframes[fp.name] = df
            log_action("LOAD", "Loaded file", f"File: {fp.name}, rows: {len(df)}, columns: {len(headers)}")

        # 3. Classify files
        classifications = merger.classify_files(file_mappings)
        
        # 4. Standardize, clean, and score records
        processed_by_type: Dict[str, List[Dict[str, Any]]] = {
            "vehicle_master": [],
            "invoice": [],
            "service_history": [],
            "customer_master": [],
            "other": []
        }
        
        for file_name, df in dataframes.items():
            file_type = classifications[file_name]
            mapping = file_mappings[file_name]
            
            log_action("CLEANSE", "Standardizing records", f"Processing '{file_name}' as type '{file_type}'")
            
            for idx, row in df.iterrows():
                row_dict = row.to_dict()
                standardized_row: Dict[str, Any] = {}
                
                # Copy mapped values and standardize
                src_fields_mapped = {}
                for orig_h, std_f in mapping.items():
                    if std_f is None:
                        continue
                    val = row_dict.get(orig_h)
                    src_fields_mapped[std_f] = orig_h
                    
                    if std_f == "vrn":
                        standardized_row["vrn"] = normalize_vrn(val)
                    elif std_f in ["invoice_date", "service_date"]:
                        standardized_row[std_f] = normalize_date(val)
                    elif std_f == "sr_type":
                        # Validate and standardize SR Type classification
                        _, std_sr = validator.validate_sr_type(val)
                        standardized_row["sr_type"] = std_sr
                    elif std_f in ["labour_amount", "spares_amount", "total_amount"]:
                        standardized_row[std_f] = clean_amount(val)
                    elif std_f == "odometer":
                        # Pass through first, validated later
                        standardized_row["odometer"] = val
                    else:
                        title_case = std_f in ["customer_name", "service_advisor"]
                        standardized_row[std_f] = normalize_string(val, title_case=title_case)
                
                # Add lineage trace fields
                standardized_row["src_file"] = file_name
                standardized_row["src_row"] = idx + 1
                standardized_row["src_field"] = src_fields_mapped
                standardized_row["merge_rule"] = "Direct Import"
                standardized_row["merge_timestamp"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                
                # Validate date and odometer before scoring
                val_status = "VALID"
                odo_val = standardized_row.get("odometer")
                if odo_val is not None:
                    odo_ok, odo_reason = validator.validate_odometer(odo_val)
                    if not odo_ok:
                        val_status = "WARNING"
                
                standardized_row["validation_status"] = val_status
                
                # Compute confidence score
                score = resolver.calculate_confidence_score(standardized_row, file_type)
                standardized_row["confidence_score"] = score
                
                processed_by_type[file_type].append(standardized_row)
                
        # 5. Handle duplicates & resolve conflicts per type
        master_records: Dict[str, List[Dict[str, Any]]] = {}
        all_duplicates: List[Dict[str, Any]] = []
        all_conflicts: List[Dict[str, Any]] = []
        
        # Define keys to determine uniqueness
        unique_keys_config = {
            "vehicle_master": ["vrn"],
            "invoice": ["invoice_no"],
            "service_history": ["job_card_no"],
            "customer_master": ["customer_name"]
        }
        
        for file_type, records in processed_by_type.items():
            if file_type == "other":
                master_records[file_type] = records
                continue
                
            unique_keys = unique_keys_config.get(file_type, ["vrn"])
            log_action("RESOLVE", f"Grouping duplicates for '{file_type}'", f"Total records: {len(records)}, Keys: {unique_keys}")
            
            resolved, dups = resolver.resolve_duplicates(records, unique_keys)
            master_records[file_type] = resolved
            all_duplicates.extend(dups)
            
            # Detect odometer conflicts
            conflicts = resolver.detect_odometer_conflicts(records)
            all_conflicts.extend(conflicts)
            
            log_action("RESOLVE", f"Duplicate results for '{file_type}'", f"Master count: {len(resolved)}, Duplicates flagged: {len(dups)}, Conflicts: {len(conflicts)}")

        # 6. Chronological Odometer Validation Checks
        log_action("VALIDATE", "Sequence Validation", "Running chronological odometer checks across all records")
        # Combine all service history and invoice entries for sequence checks
        seq_records = []
        for file_type in ["service_history", "invoice"]:
            for r in master_records.get(file_type, []):
                if r.get("vrn") and r.get("odometer") and r.get("date") or r.get("service_date"):
                    seq_records.append({
                        "vrn": r["vrn"],
                        "date": r.get("date") or r.get("service_date") or r.get("invoice_date"),
                        "odometer": r["odometer"],
                        "record": r
                    })
        anomalies = validator.check_chronological_odometer(seq_records)
        log_action("VALIDATE", "Sequence Validation Results", f"Detected {len(anomalies)} odometer sequence anomalies")

        # 7. Execute Fallback Derivations on Vehicle Master
        # We derive missing attributes on Vehicle Master using Invoice and Service History
        fallback_fields = ["model", "chassis_no", "engine_no", "customer_name", "service_date"]
        
        vm_records = master_records.get("vehicle_master", [])
        if not vm_records:
            # If no primary vehicle master was uploaded, initialize it as empty and let the fallback build it
            log_action("MERGE", "No Vehicle Master uploaded", "Will derive a synthetic Vehicle Master from Invoice and Service History", logger.warning)
            
            # Extract unique VRNs from other datasets to create a shell Vehicle Master
            unique_vrns = set()
            for t in ["invoice", "service_history", "customer_master"]:
                for r in master_records.get(t, []):
                    if r.get("vrn"):
                        unique_vrns.add(r["vrn"])
            
            for v in unique_vrns:
                vm_records.append({
                    "vrn": v,
                    "src_file": "Derived Shell",
                    "src_row": 0,
                    "confidence_score": 30.0,
                    "validation_status": "VALID",
                    "merge_rule": "Shell Creation",
                    "merge_timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                })
        
        derived_vm = merger.execute_fallback_derivation(
            primary_records=vm_records,
            lookup_records=master_records,
            fallback_fields=fallback_fields
        )
        master_records["vehicle_master"] = derived_vm

        # 8. Build the timeline History Dataset for Vehicle History screen (JC only)
        log_action("MERGE", "Building Timeline History", "Merging invoices and services into Vehicle History Timeline (Job Cards Only)")
        timeline = merger.build_vehicle_history_timeline(
            invoices=master_records.get("invoice", []),
            services=master_records.get("service_history", [])
        )

        # 9. Write outputs
        log_action("EXPORT", "Writing output files", "Saving consolidated CSV Master files")
        exporter.export_to_csv(master_records.get("vehicle_master", []), "Vehicle_Master.csv")
        exporter.export_to_csv(master_records.get("invoice", []), "Invoice_Master.csv")
        exporter.export_to_csv(master_records.get("service_history", []), "Service_History_Master.csv")
        exporter.export_to_csv(timeline, "Vehicle_History_Dataset.csv")

        # 10. Write Excel reports
        log_action("EXPORT", "Writing Excel reports", "Generating analysis sheets")
        report_gen.generate_duplicate_report(all_duplicates)
        report_gen.generate_conflict_report(all_conflicts)
        report_gen.generate_validation_report(anomalies)
        
        log_action("EXPORT", "ETL Process Successful", "All tasks complete.")
        
        # Save Orchestration log
        report_gen.generate_merge_log(orchestration_logs)
        
    except Exception as e:
        log_action("CRITICAL", "ETL Pipeline Failed", str(e), logger.error)
        raise e

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="DWIP Workforce v1.1 - ETL Merge & Validation Engine")
    parser.add_argument("--project-dir", type=str, default="Project", help="Path to Project root directory")
    parser.add_argument("--non-interactive", action="store_true", help="Run without prompt confirmations")
    
    args = parser.parse_args()
    
    proj_path = Path(args.project_dir).resolve()
    is_interactive = not args.non_interactive
    
    run_etl(proj_path, interactive=is_interactive)
