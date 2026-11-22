// Pedido de doação (estilo WinRAR, mas discreto): só depois de 7 dias de uso e, a partir daí, a cada 15 dias.
// Não há "não perguntar mais" (decisão do Almir, 22/11/2026): fechar a janela só adia até o próximo ciclo.
// Estado guardado em data.json: { since, lastAsk }.
const DAY = 24 * 60 * 60 * 1000;
const FIRST_AFTER = 7 * DAY;
const EVERY = 15 * DAY;

// Primeiro uso registra a data; devolve o estado (sempre completo).
const init = (s, now) => ({ since: s?.since ?? now, lastAsk: s?.lastAsk ?? 0 });

const shouldAsk = (s, now) => now - s.since >= FIRST_AFTER && now - s.lastAsk >= EVERY;

module.exports = { init, shouldAsk }; // a página de doação é apoiar.html (Pix), aberta pelo main.js

if (require.main === module) {
  const assert = require('node:assert');
  const t = Date.UTC(2026, 10, 22);
  const s = init(undefined, t);
  assert.strictEqual(shouldAsk(s, t), false);                         // acabou de instalar
  assert.strictEqual(shouldAsk(s, t + 6 * DAY), false);               // menos de 7 dias
  assert.strictEqual(shouldAsk(s, t + 7 * DAY), true);                // 7 dias
  assert.strictEqual(shouldAsk({ ...s, lastAsk: t + 7 * DAY }, t + 21 * DAY), false); // pediu há 14 dias
  assert.strictEqual(shouldAsk({ ...s, lastAsk: t + 7 * DAY }, t + 22 * DAY), true);  // 15 dias depois
  assert.deepStrictEqual(init({ since: 5, lastAsk: 9, never: true }, t), { since: 5, lastAsk: 9 }); // "never" antigo é ignorado
  console.log('donate ok');
}
