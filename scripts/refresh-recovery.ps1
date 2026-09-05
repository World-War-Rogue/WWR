<#
    Rebuilds the recovery folder on the Desktop from the last commit.

    Run it from the project folder:

        npm run recovery

    What it copies is exactly what git tracks at HEAD, which is the point: it
    can only copy files that are already committed, so a file you forgot to
    commit shows up as missing from the snapshot instead of quietly living in
    one place only. It also means nothing ignored can leak in - .dev.vars,
    .env, dist and node_modules are excluded by definition, not by a rule this
    script has to remember.

    NOTHING IN THE RECOVERY FOLDER IS A SECRET. That is deliberate. Passwords,
    API tokens and the Cloudflare secrets are not there and must never be added:
    the folder syncs to OneDrive, so anything in it is on every machine you are
    signed in to. INFRASTRUCTURE.md lists which secrets exist and where to
    regenerate them, which is what you actually need after a machine dies.
#>

$ErrorActionPreference = 'Stop'

<#
    Find git.

    It is not on PATH in this PowerShell, and adding it there is a machine
    setting that a script has no business changing. GitHub Desktop ships its
    own copy, so the one already installed is found rather than required: the
    folder is versioned (app-3.4.x) so the newest is taken, and the standalone
    installs are checked first in case one is there.
#>
function Resolve-Git {
    $onPath = Get-Command git -ErrorAction SilentlyContinue
    if ($onPath) { return $onPath.Source }

    $candidates = @(
        "$env:ProgramFiles\Git\cmd\git.exe",
        "${env:ProgramFiles(x86)}\Git\cmd\git.exe",
        "$env:LOCALAPPDATA\Programs\Git\cmd\git.exe"
    )
    foreach ($path in $candidates) {
        if ($path -and (Test-Path $path)) { return $path }
    }

    # GitHub Desktop's bundled git. The app folder carries the version, so sort
    # descending and take the newest rather than guessing a number.
    $desktop = Join-Path $env:LOCALAPPDATA 'GitHubDesktop'
    if (Test-Path $desktop) {
        $found = Get-ChildItem $desktop -Filter 'app-*' -Directory -ErrorAction SilentlyContinue |
            Sort-Object Name -Descending |
            ForEach-Object { Join-Path $_.FullName 'resources\app\git\cmd\git.exe' } |
            Where-Object { Test-Path $_ } |
            Select-Object -First 1
        if ($found) { return $found }
    }

    throw @'
Could not find git.

It is not on PATH and it is not in any of the usual places. If GitHub Desktop
is installed, look for git.exe under:

    %LOCALAPPDATA%\GitHubDesktop\app-<version>\resources\app\git\cmd\

and set WWR_GIT to its full path before running this again:

    $env:WWR_GIT = 'C:\full\path\to\git.exe'
    npm run recovery
'@
}

$git = if ($env:WWR_GIT -and (Test-Path $env:WWR_GIT)) { $env:WWR_GIT } else { Resolve-Git }

$repo = Split-Path -Parent $PSScriptRoot
$recovery = Join-Path ([Environment]::GetFolderPath('Desktop')) 'WORLD WAR ROGUE RECOVERY'
$snapshot = Join-Path $recovery 'source-snapshot'

Push-Location $repo
try {
    # A dirty tree means the snapshot will not match what is on GitHub. Worth a
    # warning rather than a refusal - a snapshot one commit behind still beats
    # one three weeks behind - but you should know.
    $dirty = & $git status --porcelain
    if ($dirty) {
        Write-Warning 'Uncommitted changes - the snapshot will NOT include them:'
        $dirty | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkYellow }
        Write-Host ''
    }

    $commit  = (& $git rev-parse HEAD).Trim()
    $short   = (& $git rev-parse --short HEAD).Trim()
    $subject = (& $git log -1 --pretty=%s).Trim()
    $branch  = (& $git rev-parse --abbrev-ref HEAD).Trim()

    # Wipe first. Extracting over the top leaves files that have since been
    # deleted from the repo sitting in the snapshot, and a recovery folder that
    # quietly disagrees with the repo is worse than one that is simply old.
    if (Test-Path $snapshot) { Remove-Item $snapshot -Recurse -Force }
    New-Item -ItemType Directory -Path $snapshot -Force | Out-Null

    # git archive writes a tar of exactly the tracked files at HEAD. Windows 10
    # and 11 ship tar, so this needs no extra tooling.
    $tar = Join-Path $env:TEMP 'wwr-snapshot.tar'
    & $git archive --format=tar -o $tar HEAD
    tar -x -f $tar -C $snapshot
    Remove-Item $tar -Force

    # The two things you would reach for first in a real recovery, lifted to the
    # top level so they are one click from the folder you open.
    foreach ($dir in 'migrations', 'scripts') {
        $dest = Join-Path $recovery $dir
        if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
        Copy-Item (Join-Path $snapshot $dir) $dest -Recurse -Force
    }

    $files = (Get-ChildItem $snapshot -Recurse -File).Count
    $stamp = (Get-Date).ToString('yyyy-MM-dd HH:mm')

    @"
WORLD WAR ROGUE - recovery snapshot
===================================

Taken     $stamp
Branch    $branch
Commit    $commit
          "$subject"
Files     $files

This is a copy of every file git tracked at that commit. It holds no secrets
and no node_modules; both are meant to be absent. Read START-HERE.md first - it
explains what to do with all of this.

To prove this snapshot really is that commit, in a fresh clone run

    git checkout $short

and compare. To refresh this folder after more work, run

    npm run recovery
"@ | Set-Content (Join-Path $recovery 'MANIFEST.txt') -Encoding UTF8

    Write-Host ''
    Write-Host "Recovery folder refreshed - $files files at $short" -ForegroundColor Green
    Write-Host "  $recovery"
    Write-Host "  git: $git" -ForegroundColor DarkGray
}
finally {
    Pop-Location
}
