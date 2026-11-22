// Pedido de doação (estilo WinRAR, mas discreto): só depois de 7 dias de uso, no máximo a cada 30 dias,
// e nunca mais depois de "Já apoiei". Estado guardado em data.json: { since, lastAsk, never }.
const DAY = 24 * 60 * 60 * 1000;
const FIRST_AFTER = 7 * DAY;
const EVERY = 30 * DAY;

// Primeiro uso registra a data; devolve o estado (sempre completo).
const init = (s, now) => ({ since: s?.since ?? now, lastAsk: s?.lastAsk ?? 0, never: !!s?.never });

const shouldAsk = (s, now) => !s.never && now - s.since >= FIRST_AFTER && now - s.lastAsk >= EVERY;

module.exports = { init, shouldAsk }; // a página de doação é apoiar.html (Pix), aberta pelo main.js

if (require.main === module) {
  const assert = require('node:assert');
  const t = Date.UTC(2026, 10, 22);
  const s = init(undefined, t);
  assert.strictEqual(shouldAsk(s, t), false);                         // acabou de instalar
  assert.strictEqual(shouldAsk(s, t + 6 * DAY), false);               // menos de 7 dias
  assert.strictEqual(shouldAsk(s, t + 7 * DAY), true);                // 7 dias
  assert.strictEqual(shouldAsk({ ...s, lastAsk: t + 7 * DAY }, t + 20 * DAY), false); // pediu há 13 dias
  assert.strictEqual(shouldAsk({ ...s, lastAsk: t + 7 * DAY }, t + 37 * DAY), true);  // 30 dias depois
  assert.strictEqual(shouldAsk({ ...s, never: true }, t + 400 * DAY), false);         // "Já apoiei"
  assert.deepStrictEqual(init({ since: 5, lastAsk: 9, never: true }, t), { since: 5, lastAsk: 9, never: true });
  console.log('donate ok');
}
