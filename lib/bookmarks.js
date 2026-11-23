// Leitura de favoritos de outros navegadores. Pastas são achatadas (o Mercurio não tem pastas).
//   - arquivo "Bookmarks"/"AccountBookmarks" (JSON) do Chrome, Edge, Brave, Vivaldi, Opera…
//   - arquivo .html exportado ("Exportar favoritos"), formato Netscape usado por Chrome, Edge, Firefox e Safari
const isWeb = u => /^https?:\/\//i.test(u);
const MAX_TITLE = 300;

function fromChromiumJson(text) {
  let roots;
  try { roots = JSON.parse(text).roots; } catch { return []; }
  const out = [];
  const walk = n => {
    if (!n || typeof n !== 'object') return;
    if (n.type === 'url' && isWeb(n.url)) out.push({ url: n.url, title: String(n.name || n.url).slice(0, MAX_TITLE) });
    (Array.isArray(n.children) ? n.children : []).forEach(walk);
  };
  Object.values(roots ?? {}).forEach(walk); // bookmark_bar, other, synced e o que vier
  return out;
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = s => s.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (m, e) =>
  e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENTITIES[e.toLowerCase()] ?? m);

function fromNetscapeHtml(text) {
  const out = [];
  for (const m of text.matchAll(/<a\s[^>]*?href\s*=\s*"([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const url = decode(m[1].trim());
    if (!isWeb(url)) continue;
    const title = decode(m[2].replace(/<[^>]*>/g, '')).trim();
    out.push({ url, title: (title || url).slice(0, MAX_TITLE) });
  }
  return out;
}

// Detecta o formato pelo conteúdo, não pelo nome do arquivo.
const parse = text => (/^\s*\{/.test(text) ? fromChromiumJson(text) : fromNetscapeHtml(text));

module.exports = { parse, fromChromiumJson, fromNetscapeHtml };

if (require.main === module) {
  const assert = require('node:assert');
  const json = JSON.stringify({ roots: {
    bookmark_bar: { children: [{ type: 'url', name: 'Banco', url: 'https://banco.com.br/' }, { type: 'folder', children: [{ type: 'url', name: 'Pasta', url: 'https://a.com/' }] }] },
    other: { children: [{ type: 'url', name: 'JS', url: 'javascript:alert(1)' }] },
    synced: { children: [] },
  } });
  assert.deepStrictEqual(parse(json).map(b => b.url), ['https://banco.com.br/', 'https://a.com/']);
  const html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<DL><p><DT><H3>Barra de favoritos</H3>
<DL><p><DT><A HREF="https://www.gov.br/" ADD_DATE="1" ICON="data:image/png;base64,AAA">Gov &amp; Serviços</A>
<DT><A HREF="https://x.com/?a=1&amp;b=2">X</A>
<DT><A HREF="file:///C:/segredo.txt">arquivo</A>
<DT><A HREF="https://sem-titulo.com/"></A></DL><p></DL>`;
  assert.deepStrictEqual(parse(html), [
    { url: 'https://www.gov.br/', title: 'Gov & Serviços' },
    { url: 'https://x.com/?a=1&b=2', title: 'X' },
    { url: 'https://sem-titulo.com/', title: 'https://sem-titulo.com/' },
  ]);
  assert.deepStrictEqual(parse('lixo'), []);
  assert.deepStrictEqual(parse('{ quebrado'), []);
  console.log('bookmarks ok');
}
