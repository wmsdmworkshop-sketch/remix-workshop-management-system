import logging
from datetime import datetime
import pandas as pd
from typing import Dict, List, Optional, Tuple, Any

logger = logging.getLogger("ETLEngine")

class DataMerger:
    def __init__(self, source_priority: Dict[str, List[str]]):
        self.source_priority = source_priority

    def classify_files(self, file_mappings: Dict[str, Dict[str, Optional[str]]]) -> Dict[str, str]:
        """
        Classifies each file path/name into a standard dataset type:
        vehicle_master, invoice, service_history, customer_master, or other.
        """
        classifications = {}
        for file_name, mappings in file_mappings.items():
            mapped_fields = {v for v in mappings.values() if v is not None}
            
            # Classification rules based on column signatures
            if "invoice_no" in mapped_fields or "total_amount" in mapped_fields or "labour_amount" in mapped_fields:
                classifications[file_name] = "invoice"
            elif "odometer" in mapped_fields or "sr_type" in mapped_fields or "service_date" in mapped_fields:
                classifications[file_name] = "service_history"
            elif "chassis_no" in mapped_fields and ("vrn" in mapped_fields or "registration_no" in mapped_fields):
                classifications[file_name] = "vehicle_master"
            elif "customer_name" in mapped_fields and ("phone" in mapped_fields or "address" in mapped_fields):
                classifications[file_name] = "customer_master"
            else:
                classifications[file_name] = "other"
                
            logger.info(f"Classified file '{file_name}' as type: '{classifications[file_name]}'")
            
        return classifications

    def execute_fallback_derivation(
        self, 
        primary_records: List[Dict[str, Any]], 
        lookup_records: Dict[str, List[Dict[str, Any]]], 
        fallback_fields: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Applies fallback logic: if primary_records (e.g. Vehicle Master) have missing fields,
        lookup values in lower-priority sources (Invoice, Service History) matching by VRN.
        """
        derived_count = 0
        
        # Build lookup tables indexed by VRN for other files
        lookup_by_vrn: Dict[str, Dict[str, Any]] = {}
        
        # Merge all lookup records into a unified VRN directory, ordering by source priority (reverse so highest priority overwrites last)
        priority_order = ["other", "customer_master", "service_history", "invoice"]
        
        for file_type in priority_order:
            for rec in lookup_records.get(file_type, []):
                vrn = rec.get("vrn")
                if not vrn:
                    continue
                
                # Update existing VRN profile with non-null values
                profile = lookup_by_vrn.setdefault(vrn, {})
                for field in fallback_fields:
                    val = rec.get(field)
                    if val is not None and str(val).strip() != "":
                        profile[field] = {
                            "value": val,
                            "src_file": rec.get("src_file"),
                            "src_row": rec.get("src_row"),
                            "src_field": rec.get("src_field", {}).get(field, field)
                        }

        # Apply fallback to primary records
        for rec in primary_records:
            vrn = rec.get("vrn")
            if not vrn or vrn not in lookup_by_vrn:
                continue
                
            vrn_profile = lookup_by_vrn[vrn]
            for field in fallback_fields:
                val = rec.get(field)
                if val is None or str(val).strip() == "":
                    # Value is missing in primary, apply fallback
                    fallback_data = vrn_profile.get(field)
                    if fallback_data:
                        rec[field] = fallback_data["value"]
                        rec[f"src_file_{field}"] = fallback_data["src_file"]
                        rec[f"src_row_{field}"] = fallback_data["src_row"]
                        rec[f"src_field_{field}"] = fallback_data["src_field"]
                        rec[f"merge_rule_{field}"] = "Derived Fallback"
                        derived_count += 1
                        logger.debug(f"Derived field '{field}' for VRN '{vrn}' from '{fallback_data['src_file']}' row {fallback_data['src_row']}")
                        
        logger.info(f"Fallback derivation complete. Derived {derived_count} values.")
        return primary_records

    def build_vehicle_history_timeline(
        self, 
        invoices: List[Dict[str, Any]], 
        services: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Creates the Vehicle History timeline dataset.
        Applies critical business rules:
        - Only keep records where J C NO (Order#) starts with "JC-" or "JC-DEVAUS".
        - Ignore Temporary Requests, Draft Entries, Pending Requests (handled by the J C NO prefix check).
        - Merges invoice details and service history by Job Card Number (J C NO).
        """
        timeline = []
        
        # Index services by Job Card (j_c_no)
        services_by_jc: Dict[str, List[Dict[str, Any]]] = {}
        for s in services:
            jc = s.get("job_card_no")
            if jc:
                services_by_jc.setdefault(jc, []).append(s)

        # Process invoices
        for inv in invoices:
            jc = inv.get("job_card_no")
            if not jc:
                continue
                
            # Business rule: only keep JC- or JC-DEVAUS
            if not (jc.startswith("JC-") or jc.startswith("JC-DEVAUS")):
                logger.debug(f"Ignoring timeline record: Order# '{jc}' does not start with JC- or JC-DEVAUS")
                continue

            # Find matching service details
            srv_matches = services_by_jc.get(jc, [])
            
            # Select service type, odometer, and advisor
            classification = "General Repair"
            odometer = 0
            advisor = inv.get("service_advisor")
            complaint = inv.get("complaint")
            
            if srv_matches:
                # Pick the match with highest confidence or first match
                srv_match = sorted(srv_matches, key=lambda x: x.get("confidence_score", 0.0), reverse=True)[0]
                classification = srv_match.get("sr_type") or classification
                odometer = srv_match.get("odometer") or odometer
                advisor = srv_match.get("service_advisor") or advisor
                complaint = srv_match.get("complaint") or complaint

            # Prepare timeline row
            row = {
                "vrn": inv.get("vrn"),
                "job_card_no": jc,
                "service_date": inv.get("invoice_date") or inv.get("service_date"),
                "service_classification": classification,
                "mileage_reading": odometer,
                "service_advisor": advisor,
                "job_description": complaint,
                "total_bill": inv.get("total_amount", 0.0),
                
                # Lineage & Traceability
                "source_file": inv.get("src_file"),
                "source_row": inv.get("src_row"),
                "source_field": inv.get("src_field", {}).get("job_card_no", "Order#"),
                "merge_rule": "Merged Timeline Entry",
                "confidence_score": inv.get("confidence_score", 0.0),
                "validation_status": inv.get("validation_status", "VALID"),
                "merge_timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            
            timeline.append(row)
            
        logger.info(f"Built Vehicle History timeline with {len(timeline)} valid Job Card records.")
        return timeline
