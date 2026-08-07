# DWIP Import Center - Sprint QA-IMPORT-001
$BASE = "https://dwip-pilot-473233046183.asia-south1.run.app"
$TOKEN = $null

function Log($msg) { Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" }

function Invoke-JsonPost($path, $bodyObj, $token) {
    $url = "$BASE$path"
    $result = @{ statusCode = 0; body = $null; error = $null }
    try {
        $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes(($bodyObj | ConvertTo-Json -Depth 10 -Compress))
        $req = [System.Net.HttpWebRequest]::Create($url)
        $req.Method = "POST"
        $req.ContentType = "application/json"
        $req.ContentLength = $bodyBytes.Length
        $req.Timeout = 30000
        if ($token -and $token -ne "NO_TOKEN") { $req.Headers.Add("Authorization", "Bearer $token") }
        $s = $req.GetRequestStream(); $s.Write($bodyBytes, 0, $bodyBytes.Length); $s.Close()
        try {
            $resp = $req.GetResponse()
            $result.statusCode = [int]$resp.StatusCode
            $r = New-Object System.IO.StreamReader($resp.GetResponseStream())
            $result.body = $r.ReadToEnd() | ConvertFrom-Json
        } catch [System.Net.WebException] {
            $errResp = $_.Exception.Response
            if ($errResp) {
                $result.statusCode = [int]$errResp.StatusCode
                $r2 = New-Object System.IO.StreamReader($errResp.GetResponseStream())
                $result.body = $r2.ReadToEnd() | ConvertFrom-Json
            }
            $result.error = $_.Exception.Message
        }
    } catch { $result.error = $_.Exception.Message }
    return $result
}

function Invoke-JsonGet($path, $token) {
    $url = "$BASE$path"
    try {
        $req = [System.Net.HttpWebRequest]::Create($url)
        $req.Method = "GET"; $req.Timeout = 15000
        if ($token -and $token -ne "NO_TOKEN") { $req.Headers.Add("Authorization", "Bearer $token") }
        $resp = $req.GetResponse()
        $r = New-Object System.IO.StreamReader($resp.GetResponseStream())
        return $r.ReadToEnd() | ConvertFrom-Json
    } catch { return $null }
}

# LOGIN
Log "=== AUTHENTICATION ==="
$creds = @(
    @{username="developer";password="dwip123"},
    @{username="sayeed";password="dwip123"},
    @{username="admin";password="admin123"}
)
foreach ($c in $creds) {
    $r = Invoke-JsonPost "/api/auth/login" $c $null
    if ($r.body.token) { $TOKEN = $r.body.token; Log "LOGIN OK: $($c.username) role=$($r.body.user.role)"; break }
    Log "LOGIN FAIL: $($c.username) HTTP=$($r.statusCode)"
}
if (-not $TOKEN) { $TOKEN = "NO_TOKEN"; Log "WARNING: No token. Auth tests will fail." }

# PROFILE LIST
Log "=== PROFILE LIST API ==="
$profiles = Invoke-JsonGet "/api/master/import-profiles" $TOKEN
Log "Profiles: $($profiles.Count)"

$TESTS = @(
    @{ n="Dealer Profile";            dR=@(@{dealer_code="QA-DLR-001";dealer_name="QA Dealer Dry"});         cR=@(@{dealer_code="QA-DLR-002";dealer_name="QA Dealer Commit"});       dupR=@(@{dealer_code="QA-DLR-002";dealer_name="QA Dup"}); chk="/api/master/dealers"; pk="dealer_code"; pv="QA-DLR-002" }
    @{ n="Branch Profile";            dR=@(@{branch_code="QA-BR-001";branch_name="QA Branch Dry";dealer_id=1}); cR=@(@{branch_code="QA-BR-002";branch_name="QA Branch Commit";dealer_id=1}); dupR=@(@{branch_code="QA-BR-002";branch_name="QA Dup";dealer_id=1}); chk="/api/master/branches"; pk="branch_code"; pv="QA-BR-002" }
    @{ n="Part Profile";              dR=@(@{part_number="QA-PT-001";part_name="QA Part Dry";price=50});      cR=@(@{part_number="QA-PT-002";part_name="QA Part Commit";price=75;stock_qty=5}); dupR=@(@{part_number="QA-PT-002";part_name="QA Dup";price=100}); chk="/api/master/parts"; pk="part_number"; pv="QA-PT-002" }
    @{ n="Labour Profile";            dR=@(@{labour_code="QA-LB-001";description="QA Labour Dry";rate_per_hour=400}); cR=@(@{labour_code="QA-LB-002";description="QA Labour Commit";rate_per_hour=500;std_hours=2}); dupR=@(@{labour_code="QA-LB-002";description="QA Dup";rate_per_hour=600}); chk="/api/master/labour"; pk="labour_code"; pv="QA-LB-002" }
    @{ n="Complaint Profile";         dR=@(@{complaint_code="QA-CP-001";description="QA Complaint Dry"}); cR=@(@{complaint_code="QA-CP-002";description="QA Complaint Commit";category="Engine"}); dupR=@(@{complaint_code="QA-CP-002";description="QA Dup"}); chk="/api/master/complaints"; pk="complaint_code"; pv="QA-CP-002" }
    @{ n="Warranty Profile";          dR=@(@{warranty_code="QA-WC-001";description="QA Warranty Dry"}); cR=@(@{warranty_code="QA-WC-002";description="QA Warranty Commit";coverage_months=12}); dupR=@(@{warranty_code="QA-WC-002";description="QA Dup"}); chk="/api/master/warranty-codes"; pk="warranty_code"; pv="QA-WC-002" }
    @{ n="Customer Profile";          dR=@(@{customer_name="QA Cust Dry";contact_phone="9000000001"}); cR=@(@{customer_name="QA Cust Commit";contact_phone="9000000002";contact_email="qa@test.com"}); dupR=@(@{customer_name="QA Cust Dup";contact_phone="9000000002"}); chk="/api/customer/passports"; pk="contact_phone"; pv="9000000002" }
    @{ n="Employee Profile";          dR=@(@{employee_code="QA-EM-001";full_name="QA Emp Dry";role="technician"}); cR=@(@{employee_code="QA-EM-002";full_name="QA Emp Commit";role="technician";mobile="9100000001"}); dupR=@(@{employee_code="QA-EM-002";full_name="QA Dup";role="technician"}); chk="/api/employees"; pk="employee_code"; pv="QA-EM-002" }
    @{ n="Vehicle Birth Profile";     dR=@(@{vin="1HGBH41JXMN109186";registration_no="QA-VH-DR001";original_sale_date="2024-01-10"}); cR=@(@{vin="2HGBH41JXMN109187";registration_no="QA-VH-CM001";original_sale_date="2024-02-15";make="QAMake";model="QAModel";fuel_type="Petrol";body_type="Sedan";year_of_manufacture=2024}); dupR=@(@{vin="2HGBH41JXMN109187";registration_no="QA-VH-DUP";original_sale_date="2024-02-15"}); chk="/api/master/vehicles"; pk="vin"; pv="2HGBH41JXMN109187" }
    @{ n="Authorized Service Profile";dR=@(@{vin="2HGBH41JXMN109187";service_datetime="2025-01-10";sr_type="Periodic";odometer_reading=10000;sh_no="QA-SH-DR001"}); cR=@(@{vin="2HGBH41JXMN109187";service_datetime="2025-06-15";sr_type="General";odometer_reading=25000;sh_no="QA-SH-CM001";sr_no="QA-SR-CM001";summary="QA Commit";account="QA"}); dupR=@(@{vin="2HGBH41JXMN109187";service_datetime="2025-06-15";sr_type="General";odometer_reading=25000;sh_no="QA-SH-CM001"}); chk=$null; pk="sh_no"; pv="QA-SH-CM001" }
    @{ n="External Service Profile";  dR=@(@{vin="2HGBH41JXMN109187";invoice_date="2025-03-01";invoice_no="QA-INV-DR001";final_consolidated_amt=5000}); cR=@(@{vin="2HGBH41JXMN109187";invoice_date="2025-04-01";invoice_no="QA-INV-CM001";final_consolidated_amt=7500;final_labour_amount=3000;final_spares_amount=4500}); dupR=@(@{vin="2HGBH41JXMN109187";invoice_date="2025-04-01";invoice_no="QA-INV-CM001";final_consolidated_amt=7500}); chk=$null; pk="invoice_no"; pv="QA-INV-CM001" }
)

$pResults = @()
foreach ($t in $TESTS) {
    Log "--- $($t.n) ---"
    $pr = @{ profile=$t.n; inList="UNKNOWN"; dry=@{status="UNKNOWN";http=0;detail=""}; commit=@{status="UNKNOWN";http=0;detail="";cnt=0}; dup=@{status="UNKNOWN";http=0;detail="";skipped=0}; db=@{status="UNKNOWN";detail=""}; validation=@{status="UNKNOWN";detail=""} }

    # Profile in list
    if ($profiles) { $pr.inList = if ($profiles | Where-Object { $_.profile_name -eq $t.n }) { "PASS" } else { "FAIL" } }

    # Dry Run
    $dr = Invoke-JsonPost "/api/master/bulk-import" @{profileName=$t.n;profileVersion="v1";rows=$t.dR;dryRun=$true} $TOKEN
    $pr.dry.http = $dr.statusCode
    if ($dr.statusCode -eq 200 -and $null -ne $dr.body.totalProcessed) {
        $ec = if ($dr.body.errors) { $dr.body.errors.Count } else { 0 }
        $pr.dry.status = if ($ec -eq 0) { "PASS" } else { "PARTIAL" }
        $pr.dry.detail = "processed=$($dr.body.totalProcessed) errors=$ec"
        if ($ec -gt 0) { $pr.dry.detail += " | $(($dr.body.errors | ForEach-Object { $_.messages -join ',' }) -join '; ')" }
    } else { $pr.dry.status = "FAIL"; $pr.dry.detail = if ($dr.body.error) { $dr.body.error } else { $dr.error } }
    Log "  DRY=$($pr.dry.status) HTTP=$($pr.dry.http) $($pr.dry.detail)"

    # Commit
    $cr = Invoke-JsonPost "/api/master/bulk-import" @{profileName=$t.n;profileVersion="v1";rows=$t.cR;dryRun=$false} $TOKEN
    $pr.commit.http = $cr.statusCode
    if ($cr.statusCode -eq 200 -and $cr.body.success) {
        $pr.commit.status = "PASS"; $pr.commit.cnt = $cr.body.importedCount
        $pr.commit.detail = "imported=$($cr.body.importedCount) skipped=$($cr.body.skippedDuplicates)"
    } else { $pr.commit.status = "FAIL"; $pr.commit.detail = if ($cr.body.error) { $cr.body.error } else { $cr.error } }
    Log "  COMMIT=$($pr.commit.status) HTTP=$($pr.commit.http) $($pr.commit.detail)"

    # Duplicate
    Start-Sleep -Milliseconds 200
    $dup = Invoke-JsonPost "/api/master/bulk-import" @{profileName=$t.n;profileVersion="v1";rows=$t.dupR;dryRun=$false} $TOKEN
    $pr.dup.http = $dup.statusCode
    if ($dup.statusCode -eq 200) {
        $pr.dup.skipped = $dup.body.skippedDuplicates
        $pr.dup.status = if ($dup.body.skippedDuplicates -gt 0) { "PASS" } else { "FAIL" }
        $pr.dup.detail = "skipped=$($dup.body.skippedDuplicates) imported=$($dup.body.importedCount)"
    } else { $pr.dup.status = "FAIL"; $pr.dup.detail = if ($dup.body.error) { $dup.body.error } else { $dup.error } }
    Log "  DUP=$($pr.dup.status) $($pr.dup.detail)"

    # DB Check
    if ($t.chk) {
        Start-Sleep -Milliseconds 200
        $dbData = Invoke-JsonGet $t.chk $TOKEN
        if ($dbData -ne $null) {
            if (-not ($dbData -is [System.Array]) -and $dbData.passports) { $dbData = $dbData.passports }
            if ($dbData -is [System.Array]) {
                $found = $dbData | Where-Object { $_."$($t.pk)" -eq $t.pv }
                $pr.db.status = if ($found) { "PASS" } else { "FAIL" }
                $pr.db.detail = if ($found) { "Record found: $($t.pk)=$($t.pv)" } else { "NOT FOUND: $($t.pk)=$($t.pv)" }
            } else { $pr.db.status = "SKIP"; $pr.db.detail = "Non-array response" }
        } else { $pr.db.status = "FAIL"; $pr.db.detail = "API returned null" }
    } else { $pr.db.status = "SKIP"; $pr.db.detail = "No check endpoint" }
    Log "  DB=$($pr.db.status) $($pr.db.detail)"

    # Validation (missing mandatory fields)
    $vr = Invoke-JsonPost "/api/master/bulk-import" @{profileName=$t.n;profileVersion="v1";rows=@(@{dummy="x"});dryRun=$true} $TOKEN
    if ($vr.statusCode -eq 200 -and $vr.body.errors -and $vr.body.errors.Count -gt 0) {
        $pr.validation.status = "PASS"; $pr.validation.detail = "Validation caught missing fields correctly"
    } else { $pr.validation.status = "FAIL"; $pr.validation.detail = "Validation did NOT catch missing mandatory fields" }
    Log "  VALIDATION=$($pr.validation.status) $($pr.validation.detail)"

    $pResults += $pr
    Start-Sleep -Milliseconds 300
}

# EDGE CASES
Log "=== EDGE CASES ==="
$e1 = Invoke-JsonPost "/api/master/bulk-import" @{profileName="Dealer Profile";rows=@();dryRun=$true} $TOKEN
$e2 = Invoke-JsonPost "/api/master/bulk-import" @{rows=@(@{x=1});dryRun=$true} $TOKEN
$e3 = Invoke-JsonPost "/api/master/bulk-import" @{profileName="BOGUS PROFILE";rows=@(@{x=1});dryRun=$true} $TOKEN
$e4 = Invoke-JsonPost "/api/master/bulk-import" @{profileName="Dealer Profile";rows=@(@{dealer_code="X";dealer_name="Y"});dryRun=$true} "NO_TOKEN"

$edges = @(
    @{ test="EMPTY_ROWS";          status=if($e1.statusCode -eq 400){"PASS"}else{"FAIL"}; http=$e1.statusCode; detail=$e1.body.error }
    @{ test="MISSING_PROFILE_NAME";status=if($e2.statusCode -eq 400){"PASS"}else{"FAIL"}; http=$e2.statusCode; detail=$e2.body.error }
    @{ test="INVALID_PROFILE_NAME";status=if($e3.statusCode -eq 404){"PASS"}else{"FAIL"}; http=$e3.statusCode; detail=$e3.body.error }
    @{ test="UNAUTHENTICATED";     status=if($e4.statusCode -eq 401){"PASS"}else{"FAIL"}; http=$e4.statusCode; detail=$e4.body.error }
)
foreach ($e in $edges) { Log "  $($e.test): $($e.status) HTTP=$($e.http)" }

# SAVE JSON
$out = @{
    timestamp    = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
    baseUrl      = $BASE
    authStatus   = if($TOKEN -ne "NO_TOKEN"){"SUCCESS"}else{"FAILED"}
    profileCount = $profiles.Count
    perProfile   = $pResults
    edgeCases    = $edges
}
$out | ConvertTo-Json -Depth 10 | Set-Content ".\scratch\qa_import_results.json" -Encoding UTF8
Log "Saved: scratch\qa_import_results.json"
Log "=== DONE ==="
