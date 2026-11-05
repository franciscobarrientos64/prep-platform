# Instalador de Prep Local (central del local) para Windows.
# Se corre UNA vez en la laptop de caja, en PowerShell como administrador:
#   irm https://os.prep.rest/prep-local/instalar.ps1 | iex
# Hace: instala Node.js si falta, baja los archivos a C:\PrepLocal, abre el puerto 8080 en el
# firewall solo para la red privada, lo deja arrancando solo al prender la laptop, lo inicia
# y abre el panel.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$base = 'https://os.prep.rest/prep-local'
$dir = 'C:\PrepLocal'
function Paso($t) { Write-Host ''; Write-Host ">> $t" -ForegroundColor Cyan }

$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin) { Write-Host 'Abre PowerShell como ADMINISTRADOR (clic derecho > Ejecutar como administrador) y vuelve a pegar el comando.' -ForegroundColor Yellow; return }

Paso 'Revisando Node.js'
$node = $null
foreach ($c in @("$env:ProgramFiles\nodejs\node.exe", "${env:ProgramFiles(x86)}\nodejs\node.exe")) { if (Test-Path $c) { $node = $c; break } }
if (-not $node) { $g = Get-Command node -ErrorAction SilentlyContinue; if ($g) { $node = $g.Source } }
if (-not $node) {
  Write-Host 'Instalando Node.js LTS (tarda 1 a 3 minutos)...'
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements --silent | Out-Host
  } else {
    $msi = Join-Path $env:TEMP 'node-lts.msi'
    Invoke-WebRequest -UseBasicParsing 'https://nodejs.org/dist/v22.11.0/node-v22.11.0-x64.msi' -OutFile $msi
    Start-Process msiexec.exe -ArgumentList "/i `"$msi`" /qn" -Wait
  }
  $node = "$env:ProgramFiles\nodejs\node.exe"
  if (-not (Test-Path $node)) { Write-Host 'No se pudo instalar Node.js. Instalalo a mano desde nodejs.org (LTS) y vuelve a pegar el comando.' -ForegroundColor Red; return }
}
$ver = & $node -v
Write-Host "Node.js $ver listo"
if ([int]($ver.TrimStart('v').Split('.')[0]) -lt 18) { Write-Host 'Se necesita Node 18 o mas nuevo. Actualizalo desde nodejs.org.' -ForegroundColor Red; return }

Paso "Bajando Prep Local a $dir"
New-Item -ItemType Directory -Force -Path $dir, "$dir\datos" | Out-Null
foreach ($f in 'prep-local.js', 'raw-print.ps1', 'panel.html', 'iniciar-prep-local.vbs', 'LEEME.md') {
  Invoke-WebRequest -UseBasicParsing "$base/$f" -OutFile (Join-Path $dir $f)
  Write-Host "  $f"
}
# el panel se sirve con cleanUrls: si bajo una redireccion vacia, se reintenta sin .html
if ((Get-Item "$dir\panel.html").Length -lt 1000) { Invoke-WebRequest -UseBasicParsing "$base/panel" -OutFile "$dir\panel.html" }

Paso 'Abriendo el puerto 8080 para el wifi del local'
Get-NetConnectionProfile | Where-Object { $_.NetworkCategory -eq 'Public' } | ForEach-Object {
  try { Set-NetConnectionProfile -InterfaceIndex $_.InterfaceIndex -NetworkCategory Private; Write-Host "  Red '$($_.Name)' marcada como privada" } catch {}
}
Get-NetFirewallRule -DisplayName 'Prep Local' -ErrorAction SilentlyContinue | Remove-NetFirewallRule
New-NetFirewallRule -DisplayName 'Prep Local' -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow -Profile Private, Domain | Out-Null
Write-Host '  Listo'

Paso 'Dejandolo para que arranque solo al prender la laptop'
$vbs = "$dir\iniciar-prep-local.vbs"
$startup = [Environment]::GetFolderPath('Startup')
$sh = New-Object -ComObject WScript.Shell
$lnk = $sh.CreateShortcut((Join-Path $startup 'Prep Local.lnk'))
$lnk.TargetPath = 'wscript.exe'; $lnk.Arguments = "`"$vbs`""; $lnk.WorkingDirectory = $dir; $lnk.Save()
# acceso directo al panel en el escritorio
$d = $sh.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Desktop')) 'Prep Local.url'))
$d.TargetPath = 'http://localhost:8080/__hub/'; $d.Save()

Paso 'Iniciando Prep Local'
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -like '*prep-local.js*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Start-Process wscript.exe -ArgumentList "`"$vbs`"" -WorkingDirectory $dir
Start-Sleep -Seconds 4
try { $r = Invoke-WebRequest -UseBasicParsing 'http://localhost:8080/__hub/ping'; Write-Host "  Responde: $($r.Content)" -ForegroundColor Green }
catch { Write-Host "  Todavia no responde. Revisa $dir\datos\registro.txt" -ForegroundColor Yellow }

$ips = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } | Select-Object -ExpandProperty IPAddress
Write-Host ''
Write-Host '==============================================' -ForegroundColor Green
Write-Host ' Prep Local instalado' -ForegroundColor Green
foreach ($ip in $ips) { Write-Host "  Mozos (wifi del local): http://${ip}:8080" }
Write-Host '  Panel en esta laptop:  http://localhost:8080/__hub/'
Write-Host '==============================================' -ForegroundColor Green
Start-Process 'http://localhost:8080/__hub/'
