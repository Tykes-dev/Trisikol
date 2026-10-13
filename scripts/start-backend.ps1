param(
    [ValidateSet('local', 'mysql')][string]$Profile = 'local',
    [switch]$BootstrapAdmin
)
$ErrorActionPreference = 'Stop'
$previousJavaHome = $env:JAVA_HOME
$previousAdminMobile = $env:TRISIKOL_ADMIN_MOBILE
$previousAdminPassword = $env:TRISIKOL_ADMIN_PASSWORD
$backendPath = Join-Path $PSScriptRoot '../trisikol-backend'

try {
    if (-not $env:JAVA_HOME) {
        $compiler = Get-Command javac -ErrorAction SilentlyContinue
        if ($compiler) {
            $env:JAVA_HOME = Split-Path (Split-Path $compiler.Source)
        } else {
            # VS Code's Java extension can include a full JDK on Windows.
            $bundledCompiler = Get-ChildItem (Join-Path $env:USERPROFILE '.vscode/extensions/redhat.java-*/jre/*/bin/javac.exe') -ErrorAction SilentlyContinue |
                Sort-Object FullName -Descending | Select-Object -First 1
            if ($bundledCompiler) { $env:JAVA_HOME = Split-Path (Split-Path $bundledCompiler.FullName) }
        }
    }
    if (-not $env:JAVA_HOME -or -not (Test-Path (Join-Path $env:JAVA_HOME 'bin/javac.exe'))) {
        throw 'Set JAVA_HOME to a JDK 17 or newer, then rerun this script.'
    }
    if ($BootstrapAdmin) {
        $env:TRISIKOL_ADMIN_MOBILE = Read-Host 'First admin mobile (11 digits, starts with 09)'
        $adminSecret = Read-Host 'First admin password (12+ characters)' -AsSecureString
        $env:TRISIKOL_ADMIN_PASSWORD = ([System.Net.NetworkCredential]::new('', $adminSecret)).Password
        $adminSecret.Dispose()
    }
    Push-Location $backendPath
    try {
        & ./mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=$Profile"
        if ($LASTEXITCODE -ne 0) { throw "Backend exited with code $LASTEXITCODE." }
    } finally { Pop-Location }
} finally {
    $env:JAVA_HOME = $previousJavaHome
    $env:TRISIKOL_ADMIN_MOBILE = $previousAdminMobile
    $env:TRISIKOL_ADMIN_PASSWORD = $previousAdminPassword
}
