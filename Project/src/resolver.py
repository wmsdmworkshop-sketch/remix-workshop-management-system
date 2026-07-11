import logging
import pandas as pd
from typing import Dict, List, Tuple, Any

logger = logging.getLogger("ETLEngine")

class DataResolver:
    def __init__(self, source_priorities: Dict[str, List[str]]):
        self.source_priorities = source_priorities

    def calculate_confidence_score(self, row: Dict[str, Any], file_type: str) -> float:
        """
        Calculates a confidence score between 0 and 100 based on source file priority,
        field completeness, and validation flags.
        """
        # 1. Base Score by File Type / Priority
        base_scores = {
            "vehicle_master": 90.0,
            "invoice": 80.0,
            "service_history": 70.0,
            "customer_master": 60.0,
            "other": 50.0
        }
        score = base_scores.get(file_type, 50.0)

        # 2. Completeness Modifier
        non_null_fields = sum(1 for k, v in row.items() if v is not None and str(v).strip() != "" and not k.startswith("src_") and k != "confidence_score")
        score += non_null_fields * 2.0

        # 3. Validation Modifiers (Odometer, Date, VRN presence)
        if row.get("vrn"):
            score += 5.0
        else:
            score -= 20.0

        odo = row.get("odometer")
        if odo is not None:
            try:
                odo_val = float(str(odo).replace(",", "").strip())
                if odo_val > 0:
                    score += 5.0
                elif odo_val == 0:
                    score -= 5.0
                else:
                    score -= 10.0
            except ValueError:
                score -= 10.0
        else:
            score -= 10.0

        # Date validations
        if row.get("date"):
            score += 5.0
        else:
            score -= 15.0

        # Cap the score between 0 and 100
        return max(0.0, min(100.0, score))

    def resolve_duplicates(
        self, 
        records: List[Dict[str, Any]], 
        unique_keys: List[str]
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Groups records by unique keys (e.g., job_card_no or invoice_no).
        Retains the one with the highest confidence score.
        Moves unselected duplicates to the duplicate report list.
        """
        resolved_records = []
        duplicate_records = []

        # Group by unique keys
        groups: Dict[tuple, List[Dict[str, Any]]] = {}
        for rec in records:
            key_values = tuple(rec.get(key) for key in unique_keys)
            # Skip grouping if key is completely missing
            if all(v is None for v in key_values):
                resolved_records.append(rec)
                continue
            groups.setdefault(key_values, []).append(rec)

        for key, group_recs in groups.items():
            if len(group_recs) == 1:
                resolved_records.append(group_recs[0])
            else:
                # Sort group by confidence score descending
                group_recs.sort(key=lambda x: x.get("confidence_score", 0.0), reverse=True)
                winner = group_recs[0]
                resolved_records.append(winner)
                
                # The remaining rows are duplicates
                for dup in group_recs[1:]:
                    dup["unselected_reason"] = f"Duplicate of primary record with higher confidence ({winner.get('confidence_score'):.1f} vs {dup.get('confidence_score'):.1f})"
                    duplicate_records.append(dup)

        return resolved_records, duplicate_records

    def detect_odometer_conflicts(
        self, 
        records: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Identifies odometer conflicts: different valid non-zero odometers for the same vehicle on the same date.
        Returns a list of conflict details to be exported.
        """
        conflicts = []
        
        # Group by (vrn, date)
        groups: Dict[Tuple[str, str], List[Dict[str, Any]]] = {}
        for rec in records:
            vrn = rec.get("vrn")
            date_str = rec.get("date")
            odo = rec.get("odometer")
            
            # Skip if missing VRN, Date, or Odometer
            if not vrn or not date_str or odo is None:
                continue
                
            try:
                odo_val = float(str(odo).replace(",", "").strip())
                if odo_val <= 0:
                    continue  # Only interest in valid non-zero
            except ValueError:
                continue
                
            groups.setdefault((vrn, date_str), []).append(rec)

        for (vrn, date_str), group_recs in groups.items():
            odos = set()
            for r in group_recs:
                try:
                    odos.add(float(str(r["odometer"]).replace(",", "").strip()))
                except ValueError:
                    pass
            
            # Conflict if multiple different non-zero odometer values exist
            if len(odos) > 1:
                logger.warning(f"Odometer conflict detected for vehicle {vrn} on date {date_str}: values {odos}")
                for r in group_recs:
                    conflicts.append({
                        "vrn": vrn,
                        "date": date_str,
                        "odometer": r.get("odometer"),
                        "source_file": r.get("src_file"),
                        "source_row": r.get("src_row"),
                        "confidence_score": r.get("confidence_score"),
                        "other_values_found": list(odos)
                    })

        return conflicts
