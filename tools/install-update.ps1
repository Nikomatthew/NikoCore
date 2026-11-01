param([string]$Target,[switch]$AllowUnrecognized)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
if (-not $Target) {
  Add-Type -AssemblyName System.Windows.Forms
  $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
  $dialog.Description = '选择 NikoLink 安装目录'
  if ($dialog.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) { exit 0 }
  $Target = $dialog.SelectedPath
  $dialog.Dispose()
}
function Assert-SafePath($base, $relative) {
  if ([string]::IsNullOrWhiteSpace($relative) -or $relative -match '[\\:]' -or $relative.StartsWith('/') -or $relative.Split('/') -contains '..') { throw '更新清单路径无效' }
  $full = [IO.Path]::GetFullPath((Join-Path $base $relative))
  if (-not $full.StartsWith($base + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw '更新路径越界' }
  $cursor = $full
  while ($cursor -and $cursor.Length -ge $base.Length) {
    if ((Test-Path -LiteralPath $cursor) -and ((Get-Item -LiteralPath $cursor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw '更新路径包含链接，已停止' }
    $cursor = Split-Path $cursor
  }
  return $full
}
try {
  $Target = [IO.Path]::GetFullPath($Target).TrimEnd('\')
  if ((Get-Item -LiteralPath $Target -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw '目标目录不允许是链接' }
  if (-not $AllowUnrecognized -and -not (Test-Path -LiteralPath (Join-Path $Target 'NikoLink.exe') -PathType Leaf)) { throw '目标目录未找到 NikoLink.exe' }
  $exe = Join-Path $Target 'NikoLink.exe'
  $active = Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -and $_.ExecutablePath.Equals($exe,[StringComparison]::OrdinalIgnoreCase) }
  if ($active) { throw 'NikoLink仍在运行，请先退出后安装更新' }
  $manifest = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'update.json') -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($manifest.application -ne 'NikoLink' -or $manifest.format -ne 1 -or -not $manifest.files -or $manifest.files.Count -gt 100) { throw '不是支持的NikoLink更新包' }
  if ($manifest.version -notmatch '^\d+\.\d+\.\d+$') { throw '更新版本格式无效' }
  if ($manifest.baseExecutableSHA256 -and (Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash -ne $manifest.baseExecutableSHA256) { throw '当前程序版本与此增量更新包不匹配，请使用完整发布包或对应版本更新包' }
  $seen = @{}
  $operations = @()
  foreach ($item in $manifest.files) {
    $relative = [string]$item.path
    if ($relative -notmatch '^(NikoLink\.exe|README\.md|LICENSES\.md|SHA256SUMS\.txt|tools/(install\.ps1|find-python\.ps1|download-media\.ps1|task-tool-worker\.mjs|asr/(server\.py|requirements\.txt|model-hashes\.json)))$') { throw "更新不允许覆盖该路径：$relative" }
    if ($seen.ContainsKey($relative.ToLowerInvariant())) { throw '更新清单存在重复路径' }
    $seen[$relative.ToLowerInvariant()] = $true
    $source = Assert-SafePath (Join-Path $PSScriptRoot 'payload') $relative
    $destination = Assert-SafePath $Target $relative
    if (-not (Test-Path -LiteralPath $source -PathType Leaf) -or $item.sha256 -notmatch '^[a-fA-F0-9]{64}$') { throw '更新文件缺失或校验值无效' }
    if ((Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash -ne $item.sha256) { throw "更新校验失败：$relative" }
    $operations += [pscustomobject]@{relative=$relative;source=$source;destination=$destination;existed=(Test-Path -LiteralPath $destination)}
  }
  $backup = Join-Path $Target ('update-backups\' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
  New-Item -ItemType Directory $backup -Force | Out-Null
  foreach ($op in $operations) {
    if ($op.existed) {
      $saved = Join-Path $backup $op.relative
      New-Item -ItemType Directory (Split-Path $saved) -Force | Out-Null
      Copy-Item -LiteralPath $op.destination -Destination $saved -Force
    }
  }
  $applied = @()
  try {
    foreach ($op in $operations) {
      $applied += $op
      New-Item -ItemType Directory (Split-Path $op.destination) -Force | Out-Null
      Copy-Item -LiteralPath $op.source -Destination $op.destination -Force
      $expected = ($manifest.files | Where-Object { $_.path -eq $op.relative }).sha256
      if ((Get-FileHash -LiteralPath $op.destination -Algorithm SHA256).Hash -ne $expected) { throw '安装后的文件校验失败' }
    }
  } catch {
    foreach ($op in $applied) {
      if ($op.existed) { Copy-Item -LiteralPath (Join-Path $backup $op.relative) -Destination $op.destination -Force }
      elseif (Test-Path -LiteralPath $op.destination) { Remove-Item -LiteralPath $op.destination -Force }
    }
    throw
  }
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'update.json') -Destination (Join-Path $backup 'update.json')
  $marker = @{application='NikoLink';directory=$Target;version=$manifest.version} | ConvertTo-Json
  [IO.File]::WriteAllText((Join-Path $Target 'nikolink-install.json'),$marker,[Text.UTF8Encoding]::new($false))
  Write-Host "NikoLink更新完成。原文件备份：$backup"
  Write-Host '未修改data、runtime、snowluma及task-tools，未自动启动程序。'
} catch {
  Write-Host $_.Exception.Message -ForegroundColor Red
  exit 1
}
