# Tools, Asset & Purchase — upload templates

Three CSV templates in this folder, ready to fill and upload:

- `TOOLS_INVENTORY_TEMPLATE.csv` — workshop tools, reviewed **daily** by the Tools Incharge
- `ASSET_INVENTORY_TEMPLATE.csv` — fixed assets (computers, AC, refrigerator, furniture)
- `PURCHASE_RECORD_TEMPLATE.csv` — **every** tool/asset purchase, local or corporate

The sample rows show the **format only**. Delete them and enter your real items — do not
upload the samples.

## How the three fit together

**Inventory answers "what do we have?" — purchase answers "where did it come from, what
did it cost, and who authorised it?"** They are separate records and neither replaces
the other.

```
PURCHASE  (PUR-0001, supplier, invoice, cost, approval)
    │  item_code
    ▼
INVENTORY (TL-0001 tool, or AST-0001 asset — the item now in the workshop)
    │  tool_code
    ▼
DAILY REVIEW (present / missing / damaged, by whom, when)
```

The link is `item_code`: a purchase row carries the same `TL-xxxx` / `AST-xxxx` code as
the inventory row it creates. That gives you, for any tool: what it cost, who approved
it, when warranty expires, and whether it was seen this morning.

Nothing in DWIP records purchases today — there are no purchase, vendor or PO tables at
all, so this is new ground rather than a duplicate of the parts stock tables (which
track `part_number` quantities only).

## Conventions taken from the live system

So the upload matches what DWIP already holds, rather than inventing a parallel scheme:

| Field | Use the same values as | Example |
|---|---|---|
| `branch_id` (added at upload) | existing branch | `BR-SEDAM` |
| `location` for a bay | `tbl_bays.bay_id` | `B-01` … `B-05`, `B-99` |
| `custodian_employee_code` | `employees.employee_code` | `DEV-324` (KHASIM, Tools Incharge) |

Leave a cell **empty** when you don't have the value. Do not type "NA", "-", "unknown"
or a guess — an empty cell is recorded honestly as missing, whereas invented text
becomes a fact the system will report back to you later as if it were real.

## Tools template — fields

**Required:** `tool_code`, `tool_name`, `category`, `quantity`, `condition`, `location`,
`custodian_employee_code`, `status`

| Field | Notes |
|---|---|
| `tool_code` | Your unique tag, e.g. `TL-0001`. Must be unique — it is the identity used for the daily check |
| `tool_name` | Include size/spec: "Torque Wrench 1/2in 28-210Nm" not just "Torque Wrench" |
| `category` | `Hand Tool`, `Power Tool`, `Lifting Equipment`, `Diagnostic`, `Measuring`, `Consumable`, `Special Tool` |
| `quantity` / `unit` | `NOS`, `SET`, `PAIR`. A 6-piece set is quantity 1, unit `SET` |
| `condition` | `GOOD`, `NEEDS_REPAIR`, `DAMAGED`, `MISSING` |
| `location` | Bay id (`B-01`) or a named place (`TOOL_ROOM`, `STORE`) |
| `custodian_employee_code` | Who is accountable. `DEV-324` = KHASIM (Tools Incharge) |
| `calibration_required` | `YES`/`NO`. Torque wrenches, gauges and measuring tools normally `YES` |
| `calibration_due_date` | `YYYY-MM-DD`. Required when `calibration_required` = YES |
| `status` | `IN_SERVICE`, `UNDER_REPAIR`, `ISSUED_OUT`, `SCRAPPED`, `LOST` |
| `purchase_date`, `warranty_expiry` | `YYYY-MM-DD` |

## Asset template — fields

**Required:** `asset_code`, `asset_name`, `category`, `quantity`, `location`,
`condition`, `status`

| Field | Notes |
|---|---|
| `asset_code` | Your unique tag, e.g. `AST-0001` |
| `category` | `IT Equipment`, `Furniture`, `HVAC`, `Appliance`, `Security`, `Electrical`, `Vehicle`, `Other` |
| `serial_number` | Important for IT/HVAC — it is what warranty and AMC claims are made against |
| `department` | `Reception`, `Workshop`, `Stores`, `Administration`, `Security` |
| `amc_provider` / `amc_expiry` | Annual maintenance contract, for AC, computers, CCTV |
| `condition` | `GOOD`, `NEEDS_REPAIR`, `DAMAGED`, `SCRAPPED` |
| `status` | `IN_USE`, `IN_STORE`, `UNDER_REPAIR`, `DISPOSED` |
| `last_audit_date` | `YYYY-MM-DD`, set at each physical verification |

