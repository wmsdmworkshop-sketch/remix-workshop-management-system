import re
import logging
from datetime import datetime
import pandas as pd
from typing import Optional, Any

logger = logging.getLogger("ETLEngine")

def normalize_vrn(vrn: Any) -> Optional[str]:
    """
    Normalizes Vehicle Registration Number to uppercase alphanumeric characters.
    Example: 'KA-32-AB-1234' -> 'KA32AB1234'
    """
    if pd.isna(vrn) or not str(vrn).strip():
        return None
    cleaned = re.sub(r'[^a-zA-Z0-9]', '', str(vrn))
    return cleaned.upper()

def normalize_date(date_val: Any) -> Optional[str]:
    """
    Standardizes dates from formats like:
    - DD/MM/YYYY
    - DD-MM-YYYY
    - YYYY-MM-DD
    - DD MMM YYYY
    To output format: DD-MM-YYYY
    """
    if pd.isna(date_val) or not str(date_val).strip():
        return None

    date_str = str(date_val).strip()

    # Define potential formats
    formats = [
        "%Y-%m-%d",      # 2026-06-13
        "%d/%m/%Y",      # 13/06/2026
        "%d-%m-%Y",      # 13-06-2026
        "%Y/%m/%d",      # 2026/06/13
        "%d %b %Y",      # 13 Jun 2026
        "%d-%b-%Y",      # 13-Jun-2026
        "%d %B %Y",      # 13 June 2026
        "%d-%B-%Y",      # 13-June-2026
        "%Y-%m-%d %H:%M:%S", # 2026-06-13 00:00:00
        "%d/%m/%Y %H:%M"     # 13/06/2026 14:30
    ]

    for fmt in formats:
        try:
            parsed_dt = datetime.strptime(date_str, fmt)
            return parsed_dt.strftime("%d-%m-%Y")
        except ValueError:
            continue

    # Fallback to pandas parsing for mixed or exotic formats
    try:
        parsed_dt = pd.to_datetime(date_str, errors='coerce')
        if not pd.isna(parsed_dt):
            return parsed_dt.strftime("%d-%m-%Y")
    except Exception as e:
        logger.debug(f"Pandas date parsing fallback failed for '{date_str}': {e}")

    logger.warning(f"Failed to normalize date: '{date_val}' - retaining original string representation or None")
    return date_str

def normalize_string(val: Any, title_case: bool = False) -> Optional[str]:
    """
    Cleans strings by stripping spaces and optionally title-casing.
    Returns None for empty/null values.
    """
    if pd.isna(val) or not str(val).strip():
        return None
    
    cleaned = str(val).strip()
    if title_case:
        # Avoid title-casing acronyms/IDs like JC-1234
        if not re.search(r'\d', cleaned) and '-' not in cleaned:
            cleaned = cleaned.title()
    return cleaned

def clean_amount(val: Any) -> float:
    """
    Sanitizes monetary values. Removes currency symbols, commas, and parses as float.
    Returns 0.0 if invalid.
    """
    if pd.isna(val) or not str(val).strip():
        return 0.0
    
    val_str = str(val).strip()
    # Strip everything except digits, minus sign, and decimal point
    cleaned = re.sub(r'[^\d.-]', '', val_str)
    try:
        return float(cleaned)
    except ValueError:
        logger.warning(f"Could not parse monetary value: '{val}' -> using 0.0")
        return 0.0
