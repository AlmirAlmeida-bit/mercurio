// Contextos de navegação: cada um tem a sua sessão (cookies, cache, logins) e as suas abas.
//   main      -> sessão padrão (extensões, histórico)
//   capsule   -> partição persistente própria ("persist:capsula-<id>")
//   ephemeral -> partição só em memória ("efemera-<id>"), descartada ao fechar
const { session } = require('electron');
const { randomUUID } = require('node:crypto');
const { blockReason } = require('./hosts');

const ALWAYS = new Set(['fullscreen', 'clipboard-sanitized-write']);
// permissão do Electron -> permissão que a extensão precisa declarar no manifest para não ser perguntada
const EXT_PERMS = { notifications: 'notifications', geolocation: 'geolocation', 'clipboard-read': 'clipboardRead' };
const originOf = u => { try { return new URL(u).origin; } catch { return null; } };
const isExtension = u => String(u).startsWith('chrome-extension://');

const partitionOf = (kind, id) => (kind === 'ephemeral' ? `efemera-${id}` : `persist:capsula-${id}`);

function createContext(kind, name, id = randomUUID()) {
  const ses = kind === 'main' ? session.defaultSession : session.fromPartition(partitionOf(kind, id));
  return { id, kind, name, ses, tabs: [], active: -1 };
}

// Decisões de permissão guardadas só na memória (sessão efêmera).
function memoryDecisions() {
  const m = new Map();
  return { get: (o, p) => m.get(`${o}|${p}`), set: (o, p, v) => m.set(`${o}|${p}`, v) };
}

// A extensão declarou no manifest a permissão equivalente?
function extensionDeclares(ses, origin, perm) {
  if (!isExtension(origin) || !EXT_PERMS[perm]) return false;
  const ext = (ses.extensions ?? ses).getExtension(new URL(origin).host);
  return !!ext?.manifest.permissions?.includes(EXT_PERMS[perm]);
}

// Mesma política de segurança para toda sessão:
//   - permissões: nega por padrão; o perguntável vai para onAsk (faixa Permitir/Bloquear). A decisão vale para o
//     site da barra de endereço (como no Chrome), não para o iframe que pediu — um iframe liberado num site não
//     fica liberado em todos os sites que o incorporam;
//   - endereços falsos (lib/hosts.js) são cancelados antes de carregar; onBlocked mostra o aviso;
//   - mercurio:// serve as páginas internas (serve).
function harden(ses, { decisions, onAsk, onBlocked, serve }) {
  ses.setPermissionRequestHandler((wc, perm, cb, details) => {
    const origin = originOf(wc?.getURL()) ?? originOf(details.requestingUrl);
    if (ALWAYS.has(perm) || extensionDeclares(ses, origin, perm)) return cb(true);
    const saved = origin ? decisions.get(origin, perm) : undefined;
    if (saved !== undefined) return cb(saved);
    onAsk({ origin, perm, details, wc, cb, decisions });
  });
  ses.setPermissionCheckHandler((_wc, perm, requesting, details) => {
    const origin = originOf(details.embeddingOrigin) ?? originOf(requesting);
    return ALWAYS.has(perm) || extensionDeclares(ses, origin, perm) || decisions.get(origin, perm) === true;
  });
  ses.webRequest.onBeforeRequest({ urls: ['<all_urls>'], types: ['mainFrame', 'subFrame'] }, (d, cb) => {
    let reason = null;
    try { reason = blockReason(new URL(d.url).hostname); } catch {}
    cb({ cancel: !!reason });
    if (reason && d.resourceType === 'mainFrame' && d.webContents) setImmediate(() => onBlocked(d.webContents, d.url, reason));
  });
  if (!ses.protocol.isProtocolHandled('mercurio')) ses.protocol.handle('mercurio', serve);
}

// Apaga cookies, armazenamento e cache de uma sessão (efêmera ao fechar, cápsula ao excluir).
async function wipe(ses) {
  try {
    await ses.clearStorageData();
    await ses.clearCache();
  } catch (err) {
    console.error('Falha ao limpar sessão', err.message);
  }
}

module.exports = { createContext, memoryDecisions, harden, wipe, partitionOf, originOf, isExtension };
