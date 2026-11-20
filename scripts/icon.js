// Gera, a partir de ./logo.png (arte sobre fundo preto):
//   assets/logo.png  -> logo com fundo transparente (preto vira transparência, brilho preservado)
//   assets/icon.png  -> ícone do app (512px, cantos arredondados)
// Rodar: npm run icon
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

app.whenReady().then(async () => {
  const src = 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'logo.png')).toString('base64');
  const w = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
  await w.loadURL('about:blank');
  const [logo, icon] = await w.webContents.executeJavaScript(`(async () => {
    const img = new Image(); img.src = ${JSON.stringify(src)}; await img.decode();
    const S = 512;

    // Transparência: alfa = canal mais claro; cor "desmultiplicada" pelo alfa.
    const c = document.createElement('canvas'); c.width = c.height = S;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0, S, S);
    const d = x.getImageData(0, 0, S, S), p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      const a = Math.max(p[i], p[i + 1], p[i + 2]);
      if (a < 6) { p[i + 3] = 0; continue; } // ruído do fundo preto
      p[i] = p[i] * 255 / a; p[i + 1] = p[i + 1] * 255 / a; p[i + 2] = p[i + 2] * 255 / a; p[i + 3] = a;
    }
    x.putImageData(d, 0, 0);

    // Ícone: arte original sobre preto, recortada em cantos arredondados.
    const k = document.createElement('canvas'); k.width = k.height = S;
    const y = k.getContext('2d');
    y.beginPath(); y.roundRect(0, 0, S, S, 116); y.clip();
    y.fillStyle = '#000'; y.fillRect(0, 0, S, S);
    y.drawImage(img, -24, -16, S + 48, S + 48);
    return [c.toDataURL(), k.toDataURL()];
  })()`);
  const out = (name, url) => fs.writeFileSync(path.join(root, 'assets', name), Buffer.from(url.split(',')[1], 'base64'));
  out('logo.png', logo);
  out('icon.png', icon);
  app.quit();
});
