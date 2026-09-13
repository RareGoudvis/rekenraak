# Stop hook: warns once if structural source files changed in this session without
# .claude/docs/ARCHITECTURE.md / CLAUDE.md also being touched. Loop-safe via
# stop_hook_active. Exit 2 surfaces the stderr message back to the model; exit 0 is silent.

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
$msgs = @()

# The docs are tracked, so a real doc update shows up in the same diff. Git paths use
# forward slashes, hence the .claude/docs/ prefix rather than a Windows separator.
if ($trigger -and -not ($files | Where-Object { $_ -match '^(\.claude/docs/ARCHITECTURE|CLAUDE)\.md$' })) {
    $list = ($trigger | ForEach-Object { "  - $_" }) -join "`n"
    $msgs += "Doc-sync check: structural files changed without updating .claude/docs/ARCHITECTURE.md / CLAUDE.md:`n$list`nUpdate the docs (state table / registry table / file map / §13) per the doc-sync rule in CLAUDE.md, or confirm no doc change is needed."
}

# The public exercise catalogue (oefeningen.html + public/oefeningen/*.png) is generated
# from the sidebar leaves; a leaf change without a regenerated catalogue ships a stale page.
# catalogue.test.ts fails `npm run check` on a mismatch — this is the earlier nudge.
$leafChange = $files | Where-Object { $_ -match 'src/config/appstructure\.ts$' }
if ($leafChange -and -not ($files | Where-Object { $_ -match '^oefeningen\.html$' })) {
    $msgs += "Catalogue check: src/config/appstructure.ts changed but oefeningen.html did not. Run 'npm run catalogue' against a dev server and commit oefeningen.html + public/oefeningen/*.png (see TESTING.md), or confirm no leaf was added/renamed."
}

if (-not $msgs) { exit 0 }
[Console]::Error.WriteLine(($msgs -join "`n`n") + "`nThen stop.")
exit 2
