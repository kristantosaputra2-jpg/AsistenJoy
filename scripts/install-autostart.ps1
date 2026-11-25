# Makes JOY start at login and puts a JOY shortcut on the desktop.
# Undo: delete "JOY.vbs" from the Startup folder and "JOY.lnk" from the desktop.

$launch = Join-Path $PSScriptRoot 'joy-launch.ps1'
$startup = [Environment]::GetFolderPath('Startup')
$desktop = [Environment]::GetFolderPath('Desktop')

# A .vbs wrapper, because it is the one way to run PowerShell at login with no
# console window flashing up.
$vbs = Join-Path $startup 'JOY.vbs'
$cmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """"$launch"""""
Set-Content -Path $vbs -Encoding ASCII -Value "CreateObject(""WScript.Shell"").Run ""$cmd"", 0, False"

$shell = New-Object -ComObject WScript.Shell
$lnk = $shell.CreateShortcut((Join-Path $desktop 'JOY.lnk'))
$lnk.TargetPath = "$env:WINDIR\System32\wscript.exe"
$lnk.Arguments = """$vbs"""
$lnk.WorkingDirectory = Split-Path -Parent $PSScriptRoot
$lnk.Description = 'Nyalakan JOY'
$lnk.IconLocation = "$env:WINDIR\System32\shell32.dll,43"
$lnk.Save()

Write-Output "Autostart: $vbs"
Write-Output "Desktop shortcut: $(Join-Path $desktop 'JOY.lnk')"
