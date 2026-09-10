# Stop hook: warns once if structural source files changed in this session without
# ARCHITECTURE.md / CLAUDE.md also being touched. Loop-safe via stop_hook_active.
# Exit 2 surfaces the stderr message back to the model; exit 0 is silent.

$ErrorActionPreference = 'SilentlyContinue'

# Read the hook payload; bail (silently) if we're already in a stop-hook continuation.
$raw = [Console]::In.ReadToEnd()
try { $in = $raw | ConvertFrom-Json } catch { $in = $null }
if ($in -and $in.stop_hook_active) { exit 0 }

# Files changed since upstream (unpushed commits) + uncommitted, deduped.
$upstream = git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>$null
$range = if ($upstream) { "$upstream...HEAD" } else { 'HEAD~3...HEAD' }
$files = @()
$files += git diff --name-only $range 2>$null
$files += git diff --name-only HEAD 2>$null
$files += git diff --name-only --cached 2>$null
$files = $files | Where-Object { $_ } | Sort-Object -Unique
if (-not $files) { exit 0 }

# High-signal structural files: a change here usually needs a doc update.
$triggerPattern = 'src/store/useWorksheetStore\.tsx$|src/config/(exerciseRegistry|exerciseUI|appstructure|baseSettings|exerciseCatalog)\.|src/services/persistence\.ts$'
$trigger = $files | Where-Object { $_ -match $triggerPattern }
if (-not $trigger) { exit 0 }

# Fast path: the docs show up in the diff themselves.
if ($files | Where-Object { $_ -match '^(ARCHITECTURE|CLAUDE)\.md$' }) { exit 0 }

# The diff can NEVER show them in this repo: .gitignore excludes *.md (README aside), so
# the docs are untracked by design and git diff is blind to them. Fall back to mtime —
# docs at least as new as the newest structural change count as kept in sync.
$root = git rev-parse --show-toplevel 2>$null
if (-not $root) { exit 0 }

function Newest-Write([string[]] $relPaths) {
    $times = foreach ($rel in $relPaths) {
        $full = Join-Path $root $rel
        if (Test-Path -LiteralPath $full) { (Get-Item -LiteralPath $full).LastWriteTimeUtc }
    }
    if ($times) { ($times | Measure-Object -Maximum).Maximum } else { $null }
}

$docTime = Newest-Write @('ARCHITECTURE.md', 'CLAUDE.md')
$srcTime = Newest-Write $trigger

# Docs missing entirely, or older than the code they describe -> nag. Anything else
# (docs newer, or the source file no longer on disk) is treated as in sync.
if ($docTime -and $srcTime -and $docTime -ge $srcTime) { exit 0 }
if ($docTime -and -not $srcTime) { exit 0 }

$list = ($trigger | ForEach-Object { "  - $_" }) -join "`n"
[Console]::Error.WriteLine("Doc-sync check: structural files changed without updating ARCHITECTURE.md / CLAUDE.md:`n$list`nUpdate the docs (state table / registry table / file map / §13) per the doc-sync rule in CLAUDE.md, or confirm no doc change is needed, then stop.")
exit 2
