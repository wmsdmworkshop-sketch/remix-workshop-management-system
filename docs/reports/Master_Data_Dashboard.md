# Master Data Governance Dashboard
## Target Database: `railway` · Scope: DWIP MDG Audit
## Overall Data Confidence Score: 87.2%

---

### 1. Master Domains Normalization Summary

| Master Domain | Total Records | Standardized | Duplicates Detected | Average Confidence | Review Status Breakdown |
|---|---|---|---|---|---|
| **Customers** | 2159 | 18 | 91 | 69.7% | Locked: 1 · AI Suggested: 25 · Pending: 2133 |
| **Employees** | 73 | 45 | 0 | 85.2% | Locked: 2 · AI Suggested: 52 · Pending: 19 |
| **Vehicles** | 2993 | 2929 | 0 | 98.9% | Locked: 2929 · AI Suggested: 0 · Pending: 64 |
| **Fleets** | 205 | 205 | 0 | 95.0% | Locked: 205 · AI Suggested: 0 · Pending: 0 |

---

### 2. Main Data Quality Anomalies Identified

#### 2.1 Customer Master Domain
*   **Default Mobile Number Bypass:** 2131 customer accounts are registered with the dummy number `0000000000`, resulting in a validation lock flag.
*   **Duplicate Mappings:** Found 91 duplicates where multiple spellings (e.g., `M/S Sahara Road Lines`, `Sahara Roadlines`) map to the same address/contact profile.

#### 2.2 Employee Master Domain
*   **Orphaned User Credentials:** Mapped 28 user login accounts (from the `users` table) that have no corresponding employee profiles in the `employees` master table, creating an access auditing gap.

#### 2.3 Vehicle Master Domain
*   **Validation Failures:** Mapped 64 vehicles with non-standard registration formats (missing letters or wrong character counts).

---

### 3. Actionable Mitigations
1.  **Deploy Master Resolution Engine:** Resolve duplicate groups by merging them into their parent group IDs (e.g., merging all `Sahara` variants to group `C-GRP-1`).
2.  **Audit Orphaned Users:** Create corresponding employee directory entries for user accounts that lack profile metadata.
3.  **Enforce UI RegEx Checkers:** Add strict registration casing checkers in the gate intake forms.
