// Gera, a partir de ./logo.png (medalhão circular sobre fundo "Matrix"):
//   assets/logo.png  -> só o medalhão, recortado em círculo com fundo transparente (usado dentro do app)
//   assets/icon.png  -> ícone do app: a arte inteira em quadrado de cantos arredondados (512px)
// Rodar: npm run icon
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
// Posição do aro prateado na arte, em fração do tamanho (ajuste se trocar a imagem)
const CIRCLE = { x: 0.508, y: 0.497, r: 0.428 };

app.whenReady().then(async () => {
  const src = 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'logo.png')).toString('base64');
  const w = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
  await w.loadURL('about:blank');
  const [logo, icon] = await w.webContents.executeJavaScript(`(async () => {
    const img = new Image(); img.src = ${JSON.stringify(src)}; await img.decode();
    const S = 512, C = ${JSON.stringify(CIRCLE)};

    // Medalhão: recorta o círculo do aro e amplia para ocupar a imagem toda.
    const c = document.createElement('canvas'); c.width = c.height = S;
    const x = c.getContext('2d');
    x.beginPath(); x.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); x.clip();
    const side = C.r * 2 * img.width;
    x.drawImage(img, (C.x - C.r) * img.width, (C.y - C.r) * img.height, side, side, 0, 0, S, S);

    // Ícone: arte inteira com cantos arredondados.
    const k = document.createElement('canvas'); k.width = k.height = S;
    const y = k.getContext('2d');
    y.beginPath(); y.roundRect(0, 0, S, S, 116); y.clip();
    y.drawImage(img, 0, 0, S, S);
    return [c.toDataURL(), k.toDataURL()];
  })()`);
  const out = (name, url) => fs.writeFileSync(path.join(root, 'assets', name), Buffer.from(url.split(',')[1], 'base64'));
  out('logo.png', logo);
  out('icon.png', icon);
  app.quit();
});
