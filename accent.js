// Cor de destaque escolhida nas Preferências. "default" (ou inválida) = prata original.
// Compartilhado por ui.html, panel.html e home.html.
function applyAccent(hex) {
  const s = document.documentElement.style;
  if (!/^#[0-9a-f]{6}$/i.test(hex ?? '')) {
    for (const p of ['--accent', '--metal', '--metal-fg', '--glow']) s.removeProperty(p);
    return;
  }
  // brilho neon usado em botões, aba ativa e foco
  s.setProperty('--glow', `0 0 12px color-mix(in srgb, ${hex} 55%, transparent)`);
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  s.setProperty('--accent', hex);
  s.setProperty('--metal', `linear-gradient(135deg, color-mix(in srgb, ${hex} 55%, white), ${hex} 55%, color-mix(in srgb, ${hex} 75%, black))`);
  s.setProperty('--metal-fg', lum > 150 ? '#121317' : '#ffffff');
}
