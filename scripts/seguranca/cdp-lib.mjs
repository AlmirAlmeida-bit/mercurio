export const wait = ms => new Promise(r => setTimeout(r, ms));
export const makeTargets = port => async () => (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).filter(t => t.type === 'page');
export function rpc(t) {
  const ws = new WebSocket(t.webSocketDebuggerUrl); let id = 0; const w = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); w.get(m.id)?.(m); };
  return new Promise(r => ws.onopen = () => r(async (method, params) => (await new Promise(res => { w.set(++id, res); ws.send(JSON.stringify({ id, method, params })); })).result));
}
export const ev = async (c, expression) => { const r = await c('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); return r.exceptionDetails ? 'ERRO: ' + (r.exceptionDetails.exception?.description ?? '').split('\n')[0] : r.result.value; };
