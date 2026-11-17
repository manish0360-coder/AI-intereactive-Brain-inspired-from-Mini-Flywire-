# Runs the M11 route-change demonstration once, holding a Windows "system required" execution state for the run's
# lifetime (the per-process request media players make; no setting is changed, and it is released when this script
# ends). Adapted from experiments/cf06/results/run/run_gate6_awake.ps1.
param([string]$Repo, [string]$Log)
Add-Type -Namespace Win32 -Name Power -MemberDefinition '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint esFlags);'
$ES_CONTINUOUS = [uint32]2147483648
$ES_SYSTEM_REQUIRED = [uint32]1
$prev = [Win32.Power]::SetThreadExecutionState($ES_CONTINUOUS -bor $ES_SYSTEM_REQUIRED)
Set-Location $Repo
$head = (git rev-parse HEAD)
$dirty = @(git status --porcelain).Count
$now = { (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ') }
"== $(& $now) m11 launch at HEAD $head, changed paths: $dirty, wake request held (previous state $prev), pid $PID" | Out-File -FilePath $Log -Encoding utf8
$proc = Start-Process -FilePath 'node' -ArgumentList 'experiments/m11_routes/run_demo.mjs', '--domain', 'm11' -WorkingDirectory $Repo -RedirectStandardOutput "$Log.stdout" -RedirectStandardError "$Log.stderr" -NoNewWindow -PassThru
$null = $proc.Handle   # keep the handle so that ExitCode is available after the process ends
"== $(& $now) node pid $($proc.Id)" | Out-File -FilePath $Log -Append -Encoding utf8
$proc.WaitForExit()
"== $(& $now) exit $($proc.ExitCode)" | Out-File -FilePath $Log -Append -Encoding utf8
[Win32.Power]::SetThreadExecutionState($ES_CONTINUOUS) | Out-Null
