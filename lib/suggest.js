// Sugestões da barra de endereço a partir do histórico e dos favoritos.
// Ordem: endereço que começa com o que foi digitado > mais visitado (favorito conta como 5 visitas) > mais curto > mais recente.
// ponytail: varre o histórico inteiro (até 5.000 itens) a cada tecla, ~1 ms; índice só se o limite crescer muito.
const strip = u => u.replace(/^https?:\/\/(www\.)?/i, '');

function suggest(query, history = [], bookmarks = [], max = 6) {
  const q = String(query ?? '').trim().toLowerCase().slice(0, 300);
  if (!q) return [];
  const all = new Map();
  for (const h of history) {
    const s = all.get(h.url);
    if (s) s.n++;
    else all.set(h.url, { url: h.url, title: h.title || '', n: 1, t: h.t || 0 });
  }
  for (const b of bookmarks) {
    const s = all.get(b.url);
    if (s) { s.n += 5; s.title ||= b.title || ''; }
    else all.set(b.url, { url: b.url, title: b.title || '', n: 5, t: 0 });
  }
  const hits = [];
  for (const s of all.values()) {
    const text = strip(s.url);
    const low = text.toLowerCase();
    const prefix = low.startsWith(q);
    if (!prefix && !low.includes(q) && !s.title.toLowerCase().includes(q)) continue;
    hits.push({ ...s, text, prefix, score: (prefix ? 1e6 : 0) + s.n * 100 - text.length });
  }
  return hits
    .sort((a, b) => b.score - a.score || b.t - a.t)
    .slice(0, max)
    .map(({ url, title, text, prefix }) => ({ url, title: title.slice(0, 200), text, prefix }));
}

module.exports = { suggest };

if (require.main === module) {
  const assert = require('node:assert');
  const H = [
    { url: 'https://github.com/AlmirAlmeida-bit/mercurio', title: 'mercurio', t: 3 },
    { url: 'https://github.com/', title: 'GitHub', t: 2 },
    { url: 'https://github.com/', title: 'GitHub', t: 1 },
    { url: 'https://www.google.com/search?q=git', title: 'git - Pesquisa', t: 4 },
    { url: 'https://pt.wikipedia.org/wiki/Merc%C3%BArio', title: 'Mercúrio – Wikipédia', t: 5 },
  ];
  const r = suggest('git', H);
  assert.equal(r[0].url, 'https://github.com/');        // começa com "git" e é o mais visitado
  assert.equal(r[0].text, 'github.com/');               // sem https:// nem www. (para completar no campo)
  assert.ok(r[0].prefix && r[1].prefix && !r[2].prefix); // google.com/search?q=git só contém
  assert.equal(r.length, 3);
  assert.equal(suggest('Wikipédia', H)[0].url, H[4].url); // acha pelo título
  assert.equal(suggest('GOO', H)[0].text, 'google.com/search?q=git'); // www. some e não diferencia maiúsculas
  assert.deepEqual(suggest('  ', H), []);
  assert.equal(suggest('site', [], [{ url: 'https://site.com/', title: 'Site' }])[0].url, 'https://site.com/'); // favorito
  assert.equal(suggest('a', Array.from({ length: 20 }, (_, i) => ({ url: `https://a${i}.com/`, t: i }))).length, 6);
  console.log('suggest ok');
}
