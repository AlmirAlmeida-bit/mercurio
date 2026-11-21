const call = (name, arg) => window.painel.call(name, arg);
const view = document.getElementById('view');
const X = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>'; // ícone estático
const PERMS = {
  media: 'Câmera e microfone', geolocation: 'Localização', notifications: 'Notificações',
  'clipboard-read': 'Área de transferência', midiSysex: 'Dispositivos MIDI',
};

let d;          // dados vindos do navegador
let q = '';     // texto da busca
let limit = 200;
let list;       // função que desenha a lista da seção atual

// Monta elementos sem innerHTML: dados de páginas nunca viram HTML.
function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k.startsWith('on')) el[k] = v;
    else if (k === 'class') el.className = v;
    else el.setAttribute(k, v);
  }
  el.append(...kids.flat().filter(k => k != null && k !== false));
  return el;
}
const xButton = (label, onclick) => { const b = h('button', { class: 'x', 'aria-label': label, title: label, onclick }); b.innerHTML = X; return b; };
const host = u => { try { return new URL(u).host; } catch { return u; } };
const match = (...s) => !q || s.some(v => v?.toLowerCase().includes(q));
const act = async (name, arg) => { d = await call(name, arg); list?.(); };

function searchBox(placeholder) {
  return h('input', { class: 'search', type: 'search', placeholder, 'aria-label': placeholder, value: q,
    oninput: e => { q = e.target.value.trim().toLowerCase(); limit = 200; list(); } });
}

