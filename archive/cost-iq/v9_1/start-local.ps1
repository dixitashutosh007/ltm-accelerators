$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
Set-Location .\reference-api
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js is required." }
Write-Host "Starting Cost IQ v9.1 reference API on http://127.0.0.1:8787"
node .\server.mjs
