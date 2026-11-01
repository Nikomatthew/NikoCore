param(
  [Parameter(Mandatory=$true)][string]$Url,
  [Parameter(Mandatory=$true)][ValidateSet('video','audio')][string]$Mode,
  [Parameter(Mandatory=$true)][string]$OutputDir,
  [Parameter(Mandatory=$true)][string]$Name
)
$ErrorActionPreference = 'Stop'
$tools = $PSScriptRoot
$workspace = [IO.Path]::GetFullPath((Join-Path (Split-Path $tools) 'opencode-adapter\state\owner-tasks\state\isolated\workspace'))
if ($env:NIKOLINK_WORKSPACE_ROOT) { $workspace = [IO.Path]::GetFullPath($env:NIKOLINK_WORKSPACE_ROOT) }
if (-not $Name -or $Name.Length -gt 120 -or $Name -match '[<>:"/\\|?*\x00-\x1f]' -or $Name -match '^[. ]' -or $Name -match '[. ]$') { throw 'invalid file name' }
$dir = [IO.Path]::GetFullPath($OutputDir)
if (-not $dir.StartsWith($workspace + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'output directory outside task workspace' }
if (-not (Test-Path -LiteralPath $dir -PathType Container)) { throw 'output directory missing' }
try { $u = [Uri]$Url } catch { throw 'invalid URL' }
if ($u.Scheme -ne 'https' -or $u.UserInfo -or $u.Port -and $u.Port -ne 443) { throw 'only public https URLs are allowed' }
$hostName = $u.Host.ToLowerInvariant()
$allowed = @('youtube.com','www.youtube.com','m.youtube.com','youtu.be','bilibili.com','www.bilibili.com','m.bilibili.com','b23.tv','douyin.com','www.douyin.com','v.douyin.com','iesdouyin.com')
$ok = $false
foreach ($domain in $allowed) { if ($hostName -eq $domain -or $hostName.EndsWith('.' + $domain)) { $ok = $true; break } }
if (-not $ok) { throw 'domain not in media allowlist' }
$existing = Get-ChildItem -LiteralPath $dir -File -ErrorAction SilentlyContinue | Where-Object { $_.BaseName -eq $Name }
if ($existing) { throw 'target already exists; refusing to overwrite' }
$ytdlp = Join-Path $tools 'yt-dlp.exe'
$ffmpeg = Join-Path $tools 'ffmpeg.exe'
$ffprobe = Join-Path $tools 'ffprobe.exe'
foreach ($file in @($ytdlp,$ffmpeg,$ffprobe)) { if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw "missing tool: $file" } }
$outputTemplate = Join-Path $dir ($Name + '.%(ext)s')
$args = @('--no-config','--force-ipv4','--js-runtimes','node','--no-playlist','--no-warnings','--no-progress','--socket-timeout','20','--retries','2','--fragment-retries','2','--max-filesize','200M','--ffmpeg-location',$tools,'-o',$outputTemplate)
if ($Mode -eq 'video') { $args += @('-f','bv*[vcodec^=avc1][height<=1080]+ba[acodec^=mp4a]/b[vcodec^=avc1][height<=1080]/bv*[height<=1080]+ba/b[height<=1080]','--merge-output-format','mp4') } else { $args += @('-x','--audio-format','mp3','--audio-quality','0') }
$proxy = $env:NIKOLINK_MEDIA_PROXY
if (-not $proxy) {
  try {
    $reg = Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings' -ErrorAction Stop
    if (($reg.ProxyEnable -eq 1 -or $reg.AutoConfigURL) -and $reg.ProxyServer) {
      $server = [string]$reg.ProxyServer
      if ($server -match '=') {
        $httpsPart = ($server -split ';' | Where-Object { $_ -match '^https=' } | Select-Object -First 1)
        if ($httpsPart) { $server = ($httpsPart -split '=',2)[1] }
      }
      if ($server -notmatch '^[a-z]+://') { $server = 'http://' + $server }
      $proxy = $server
    }
  } catch {}
}
if ($proxy) { $args += @('--proxy', $proxy) }
$args += $Url
& $ytdlp @args
if ($LASTEXITCODE -ne 0) { throw "yt-dlp failed with exit code $LASTEXITCODE" }
$produced = Get-ChildItem -LiteralPath $dir -File | Where-Object { $_.BaseName -eq $Name -and $_.Extension -in @('.mp4','.mkv','.webm','.mp3','.m4a','.opus') } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $produced) { throw 'no completed media file found' }
if ($produced.Length -le 0 -or $produced.Length -gt 200MB) { throw 'media size invalid' }
$probe = & $ffprobe -v error -show_entries format=duration,size -of json $produced.FullName
if ($LASTEXITCODE -ne 0) { throw 'ffprobe validation failed' }
$info = $probe | ConvertFrom-Json
$duration = [double]$info.format.duration
if (-not ($duration -gt 0)) { throw 'media duration invalid' }
if ($Mode -eq 'video') {
  $streams = & $ffprobe -v error -show_entries stream=codec_type -of csv=p=0 $produced.FullName
  if (-not ($streams -contains 'video')) { throw 'video stream missing' }
}
Write-Output ('RESULT_PATH=' + $produced.FullName)
Write-Output ('SIZE=' + $produced.Length)
Write-Output ('DURATION=' + $duration)
