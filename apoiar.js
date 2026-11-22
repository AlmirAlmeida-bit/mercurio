// Página de doação: Pix copia e cola (dados de pix-dados.js, gerado por scripts/pix.js) e cor de destaque (?a=).
applyAccent(new URLSearchParams(location.search).get('a'));
const codigo = document.getElementById('codigo');
codigo.value = PIX.codigo;
codigo.onfocus = () => codigo.select();
document.getElementById('recebedor').textContent = `Recebedor: ${PIX.nome} · ${PIX.cidade}. Confira no app do banco antes de confirmar.`;
const copiar = document.getElementById('copiar');
copiar.onclick = async () => {
  let ok = false;
  try { await navigator.clipboard.writeText(PIX.codigo); ok = true; } catch {}
  if (!ok) { codigo.select(); ok = document.execCommand('copy'); } // sem foco na aba, a API nova recusa
  copiar.textContent = ok ? 'Copiado ✓' : 'Ctrl+C para copiar';
  setTimeout(() => { copiar.textContent = 'Copiar'; }, 2500);
};
