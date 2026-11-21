# Memória do projeto Mercurio

> Atualizado em 20/11/2026. Resumo do que existe, por que foi feito assim e o que falta.

## O que é

**Mercurio** é um navegador para Windows, Mac e Linux, feito pela **TresTech** (trestech.com.br) para ser vendido.
Usa **Electron 45** (motor Chromium 156), é compatível com extensões da Chrome Web Store e tem visual minimalista inspirado no deus Mercúrio.

- Repositório: https://github.com/AlmirAlmeida-bit/mercurio (público hoje, **vai ficar privado**)
- Versão atual: **0.2.0** (em teste local; a última publicada no GitHub é a `v0.1.0`, de 20/11/2026)
- Nome da empresa confirmado: **TresTech** (o site se apresenta como "3tech", mas o nome oficial é TresTech)

## Funcionalidades

| Área | O que faz |
|---|---|
| Abas | Abrir, fechar, trocar (`Ctrl+T`, `Ctrl+W`, `Ctrl+Tab`), botão do meio fecha |
| Navegação | Voltar, avançar, recarregar, **Home → trestech.com.br** |
| Barra de endereço | Entende site ou busca; aceita só `http`/`https`; mostra cadeado ou "Não seguro" |
| Favoritos | Estrela (`Ctrl+D`), **barra de favoritos em guias** (`Ctrl+Shift+B`), menu do botão direito, botão » para os que não cabem |
| Painel (`mercurio://painel`) | Abre numa aba própria: Favoritos, Histórico (`Ctrl+H`), Extensões, Preferências (`Ctrl+,`) |
| Extensões | Instala direto da Chrome Web Store, com confirmação das permissões; atualiza sozinho; lista e remove no painel |
| Permissões | Faixa "site quer usar câmera / localização…" com Permitir/Bloquear; lembra por site; dá para revogar no painel |
| Importar favoritos | Preferências → "Importar favoritos": lê direto o arquivo `Bookmarks` dos perfis do Chrome, Edge e Brave (Windows, Mac, Linux); pastas são achatadas; repetidos são ignorados |
| Contextos | Botão "● Principal ▾" no começo das abas: troca entre Principal, cápsulas e sessão efêmera. Cada contexto tem sessão própria (cookies, logins, cache); extensões e histórico só no Principal |
| Cápsulas | Abas + sessão própria (`persist:capsula-<id>`) + anotações, com nome. Pausar fecha as abas (libera memória) e guarda as URLs; retomar reabre já logado; excluir apaga os dados. Ao fechar o navegador, as cápsulas voltam pausadas. Painel → Cápsulas |
| Snapshots | Retrato das abas (Principal + cápsulas, nunca a efêmera). Manual, a cada 10 min se algo mudou, e ao fechar. Limite 10/20/50/100 (Preferências). Restaurar abre ao lado. Painel → Snapshots |
| Sessão efêmera | `Ctrl+Shift+N`. Sessão só em memória, sem extensões nem histórico; página Auditoria (`mercurio://auditoria`) mostra navegações e requisições ao vivo (até 2.000), com Exportar JSON. Encerrar apaga abas, cookies, cache e o registro |
| Sem internet | Quando uma página falha com erro de rede e um teste real de conexão (`lib/connectivity.js`: abre endereços de verificação da Microsoft/Google/Cloudflare, 2,5 s) confirma que não há internet, a aba mostra `offline.html`: "Enquanto sua internet não volta, aproveite" + jogo original (gota de mercúrio alada pulando torres e nuvens; espaço/↑/clique; recorde salvo). A barra mostra o site original e a página volta sozinha quando a conexão retorna |
| Preferências | Buscador (DuckDuckGo, Google, Bing, Brave), tema (sistema/escuro/claro), **cor de destaque**, limpar cookies/cache |
| Aviso de direitos | Janela "© TresTech" com link para o site, na 1ª abertura **após cada instalação** |
| Licenças | `THIRD-PARTY-NOTICES.txt` abre por Painel → Preferências → Sobre → "Licenças de terceiros" |

## Arquivos

