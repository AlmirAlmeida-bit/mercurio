// Etapa 3: roda os ataques contra o Mercurio aberto com --remote-debugging-port (chamado pelo attack.ps1).
//   node run.mjs <porta> <perfil> [pid do Mercurio, para o teste do Esc]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { wait, makeTargets, rpc } from './cdp-lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const [port, profile, appPid] = process.argv.slice(2);
const ids = JSON.parse(fs.readFileSync(path.join(profile, 'ids.json'), 'utf8'));
const targets = makeTargets(port);
const ev = async (c, expression, userGesture = false) => {
  const r = await c('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture });
  return r.exceptionDetails ? 'ERRO: ' + (r.exceptionDetails.exception?.description ?? r.exceptionDetails.text).split('\n')[0] : r.result.value;
};
const ui = await rpc((await targets()).find(t => t.url.includes('ui.html')));
const cmd = (name, arg) => ev(ui, `mercurio.cmd(${JSON.stringify(name)}, ${JSON.stringify(arg)})`);
const find = async pred => { for (let i = 0; i < 40; i++) { const t = (await targets()).find(pred); if (t) return t; await wait(250); } return null; };
const H = 'https://alvo.test:8443';
const out = {};
// nenhuma etapa pode travar o teste: depois de 2 min mostra o que já tem
setTimeout(() => { console.log(JSON.stringify({ ...out, TEMPO_ESGOTADO: true }, null, 2)); process.exit(1); }, 120000);
const step = s => console.log('etapa:', s);
// Janela atrás de outra: o Chromium descarta cliques/teclas simulados. Traz para frente (e aperta Esc, se pedido).
const front = esc => appPid && execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(here, 'focus-esc.ps1'), appPid, ...(esc ? ['-Esc'] : [])]);

step('9'); // item 9: extensão A tenta usar a identidade da extensão B (que tem nativeMessaging)
await cmd('go', `${H}/blank`); await wait(1500);
let t = await find(x => x.url.startsWith(`${H}/blank`));
await ev(await rpc(t), `location.href = 'chrome-extension://${ids.A}/page.html'`);
t = await find(x => x.url.startsWith(`chrome-extension://${ids.A}/`));
if (t) {
  // o console do preload mostra o erro do processo principal (invokeExtension engole a exceção)
  const ws = new WebSocket(t.webSocketDebuggerUrl); const logs = [];
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.method === 'Runtime.consoleAPICalled') logs.push(m.params.args.map(a => a.value ?? a.description ?? '').join(' ')); };
  await new Promise(r => ws.onopen = r);
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
  const a = await rpc(t); await wait(800);
  const tryAs = async id => {
    logs.length = 0;
    await ev(a, `electron.invokeExtension(${JSON.stringify(id)}, 'runtime.sendNativeMessage', {}, 'com.nao.existe', {})`);
    await wait(500);
    const err = logs.filter(l => !l.startsWith('runtime.sendNativeMessage')).join(' | ');
    return /requires an extension/.test(err) ? 'BLOQUEADO: exige nativeMessaging'
      : /não confere com a origem|unknown extension/i.test(err) ? 'BLOQUEADO: id de extensão não confere com a origem'
      : 'PASSOU da checagem de permissão → ' + err.slice(0, 120);
  };
  out.item9 = { electronVisivel: await ev(a, 'typeof electron') };
  if (out.item9.electronVisivel === 'object') {
    out.item9.comoA = await tryAs(ids.A);
    out.item9.comoB = await tryAs(ids.B);
  }
  ws.close();
} else out.item9 = 'página da extensão A não abriu';

step('1'); // item 1: domínio falso da Web Store
await cmd('go', 'https://chromewebstore.google.com.evil.test:8443/store'); await wait(2500);
t = (await targets()).find(x => x.url.startsWith('https://chromewebstore.google.com.evil.test'));
out.item1 = t ? await ev(await rpc(t), 'window.__r ?? "sem script"') : 'página bloqueada (não carregou)';
out.item1_aviso = (await targets()).some(x => x.url.startsWith('mercurio://app/aviso.html'));
out.item1_barra = await ev(ui, "document.getElementById('url').value");
out.item1_extBNoDisco = fs.existsSync(path.join(profile, 'Extensions', ids.B));

step('12'); // item 12: 20 pop-ups sem clique
const before = (await targets()).length;
await cmd('newTab'); await wait(800);
await cmd('go', `${H}/popups`); await wait(3500);
out.item12_popupsAbertos = (await targets()).filter(x => x.url.includes('/blank?') && !x.url.includes('bg')).length;
out.item12_abasAntesDepois = [before, (await targets()).length];

step('12b'); // item 12b: aba em segundo plano abre pop-up
await cmd('newTab'); await wait(800);
await cmd('go', `${H}/bg`); await wait(800);
await cmd('newTab'); await wait(4500);
out.item12b_popupDeAbaEscondida = (await targets()).filter(x => x.url.includes('blank?bg')).length;

step('12c'); // item 12c: pop-up legítimo (clique num link target=_blank) continua funcionando
await cmd('go', `${H}/link`); await wait(1500);
t = await find(x => x.url.startsWith(`${H}/link`));
const l = await rpc(t);
front();
for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await l('Input.dispatchMouseEvent', { type, x: 100, y: 100, button: 'left', clickCount: 1 });
await wait(1500);
out.item12c_popupComClique = (await targets()).filter(x => x.url.includes('blank?clique')).length;

step('7'); // item 7: tela cheia cobre a barra de endereço?
await cmd('go', `${H}/fs`); await wait(1500);
t = await find(x => x.url.startsWith(`${H}/fs`));
const f = await rpc(t);
// o site tenta prender o usuário trocando exitFullscreen
await ev(f, 'Document.prototype.exitFullscreen = document.exitFullscreen = () => Promise.resolve()');
front();
await ev(f, 'Promise.race([document.documentElement.requestFullscreen().then(() => "ok", e => e.message), new Promise(r => setTimeout(() => r("sem resposta"), 3000))])', true); await wait(1500);
out.item7 = await ev(f, '({ telaCheia: !!document.fullscreenElement, barraVisivel: innerHeight < screen.height })');
// Esc de verdade (o Esc simulado pelo DevTools não passa pelos atalhos do navegador): traz a janela para frente e aperta
if (appPid) {
  front(true);
  await wait(1500);
  out.item7_saiuComEsc = !(await ev(f, '!!document.fullscreenElement'));
}

step('idn'); // IDN: legítimo (pão) x falso (а cirílico)
for (const [nome, host] of [['legitimo', 'pão.test'], ['falso_cirilico', 'cаsа.test'], ['misto_latim_grego', 'gοοgle.test']]) {
  await cmd('go', `https://${host}:8443/idn`); await wait(2000);
  const ascii = new URL(`https://${host}`).hostname;
  const tab = (await targets()).find(x => x.url.includes(ascii) || x.url.includes(host));
  out[`idn_${nome}`] = { carregou: !!tab && tab.url.includes('/idn') && !tab.url.includes('aviso'), url: tab?.url, barra: await ev(ui, "document.getElementById('url').value") };
}

console.log(JSON.stringify(out, null, 2));
process.exit(0);
