// Converte o que o usuário digitou em URL segura (só http/https) ou busca.
const ENGINES = {
  duckduckgo: { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
  google: { name: 'Google', url: 'https://www.google.com/search?q=' },
  bing: { name: 'Bing', url: 'https://www.bing.com/search?q=' },
  brave: { name: 'Brave Search', url: 'https://search.brave.com/search?q=' },
};

function toUrl(input, engine = 'duckduckgo') {
  const s = input.trim();
  try {
    const u = new URL(s);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.href;
  } catch {}
  // ponytail: heurística simples de domínio; IDN/TLDs exóticos caem na busca
  if (/^(localhost|[\w-]+(\.[\w-]+)+)(:\d+)?(\/\S*)?$/i.test(s)) {
    return (s.startsWith('localhost') ? 'http://' : 'https://') + s;
  }
  return (ENGINES[engine] ?? ENGINES.duckduckgo).url + encodeURIComponent(s);
}

module.exports = { toUrl, ENGINES };

if (require.main === module) {
  const assert = require('node:assert');
  const ddg = ENGINES.duckduckgo.url;
  assert.strictEqual(toUrl('example.com'), 'https://example.com');
  assert.strictEqual(toUrl('https://a.com/x'), 'https://a.com/x');
  assert.strictEqual(toUrl('localhost:3000'), 'http://localhost:3000');
  assert.ok(toUrl('javascript:alert(1)').startsWith(ddg)); // bloqueado
  assert.ok(toUrl('file:///c:/windows').startsWith(ddg)); // bloqueado
  assert.ok(toUrl('como fazer pão').startsWith(ddg));
  assert.ok(toUrl('pão', 'google').startsWith(ENGINES.google.url));
  assert.ok(toUrl('pão', 'inexistente').startsWith(ddg));
  console.log('ok');
}
