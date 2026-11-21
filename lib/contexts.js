// Contextos de navegação: cada um tem a sua sessão (cookies, cache, logins) e as suas abas.
//   main      -> sessão padrão (extensões, histórico)
//   capsule   -> partição persistente própria ("persist:capsula-<id>")
//   ephemeral -> partição só em memória ("efemera-<id>"), descartada ao fechar
const { session } = require('electron');
const { randomUUID } = require('node:crypto');

const ALWAYS = new Set(['fullscreen', 'clipboard-sanitized-write']);
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

// Mesma política de segurança para toda sessão: nega por padrão; o que for
// perguntável vai para onAsk(pedido) mostrar a faixa Permitir/Bloquear.
function harden(ses, decisions, onAsk) {
  ses.setPermissionRequestHandler((wc, perm, cb, details) => {
    const origin = originOf(details.requestingUrl);
    if (ALWAYS.has(perm) || isExtension(origin)) return cb(true); // extensões já declaram permissões no manifest
    const saved = origin ? decisions.get(origin, perm) : undefined;
    if (saved !== undefined) return cb(saved);
    onAsk({ origin, perm, details, wc, cb, decisions });
  });
  ses.setPermissionCheckHandler((_wc, perm, origin) =>
    ALWAYS.has(perm) || isExtension(origin) || decisions.get(originOf(origin), perm) === true);
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
