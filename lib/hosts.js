// Endereços que imitam outros sites. Bloqueamos:
//   - letras de alfabetos diferentes misturadas no mesmo nome ("cаsа.com" com "а" cirílico);
//   - nomes inteiros em cirílico/grego feitos só de letras que parecem latinas ("аррӏе.com");
//   - latinas raras que imitam outras ("ı" sem ponto, "ſ"...), caracteres invisíveis e acentos soltos;
//   - domínios que começam como a Chrome Web Store mas não são ela (a biblioteca da loja só confere o começo).
// Acentos do português e de outras línguas europeias passam normalmente ("pão.com.br", "münchen.de"),
// assim como nomes inteiros num só alfabeto ("яндекс.рф", "東京.jp").
// Regras inspiradas no verificador de IDN do Chrome. ponytail: lista de sósias enxuta; ampliar se surgir caso novo.
const { domainToUnicode } = require('node:url');

const STORE = 'chromewebstore.google.com';
const SCRIPTS = ['Latin', 'Cyrillic', 'Greek', 'Armenian', 'Georgian', 'Hebrew', 'Arabic', 'Han', 'Hiragana', 'Katakana',
  'Hangul', 'Bopomofo', 'Thai', 'Devanagari', 'Bengali', 'Tamil', 'Ethiopic', 'Cherokee', 'Coptic'].map(s => [s, new RegExp(`\\p{Script=${s}}`, 'u')]);
const CJK = [new Set(['Han', 'Hiragana', 'Katakana']), new Set(['Han', 'Hangul']), new Set(['Han', 'Bopomofo'])];
// letras cirílicas/gregas que se passam por latinas
const LOOKALIKE = /^[аысԁеԍһіюјӏорԛѕԝхуъьҽпгѵѡαικνορτυχωϲ\d-]+$/u;
// latinas aceitas: ASCII + Latin-1 + Latin Extended-A, menos ı (0131), ĸ (0138), ŀ (0140) e ſ (017F)
const LATIN_OK = /^[a-z\d\-ß-öø-ÿĀ-İĲ-ķĹ-ĿŁ-ž]+$/u;

const scriptOf = ch => SCRIPTS.find(([, re]) => re.test(ch))?.[0] ?? 'Other';
const scriptsOf = label => new Set([...label].filter(c => /\p{L}/u.test(c)).map(scriptOf));

function labelProblem(label, tldScripts) {
  if (/^[\x00-\x7f]*$/.test(label)) return null;
  if (/[\p{M}\p{Cf}\p{Zs}]/u.test(label)) return 'caracteres invisíveis ou acentos soltos';
  const s = scriptsOf(label);
  if (s.size > 1 && !CJK.some(ok => [...s].every(x => ok.has(x)))) return 'mistura letras de alfabetos diferentes';
  if (s.has('Latin')) return LATIN_OK.test(label) ? null : 'usa letras latinas raras que imitam outras';
  const [only] = s;
  if ((only === 'Cyrillic' || only === 'Greek') && LOOKALIKE.test(label) && !tldScripts.has(only)) return 'usa letras de outro alfabeto que imitam letras latinas';
  return null;
}

// Motivo do bloqueio (texto para o usuário) ou null se o endereço é seguro. `host` vem de new URL().hostname.
function blockReason(host) {
  host = String(host ?? '').toLowerCase();
  if (host !== STORE && host.startsWith(STORE)) return 'imita o endereço da Chrome Web Store';
  if (!host.includes('xn--')) return null;
  const labels = domainToUnicode(host).split('.');
  if (labels.includes('')) return host.endsWith('.') ? null : 'endereço inválido';
  const tld = scriptsOf(labels.at(-1));
  for (const l of labels) { const p = labelProblem(l, tld); if (p) return p; }
  return null;
}

// Como mostrar o nome na barra: com acentos quando é seguro, em código (xn--...) quando é suspeito.
const displayHost = host => (host.includes('xn--') && !blockReason(host) ? domainToUnicode(host) : host);

module.exports = { blockReason, displayHost };

if (require.main === module) {
  const assert = require('node:assert');
  const h = s => new URL(`https://${s}`).hostname;
  for (const ok of ['casa.com', 'pão.com.br', 'açaí.com', 'münchen.de', 'españa.es', 'łódź.pl', 'яндекс.рф', '東京.jp', 'ひらがな漢字.jp', '한국.kr', 'chromewebstore.google.com', 'mail.google.com']) {
    assert.strictEqual(blockReason(h(ok)), null, ok);
  }
  for (const bad of ['cаsа.com', 'cаsa.com', 'саѕа.com', 'аррӏе.com', 'gοοgle.com', 'paypaӏ.com', 'ıbm.com','chromewebstore.google.com.evil.test', 'chromewebstore.google.com-x.test']) {
    assert.ok(blockReason(h(bad)), bad);
  }
  assert.strictEqual(displayHost(h('pão.com.br')), 'pão.com.br');
  assert.strictEqual(displayHost(h('cаsа.com')), h('cаsа.com')); // continua xn--...
  console.log('hosts ok');
}
