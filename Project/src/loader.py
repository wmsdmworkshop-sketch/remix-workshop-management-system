import os
import sys
import json
import logging
import difflib
import pandas as pd
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any

logger = logging.getLogger("ETLEngine")

class DataLoader:
    def __init__(self, config_dir: Path, input_dir: Path):
        self.config_dir = config_dir
        self.input_dir = input_dir
        self.rules_file = config_dir / "rules.json"
        self.mapping_rules_file = config_dir / "mapping_rules.json"
        
        # Load synonym definitions
        with open(self.rules_file, "r") as f:
            rules = json.load(f)
            self.synonyms: Dict[str, List[str]] = rules.get("synonyms", {})
            
        # Load user-confirmed mappings
        if self.mapping_rules_file.exists():
            with open(self.mapping_rules_file, "r") as f:
                try:
                    self.confirmed_mappings = json.load(f)
                except json.JSONDecodeError:
                    self.confirmed_mappings = {}
        else:
            self.confirmed_mappings = {}

    def scan_input_files(self) -> List[Path]:
        """
        Scans input directory for CSV files.
        """
        csv_files = list(self.input_dir.glob("*.csv"))
        logger.info(f"Scanned input directory. Found {len(csv_files)} CSV files.")
        return csv_files

    def load_csv(self, file_path: Path) -> Tuple[pd.DataFrame, List[str]]:
        """
        Loads CSV into a pandas DataFrame.
        """
        try:
            # First try UTF-8, fallback to latin-1
            try:
                df = pd.read_csv(file_path, encoding="utf-8")
            except UnicodeDecodeError:
                df = pd.read_csv(file_path, encoding="latin-1")
            
            headers = [h.strip() for h in df.columns]
            # Replace columns with cleaned header strings
            df.columns = headers
            return df, headers
        except Exception as e:
            logger.error(f"Failed to read CSV '{file_path.name}': {e}")
            raise e

    def match_headers(self, file_name: str, headers: List[str], interactive: bool = True) -> Dict[str, Optional[str]]:
        """
        Auto-matches headers of a file to standard fields.
        Returns a dictionary mapping: original_header -> standard_field_name (or None)
        """
        mapping: Dict[str, Optional[str]] = {}
        file_confirmed = self.confirmed_mappings.get(file_name, {})
        
        logger.info(f"Matching headers for file: {file_name}")
        
        for header in headers:
            normalized_header = header.lower().replace("_", " ").replace("-", " ").strip()
            
            # Check previously confirmed mappings first
            if header in file_confirmed:
                mapping[header] = file_confirmed[header]
                continue
                
            # Check exact synonyms matches
            found = False
            for std_field, synonym_list in self.synonyms.items():
                if normalized_header in [syn.lower().strip() for syn in synonym_list]:
                    mapping[header] = std_field
                    found = True
                    break
                    
            if found:
                continue

            # Fuzzy Match fallback
            best_match: Optional[str] = None
            highest_ratio = 0.0
            
            for std_field, synonym_list in self.synonyms.items():
                for syn in synonym_list:
                    ratio = difflib.SequenceMatcher(None, normalized_header, syn.lower()).ratio()
                    if ratio > highest_ratio:
                        highest_ratio = ratio
                        best_match = std_field
                        
            # If match confidence is high, assign it tentatively
            if highest_ratio >= 0.8:
                mapping[header] = best_match
            else:
                mapping[header] = None

        # Interactive resolution if ambiguous or missing mappings
        needs_prompt = any(h not in file_confirmed and mapping[h] is None for h in headers)
        
        if needs_prompt:
            logger.warning(f"Ambiguous or missing mappings detected in file: {file_name}")
            
            if not interactive or not sys.stdin.isatty():
                # Headless run: We must stop and fail if mappings are missing and not in config
                unmapped = [h for h in headers if h not in file_confirmed and mapping[h] is None]
                err_msg = f"Non-interactive run: Ambiguous headers in '{file_name}': {unmapped}. Cannot continue without confirmation."
                logger.error(err_msg)
                raise ValueError(err_msg)
                
            # Display mapping table and ask for confirmation
            print("\n" + "="*80)
            print(f" HEADER MAPPING CONFIRMATION: {file_name}")
            print("="*80)
            print(f"{'CSV Header Name'.ljust(35)} -> {'Auto-Matched Standard Field'.ljust(30)}")
            print("-"*80)
            for h in headers:
                mapped_val = mapping[h] or "IGNORE / SKIP"
                print(f"{h.ljust(35)} -> {mapped_val.ljust(30)}")
            print("="*80)
            
            confirm = input("Are these auto-detected header mappings correct? (y/n): ").strip().lower()
            if confirm == 'y':
                # Save confirmed mappings
                self._save_confirmed(file_name, mapping)
            else:
                # Let user manually map the headers
                print("\nPlease map the columns manually. Enter standard field name or press Enter to IGNORE.")
                print(f"Valid Standard Fields: {list(self.synonyms.keys())}")
                print("-"*80)
                
                new_mapping = {}
                for h in headers:
                    default_map = mapping[h] or ""
                    prompt = f"Map '{h}' [{default_map}]: "
                    user_val = input(prompt).strip()
                    
                    if not user_val:
                        new_mapping[h] = default_map if default_map else None
                    elif user_val.lower() == 'ignore':
                        new_mapping[h] = None
                    elif user_val in self.synonyms:
                        new_mapping[h] = user_val
                    else:
                        print(f"Warning: '{user_val}' is not a standard field. Ignored/skipped.")
                        new_mapping[h] = None
                        
                mapping = new_mapping
                self._save_confirmed(file_name, mapping)
        else:
            # If everything auto-matched cleanly without prompting, save it as confirmed
            self._save_confirmed(file_name, mapping)

        return mapping

    def _save_confirmed(self, file_name: str, mapping: Dict[str, Optional[str]]):
        """
        Saves mapping configuration to mapping_rules.json
        """
        self.confirmed_mappings[file_name] = mapping
        with open(self.mapping_rules_file, "w") as f:
            json.dump(self.confirmed_mappings, f, indent=2)
        logger.info(f"Saved confirmed header mappings for: {file_name}")
