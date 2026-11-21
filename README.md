# Mercurio

Navegador rápido e seguro, compatível com extensões da Chrome Web Store. Feito com Electron (Chromium).

© 2026 TresTech — [trestech.com.br](https://trestech.com.br)

## Rodar em desenvolvimento

```bash
npm install
npm start
```

> No terminal do VS Code, se `npm start` abrir e fechar sem nada acontecer, limpe a variável `ELECTRON_RUN_AS_NODE` antes.

## Gerar instaladores

| Sistema | Comando | Saída | Observação |
|---|---|---|---|
| Windows | `npm run dist:win` | `dist/windows/` | Só no Windows |
| Linux | `npm run dist:linux` | `dist/linux/` | No Windows sai só `.tar.gz`; no Linux use `npx electron-builder --linux` para `AppImage`, `.deb` e `.tar.gz` |
| Mac | `npm run dist:mac` | `dist/mac/` | Só num Mac (`.dmg` e `.zip`, Intel e Apple Silicon) |

### Pela nuvem (GitHub Actions) — gera os três sistemas

- **Teste:** aba **Actions → Build → Run workflow**. Ao terminar, baixe os arquivos em *Artifacts*.
- **Versão oficial:** crie uma tag, por exemplo `git tag v0.2.0 && git push --tags`. Os instaladores aparecem em **Releases**.

### Passo a passo num Mac

1. Instale o [Node.js](https://nodejs.org) (versão 22 ou mais nova).
2. Baixe o projeto: `git clone https://github.com/AlmirAlmeida-bit/mercurio && cd mercurio`
3. `npm install`
4. `npm run dist:mac`
5. Os arquivos ficam em `dist/mac/`.

**Aviso do macOS:** sem certificado de desenvolvedor Apple (US$ 99/ano), o Mac diz que o app "não pode ser aberto". Para liberar: clique com o botão direito no app → **Abrir**, ou rode `xattr -cr /Applications/Mercurio.app` no Terminal.

## Trocar o logo

Substitua `logo.png` (medalhão circular no centro da arte) e rode `npm run icon`. Se o círculo mudar de posição ou tamanho, ajuste `CIRCLE` em `scripts/icon.js`.
