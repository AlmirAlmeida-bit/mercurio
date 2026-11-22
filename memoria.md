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
| Preferências | Buscador (DuckDuckGo, Google, Bing, Brave), **pasta de downloads**, tema (sistema/escuro/claro), **cor de destaque**, limpar cookies/cache |
| Downloads (v0.3.1) | Vão direto para a pasta escolhida em Preferências (padrão: Downloads do sistema; se a pasta sumir, volta ao padrão), sem perguntar; nome repetido vira `arquivo (1).ext`. Botão ao lado da barra de endereço: seta descendo + linha fina de progresso na cor de destaque enquanto baixa, brilho neon ao terminar; clique abre a pasta (com o último arquivo selecionado). Vale para Principal, cápsulas e efêmera (`secure()` no `main.js`). O Windows continua marcando os arquivos como "baixados da internet" |
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
| `lib/hosts.js` | Detecta endereços falsos (letras de alfabetos misturados, sósias cirílicos/gregos, domínio que imita a Chrome Web Store) e decide como mostrar nomes com acento na barra. Autoteste no `npm test` |
| `aviso.html` / `aviso.js` | Página "O Mercurio bloqueou um possível site falso" |
| `logo.png` | Arte original do logo: ☿ estilizado em traços neon (verde/ciano/magenta), fundo transparente. Trocado em 21/11/2026 (o atual tem só 257×288 px; um maior deixa o ícone mais nítido) |
| `assets/logo.png`, `assets/icon.png` | Gerados a partir do `logo.png` por `npm run icon` |
| `scripts/icon.js` | Encaixa o logo inteiro (sem cortar) num quadrado transparente para uso no app, e faz o ícone do app com o logo sobre fundo preto |
| `scripts/notices.js` | Gera o `THIRD-PARTY-NOTICES.txt` |
| `.github/workflows/build.yml` | GitHub Actions: gera instaladores de Windows, Mac e Linux |

Dados do usuário ficam em `%APPDATA%\Mercurio` (Windows): `data.json` (favoritos, histórico, preferências), `permissions.json`, `capsules.json`, `snapshots.json`, `aviso-visto`. As partições das cápsulas ficam em `Partitions/capsula-<id>`.

## Comandos

```bash
npm install          # instalar dependências
npm start            # rodar em desenvolvimento
npm test             # autotestes (barra de endereço, snapshots, conexão, domínios falsos)
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
- **Permissões negadas por padrão:** só tela cheia e copiar são liberados direto; câmera, microfone, localização, notificações etc. perguntam. A decisão vale para o site da barra de endereço (não para o iframe que pediu). Cápsulas têm decisões próprias, só em memória (perguntam de novo após reabrir o navegador). Extensões só ganham sem perguntar o que declararam no manifest.

### Auditoria de segurança (v0.3.0, 21/11/2026)

Feita com ataques reais (kit em HTTPS local com domínios falsos e extensões de teste). Corrigido e testado antes/depois:

| Item | Problema | Correção |
|---|---|---|
| 1 | Site `chromewebstore.google.com.qualquercoisa` listava e **desinstalava extensões sem confirmação** (a biblioteca da loja só confere o começo do endereço) | `lib/hosts.js` + `harden()` cancelam esses domínios antes de carregar |
| IDN | Domínio com letra cirílica (`cаsа.com`) abria normalmente | Bloqueado com página de aviso; acentos legítimos (`pão.com.br`) passam e aparecem com acento na barra |
| 3 | Fuses do Electron no padrão (`ELECTRON_RUN_AS_NODE`, `NODE_OPTIONS`, `--inspect`, sem integridade do asar) | `build.electronFuses` no `package.json` (conferir com `npx @electron/fuses read --app <Mercurio.exe>`) |
| 4 | Ícones de abas de cápsulas/efêmera baixados pela sessão principal (cookies e cache vazavam) | `iconData()` baixa pela sessão da aba e manda `data:` para a barra |
| 5 | Permissões compartilhadas entre Principal e cápsulas; guardadas pelo iframe | Decisões por cápsula + chave = site da barra |
| 6 | Certificado digital enviado sem perguntar | Diálogo `select-client-certificate` |
| 7 | Esc não saía da tela cheia | Esc sai sempre (mundo isolado; o site não consegue impedir). A barra de endereço continua visível na tela cheia |
| 8 | Extensões ganhavam câmera/localização sem perguntar | Só o que o manifest declara |
| 9 | Uma extensão podia usar o id de outra (ex.: `nativeMessaging`) — falha da `electron-chrome-extensions` | `guardExtensionIds()` confere o id com a origem real |
| 10 | Páginas internas em `file://` | Protocolo próprio `mercurio://app/` com lista fixa de arquivos (`SERVED` no `main.js`); sites não abrem nem colocam em iframe |
| 12 | Pop-ups sem clique (4 de 20 passavam) e abas escondidas abrindo abas | Só com clique/tecla recente na aba visível, um por gesto |
| 13 | `commands[name]` aceitava nomes herdados (`constructor`) | `Object.hasOwn` |
| 14 | Pasta de cápsula excluída ficava no disco | Apagada ao abrir o navegador |

