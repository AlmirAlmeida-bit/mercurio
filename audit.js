const call = (name, arg) => window.painel.call(name, arg);
const $ = id => document.getElementById(id);
const SHOW = 400; // linhas visíveis (as mais recentes)
let q = '';
let lastKey = '';

const cell = (text, cls) => Object.assign(document.createElement('span'), { textContent: text ?? '', className: cls ?? '', title: text ?? '' });
const time = t => new Date(t).toLocaleTimeString('pt-BR');
const host = u => { try { return new URL(u).host; } catch { return ''; } };

function row(e) {
  const r = document.createElement('div');
  r.className = 'row';
  const status = e.kind === 'navegação' ? '' : e.error ? 'erro' : String(e.status);
  r.append(
    cell(time(e.t), 't'),
    cell(e.kind, e.kind === 'navegação' ? 'k-nav' : ''),
    cell(e.method ?? ''),
    cell(status, e.error || e.status >= 400 ? 's-err' : e.status ? 's-ok' : ''),
    cell(e.cache ? `${e.type ?? ''} (cache)` : e.type ?? ''),
    cell(e.error ? `${e.url}  —  ${e.error}` : e.url),
  );
  return r;
}

function render(d) {
  if (!d) {
    $('list').replaceChildren(cell('A sessão efêmera foi encerrada.', 'empty'));
    return;
  }
  const ev = d.events;
  $('since').textContent = `Iniciada às ${time(d.startedAt)} · os eventos aparecem aqui em tempo real.`;
  $('n-nav').textContent = ev.filter(e => e.kind === 'navegação').length;
  $('n-req').textContent = ev.filter(e => e.kind === 'rede').length;
  $('n-err').textContent = ev.filter(e => e.error || e.status >= 400).length;
  $('n-host').textContent = new Set(ev.map(e => host(e.url))).size;

  const key = `${ev.length}|${ev.at(-1)?.t}|${q}`;
  if (key === lastKey) return; // nada mudou: não redesenha
  lastKey = key;
  const shown = ev.filter(e => !q || `${e.url} ${e.method} ${e.type} ${e.kind} ${e.status}`.toLowerCase().includes(q)).slice(-SHOW).reverse();
  const head = document.createElement('div');
  head.className = 'row head';
  head.append(...['Hora', 'Tipo', 'Método', 'Status', 'Recurso', 'Endereço'].map(t => cell(t)));
  $('list').replaceChildren(head, ...(shown.length ? shown.map(row) : [cell(q ? 'Nada encontrado.' : 'Nenhum evento ainda. Navegue em uma aba desta sessão.', 'empty')]));
}

async function refresh() {
  try { render(await call('get')); } catch { /* página fechando */ }
}

$('q').oninput = e => { q = e.target.value.trim().toLowerCase(); refresh(); };
$('export').onclick = async () => {
  const ok = await call('export');
  $('export').textContent = ok ? 'Exportado ✓' : 'Exportar JSON';
  setTimeout(() => ($('export').textContent = 'Exportar JSON'), 2500);
};
$('end').onclick = () => confirm('Encerrar a sessão efêmera? Abas, cookies e este registro serão descartados.') && call('end');

refresh();
setInterval(refresh, 1500);
