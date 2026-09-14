# PreToolUse hook: anything that would let a commit skip the gate (.githooks/pre-commit —
# npm run check + the visual gate) becomes a permission prompt only a human can answer.
# permissionDecision "ask" forces that prompt regardless of auto-accept mode; exit 0 with no
# output leaves every other command alone.

$ErrorActionPreference = 'SilentlyContinue'

$raw = [Console]::In.ReadToEnd()
try { $in = $raw | ConvertFrom-Json } catch { exit 0 }
$cmd = $in.tool_input.command
if (-not $cmd) { exit 0 }

$reason = $null

# git commit --no-verify / -n (also inside a short-flag cluster like -nm), which skips the
# pre-commit hook entirely.
if ($cmd -match 'git\s+(?:-[^\s]+\s+)*commit') {
    if ($cmd -match '--no-verify') { $reason = 'git commit --no-verify skips the pre-commit gate.' }
    elseif ($cmd -match '(^|\s)-[a-zA-Z]*n[a-zA-Z]*(\s|$)') { $reason = 'git commit -n skips the pre-commit gate.' }
}

# The two escape hatches the hook script itself honours.
if (-not $reason -and $cmd -match 'SKIP_GATE|SKIP_VISUAL') {
    $reason = 'SKIP_GATE / SKIP_VISUAL turns the commit gate off.'
}

# Unwiring the hooks path (or pointing it elsewhere) disables the gate for every later
# commit. Pointing it AT .githooks is the setup direction, so npm run prepare stays quiet.
$isSetup = $cmd -match 'core\.hooksPath\s+["'']?\.githooks["'']?\s*$'
if (-not $reason -and -not $isSetup) {
    if ($cmd -match 'core\.hooksPath') {
        $reason = 'core.hooksPath change would move or remove the commit gate.'
    }
    elseif ($cmd -match 'git\s+config' -and $cmd -match 'hook') {
        $reason = 'git config on hooks would change the commit gate.'
    }
}

if (-not $reason) { exit 0 }

$out = @{
    hookSpecificOutput = @{
        hookEventName            = 'PreToolUse'
        permissionDecision       = 'ask'
        permissionDecisionReason = "Commit-gate bypass: the tests/visual gate would be skipped. Only a human may approve this. ($reason)"
    }
}
$out | ConvertTo-Json -Compress -Depth 5
exit 0
