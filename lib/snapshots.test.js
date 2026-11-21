// Rodar: npm test
const assert = require('node:assert');
const { serialize, addSnapshot, restorableTabs, clampMax } = require('./snapshots');

const main = { kind: 'main', id: 'm', name: 'Principal', active: 1, tabs: [
  { url: 'file:///home.html', title: 'Nova aba' },
  { url: 'https://a.com/', title: 'A' },
  { url: 'https://b.com/', title: 'B' },
] };
const eph = { kind: 'ephemeral', id: 'e', name: 'Efêmera', active: 0, tabs: [{ url: 'https://secreto.com/', title: 'X' }] };
const cap = { kind: 'capsule', id: 'c1', name: 'Cliente', active: 0, tabs: [{ url: 'https://c.com/', title: 'C' }] };

// serialize: tira efêmera e páginas internas; recalcula o índice da ativa
const s = serialize([main, eph, cap]);
assert.strictEqual(s.length, 2);
assert.deepStrictEqual(s[0].tabs.map(t => t.url), ['https://a.com/', 'https://b.com/']);
assert.strictEqual(s[0].active, 0); // "A" era a 2ª aba, vira a 1ª depois de tirar a nova aba
assert.strictEqual(s[1].id, 'c1');
assert.ok(!JSON.stringify(s).includes('secreto'));

// addSnapshot: ignora repetido, mais recente primeiro, respeita limite (mínimo 5)
let list = [];
({ list } = addSnapshot(list, s, 'manual', 5, 1));
const again = addSnapshot(list, s, 'auto', 5, 2);
assert.strictEqual(again.added, null);
for (let i = 0; i < 10; i++) {
  ({ list } = addSnapshot(list, [{ ...s[0], tabs: [{ url: `https://x${i}.com/`, title: '' }] }], 'auto', 5, 10 + i));
}
assert.strictEqual(list.length, 5);
assert.strictEqual(list[0].t, 19);
assert.strictEqual(addSnapshot(list, [], 'auto', 5).added, null);

// restauração só aceita http/https
assert.deepStrictEqual(restorableTabs({ tabs: [{ url: 'javascript:alert(1)' }, { url: 'file:///c:/' }, { url: 'https://ok.com/' }] }).map(t => t.url), ['https://ok.com/']);
assert.strictEqual(clampMax(1), 5);
assert.strictEqual(clampMax(999), 100);
assert.strictEqual(clampMax('x'), 20);
console.log('snapshots ok');
