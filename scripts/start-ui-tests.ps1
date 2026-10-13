$ErrorActionPreference = 'Stop'
$previousJavaHome = $env:JAVA_HOME
try {
    if (-not $env:JAVA_HOME) {
        $compiler = Get-Command javac -ErrorAction SilentlyContinue
        if ($compiler) { $env:JAVA_HOME = Split-Path (Split-Path $compiler.Source) }
        else {
            $bundledCompiler = Get-ChildItem (Join-Path $env:USERPROFILE '.vscode/extensions/redhat.java-*/jre/*/bin/javac.exe') -ErrorAction SilentlyContinue |
                Sort-Object FullName -Descending | Select-Object -First 1
            if ($bundledCompiler) { $env:JAVA_HOME = Split-Path (Split-Path $bundledCompiler.FullName) }
        }
    }
    if (-not $env:JAVA_HOME) { throw 'Set JAVA_HOME to a JDK 17 or newer.' }
    Push-Location (Join-Path $PSScriptRoot '../trisikol-backend')
    try {
        & ./mvnw.cmd spring-boot:test-run '-Dspring-boot.run.main-class=com.trisikol.ui.UiTestServer'
        if ($LASTEXITCODE -ne 0) { throw "UI test server exited with code $LASTEXITCODE." }
    } finally { Pop-Location }
} finally { $env:JAVA_HOME = $previousJavaHome }