| Arquivo | Papel |
|---|---|
| `main.js` | Processo principal: janela, abas, permissões, extensões, painel, histórico, favoritos. **Topo do arquivo cita todas as bibliotecas e licenças** |
| `ui.html` / `ui.js` | Barra do navegador (abas, endereço, favoritos, faixa de permissão) |
| `preload.js` | Ponte segura entre a barra e o `main.js` |
| `panel.html` / `panel.js` / `panel-preload.js` | Painel de configurações |
| `home.html` / `home.js` | Página da nova aba (logo grande + busca) |
| `lib/contexts.js` | Cria sessões por contexto e aplica a mesma política de segurança/permissões em todas (`harden`); `wipe` apaga dados |
| `lib/capsules.js` | Dados das cápsulas (criar, renomear, anotar, excluir) |
| `lib/snapshots.js` | Serializar/limitar/restaurar snapshots (funções puras; teste em `lib/snapshots.test.js`) |
| `lib/audit.js` | Registro em memória da sessão efêmera (rede + navegação) |
| `lib/store.js` | Gravação atômica de JSON (temporário + rename) |
| `audit.html` / `audit.js` | Página de auditoria da sessão efêmera |
| `offline.html` / `offline.js` | Página "sem internet" com o joguinho (canvas, sem imagens nem bibliotecas) |
| `accent.js` | Aplica a cor de destaque (usado pela barra, painel e nova aba) |
| `url.js` | Converte o que foi digitado em endereço ou busca. Tem autoteste: `npm test` |
| `logo.png` | Arte original do logo (símbolo ☿ num medalhão circular, fundo "Matrix"), trocada em 21/11/2026 |
| `assets/logo.png`, `assets/icon.png` | Gerados a partir do `logo.png` por `npm run icon` |
| `scripts/icon.js` | Recorta o medalhão em círculo (logo dentro do app) e faz o ícone do app (arte inteira, cantos arredondados). Se a arte mudar, ajustar `CIRCLE` |
| `scripts/notices.js` | Gera o `THIRD-PARTY-NOTICES.txt` |
| `.github/workflows/build.yml` | GitHub Actions: gera instaladores de Windows, Mac e Linux |

Dados do usuário ficam em `%APPDATA%\Mercurio` (Windows): `data.json` (favoritos, histórico, preferências), `permissions.json`, `capsules.json`, `snapshots.json`, `aviso-visto`. As partições das cápsulas ficam em `Partitions/capsula-<id>`.

## Comandos

```bash
npm install          # instalar dependências
npm start            # rodar em desenvolvimento
npm test             # autotestes (barra de endereço + snapshots)
npm run icon         # regerar logo/ícone a partir de logo.png
npm run notices      # regerar THIRD-PARTY-NOTICES.txt (após mudar dependências)
npm run dist:win     # instalador Windows  -> dist/windows/
npm run dist:linux   # Linux .tar.gz       -> dist/linux/
npm run dist:mac     # Mac .dmg/.zip       -> dist/mac/   (só num Mac)
```

## Atualização automática (electron-updater)

- **Testar builds novas:** não precisa desinstalar. Feche o Mercurio e rode o instalador novo: ele atualiza por cima e mantém favoritos, histórico, cápsulas e preferências. Suba a `version` no `package.json` a cada build de teste (0.2.0 → 0.2.1…).
- **Como funciona:** cada build gera, junto do instalador, o **`latest.yml`** (versão + SHA-512) e o `.blockmap`. O app instalado confere `https://trestech.com.br/mercurio/atualizacoes/latest.yml` ao abrir e a cada 6 h, baixa em segundo plano, valida o SHA-512 e mostra o botão **Atualizar** na barra (ou instala ao fechar). Status em Painel → Preferências → Sobre.
- **Publicar uma atualização (quando o site existir):** copie para a pasta `mercurio/atualizacoes/` do site os arquivos de `dist/windows/`: `latest.yml`, `Mercurio Setup X.exe` e `.blockmap`. Mantenha o `.blockmap` da versão anterior também: assim os usuários baixam só a diferença.
- **Trocar o endereço:** `build.publish[0].url` no `package.json` (vai gravado no app; versões já instaladas continuam usando o endereço antigo).
- **Testar sem site:** rode o app empacotado com a variável `MERCURIO_UPDATE_URL=http://127.0.0.1:<porta>` apontando para uma pasta com `latest.yml` + instalador.
- **Limites:** Mac só se atualiza sozinho com certificado Apple (app assinado); no Linux funciona com o AppImage (não com `.deb`/`.tar.gz`). Sem assinatura digital no Windows, a proteção é o HTTPS do site + SHA-512.

**Versão nova com os três sistemas:** mudar `version` no `package.json`, depois `git tag v0.2.0 && git push origin v0.2.0`. O GitHub Actions gera tudo e publica em Releases.

## Decisões tomadas (e por quê)

- **Identidade visual (21/11/2026):** cantos quase quadrados (`border-radius: 2px` em tudo; só o ícone de carregamento é redondo) e cores de destaque **fluorescentes** com brilho neon (`--glow`, definido em `accent.js`). Paleta: verde neon `#39ff14` (padrão, combina com o logo), ciano, magenta, amarelo-limão, laranja, rosa-choque, violeta elétrico + cor livre. Objetivo: ser diferente dos navegadores do mercado, que usam cantos bem arredondados. Novos elementos devem seguir: 2px de canto e `var(--accent)` / `var(--glow)` para destaque. `--glow` é reservado para o brilho neon (é um box-shadow, não uma cor): não reutilizar o nome em outras variáveis. A nova aba (`home.html`) é **sempre preta**, mesmo no tema claro.

