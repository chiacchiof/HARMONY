# ============================================
# HARMONY - Script di Installazione
# ============================================
# Questo script installa automaticamente:
# - Harmony (React App)
# - SHyFTOO (MATLAB Package)
# - CTMCLib (MATLAB Package)
# ============================================

param(
    [string]$InstallPath = "C:\Harmony",
    [string]$Branch = "main",
    [switch]$NonInteractive
)

# Configurazione
$ErrorActionPreference = "Stop"
$installPath = $InstallPath
$harmonyRepo = "https://github.com/chiacchiof/HARMONY.git"
$shyftooRepo = "https://github.com/chiacchiof/SHyFTOO.git"
$ctmcRepo = "https://github.com/chiacchiof/CTMCLib.git"

# Banner
Clear-Host
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   HARMONY - Installazione Automatica" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
if ($Branch -ne "main") {
    Write-Host "[!] Installazione da branch: $Branch" -ForegroundColor Yellow
    Write-Host ""
}

# Funzione per verificare se un comando esiste
function Test-Command {
    param($Command)
    try {
        if (Get-Command $Command -ErrorAction Stop) {
            return $true
        }
    }
    catch {
        return $false
    }
}

# Funzione per scaricare repository da GitHub (ZIP o Git)
function Download-Repository {
    param(
        [string]$RepoUrl,
        [string]$DestinationPath,
        [string]$RepoName,
        [bool]$UseGit,
        [string]$BranchName = "main"
    )

    if ($UseGit) {
        # Usa Git clone con branch specifico
        Write-Host "  Clonazione con Git (branch: $BranchName)..." -ForegroundColor Gray

        # Temporaneamente disabilita ErrorActionPreference per Git
        $oldErrorAction = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'

        try {
            # Esegui git clone redirigendo tutto a null (silenzioso)
            $null = git clone -b $BranchName $RepoUrl $DestinationPath --quiet 2>&1

            # Verifica se la destinazione esiste per confermare successo
            if (Test-Path $DestinationPath) {
                Write-Host "  Clonazione completata!" -ForegroundColor Green
                return $true
            } else {
                Write-Host "  Errore: repository non clonato correttamente" -ForegroundColor Red
                return $false
            }
        }
        finally {
            # Ripristina ErrorActionPreference originale
            $ErrorActionPreference = $oldErrorAction
        }
    } else {
        # Scarica ZIP da GitHub
        try {
            $zipUrl = $RepoUrl -replace '\.git$', "/archive/refs/heads/$BranchName.zip"
            $zipFile = Join-Path $env:TEMP "$RepoName.zip"
            $extractPath = Join-Path $env:TEMP "$RepoName-extract"

            Write-Host "  Scarico ZIP da GitHub (branch: $BranchName)..." -ForegroundColor Gray
            Invoke-WebRequest -Uri $zipUrl -OutFile $zipFile -UseBasicParsing

            Write-Host "  Estrazione file..." -ForegroundColor Gray
            if (Test-Path $extractPath) {
                Remove-Item -Path $extractPath -Recurse -Force
            }
            Expand-Archive -Path $zipFile -DestinationPath $extractPath -Force

            # Sposta il contenuto (GitHub crea una cartella NOME-main)
            $extractedFolder = Get-ChildItem -Path $extractPath -Directory | Select-Object -First 1
            if (Test-Path $DestinationPath) {
                Remove-Item -Path $DestinationPath -Recurse -Force
            }
            Move-Item -Path $extractedFolder.FullName -Destination $DestinationPath -Force

            # Pulizia
            Remove-Item -Path $zipFile -Force -ErrorAction SilentlyContinue
            Remove-Item -Path $extractPath -Recurse -Force -ErrorAction SilentlyContinue

            return $true
        }
        catch {
            Write-Host "  [X] Errore: $($_.Exception.Message)" -ForegroundColor Red
            return $false
        }
    }
}

# ============================================
# 1. VERIFICA PREREQUISITI
# ============================================
Write-Host "[1/6] Verifica prerequisiti..." -ForegroundColor Yellow
Write-Host ""

# Verifica Git (opzionale - useremo download ZIP se non disponibile)
$useGit = Test-Command "git"
if ($useGit) {
    Write-Host "[OK] Git trovato: $(git --version)" -ForegroundColor Green
} else {
    Write-Host "[!] Git non trovato - uso download diretto da GitHub" -ForegroundColor Yellow
}

