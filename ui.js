const { cmd, onState, onFocusUrl, onSuggest, onSuggestPicked } = window.mercurio;
const $ = id => document.getElementById(id);
const url = $('url');
const X = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>'; // ícone estático, nunca dado de página

for (const id of ['back', 'forward', 'reload', 'home', 'panel']) $(id).onclick = () => cmd(id);
// botões que abrem menu logo abaixo deles
const below = id => { const r = $(id).getBoundingClientRect(); return { x: r.left, y: r.bottom + 4 }; };
$('downloads').onclick = () => cmd('downloads', below('downloads'));
$('exts').onclick = e => { e.preventDefault(); cmd('extensions', below('exts')); }; // dentro do <label>: não focar o campo

// Botão de downloads: animação enquanto baixa e um brilho quando termina.
let seenDone = null;
function renderDownloads(d) {
  const b = $('downloads');
  const busy = d.active > 0;
  b.classList.toggle('busy', busy);
  b.classList.toggle('indet', busy && d.progress == null);
  b.classList.toggle('paused', busy && d.paused);
  b.style.setProperty('--p', `${Math.round((d.progress ?? 0) * 100)}%`);
  b.title = busy
    ? `${d.paused ? 'Pausado' : 'Baixando'} ${d.active} arquivo${d.active > 1 ? 's' : ''}${d.progress != null ? ` — ${Math.round(d.progress * 100)}%` : ''}. Clique para pausar ou cancelar`
    : 'Downloads: abrir a pasta';
  if (seenDone !== null && d.doneAt > seenDone && !busy) {
    b.classList.remove('done'); void b.offsetWidth; b.classList.add('done'); // reinicia o brilho
    setTimeout(() => b.classList.remove('done'), 1800);
  }
  seenDone = d.doneAt;
}
$('star').onclick = () => cmd('bookmark');
$('popups').onclick = e => {
  e.preventDefault(); // o botão fica dentro do <label> da barra: sem isto o clique iria para o campo de endereço
  const r = $('popups').getBoundingClientRect();
  cmd('popups', { x: r.left, y: r.bottom + 4 });
};
$('plus').onclick = () => cmd('newTab');
$('allow').onclick = () => cmd('permission', true);
$('deny').onclick = () => cmd('permission', false);
// Autocompletar: sugestões do histórico/favoritos sob a barra (setas escolhem) e o endereço mais provável
// completado no próprio campo, com o resto selecionado (como no Chrome).
let suggestions = [], sel = -1, typed = '', completing = false;
const barRect = () => { const r = $('bar').getBoundingClientRect(); return { x: r.left, y: r.bottom + 2, width: r.width }; };
const closeSuggest = () => { suggestions = []; sel = -1; cmd('suggestHide'); };
url.oninput = e => {
  typed = url.value;
  completing = e.inputType === 'insertText'; // apagando não completa de novo
  sel = -1;
  cmd('suggest', { q: typed, rect: barRect() });
};
onSuggest(list => {
  if (document.activeElement !== url) return closeSuggest();
  suggestions = list;
  const top = list[0];
  if (completing && top?.prefix && typed && url.value === typed && top.text.toLowerCase().startsWith(typed.toLowerCase())) {
    url.value = typed + top.text.slice(typed.length);
    url.setSelectionRange(typed.length, url.value.length);
  }
});
onSuggestPicked(() => { closeSuggest(); url.blur(); });
url.onkeydown = e => {
  if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && suggestions.length) {
    e.preventDefault();
    const n = suggestions.length; // percorre -1 (o que foi digitado), 0 … n-1
    sel = ((sel + 1 + (e.key === 'ArrowDown' ? 1 : -1) + n + 1) % (n + 1)) - 1;
    url.value = sel >= 0 ? suggestions[sel].text : typed;
    cmd('suggest', { sel });
  }
  if (e.key === 'Enter' && url.value.trim()) {
    cmd('go', sel >= 0 ? suggestions[sel].url : url.value);
    closeSuggest(); url.blur();
  }
  if (e.key === 'Escape') { if (suggestions.length) { closeSuggest(); url.value = typed; } else url.blur(); }
  if (e.key === 'Delete' || e.key === 'Backspace') completing = false;
};
url.onfocus = () => url.select();
url.onblur = () => setTimeout(closeSuggest, 150); // dá tempo do clique na lista chegar
onFocusUrl(() => url.focus());

