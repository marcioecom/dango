A rodada de perguntas fechou as principais decisões. A migração será um produto novo em `/Users/marciojunior/code/leapstark/pocs/anki-miner`, mantendo a CLI Python atual intacta como referência e fallback.

**Direção Do Produto**

- Desktop macOS primeiro, com backend e sincronização.
- Uso privado para duas pessoas, com dados completamente separados.
- PWA para captura no iPhone na segunda entrega.
- Interface somente em pt-BR, acompanhando o tema claro/escuro do sistema.
- Captura pela janela principal, sem atalho global inicialmente.
- Caixa de entrada separada da sessão de mineração.
- Meta diária, calendário de consistência e lembretes quando houver pendências.
- Sessão dimensionada pelo que falta para cumprir a meta diária.
- Cinco frases geradas, mais a frase original quando ela estiver disponível.
- Revisão humana obrigatória antes da criação do card.
- Ações diferentes para adiar e descartar.
- Cards aprovados contam para a meta mesmo se o Anki estiver fechado.
- Outbox local envia automaticamente quando AnkiConnect voltar.

**Arquitetura Proposta**

```text
┌──────────────────────────────┐
│ Tauri 2 Desktop              │
│ React + TypeScript           │
│ SQLite local + Keychain      │
│ Notificações + menu bar      │
└──────────────┬───────────────┘
               │ HTTPS / sync
               ▼
┌──────────────────────────────┐
│ Backend TypeScript / Vercel  │
│ Better Auth                  │
│ Vercel AI SDK + AI Gateway   │
│ Postgres / Drizzle           │
└──────────────┬───────────────┘
               ▲
               │ HTTPS / sync
┌──────────────┴───────────────┐
│ PWA iPhone                   │
│ Captura local-first          │
│ IndexedDB + sincronização    │
└──────────────────────────────┘

Tauri Desktop ──Rust──► AnkiConnect em 127.0.0.1:8765
```

**Responsabilidades**
| Camada | Responsabilidade |
|---|---|
| Backend | Autenticação, isolamento de usuários, sincronização, histórico, limites e geração por IA |
| Desktop React | Caixa de entrada, sessão, revisão, histórico, meta e configurações |
| Desktop Rust | AnkiConnect, SQLite, Keychain, notificações, menu bar e inicialização com macOS |
| PWA | Captura rápida no iPhone e sincronização posterior |
| Postgres | Fonte remota das capturas, gerações, escolhas e histórico |
| SQLite/IndexedDB | Captura offline, cache local e outbox de sincronização |
| Outbox do Anki | Entregas locais duráveis e idempotentes |

**Monorepo**

```text
anki-miner/
├── apps/
│   ├── desktop/        # Tauri 2 + React/Vite
│   └── web/            # Next.js, API Vercel e futura PWA
├── packages/
│   ├── domain/         # Entidades, schemas e transições de estado
│   ├── api-client/     # Cliente tipado e protocolo de sincronização
│   └── ui/             # Componentes compartilháveis
├── docs/
│   └── adr/
├── PRODUCT.md
├── SPEC.md
└── pnpm-workspace.yaml
```

**Modelo De Estado**
Cada captura terá UUID gerado no cliente, permitindo salvar offline e repetir sincronizações com segurança.

Estados principais:

```text
inbox
  → generating
  → ready_for_review
  → approved
  → pending_anki
  → sent_to_anki

inbox / ready_for_review
  → deferred

inbox / ready_for_review
  → discarded
```

A geração deve ficar em uma entidade separada, registrando:

- Modelo e provedor.
- Versão do prompt.
- Contexto usado.
- Cinco frases retornadas.
- Métricas de tokens, custo e latência.
- Erros e tentativas.
- Frase escolhida ou editada.

**Integração Com Anki**

