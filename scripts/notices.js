// Gera THIRD-PARTY-NOTICES.txt com o texto completo das licenças de terceiros.
// Rodar após mudar dependências: npm run notices
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const mod = name => path.join(root, 'node_modules', name);

function licenseText(dir, pkg) {
  const file = fs.readdirSync(dir).find(f => /^(licen[sc]e|copying)(\.|$)/i.test(f));
  if (file) return fs.readFileSync(path.join(dir, file), 'utf8').trim();
  // Pacote publicado sem arquivo de licença: texto padrão da licença declarada.
  if (pkg.license === 'MIT') {
    const who = typeof pkg.author === 'string' ? pkg.author : pkg.author?.name;
    return `MIT License\n\nCopyright (c) ${who.replace(/ *<.*>/, '')}\n\n${MIT_BODY}`;
  }
  throw new Error(`Sem texto de licença para ${pkg.name}`);
}

const MIT_BODY = `Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

const line = '='.repeat(78);
const section = (title, body) => `${line}\n${title}\n${line}\n\n${body}\n\n`;

const electron = require(mod('electron/package.json'));
let out = `MERCURIO — AVISOS DE SOFTWARE DE TERCEIROS / THIRD-PARTY NOTICES

Mercurio © ${new Date().getFullYear()} TresTech (trestech.com.br). Todos os direitos reservados
sobre o código, a marca, o logo e o design do Mercurio.

O Mercurio inclui os componentes de código aberto abaixo, cada um sob a sua
própria licença, reproduzida integralmente a seguir.

As licenças do Chromium e de todos os seus componentes estão no arquivo
LICENSES.chromium.html, que acompanha o aplicativo.

`;
out += section(`electron ${electron.version} (MIT)`, licenseText(mod('electron'), electron));

const dirs = execSync('npm ls --omit=dev --all --parseable', { cwd: root, encoding: 'utf8' })
  .trim().split(/\r?\n/).slice(1);
const seen = new Set();
for (const dir of dirs) {
  const pkg = require(path.join(dir, 'package.json'));
  const key = `${pkg.name}@${pkg.version}`;
  if (seen.has(key)) continue;
  seen.add(key);
  out += section(`${pkg.name} ${pkg.version} (${pkg.license})`, licenseText(dir, pkg));
}

fs.writeFileSync(path.join(root, 'THIRD-PARTY-NOTICES.txt'), out);
console.log(`THIRD-PARTY-NOTICES.txt: electron + ${seen.size} bibliotecas`);