const sections = {
  favoritos() {
    const box = h('div');
    list = () => {
      const items = d.bookmarks.filter(b => match(b.title, b.url));
      box.replaceChildren(items.length
        ? h('div', { class: 'list' }, items.map(b => h('div', { class: 'row' },
            h('a', { class: 'main', href: b.url, target: '_blank' }, h('div', { class: 't' }, b.title), h('div', { class: 'u' }, b.url)),
            xButton('Remover dos favoritos', () => act('removeBookmark', b.url)))))
        : h('div', { class: 'list' }, h('div', { class: 'empty' },
            q ? 'Nenhum favorito encontrado.' : 'Nenhum favorito ainda. Use a estrela na barra de endereço (Ctrl+D).')));
    };
    return [h('h1', {}, 'Favoritos'), h('p', { class: 'sub' }, 'As páginas que você guardou.'),
      h('div', { class: 'tools' }, searchBox('Buscar nos favoritos')), box];
  },

  historico() {
    const box = h('div');
    list = () => {
      const items = d.history.filter(x => match(x.title, x.url));
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 864e5).toDateString();
      const groups = new Map();
      for (const x of items.slice(0, limit)) {
        const day = new Date(x.t).toDateString();
        const label = day === today ? 'Hoje' : day === yesterday ? 'Ontem'
          : new Date(x.t).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
        if (!groups.has(label)) groups.set(label, []);
        groups.get(label).push(x);
      }
      box.replaceChildren(...(items.length ? [...groups].map(([label, xs]) => [h('h2', {}, label),
        h('div', { class: 'list' }, xs.map(x => h('div', { class: 'row' },
          h('time', {}, new Date(x.t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })),
          h('a', { class: 'main', href: x.url, target: '_blank' }, h('div', { class: 't' }, x.title || host(x.url)), h('div', { class: 'u' }, host(x.url))),
          xButton('Remover do histórico', () => act('removeHistory', x.t)))))]).flat()
        : [h('div', { class: 'list' }, h('div', { class: 'empty' }, q ? 'Nada encontrado no histórico.' : 'Seu histórico está vazio.'))]),
        // replaceChildren escreveria um null como texto "null": sem botão, passa nada
        ...(items.length > limit ? [h('button', { class: 'btn', style: 'margin:16px auto;display:block', onclick: () => { limit += 300; list(); } }, 'Mostrar mais')] : []));
    };
    return [h('h1', {}, 'Histórico'), h('p', { class: 'sub' }, 'Os sites que você visitou.'),
      h('div', { class: 'tools' }, searchBox('Buscar no histórico'),
        h('button', { class: 'btn danger', onclick: () => confirm('Apagar todo o histórico?') && act('clearHistory') }, 'Limpar histórico')),
      box];
  },

  extensoes() {
    const box = h('div');
    list = () => {
      box.replaceChildren(h('div', { class: 'list' }, d.extensions.length
        ? d.extensions.map(x => h('div', { class: 'row' },
            h('div', { class: 'ico' }, x.icon ? h('img', { src: x.icon, alt: '' }) : null),
            h('div', { class: 'main' }, h('div', { class: 't' }, x.name), h('div', { class: 'u' }, `Versão ${x.version}${x.description ? ' · ' + x.description : ''}`)),
            h('button', { class: 'act', onclick: () => confirm(`Remover "${x.name}"?`) && act('uninstall', x.id) }, 'Remover')))
        : h('div', { class: 'empty' }, 'Nenhuma extensão instalada.')));
    };
    return [h('h1', {}, 'Extensões'), h('p', { class: 'sub' }, 'Extensões da Chrome Web Store funcionam no Mercurio.'),
      h('div', { class: 'tools' }, h('button', { class: 'btn primary', onclick: () => call('store') }, 'Adicionar da Chrome Web Store')),
      box];
  },

  capsulas() {
    const box = h('div');
    const name = h('input', { class: 'search', placeholder: 'Nome da nova cápsula (ex.: Cliente X)', 'aria-label': 'Nome da nova cápsula', maxlength: '60' });
    const createBtn = h('button', { class: 'btn primary', onclick: () => act('createCapsule', name.value) }, 'Criar cápsula');
    name.onkeydown = e => e.key === 'Enter' && createBtn.click();
    list = () => {
      box.replaceChildren(h('div', { class: 'list' }, d.capsules.length ? d.capsules.map(c => {
        const saved = h('span', { class: 'ok' });
        let timer;
        const notes = h('textarea', { placeholder: 'Anotações rápidas desta cápsula…', 'aria-label': `Anotações de ${c.name}`, maxlength: '5000',
          oninput: e => {
            clearTimeout(timer);
            saved.textContent = '';
            timer = setTimeout(async () => { await call('noteCapsule', { id: c.id, notes: e.target.value }); saved.textContent = 'Salvo ✓'; }, 600);
          } });
        notes.value = c.notes;
        const title = h('input', { class: 'cap-name', value: c.name, 'aria-label': 'Nome da cápsula', maxlength: '60',
          onchange: e => act('renameCapsule', { id: c.id, name: e.target.value }) });
        return h('div', { class: 'cap' },
          h('div', { class: 'cap-head' }, title,
            h('span', { class: c.live ? 'chip on' : 'chip' }, c.current ? 'Em uso' : c.live ? 'Aberta' : 'Pausada'),
            c.live
              ? h('button', { class: 'act', onclick: () => act('pauseCapsule', c.id) }, 'Pausar')
              : h('button', { class: 'act go', onclick: () => act('resumeCapsule', c.id) }, 'Retomar'),
            c.live && !c.current ? h('button', { class: 'act go', onclick: () => act('resumeCapsule', c.id) }, 'Abrir') : null,
            h('button', { class: 'act', onclick: () => confirm(`Excluir "${c.name}"? As abas, os logins e os dados desta cápsula serão apagados.`) && act('deleteCapsule', c.id) }, 'Excluir')),
          notes,
          h('div', { class: 'meta' }, `${c.tabCount} aba${c.tabCount === 1 ? '' : 's'} · atualizada ${new Date(c.updatedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} `, saved));
      }) : h('div', { class: 'empty' }, 'Nenhuma cápsula ainda. Crie uma para separar um trabalho, com logins e abas próprios.')));
    };
    return [h('h1', {}, 'Cápsulas'),
      h('p', { class: 'sub' }, 'Grupos de abas com logins, cookies e anotações separados da navegação principal. Pausar fecha as abas e libera memória; retomar reabre de onde parou.'),
      h('div', { class: 'tools' }, name, createBtn), box];
  },

  snapshots() {
    const box = h('div');
    const REASON = { manual: 'Manual', auto: 'Automático', 'ao fechar': 'Ao fechar' };
    list = () => {
      box.replaceChildren(h('div', { class: 'list' }, d.snapshots.length ? d.snapshots.map(s => h('div', { class: 'row' },
        h('time', { style: 'width:auto;min-width:118px' }, new Date(s.t).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })),
        h('div', { class: 'main' },
          h('div', { class: 't' }, s.contexts.map(c => `${c.name} · ${c.count} aba${c.count === 1 ? '' : 's'}`).join('   |   ')),
          h('div', { class: 'u' }, REASON[s.reason] ?? s.reason)),
        h('button', { class: 'act go', title: 'Abre as abas deste momento ao lado das atuais', onclick: () => act('restoreSnapshot', s.id) }, 'Restaurar'),
        xButton('Excluir snapshot', () => act('deleteSnapshot', s.id))))
        : h('div', { class: 'empty' }, 'Nenhum snapshot ainda. Eles são salvos ao fechar o navegador, a cada 10 minutos (se algo mudou) ou quando você pedir.')));
    };
    return [h('h1', {}, 'Snapshots'),
      h('p', { class: 'sub' }, `Volte a um conjunto de abas de antes. Restaurar abre as abas ao lado das atuais, sem fechar nada. Guardando os ${d.prefs.snapshotsMax} mais recentes; sessões efêmeras nunca entram.`),
      h('div', { class: 'tools' }, h('button', { class: 'btn primary', onclick: () => act('snapshotNow') }, 'Salvar snapshot agora')), box];
  },

  preferencias() {
    const seg = (key, options) => h('div', { class: 'seg', role: 'group' }, Object.entries(options).map(([value, label]) =>
      h('button', { 'aria-pressed': String(d.prefs[key]) === value, onclick: async () => { d = await call('setPref', { key, value }); render(); } }, label)));
    const perms = h('div');
    const done = h('span', { class: 'ok' });
    list = () => {
      perms.replaceChildren(h('div', { class: 'list' }, d.permissions.length
        ? d.permissions.map(p => h('div', { class: 'row' },
            h('div', { class: 'main' }, h('div', { class: 't' }, host(p.origin)),
              h('div', { class: 'u' }, `${PERMS[p.perm] ?? p.perm} · ${p.allow ? 'Permitido' : 'Bloqueado'}`)),
            h('button', { class: 'act', onclick: () => act('revoke', { origin: p.origin, perm: p.perm }) }, 'Revogar')))
        : h('div', { class: 'empty' }, 'Nenhum site com permissão salva.')));
    };
    return [h('h1', {}, 'Preferências'), h('p', { class: 'sub' }, 'Ajuste o Mercurio do seu jeito.'),
      h('h2', {}, 'Geral'),
      h('div', { class: 'list' },
        h('div', { class: 'setting' }, h('div', {}, 'Mecanismo de busca', h('p', {}, 'Usado na barra de endereço e na nova aba.')), seg('search', d.engines)),
        h('div', { class: 'setting' }, h('div', {}, 'Barra de favoritos', h('p', {}, 'Seus favoritos em guias abaixo da barra de endereço (Ctrl+Shift+B).')),
          seg('bookmarksBar', { show: 'Mostrar', hide: 'Ocultar' })),
        h('div', { class: 'setting' }, h('div', {}, 'Snapshots guardados', h('p', {}, 'Os mais antigos saem quando passar do limite.')),
          seg('snapshotsMax', { 10: '10', 20: '20', 50: '50', 100: '100' })),
        h('div', { class: 'setting' }, h('div', {}, 'Tema'), seg('theme', { system: 'Sistema', dark: 'Escuro', light: 'Claro' })),
        h('div', { class: 'setting' }, h('div', {}, 'Cor de destaque', h('p', {}, 'Abas, botões, estrela e foco.')), swatches())),
      h('h2', {}, 'Importar favoritos'), importBox(),
      h('h2', {}, 'Permissões dos sites'), perms,
      h('h2', {}, 'Privacidade'),
      h('div', { class: 'list' }, h('div', { class: 'setting' },
        h('div', {}, 'Limpar cookies e cache', h('p', {}, 'Você sairá das contas nos sites.')),
        h('div', {}, done, ' ', h('button', { class: 'btn danger', onclick: async () => {
          if (!confirm('Apagar cookies, cache e dados dos sites?')) return;
          await call('clearData'); done.textContent = 'Feito ✓';
        } }, 'Limpar')))),
      h('h2', {}, 'Sobre'),
      h('div', { class: 'list' }, h('div', { class: 'about' }, h('img', { src: 'assets/logo.png', alt: '' }),
        h('div', { style: 'flex:1' }, h('div', {}, `Mercurio ${d.version}`, h('span', { class: 'chip' }, UPDATE[d.update.status]?.(d.update) ?? '')),
          h('p', { class: 'u', style: 'margin:4px 0 0;color:var(--dim)' }, `© ${new Date().getFullYear()} TresTech. Todos os direitos reservados. `,
            h('a', { href: 'https://trestech.com.br', target: '_blank' }, 'trestech.com.br'), ' · ',
            h('a', { href: '#', onclick: e => { e.preventDefault(); call('notices'); } }, 'Licenças de terceiros'))),
        d.update.status === 'downloaded'
          ? h('button', { class: 'btn primary', onclick: () => call('installUpdate') }, 'Reiniciar e atualizar')
          : d.update.status !== 'dev'
            ? h('button', { class: 'btn', onclick: async () => { d = await call('checkUpdates'); setTimeout(refresh, 2500); } }, 'Verificar atualizações')
            : null)),
    ];
  },
};