- Toda comunicação com AnkiConnect passa pelo Rust, não pelo webview.
- Deck, note type e campos serão configurados por usuário no onboarding.
- Os padrões atuais podem ser `English::Mining`, `Basic`, `Front` e `Back`.
- O app valida os campos antes de permitir a primeira sessão.
- Cada card recebe uma tag estável baseada no UUID, como `anki-miner::<uuid>`.
- Em reenvios, o app procura essa tag e atualiza a nota existente.
- O card mantém o formato atual:
  - Frente: frase com expressão destacada e áudio.
  - Verso: expressão e tradução.
- Texto do usuário e da IA será escapado antes de gerar HTML.
- AwesomeTTS não será uma dependência.

**IA E TTS**
As chamadas ao Vercel AI Gateway ficam exclusivamente no backend. Nenhuma chave será distribuída no desktop ou PWA.

Antes de escolher modelo e voz:

1. Importar o arquivo futuro com aproximadamente 600 entradas.
2. Classificar palavras, expressões, phrasal verbs e entradas com contexto.
3. Selecionar 10 casos representativos, incluindo casos difíceis.
4. Comparar modelos baratos disponíveis no AI Gateway.
5. Medir validade estrutural, naturalidade, uso correto da expressão, preferência humana, latência e custo informado pelo provedor.
6. Comparar `gTTS` com pelo menos uma opção neural.
7. Medir preferência de voz, latência, tamanho do MP3 e custo.
8. Definir modelo, fallback e limite diário usando os resultados, sem estimativas arbitrárias.

O cache de geração deve considerar usuário, texto, contexto, modelo e versão do prompt. Isso corrige a limitação atual de `src/cache.py`, que ignora modelo e prompt.

**Autenticação E Segurança**

- Better Auth com email e senha.
- Cadastro restrito por allowlist de emails.
- Verificação de email e recuperação de senha.
- Sessão web por cookie seguro.
- Desktop usando token apropriado para cliente nativo, armazenado no Keychain.
- Trusted origins explícitas para PWA e Tauri.
- CSRF e verificação de origem mantidos.
- Rate limiting persistente, adequado ao ambiente serverless.
- Limite de geração por usuário definido após o benchmark.
- Registros de consumo sem armazenar chaves ou conteúdo sensível em logs.
- Áudio entregue temporariamente e não retido no backend.

**Experiência Desktop**
As superfícies principais serão:

1. **Hoje**: progresso da meta, pendências, estado do Anki e ação para iniciar sessão.
2. **Caixa de entrada**: adicionar, editar, adiar, descartar e identificar duplicatas.
3. **Sessão**: explicação, frase original, cinco alternativas, áudio, edição e atalhos.
4. **Envios**: estado da outbox, erros e reenvio para o Anki.
5. **Histórico**: cards aprovados e calendário de consistência.
6. **Configurações**: Anki, meta, lembrete, conta e aparência.

Princípios preservados do `PRODUCT.md` atual:

- Interface utilitária, confiável e direta.
- Decisões rápidas e reversíveis.
- Atalhos de teclado visíveis.
- Sem automação que crie cards sem revisão.
- Erros em linguagem clara.
- Estado salvo após cada ação.
- Motion curto e funcional, nunca decorativo.

**Notificações**

- Horário diário configurável.
- Notificar apenas quando houver itens pendentes.
- Ações para iniciar a sessão ou lembrar depois.
- Aplicativo opcionalmente iniciado com o macOS.
- Permanência na barra de menus quando a janela for fechada.
- Estado e preferências preservados mesmo sem conexão.

**PWA Para iPhone**
TestFlight não é gratuito: a Apple o inclui no Apple Developer Program de US$ 99 por ano. Para esse projeto privado, a PWA evita essa cobrança.

A PWA terá escopo deliberadamente pequeno:

- Instalação pela tela inicial do Safari.
- Login persistente.
- Captura de texto obrigatória.
- Frase original e origem opcionais.
- Detecção de duplicata com possibilidade de continuar.
- Salvamento offline em IndexedDB.
- Sincronização quando houver conexão.
- Lista curta das capturas recentes e seus estados.

Ela não gerará áudio, revisará cards nem se comunicará diretamente com o Anki na primeira versão.

**Plano De Implementação**

### Fase 0: Especificação e spikes