# Verifica Node.js
if (-not (Test-Command "node")) {
    Write-Host "[X] ERRORE: Node.js non installato!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Scarica e installa Node.js da: https://nodejs.org/" -ForegroundColor White
    Write-Host ""
    Read-Host "Premi INVIO per chiudere"
    exit 1
}
Write-Host "[OK] Node.js trovato: $(node --version)" -ForegroundColor Green

# Verifica npm
if (-not (Test-Command "npm")) {
    Write-Host "[X] ERRORE: npm non installato!" -ForegroundColor Red
    Write-Host ""
    Read-Host "Premi INVIO per chiudere"
    exit 1
}
Write-Host "[OK] npm trovato: $(npm --version)" -ForegroundColor Green

# Verifica MATLAB (opzionale)
$matlabPaths = @(
    "C:\Program Files\MATLAB",
    "C:\Program Files (x86)\MATLAB"
)
$matlabFound = $false
foreach ($matlabPath in $matlabPaths) {
    if (Test-Path $matlabPath) {
        Write-Host "[OK] MATLAB trovato in: $matlabPath" -ForegroundColor Green
        $matlabFound = $true
        break
    }
}
if (-not $matlabFound) {
    Write-Host "[!] ATTENZIONE: MATLAB non rilevato (opzionale per SHyFTOO e CTMCLib)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Prerequisiti verificati con successo!" -ForegroundColor Green
Write-Host ""

# ============================================
# 2. SCELTA PERCORSO DI INSTALLAZIONE
# ============================================
Write-Host "[2/6] Configurazione percorso di installazione..." -ForegroundColor Yellow
Write-Host ""

if (-not $NonInteractive) {
    Write-Host "Percorso predefinito: $installPath" -ForegroundColor White
    $userPath = Read-Host "Premi INVIO per confermare o inserisci un percorso diverso"

    if ($userPath -ne "") {
        $installPath = $userPath
    }
}

Write-Host ""
Write-Host "Installazione in: $installPath" -ForegroundColor Cyan
Write-Host ""

# Verifica se la cartella esiste gia
if (Test-Path $installPath) {
    Write-Host "[!] ATTENZIONE: La cartella $installPath esiste gia!" -ForegroundColor Yellow
    if (-not $NonInteractive) {
        $continue = Read-Host "Vuoi continuare? (s/n)"
        if ($continue -ne "s" -and $continue -ne "S") {
            Write-Host "Installazione annullata." -ForegroundColor Red
            Read-Host "Premi INVIO per chiudere"
            exit 0
        }
    } else {
        Write-Host "Modalita non-interattiva: continuo..." -ForegroundColor Yellow
    }
} else {
    # Crea la cartella
    New-Item -ItemType Directory -Path $installPath -Force | Out-Null
    Write-Host "[OK] Cartella creata: $installPath" -ForegroundColor Green
}

Write-Host ""

# ============================================
# 3. DOWNLOAD HARMONY
# ============================================
Write-Host "[3/6] Download Harmony da GitHub..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Branch selezionato: $Branch" -ForegroundColor Cyan
Write-Host ""

$harmonyPath = Join-Path $installPath "Harmony"
if (Test-Path $harmonyPath) {
    Write-Host "[!] Harmony gia presente, salto download..." -ForegroundColor Yellow
} else {
    $success = Download-Repository -RepoUrl $harmonyRepo -DestinationPath $harmonyPath -RepoName "Harmony" -UseGit $useGit -BranchName $Branch
    if (-not $success) {
        Write-Host "[X] ERRORE durante il download di Harmony" -ForegroundColor Red
        if (-not $NonInteractive) {
            Read-Host "Premi INVIO per chiudere"
        }
        exit 1
    }
}
Write-Host "[OK] Harmony pronto!" -ForegroundColor Green
Write-Host ""

# ============================================
# 4. DOWNLOAD SHyFTOO
# ============================================
Write-Host "[4/6] Download SHyFTOO da GitHub..." -ForegroundColor Yellow
Write-Host ""

$shyftooPath = Join-Path $installPath "SHyFTOO"
if (Test-Path $shyftooPath) {
    Write-Host "[!] SHyFTOO gia presente, salto download..." -ForegroundColor Yellow
} else {
    $success = Download-Repository -RepoUrl $shyftooRepo -DestinationPath $shyftooPath -RepoName "SHyFTOO" -UseGit $useGit
    if (-not $success) {
        Write-Host "[X] ERRORE durante il download di SHyFTOO" -ForegroundColor Red
        if (-not $NonInteractive) {
            Read-Host "Premi INVIO per chiudere"
        }
        exit 1
    }
}
Write-Host "[OK] SHyFTOO pronto!" -ForegroundColor Green
Write-Host ""

# ============================================
# 5. DOWNLOAD CTMCLib
# ============================================
Write-Host "[5/6] Download CTMCLib da GitHub..." -ForegroundColor Yellow
Write-Host ""

$ctmcPath = Join-Path $installPath "CTMCLib"
if (Test-Path $ctmcPath) {
    Write-Host "[!] CTMCLib gia presente, salto download..." -ForegroundColor Yellow
} else {
    $success = Download-Repository -RepoUrl $ctmcRepo -DestinationPath $ctmcPath -RepoName "CTMCLib" -UseGit $useGit
    if (-not $success) {
        Write-Host "[X] ERRORE durante il download di CTMCLib" -ForegroundColor Red
        if (-not $NonInteractive) {
            Read-Host "Premi INVIO per chiudere"
        }
        exit 1
    }
}
Write-Host "[OK] CTMCLib pronto!" -ForegroundColor Green
Write-Host ""

# ============================================
# 6. INSTALLAZIONE DIPENDENZE HARMONY
# ============================================
Write-Host "[6/6] Installazione dipendenze Harmony..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Questo potrebbe richiedere alcuni minuti..." -ForegroundColor White
Write-Host ""

Set-Location $harmonyPath
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "[X] ERRORE durante l'installazione delle dipendenze" -ForegroundColor Red
    Read-Host "Premi INVIO per chiudere"
    exit 1
}

