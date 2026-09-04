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

$repo = Split-Path -Parent $PSScriptRoot
$recovery = Join-Path ([Environment]::GetFolderPath('Desktop')) 'WORLD WAR ROGUE RECOVERY'
$snapshot = Join-Path $recovery 'source-snapshot'

Push-Location $repo
try {
    # A dirty tree means the snapshot will not match what is on GitHub. Worth a
    # warning rather than a refusal - a snapshot one commit behind still beats
    # one three weeks behind - but you should know.
    $dirty = git status --porcelain
    if ($dirty) {
        Write-Warning 'Uncommitted changes - the snapshot will NOT include them:'
        $dirty | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkYellow }
        Write-Host ''
    }

    $commit  = (git rev-parse HEAD).Trim()
    $short   = (git rev-parse --short HEAD).Trim()
    $subject = (git log -1 --pretty=%s).Trim()
    $branch  = (git rev-parse --abbrev-ref HEAD).Trim()

    # Wipe first. Extracting over the top leaves files that have since been
    # deleted from the repo sitting in the snapshot, and a recovery folder that
    # quietly disagrees with the repo is worse than one that is simply old.
    if (Test-Path $snapshot) { Remove-Item $snapshot -Recurse -Force }
    New-Item -ItemType Directory -Path $snapshot -Force | Out-Null

    # git archive writes a tar of exactly the tracked files at HEAD. Windows 10
    # and 11 ship tar, so this needs no extra tooling.
    $tar = Join-Path $env:TEMP 'wwr-snapshot.tar'
    git archive --format=tar -o $tar HEAD
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
}
finally {
    Pop-Location
}
