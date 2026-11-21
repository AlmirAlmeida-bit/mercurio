// Funcionamento normal depois das correções.
import fs from 'node:fs';
import { wait, makeTargets, rpc } from './cdp-lib.mjs';
const [port, shots] = process.argv.slice(2);
const targets = makeTargets(port);
const ev = async (c, expression) => { const r = await c('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); return r.exceptionDetails ? 'ERRO: ' + (r.exceptionDetails.exception?.description ?? '').split('\n')[0] : r.result.value; };
const out = {};
const all = await targets();
out.ui = all.find(t => t.url.includes('ui.html'))?.url;
const ui = await rpc(all.find(t => t.url.includes('ui.html')));
const cmd = (n, a) => ev(ui, `mercurio.cmd(${JSON.stringify(n)}, ${JSON.stringify(a)})`);
const home = await rpc(all.find(t => t.url.includes('home.html')));
out.home_url = all.find(t => t.url.includes('home.html')).url;
out.home_logo_carregou = await ev(home, "document.querySelector('img').naturalWidth > 0");
out.home_fundo = await ev(home, 'getComputedStyle(document.body).backgroundColor');
out.home_tem_ponte = await ev(home, 'typeof painel');
fs.writeFileSync(`${shots}/home.png`, Buffer.from((await home('Page.captureScreenshot', {})).data, 'base64'));
fs.writeFileSync(`${shots}/barra.png`, Buffer.from((await ui('Page.captureScreenshot', {})).data, 'base64'));

// site comum: carrega, ícone vem como data:
await cmd('go', 'https://alvo.test:8443/blank'); await wait(1500);
const site = await rpc((await targets()).find(t => t.url.startsWith('https://alvo.test')));
out.site_abre_painel = await ev(site, "location.href = 'mercurio://app/panel.html'; 'tentou'"); await wait(1000);
out.site_continua_no_site = (await targets()).some(t => t.url.startsWith('https://alvo.test'));
out.site_iframe_interno = await ev(site, "new Promise(r => { const f = document.createElement('iframe'); f.src = 'mercurio://app/home.html'; f.onload = () => { try { r('carregou: ' + f.contentDocument?.title) } catch (e) { r('carregou (sem acesso)') } }; document.body.append(f); setTimeout(() => r('não carregou'), 1500); })");
out.site_fetch_arquivo_app = await ev(site, "fetch('mercurio://app/main.js').then(r => 'LEU ' + r.status, e => 'falhou')");

// painel
await cmd('panel'); await wait(1500);
const pt = (await targets()).find(t => t.url.includes('panel.html'));
const panel = await rpc(pt);
out.painel_url = pt.url;
out.painel_versao = await ev(panel, "painel.call('get').then(d => d.version)");
out.painel_acao_herdada = await ev(panel, "painel.call('constructor').then(() => 'aceitou', e => 'recusou')");
await wait(500);
fs.writeFileSync(`${shots}/painel.png`, Buffer.from((await panel('Page.captureScreenshot', {})).data, 'base64'));

// cápsula: abre aba web e confere isolamento de cookies
await ev(panel, "painel.call('createCapsule', 'Teste')"); await wait(1500);
await cmd('go', 'https://alvo.test:8443/blank?cap'); await wait(1500);
const ct = await rpc((await targets()).find(t => t.url.includes('blank?cap')));
out.capsula_cookie = await ev(ct, "document.cookie = 'x=capsula; path=/'; document.cookie");
out.principal_cookie = await ev(site, 'document.cookie');
out.barra_contexto = await ev(ui, "document.getElementById('ctx')?.textContent");
await cmd('go', 'https://cаsа.test:8443/idn'); await wait(2000);
const av = await rpc((await targets()).find(t => t.url.includes('aviso.html')));
fs.writeFileSync(`${shots}/aviso.png`, Buffer.from((await av('Page.captureScreenshot', {})).data, 'base64'));
fs.writeFileSync(`${shots}/barra-aviso.png`, Buffer.from((await ui('Page.captureScreenshot', { clip: { x: 0, y: 0, width: 1600, height: 90, scale: 1 } })).data, 'base64'));
console.log(JSON.stringify(out, null, 2));
process.exit(0);
