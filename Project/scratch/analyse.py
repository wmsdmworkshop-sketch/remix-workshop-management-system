import pandas as pd
import re

df = pd.read_csv(r'input\JC_Backdate_June2026.csv', encoding='utf-8')

print("=== JC TYPE - ALL UNIQUE VALUES ===")
jc_types = df['JC TYPE'].value_counts()
for val, cnt in jc_types.items():
    print(f"  [{cnt:>3}x]  {val}")
print()

print("=== ADVISIOR - ALL UNIQUE VALUES ===")
for val, cnt in df['ADVISIOR'].value_counts().items():
    print(f"  [{cnt:>3}x]  {val}")
print()

print("=== VRN ANALYSIS ===")
def classify_vrn(v):
    v = str(v).strip()
    if re.match(r'^[A-Z]{2}\d{2}[A-Z]{2}\d{4}$', v): return 'STANDARD_2ALPHA'
    if re.match(r'^[A-Z]{2}\d{2}[A-Z]{1}\d{4}$', v): return 'STANDARD_1ALPHA'
    if re.match(r'^[A-Z]{2}-\d{2}-[A-Z]{1,2}-\d{4}$', v): return 'HYPHENATED'
    return 'NON_STANDARD'

vrn_classes = df['VRN'].apply(classify_vrn).value_counts()
print("  VRN Format Distribution:")
for cls, cnt in vrn_classes.items():
    print(f"    {cls}: {cnt}")

non_std = df[df['VRN'].apply(classify_vrn) == 'NON_STANDARD']['VRN'].unique()
if len(non_std) > 0:
    print(f"  Non-standard VRNs ({len(non_std)}):")
    for v in non_std[:20]:
        print(f"    {v}")
print()

print("=== INVOICE NO - Missing Analysis ===")
missing_inv = df[df['INVOICE NO'].isna()]
print(f"  JCs with missing Invoice No: {len(missing_inv)}")
print("  Samples of JC NO for missing invoices:")
for jc in missing_inv['J C NO'].head(10).tolist():
    print(f"    {jc}")
print()

print("=== TOTAL vs LABOUR+SPARES Check ===")
df['CALC_TOTAL'] = df['LABOUR'] + df['SPARES']
mismatch = df[abs(df['CALC_TOTAL'] - df['TOTAL']) > 0.01]
print(f"  Total mismatches (LABOUR+SPARES != TOTAL): {len(mismatch)}")
if len(mismatch) > 0:
    print("  Mismatch samples:")
    for _, row in mismatch.head(5).iterrows():
        jc = row['J C NO']
        print(f"    JC={jc}  L={row['LABOUR']}  S={row['SPARES']}  L+S={row['CALC_TOTAL']}  TOTAL={row['TOTAL']}")
print()

print("=== DUPLICATE VRN on SAME DATE ===")
dup_vehicle_date = df.groupby(['VRN', 'INVOICE DATE']).size().reset_index(name='count')
multi = dup_vehicle_date[dup_vehicle_date['count'] > 1]
print(f"  Vehicle+Date combos appearing more than once: {len(multi)}")
for _, row in multi.head(10).iterrows():
    print(f"    VRN={row['VRN']}  Date={row['INVOICE DATE']}  Count={row['count']}")
print()

print("=== ZERO AMOUNT RECORDS ===")
zero_total = df[df['TOTAL'] == 0]
print(f"  Records with TOTAL=0: {len(zero_total)}")
print()

print("=== DATE RANGE ===")
dates = pd.to_datetime(df['INVOICE DATE'])
print(f"  Min Date: {dates.min()}")
print(f"  Max Date: {dates.max()}")
print(f"  Unique Dates: {dates.nunique()}")
print()

print("=== JC NO PREFIX VALIDATION ===")
def jc_prefix_ok(jc):
    jc = str(jc).strip().upper()
    return jc.startswith('JC-')

prefix_ok = df['J C NO'].apply(jc_prefix_ok)
print(f"  Valid JC- prefixed records: {prefix_ok.sum()}")
print(f"  Invalid (would be rejected): {(~prefix_ok).sum()}")
invalid_jcs = df[~prefix_ok]['J C NO'].unique()
if len(invalid_jcs) > 0:
    for j in invalid_jcs[:10]:
        print(f"    {j}")
print()

print("=== DUPLICATE JC NO ===")
dup_jc = df[df.duplicated('J C NO', keep=False)]
print(f"  Duplicate J C NO entries: {len(dup_jc)}")
if len(dup_jc) > 0:
    for jc in dup_jc['J C NO'].unique()[:5]:
        print(f"    {jc}")
print()

print("=== TECHNICIAN COLUMNS ANALYSIS ===")
tech_cols = ['MECH', 'TEC', 'ELE', 'TEC.1', 'ELE.1', 'ADDITIONAL TECH', 'ADDITIONAL ELEC']
print("  Unique names across all technician columns:")
all_techs = set()
for col in tech_cols:
    vals = df[col].dropna().unique()
    all_techs.update(vals)
    print(f"    {col}: {len(vals)} unique names, {df[col].notna().sum()} filled")
print(f"  Total unique technician names: {len(all_techs)}")
for t in sorted(all_techs):
    print(f"    {t}")
print()

print("=== VRN APPEARING MULTIPLE TIMES (vehicle with multiple visits) ===")
vrn_counts = df['VRN'].value_counts()
multi_visit = vrn_counts[vrn_counts > 1]
print(f"  Vehicles with >1 visit: {len(multi_visit)}")
print(f"  Vehicles with exactly 1 visit: {(vrn_counts == 1).sum()}")
print(f"  Max visits by one vehicle: {vrn_counts.max()}")
top_vrns = vrn_counts.head(5)
for vrn, cnt in top_vrns.items():
    print(f"    {vrn}: {cnt} visits")
print()

print("=== TWO CSVs IDENTICAL? ===")
df2 = pd.read_csv(r'..\JC_Backdate_June2026 - Sheet.csv', encoding='utf-8')
if df.equals(df2):
    print("  IDENTICAL - Both CSVs are exactly the same data.")
else:
    print("  DIFFERENT - Files differ!")
    diff_mask = (df != df2)
    print(f"  Cells differing: {diff_mask.sum().sum()}")
