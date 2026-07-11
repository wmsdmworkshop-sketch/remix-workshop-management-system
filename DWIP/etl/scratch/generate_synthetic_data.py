"""
DWIP Workforce v1.1 — Synthetic Test Data Generator
===================================================
Creates a small synthetic dataset for automated testing and validation of the ETL pipeline.
Conforms to:
- 10 Vehicles (8 in Vehicle Master, 2 Outside Vehicles)
- 20 Job Cards (starting with JC-)
- 5 Duplicate Records
- 5 Missing Odometers
- 5 Warranty Jobs (category WARRANTY)
- 5 Running Repairs (category REPAIR)
- 12 unique VRNs total
"""

import csv
from pathlib import Path

def generate_synthetic_dataset(base_dir: Path) -> None:
    base_dir = Path(base_dir)
    
    # Create input subfolders
    (base_dir / "vehicle_master").mkdir(parents=True, exist_ok=True)
    (base_dir / "invoices").mkdir(parents=True, exist_ok=True)
    (base_dir / "service_history").mkdir(parents=True, exist_ok=True)
    (base_dir / "customers").mkdir(parents=True, exist_ok=True)

    # ─────────────────────────────────────────────────────────────────
    # 1. VEHICLE MASTER (8 vehicles, 2 will be outside vehicles)
    # ─────────────────────────────────────────────────────────────────
    vm_headers = ["VRN", "CHASSIS NO", "ENGINE NO", "MANUFACTURER", "PRODUCT LINE", "FUEL TYPE", "ORIGINAL SALE DATE", "COLOR", "NAME"]
    vm_rows = [
        ["KA32AB1001", "CHA1001", "ENG1001", "TATA", "LPT 1613", "DIESEL", "10/05/2024", "WHITE", "Alok Kumar"],
        ["KA32AB1002", "CHA1002", "ENG1002", "ASHOK LEYLAND", "DOST", "DIESEL", "12-08-2023", "GREY", "Babu Lal"],
        ["KA32AB1003", "CHA1003", "ENG1003", "TATA", "ACE", "CNG", "15/01/2025", "BLUE", "Chandra Sekhar"],
        ["KA32AB1004", "CHA1004", "ENG1004", "MAHINDRA", "BOLERO", "DIESEL", "20-10-2022", "SILVER", "Dinesh Karthik"],
        ["KA32AB1005", "CHA1005", "ENG1005", "ASHOK LEYLAND", "PARTNER", "DIESEL", "01/03/2024", "WHITE", "Eshwar Rao"],
        ["KA32AB1006", "CHA1006", "ENG1006", "TATA", "SIGNA", "DIESEL", "05/05/2023", "RED", "Farhan Khan"],
        ["KA32AB1007", "CHA1007", "ENG1007", "MAHINDRA", "SUPRO", "CNG", "11/11/2024", "WHITE", "Girish M"],
        ["KA32AB1008", "CHA1008", "ENG1008", "TATA", "ULTRA", "DIESEL", "25-06-2025", "YELLOW", "Hari Prasad"],
    ]
    with open(base_dir / "vehicle_master" / "vehicles.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(vm_headers)
        writer.writerows(vm_rows)

    # ─────────────────────────────────────────────────────────────────
    # 2. CUSTOMERS (phone & address matching some VRNs)
    # ─────────────────────────────────────────────────────────────────
    cust_headers = ["VRN", "NAME", "PHONE", "ADDRESS"]
    cust_rows = [
        ["KA32AB1001", "Alok Kumar", "9876543210", "12, MG Road, Bangalore"],
        ["KA32AB1002", "Babu Lal", "9876543211", "34, Hosur Road, Bangalore"],
        ["KA32AB1003", "Chandra Sekhar", "9876543212", "56, Bannerghatta Road, Bangalore"],
        ["KA32AB1004", "Dinesh Karthik", "9876543213", "78, Whitefield, Bangalore"],
    ]
    with open(base_dir / "customers" / "customers.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(cust_headers)
        writer.writerows(cust_rows)

    # ─────────────────────────────────────────────────────────────────
    # 3. INVOICES (20 unique JCs + 5 duplicates = 25 rows total)
    # ─────────────────────────────────────────────────────────────────
    inv_headers = ["J C NO", "VRN", "INVOICE DATE", "INVOICE NO", "NAME", "LABOUR", "SPARES", "TOTAL", "ADVISIOR", "JC TYPE", "MECH", "TEC", "ELE"]
    inv_rows = [
        # 5 Running Repairs (category REPAIR)
        ["JC-001", "KA32AB1001", "15-06-2026", "INV-2001", "Alok Kumar", "500", "1500", "2000", "RS1_100B210", "Running Repairs", "Aslam", "Vijay", ""],
        ["JC-002", "KA32AB1002", "16-06-2026", "INV-2002", "Babu Lal", "800", "1200", "2000", "RS1_100B210", "Running Repair", "Aslam", "", "Ravi"],
        ["JC-003", "KA32AB1003", "17-06-2026", "INV-2003", "Chandra Sekhar", "450", "2000", "2450", "CSP_100B210", "General Repair", "Kiran", "Vijay", ""],
        ["JC-004", "KA32AB1004", "18-06-2026", "INV-2004", "Dinesh Karthik", "1200", "800", "2000", "CSP_100B210", "Running Repairs", "", "Suresh", "Ravi"],
        ["JC-005", "KA32AB1005", "19-06-2026", "INV-2005", "Eshwar Rao", "1500", "3500", "5000", "AC1_100B210", "Running Repairs", "Aslam", "Suresh", ""],
        
        # 5 Warranty Jobs (category WARRANTY, total bill = 0.0)
        ["JC-006", "KA32AB1006", "20-06-2026", "INV-2006", "Farhan Khan", "0", "0", "0", "AC1_100B210", "Warranty", "Aslam", "", ""],
        ["JC-007", "KA32AB1007", "21-06-2026", "INV-2007", "Girish M", "0", "0", "0", "AC1_100B210", "Warranty", "Kiran", "", ""],
        ["JC-008", "KA32AB1008", "22-06-2026", "INV-2008", "Hari Prasad", "0", "0", "0", "RS1_100B210", "Warranty", "", "Vijay", ""],
        ["JC-009", "KA32AB1001", "23-06-2026", "INV-2009", "Alok Kumar", "0", "0", "0", "RS1_100B210", "W/A", "", "", "Ravi"],
        ["JC-010", "KA32AB1002", "24-06-2026", "INV-2010", "Babu Lal", "0", "0", "0", "CSP_100B210", "Warranty", "Kiran", "Suresh", ""],
        
        # 2 Outside Vehicles (VRNs: KA32AB1009, KA32AB1010 - not in vehicle master)
        ["JC-011", "KA32AB1009", "25-06-2026", "INV-2011", "Irfan Pathan", "1000", "4000", "5000", "CSP_100B210", "Paid Service", "Aslam", "", ""],
        ["JC-012", "KA32AB1010", "26-06-2026", "INV-2012", "Javed Miandad", "600", "2400", "3000", "CSP_100B210", "Paid Service", "Kiran", "", ""],
        
        # Remaining 8 JCs to reach 20 unique
        ["JC-013", "KA32AB1003", "27-06-2026", "INV-2013", "Chandra Sekhar", "300", "500", "800", "AC1_100B210", "First Free Service", "Aslam", "", ""],
        ["JC-014", "KA32AB1004", "28-06-2026", "INV-2014", "Dinesh Karthik", "0", "0", "0", "AC1_100B210", "Second Free Service", "", "Vijay", ""],
        ["JC-015", "KA32AB1005", "29-06-2026", "INV-2015", "Eshwar Rao", "400", "600", "1000", "RS1_100B210", "AMC", "Kiran", "", ""],
        ["JC-016", "KA32AB1006", "30-06-2026", "INV-2016", "Farhan Khan", "700", "1300", "2000", "RS1_100B210", "E Breakdown", "", "", "Ravi"],
        ["JC-017", "KA32AB1007", "01-07-2026", "INV-2017", "Girish M", "800", "1200", "2000", "CSP_100B210", "W/A Service 1 (<10000Km)", "Aslam", "Vijay", ""],
        ["JC-018", "KA32AB1008", "02-07-2026", "INV-2018", "Hari Prasad", "900", "1100", "2000", "CSP_100B210", "Retro Fitment", "Kiran", "", ""],
        ["JC-019", "KA32AB1001", "03-07-2026", "INV-2019", "Alok Kumar", "600", "1400", "2000", "AC1_100B210", "Running Repair", "Aslam", "", ""],
        ["JC-020", "KA32AB1002", "04-07-2026", "INV-2020", "Babu Lal", "1100", "900", "2000", "AC1_100B210", "Running Repair", "", "Suresh", ""],
        
        # 5 Duplicate Job Cards (with same JC numbers but different values to test duplicate resolution)
        ["JC-001", "KA32AB1001", "15-06-2026", "INV-2001", "Alok Kumar", "500", "1500", "2000", "RS1_100B210", "Running Repairs", "Aslam", "Vijay", ""], # exact duplicate
        ["JC-002", "KA32AB1002", "16-06-2026", "INV-2002", "Babu Lal", "800", "1200", "2100", "RS1_100B210", "Running Repair", "Aslam", "", "Ravi"], # duplicate with different total bill (arithmetic fail)
        ["JC-003", "KA32AB1003", "17-06-2026", "INV-2003", "Chandra Sekhar", "450", "2000", "2450", "CSP_100B210", "General Repair", "Kiran", "Vijay", ""],
        ["JC-004", "KA32AB1004", "18-06-2026", "INV-2004", "Dinesh Karthik", "1200", "800", "2000", "CSP_100B210", "Running Repairs", "", "Suresh", "Ravi"],
        ["JC-005", "KA32AB1005", "19-06-2026", "INV-2005", "Eshwar Rao", "1500", "3500", "5000", "AC1_100B210", "Running Repairs", "Aslam", "Suresh", ""],
    ]
    with open(base_dir / "invoices" / "invoices.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(inv_headers)
        writer.writerows(inv_rows)

    # ─────────────────────────────────────────────────────────────────
    # 4. SERVICE HISTORY (20 rows matching JCs, 5 with missing odometers)
    # ─────────────────────────────────────────────────────────────────
    # Missing Odometers on: JC-006, JC-007, JC-008, JC-009, JC-010 (all 5 Warranty Jobs)
    sh_headers = ["J C NO", "VRN", "SR TYPE", "ODOMETER", "SR ASSIGNED TO", "COMPLAINT", "SERVICE DATE", "NAME"]
    sh_rows = [
        ["JC-001", "KA32AB1001", "Running Repairs", "12500", "Anil Kumar", "Engine oil leaking", "15-06-2026", "Alok Kumar"],
        ["JC-002", "KA32AB1002", "Running Repair", "24000", "Anil Kumar", "Brake pedal soft", "16-06-2026", "Babu Lal"],
        ["JC-003", "KA32AB1003", "General Repair", "8500", "Sunil Dev", "AC not cooling", "17-06-2026", "Chandra Sekhar"],
        ["JC-004", "KA32AB1004", "Running Repairs", "31200", "Sunil Dev", "Steering vibration", "18-06-2026", "Dinesh Karthik"],
        ["JC-005", "KA32AB1005", "Running Repairs", "15400", "Mahesh", "Clutch slipping", "19-06-2026", "Eshwar Rao"],
        
        # 5 Missing Odometers (blank or none)
        ["JC-006", "KA32AB1006", "Warranty", "", "Mahesh", "Starter motor failure", "20-06-2026", "Farhan Khan"],
        ["JC-007", "KA32AB1007", "Warranty", "nan", "Mahesh", "Paint peeling", "21-06-2026", "Girish M"],
        ["JC-008", "KA32AB1008", "Warranty", "", "Anil Kumar", "Gear shift hard", "22-06-2026", "Hari Prasad"],
        ["JC-009", "KA32AB1001", "W/A", "", "Anil Kumar", "Coolant leak", "23-06-2026", "Alok Kumar"],
        ["JC-010", "KA32AB1002", "Warranty", "", "Sunil Dev", "Horn not working", "24-06-2026", "Babu Lal"],
        
        # Outside Vehicles
        ["JC-011", "KA32AB1009", "Paid Service", "52000", "Sunil Dev", "Scheduled servicing", "25-06-2026", "Irfan Pathan"],
        ["JC-012", "KA32AB1010", "Paid Service", "64000", "Sunil Dev", "Scheduled servicing", "26-06-2026", "Javed Miandad"],
        
        # Remaining
        ["JC-013", "KA32AB1003", "First Free Service", "1000", "Mahesh", "First checkup", "27-06-2026", "Chandra Sekhar"],
        ["JC-014", "KA32AB1004", "Second Free Service", "5000", "Mahesh", "Second checkup", "28-06-2026", "Dinesh Karthik"],
        ["JC-015", "KA32AB1005", "AMC", "18000", "Anil Kumar", "General checkup", "29-06-2026", "Eshwar Rao"],
        ["JC-016", "KA32AB1006", "E Breakdown", "19500", "Anil Kumar", "Roadside breakdown steering", "30-06-2026", "Farhan Khan"],
        ["JC-017", "KA32AB1007", "W/A Service 1 (<10000Km)", "9800", "Sunil Dev", "Scheduled 10k service", "01-07-2026", "Girish M"],
        ["JC-018", "KA32AB1008", "Retro Fitment", "12000", "Sunil Dev", "GPS tracker fitment", "02-07-2026", "Hari Prasad"],
        ["JC-019", "KA32AB1001", "Running Repair", "14500", "Mahesh", "Headlamp replacement", "03-07-2026", "Alok Kumar"],
        ["JC-020", "KA32AB1002", "Running Repair", "26500", "Mahesh", "Wiper blade replacement", "04-07-2026", "Babu Lal"],
    ]
    with open(base_dir / "service_history" / "service_history.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(sh_headers)
        writer.writerows(sh_rows)
        
    print(f"Synthetic test dataset successfully generated at: {base_dir}")

if __name__ == "__main__":
    import sys
    dest = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("DWIP/input")
    generate_synthetic_dataset(dest)
