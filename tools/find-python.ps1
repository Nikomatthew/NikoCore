function Find-NikoPython {
  $candidates = @()
  $launcher = Get-Command py.exe -ErrorAction SilentlyContinue
  if ($launcher) {
    $output = & $launcher.Source -3.14 -c 'import sys; print(sys.executable)' 2>$null
    if ($LASTEXITCODE -eq 0 -and $output) { $candidates += [string]($output | Select-Object -Last 1) }
  }
  foreach ($name in @('python.exe','python3.exe')) {
    $command = Get-Command $name -ErrorAction SilentlyContinue
    if ($command) { $candidates += $command.Source }
  }
  foreach ($candidate in ($candidates | Select-Object -Unique)) {
    try {
      $output = & $candidate -c 'import sys,venv,ensurepip; assert sys.version_info[:2] == (3,14); print(sys.executable)' 2>$null
      if ($LASTEXITCODE -eq 0 -and $output) { return [string]($output | Select-Object -Last 1) }
    } catch {}
  }
  return $null
}
