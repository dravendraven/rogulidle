# Plano das masmorras (U14) — 2026-11-01

O desenho está em `candidates.md` (U14, "As 8 masmorras"): três eixos
binários — 🐺 Matilha × 🐉 Fera, 📦 Fartura × 💎 Relíquia, ☀️ Claro × 🌑 Breu —
e uma masmorra por combinação, oito ao todo, com nomes do DCSS. Este arquivo
é a ordem de construção. Quando uma etapa fica pronta, o doc que a descreve
muda no mesmo commit e a etapa ganha "FEITO".

**Correção, 2026-11-02:** este plano foi escrito dizendo que nada estava
construído, e estava errado — M1, M2, M4, M5 e o essencial da M3 tinham
sido feitos em 2026-10-04/05 no branch `claude/project-summary-c58d76` e
nunca chegaram ao main. Foram mesclados agora. **Antes de planejar, procure
nos branches** (`git log --all --grep=<assunto>`).

## Decisões do dono (2026-11-01)

1. **A masmorra troca no clear.** O seletor no Lab (M2) é como se assiste a
   todas sem precisar de um clear — clear é raríssimo.
2. **A masmorra NÃO fica mais difícil, só muda.** Toda masmorra gasta o mesmo
   orçamento de dificuldade, redistribuído. O "degrau igual à recompensa" do
   U14 (cada clear sobe a régua) está fora deste plano.
3. **O inferno diário (frente D) não é a escada.** Ele pode ter uma masmorra
   tirada da seed do dia, ou regras próprias derivadas da seed — decidir na
   frente D. O catálogo da M1 é o que torna a primeira opção barata.
4. **A próxima masmorra é SORTEADA** a cada clear (pela seed, então
   reproduzível).

A primeira masmorra é o jogo de hoje ("atual") — calibração e tutorial.

## As etapas

| etapa | o que entrega | dá para verificar como |
|---|---|---|
| **M1** FEITO (out.) | as 8 masmorras como DADOS, mais a de sempre (`src/sim/dungeons.js`, `dungeonModel`). Desligado = jogo de hoje (hash de 30 runs conferido contra o main, 2026-11-02) | testes de U14 em `test/tests.js` |
| **M2** FEITO (out.) | masmorra escolhida no Lab (dev), levada na config da run — o recibo reproduz | trocar e assistir |
| **M3** FEITO em parte (out.) | só a CONTAGEM é declarada; força e chance de drop são DERIVADAS dela, e um teste confere que cada trecho mantém a massa de ameaça e as armas por andar de hoje. Falta: conferir as de matilha pela arena da A1 (`src/analysis/bosses.js`) — bando que chega junto custa ~o dobro da massa, e a massa não vê isso | `node tools/measure.mjs bosses bossTable` |
| **M4** FEITO (out.) | nome e três ícones na barra de cima, com o que cada um quer dizer | assistir |
| **M5** FEITO (out.) | breu: raio de visão por andar, luz em degradê, o desconhecido é preto, tocha em volta do herói. Papazito continua vendo tudo | testes + assistir Tumba |
| **M6** FEITO (2026-11-02) | nas masmorras de matilha o bando acorda junto (`packWake`, campo do modelo, só o eixo matilha liga), e o bando, de 3 para cima (o andar se divide em bandos de 3, a sobra entra no último), nasce inteiro e continua inteiro quando vira guarda de baú ou do santuário. Antes, a cota de zonas picava o bando em criaturas soltas (Minas, seed 835122865), e a guarda de baú e do santuário arrastava uma criatura por vez (Minas, 2026-11-05). O bot não sabe — desenho ou defeito segue com o dono, escrito em `bot.md` | teste de regra + assistir Minas |
| **M8** medida e desfeita (2026-11-09) | matilha por UNIDADE — ver abaixo | tabela de equivalência da A1 + dano por andar |
| **M7** | rotação: masmorra atual no save; o clear avança; a tela anuncia a próxima | `?dev=1` forçando um clear |

**Por que esta ordem (escrita antes de achar o branch):** M1 e M2 respondem "é divertido de assistir?" sem
tocar em motor nem em save. Se não for — como as 3 feras
(`decisions.md`, 2026-11-01) — custou pouco. M5 e M6 mexem no motor e vêm
depois de as masmorras feitas só de dials se provarem.

**Colisões:** `dial-overrides.json` e o save (M7) são também da frente B.
M7 espera a B estar no main.

## Como se mede a dificuldade (dono, 2026-11-05)

**Dano recebido por andar, sem a luta com o Butcher, e turnos por andar ao
lado.** Não mais a profundidade. Quase toda run sem loja morre no andar 4 ou
perto, então a profundidade media "passou do Butcher?" — e o Butcher é o
mesmo em toda masmorra. Por andar, e não por run: toda run sem loja termina
em morte, então o total da run cresce com a duração e uma masmorra fácil
pareceria cara. Os turnos ficam ao lado porque uma masmorra pode cobrar em
tempo em vez de HP (a Floresta de mapa 40). O HP máximo é fixo por herói, não
sobe com nível — não há o que normalizar dentro de um herói.

Na prática (primeira leitura, 2026-11-05): a MEDIANA do dano por andar sai em
HP inteiro e não separa nada; o que separa é a média por run do dano por
andar, com o seu ±σ. Lida assim, com bando de 3, a matilha custa um pouco MAIS
que a fera por andar (pouco acima de 2σ) — a mesma direção que a
profundidade dava, com folga menor. E dentro do mesmo polo as masmorras se
espalham tanto quanto a distância entre os polos: os outros dois eixos
(baú, luz) também pesam, e calibrar só a criatura não iguala as oito.

## M8 — matilha por unidade (desenho, antes do código)

