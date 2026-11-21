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
const { app, BrowserWindow, WebContentsView, Menu, MenuItem, clipboard, dialog, ipcMain, nativeImage, nativeTheme, session } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const { ElectronChromeExtensions } = require('electron-chrome-extensions');
const { installChromeWebStore, uninstallExtension } = require('electron-chrome-web-store');
const { toUrl, ENGINES } = require('./url');

const BAR = 80;    // abas (40) + endereço (40)
const PROMPT = 44; // faixa de permissão, quando visível
const BMBAR = 32;  // barra de favoritos, quando visível
const HOME = pathToFileURL(path.join(__dirname, 'home.html')).href;
const PANEL = pathToFileURL(path.join(__dirname, 'panel.html')).href;
const NOTICES = pathToFileURL(path.join(__dirname, 'THIRD-PARTY-NOTICES.txt')).href;
const STORE = 'https://chromewebstore.google.com/';
const SITE = 'https://trestech.com.br/'; // botão Início
const ICON = path.join(__dirname, 'assets', 'icon.png');
const HISTORY_MAX = 5000;

// Permissões: liberadas sempre / perguntadas ao usuário / o resto é negado.
const ALWAYS = new Set(['fullscreen', 'clipboard-sanitized-write']);
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

let win, ses, extensions, decisionsFile, dataFile, saveTimer;
let decisions = {}; // { origin: { permissão: true|false } }
let data = { bookmarks: [], history: [], prefs: { search: 'duckduckgo', theme: 'system', accent: 'default', bookmarksBar: 'show' } };
let pending = [];   // pedidos de permissão aguardando resposta
let tabs = [];
let active = -1;

const cur = () => tabs[active]?.webContents;
const originOf = u => { try { return new URL(u).origin; } catch { return null; } };
const isExtension = u => String(u).startsWith('chrome-extension://');
const isWeb = u => /^https?:/.test(u);
const isPanel = u => String(u).startsWith(PANEL);
const home = () => `${HOME}?e=${data.prefs.search}&a=${encodeURIComponent(data.prefs.accent)}`;
const barVisible = () => data.prefs.bookmarksBar === 'show' && data.bookmarks.length > 0;
const barItems = () => [...data.bookmarks].reverse(); // na barra: ordem em que foram adicionados
const isAccent = v => v === 'default' || /^#[0-9a-f]{6}$/i.test(v);

// ponytail: um JSON único gravado com atraso de 500ms; trocar por SQLite se o histórico crescer muito
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => fs.writeFile(dataFile, JSON.stringify(data), () => {}), 500);
}

function shownUrl(u) {
  if (u.startsWith(HOME)) return '';
  if (isPanel(u)) return 'mercurio://painel';
  return u;
}

function sync() {
  if (!win || win.isDestroyed()) return;
  const wc = cur();
  const url = wc?.getURL() ?? '';
  win.webContents.send('state', {
    tabs: tabs.map(v => ({
      title: isPanel(v.webContents.getURL()) ? 'Painel' : v.webContents.getTitle() || 'Nova aba',
      loading: v.webContents.isLoading(),
      favicon: v.favicon,
      panel: isPanel(v.webContents.getURL()),
    })),
    active,
    accent: data.prefs.accent,
    url: shownUrl(url),
    bookmarkable: isWeb(url),
    bookmarked: data.bookmarks.some(b => b.url === url),
    bookmarks: barVisible() ? barItems().map(({ url, title, favicon }) => ({ url, title, favicon })) : [],
    canBack: wc?.navigationHistory.canGoBack() ?? false,
    canForward: wc?.navigationHistory.canGoForward() ?? false,
    prompt: pending[0] ? { origin: pending[0].origin, label: pending[0].label } : null,
  });
}

function layout() {
  const top = BAR + (barVisible() ? BMBAR : 0) + (pending.length ? PROMPT : 0);
  const [width, height] = win.getContentSize();
  for (const v of tabs) v.setBounds({ x: 0, y: top, width, height: height - top });
}

function select(i) {
  active = i;
  tabs.forEach((v, j) => v.setVisible(j === i));
  layout();
  extensions.selectTab(tabs[i].webContents);
  sync();
}