- Criar `SPEC.md`, atualizar a definição de produto e registrar ADRs.
- Prototipar autenticação Tauri com Better Auth.
- Prototipar AnkiConnect pelo Rust.
- Validar SQLite local-first e sincronização idempotente.
- Executar benchmarks de IA e TTS.
- Verificar notificações, menu bar e autostart em build macOS sem notarização.

Critério: todas as integrações de maior risco funcionam isoladamente em versões pequenas.

### Fase 1: Fundação do backend

- Configurar monorepo pnpm.
- Criar Postgres e migrations.
- Implementar Better Auth, allowlist e isolamento por usuário.
- Criar entidades de captura, geração, histórico e consumo.
- Implementar API tipada e idempotência.
- Integrar Vercel AI Gateway com resposta estruturada.
- Adicionar limites e observabilidade.

Critério: dois usuários conseguem capturar, listar e gerar conteúdo sem acessar os dados um do outro.

### Fase 2: Desktop local-first

- Criar shell Tauri, SQLite e cliente de sincronização.
- Implementar login e armazenamento seguro da sessão.
- Construir onboarding do Anki.
- Implementar telas Hoje e Caixa de entrada.
- Adicionar captura offline e resolução de duplicatas.
- Importar pendências da CLI e arquivos numerados.

Critério: capturas sobrevivem a reinício, falta de conexão e replay da sincronização.

### Fase 3: Sessão de mineração

- Implementar seleção baseada no restante da meta.
- Gerar somente itens da sessão.
- Fazer prefetch do próximo item enquanto o atual é revisado.
- Exibir frase original mais cinco alternativas.
- Permitir escolher, editar, regenerar, adiar e descartar.
- Persistir cada decisão imediatamente.
- Contabilizar progresso ao aprovar.

Critério: uma sessão interrompida continua exatamente do ponto salvo.

### Fase 4: Áudio e entrega ao Anki

- Integrar o provedor de TTS escolhido.
- Reproduzir áudio antes da aprovação.
- Gerar HTML seguro.
- Criar outbox local para Anki.
- Implementar tags idempotentes, criação, atualização e reenvio.
- Tratar Anki fechado sem bloquear a sessão.

Critério: repetição do mesmo envio nunca cria duas notas para o mesmo UUID.

### Fase 5: Rotina e acabamento

- Adicionar meta diária e calendário.
- Implementar notificações condicionadas à fila.
- Adicionar menu bar e autostart.
- Completar temas claro e escuro.
- Cobrir estados vazios, offline, loading e erro.
- Preparar build manual sem notarização e instrução curta para o Gatekeeper.

Critério: vocês dois conseguem instalar e cumprir uma sessão diária sem usar a CLI.

### Fase 6: PWA

- Ativar shell PWA no app web.
- Implementar formulário móvel compacto.
- Adicionar IndexedDB e outbox offline.
- Sincronizar capturas com o backend.
- Validar instalação e uso pelo Safari no iPhone.

Critério: uma captura feita com o Mac desligado aparece posteriormente na caixa de entrada desktop.

**Migração Dos Dados**

- Importar somente itens pendentes de `~/.anki-automator/inbox.txt`.
- Permitir importação manual de listas numeradas.
- Não importar checkpoints numéricos.
- Não importar o cache antigo.
- Não reconstruir cards já presentes no Anki.
- Manter o projeto Python disponível durante toda a validação.

**Fora Do Escopo Inicial**

- App iOS nativo ou Tauri Mobile.
- TestFlight e App Store.
- Windows e Linux.
- Cadastro público.
- Filas compartilhadas.
- Share sheet do iOS.
- Atalho global no macOS.
- Gamificação com níveis e conquistas.
- AwesomeTTS.
- Customização completa do template do card.
- Revisão do Anki pelo aplicativo.

Esse recorte entrega primeiro o caminho crítico: capturar, gerar, revisar e enviar com segurança. A PWA entra depois usando o mesmo backend, sem exigir pareamento direto entre iPhone e Mac ou pagamento anual à Apple.