Já estava certo: downloads recebem a marca "baixado da internet" do Windows (`ZoneId=3`); erros de certificado são recusados.
**Kit de ataque:** `scripts/seguranca/attack.ps1` (código-fonte), `attack.ps1 -Exe <...>\win-unpacked\Mercurio.exe` (empacotado), `attack.ps1 -Script smoke.mjs` (funcionamento normal). Abre janelas do Mercurio por ~1 min e as traz para a frente nos testes de clique e Esc (com a janela atrás de outra, o Chromium descarta cliques e teclas simulados); não mexer nelas. Todos os itens devem sair "BLOQUEADO"/0, exceto `item12c_popupComClique: 1`, `item7_saiuComEsc: true` e `idn_legitimo.carregou: true`.
**Ao atualizar `electron-chrome-extensions` ou `electron-chrome-web-store`:** rodar o kit de ataque de novo (o `guardExtensionIds` depende de `extensions.ctx.router`; se a estrutura mudar, ele avisa no console).
**Em aberto (decisão do Almir):** item 2 — assinatura digital do instalador e das atualizações. Sem ela, quem invadir a hospedagem do site consegue distribuir uma atualização falsa. Publicar só depois de ter o certificado. Remover `MERCURIO_UPDATE_URL` do app instalado quando assinar. O Mercurio não tem proteção contra sites de golpe/malware do Google (Safe Browsing), que o Electron não inclui.
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

- [x] **Testar a segurança** do navegador: auditoria + correções na v0.3.0 (ver "Auditoria de segurança")
- [ ] **Certificado de assinatura de código** (Windows; Apple depois). Almir só publica com ele. Opções levantadas em 21/11/2026: 1) Microsoft Store (a Microsoft assina o app; conta individual grátis, empresa ~US$ 99 uma vez; conferir a política para navegadores; electron-builder gera `appx`) — ficou de eu preparar o pacote para teste; 2) Trusted/Artifact Signing da Microsoft (~US$ 10/mês; conferir se já atende o Brasil); 3) Certum/Sectigo (US$ 100–400/ano). Mac: Apple Developer US$ 99/ano. Certificados grátis (SignPath, Certum Open Source) são só para código aberto
- [ ] **Atualizar instaladores de Mac e Linux** (em `dist` ainda estão na 0.1.0; Windows já está na 0.3.1). Rodar o GitHub Actions manualmente (Actions → Build → Run workflow, sem tag para não publicar em Releases), baixar os Artifacts e colocar em `dist\mac` e `dist\linux`
- [ ] **Limpar `dist\windows`:** apagar os instaladores de teste 0.2.0 a 0.3.0 e o `builder-debug.yml`, deixando só o mais novo (+ `.blockmap` e `latest.yml`)
- [ ] **Planejar o site de distribuição** (agenda de 21/11/2026). Com o repositório privado, os Releases do GitHub deixam de ser públicos
- [ ] Tornar o repositório privado (Almir vai fazer)
- [x] Release v0.1.0 publicada com os 8 instaladores: https://github.com/AlmirAlmeida-bit/mercurio/releases/tag/v0.1.0
- [ ] Ideias em aberto: "Fixar extensão na barra"; compartilhamento de tela (Meet); definir o Mercurio como navegador padrão; certificados de assinatura (Windows e Apple)
