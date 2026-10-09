param(
  [string]$CollectionPath = "postman/Event-Booking-API.postman_collection.json",
  [string]$EnvironmentPath = "postman/local.postman_environment.json"
)
$ErrorActionPreference = "Stop"
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot "../.."))
foreach ($relative in @($CollectionPath,$EnvironmentPath)) {
  $resolved = [IO.Path]::GetFullPath((Join-Path $repoRoot $relative))
  if (-not $resolved.StartsWith(($repoRoot.TrimEnd('\')+'\'),[StringComparison]::OrdinalIgnoreCase)) {
    throw "Inputs must stay inside the project."
  }
}
& node (Join-Path $PSScriptRoot "run.js") $CollectionPath $EnvironmentPath
exit $LASTEXITCODE
