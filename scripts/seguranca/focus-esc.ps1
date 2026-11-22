# Traz a janela do Mercurio para frente (truque do Alt: o Windows não deixa processo em segundo plano roubar o foco)
# e, com -Esc, aperta Esc. Com a janela atrás de outra, o Chromium descarta cliques e teclas simulados.
param([int]$ProcId, [switch]$Esc)
Add-Type @"
using System; using System.Runtime.InteropServices;
public class W { [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
[DllImport("user32.dll")] public static extern void keybd_event(byte k, byte s, uint f, UIntPtr e); }
"@
$h = (Get-Process -Id $ProcId).MainWindowHandle
[W]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero); [W]::keybd_event(0x12, 0, 2, [UIntPtr]::Zero)
[W]::SetForegroundWindow($h) | Out-Null
Start-Sleep -Milliseconds 500
if ($Esc) { [W]::keybd_event(0x1B, 0, 0, [UIntPtr]::Zero); [W]::keybd_event(0x1B, 0, 2, [UIntPtr]::Zero) }