function newTab(url) {
  url = url || extensions.getURLOverrides().newtab || home();
  const panel = isPanel(url);
  const view = new WebContentsView({
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      // só a aba do painel recebe a ponte com o navegador
      preload: panel ? path.join(__dirname, 'panel-preload.js') : undefined,
    },
  });
  const wc = view.webContents;
  wc.setWindowOpenHandler(({ url }) => {
    if (isWeb(url)) newTab(url);
    return { action: 'deny' };
  });
  if (panel) {
    // a aba do painel nunca sai do painel: links abrem em aba nova
    wc.on('will-navigate', (e, u) => { if (!isPanel(u)) { e.preventDefault(); if (isWeb(u)) newTab(u); } });
  }
  wc.on('page-favicon-updated', (_e, icons) => {
    view.favicon = icons.find(i => i.startsWith('https:'));
    const b = data.bookmarks.find(x => x.url === wc.getURL());
    if (b && view.favicon && b.favicon !== view.favicon) { b.favicon = view.favicon; save(); }
    sync();
  });
  wc.on('did-start-navigation', (_e, _u, inPage, isMain) => { if (isMain && !inPage) view.favicon = undefined; });
  wc.on('did-navigate', (_e, u) => recordHistory(u, wc));
  wc.on('page-title-updated', (_e, title) => {
    const h = data.history[0];
    if (h && h.url === wc.getURL()) { h.title = title; save(); }
  });
  for (const ev of ['did-navigate', 'did-navigate-in-page', 'page-title-updated', 'did-start-loading', 'did-stop-loading']) {
    wc.on(ev, sync);
  }
  wc.on('context-menu', (_e, p) => contextMenu(wc, p));
  shortcuts(wc);
  tabs.push(view);
  win.contentView.addChildView(view);
  extensions.addTab(wc, win);
  select(tabs.length - 1);
  wc.loadURL(url);
  return view;
}

function closeTab(i) {
  const [v] = tabs.splice(i, 1);
  // pedidos de permissão da aba fechada são negados
  pending = pending.filter(p => p.wc !== v.webContents || p.cb(false));
  win.contentView.removeChildView(v);
  v.webContents.close();
  if (!tabs.length) return newTab();
  if (i < active) active--;
  select(Math.min(active, tabs.length - 1));
}

function openPanel(section = 'favoritos') {
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

function answerPermission(allow) {
  const p = pending[0];
  if (!p) return;
  (decisions[p.origin] ??= {})[p.perm] = allow;
  saveDecisions();
  // resolve também pedidos repetidos do mesmo site/permissão
  pending = pending.filter(q => !(q.origin === p.origin && q.perm === p.perm) || q.cb(allow));
  layout();
  sync();
}

const saveDecisions = () => fs.writeFileSync(decisionsFile, JSON.stringify(decisions, null, 2));

const commands = {
  go: s => {
    s = String(s).trim();
    if (/^mercurio:\/\/(painel|settings)/i.test(s)) return openPanel();
    const url = toUrl(s, data.prefs.search);
    isPanel(cur()?.getURL()) ? newTab(url) : cur()?.loadURL(url);
  },
  back: () => cur()?.navigationHistory.goBack(),
  forward: () => cur()?.navigationHistory.goForward(),
  reload: () => cur()?.reload(),
  home: () => commands.go(SITE),
  newTab: () => newTab(),
  panel: () => openPanel(),
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
  bookmarksOverflow: from => {
    const items = barItems().slice(Number(from) || 0);
    if (items.length) Menu.buildFromTemplate(items.map(b => ({ label: b.title, click: () => commands.go(b.url) }))).popup({ window: win });
  },
  select: i => tabs[i] && select(i),
  close: i => tabs[i] && closeTab(i),
  permission: allow => answerPermission(allow === true),
};

// ---- painel (favoritos, histórico, extensões, preferências) ----

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
    engines: Object.fromEntries(Object.entries(ENGINES).map(([k, v]) => [k, v.name])),
    prefs: data.prefs,
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
  };
}

