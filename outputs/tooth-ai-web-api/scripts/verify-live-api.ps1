$ErrorActionPreference = "Stop"

$apiRoot = Split-Path -Parent $PSScriptRoot
$settings = @{}
Get-Content -Encoding utf8 (Join-Path $apiRoot ".env.local") |
  Where-Object { $_ -match "^[A-Z_]+=" } |
  ForEach-Object {
    $parts = $_ -split "=", 2
    $settings[$parts[0]] = $parts[1]
  }

$health = Invoke-RestMethod -Uri "http://127.0.0.1:8000/health"
if (-not $health.model_available) { throw "The configured model is unavailable." }

try {
  Invoke-WebRequest -Uri "http://127.0.0.1:8000/records" -UseBasicParsing -ErrorAction Stop | Out-Null
  throw "Records endpoint unexpectedly allowed an anonymous request."
} catch {
  if ($_.Exception.Response.StatusCode.value__ -ne 401) { throw }
}

$badLogin = @{ username = $settings["ADMIN_USERNAME"]; password = "invalid-test-password" } | ConvertTo-Json
try {
  Invoke-WebRequest -Uri "http://127.0.0.1:8000/auth/login" -Method Post -ContentType "application/json" -Body $badLogin -UseBasicParsing -ErrorAction Stop | Out-Null
  throw "Invalid login unexpectedly succeeded."
} catch {
  if ($_.Exception.Response.StatusCode.value__ -ne 401) { throw }
}

$goodLogin = @{ username = $settings["ADMIN_USERNAME"]; password = $settings["ADMIN_PASSWORD"] } | ConvertTo-Json
$session = Invoke-RestMethod -Uri "http://127.0.0.1:8000/auth/login" -Method Post -ContentType "application/json" -Body $goodLogin
$headers = @{ Authorization = "Bearer $($session.access_token)" }

$preflight = Invoke-WebRequest -Uri "http://127.0.0.1:8000/records" -Method Options -Headers @{
  Origin = "https://jack3712222.github.io"
  "Access-Control-Request-Method" = "GET"
  "Access-Control-Request-Headers" = "authorization"
} -UseBasicParsing
if ($preflight.Headers["Access-Control-Allow-Origin"] -ne "https://jack3712222.github.io") { throw "CORS origin validation failed." }

$models = Invoke-RestMethod -Uri "http://127.0.0.1:8000/models" -Headers $headers
if (-not $models.active) { throw "Active model was not returned." }

# A failed prior verification can only leave files with this generated prefix.
$staleRecords = @(Invoke-RestMethod -Uri "http://127.0.0.1:8000/records" -Headers $headers | Where-Object { $_.image_name -like "tooth-ai-api-test-*.png" })
foreach ($staleRecord in $staleRecords) {
  Invoke-RestMethod -Uri ("http://127.0.0.1:8000/records/{0}" -f $staleRecord.id) -Method Delete -Headers $headers | Out-Null
}

$temporaryImage = Join-Path $env:TEMP ("tooth-ai-api-test-" + [guid]::NewGuid().ToString() + ".png")
[IO.File]::WriteAllBytes($temporaryImage, [Convert]::FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="))

try {
  $rawResult = & curl.exe -s -X POST "http://127.0.0.1:8000/predict" -H "Authorization: Bearer $($session.access_token)" -F "file=@$temporaryImage;type=image/png"
  $prediction = $rawResult | ConvertFrom-Json
  if (-not $prediction.id) { throw "Prediction did not create a record: $rawResult" }
  $recordId = $prediction.id

  $records = Invoke-RestMethod -Uri "http://127.0.0.1:8000/records" -Headers $headers
  if (-not ($records.id -contains $recordId)) { throw "Created record was not listed." }

  $image = Invoke-WebRequest -Uri "http://127.0.0.1:8000/records/$recordId/image" -Headers $headers -UseBasicParsing
  if (-not $image.Headers["Content-Type"].StartsWith("image/png")) { throw "Stored image content type mismatch." }

  $review = Invoke-RestMethod -Uri "http://127.0.0.1:8000/records/$recordId" -Method Patch -Headers $headers -ContentType "application/json" -Body (@{
    cavity_count = 0; wisdom_tooth_count = 0; review_status = "reviewed"; note = "temporary automated verification"
  } | ConvertTo-Json)
  if ($review.review_status -ne "reviewed" -or $review.findings.total -ne 0) { throw "Review update mismatch." }

  $backup = Invoke-RestMethod -Uri "http://127.0.0.1:8000/backups" -Method Post -Headers $headers
  if (-not $backup.name) { throw "Manual backup did not return a file name." }

  Invoke-RestMethod -Uri "http://127.0.0.1:8000/records/$recordId" -Method Delete -Headers $headers | Out-Null
  try {
    Invoke-WebRequest -Uri "http://127.0.0.1:8000/records/$recordId" -Headers $headers -UseBasicParsing -ErrorAction Stop | Out-Null
    throw "Record remained after deletion."
  } catch {
    if ($_.Exception.Response.StatusCode.value__ -ne 404) { throw }
  }
} finally {
  if (Test-Path -LiteralPath $temporaryImage) { Remove-Item -LiteralPath $temporaryImage -Force }
}

Invoke-RestMethod -Uri "http://127.0.0.1:8000/auth/logout" -Method Post -Headers $headers | Out-Null
Write-Output "API end-to-end: PASS"
