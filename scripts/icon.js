// Gera, a partir de ./logo.png (logo com fundo transparente, qualquer proporção):
//   assets/logo.png  -> logo centralizado num quadrado transparente (usado dentro do app)
//   assets/icon.png  -> ícone do app: logo sobre fundo preto, cantos levemente arredondados (512px)
// Rodar: npm run icon. Para um ícone nítido, use um logo.png com pelo menos 512px de altura.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const S = 512;
const ICON_LOGO = 0.78;  // quanto do ícone o logo ocupa
const ICON_RADIUS = 56;  // canto do ícone (o resto da interface usa 2px; ícone de sistema pede um pouco mais)

app.whenReady().then(async () => {
  const src = 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'logo.png')).toString('base64');
  const w = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
  await w.loadURL('about:blank');
  const [logo, icon, size] = await w.webContents.executeJavaScript(`(async () => {
    const img = new Image(); img.src = ${JSON.stringify(src)}; await img.decode();
    const S = ${S};
    // encaixa a imagem inteira (sem cortar) num quadrado de lado "box", centralizada
    const fit = (ctx, box, off) => {
      const k = box / Math.max(img.width, img.height);
      const w = img.width * k, h = img.height * k;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, off + (box - w) / 2, off + (box - h) / 2, w, h);
    };

    const c = document.createElement('canvas'); c.width = c.height = S;
    fit(c.getContext('2d'), S, 0);

    const k = document.createElement('canvas'); k.width = k.height = S;
    const y = k.getContext('2d');
    y.beginPath(); y.roundRect(0, 0, S, S, ${ICON_RADIUS}); y.clip();
    y.fillStyle = '#000'; y.fillRect(0, 0, S, S);
    fit(y, S * ${ICON_LOGO}, S * (1 - ${ICON_LOGO}) / 2);

    return [c.toDataURL(), k.toDataURL(), img.width + 'x' + img.height];
  })()`);
  const out = (name, url) => fs.writeFileSync(path.join(root, 'assets', name), Buffer.from(url.split(',')[1], 'base64'));
  out('logo.png', logo);
  out('icon.png', icon);
  console.log(`logo.png ${size} -> assets/logo.png e assets/icon.png (${S}px)`);
  app.quit();
});
