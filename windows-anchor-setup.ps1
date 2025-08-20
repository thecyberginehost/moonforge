# windows-anchor-setup.ps1
# Run this in PowerShell as Administrator

Write-Host "=========================================="
Write-Host "🚀 MOONFORGE WINDOWS SETUP"
Write-Host "=========================================="

# Check if running as Administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator"))
{
    Write-Host "❌ This script must be run as Administrator" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'"
    exit 1
}

# Enable Developer Mode for symlinks (optional, helps with some issues)
Write-Host "📝 Enabling Developer Mode features..."
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock" /t REG_DWORD /f /v "AllowDevelopmentWithoutDevLicense" /d "1"

# Install Chocolatey if not present
if (!(Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Host "📦 Installing Chocolatey..."
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
}

# Install OpenSSL (fixes the OpenSSL error)
Write-Host "📦 Installing OpenSSL..."
choco install openssl -y

# Set OpenSSL environment variables
$openSSLPath = "C:\Program Files\OpenSSL-Win64"
[Environment]::SetEnvironmentVariable("OPENSSL_DIR", $openSSLPath, "User")
[Environment]::SetEnvironmentVariable("OPENSSL_LIB_DIR", "$openSSLPath\lib", "User")
[Environment]::SetEnvironmentVariable("OPENSSL_INCLUDE_DIR", "$openSSLPath\include", "User")
$env:OPENSSL_DIR = $openSSLPath

Write-Host "✅ OpenSSL installed and configured"

# Install Rust if not present
if (!(Get-Command rustc -ErrorAction SilentlyContinue)) {
    Write-Host "📦 Installing Rust..."
    Invoke-WebRequest https://win.rustup.rs/x86_64 -OutFile rustup-init.exe
    .\rustup-init.exe -y
    Remove-Item rustup-init.exe
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

# Install Solana CLI
Write-Host "📦 Installing Solana CLI..."
$soljson = Invoke-RestMethod -Uri "https://api.github.com/repos/solana-labs/solana/releases/latest"
$solanaVersion = $soljson.tag_name
$solanaUrl = "https://github.com/solana-labs/solana/releases/download/$solanaVersion/solana-release-x86_64-pc-windows-msvc.tar.bz2"

# Download and extract Solana
Invoke-WebRequest -Uri $solanaUrl -OutFile solana-release.tar.bz2
# Note: You'll need 7-Zip or similar to extract .tar.bz2 on Windows
if (Get-Command 7z -ErrorAction SilentlyContinue) {
    7z x solana-release.tar.bz2
    7z x solana-release.tar
} else {
    Write-Host "Installing 7-Zip to extract Solana..."
    choco install 7zip -y
    & "C:\Program Files\7-Zip\7z.exe" x solana-release.tar.bz2
    & "C:\Program Files\7-Zip\7z.exe" x solana-release.tar
}

# Move Solana to Program Files
Move-Item -Path "solana-release" -Destination "C:\Program Files\Solana" -Force
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Program Files\Solana\bin", "User")
$env:Path += ";C:\Program Files\Solana\bin"

# Clean up
Remove-Item solana-release.tar.bz2 -ErrorAction SilentlyContinue
Remove-Item solana-release.tar -ErrorAction SilentlyContinue

# Install cargo-build-sbf
Write-Host "📦 Installing cargo-build-sbf..."
cargo install solana-cargo-build-sbf

# Install Anchor CLI with correct version
Write-Host "📦 Installing Anchor CLI v0.29.0..."
cargo install --git https://github.com/coral-xyz/anchor --tag v0.29.0 anchor-cli --locked

Write-Host ""
Write-Host "=========================================="
Write-Host "✅ SETUP COMPLETE!"
Write-Host "=========================================="
Write-Host ""
Write-Host "Please close and reopen PowerShell, then run:"
Write-Host "  cd $pwd"
Write-Host "  anchor build"
Write-Host ""
Write-Host "If build still fails, try:"
Write-Host "  cargo build-sbf --manifest-path programs/bonding-curve/Cargo.toml"
Write-Host "=========================================="