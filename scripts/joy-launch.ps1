# Starts JOY: the server in the background (no window), then Edge as a
# full-screen app window pointed at it. Run by the Startup shortcut at login
# and by the JOY shortcut on the desktop.

$ErrorActionPreference = 'SilentlyContinue'
$root = Split-Path -Parent $PSScriptRoot
$data = Join-Path $env:LOCALAPPDATA 'JOY'
New-Item -ItemType Directory -Force -Path $data | Out-Null
$log = Join-Path $data 'joy.log'

# A plain port check. The bridge listens on 127.0.0.1 and the web server on
# ::1, and Windows PowerShell's clients only try IPv4 — so try both loopbacks.
function Test-Port($port) {
  foreach ($ip in @([System.Net.IPAddress]::Loopback, [System.Net.IPAddress]::IPv6Loopback)) {
    $c = New-Object System.Net.Sockets.TcpClient($ip.AddressFamily)
    try {
      $c.Connect($ip, $port)
      return $true
    } catch {
    } finally {
      $c.Close()
    }
  }
  return $false
}

# Start the server only if it is not already running (a second launch just
# reopens the window).
if (-not (Test-Port 8787)) {
  $node = 'C:\Program Files\nodejs\node.exe'
  if (-not (Test-Path $node)) { $node = 'node' }
  Start-Process -FilePath $node -ArgumentList 'scripts/start.mjs' -WorkingDirectory $root `
    -WindowStyle Hidden -RedirectStandardOutput $log -RedirectStandardError "$log.err"
}

# Wait for both halves (up to ~2 minutes on a slow cold boot).
for ($i = 0; $i -lt 120; $i++) {
  if ((Test-Port 8787) -and (Test-Port 5173)) { break }
  Start-Sleep -Seconds 1
}

$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
if (-not (Test-Path $edge)) { $edge = 'C:\Program Files\Microsoft\Edge\Application\msedge.exe' }

# A separate Edge profile for JOY, so these flags always apply (they are
# ignored if they would join an Edge that is already running) and so the
# microphone permission is remembered after the first Allow.
#   autoplay-policy  : she may speak and play music without a click first
#   disable-*        : keep listening at full speed while minimised to the orb
$edgeArgs = @(
  '--app=http://localhost:5173/?auto=1',
  '--start-fullscreen',
  "--user-data-dir=$data\edge-profile",
  '--autoplay-policy=no-user-gesture-required',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows',
  '--no-first-run',
  '--no-default-browser-check'
)
Start-Process -FilePath $edge -ArgumentList $edgeArgs
