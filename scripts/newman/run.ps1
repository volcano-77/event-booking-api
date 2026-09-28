param(
  [string]$CollectionPath = "postman/Event-Booking-API.postman_collection.json",
  [string]$EnvironmentPath = "postman/local.postman_environment.json",
  [string]$RunId = (Get-Date -Format "yyyyMMdd-HHmmss")
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot "../.."))
$collection = [IO.Path]::GetFullPath((Join-Path $repoRoot $CollectionPath))
$environment = [IO.Path]::GetFullPath((Join-Path $repoRoot $EnvironmentPath))
$rootPrefix = $repoRoot.TrimEnd('\') + '\'

foreach ($path in @($collection, $environment)) {
  if (-not $path.StartsWith($rootPrefix, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Collection and environment files must be inside the project: $path"
  }
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    throw "Required Newman input does not exist: $path"
  }
}

$newman = Join-Path $repoRoot "node_modules/.bin/newman.cmd"
if (-not (Test-Path -LiteralPath $newman -PathType Leaf)) {
  throw "Newman is not installed. Run npm install in the project first."
}

$organizerEmail = $env:EVENT_BOOKING_ORGANIZER_EMAIL
$organizerPassword = $env:EVENT_BOOKING_ORGANIZER_PASSWORD
if ([string]::IsNullOrWhiteSpace($organizerEmail) -or [string]::IsNullOrWhiteSpace($organizerPassword)) {
  throw "Set EVENT_BOOKING_ORGANIZER_EMAIL and EVENT_BOOKING_ORGANIZER_PASSWORD in the current shell before running Newman."
}

if ($RunId -notmatch '^[A-Za-z0-9._-]+$') {
  throw "RunId may contain only letters, numbers, dots, underscores, and hyphens."
}

$evidenceRoot = [IO.Path]::GetFullPath((Join-Path $repoRoot "evidence/newman"))
$outputDir = [IO.Path]::GetFullPath((Join-Path $evidenceRoot $RunId))
if (-not $outputDir.StartsWith(($evidenceRoot.TrimEnd('\') + '\'), [StringComparison]::OrdinalIgnoreCase)) {
  throw "Unexpected evidence output path: $outputDir"
}
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

Write-Output "Starting Newman run: $RunId"
Write-Output "Evidence directory: $outputDir"

& $newman run $collection `
  --environment $environment `
  --env-var "organizerEmail=$organizerEmail" `
  --env-var "organizerPassword=$organizerPassword" `
  --reporters cli,json,junit `
  --reporter-json-export (Join-Path $outputDir "newman-results.json") `
  --reporter-junit-export (Join-Path $outputDir "newman-results.xml")

$newmanExitCode = $LASTEXITCODE
Write-Output "Newman finished with exit code $newmanExitCode. Review the generated evidence before recording any outcome."
exit $newmanExitCode
