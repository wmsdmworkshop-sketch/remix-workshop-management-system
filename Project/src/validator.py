import logging
import pandas as pd
from datetime import datetime
from typing import Dict, List, Tuple, Any

logger = logging.getLogger("ETLEngine")

class DataValidator:
    def __init__(self, allowed_sr_types: List[str], impossible_jump_km_per_day: float = 1000):
        self.allowed_sr_types = allowed_sr_types
        self.impossible_jump_km_per_day = impossible_jump_km_per_day

    def validate_odometer(self, odo_val: Any) -> Tuple[bool, str]:
        """
        Validates individual odometer values for nulls, zeros, or negatives.
        Returns (is_valid, reason)
        """
        if pd.isna(odo_val) or str(odo_val).strip() == "":
            return False, "Blank Odometer"
        
        try:
            val = float(str(odo_val).replace(",", "").strip())
        except ValueError:
            return False, f"Invalid numeric format: '{odo_val}'"
        
        if val == 0:
            return False, "Odometer is Zero"
        if val < 0:
            return False, "Odometer is Negative"
            
        return True, "Valid"

    def check_chronological_odometer(
        self, 
        df_records: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Expects a list of dictionaries with keys: 'vrn', 'date', 'odometer'.
        Returns a list of warning/error dictionaries describing sequence anomalies (decreasing or impossible jumps).
        
        Note: Records must be sorted chronologically first.
        """
        anomalies = []
        # Group by VRN
        by_vehicle: Dict[str, List[Dict[str, Any]]] = {}
        for rec in df_records:
            vrn = rec.get("vrn")
            if not vrn:
                continue
            by_vehicle.setdefault(vrn, []).append(rec)
            
        for vrn, records in by_vehicle.items():
            # Parse dates and filter out records with invalid dates or odometers
            valid_seq = []
            for r in records:
                date_str = r.get("date")
                odo_val = r.get("odometer")
                
                # Check individual odometer validity
                odo_ok, _ = self.validate_odometer(odo_val)
                if not odo_ok:
                    continue
                    
                # Parse date
                try:
                    dt = datetime.strptime(date_str, "%d-%m-%Y")
                except (ValueError, TypeError):
                    continue
                    
                valid_seq.append({
                    "date": dt,
                    "date_str": date_str,
                    "odometer": float(str(odo_val).replace(",", "").strip()),
                    "original_record": r
                })
                
            # Sort by date
            valid_seq.sort(key=lambda x: x["date"])
            
            # Check sequential jumps
            for i in range(1, len(valid_seq)):
                prev = valid_seq[i-1]
                curr = valid_seq[i]
                
                days_diff = (curr["date"] - prev["date"]).days
                odo_diff = curr["odometer"] - prev["odometer"]
                
                if odo_diff < 0:
                    anomalies.append({
                        "vrn": vrn,
                        "type": "Decreasing Odometer",
                        "severity": "CRITICAL",
                        "prev_date": prev["date_str"],
                        "prev_odo": prev["odometer"],
                        "curr_date": curr["date_str"],
                        "curr_odo": curr["odometer"],
                        "description": f"Odometer decreased from {prev['odometer']} (on {prev['date_str']}) to {curr['odometer']} (on {curr['date_str']})"
                    })
                elif days_diff > 0:
                    km_per_day = odo_diff / days_diff
                    if km_per_day > self.impossible_jump_km_per_day:
                        anomalies.append({
                            "vrn": vrn,
                            "type": "Impossible Odometer Jump",
                            "severity": "WARNING",
                            "prev_date": prev["date_str"],
                            "prev_odo": prev["odometer"],
                            "curr_date": curr["date_str"],
                            "curr_odo": curr["odometer"],
                            "description": f"Odometer jump of {odo_diff} km in {days_diff} days ({km_per_day:.1f} km/day, exceeds limit of {self.impossible_jump_km_per_day} km/day)"
                        })
                        
        return anomalies

    def validate_sr_type(self, sr_type: Any) -> Tuple[bool, str]:
        """
        Validates the service classification against allowed SR Types.
        Returns (is_valid, standardized_sr_type)
        """
        if pd.isna(sr_type) or not str(sr_type).strip():
            return False, "Unknown"
            
        cleaned = str(sr_type).strip().title()
        
        # Exact match or substring match mapping
        for allowed in self.allowed_sr_types:
            if cleaned.lower() == allowed.lower() or allowed.lower() in cleaned.lower():
                return True, allowed
                
        return False, cleaned