Group identical items on one row using `quantity` (12 identical visitor chairs = one row,
quantity 12). Track individually only where the item has a serial number you care about.

## Purchase template — fields

Records **every** tool or asset purchase, however it was bought.

**Required:** `purchase_id`, `purchase_date`, `purchase_type`, `item_type`, `item_name`,
`quantity`, `branch_id`

| Field | Notes |
|---|---|
| `purchase_id` | Your unique reference, e.g. `PUR-0001` |
| `purchase_type` | **`LOCAL`** (bought by the branch) · **`CORPORATE`** (centralised/HO purchase allocated to this branch) · **`TRANSFER`** (moved from another branch) · **`GIFT_FREE`** (supplied free, e.g. by OEM under a scheme) |
| `item_type` | `TOOL` · `ASSET` · `CONSUMABLE` · `SPARE` |
| `item_code` | The `TL-xxxx` / `AST-xxxx` code this purchase creates. **This is the link to the inventory row.** Leave empty for consumables that are not tagged |
| `unit_cost` / `total_cost` | Before tax |
| `tax_amount` / `invoice_total` | GST and the final invoice figure |
| `supplier_gstin` | Needed for input-credit reconciliation |
| `po_number` | Usually present for CORPORATE, often empty for LOCAL cash purchases |
| `payment_mode` | `CASH` · `UPI` · `BANK_TRANSFER` · `CREDIT` · `CARD` · `CORPORATE_ACCOUNT` |
| `payment_status` | `PAID` · `PENDING` · `PARTIAL` |
| `requested_by_employee_code` | Who asked for it |
| `approved_by_employee_code` | Who authorised the spend. **Leave empty if nobody formally approved it** — do not fill in a name to make the row look complete |
| `approval_reference` | Mail/WhatsApp/PO reference for the approval, if any |
| `received_by_employee_code` / `received_date` | Who physically took delivery. This is what makes a purchase auditable against a missing item later |
| `warranty_months` / `warranty_expiry` | Either is fine; expiry can be derived from months + purchase date |
| `asset_tagged` | `YES` if it becomes a tracked tool/asset row, `NO` for consumables |
| `invoice_file_ref` | Filename or reference of the scanned invoice |

**Corporate purchases:** fill `purchase_type = CORPORATE`. `supplier_name`,
`invoice_number` and cost are often held by head office rather than the branch — leave
them empty rather than guessing, and record what you do know (`po_number`,
`received_by`, `received_date`, the item itself). A corporate item still needs an
inventory row, because the branch is the one accountable for it being present.

## Date and number format

- Dates: **`YYYY-MM-DD`** (e.g. `2026-09-08`). Not DD/MM/YYYY — Excel silently reorders it.
- Costs: digits only, no `₹` and no commas — `45000` not `₹45,000`.
- Save as **CSV UTF-8**. In Excel: *Save As → CSV UTF-8 (Comma delimited)*.

## Two things to be aware of before uploading

**1. The upload feature does not exist yet.** These templates define the agreed shape;
the tables, import endpoint and screens still need to be built. Filling them in now is
useful — it means the build starts from your real data instead of assumptions — but
nothing can be uploaded until that work is done.

**2. The Tools Incharge login currently has no access.** `DEV-324` (KHASIM) holds the
job title `Tools Incharge`, which maps to no permission role, so that account can reach
nothing today. That must be resolved for KHASIM to perform the daily review — the same
issue that was just fixed for Floor Incharge and Service Manager by merging them onto
real permission roles.

## Daily tools review — what it should record

The point of a daily check is accountability, so each review should capture, per tool:
verified present / missing / damaged, by whom, and at what time — with anything missing
or damaged raised as an exception rather than silently overwritten. That gives you a
history that answers "when was this last seen, and who checked it", which is the same
principle as the job-card audit trail.
