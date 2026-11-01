param(
    [Parameter(Mandatory=$true)][string]$Output,
    [ValidateSet('Primary','All','Window')][string]$Mode='Primary',
    [string]$WindowTitle=''
)
$ErrorActionPreference='Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class NikoCaptureNative {
    [DllImport("user32.dll")] public static extern IntPtr SetThreadDpiAwarenessContext(IntPtr value);
    [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")] public static extern int GetSystemMetrics(int index);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr window, out Rect rect);
    [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr window);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr window);
    public struct Rect { public int Left; public int Top; public int Right; public int Bottom; }
}
'@
$previous=[NikoCaptureNative]::SetThreadDpiAwarenessContext([IntPtr](-4))
if($previous -eq [IntPtr]::Zero){[void][NikoCaptureNative]::SetProcessDPIAware()}
Add-Type -AssemblyName System.Drawing
try {
    $x=0;$y=0
    if($Mode -eq 'Window') {
        if([string]::IsNullOrWhiteSpace($WindowTitle)){throw 'WindowTitle is required.'}
        $windows=@(Get-Process | Where-Object {$_.MainWindowHandle -ne 0 -and $_.MainWindowTitle.IndexOf($WindowTitle,[StringComparison]::OrdinalIgnoreCase) -ge 0})
        if($windows.Count -ne 1){throw "Expected one matching window, found $($windows.Count). Specify a more exact title."}
        $handle=$windows[0].MainWindowHandle
        if([NikoCaptureNative]::IsIconic($handle) -or ![NikoCaptureNative]::IsWindowVisible($handle)){throw 'Window must be visible and not minimized.'}
        $rect=New-Object NikoCaptureNative+Rect
        if(![NikoCaptureNative]::GetWindowRect($handle,[ref]$rect)){throw 'Cannot read window bounds.'}
        $x=$rect.Left;$y=$rect.Top;$width=$rect.Right-$rect.Left;$height=$rect.Bottom-$rect.Top
    } elseif($Mode -eq 'All') {
        $x=[NikoCaptureNative]::GetSystemMetrics(76);$y=[NikoCaptureNative]::GetSystemMetrics(77)
        $width=[NikoCaptureNative]::GetSystemMetrics(78);$height=[NikoCaptureNative]::GetSystemMetrics(79)
    } else {
        $width=[NikoCaptureNative]::GetSystemMetrics(0);$height=[NikoCaptureNative]::GetSystemMetrics(1)
    }
    if($width -le 0 -or $height -le 0){throw 'Invalid physical capture dimensions.'}
    $destination=[IO.Path]::GetFullPath($Output)
    if(Test-Path -LiteralPath $destination){throw 'Output already exists; refusing to overwrite.'}
    $bitmap=New-Object Drawing.Bitmap($width,$height)
    $graphics=[Drawing.Graphics]::FromImage($bitmap)
    try {
        $graphics.CopyFromScreen($x,$y,0,0,$bitmap.Size,[Drawing.CopyPixelOperation]::SourceCopy)
        $bitmap.Save($destination,[Drawing.Imaging.ImageFormat]::Png)
    } finally {$graphics.Dispose();$bitmap.Dispose()}
    [pscustomobject]@{mode=$Mode;width=$width;height=$height;x=$x;y=$y;file=$destination} | ConvertTo-Json -Compress
} finally {if($previous -ne [IntPtr]::Zero){[void][NikoCaptureNative]::SetThreadDpiAwarenessContext($previous)}}