Write-Host ""
Write-Host "[OK] Dipendenze installate con successo!" -ForegroundColor Green
Write-Host ""

# ============================================
# 7. CREAZIONE COLLEGAMENTI
# ============================================
Write-Host "Creazione collegamento sul Desktop..." -ForegroundColor Yellow

try {
    $WshShell = New-Object -ComObject WScript.Shell
    $desktopPath = [Environment]::GetFolderPath("Desktop")
    $shortcutPath = Join-Path $desktopPath "Harmony.lnk"

    $Shortcut = $WshShell.CreateShortcut($shortcutPath)

    # Punta al file .bat nella cartella di Harmony
    $batPath = Join-Path $harmonyPath "start-harmony.bat"
    $Shortcut.TargetPath = $batPath
    $Shortcut.WorkingDirectory = $harmonyPath
    $Shortcut.Description = "Avvia Harmony Fault Tree Editor"

    # Usa l'icona di Harmony se disponibile
    $iconPath = Join-Path $harmonyPath "public\favicon.ico"
    if (Test-Path $iconPath) {
        $Shortcut.IconLocation = $iconPath
    }

    $Shortcut.Save()
    Write-Host "[OK] Collegamento creato sul Desktop!" -ForegroundColor Green
}
catch {
    Write-Host "[!] Non e stato possibile creare il collegamento sul Desktop" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# INSTALLAZIONE COMPLETATA
# ============================================
Write-Host "============================================" -ForegroundColor Green
Write-Host "   INSTALLAZIONE COMPLETATA!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

Write-Host "Pacchetti installati:" -ForegroundColor Cyan
Write-Host "  - Harmony:  $harmonyPath (branch: $Branch)" -ForegroundColor White
Write-Host "  - SHyFTOO:  $shyftooPath" -ForegroundColor White
Write-Host "  - CTMCLib:  $ctmcPath" -ForegroundColor White
Write-Host ""

Write-Host "Per avviare Harmony:" -ForegroundColor Cyan
Write-Host "  Opzione 1: Doppio click sull'icona 'Harmony' sul Desktop" -ForegroundColor White
Write-Host "  Opzione 2: Doppio click sul file start-harmony.bat" -ForegroundColor White
Write-Host "  Opzione 3: Da terminale:" -ForegroundColor White
Write-Host "             cd $harmonyPath" -ForegroundColor Gray
Write-Host "             start-harmony.bat" -ForegroundColor Gray
Write-Host ""
Write-Host "  L'applicazione si aprira automaticamente su: http://localhost:3000" -ForegroundColor White
Write-Host ""

Write-Host "Per usare i pacchetti MATLAB:" -ForegroundColor Cyan
Write-Host "  Apri MATLAB ed esegui questi comandi:" -ForegroundColor White
Write-Host "  addpath('$shyftooPath')" -ForegroundColor Gray
Write-Host "  addpath('$ctmcPath')" -ForegroundColor Gray
Write-Host "  savepath  % Salva i percorsi permanentemente" -ForegroundColor Gray
Write-Host ""

Write-Host "============================================" -ForegroundColor Green
Write-Host ""

if (-not $NonInteractive) {
    Read-Host "Premi INVIO per chiudere"
}
