$ErrorActionPreference = 'Stop'
$expected = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'server.mjs'))
$pidFile = Join-Path (Split-Path $PSScriptRoot) 'data\opencode-adapter\state\bridge.pid'
if (!(Test-Path -LiteralPath $pidFile)) {
    Write-Host 'No managed NikoLink process found. Nothing was stopped.'
    exit
}
$bridgeId = 0
if (![int]::TryParse((Get-Content -LiteralPath $pidFile -Raw).Trim(), [ref]$bridgeId)) { throw 'Invalid NikoLink PID file.' }
$bridge = Get-CimInstance Win32_Process -Filter "ProcessId=$bridgeId"
if (!$bridge) { Write-Host 'NikoLink is already stopped.'; exit }
if ($bridge.Name -ne 'node.exe' -or !$bridge.CommandLine.Contains($expected)) { throw 'Process identity does not match NikoLink; refusing to stop it.' }
$processes = @(Get-CimInstance Win32_Process)
$children = @($processes | Where-Object { $_.ParentProcessId -eq $bridgeId -and $_.Name -eq 'opencode-cli.exe' -and $_.CommandLine -match 'serve --hostname 127.0.0.1' })
$branch = @($processes | Where-Object { $_.ParentProcessId -in $children.ProcessId })
$descendants = @()
while ($branch.Count) {
    $descendants += $branch
    $parents = @($branch.ProcessId)
    $branch = @($processes | Where-Object { $_.ParentProcessId -in $parents -and $_.ProcessId -notin $descendants.ProcessId })
}
Stop-Process -Id $bridgeId
foreach ($descendant in $descendants) { Stop-Process -Id $descendant.ProcessId -ErrorAction SilentlyContinue }
foreach ($child in $children) { Stop-Process -Id $child.ProcessId -ErrorAction SilentlyContinue }
Write-Host 'NikoLink and its isolated OpenCode process have stopped. SnowLuma and your development OpenCode were not touched.'
