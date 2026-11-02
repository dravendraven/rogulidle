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
| **M6** FEITO (2026-11-02) | nas masmorras de matilha o bando acorda junto (`packWake`, campo do modelo, só o eixo matilha liga). O bot não sabe — desenho ou defeito segue com o dono, escrito em `bot.md` | teste de regra + assistir Minas |
| **M7** | rotação: masmorra atual no save; o clear avança; a tela anuncia a próxima | `?dev=1` forçando um clear |

**Por que esta ordem (escrita antes de achar o branch):** M1 e M2 respondem "é divertido de assistir?" sem
tocar em motor nem em save. Se não for — como as 3 feras
(`decisions.md`, 2026-11-01) — custou pouco. M5 e M6 mexem no motor e vêm
depois de as masmorras feitas só de dials se provarem.

**Colisões:** `dial-overrides.json` e o save (M7) são também da frente B.
M7 espera a B estar no main.

## Em aberto

- **Massa igual não é dificuldade igual** (profundidade medida por
  masmorra, 2026-11-02, 120 runs cada, o bot de sempre). As de fera ficam
  mais DIFÍCEIS que a de sempre — Floresta muito, Tumba e Covil um pouco;
  Cofres empata — e Minas, Arena e Ossário mais FÁCEIS; Esgoto empata
  (só se conta o que passa de 2σ). A M6 (bando acorda junto)
  quase não mexeu nas de matilha: o bando já nascia junto e acordava quase
  junto. O orçamento por massa (M3) não basta; o próximo ajuste é por
  profundidade, masmorra a masmorra.
- **No Lab, a masmorra vale na próxima run.** O botão "reset" do topo NÃO
  reinicia a run — apaga todo o progresso. Para trocar já, use "↻ começar
  agora" no herói, ou espere a run acabar.

- **O que um clear paga**, agora que não há degrau — se paga algo além de
  mudar o contexto.
