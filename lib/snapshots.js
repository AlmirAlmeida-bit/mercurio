// Snapshots de sessão: retratos das abas (URL, título, ordem, ativa) por contexto.
// Funções puras, testadas em lib/snapshots.test.js.
const { randomUUID } = require('node:crypto');

const isWeb = u => /^https?:/.test(u);
const DEFAULT_MAX = 20;
const clampMax = n => Math.min(100, Math.max(5, Number(n) || DEFAULT_MAX));

// contexts: [{ kind, id, name, active, tabs: [{ url, title }] }]
// Efêmeros nunca entram; páginas internas (nova aba, painel) também não.
function serialize(contexts) {
  return contexts
    .filter(c => c.kind === 'main' || c.kind === 'capsule')
    .map(c => {
      const tabs = [];
      let active = -1;
      c.tabs.forEach((tab, i) => {
        if (!isWeb(tab.url)) return;
        if (i === c.active) active = tabs.length;
        tabs.push({ url: tab.url, title: String(tab.title || tab.url).slice(0, 300) });
      });
      return { kind: c.kind, id: c.kind === 'capsule' ? c.id : undefined, name: c.name, active, tabs };
    })
    .filter(c => c.tabs.length);
}

const sameState = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Adiciona no topo (mais recente primeiro), ignora se nada mudou e respeita o limite.
function addSnapshot(list, contexts, reason, max, now = Date.now()) {
  if (!contexts.length) return { list, added: null };
  if (list[0] && sameState(list[0].contexts, contexts)) return { list, added: null };
  const snap = { id: randomUUID(), t: now, reason, contexts };
  return { list: [snap, ...list].slice(0, clampMax(max)), added: snap };
}

// Só http/https sobrevive à restauração (um arquivo adulterado não abre file:/javascript:).
const restorableTabs = ctx => (ctx.tabs ?? []).filter(t => isWeb(t.url));

module.exports = { serialize, addSnapshot, sameState, restorableTabs, clampMax, DEFAULT_MAX };
