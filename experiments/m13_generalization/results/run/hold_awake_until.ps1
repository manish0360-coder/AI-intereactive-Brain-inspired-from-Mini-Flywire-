# Holds "system and display required" until the given process exits (no setting is changed; released at exit).
param([int]$WaitPid)
Add-Type -Namespace Win32 -Name Power2 -MemberDefinition '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint esFlags);'
$ES_CONTINUOUS = [uint32]2147483648
[Win32.Power2]::SetThreadExecutionState($ES_CONTINUOUS -bor [uint32]1 -bor [uint32]2) | Out-Null
Wait-Process -Id $WaitPid -ErrorAction SilentlyContinue
[Win32.Power2]::SetThreadExecutionState($ES_CONTINUOUS) | Out-Null
