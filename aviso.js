// ?u=<endereço bloqueado>&r=<motivo>. Mostra o nome como o computador o lê (xn--...), que revela o truque.
const params = new URLSearchParams(location.search);
let host = params.get('u') ?? '';
try { host = new URL(host).hostname; } catch {}
document.getElementById('host').textContent = host;
document.getElementById('reason').textContent = params.get('r') || 'imita outro site';
const back = document.getElementById('back');
if (history.length < 2) back.hidden = true;
back.onclick = () => history.back();
