/*
 * Mercurio — © 2026 TresTech (trestech.com.br). Todos os direitos reservados
 * sobre o código, a marca, o logo e o design do Mercurio.
 *
 * SOFTWARE DE TERCEIROS
 * O Mercurio é construído sobre os projetos de código aberto abaixo. Cada um
 * pertence aos seus autores e é usado conforme a respectiva licença.
 *
 * Plataforma (vai dentro de todos os instaladores)
 *   Electron 45.4.1 ................ MIT           © GitHub Inc. e contribuidores do Electron
 *   Chromium 156.0.8078.100 ........ BSD-3-Clause  © The Chromium Authors (licença principal;
 *                                                  inclui componentes com outras licenças,
 *                                                  ex.: V8 BSD-3-Clause, Blink, ICU, etc.)
 *   Node.js 24.22.3 (embutido) ..... MIT           © OpenJS Foundation e contribuidores do Node.js
 *   Os textos completos acompanham o app: LICENSE.electron.txt e LICENSES.chromium.html
 *   (este lista todas as licenças dos componentes do Chromium).
 *
 * Bibliotecas usadas pelo app (package.json "dependencies" e as que elas trazem)
 *   electron-chrome-extensions 4.10.0 ... MIT           © Samuel Maddock
 *   electron-chrome-web-store 0.13.0 .... MIT           © Samuel Maddock
 *   adm-zip 0.5.18 ...................... MIT           © Another-D-Mention Software e contribuidores
 *   debug 4.4.3 ......................... MIT           © TJ Holowaychuk, Josh Junon
 *   ms 2.1.3 ............................ MIT           © Vercel, Inc.
 *   pbf 4.0.2 ........................... BSD-3-Clause  © Mapbox
 *   protocol-buffers-schema 3.6.1 ....... MIT           © Mathias Buus
 *   resolve-protobuf-schema 2.1.0 ....... MIT           © Mathias Buus
 *   @types/chrome 0.0.287 ............... MIT           © Microsoft Corporation (DefinitelyTyped)
 *   @types/filesystem 0.0.36 ............ MIT           © Microsoft Corporation (DefinitelyTyped)
 *   @types/filewriter 0.0.33 ............ MIT           © Microsoft Corporation (DefinitelyTyped)
 *   @types/har-format 1.2.16 ............ MIT           © Microsoft Corporation (DefinitelyTyped)
 *   electron-updater 6.8.11 ............. MIT           © Loopline Systems
 *   builder-util-runtime 9.7.0 .......... MIT           © Loopline Systems
 *   lazy-val 1.0.5 ...................... MIT           © Vladimir Krivosheev
 *   fs-extra 10.1.0 ..................... MIT           © JP Richardson
 *   jsonfile 6.2.1 ...................... MIT           © JP Richardson
 *   universalify 2.0.1 .................. MIT           © Ryan Zimmerman
 *   graceful-fs 4.2.12 .................. BlueOak-1.0.0 © Isaac Z. Schlueter e contribuidores
 *   sax 1.6.1 ........................... BlueOak-1.0.0 © Isaac Z. Schlueter e contribuidores
 *   semver 7.7.4 ........................ ISC           © Isaac Z. Schlueter e contribuidores
 *   js-yaml 4.3.2 ....................... MIT           © Vitaly Puzrin
 *   argparse 2.0.1 ...................... Python-2.0    © Python Software Foundation (porte de Vitaly Puzrin)
 *   lodash.escaperegexp 4.1.2 ........... MIT           © jQuery Foundation e contribuidores
 *   lodash.isequal 4.5.0 ................ MIT           © JS Foundation e contribuidores
 *   tiny-typed-emitter 2.1.0 ............ MIT           © Zurab Benashvili
 *
 * Ferramentas de empacotamento (geram os instaladores; não rodam dentro do navegador)
 *   electron-builder 26.18.0 ............ MIT           © Loopline Systems
 *   NSIS (instalador do Windows) ........ zlib/libpng   © Nullsoft e contribuidores do NSIS
 *
 * Conteúdo de terceiros acessado pelo navegador (não incluído no app)
 *   Chrome Web Store — serviço do Google, sujeito aos termos do Google.
 *   Mecanismos de busca (DuckDuckGo, Google, Bing, Brave) — serviços de seus donos.
 *
 * Para atualizar esta lista após mudar dependências:
 *   npm ls --omit=dev --all
 */