// Barra de favoritos: clique abre aqui, botão do meio abre em nova aba, direito = menu.
// O que não couber vai para o menu "»".
let lastBookmarks = '';
function renderBookmarks(list) {
  const bar = $('bookmarks'), more = $('bm-more');
  const key = JSON.stringify(list);
  if (key === lastBookmarks) return; // evita redesenhar a cada evento de carregamento
  lastBookmarks = key;
  bar.hidden = !list.length;
  bar.replaceChildren(...list.map(b => {
    const el = document.createElement('button');
    el.className = 'bm';
    el.title = `${b.title}\n${b.url}`;
    const icon = document.createElement(b.favicon ? 'img' : 'i');
    if (b.favicon) { icon.src = b.favicon; icon.alt = ''; icon.onerror = () => icon.replaceWith(document.createElement('i')); }
    const title = document.createElement('span');
    title.textContent = b.title;
    el.append(icon, title);
    el.onclick = () => cmd('open', b.url);
    el.onauxclick = e => e.button === 1 && cmd('openTab', b.url);
    el.oncontextmenu = e => { e.preventDefault(); cmd('bookmarkMenu', b.url); };
    return el;
  }), more);
  fitBookmarks();
}
function fitBookmarks() {
  const bar = $('bookmarks'), more = $('bm-more');
  const chips = [...bar.querySelectorAll('.bm')];
  chips.forEach(c => (c.hidden = false));
  more.hidden = true;
  const limit = bar.clientWidth - 40; // espaço do botão »
  let used = 0, first = -1;
  chips.forEach((c, i) => {
    used += c.offsetWidth + 2;
    if (used > limit && first < 0) first = i;
    if (first >= 0) c.hidden = true;
  });
  if (first >= 0) { more.hidden = false; more.onclick = () => cmd('bookmarksOverflow', first); }
}
addEventListener('resize', fitBookmarks);

$('update').onclick = () => cmd('installUpdate');

$('ctx').onclick = () => {
  const r = $('ctx').getBoundingClientRect();
  cmd('contexts', { x: r.left, y: r.bottom + 4 });
};

onState(s => {
  applyAccent(s.accent);
  document.body.dataset.kind = s.context.kind;
  $('update').hidden = !s.update;
  $('update').title = s.update ? `Mercurio ${s.update} baixado. Clique para reiniciar e atualizar (ou ele atualiza ao fechar).` : '';
  $('ctx').querySelector('span').textContent = s.context.name;
  $('ctx').setAttribute('aria-label', `Contexto atual: ${s.context.name}`);
  $('tabs').replaceChildren(...s.tabs.map((t, i) => {
    const el = document.createElement('div');
    el.className = 'tab' + (i === s.active ? ' on' : '') + (t.asleep ? ' asleep' : '');
    el.setAttribute('role', 'tab');
    el.setAttribute('aria-selected', i === s.active);
    el.title = t.asleep ? `${t.title}\nAdormecida para economizar memória: volta ao clicar` : t.title;
    el.onmousedown = e => e.button === 0 && cmd('select', i);
    el.onauxclick = e => e.button === 1 && cmd('close', i);

    let icon = document.createElement(t.loading ? 'i' : t.favicon ? 'img' : 'i');
    icon.className = t.loading ? 'spin' : t.favicon ? '' : 'dot';
    if (t.panel) { icon = document.createElement('img'); icon.src = 'assets/logo.png'; icon.className = ''; }
    else if (!t.loading && t.favicon) { icon.src = t.favicon; icon.onerror = () => icon.replaceWith(Object.assign(document.createElement('i'), { className: 'dot' })); }

    const title = document.createElement('span');
    title.textContent = t.title; // textContent: título da página nunca vira HTML
    const x = document.createElement('button');
    x.innerHTML = X;
    x.setAttribute('aria-label', 'Fechar aba');
    x.onmousedown = e => e.stopPropagation();
    x.onclick = () => cmd('close', i);
    el.append(icon, title, x);
    return el;
  }));

  $('back').disabled = !s.canBack;
  $('forward').disabled = !s.canForward;
  if (document.activeElement !== url) url.value = s.url;
  const insecure = s.url.startsWith('http://') || s.blocked; // site falso bloqueado: nunca mostra cadeado
  $('insecure').hidden = !insecure;
  $('lock').style.display = s.url.startsWith('https://') && !s.blocked ? '' : 'none';
  $('star').disabled = !s.bookmarkable;
  $('star').setAttribute('aria-pressed', s.bookmarked);
  $('star').title = !s.bookmarkable ? 'Abra um site para favoritar'
    : s.bookmarked ? 'Remover dos favoritos (Ctrl+D)' : 'Favoritar (Ctrl+D)';

  $('popups').hidden = !s.popups;
  $('popups').querySelector('span').textContent = s.popups > 1 ? s.popups : '';
  $('popups').title = `${s.popups} pop-up${s.popups > 1 ? 's bloqueados' : ' bloqueado'}. Clique para abrir ou permitir.`;
  renderBookmarks(s.bookmarks);
  renderDownloads(s.downloads);

  $('prompt').hidden = !s.prompt;
  if (s.prompt) {
    $('p-origin').textContent = s.prompt.origin.replace(/^https?:\/\//, '');
    $('p-label').textContent = s.prompt.label;
  }
});