const panelActions = {
  get: () => {},
  removeBookmark: url => { data.bookmarks = data.bookmarks.filter(b => b.url !== url); save(); layout(); sync(); },
  removeHistory: t => { data.history = data.history.filter(h => h.t !== t); save(); },
  clearHistory: () => { data.history = []; save(); },
  setPref: ({ key, value }) => {
    if (key === 'search' && ENGINES[value]) data.prefs.search = value;
    if (key === 'theme' && ['system', 'dark', 'light'].includes(value)) nativeTheme.themeSource = data.prefs.theme = value;
    if (key === 'accent' && isAccent(value)) data.prefs.accent = value;
    if (key === 'bookmarksBar' && ['show', 'hide'].includes(value)) data.prefs.bookmarksBar = value;
    save();
    layout();
    sync();
  },
  revoke: ({ origin, perm }) => {
    if (decisions[origin]) delete decisions[origin][perm];
    if (decisions[origin] && !Object.keys(decisions[origin]).length) delete decisions[origin];
    saveDecisions();
  },
  uninstall: id => uninstallExtension(String(id), { session: ses }),
  clearData: async () => { await ses.clearStorageData(); await ses.clearCache(); },
  store: () => newTab(STORE),
  notices: () => newTab(NOTICES),
  importBookmarks: id => importBookmarks(String(id)),
};

ipcMain.handle('panel', async (e, name, arg) => {
  if (!isPanel(e.senderFrame?.url)) throw new Error('negado'); // só o painel local fala com isto
  await panelActions[name]?.(arg);
  return panelData();
});

// ---- menu, atalhos, permissões, extensões ----

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
  const ext = extensions.getContextMenuItems(wc, p);
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
    if (ctrl && k === 't') fn = () => newTab();
    else if (ctrl && k === 'w') fn = () => closeTab(active);
    else if (ctrl && k === 'l') fn = () => { win.webContents.focus(); win.webContents.send('focus-url'); };
    else if ((ctrl && k === 'r') || k === 'f5') fn = commands.reload;
    else if (ctrl && k === 'tab') fn = () => select((active + (input.shift ? tabs.length - 1 : 1)) % tabs.length);
    else if (ctrl && k === 'd') fn = toggleBookmark;
    else if (ctrl && input.shift && k === 'b') fn = () => panelActions.setPref({ key: 'bookmarksBar', value: data.prefs.bookmarksBar === 'show' ? 'hide' : 'show' });
    else if (ctrl && k === 'h') fn = () => openPanel('historico');
    else if (ctrl && k === ',') fn = () => openPanel('preferencias');
    else if (k === 'f12') fn = () => cur()?.toggleDevTools();
    if (fn) { e.preventDefault(); fn(); }
  });
}

function setupPermissions() {
  ses.setPermissionRequestHandler((wc, perm, cb, details) => {
    const origin = originOf(details.requestingUrl);
    if (ALWAYS.has(perm) || isExtension(origin)) return cb(true); // extensões já declaram permissões no manifest
    if (!ASK[perm] || !origin) return cb(false);
    const saved = decisions[origin]?.[perm];
    if (saved !== undefined) return cb(saved);
    pending.push({ origin, perm, label: ASK[perm](details), cb, wc });
    if (pending.length === 1) { layout(); sync(); }
  });
  ses.setPermissionCheckHandler((_wc, perm, origin) =>
    ALWAYS.has(perm) || isExtension(origin) || decisions[originOf(origin)]?.[perm] === true);
}

async function setupExtensions() {
  extensions = new ElectronChromeExtensions({
    session: ses,
    createTab: async details => [newTab(details.url).webContents, win],
    selectTab: wc => { const i = tabs.findIndex(v => v.webContents === wc); if (i >= 0) select(i); },
    removeTab: wc => { const i = tabs.findIndex(v => v.webContents === wc); if (i >= 0) closeTab(i); },
    // ponytail: janela única; chrome.windows.create abre as URLs como abas
    createWindow: async details => { [].concat(details.url ?? []).forEach(u => newTab(u)); return win; },
  });

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

app.whenReady().then(async () => {
  ses = session.defaultSession;
  const dir = app.getPath('userData');
  decisionsFile = path.join(dir, 'permissions.json');
  dataFile = path.join(dir, 'data.json');
  try { decisions = JSON.parse(fs.readFileSync(decisionsFile, 'utf8')); } catch {}
  try { const d = JSON.parse(fs.readFileSync(dataFile, 'utf8')); data = { ...data, ...d, prefs: { ...data.prefs, ...d.prefs } }; } catch {}
  nativeTheme.themeSource = data.prefs.theme;
  setupPermissions();

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
    commands[name]?.(arg);
  });

  await setupExtensions();
  await win.loadFile('ui.html');
  newTab();
  win.show();
  firstRunNotice();
});

app.on('before-quit', () => {
  clearTimeout(saveTimer);
  fs.writeFileSync(dataFile, JSON.stringify(data));
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
