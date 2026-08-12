# Plano de simplificação — 2026-08-11

Executa `docs/project/simplification-brief.md`. `objectives.md` é o invariante
e não muda. Teste de cada corte: **qual objetivo sentiria falta?** "Nenhum"
significa que sai.

Este arquivo é o plano e o registro do que foi decidido. Pode ser apagado
quando o trabalho estiver revisado; a lista do que NÃO pode ser simplificado
vai para `decisions.md`, que é permanente.

---

## O que não pode ser simplificado sem perder um objetivo

A lista curta. Cada item nomeia o objetivo que sentiria falta.

1. **Determinismo, `step()` puro, e o canal Observation/Belief.** Sem eles
   não há replay, não há "mesmo seed mesma run", e a névoa vira decoração.
   Atribuição ("dizer por que a run foi como foi") depende de poder reassistir.
2. **A divisão espinha/lateral com risco e recompensa sorteados separados**
   (`spine.js`, `SPINE_THREAT_SHARE`, `SIDE_ROOM_DEPTH_BONUS`, os dois
   sorteios independentes, `MIN_ROSTER_FOR_SIDE`, `SIDE_CHEST_BIAS`).
   É o objetivo próprio do brief: várias rotas podem ganhar, a boa é difícil
   de achar. Sem os dois sorteios independentes o desvio vira almoço grátis —
   já foi medido assim.
3. **A curva exponencial de contagem + rampa de força ancorada no andar 10.**
   "A maioria das tentativas não pode morrer na abertura" e "run decidida
   acaba rápido" são exatamente a forma abertura-suave/fundo-íngreme. O modelo
   aditivo foi medido: toda a atrição caía nos 3 primeiros andares.
4. **Cauda fora de profundidade + sorteio compartilhado do andar** (4 dials).
   "O desfecho fica incerto o maior tempo possível": sem variância no fundo, o
   clímax é o trecho mais previsível da run (lei 1/√N, medida). A volta
   (floors 11–20) é inteiramente esse mecanismo.
5. **O orçamento de turnos por travessia** (`TURN_BUDGET`). Único freio do
   shamble — run decidida que continua andando.
6. **No bot: rota precificada por perigo + veto de sobrevivência do duelo.**
   Objetivo 1 do bot é sobreviver; sem esses dois ele morre por acidente de
   rota, e morte inatribuível é loteria, não corrida.
7. **Guardião do santuário e guarda de baú.** "Loot não é de graça" é o que
   torna uma vitória atribuível a lutas escolhidas.
8. **`run-tests.html` + monotonicidade dos andares (M11) + guarda da névoa.**
   Correção não é medição; esses testes protegem tudo acima.

## O que sai, e por quê nenhum objetivo sente

- **O bot de 7 módulos** (dominância B22, fases B23, preço de turno B25,
  sequência B20, veto tático + mundo hipotético, valor marginal de campanha,
  chokepoint, exposure, frontier value, e todos os flags mortos). Substituído
  por um bot de regras simples com 3 objetivos ordenados. O objetivo era um
  bot **atribuível**; o atual não é nem para o dono.
- **9 dials de clamp de tier → 1 família com sinal** (o próprio CLAUDE.md
  admite que duas famílias são a mesma expressão; indistinguíveis no n
  disponível).
- **Constantes-sombra**: `MONSTER_GROWTH`/`_REBALANCED`,
  `STRENGTH_GROWTH`/`_REBALANCED`, `DIFFICULTY_REBALANCED`,
  `DROP_CHANCE`≡`MONSTER_DROP_CHANCE`. Fica um nome por conceito.
- **Flags booleanos mortos** (10): a história vai para `decisions.md` em
  prosa, com o número que matou cada um. O código para de carregá-los.
- **7 dos 9 módulos de análise + 6 páginas one-off.** `run-check.html` vira
  meia dúzia de tripwires calculados por um módulo pequeno que joga runs
  reais. Cada número declara a própria condição de disparo.
- **O protocolo de sincronização de documentos e os 5 papéis.** Um agente,
  documentos curtos o suficiente para atualizar no mesmo commit sem
  cerimônia.

## Estágios (um commit cada)

1. **Bot**: reescrever `src/bot/` — `bot.js` (política), `nav.js` (mantido),
   `config.js` (dials do bot + herói-como-configuração). Herói com traços =
   outro objeto de config, mesmo código; provado por teste.
2. **Dials**: colapso em `balance.js`/`difficulty.js`/`spawn.js`; remoção dos
   flags e do encanamento de variantes no motor.
3. **Métricas**: `src/analysis/check.js` novo; `run-check.html` reescrito;
   páginas e módulos velhos apagados; selftest do `measure.mjs` re-ancorado.
4. **Docs**: `CLAUDE.md` reescrito; `bot.md` novo; `balance.md` curto;
   `backlog.md` curto; `lab-backlog.md`, `observed-ruler.md`,
   `i12-baseline.md` apagados; `decisions.md` absorve a história dos flags.
5. **Verificação**: testes verdes headless, tripwires com valores sãos,
   jogo assistido no browser.

## Mapa por andar continua descritível em poucos dials

| pergunta do dono | dial |
|---|---|
| quantas criaturas | `MONSTERS_BASE` × `MONSTER_GROWTH`^andar (+ `MONSTER_SPREAD_*`) |
| quão forte a média | `MONSTER_STRENGTH` × `STRENGTH_GROWTH`^andar |
| quanto varia | `TIER_SLACK_*` (banda), `OUT_OF_DEPTH_*` (cauda), `MONSTER_SPREAD_*` |
| quão agrupadas | `CLUSTER_SIZE` |
| quanto loot | `CHESTS_PER_FLOOR` + escassez por tipo |
| quanto a rota ramifica | `MAP_DUG_PERCENTAGE` + dials de espinha/lateral |

Tier mais difícil de masmorra = `makeFloorPlan(model)` com outros valores —
mecanismo já existente, mantido como O jeito de criar tiers. Nada de sistema
paralelo.