const { app, BrowserWindow, WebContentsView, Menu, MenuItem, clipboard, dialog, ipcMain, nativeImage, nativeTheme, net, protocol, session, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const { ElectronChromeExtensions } = require('electron-chrome-extensions');
const { installChromeWebStore, uninstallExtension } = require('electron-chrome-web-store');
const { toUrl, ENGINES } = require('./url');
const store = require('./lib/store');
const ctxs = require('./lib/contexts');
const { createAudit } = require('./lib/audit');
const snapshots = require('./lib/snapshots');
const capsules = require('./lib/capsules');
const { hasInternet, NETWORK_ERRORS } = require('./lib/connectivity');
const { displayHost } = require('./lib/hosts');
const { autoUpdater } = require('electron-updater');

const BAR = 80;    // abas (40) + endereço (40)
const PROMPT = 44; // faixa de permissão, quando visível
const BMBAR = 32;  // barra de favoritos, quando visível

// Sites como o WhatsApp Web recusam navegadores que não reconhecem ("O WhatsApp funciona no Google Chrome…").
// O Mercurio se apresenta como o Chrome em que é baseado: tira "Mercurio/x" e "Electron/x" da identificação.
// Testado em 22/11/2026: nem "Mercurio/x" no FINAL (como o "Edg/" do Edge) passa; o WhatsApp só aceita navegadores
// que conhece. Para contar usuários, usar os acessos ao latest.yml da atualização automática (memoria.md).
app.userAgentFallback = app.userAgentFallback.replace(/ (Mercurio|mercurio|Electron)\/\S+/g, '');

// Páginas internas em mercurio://app/ (e não file://): sites não conseguem abri-las, extensões com acesso a
// arquivos não as alcançam e só os arquivos desta lista são servidos.
protocol.registerSchemesAsPrivileged([{ scheme: 'mercurio', privileges: { standard: true, secure: true } }]);
const SERVED = new Set(['ui.html', 'ui.js', 'home.html', 'home.js', 'accent.js', 'panel.html', 'panel.js', 'audit.html', 'audit.js',
  'offline.html', 'offline.js', 'aviso.html', 'aviso.js', 'assets/logo.png', 'THIRD-PARTY-NOTICES.txt']);
function serve(req) {
  const { host, pathname } = new URL(req.url);
  const file = decodeURIComponent(pathname.slice(1));
  if (host !== 'app' || !SERVED.has(file)) return new Response('', { status: 404 });
  return net.fetch(pathToFileURL(path.join(__dirname, file)).href);
}
const page = f => `mercurio://app/${f}`;
const HOME = page('home.html');
const PANEL = page('panel.html');
const AUDIT = page('audit.html');
const OFFLINE = page('offline.html');
const AVISO = page('aviso.html'); // site falso bloqueado (lib/hosts.js)
const NO_INTERNET = -106; // net::ERR_INTERNET_DISCONNECTED (o Chromium já sabe que está offline)
const NOTICES = page('THIRD-PARTY-NOTICES.txt');
const STORE = 'https://chromewebstore.google.com/';
const SITE = 'https://trestech.com.br/'; // botão Início
const ICON = path.join(__dirname, 'assets', 'icon.png');
const HISTORY_MAX = 5000;
const NEON_DEFAULT = '#39ff14'; // cor de destaque padrão (verde neon)
const SNAPSHOT_EVERY = 10 * 60 * 1000; // snapshot automático (só grava se algo mudou)

// Permissões perguntadas ao usuário; o resto é negado (ver lib/contexts.js).
const ASK = {
  media: d => {
    const t = d.mediaTypes ?? [];
    if (t.includes('video') && t.includes('audio')) return 'usar sua câmera e microfone';
    return t.includes('video') ? 'usar sua câmera' : 'usar seu microfone';
  },
  geolocation: () => 'saber sua localização',
  notifications: () => 'enviar notificações',
  'clipboard-read': () => 'ler sua área de transferência',
  midiSysex: () => 'controlar dispositivos MIDI',
};

let win, ses, extensions, decisionsFile, dataStore, capStore, snapStore;
let decisions = {}; // { origin: { permissão: true|false } } — contexto principal e cápsulas
let data = { bookmarks: [], history: [], prefs: { search: 'duckduckgo', theme: 'system', accent: NEON_DEFAULT, bookmarksBar: 'show', snapshotsMax: snapshots.DEFAULT_MAX, downloadsDir: '' } };
let caps = [];      // cápsulas persistidas (lib/capsules.js)
let snaps = [];     // snapshots (lib/snapshots.js)
let pending = [];   // pedidos de permissão aguardando resposta
let update = { status: app.isPackaged ? 'idle' : 'dev' }; // atualização automática (setupUpdates)

// Contextos (lib/contexts.js). `tabs`/`active` apontam sempre para o contexto visível.
const contexts = new Map();
const capDecisions = new Map(); // id da cápsula -> decisões de permissão (memória)
let main, ctx;
let tabs = [];
let active = -1;

const cur = () => tabs[active]?.webContents;
const isWeb = u => /^https?:/.test(u);
const isPanel = u => String(u).startsWith(PANEL);
const isAudit = u => String(u).startsWith(AUDIT);
const isInternal = u => isPanel(u) || isAudit(u);
const home = () => `${HOME}?e=${data.prefs.search}&a=${encodeURIComponent(data.prefs.accent)}`;
const barVisible = () => data.prefs.bookmarksBar === 'show' && data.bookmarks.length > 0;
const barItems = () => [...data.bookmarks].reverse(); // na barra: ordem em que foram adicionados
const isAccent = v => /^#[0-9a-f]{6}$/i.test(v);
const save = () => dataStore.save();
const ephemeral = () => [...contexts.values()].find(c => c.kind === 'ephemeral');

const globalDecisions = {
  get: (o, p) => decisions[o]?.[p],
  set: (o, p, v) => { (decisions[o] ??= {})[p] = v; saveDecisions(); },
};
const saveDecisions = () => store.writeJSON(decisionsFile, decisions);

function shownUrl(u) {
  if (u.startsWith(HOME)) return '';
  if (isPanel(u)) return 'mercurio://painel';
  if (isAudit(u)) return 'mercurio://auditoria';
  // offline e aviso de site falso: mostra o endereço que não abriu (o falso fica em xn--..., que revela o truque)
  if (u.startsWith(OFFLINE) || u.startsWith(AVISO)) return new URL(u).searchParams.get('u') ?? '';
  try {
    const { hostname } = new URL(u);
    const shown = displayHost(hostname); // "xn--po-sia.com" -> "pão.com" quando é seguro
    if (shown !== hostname) return u.replace(hostname, shown);
  } catch {}
  return u;
}

// Site falso (lib/hosts.js): a navegação foi cancelada; mostra o aviso na aba.
function onBlocked(wc, url, reason) {
  if (!wc.isDestroyed()) wc.loadURL(`${AVISO}?u=${encodeURIComponent(url)}&r=${encodeURIComponent(reason)}`);
}

// O ícone da aba é baixado pela sessão da própria aba e vai para a barra como data:. Se a barra o baixasse, usaria
// a sessão principal: cookies e cache do Principal se misturariam com cápsulas e sessão efêmera.
async function iconData(ses, url) {
  try {
    const r = await ses.fetch(url);
    const type = (r.headers.get('content-type') ?? '').split(';')[0];
    const buf = Buffer.from(await r.arrayBuffer());
    if (!r.ok || !type.startsWith('image/') || buf.length > 200_000) return undefined;
    return `data:${type};base64,${buf.toString('base64')}`;
  } catch { return undefined; }
}

const GESTURES = new Set(['mouseDown', 'rawKeyDown', 'keyDown', 'touchStart', 'gestureTap']);

// Esc sempre sai da tela cheia (vale com o foco na aba ou na barra). Roda num mundo isolado: o site não consegue
// trocar document.exitFullscreen para prender o usuário.
let fullscreenWc = null;
function exitFullscreen() {
  if (fullscreenWc && !fullscreenWc.isDestroyed()) fullscreenWc.executeJavaScriptInIsolatedWorld(999, [{ code: 'document.exitFullscreen()' }]).catch(() => {});
}

function tabTitle(wc) {
  const u = wc.getURL();
  if (isPanel(u)) return 'Painel';
  if (isAudit(u)) return 'Auditoria';
  return wc.getTitle() || 'Nova aba';
}

function sync() {
  if (!win || win.isDestroyed()) return;
  const wc = cur();
  const url = wc?.getURL() ?? '';
  win.webContents.send('state', {
    context: { kind: ctx.kind, name: ctx.name },
    tabs: tabs.map(v => ({
      title: tabTitle(v.webContents),
      loading: v.webContents.isLoading(),
      favicon: v.icon,
      panel: isInternal(v.webContents.getURL()),
    })),
    active,
    accent: data.prefs.accent,
    url: shownUrl(url),
    blocked: url.startsWith(AVISO),
    bookmarkable: isWeb(url),
    popups: tabs[active]?.blocked?.length ?? 0,
    bookmarked: data.bookmarks.some(b => b.url === url),
    bookmarks: barVisible() ? barItems().map(({ url, title, favicon }) => ({ url, title, favicon })) : [],
    canBack: wc?.navigationHistory.canGoBack() ?? false,
    canForward: wc?.navigationHistory.canGoForward() ?? false,
    prompt: pending[0] ? { origin: pending[0].origin, label: pending[0].label } : null,
    downloads: downloadState(),
    update: update.status === 'downloaded' ? update.version : null,
  });
}

// ---- downloads ----
// Vão direto para a pasta escolhida em Preferências (padrão: Downloads do sistema), sem perguntar, como no Chrome.
// O Chromium já marca o arquivo como "baixado da internet" (Windows), então o SmartScreen continua avisando.
const downloads = new Set();     // em andamento
let lastDownload = null;         // { at, file } do último concluído
const trackedSessions = new WeakSet();
const downloadsDir = () => {
  const d = data.prefs.downloadsDir;
  return d && fs.existsSync(d) ? d : app.getPath('downloads'); // pasta escolhida sumiu (pen drive): volta ao padrão
};

// "relatorio.pdf" -> "relatorio (1).pdf" se já existir
function freePath(dir, name) {
  const base = path.basename(name || 'download') || 'download';
  const ext = path.extname(base);
  const stem = base.slice(0, base.length - ext.length);
  let file = path.join(dir, base);
  for (let i = 1; fs.existsSync(file); i++) file = path.join(dir, `${stem} (${i})${ext}`);
  return file;
}

let downloadTimer = null; // o progresso chega várias vezes por segundo: a barra é atualizada no máximo 4×/s
const syncSoon = () => { downloadTimer ??= setTimeout(() => { downloadTimer = null; sync(); }, 250); };

function trackDownloads(ses) {
  if (trackedSessions.has(ses)) return;
  trackedSessions.add(ses);
  ses.on('will-download', (_e, item) => {
    item.setSavePath(freePath(downloadsDir(), item.getFilename()));
    downloads.add(item);
    item.on('updated', syncSoon);
    item.once('done', (_e2, state) => {
      downloads.delete(item);
      if (state === 'completed') lastDownload = { at: Date.now(), file: item.getSavePath() };
      sync();
    });
    sync();
  });
}

function downloadState() {
  let got = 0, total = 0;
  for (const d of downloads) { got += d.getReceivedBytes(); total += d.getTotalBytes(); }
  // total 0 = o site não informou o tamanho: a barra fica "indeterminada"
  return { active: downloads.size, progress: total > 0 ? got / total : null, doneAt: lastDownload?.at ?? 0 };
}

function openDownloads() {
  if (lastDownload && fs.existsSync(lastDownload.file)) shell.showItemInFolder(lastDownload.file); // abre a pasta com o arquivo selecionado
  else shell.openPath(downloadsDir());
}

// Política de segurança + downloads para cada sessão (Principal, cápsula, efêmera).
// Menu do ícone "pop-ups bloqueados" da barra de endereço.
function popupsMenu(pos) {
  const view = tabs[active];
  const urls = view?.blocked ?? [];
  if (!urls.length) return;
  const site = ctxs.originOf(view.webContents.getURL());
  const owner = view.ctx;
  const clear = () => { view.blocked = undefined; sync(); };
  const short = u => (u.length > 70 ? u.slice(0, 67) + '…' : u);
  const items = [
    { label: `${urls.length} pop-up${urls.length > 1 ? 's bloqueados' : ' bloqueado'} nesta página`, enabled: false },
    ...urls.slice(-5).reverse().map(u => ({ label: `Abrir ${short(u)}`, click: () => { view.blocked = urls.filter(x => x !== u); newTab(u); } })),
    { type: 'separator' },
    {
      label: `Sempre permitir pop-ups de ${site ? new URL(site).host : 'este site'}`,
      enabled: !!site && !!owner.decisions,
      click: () => { owner.decisions.set(site, 'popups', true); clear(); urls.forEach(u => newTab(u)); },
    },
    { label: 'Continuar bloqueando', click: clear },
  ];
  const x = Number(pos?.x), y = Number(pos?.y);
  Menu.buildFromTemplate(items).popup({ window: win, x: Number.isFinite(x) ? Math.round(x) : 0, y: Number.isFinite(y) ? Math.round(y) : 80 });
}

function secure(s, decisions) {
  ctxs.harden(s, { decisions, onAsk, onBlocked, serve });
  trackDownloads(s);
}

// ---- atualização automática ----
// O instalador publica latest.yml + .exe em build.publish (package.json). O app confere ao abrir e a cada 6 h,
// baixa em segundo plano (com verificação SHA-512) e instala ao clicar "Atualizar" ou ao fechar o navegador.
// MERCURIO_UPDATE_URL troca o endereço (para testar com um servidor local).
const UPDATE_EVERY = 6 * 60 * 60 * 1000;

function setupUpdates() {
  if (!app.isPackaged) return; // rodando com "npm start": não há instalação para atualizar
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.disableWebInstaller = true; // só aceita o instalador completo publicado no latest.yml
  if (process.env.MERCURIO_UPDATE_URL) autoUpdater.setFeedURL({ provider: 'generic', url: process.env.MERCURIO_UPDATE_URL });
  const set = (status, extra) => { update = { ...update, status, ...extra }; sync(); };
  autoUpdater.on('checking-for-update', () => set('checking'));
  autoUpdater.on('update-not-available', () => set('none'));
  autoUpdater.on('update-available', i => set('downloading', { version: i.version }));
  autoUpdater.on('update-downloaded', i => set('downloaded', { version: i.version }));
  autoUpdater.on('error', err => { console.error('Atualização:', err.message); set('error'); });
  checkUpdates();
  setInterval(checkUpdates, UPDATE_EVERY);
}

function checkUpdates() {
  if (!app.isPackaged) return;
  autoUpdater.checkForUpdates().catch(() => {}); // sem internet/site fora do ar: tenta de novo depois
}

function layout() {
  const top = BAR + (barVisible() ? BMBAR : 0) + (pending.length ? PROMPT : 0);
  const [width, height] = win.getContentSize();
  for (const v of tabs) v.setBounds({ x: 0, y: top, width, height: height - top });
}

function select(i) {
  active = ctx.active = i;
  tabs.forEach((v, j) => v.setVisible(j === i));
  layout();
  if (ctx === main) extensions.selectTab(tabs[i].webContents);
  sync();
}

// Troca o contexto visível. `seed` (abas guardadas) é aberto se o contexto estiver vazio.
function switchContext(c, seed) {
  if (c !== ctx) {
    if (ctx) { ctx.active = active; ctx.tabs.forEach(v => v.setVisible(false)); }
    ctx = c;
    tabs = c.tabs;
    active = c.active;
  }
  if (tabs.length) return select(Math.max(0, Math.min(active, tabs.length - 1)));
  const saved = snapshots.restorableTabs(seed ?? {});
  if (!saved.length) return newTab();
  saved.forEach(t => newTab(t.url));
  select(Math.max(0, Math.min(seed.active ?? 0, tabs.length - 1)));
}

// Abre uma aba no contexto visível.
function newTab(url) {
  url = url || (ctx === main && extensions.getURLOverrides().newtab) || home();
  const owner = ctx;
  const internal = isInternal(url);
  const view = new WebContentsView({
    webPreferences: {
      session: owner.ses,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      // só as páginas internas (painel, auditoria) recebem a ponte com o navegador
      preload: internal ? path.join(__dirname, 'panel-preload.js') : undefined,
    },
  });
  view.ctx = owner;
  const wc = view.webContents;
  // Bloqueador de pop-ups: pop-ups viram abas do mesmo contexto, e só com clique ou tecla recente na aba visível
  // (um por gesto), como no Chrome. O resto é bloqueado e aparece no ícone da barra de endereço, onde dá para abrir
  // ou "sempre permitir" o site (decisão 'popups', revogável em Preferências → Permissões dos sites).
  wc.on('input-event', (_e, i) => { if (GESTURES.has(i.type)) view.gesture = Date.now(); });
  wc.setWindowOpenHandler(({ url }) => {
    if (!isWeb(url)) return { action: 'deny' };
    const gesture = Date.now() - (view.gesture ?? 0) < 5000 && tabs[active] === view;
    if (gesture) { view.gesture = 0; newTab(url); }
    else if (owner.decisions?.get(ctxs.originOf(wc.getURL()), 'popups') === true) { switchContext(owner); newTab(url); }
    else { view.blocked = [...(view.blocked ?? []), url].slice(-20); sync(); }
    return { action: 'deny' };
  });
  if (internal) {
    // páginas internas nunca saem de si mesmas: links abrem em aba nova
    wc.on('will-navigate', (e, u) => { if (!isInternal(u)) { e.preventDefault(); if (isWeb(u)) newTab(u); } });
  } else {
    // sites não abrem páginas internas (nem em iframe)
    wc.on('will-frame-navigate', d => { if (d.url.startsWith('mercurio:')) d.preventDefault(); });
  }
  wc.on('enter-html-full-screen', () => { fullscreenWc = wc; });
  wc.on('leave-html-full-screen', () => { if (fullscreenWc === wc) fullscreenWc = null; });
  wc.on('page-favicon-updated', async (_e, icons) => {
    const url = icons.find(i => i.startsWith('https:'));
    view.favicon = url; // endereço: guardado nos favoritos (sessão principal)
    view.icon = url && await iconData(wc.session, url); // imagem: mostrada na aba
    if (wc.isDestroyed() || view.favicon !== url) return; // mudou de página enquanto baixava
    const b = data.bookmarks.find(x => x.url === wc.getURL());
    if (b && url && b.favicon !== url) { b.favicon = url; save(); }
    sync();
  });
  wc.on('did-start-navigation', (_e, _u, inPage, isMain) => { if (isMain && !inPage) view.favicon = view.icon = view.blocked = undefined; });
  // sem internet: mostra o joguinho no lugar do erro; a página volta sozinha quando a conexão retorna.
  // Erro de rede ambíguo (ex.: "endereço não encontrado") é confirmado com um teste real de conexão.
  wc.on('did-fail-load', async (_e, code, _desc, failed, isMain) => {
    if (!isMain || !isWeb(failed) || !NETWORK_ERRORS.has(code)) return;
    if (code !== NO_INTERNET && await hasInternet({ fetch: net.fetch })) return; // tem internet: era endereço errado
    if (!wc.isDestroyed() && wc.getURL() === failed) {
      wc.loadURL(`${OFFLINE}?u=${encodeURIComponent(failed)}`);
      watchOffline();
    }
  });
  if (owner === main) {
    // histórico só da navegação principal: cápsulas e sessão efêmera não se misturam
    wc.on('did-navigate', (_e, u) => recordHistory(u, wc));
    wc.on('page-title-updated', (_e, title) => {
      const h = data.history[0];
      if (h && h.url === wc.getURL()) { h.title = title; save(); }
    });
  }
  if (owner.audit) wc.on('did-navigate', (_e, u) => owner.audit.navigation(u));
  for (const ev of ['did-navigate', 'did-navigate-in-page', 'page-title-updated', 'did-start-loading', 'did-stop-loading']) {
    wc.on(ev, sync);
  }
  wc.on('context-menu', (_e, p) => contextMenu(wc, p));
  shortcuts(wc);
  tabs.push(view);
  win.contentView.addChildView(view);
  if (owner === main) extensions.addTab(wc, win);
  select(tabs.length - 1);
  wc.loadURL(url);
  return view;
}

// Enquanto houver aba no jogo offline, testa a conexão; quando voltar, reabre o site em cada uma.
// Limpa o cache de DNS antes: o Chromium lembra por um tempo que "o endereço não existe".
let offlineTimer = null;
function watchOffline() {
  if (offlineTimer) return;
  offlineTimer = setInterval(async () => {
    const waiting = [...contexts.values()].flatMap(c => c.tabs).filter(v => v.webContents.getURL().startsWith(OFFLINE));
    if (!waiting.length) { clearInterval(offlineTimer); offlineTimer = null; return; }
    await ses.clearHostResolverCache();
    if (!(await hasInternet({ fetch: net.fetch }))) return;
    for (const v of waiting) {
      const wc = v.webContents;
      if (wc.isDestroyed() || !wc.getURL().startsWith(OFFLINE)) continue;
      const target = new URL(wc.getURL()).searchParams.get('u');
      if (!isWeb(target)) continue; // só http/https
      await wc.session.clearHostResolverCache(); // a aba pode ser de uma cápsula (outra sessão)
      wc.loadURL(target);
    }
  }, 4000);
}

// Nega pedidos de permissão que casam com `pred` (ex.: de uma aba que fechou).
function dropPending(pred) {
  const before = pending.length;
  pending = pending.filter(p => !pred(p) || p.cb(false));
  if (pending.length !== before) layout();
}

function closeView(v) {
  dropPending(p => p.wc === v.webContents);
  win.contentView.removeChildView(v);
  v.webContents.close();
}

function closeTab(i) {
  const [v] = tabs.splice(i, 1);
  closeView(v);
  if (!tabs.length) return ctx.kind === 'ephemeral' ? endEphemeral() : newTab();
  if (i < active) active--;
  select(Math.min(active, tabs.length - 1));
}

// Fecha todas as abas de um contexto (pausar cápsula, encerrar efêmera).
function closeContextViews(c) {
  for (const v of c.tabs) closeView(v);
  c.tabs.length = 0;
  c.active = -1;
}

function openPanel(section = 'favoritos') {
  switchContext(main); // o painel sempre vive no contexto principal
  const i = tabs.findIndex(v => isPanel(v.webContents.getURL()));
  if (i < 0) return newTab(`${PANEL}#${section}`);
  tabs[i].webContents.loadURL(`${PANEL}#${section}`);
  select(i);
}

function recordHistory(url, wc) {
  if (!isWeb(url)) return;
  data.history.unshift({ url, title: wc.getTitle(), t: Date.now() });
  if (data.history.length > HISTORY_MAX) data.history.length = HISTORY_MAX;
  save();
}

function toggleBookmark() {
  const wc = cur();
  const url = wc?.getURL();
  if (!isWeb(url)) return;
  const i = data.bookmarks.findIndex(b => b.url === url);
  if (i >= 0) data.bookmarks.splice(i, 1);
  else data.bookmarks.unshift({ url, title: wc.getTitle() || url, favicon: tabs[active].favicon, t: Date.now() });
  save();
  layout();
  sync();
}

// ---- permissões ----

function onAsk(req) {
  if (!ASK[req.perm] || !req.origin) return req.cb(false);
  const owner = [...contexts.values()].find(c => c.tabs.some(v => v.webContents === req.wc));
  const where = owner && owner !== main ? ` (${owner.name})` : '';
  pending.push({ ...req, label: ASK[req.perm](req.details) + where });
  if (pending.length === 1) { layout(); sync(); }
}

function answerPermission(allow) {
  const p = pending[0];
  if (!p) return;
  p.decisions.set(p.origin, p.perm, allow);
  // resolve também pedidos repetidos do mesmo site/permissão/sessão
  pending = pending.filter(q => !(q.decisions === p.decisions && q.origin === p.origin && q.perm === p.perm) || q.cb(allow));
  layout();
  sync();
}

// ---- sessão efêmera auditável ----

function openEphemeral() {
  let e = ephemeral();
  if (!e) {
    e = ctxs.createContext('ephemeral', 'Sessão efêmera');
    e.decisions = ctxs.memoryDecisions(); // permissões também só na memória
    secure(e.ses, e.decisions);
    e.audit = createAudit(e.ses);
    contexts.set(e.id, e);
  }
  switchContext(e);
}

function openAudit() {
  const e = ephemeral();
  if (!e) return;
  switchContext(e);
  const i = tabs.findIndex(v => isAudit(v.webContents.getURL()));
  if (i >= 0) select(i); else newTab(AUDIT);
}

// Fecha as abas, remove os ganchos de rede, descarta o registro e apaga os dados da sessão.
async function endEphemeral() {
  const e = ephemeral();
  if (!e) return;
  if (ctx === e) switchContext(main);
  closeContextViews(e);
  e.audit.dispose();
  contexts.delete(e.id);
  sync();
  await ctxs.wipe(e.ses);
}

const auditActions = {
  get: () => {
    const e = ephemeral();
    return e ? { startedAt: e.audit.startedAt, events: e.audit.events } : null;
  },
  export: async () => {
    const e = ephemeral();
    if (!e) return false;
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Exportar auditoria',
      defaultPath: `auditoria-mercurio-${stamp}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (canceled || !filePath) return false;
    const report = { app: `Mercurio ${app.getVersion()}`, startedAt: e.audit.startedAt, exportedAt: Date.now(), events: e.audit.events };
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
    return true;
  },
  end: () => endEphemeral(),
};

// ---- cápsulas de contexto ----

// Estado atual de um contexto, no formato que lib/snapshots.js entende.
const describe = c => ({
  kind: c.kind, id: c.id, name: c.name,
  active: c === ctx ? active : c.active,
  tabs: c.tabs.map(v => ({ url: v.webContents.getURL(), title: v.webContents.getTitle() })),
});

// Guarda as abas abertas de uma cápsula viva no capsules.json.
function storeCapsuleTabs(c) {
  const s = snapshots.serialize([describe(c)])[0];
  capsules.update(caps, c.id, { tabs: s?.tabs ?? [], active: Math.max(0, s?.active ?? 0) });
  capStore.save();
}

function createCapsule(name) {
  const cap = capsules.create(caps, name);
  capStore.save();
  resumeCapsule(cap.id);
  return cap;
}

function resumeCapsule(id) {
  const cap = capsules.find(caps, id);
  if (!cap) throw new Error('Cápsula não encontrada');
  let c = contexts.get(id);
  if (!c) {
    c = ctxs.createContext('capsule', cap.name, cap.id);
    // ponytail: permissões da cápsula ficam na memória (separadas do Principal) e são perguntadas de novo
    // depois de reabrir o navegador; guardar por cápsula se isso incomodar
    if (!capDecisions.has(id)) capDecisions.set(id, ctxs.memoryDecisions());
    c.decisions = capDecisions.get(id);
    secure(c.ses, c.decisions);
    contexts.set(id, c);
  }
  switchContext(c, cap);
}

// Pausar = guardar as abas e fechá-las de verdade (libera memória). Os logins ficam na partição.
function pauseCapsule(id) {
  const c = contexts.get(id);
  if (!c || c.kind !== 'capsule') return;
  storeCapsuleTabs(c);
  if (ctx === c) switchContext(main);
  closeContextViews(c);
  contexts.delete(id);
  sync();
}

async function deleteCapsule(id) {
  const c = contexts.get(id);
  if (c) {
    if (ctx === c) switchContext(main);
    closeContextViews(c);
    contexts.delete(id);
  }
  caps = capsules.remove(caps, id);
  capDecisions.delete(id);
  capStore.save();
  sync();
  await ctxs.wipe(session.fromPartition(ctxs.partitionOf('capsule', id))); // cookies, logins e cache da cápsula
}

function renameCapsule(id, name) {
  const cap = capsules.update(caps, id, { name });
  const c = contexts.get(id);
  if (c) c.name = cap.name;
  capStore.save();
  sync();
}

// ---- snapshots de sessão ----

function takeSnapshot(reason) {
  const r = snapshots.addSnapshot(snaps, snapshots.serialize([...contexts.values()].map(describe)), reason, data.prefs.snapshotsMax);
  snaps = r.list;
  if (r.added) snapStore.save();
  return r.added;
}

// Restaura "ao lado": as abas do snapshot são abertas junto com as atuais.
function restoreSnapshot(id) {
  const s = snaps.find(x => x.id === id);
  if (!s) throw new Error('Snapshot não encontrado');
  for (const c of s.contexts) {
    const saved = snapshots.restorableTabs(c);
    if (!saved.length) continue;
    if (c.kind === 'capsule') {
      // a cápsula pode ter sido excluída depois do snapshot: recria com o mesmo nome
      const cap = capsules.find(caps, c.id) ?? capsules.create(caps, c.name);
      capStore.save();
      resumeCapsule(cap.id);
    } else {
      switchContext(main);
    }
    saved.forEach(t => newTab(t.url));
  }
}

// ---- menu de contextos (botão "● Principal ▾") ----

function contextsMenu(pos) {
  const eph = ephemeral();
  const live = caps.filter(c => contexts.has(c.id));
  const paused = caps.filter(c => !contexts.has(c.id));
  const radio = (label, c) => ({ label, type: 'radio', checked: ctx === c, click: () => switchContext(c) });
  const t = [radio('Principal', main), ...live.map(cap => radio(`◆  ${cap.name}`, contexts.get(cap.id)))];
  if (eph) t.push(radio('◌  Sessão efêmera', eph));
  t.push({ type: 'separator' });
  if (paused.length) t.push({ label: 'Retomar cápsula', submenu: paused.map(cap => ({ label: cap.name, click: () => resumeCapsule(cap.id) })) });
  t.push({ label: 'Nova cápsula', click: () => createCapsule() });
  if (ctx.kind === 'capsule') t.push({ label: `Pausar "${ctx.name}"`, click: () => pauseCapsule(ctx.id) });
  t.push({ label: 'Gerenciar cápsulas…', click: () => openPanel('capsulas') }, { type: 'separator' });
  if (eph) t.push({ label: 'Ver auditoria', click: openAudit }, { label: 'Encerrar sessão efêmera', click: endEphemeral });
  else t.push({ label: 'Nova sessão efêmera', accelerator: 'CmdOrCtrl+Shift+N', click: openEphemeral });
  t.push({ type: 'separator' },
    { label: 'Salvar snapshot agora', click: () => takeSnapshot('manual') },
    { label: 'Snapshots…', click: () => openPanel('snapshots') });
  const x = Number(pos?.x), y = Number(pos?.y);
  Menu.buildFromTemplate(t).popup({ window: win, x: Number.isFinite(x) ? Math.round(x) : 0, y: Number.isFinite(y) ? Math.round(y) : 40 });
}

const commands = {
  go: s => {
    s = String(s).trim();
    if (/^mercurio:\/\/(painel|settings)/i.test(s)) return openPanel();
    if (/^mercurio:\/\/auditoria/i.test(s)) return openAudit();
    const url = toUrl(s, data.prefs.search);
    isInternal(cur()?.getURL()) ? newTab(url) : cur()?.loadURL(url);
  },
  back: () => cur()?.navigationHistory.goBack(),
  forward: () => cur()?.navigationHistory.goForward(),
  reload: () => cur()?.reload(),
  home: () => commands.go(SITE),
  newTab: () => newTab(),
  panel: () => openPanel(),
  downloads: openDownloads,
  contexts: pos => contextsMenu(pos),
  ephemeral: openEphemeral,
  endEphemeral: () => endEphemeral(),
  audit: openAudit,
  bookmark: toggleBookmark,
  open: url => isWeb(url) && commands.go(url),
  openTab: url => isWeb(url) && newTab(url),
  bookmarkMenu: url => {
    const b = data.bookmarks.find(x => x.url === url);
    if (!b) return;
    Menu.buildFromTemplate([
      { label: 'Abrir', click: () => commands.go(b.url) },
      { label: 'Abrir em nova aba', click: () => newTab(b.url) },
      { label: 'Copiar endereço', click: () => clipboard.writeText(b.url) },
      { type: 'separator' },
      { label: 'Remover dos favoritos', click: () => panelActions.removeBookmark(b.url) },
    ]).popup({ window: win });
  },
  popups: pos => popupsMenu(pos),
  bookmarksOverflow: from => {
    const items = barItems().slice(Number(from) || 0);
    if (items.length) Menu.buildFromTemplate(items.map(b => ({ label: b.title, click: () => commands.go(b.url) }))).popup({ window: win });
  },
  select: i => tabs[i] && select(i),
  close: i => tabs[i] && closeTab(i),
  permission: allow => answerPermission(allow === true),
  installUpdate: () => update.status === 'downloaded' && autoUpdater.quitAndInstall(),
};

// ---- painel (favoritos, histórico, extensões, cápsulas, snapshots, preferências) ----

// Traduz nomes "__MSG_x__" das extensões usando os _locales delas.
function extMsg(ext, s) {
  const m = /^__MSG_(\w+)__$/.exec(s ?? '');
  if (!m) return s;
  for (const loc of ['pt_BR', 'pt', ext.manifest.default_locale, 'en']) {
    try {
      const msgs = JSON.parse(fs.readFileSync(path.join(ext.path, '_locales', loc, 'messages.json'), 'utf8'));
      const key = Object.keys(msgs).find(k => k.toLowerCase() === m[1].toLowerCase());
      if (key) return msgs[key].message;
    } catch {}
  }
  return s;
}

function extIcon(ext) {
  const icons = ext.manifest.icons ?? {};
  const size = Object.keys(icons).sort((a, b) => b - a)[0];
  if (!size) return null;
  const img = nativeImage.createFromPath(path.join(ext.path, icons[size]));
  return img.isEmpty() ? null : img.resize({ width: 48, quality: 'best' }).toDataURL();
}

// ---- importar favoritos do Chrome (e Edge/Brave, que usam o mesmo formato) ----

function chromiumDirs() {
  const home = app.getPath('home');
  const local = process.env.LOCALAPPDATA ?? '';
  const mac = path.join(home, 'Library', 'Application Support');
  const cfg = path.join(home, '.config');
  return {
    win32: [['Google Chrome', path.join(local, 'Google', 'Chrome', 'User Data')],
      ['Microsoft Edge', path.join(local, 'Microsoft', 'Edge', 'User Data')],
      ['Brave', path.join(local, 'BraveSoftware', 'Brave-Browser', 'User Data')]],
    darwin: [['Google Chrome', path.join(mac, 'Google', 'Chrome')],
      ['Microsoft Edge', path.join(mac, 'Microsoft Edge')],
      ['Brave', path.join(mac, 'BraveSoftware', 'Brave-Browser')]],
    linux: [['Google Chrome', path.join(cfg, 'google-chrome')], ['Chromium', path.join(cfg, 'chromium')],
      ['Microsoft Edge', path.join(cfg, 'microsoft-edge')], ['Brave', path.join(cfg, 'BraveSoftware', 'Brave-Browser')]],
  }[process.platform] ?? [];
}

// Lê o arquivo "Bookmarks" de um perfil. Pastas são achatadas (o Mercurio não tem pastas).
function readChromiumBookmarks(file) {
  let roots;
  try { roots = JSON.parse(fs.readFileSync(file, 'utf8')).roots; } catch { return []; }
  const out = [];
  const walk = n => {
    if (!n) return;
    if (n.type === 'url' && isWeb(n.url)) out.push({ url: n.url, title: String(n.name || n.url).slice(0, 300) });
    (n.children ?? []).forEach(walk);
  };
  ['bookmark_bar', 'other', 'synced'].forEach(k => walk(roots?.[k]));
  return out;
}

// Perfis encontrados neste computador. O painel só recebe o id; o caminho fica aqui.
function importSources() {
  const out = [];
  for (const [browser, dir] of chromiumDirs()) {
    let profiles;
    try { profiles = fs.readdirSync(dir).filter(p => p === 'Default' || /^Profile \d+$/.test(p)); } catch { continue; }
    let names = {};
    try { names = JSON.parse(fs.readFileSync(path.join(dir, 'Local State'), 'utf8')).profile.info_cache ?? {}; } catch {}
    for (const p of profiles) {
      const file = path.join(dir, p, 'Bookmarks');
      const count = readChromiumBookmarks(file).length;
      if (count) out.push({ id: `${browser}|${p}`, browser, profile: names[p]?.name || p, count, file });
    }
  }
  return out;
}

function importBookmarks(id) {
  const src = importSources().find(s => s.id === id);
  if (!src) throw new Error('Perfil não encontrado');
  const have = new Set(data.bookmarks.map(b => b.url));
  const t = Date.now();
  // unshift em ordem: na barra (ordem inversa) eles entram depois dos atuais, na ordem do Chrome
  for (const b of readChromiumBookmarks(src.file)) {
    if (have.has(b.url)) continue;
    have.add(b.url);
    data.bookmarks.unshift({ ...b, t });
  }
  save();
  layout();
  sync();
}

function panelData() {
  return {
    version: app.getVersion(),
    update,
    engines: Object.fromEntries(Object.entries(ENGINES).map(([k, v]) => [k, v.name])),
    prefs: data.prefs,
    downloadsDir: downloadsDir(),
    bookmarks: data.bookmarks,
    history: data.history,
    importSources: importSources().map(({ file, ...s }) => s), // sem caminhos para o painel
    permissions: Object.entries(decisions).flatMap(([origin, perms]) =>
      Object.entries(perms).map(([perm, allow]) => ({ origin, perm, allow }))),
    extensions: (ses.extensions ?? ses).getAllExtensions().map(x => ({
      id: x.id,
      name: extMsg(x, x.name),
      version: x.version,
      description: extMsg(x, x.manifest.description),
      icon: extIcon(x),
    })),
    capsules: caps.map(c => {
      const live = contexts.get(c.id);
      return {
        id: c.id, name: c.name, notes: c.notes, updatedAt: c.updatedAt,
        live: !!live, current: live === ctx,
        tabCount: live ? live.tabs.filter(v => isWeb(v.webContents.getURL())).length : c.tabs.length,
      };
    }),
    snapshots: snaps.map(s => ({
      id: s.id, t: s.t, reason: s.reason,
      contexts: s.contexts.map(c => ({ kind: c.kind, name: c.name, count: c.tabs.length })),
    })),
  };
}

const panelActions = {
  get: () => {},
  removeBookmark: url => { data.bookmarks = data.bookmarks.filter(b => b.url !== url); save(); layout(); sync(); },
  removeHistory: t => { data.history = data.history.filter(h => h.t !== t); save(); },
  clearHistory: () => { data.history = []; save(); },
  clearBookmarks: () => { data.bookmarks = []; save(); layout(); sync(); },
  setPref: ({ key, value }) => {
    if (key === 'search' && ENGINES[value]) data.prefs.search = value;
    if (key === 'theme' && ['system', 'dark', 'light'].includes(value)) nativeTheme.themeSource = data.prefs.theme = value;
    if (key === 'accent' && isAccent(value)) data.prefs.accent = value;
    if (key === 'bookmarksBar' && ['show', 'hide'].includes(value)) data.prefs.bookmarksBar = value;
    if (key === 'snapshotsMax') {
      data.prefs.snapshotsMax = snapshots.clampMax(value);
      snaps = snaps.slice(0, data.prefs.snapshotsMax);
      snapStore.save();
    }
    save();
    layout();
    sync();
  },
  revoke: ({ origin, perm }) => {
    if (decisions[origin]) delete decisions[origin][perm];
    if (decisions[origin] && !Object.keys(decisions[origin]).length) delete decisions[origin];
    saveDecisions();
  },
  // a pasta vem do seletor do sistema (nunca do painel), então o painel não consegue apontar para outro lugar
  chooseDownloads: async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Pasta de downloads',
      defaultPath: downloadsDir(),
      properties: ['openDirectory', 'createDirectory'],
    });
    if (!canceled && filePaths[0]) { data.prefs.downloadsDir = filePaths[0]; save(); }
  },
  resetDownloads: () => { data.prefs.downloadsDir = ''; save(); },
  openDownloads: () => shell.openPath(downloadsDir()),
  uninstall: id => uninstallExtension(String(id), { session: ses }),
  clearData: async () => { await ses.clearStorageData(); await ses.clearCache(); },
  store: () => newTab(STORE),
  notices: () => newTab(NOTICES),
  importBookmarks: id => importBookmarks(String(id)),
  createCapsule: name => { createCapsule(name); },
  renameCapsule: ({ id, name }) => renameCapsule(String(id), name),
  noteCapsule: ({ id, notes }) => { capsules.update(caps, String(id), { notes }); capStore.save(); },
  resumeCapsule: id => resumeCapsule(String(id)),
  pauseCapsule: id => pauseCapsule(String(id)),
  deleteCapsule: id => deleteCapsule(String(id)),
  snapshotNow: () => { takeSnapshot('manual'); },
  restoreSnapshot: id => restoreSnapshot(String(id)),
  deleteSnapshot: id => { snaps = snaps.filter(s => s.id !== id); snapStore.save(); },
  checkUpdates: () => checkUpdates(),
  installUpdate: () => commands.installUpdate(),
};

// Única porta das páginas internas para o processo principal; a origem do remetente decide o que pode.
ipcMain.handle('panel', async (e, name, arg) => {
  const url = e.senderFrame?.url;
  if (isPanel(url)) {
    if (!Object.hasOwn(panelActions, name)) throw new Error('ação desconhecida');
    await panelActions[name](arg);
    return panelData();
  }
  if (isAudit(url) && Object.hasOwn(auditActions, name)) return auditActions[name](arg);
  throw new Error('negado');
});

// ---- menu, atalhos, extensões ----

function contextMenu(wc, p) {
  const t = [];
  if (isWeb(p.linkURL)) {
    t.push({ label: 'Abrir link em nova aba', click: () => newTab(p.linkURL) },
      { label: 'Copiar endereço do link', click: () => clipboard.writeText(p.linkURL) }, { type: 'separator' });
  }
  if (p.isEditable) {
    t.push({ role: 'cut', label: 'Recortar' }, { role: 'copy', label: 'Copiar' }, { role: 'paste', label: 'Colar' },
      { role: 'selectAll', label: 'Selecionar tudo' }, { type: 'separator' });
  } else if (p.selectionText) {
    t.push({ role: 'copy', label: 'Copiar' }, { type: 'separator' });
  }
  t.push({ label: 'Voltar', enabled: wc.navigationHistory.canGoBack(), click: () => wc.navigationHistory.goBack() },
    { label: 'Avançar', enabled: wc.navigationHistory.canGoForward(), click: () => wc.navigationHistory.goForward() },
    { label: 'Recarregar', click: () => wc.reload() });
  const menu = Menu.buildFromTemplate(t);
  const ext = wc.session === ses ? extensions.getContextMenuItems(wc, p) : [];
  if (ext.length) menu.append(new MenuItem({ type: 'separator' }));
  for (const item of ext) menu.append(item);
  menu.append(new MenuItem({ type: 'separator' }));
  menu.append(new MenuItem({ label: 'Inspecionar', click: () => wc.inspectElement(p.x, p.y) }));
  menu.popup({ window: win });
}

function shortcuts(wc) {
  wc.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    const ctrl = input.control || input.meta;
    const k = input.key.toLowerCase();
    let fn;
    if (ctrl && input.shift && k === 'n') fn = openEphemeral;
    else if (ctrl && k === 't') fn = () => newTab();
    else if (ctrl && k === 'w') fn = () => closeTab(active);
    else if (ctrl && k === 'l') fn = () => { win.webContents.focus(); win.webContents.send('focus-url'); };
    else if ((ctrl && k === 'r') || k === 'f5') fn = commands.reload;
    else if (ctrl && k === 'tab') fn = () => select((active + (input.shift ? tabs.length - 1 : 1)) % tabs.length);
    else if (ctrl && k === 'd') fn = toggleBookmark;
    else if (ctrl && input.shift && k === 'b') fn = () => panelActions.setPref({ key: 'bookmarksBar', value: data.prefs.bookmarksBar === 'show' ? 'hide' : 'show' });
    else if (ctrl && k === 'h') fn = () => openPanel('historico');
    else if (ctrl && k === ',') fn = () => openPanel('preferencias');
    else if (k === 'f12') fn = () => cur()?.toggleDevTools();
    else if (k === 'escape' && fullscreenWc) fn = exitFullscreen;
    if (fn) { e.preventDefault(); fn(); }
  });
}

// electron-chrome-extensions usa o id de extensão que a própria página manda: uma extensão podia agir com as
// permissões de outra (ex.: nativeMessaging). Aqui o id é conferido com a origem real de quem chamou.
const extOf = u => { try { const x = new URL(u); return x.protocol === 'chrome-extension:' ? x.host : null; } catch { return null; } };
function guardExtensionIds(router) {
  if (!router?.onExtensionMessage || !router.addListener) {
    console.error('electron-chrome-extensions mudou: revisar guardExtensionIds');
    return;
  }
  const onMessage = router.onExtensionMessage.bind(router);
  router.onExtensionMessage = (e, id, ...rest) => {
    const sender = extOf(e.type === 'service-worker' ? e.serviceWorker?.scope : e.senderFrame?.url);
    if (id && id !== sender) throw new Error('id de extensão não confere com a origem');
    return onMessage(e, id, ...rest);
  };
  // ponytail: ouvintes de iframes de extensão dentro de sites não dão para conferir (a aba é do site); só bloqueia
  // quando a aba é de outra extensão
  const addListener = router.addListener.bind(router);
  router.addListener = (l, id, name) => {
    const host = l.type === 'frame' ? extOf(l.host?.getURL?.()) : null;
    if (host && host !== id) return;
    return addListener(l, id, name);
  };
}

// As extensões vivem só no contexto principal.
function mainTabIndex(wc) {
  return main.tabs.findIndex(v => v.webContents === wc);
}

async function setupExtensions() {
  extensions = new ElectronChromeExtensions({
    session: ses,
    createTab: async details => { switchContext(main); return [newTab(details.url).webContents, win]; },
    selectTab: wc => { const i = mainTabIndex(wc); if (i >= 0) { switchContext(main); select(i); } },
    removeTab: wc => { const i = mainTabIndex(wc); if (i >= 0) { switchContext(main); closeTab(i); } },
    // ponytail: janela única; chrome.windows.create abre as URLs como abas
    createWindow: async details => { switchContext(main); [].concat(details.url ?? []).forEach(u => newTab(u)); return win; },
  });
  guardExtensionIds(extensions.ctx.router);

  // Instala/atualiza extensões direto da Chrome Web Store, com confirmação.
  await installChromeWebStore({
    session: ses,
    beforeInstall: async d => {
      const perms = [...(d.manifest.permissions ?? []), ...(d.manifest.host_permissions ?? [])];
      const { response } = await dialog.showMessageBox(win, {
        type: 'question',
        icon: d.icon,
        title: 'Adicionar extensão',
        message: `Adicionar "${d.localizedName}" ao Mercurio?`,
        detail: perms.length ? `Ela poderá acessar:\n• ${perms.join('\n• ')}` : 'Ela não pede permissões especiais.',
        buttons: ['Cancelar', 'Adicionar extensão'],
        defaultId: 1,
        cancelId: 0,
        noLink: true,
      });
      return { action: response === 1 ? 'allow' : 'deny' };
    },
  });
}

const theme = () => nativeTheme.shouldUseDarkColors
  ? { color: '#0f1013', symbolColor: '#e8e9ec', height: 40 }
  : { color: '#e4e6ea', symbolColor: '#1a1b1f', height: 40 };

app.on('web-contents-created', (_, wc) => {
  wc.on('will-attach-webview', e => e.preventDefault()); // nada de <webview>
});

// Certificado de cliente: sem isto o Electron entrega o primeiro certificado do sistema a qualquer site que pedir.
app.on('select-client-certificate', async (e, _wc, url, list, cb) => {
  e.preventDefault();
  if (!list.length || !win) return cb();
  let host = url;
  try { host = new URL(url).host; } catch {}
  const shown = list.slice(0, 5);
  const { response } = await dialog.showMessageBox(win, {
    type: 'question',
    title: 'Certificado digital',
    message: `${host} pede um certificado digital`,
    detail: 'Envie só se você confia neste site (ex.: e-CNPJ em sites do governo). O certificado identifica você.',
    buttons: ['Não enviar', ...shown.map(c => c.subjectName || c.issuerName || 'Certificado')],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
  });
  cb(response > 0 ? shown[response - 1] : undefined);
});

app.whenReady().then(async () => {
  const dir = app.getPath('userData');
  decisionsFile = path.join(dir, 'permissions.json');
  const dataFile = path.join(dir, 'data.json');
  const capsFile = path.join(dir, 'capsules.json');
  const snapsFile = path.join(dir, 'snapshots.json');
  decisions = store.readJSON(decisionsFile, {});
  const d = store.readJSON(dataFile, {});
  data = { ...data, ...d, prefs: { ...data.prefs, ...d.prefs } };
  if (data.prefs.accent === 'default') data.prefs.accent = NEON_DEFAULT; // a antiga "Prata" saiu da paleta
  caps = store.readJSON(capsFile, []);
  snaps = store.readJSON(snapsFile, []);
  // Pastas de cápsulas excluídas: os dados já foram apagados, mas a pasta só sai do disco com a sessão fechada.
  try {
    const parts = path.join(dir, 'Partitions');
    for (const n of fs.readdirSync(parts)) {
      if (n.startsWith('capsula-') && !caps.some(c => `capsula-${c.id}` === n)) fs.rmSync(path.join(parts, n), { recursive: true, force: true });
    }
  } catch {}
  dataStore = store.debounced(dataFile, () => data);
  capStore = store.debounced(capsFile, () => caps);
  snapStore = store.debounced(snapsFile, () => snaps);
  nativeTheme.themeSource = data.prefs.theme;

  main = ctxs.createContext('main', 'Principal', 'main');
  ses = main.ses;
  contexts.set(main.id, main);
  ctx = main;
  tabs = main.tabs;
  main.decisions = globalDecisions;
  secure(ses, globalDecisions);

  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 480,
    minHeight: 320,
    title: 'Mercurio',
    icon: ICON,
    show: false,
    backgroundColor: theme().color,
    titleBarStyle: 'hidden',
    titleBarOverlay: theme(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.removeMenu();
  win.webContents.on('will-navigate', e => e.preventDefault()); // UI nunca sai do ui.html
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  shortcuts(win.webContents);
  win.on('resize', layout);
  nativeTheme.on('updated', () => win.setTitleBarOverlay(theme()));

  ipcMain.on('cmd', (e, name, arg) => {
    if (e.sender !== win.webContents) return; // só a UI pode mandar comandos
    if (Object.hasOwn(commands, name)) commands[name](arg);
  });

  await setupExtensions();
  await win.loadURL(page('ui.html'));
  newTab();
  win.show();
  setInterval(() => takeSnapshot('auto'), SNAPSHOT_EVERY);
  setupUpdates();
  firstRunNotice();
});

// Ao sair: guarda as abas das cápsulas abertas (voltam pausadas), tira um snapshot e grava tudo.
app.on('before-quit', () => {
  if (!main) return;
  try {
    for (const c of contexts.values()) if (c.kind === 'capsule') storeCapsuleTabs(c);
    takeSnapshot('ao fechar');
  } catch (err) {
    console.error('Falha ao salvar sessão', err);
  }
  dataStore.flush();
  capStore.flush();
  snapStore.flush();
});

app.on('window-all-closed', () => app.quit());

// Aviso de direitos: aparece na primeira abertura após cada instalação/atualização.
// A "identidade" da instalação é a data do executável, que muda a cada instalação.
async function firstRunNotice() {
  const marker = path.join(app.getPath('userData'), 'aviso-visto');
  const install = String(fs.statSync(process.execPath).mtimeMs);
  let seen = '';
  try { seen = fs.readFileSync(marker, 'utf8'); } catch {}
  if (seen === install) return;
  fs.writeFileSync(marker, install);
  const { response } = await dialog.showMessageBox(win, {
    type: 'info',
    icon: ICON,
    title: 'Mercurio',
    message: `Mercurio © ${new Date().getFullYear()} TresTech`,
    detail: 'Todos os direitos reservados.\n\nDesenvolvido por TresTech — trestech.com.br',
    buttons: ['Fechar', 'Visitar trestech.com.br'],
    defaultId: 1,
    cancelId: 0,
    noLink: true,
  });
  if (response === 1) newTab('https://trestech.com.br');
}
