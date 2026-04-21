$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Copy-IfMissing($src, $dst) {
    if (-not (Test-Path $dst)) {
        Copy-Item $src $dst
        Write-Host "Created $dst"
    } else {
        Write-Host "Exists: $dst"
    }
}

Copy-IfMissing "secrets\postgres.env.example" "secrets\postgres.env"
Copy-IfMissing "secrets\backend.env.example" "secrets\backend.env"
Copy-IfMissing "frontend\env.local.example" "frontend\.env.local"
Write-Host "Отредактируйте secrets\*.env и frontend\.env.local при необходимости."
