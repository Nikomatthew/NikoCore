param([switch]$NoMedia, [switch]$CheckOnly)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$root = Split-Path $PSScriptRoot
$runtime = Join-Path $root 'runtime'
$cache = Join-Path $runtime 'downloads'
if (-not $env:NIKOLINK_INSTALL_PROXY) {
  try {
    $internet = Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings'
    if (($internet.ProxyEnable -eq 1 -or $internet.AutoConfigURL) -and $internet.ProxyServer -and $internet.ProxyServer -notmatch '=') {
      $env:NIKOLINK_INSTALL_PROXY = if ($internet.ProxyServer -match '^https?://') { $internet.ProxyServer } else { 'http://' + $internet.ProxyServer }
    }
  } catch {}
}
function Download($url, $file) {
  if (Test-Path $file) { Write-Host ('使用已下载文件：' + [IO.Path]::GetFileName($file)); return }
  Write-Host ('正在下载：' + [IO.Path]::GetFileName($file)) -ForegroundColor Cyan
  $sourceUri = [Uri]$url
  if ($sourceUri.Scheme -eq 'https' -and $sourceUri.Host -in @('github.com','raw.githubusercontent.com','api.github.com','objects.githubusercontent.com','release-assets.githubusercontent.com')) {
    $url = 'https://gh-proxy.com/' + $url
  }
  $temporary = $file + '.part'
  $args = @('--fail','--location','--retry','3','--connect-timeout','20','--output',$temporary,$url)
  if ($env:NIKOLINK_INSTALL_PROXY) { $args = @('--proxy',$env:NIKOLINK_INSTALL_PROXY) + $args }
  & curl.exe @args
  if ($LASTEXITCODE -ne 0) { throw "下载失败：$url。重新运行即可，已完成的文件不会重下。" }
  Move-Item $temporary $file -Force
}
function Verify($file, $expected) {
  Write-Host ('正在校验：' + [IO.Path]::GetFileName($file))
  if ((Get-FileHash $file -Algorithm SHA256).Hash -ne $expected) { throw "校验失败：$file。请移走这个文件后重新安装。" }
}
function Run($exe, $arguments) {
  & $exe @arguments
  if ($LASTEXITCODE -ne 0) { throw "执行失败：$exe" }
}
try {
  if ($env:PROCESSOR_ARCHITECTURE -ne 'AMD64') { throw '当前安装包只支持 Windows x64。' }
  if ($CheckOnly) {
    foreach ($f in @('runtime\node\node.exe','tools\ffmpeg.exe','tools\ffprobe.exe','tools\yt-dlp.exe','tools\asr\.venv\Scripts\python.exe','tools\asr\models\model.int8.onnx','tools\asr\models\tokens.txt','tools\asr\models\silero_vad.onnx')) {
      Write-Host "$(if(Test-Path (Join-Path $root $f)){'已找到'}else{'缺少'}) $f"
    }
    exit 0
  }
  New-Item -ItemType Directory $cache -Force | Out-Null
  $nodeVersion = 'v24.18.0'
  $nodeName = "node-$nodeVersion-win-x64.zip"
  $nodeZip = Join-Path $cache $nodeName
  Download "https://nodejs.org/dist/$nodeVersion/$nodeName" $nodeZip
  $nodeSums = Join-Path $cache "node-$nodeVersion-SHASUMS256.txt"
  Download "https://nodejs.org/dist/$nodeVersion/SHASUMS256.txt" $nodeSums
  $line = Get-Content $nodeSums | Where-Object { $_ -match ([regex]::Escape($nodeName)+'$') }
  if (-not $line) { throw '未找到 Node 校验值' }
  Verify $nodeZip ($line.Split(' ')[0])
  if (-not (Test-Path "$runtime\node\node.exe")) {
    Expand-Archive $nodeZip "$runtime\node-unpack" -Force
    Move-Item "$runtime\node-unpack\node-$nodeVersion-win-x64" "$runtime\node"
  }
  $env:PATH = "$runtime\node;" + $env:PATH
  Write-Host '安装项目依赖'
  Push-Location $root
  try { Run "$runtime\node\npm.cmd" @('ci','--ignore-scripts','--no-audit','--no-fund') } finally { Pop-Location }
  Push-Location "$root\opencode-adapter"
  try { Run "$runtime\node\npm.cmd" @('ci','--ignore-scripts','--no-audit','--no-fund') } finally { Pop-Location }
  if (-not $NoMedia) {
    $ytVersion = '2026.10.26'
    $yt = Join-Path $cache "yt-dlp-$ytVersion.exe"
    $sums = Join-Path $cache "yt-dlp-$ytVersion-SHA2-256SUMS"
    Download "https://github.com/yt-dlp/yt-dlp/releases/download/$ytVersion/yt-dlp.exe" $yt
    Download "https://github.com/yt-dlp/yt-dlp/releases/download/$ytVersion/SHA2-256SUMS" $sums
    $line = Get-Content $sums | Where-Object { $_ -match '\s+yt-dlp\.exe$' }
    if (-not $line) { throw '未找到 yt-dlp 校验值' }
    Verify $yt ($line.Split(' ')[0])
    Copy-Item $yt "$root\tools\yt-dlp.exe" -Force
    if (-not ((Test-Path "$root\tools\ffmpeg.exe") -and (Test-Path "$root\tools\ffprobe.exe"))) {
      $zip = Join-Path $cache 'ffmpeg-release-essentials.zip'
      $sum = Join-Path $cache 'ffmpeg-release-essentials.zip.sha256'
      Download 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip' $zip
      Download 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip.sha256' $sum
      Verify $zip ((Get-Content $sum -Raw).Trim().Split(' ')[0])
      Expand-Archive $zip "$runtime\ffmpeg-unpack" -Force
      foreach ($name in @('ffmpeg.exe','ffprobe.exe')) {
        $found = Get-ChildItem "$runtime\ffmpeg-unpack" -Filter $name -Recurse | Select-Object -First 1
        if (-not $found) { throw "未找到 $name" }
        Copy-Item $found.FullName "$root\tools\$name" -Force
      }
    }
    $py = "$runtime\python\python.exe"
    . (Join-Path $PSScriptRoot 'find-python.ps1')
    if (-not (Test-Path $py)) { $detected = Find-NikoPython; if ($detected) { $py = $detected } }
    if (-not (Test-Path $py)) {
      $installer = Join-Path $cache 'python-3.14.0-amd64.exe'
      Download 'https://www.python.org/ftp/python/3.14.0/python-3.14.0-amd64.exe' $installer
      $sig = Get-AuthenticodeSignature $installer
      if ($sig.Status -ne 'Valid' -or $sig.SignerCertificate.Subject -notmatch 'Python Software Foundation') { throw 'Python 安装包签名校验失败' }
      $process = Start-Process $installer -ArgumentList @('/quiet','InstallAllUsers=0',"TargetDir=`"$runtime\python`"",'PrependPath=0','Include_launcher=0','Include_test=0','Include_pip=1','AssociateFiles=0','Shortcuts=0') -Wait -PassThru
      if ($process.ExitCode -notin @(0,3010)) { throw 'Python 安装失败' }
      if (-not (Test-Path $py)) { $py = Find-NikoPython }
      if (-not $py -or -not (Test-Path $py)) { throw 'Python安装器已退出，但未找到可用解释器；请安装Python3.14后重试。' }
    }
    $venv = "$root\tools\asr\.venv\Scripts\python.exe"
    if (-not (Test-Path $venv)) { Run $py @('-m','venv',"$root\tools\asr\.venv") }
    $pipArgs = @('-m','pip','install','-r',"$root\tools\asr\requirements.txt")
    if ($env:NIKOLINK_INSTALL_PROXY) { $pipArgs += @('--proxy',$env:NIKOLINK_INSTALL_PROXY) }
    Run $venv $pipArgs
    $models = "$root\tools\asr\models"
    New-Item -ItemType Directory $models -Force | Out-Null
    $hf = 'https://huggingface.co/csukuangfj/sherpa-onnx-paraformer-zh-2024-03-09/resolve/906992d326ebf0c5171cde675aa0902be9e5bc6c'
    Download "$hf/model.int8.onnx" "$models\model.int8.onnx"
    Download "$hf/tokens.txt" "$models\tokens.txt"
    Download 'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/silero_vad.onnx' "$models\silero_vad.onnx"
    $manifest = Get-Content "$PSScriptRoot\asr\model-hashes.json" -Raw | ConvertFrom-Json
    foreach ($property in $manifest.PSObject.Properties) { Verify (Join-Path $models $property.Name) $property.Value }
    Run $venv @('-c','import sherpa_onnx, soundfile, numpy, fastapi, uvicorn')
  }
  Write-Host '依赖安装完成。接下来配置 OpenCode 模型和 QQ 登录，再运行nikolinkstart.bat。'
  Write-Host '本脚本不会打包或替你登录 SnowLuma，也不会读取、上传已有聊天记录。'
} catch {
  Write-Host $_.Exception.Message -ForegroundColor Red
  exit 1
}
