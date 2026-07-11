import logging
from pathlib import Path
import pandas as pd
from typing import List, Dict, Any

logger = logging.getLogger("ETLEngine")

class DataExporter:
    def __init__(self, output_dir: Path):
        self.output_dir = output_dir

    def export_to_csv(self, records: List[Dict[str, Any]], filename: str) -> Path:
        """
        Exports a list of records (dictionaries) to a CSV file.
        """
        file_path = self.output_dir / filename
        
        if not records:
            # If records is empty, write an empty CSV or a CSV with basic headers
            df = pd.DataFrame()
            df.to_csv(file_path, index=False)
            logger.warning(f"No records to export. Created empty file at '{file_path.name}'.")
            return file_path
            
        df = pd.DataFrame(records)
        
        # Ensure output directory exists
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Save to CSV
        df.to_csv(file_path, index=False, encoding="utf-8")
        logger.info(f"Successfully exported {len(df)} records to '{file_path.name}'.")
        return file_path