**A ideia do dono (2026-11-05):** um andar tem N UNIDADES, o mesmo N nos dois
modos. Na fera, a unidade é uma criatura forte; na matilha, é um bando de
criaturas mais fracas que, junto, vale aquela fera — 6 ratos ou 3 lobos, o
que for equivalente. O bando grande fica raro por construção: só sai quando a
criatura do bando é muito fraca.

**Por que trocar o que existe:** hoje cada polo declara a sua contagem e a
força é casada por MASSA. A massa não vê que um bando que acorda junto bate
mais, então cada mudança no tamanho do bando desequilibrou o eixo de novo (de
2 a 4, até 6, de 3: três medidas, três respostas). Por unidade, a
equivalência é de LUTA e vale por construção.

**Como:**
- N = a contagem de criaturas da fera naquele trecho (a que já existe). O
  `monstersBase` próprio da matilha sai.
- A unidade da fera é o que já é hoje: uma criatura do tier do andar.
- A unidade da matilha troca essa criatura por `n` de um tier mais fraco.
  Contra um bando que acorda junto e morre um por vez, o herói leva golpes de
  n, n−1, …, 1: o custo é `n(n+1)/2 · h · d` contra `H · D` da fera (vida ×
  mordida, a conta da frente A em `plano-2026-11.md`). O tier do bando é o
  mais forte que ainda dá `n ≥ 3`, com teto de 6.
- A conta é ponto de partida; a tabela da A1 (`bossTable`, duelos de verdade)
  confere cada par antes de ir para o spawn.

**Etapas, cada uma verificável sozinha:**
1. a tabela fera → bando (criatura e `n`) saída da conta, conferida pela A1 —
   não muda o jogo;
2. o spawn das masmorras de matilha passa a usar a tabela — a de sempre
   continua byte-idêntica (hash);
3. medir matilha × fera por dano por andar e turnos por andar, e assistir.

**Etapa 1 medida (2026-11-05) — na arena, o bando custa o que a conta diz.**
Na arena da A1, bando que chega junto custa perto de `n(n+1)/2` criaturas
soltas (um pouco mais): três ratos juntos custam o que um lobo custa. Os pares
que fecham (dentro de ~10%): lobo ≈ 3 ratos, ogro ≈ 4 ratos, zumbi e vampiro ≈
3 fantasmas, gênio ≈ 3 javalis, dragão e t-rex ≈ 3 lobos. Fera mais fraca que
o lobo (rato, morcego, fantasma, javali) não tem bando de 3+ equivalente — e
são as feras dos andares 1–3.

**Etapa 2 medida e DESFEITA (2026-11-09) — a arena não é o jogo.** O dono
escolheu "menos bandos" onde o bando não cabe. Feito pela derivação (cada
criatura de bando pesando `(n+1)/2` soltas, e a contagem caindo onde nem o
bando mais fraco cabe), a matilha passou a custar MUITO menos HP por andar
que a fera — corrigiu o dobro do que precisava. Na masmorra o bando não
chega inteiro de uma vez como na arena aberta: corredor, porta e o bot
escolhendo onde lutar cortam quantos mordem juntos. E com a Cofres
corrigida, a matilha pela massa simples já custa o mesmo que a fera por
andar (dentro do ruído). **Conclusão: o eixo de criatura está calibrado pela
massa do trecho; a M8 não entra.** Se voltar, o peso do bando tem de vir de
medida DENTRO da masmorra, nunca da arena.

## Em aberto

- **Massa igual não é dificuldade igual** (profundidade medida por
  masmorra, 2026-11-02, 120 runs cada, o bot de sempre). As de fera ficam
  mais DIFÍCEIS que a de sempre — Floresta muito, Tumba e Covil um pouco;
  Cofres empata — e Minas, Arena e Ossário mais FÁCEIS; Esgoto empata
  (só se conta o que passa de 2σ). A M6 (bando acorda junto)
  quase não mexeu nas de matilha: o bando já nascia junto e acordava quase
  junto. Medido de novo com o bando inteiro (2 a 4), o quadro é o mesmo: matilha continua mais fácil que fera. Causa achada (2026-11-04): a força era
  casada só no andar-âncora, e o andar 1 da matilha já está no piso da
  tabela — o trecho 1–3 ficava parado ali enquanto o de sempre subia, e é
  nesse trecho que a run se decide. Casada a massa do TRECHO inteiro,
  matilha e fera passam a ir igualmente fundo (dentro do ruído), as duas um
  pouco abaixo da de sempre. A fera precisou de cinco criaturas no trecho
  8–9: com quatro, nem no topo da tabela o trecho pesa o de hoje.
- **Nenhum tabuleiro maior que o de sempre (32)** (dono, 2026-11-04). O
  orçamento de turnos e a moeda são por travessia, então mapa maior era
  masmorra mais difícil por cansaço e mais pobre em moeda — a Floresta, em
  40, perdia mais da metade das runs pro relógio, quase todas por isso; em
  32, quase nenhuma. Corrigir pelo mapa, não pela conta da moeda.
  Remedido depois do corte: a Floresta deixou de ser a mais difícil e
  entrou no grupo das feras; o resto mudou dentro do ruído. O quadro
  matilha × fera continua o mesmo: as quatro de matilha vão mais fundo que
  as quatro de fera, longe de 2σ — o eixo de criatura ainda não está
  calibrado. Clear sem loja segue zero em todas; com loja, só masmorras de
  matilha (Minas, Arena) fecham alguma.
- **No Lab, a masmorra vale na próxima run.** O botão "reset" do topo NÃO
  reinicia a run — apaga todo o progresso. Para trocar já, use "↻ começar
  agora" no herói, ou espere a run acabar.

- **O que um clear paga**, agora que não há degrau — se paga algo além de
  mudar o contexto.