- **Electron em vez de criar um motor ou bifurcar o Chromium:** o único caminho viável para uma equipe pequena; o Chromium dá compatibilidade com sites e extensões.
- **`electron-chrome-extensions` + `electron-chrome-web-store` (MIT):** o Electron sozinho só entende parte das extensões; estas bibliotecas trazem ícones, popups, abas e a loja.
- **Extensões fora da barra (pedido do Almir):** ficam só no painel. Consequência: extensões que dependem de clicar no ícone (ex.: gerenciador de senhas) não abrem o popup. Ideia pendente: opção "Fixar na barra".
- **Segurança das páginas:** cada aba roda isolada (`sandbox`, `contextIsolation`, sem Node); só a barra e o painel locais falam com o `main.js`, e o `main.js` confere a origem; `<webview>` bloqueado; endereços `javascript:` e `file:` digitados viram busca.
- **Permissões negadas por padrão:** só tela cheia e copiar são liberados direto; câmera, microfone, localização, notificações etc. perguntam.
- **Aviso de direitos por instalação:** usa a data do executável como identificador, porque `%APPDATA%` sobrevive à reinstalação.
- **Instalador Windows de um clique (NSIS), sem assinatura digital:** o Windows mostra "O Windows protegeu o computador" → *Mais informações → Executar assim mesmo*.
- **Mac sem certificado Apple:** o macOS bloqueia na 1ª vez → botão direito → *Abrir*, ou `xattr -cr /Applications/Mercurio.app`.

## Licenças

- Electron e bibliotecas: **MIT**. Chromium: **BSD-3-Clause**. `pbf`: BSD-3-Clause.
- **Uso comercial é permitido**, inclusive com código fechado, desde que os avisos de copyright e os textos das licenças acompanhem o app (feito: `THIRD-PARTY-NOTICES.txt`, `LICENSE.electron.txt`, `LICENSES.chromium.html`).
- Não usar as marcas "Chrome"/"Google" como marca do produto.
- Recomendado antes de vender: consultar advogado de propriedade intelectual e checar o nome "Mercurio" no INPI.

## Cuidados técnicos

- **No terminal do VS Code / Claude Code**, a variável `ELECTRON_RUN_AS_NODE` vem ligada e faz o Electron abrir como Node (o app não abre). Rodar `Remove-Item Env:ELECTRON_RUN_AS_NODE` (PowerShell) antes de `npm start`/`npm run dist:*`.
- O nome do arquivo é `logo.png` em minúsculas (Mac e Linux diferenciam maiúsculas).
- No Windows, o `AppImage` e o `.deb` do Linux não saem (precisam do GitHub Actions ou de um Linux).
- Downloads grandes de Artifacts pelo `gh` caíram várias vezes; pelo navegador é mais estável.
- Às vezes o Windows (antivírus) trava `dist\windows\win-unpacked` e o build falha com `EBUSY`. Solução: gerar em outra pasta (`npx electron-builder --win -c.directories.output=<pasta>`) e copiar o `.exe`.
- **Não confiar em `net.isOnline()` / `navigator.onLine`:** com adaptadores virtuais sempre ligados (Hyper-V "vEthernet", WSL, VPN, Docker) o Windows diz "online" sem Wi-Fi, e o erro vira "endereço não encontrado". Por isso o jogo offline usa teste real de conexão. Para testar sem desligar o Wi-Fi: abrir com `"--host-resolver-rules=MAP * ~NOTFOUND"` (entre aspas) e um perfil novo (o cache serve páginas já visitadas).
- Extensões só funcionam no contexto Principal (a biblioteca é ligada à sessão padrão). Decisão de 21/11/2026.

## Pendências

- [ ] **Testar a segurança** do navegador (agenda de 21/11/2026)
- [ ] **Planejar o site de distribuição** (agenda de 21/11/2026). Com o repositório privado, os Releases do GitHub deixam de ser públicos
- [ ] Tornar o repositório privado (Almir vai fazer)
- [x] Release v0.1.0 publicada com os 8 instaladores: https://github.com/AlmirAlmeida-bit/mercurio/releases/tag/v0.1.0
- [ ] Ideias em aberto: "Fixar extensão na barra"; compartilhamento de tela (Meet); definir o Mercurio como navegador padrão; certificados de assinatura (Windows e Apple)