// Cores prontas (as do logo primeiro) + uma livre pelo seletor nativo.
const ACCENTS = {
  default: 'Prata', '#f2b33d': 'Ouro', '#2fa8ff': 'Azul', '#ff7a2f': 'Laranja',
  '#2ec27e': 'Esmeralda', '#9b7bff': 'Violeta', '#ff5d8f': 'Rosa',
};
function swatches() {
  const pick = async value => { d = await call('setPref', { key: 'accent', value }); render(); };
  const current = d.prefs.accent;
  const custom = current !== 'default' && !ACCENTS[current];
  return h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': 'Cor de destaque' },
    Object.entries(ACCENTS).map(([value, name]) => h('button', {
      class: 'sw', role: 'radio', title: name, 'aria-label': name, 'aria-checked': current === value,
      style: `--c:${value === 'default' ? 'linear-gradient(135deg,#fff,#9aa0ab)' : value}`, onclick: () => pick(value),
    })),
    h('label', { class: 'sw custom', title: 'Outra cor', 'aria-checked': custom, style: custom ? `--c:${current}` : '' },
      h('input', { type: 'color', 'aria-label': 'Escolher outra cor', value: custom ? current : '#c9ced6', onchange: e => pick(e.target.value) })));
}

// Texto do status da atualização automática (main.js: setupUpdates).
const UPDATE = {
  dev: () => 'modo desenvolvimento',
  idle: () => 'atualizado',
  checking: () => 'verificando…',
  none: () => 'atualizado',
  downloading: u => `baixando ${u.version}…`,
  downloaded: u => `${u.version} pronta — reinicie para atualizar`,
  error: () => 'não foi possível verificar',
};

