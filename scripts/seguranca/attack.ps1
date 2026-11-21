param([string]$Name = 'teste', [string]$Exe = '', [string]$Script = 'run.mjs')
# Testes de segurança com ataques reais (ver memoria.md, "Auditoria de segurança").
#   .\attack.ps1                                   -> ataques contra o código-fonte
#   .\attack.ps1 -Script smoke.mjs                 -> funcionamento normal (tela inicial, painel, cápsulas)
#   .\attack.ps1 -Exe <caminho>\Mercurio.exe       -> contra o app empacotado
# Usa um perfil novo, um servidor HTTPS local (porta 8443) e domínios *.test apontados para 127.0.0.1.
# Precisa do openssl (vem com o Git for Windows). Abre janelas do Mercurio: não mexa nelas durante o teste.
$ErrorActionPreference = 'Stop'
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
$sec = $PSScriptRoot
if (-not (Test-Path "$sec\cert.pem")) {
  $openssl = (Get-Command openssl -ErrorAction SilentlyContinue).Source
  if (-not $openssl) { $openssl = 'C:\Program Files\Git\usr\bin\openssl.exe' }
  $ErrorActionPreference = 'Continue' # o openssl escreve o progresso na saída de erro
  & $openssl req -x509 -newkey rsa:2048 -nodes -keyout "$sec\key.pem" -out "$sec\cert.pem" -days 365 -subj '/CN=test' 2>&1 | Out-Null
  $ErrorActionPreference = 'Stop'
}
$prof = Join-Path $sec "perfil-$Name"
if (Test-Path $prof) { Remove-Item -Recurse -Force $prof }
New-Item -ItemType Directory $prof | Out-Null
node "$sec\kit.mjs" profile $prof
$bin = if ($Exe) { $Exe } else { 'C:\REPOS\mercurio\node_modules\electron\dist\electron.exe' }
Set-Content -NoNewline -Encoding ascii (Join-Path $prof 'aviso-visto') ([string](Get-Item $bin).LastWriteTime.Subtract([datetime]'1970-01-01').TotalMilliseconds)
$srv = Start-Process node -ArgumentList "`"$sec\kit.mjs`" serve" -PassThru -WindowStyle Hidden
$args = @()
if (-not $Exe) { $args += 'C:\REPOS\mercurio' }
$args += "--user-data-dir=`"$prof`"", '--remote-debugging-port=9444', '--ignore-certificate-errors', '"--host-resolver-rules=MAP *.test 127.0.0.1"'
$app = Start-Process $bin -ArgumentList $args -PassThru
Start-Sleep 7
$arg2 = if ($Script -eq 'run.mjs') { $prof } else { $sec }
try { node "$sec\$Script" 9444 $arg2 $app.Id } finally {
  Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like "*perfil-$Name*" -and $_.Name -ne 'node.exe' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  Stop-Process -Id $srv.Id -Force -ErrorAction SilentlyContinue
}