// Um botão por perfil do Chrome/Edge/Brave encontrado neste computador.
function importBox() {
  if (!d.importSources.length) {
    return h('div', { class: 'list' }, h('div', { class: 'empty' }, 'Nenhum Chrome, Edge ou Brave com favoritos neste computador.'));
  }
  return h('div', { class: 'list' }, d.importSources.map(s => {
    const status = h('span', { class: 'ok' });
    const btn = h('button', { class: 'act go', onclick: async () => {
      btn.disabled = true;
      const before = d.bookmarks.length;
      try {
        d = await call('importBookmarks', s.id);
        const added = d.bookmarks.length - before;
        status.textContent = added ? `${added} importado${added > 1 ? 's' : ''} ✓` : 'Já estavam todos aqui ✓';
      } catch {
        status.textContent = 'Não foi possível importar';
        btn.disabled = false;
      }
    } }, 'Importar');
    return h('div', { class: 'row' },
      h('div', { class: 'main' }, h('div', { class: 't' }, s.browser), h('div', { class: 'u' }, `${/^perfil/i.test(s.profile) ? '' : 'Perfil '}${s.profile} · ${s.count} favorito${s.count > 1 ? 's' : ''}`)),
      status, btn);
  }));
}

function render() {
  applyAccent(d.prefs.accent);
  const name = sections[location.hash.slice(1)] ? location.hash.slice(1) : 'favoritos';
  for (const a of document.querySelectorAll('nav a')) a.removeAttribute('aria-current');
  document.querySelector(`nav a[href="#${name}"]`).setAttribute('aria-current', 'page');
  view.replaceChildren(...sections[name]());
  list();
}

async function refresh() { d = await call('get'); render(); }

addEventListener('hashchange', () => { q = ''; limit = 200; render(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
refresh();
